"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.onFileUpload = void 0;
const storage_1 = require("firebase-functions/v2/storage");
const firebase_functions_1 = require("firebase-functions");
const admin = require("firebase-admin");
admin.initializeApp();
/**
 * Triggered when a file is uploaded to the Storage bucket.
 * This will be the entry point for the Resume Processing Pipeline.
 */
exports.onFileUpload = (0, storage_1.onObjectFinalized)({ cpu: 2 }, async (event) => {
    const fileBucket = event.data.bucket;
    const filePath = event.data.name;
    const contentType = event.data.contentType;
    if (!filePath) {
        firebase_functions_1.logger.warn("File path is missing from event data.");
        return;
    }
    firebase_functions_1.logger.info(`File uploaded: ${filePath} (${contentType}) in bucket ${fileBucket}`);
    // TODO: Implement Resume Processing Logic
    // 1. Download file
    // 2. Parse content (PDF/DOCX)
    // 3. Generate Embeddings (Vertex AI)
    // 4. Store in Vector DB (Pinecone)
    // 5. Update Firestore Document
    // For now, we just log that we received it.
    firebase_functions_1.logger.log("Resume processing trigger received. Pipeline not yet implemented.");
});
//# sourceMappingURL=index.js.map