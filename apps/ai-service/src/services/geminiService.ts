import { VertexAI, GenerativeModel } from '@google-cloud/vertexai';
import { PredictionServiceClient, helpers } from '@google-cloud/aiplatform';
import { config } from '../config';

export class GeminiService {
    private vertexAI: VertexAI;
    private model: GenerativeModel;
    private predictionClient: PredictionServiceClient;
    private project: string;
    private location: string;

    constructor() {
        this.project = config.PROJECT_ID;
        this.location = config.LOCATION;

        this.vertexAI = new VertexAI({
            project: this.project,
            location: this.location,
        });
        this.model = this.vertexAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

        const clientOptions = {
            apiEndpoint: `${this.location}-aiplatform.googleapis.com`,
        };
        this.predictionClient = new PredictionServiceClient(clientOptions);
    }

    async generateContent(prompt: string): Promise<string> {
        try {
            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            const text = response.candidates?.[0]?.content?.parts?.[0]?.text;
            return text || '';
        } catch (error) {
            console.error('Error generating content:', error);
            throw error;
        }
    }

    async generateEmbedding(text: string): Promise<number[]> {
        const model = 'text-embedding-004';
        const endpoint = `projects/${this.project}/locations/${this.location}/publishers/google/models/${model}`;

        try {
            const instance = {
                content: text,
            };
            const instanceValue = helpers.toValue(instance);
            const instances = [instanceValue] as any[]; // Cast to any[] to avoid strict type mismatch with client

            const [response] = await this.predictionClient.predict({
                endpoint,
                instances,
            });

            if (!response.predictions || response.predictions.length === 0) {
                throw new Error('No predictions returned');
            }

            const prediction = response.predictions[0];
            // The response format for text-embedding-004 is usually { embeddings: { values: [...] } }
            // wrapped in a protobuf Value.
            // Using helpers.fromValue might be cleaner to get a plain JS object.
            const predictionData = helpers.fromValue(prediction as any) as any;

            // Check structure: predictionData.embeddings.values
            if (predictionData && predictionData.embeddings && Array.isArray(predictionData.embeddings.values)) {
                return predictionData.embeddings.values;
            }

            // Fallback/Safety check if structure is different (e.g., flat array in older models, though 004 is structured)
            // console.log('Prediction structure:', JSON.stringify(predictionData, null, 2));
            if (Array.isArray(predictionData)) {
                return predictionData as number[];
            }

            throw new Error('Unexpected embedding format');

        } catch (error) {
            console.error('Error generating embedding:', error);
            throw error;
        }
    }

    async extractCompensation(text: string): Promise<{ min?: number, max?: number, currency?: string, frequency?: string }> {
        const prompt = `
            Extract compensation information from the following resume text.
            Return ONLY a JSON object with keys: min (number), max (number), currency (string, ISO code), frequency (string, e.g., "yearly", "monthly", "hourly").
            If no specific compensation is mentioned, return an empty object {}.
            
            Resume Text:
            ${text.substring(0, 5000)}
        `;

        try {
            const result = await this.generateContent(prompt);
            // Clean up potentially md formatted json
            const cleaned = result.replace(/```json/g, '').replace(/```/g, '').trim();
            return JSON.parse(cleaned);
        } catch (error) {
            console.warn('Failed to parse compensation:', error);
            return {};
        }
    }
}
