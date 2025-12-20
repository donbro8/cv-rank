import * as admin from 'firebase-admin';
import { ResumeProcessor } from './src/processors/resumeProcessor';
import { config } from './src/config';
import * as fs from 'fs';
import * as path from 'path';

// Initialize Admin if not already
if (!admin.apps.length) {
    admin.initializeApp({
        projectId: config.PROJECT_ID,
        storageBucket: `${config.PROJECT_ID}.appspot.com`
    });
}
console.log(`Using Project ID: ${config.PROJECT_ID}`);
console.log(`Using Bucket: ${config.PROJECT_ID}.appspot.com`);

const db = admin.firestore();
const storage = admin.storage();

async function verify() {
    console.log("Starting Verification...");

    const processor = new ResumeProcessor();
    const applicationId = `test-app-${Date.now()}`;
    const companyId = 'default-company';
    const activePath = `companies/${companyId}/departments/default/roles/default-role/applications/${applicationId}`;

    // 1. Upload Test File
    const bucket = storage.bucket();
    const filePath = `test-resumes/test_resume_${Date.now()}.txt`;
    const localFile = path.join(__dirname, 'dummy_resume.txt');

    // Create dummy file if not exists
    if (!fs.existsSync(localFile)) {
        fs.writeFileSync(localFile, "John Doe\nSoftware Engineer\nExpects $150k.");
    }

    console.log(`Uploading ${localFile} to ${filePath}...`);
    await bucket.upload(localFile, { destination: filePath });

    // 2. Listen to Firestore Logs
    console.log(`Listening to ${activePath}...`);
    const observer = db.doc(activePath).onSnapshot(doc => {
        if (doc.exists) {
            const data = doc.data();
            const logs = data?.processingLogs || [];
            if (logs.length > 0) {
                console.log(`\n[Firestore Update] Logs:`);
                logs.forEach((l: any) => console.log(` - [${l.timestamp}] ${l.message}`));
            }
            if (data?.compensationAnalysis) {
                console.log(`\n[Result] Compensation Analysis:`, JSON.stringify(data.compensationAnalysis, null, 2));
            }
        }
    });

    // 3. Trigger Processor
    console.log("Triggering Processor...");
    try {
        await processor.processResume(bucket.name, filePath, {
            companyId,
            roleId: 'default-role',
            applicationId,
            departmentId: 'default',
            docId: applicationId
        });
        console.log("Processor finished.");
    } catch (e) {
        console.error("Processor failed:", e);
    }

    // Give time for listener
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Cleanup
    observer();
    // process.exit(0); 
}

verify().catch(console.error);
