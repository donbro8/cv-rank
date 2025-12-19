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

    // TODO: Implement Resume Processing Logic
    // 1. Download file
    // 2. Parse content (PDF/DOCX)
    // 3. Generate Embeddings (Vertex AI)
    // 4. Store in Vector DB (Pinecone)
    // 5. Update Firestore Document

    // For now, we just log that we received it.
    logger.log("Resume processing trigger received. Pipeline not yet implemented.");
});
