import { Pinecone } from '@pinecone-database/pinecone';
import { config } from '../config';

export interface VectorMetadata {
    companyId: string;
    roleId?: string;
    applicationId?: string;
    type: 'resume' | 'job_spec';
    [key: string]: any;
}

export class VectorService {
    private pinecone: Pinecone;
    private indexName: string;

    constructor() {
        this.pinecone = new Pinecone({
            apiKey: config.PINECONE_API_KEY,
        });
        this.indexName = config.PINECONE_INDEX;
    }

    async upsertVector(id: string, values: number[], metadata: VectorMetadata) {
        const index = this.pinecone.Index(this.indexName);

        try {
            await index.upsert([{
                id,
                values,
                metadata
            }]);
            console.log(`Upserted vector for ${id}`);
        } catch (error) {
            console.error('Error upserting vector:', error);
            throw error;
        }
    }

    async queryVectors(vector: number[], filter: any, topK: number = 10) {
        const index = this.pinecone.Index(this.indexName);

        try {
            const result = await index.query({
                vector,
                topK,
                filter, // Metadata filtering
                includeMetadata: true
            });
            return result.matches;
        } catch (error) {
            console.error('Error querying vectors:', error);
            throw error;
        }
    }
}
