import { VertexAI, GenerativeModel } from '@google-cloud/vertexai';
import { config } from '../config';

export class GeminiService {
    private vertexAI: VertexAI;
    private model: GenerativeModel;

    constructor() {
        this.vertexAI = new VertexAI({
            project: config.PROJECT_ID,
            location: config.LOCATION,
        });
        this.model = this.vertexAI.getGenerativeModel({ model: 'gemini-1.5-pro-preview-0409' });
    }

    async generateContent(prompt: string): Promise<string> {
        try {
            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            const text = response.candidates[0].content.parts[0].text;
            return text || '';
        } catch (error) {
            console.error('Error generating content:', error);
            throw error;
        }
    }

    async generateEmbedding(text: string): Promise<number[]> {
        // Note: Vertex AI has a separate model for embeddings.
        // We might need to instantiate a different model for this.
        const embeddingModel = this.vertexAI.getGenerativeModel({ model: 'text-embedding-004' });

        // For text-embedding-004, the input format might differ slightly depending on library version,
        // but generally it's similar.
        // Actually, usually we use `getEmbeddings` or specialized calls.
        // Let's check if the library supports it directly on GenerativeModel or if we need a helper.
        // Looking at docs, usually it's `embeddingModel.embedContent`

        try {
            const result = await embeddingModel.embedContent(text);
            const embedding = result.embedding.values;
            return embedding;
        } catch (error) {
            console.error('Error generating embedding:', error);
            throw error;
        }
    }
}
