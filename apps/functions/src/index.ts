import { onObjectFinalized } from "firebase-functions/v2/storage";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";
import * as functions from "firebase-functions";

admin.initializeApp();

/**
 * Triggered when a new user is created in Firebase Auth.
 * Assigns a default tenant_id and role to custom claims.
 */
export const onUserCreated = functions.auth.user().onCreate(async (user) => {
    const email = user.email;
    if (!email) {
        logger.warn(`User ${user.uid} created without email. Cannot assign default tenant.`);
        return;
    }

    // POLICY: For now, everyone gets a default tenant and 'CANDIDATE' role unless manually changed.
    // In a real multi-tenant app, we might look up the domain or an invitation code.
    const defaultTenantId = 'default-tenant';
    const defaultRole = 'CANDIDATE';

    try {
        await admin.auth().setCustomUserClaims(user.uid, {
            tenant_id: defaultTenantId,
            role: defaultRole
        });

        logger.info(`Assigned custom claims for user ${user.uid} (${email}): tenant=${defaultTenantId}, role=${defaultRole}`);

        // Create user profile in Firestore
        await admin.firestore().collection('tenants').doc(defaultTenantId).collection('candidates').doc(user.uid).set({
            id: user.uid,
            email: email,
            role: defaultRole,
            tenantId: defaultTenantId,
            createdAt: new Date().toISOString()
        });

    } catch (error) {
        logger.error(`Error assigning custom claims for user ${user.uid}`, error);
    }
});

/**
 * Triggered when a file is uploaded to the Storage bucket.
 * This will be the entry point for the Resume Processing Pipeline.
 */
export const onFileUpload = onObjectFinalized({ cpu: 2 }, async (event) => {
    const fileBucket = event.data.bucket;
    const filePath = event.data.name;
    const contentType = event.data.contentType;

    if (!filePath) {
        logger.warn("File path is missing from event data.");
        return;
    }

    logger.info(`File uploaded: ${filePath} (${contentType}) in bucket ${fileBucket}`);

    // Filter only for resumes directory
    if (!filePath.startsWith("resumes/")) {
        logger.info("File upload outside of resumes/ directory. Ignoring.");
        return;
    }

    // Initialize Cloud Tasks Client
    const { CloudTasksClient } = await import("@google-cloud/tasks");
    const client = new CloudTasksClient();

    // TODO: Make these configurable via environment variables
    const project = process.env.GCLOUD_PROJECT || "cv-rank-dev";
    const location = "us-central1"; // Default location
    const queue = "resume-processing";

    const parent = client.queuePath(project, location, queue);

    const task = {
        httpRequest: {
            httpMethod: "POST" as const,
            url: `https://${location}-${project}.cloudfunctions.net/processResume`, // Target Processor Function
            headers: {
                "Content-Type": "application/json",
            },
            body: Buffer.from(JSON.stringify({
                bucket: fileBucket,
                name: filePath,
                contentType: contentType
            })).toString("base64"),
        },
    };

    try {
        const [response] = await client.createTask({ parent, task });
        logger.info(`Created task ${response.name} for file ${filePath}`);
    } catch (error) {
        logger.error(`Error creating task for ${filePath}:`, error);
    }
});
