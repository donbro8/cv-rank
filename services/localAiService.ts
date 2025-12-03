import { pipeline, env } from '@xenova/transformers';

// Configure transformers.js to use CDN and cache
env.allowLocalModels = false;
env.useBrowserCache = true;

class LocalAIService {
  static instance: any = null;
  static modelId = 'Xenova/all-MiniLM-L6-v2';
  static isLoading = false;

  static async getInstance() {
    if (!this.instance && !this.isLoading) {
      this.isLoading = true;
      try {
        // feature-extraction pipeline for embeddings
        this.instance = await pipeline('feature-extraction', this.modelId);
      } finally {
        this.isLoading = false;
      }
    }
    // Wait for instance if it's currently loading
    while (this.isLoading && !this.instance) {
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    return this.instance;
  }

  static async generateEmbedding(text: string): Promise<number[]> {
    const extractor = await this.getInstance();
    
    // Generate embedding
    // pooling: 'mean' averages the token embeddings to get a sentence embedding
    // normalize: true ensures the vector has length 1 for cosine similarity
    const output = await extractor(text, { pooling: 'mean', normalize: true });
    
    // Convert Float32Array to regular number array
    return Array.from(output.data);
  }
}

export const generateEmbedding = async (text: string): Promise<number[]> => {
  return LocalAIService.generateEmbedding(text);
};

// Optional: Preload model on app start
export const preloadModel = async () => {
  await LocalAIService.getInstance();
};
