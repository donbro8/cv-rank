// Dynamic import to prevent onnxruntime-web from crashing the app on load

class LocalAIService {
  static instance: any = null;
  static currentModelId = 'Xenova/all-MiniLM-L6-v2';
  static isLoading = false;
  static transformersModule: any = null;

  static async getTransformers() {
    if (this.transformersModule) return this.transformersModule;

    // Dynamic import
    const transformers = await import('@xenova/transformers');
    this.transformersModule = transformers;

    // Configure transformers ONLY ONCE
    transformers.env.allowLocalModels = false;
    transformers.env.useBrowserCache = true;

    return transformers;
  }

  static async getInstance() {
    if (!this.instance && !this.isLoading) {
      await this.loadModel(this.currentModelId);
    }
    // Wait for instance if it's currently loading
    while (this.isLoading && !this.instance) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    return this.instance;
  }

  static async loadModel(modelId: string) {
    if (this.isLoading) return;
    this.isLoading = true;
    try {
      console.log(`Loading AI Model: ${modelId}...`);

      const transformers = await this.getTransformers();

      if (!transformers.env.backends.onnx) {
        console.warn('Warning: transformers.env.backends.onnx is undefined');
      } else {
        console.log('Transformers configured backends:', {
          onnx: transformers.env.backends.onnx,
          wasm: transformers.env.backends.onnx?.wasm
        });
      }

      // feature-extraction pipeline for embeddings
      try {
        // Try loading with default settings (usually auto/webgl)
        this.instance = await transformers.pipeline('feature-extraction', modelId);
      } catch (firstError) {
        console.warn(`Initial model load failed, attempting fallback to WASM/CPU...`, firstError);
        // Fallback: try forcing cpu (which uses wasm)
        // Disable proxying to web worker if it's causing issues
        if (transformers.env.backends.onnx?.wasm) {
          transformers.env.backends.onnx.wasm.proxy = false;
        }

        this.instance = await transformers.pipeline('feature-extraction', modelId, { device: 'cpu' });
      }

      this.currentModelId = modelId;
      console.log(`AI Model ${modelId} loaded successfully.`);
    } catch (err) {
      console.error(`Failed to load transformers/local AI (${modelId})`, err);
      throw err;
    } finally {
      this.isLoading = false;
    }
  }

  static async setModel(modelId: string) {
    if (modelId === this.currentModelId && this.instance) return;

    this.instance = null; // Clear current instance
    await this.loadModel(modelId);
  }

  static getModelId(): string {
    return this.currentModelId;
  }

  static async generateEmbedding(text: string): Promise<number[]> {
    try {
      const extractor = await this.getInstance();
      if (!extractor) throw new Error("AI Model not initialized");

      // Generate embedding
      const output = await extractor(text, { pooling: 'mean', normalize: true });

      // Convert Float32Array to regular number array
      return Array.from(output.data);
    } catch (e) {
      console.error("Embedding generation failed", e);
      throw e;
    }
  }
}

export const generateEmbedding = async (text: string): Promise<number[]> => {
  return LocalAIService.generateEmbedding(text);
};

export const setAiModel = async (modelId: string) => {
  return LocalAIService.setModel(modelId);
};

export const getAiModel = (): string => {
  return LocalAIService.getModelId();
};

export const preloadModel = async () => {
  try {
    await LocalAIService.getInstance();
  } catch (e) {
    console.warn("Model preload failed (non-fatal):", e);
  }
};
