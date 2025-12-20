const pdf = require('pdf-parse');
import { FirebaseService } from '../services/firebaseService';
import { GeminiService } from '../services/geminiService';
import { VectorService } from '../services/vectorService';

import { CompensationProcessor } from './compensationProcessor';

export class ResumeProcessor {
    private firebaseService: FirebaseService;
    private geminiService: GeminiService;
    private vectorService: VectorService;
    private compensationProcessor: CompensationProcessor;

    constructor() {
        this.firebaseService = new FirebaseService();
        this.geminiService = new GeminiService();
        this.vectorService = new VectorService();
        this.compensationProcessor = new CompensationProcessor();
    }

    private async updateStatus(metadata: any, status: string, step: string) {
        if (metadata.companyId && metadata.roleId && metadata.applicationId) {
            const path = `companies/${metadata.companyId}/departments/${metadata.departmentId || 'default'}/roles/${metadata.roleId}/applications`;

            // Log to stream
            await this.firebaseService.addLogEntry(path, metadata.applicationId, step);

            // Update status
            await this.firebaseService.updateDocument(path, metadata.applicationId, {
                status,
                currentStep: step,
                lastUpdated: new Date().toISOString()
            });
        }
    }

    async processResume(bucketName: string, filePath: string, metadata: any) {
        console.log(`Processing resume from ${bucketName}/${filePath}`);
        await this.updateStatus(metadata, 'Processing', 'Downloading resume...');

        // 1. Download file
        const buffer = await this.firebaseService.downloadFile(bucketName, filePath);

        await this.updateStatus(metadata, 'Processing', 'Parsing document content...');

        // 2. Parse text
        // TODO: Handle other formats besides PDF if needed
        const data = await pdf(buffer);
        const text = data.text;

        console.log(`Parsed ${text.length} characters`);

        await this.updateStatus(metadata, 'Processing', 'Generating AI embeddings...');

        // 3. Generate Embedding
        const embedding = await this.geminiService.generateEmbedding(text);

        console.log(`Generated embedding of length ${embedding.length}`);

        await this.updateStatus(metadata, 'Processing', 'Analyzing compensation expectations...');

        // 4. Run Compensation Daemon
        const compensationAnalysis = await this.compensationProcessor.analyze(text);
        console.log('Compensation Analysis:', compensationAnalysis);

        await this.updateStatus(metadata, 'Processing', 'Indexing candidate in vector database...');

        // 5. Upsert to Pinecone
        // Use filePath or a dedicated ID from metadata
        const docId = metadata.docId || filePath;

        await this.vectorService.upsertVector(docId, embedding, {
            ...metadata,
            textSnippet: text.substring(0, 1000), // Store snippet in Pinecone metadata for preview
            type: 'resume'
        });

        // 6. Update Firestore Status - Complete
        if (metadata.companyId && metadata.roleId && metadata.applicationId) {
            const path = `companies/${metadata.companyId}/departments/${metadata.departmentId || 'default'}/roles/${metadata.roleId}/applications`;
            await this.firebaseService.updateDocument(path, metadata.applicationId, {
                status: 'Ready',
                currentStep: 'Completed',
                processedAt: new Date().toISOString(),
                embeddingStatus: 'success',
                parsedTextLength: text.length,
                compensationAnalysis // Save the analysis result
            });
            await this.firebaseService.addLogEntry(path, metadata.applicationId, 'Processing Complete.');
        }

        return { success: true, textLength: text.length };
    }
}
