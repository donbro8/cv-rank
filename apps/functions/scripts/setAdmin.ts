import * as admin from 'firebase-admin';
import * as path from 'path';

// Usage: ts-node setAdmin.ts <email> <role> <tenantId>

const args = process.argv.slice(2);

if (args.length < 3) {
    console.error('Usage: ts-node setAdmin.ts <email> <role> <tenantId>');
    console.error('Example: ts-node setAdmin.ts admin@example.com ADMIN tenant-123');
    process.exit(1);
}

const [email, role, tenantId] = args;

// Check for service account key
// NOTE: For local dev, you must export GOOGLE_APPLICATION_CREDENTIALS="path/to/key.json"
// or use `firebase use` context if running via firebase scripts (though that often requires actual login).
// A robust way for local scripts is using a service account key file.
if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    console.warn("WARNING: GOOGLE_APPLICATION_CREDENTIALS not set. Auth might fail if not authenticated as Admin.");
}

// Initialize app (if not already via default creds which works if using gcloud auth application-default login)
if (admin.apps.length === 0) {
    admin.initializeApp({
        credential: admin.credential.applicationDefault()
    });
}

(async () => {
    try {
        const user = await admin.auth().getUserByEmail(email);

        await admin.auth().setCustomUserClaims(user.uid, {
            role,
            tenant_id: tenantId
        });

        console.log(`Success! User ${email} (${user.uid}) now has role='${role}' and tenant_id='${tenantId}'.`);

        // Verify
        const updatedUser = await admin.auth().getUser(user.uid);
        console.log('Current Custom Claims:', updatedUser.customClaims);

    } catch (error) {
        console.error('Error assigning claims:', error);
        process.exit(1);
    }
})();
