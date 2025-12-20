import * as admin from 'firebase-admin';
import { getStorage } from 'firebase-admin/storage';
import { getFirestore } from 'firebase-admin/firestore';
import { config } from '../config';

// Initialize Firebase Admin
// In Cloud Run, this uses the default service account automatically.
// For local dev, ensure GOOGLE_APPLICATION_CREDENTIALS is set.
if (!admin.apps.length) {
    admin.initializeApp({
        projectId: config.PROJECT_ID,
        storageBucket: `${config.PROJECT_ID}.firebasestorage.app` // Assumption, can be configured if different
    });
}

export class FirebaseService {
    private storage = getStorage();
    private firestore = getFirestore();

    async downloadFile(bucketName: string, filePath: string): Promise<Buffer> {
        const bucket = this.storage.bucket(bucketName);
        const file = bucket.file(filePath);
        const [buffer] = await file.download();
        return buffer;
    }

    async updateDocument(collectionPath: string, docId: string, data: any) {
        await this.firestore.collection(collectionPath).doc(docId).update(data);
    }

    async setDocument(collectionPath: string, docId: string, data: any) {
        await this.firestore.collection(collectionPath).doc(docId).set(data, { merge: true });
    }

    async addLogEntry(collectionPath: string, docId: string, message: string) {
        const timestamp = new Date().toISOString();
        await this.firestore.collection(collectionPath).doc(docId).update({
            processingLogs: admin.firestore.FieldValue.arrayUnion({
                timestamp,
                message,
                step: 'Processing'
            })
        });
    }
}
