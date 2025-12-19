import { onObjectFinalized } from "firebase-functions/v2/storage";
import { logger } from "firebase-functions";
import * as admin from "firebase-admin";

admin.initializeApp();

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
