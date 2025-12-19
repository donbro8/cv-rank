// Local AI Service using Web Worker
// This prevents the main thread from freezing during model load and inference.

class LocalAIService {
  static worker: Worker | null = null;
  static currentModelId = 'Xenova/all-MiniLM-L6-v2';
  static isWorkerReady = false;
  static pendingRequests: Map<string, { resolve: Function, reject: Function }> = new Map();

  static initializeWorker() {
    if (this.worker) return;

    this.worker = new Worker(new URL('../workers/ai.worker.ts', import.meta.url), {
      type: 'module'
    });

    this.worker.onmessage = (event) => {
      const { type, data, error, status } = event.data;
      console.log('LocalAIService received worker message:', type, data);

      if (type === 'init_complete') {
        console.log(`LocalAIService: Worker initialized successfully.`);
        this.isWorkerReady = true;
        LocalAIService.notifySubscribers({ status: 'ready', progress: 100 });
      }
      else if (type === 'generate_complete') {
        // For simplicity in this naive implementation, we assume one request at a time 
        // or we just resolve the latest. Ideally we need IDs.
        // But for this use case (single user flow), a simple queue/listener is okay, 
        // or we can use a simpler approach: event listeners per request.
        // However, to keep it robust, let's just dispatch an event or use a promise created at call time.
        // Actually, since this is a static service, we need to bridge the gap.
        // Let's use a simpler "Request-Response" ID system if we were rewriting fully., 
        // but for now, we'll assume linear usage or implement a simple callback storage inside the method.
      } else if (type === 'download_progress') {
        const normalizedData = {
          ...data,
          progress: typeof data.progress === 'number' ? data.progress : 0,
        };

        // Only track progress for the main model file (.onnx) to avoid 
        // the progress bar jumping to 100% then 0% for small config files.
        if (normalizedData.file && !normalizedData.file.endsWith('.onnx')) {
          return;
        }

        console.log(`[Model Download]: ${normalizedData.status} - ${normalizedData.progress}%`);
        LocalAIService.notifySubscribers(normalizedData);
      }
    };

    // Initial load
    this.worker.postMessage({ type: 'init', data: { modelId: this.currentModelId } });
  }

  static subscribers: ((progress: any) => void)[] = [];

  static subscribe(callback: (progress: any) => void) {
    this.subscribers.push(callback);
    return () => {
      this.subscribers = this.subscribers.filter(cb => cb !== callback);
    };
  }

  static notifySubscribers(data: any) {
    this.subscribers.forEach(cb => cb(data));
  }

  static async setModel(modelId: string) {
    this.currentModelId = modelId;
    if (!this.worker) this.initializeWorker();

    // Re-init worker with new model
    this.worker?.postMessage({ type: 'init', data: { modelId } });
  }

  static getModelId(): string {
    return this.currentModelId;
  }

  static async generateEmbedding(text: string): Promise<number[]> {
    if (!this.worker) this.initializeWorker();

    return new Promise((resolve, reject) => {
      const worker = this.worker!;
      const requestId = Math.random().toString(36).substring(7);

      const handler = (event: MessageEvent) => {
        const { type, data, error, requestId: responseId } = event.data;

        // Only respond to messages that match our request ID
        if (responseId !== requestId) return;

        if (type === 'generate_complete') {
          worker.removeEventListener('message', handler);
          resolve(data);
        } else if (type === 'error') {
          worker.removeEventListener('message', handler);
          reject(new Error(error));
        }
      };

      worker.addEventListener('message', handler);
      worker.postMessage({
        type: 'generate',
        data: { text, modelId: this.currentModelId, requestId }
      });
    });
  }

  static async preloadModel() {
    this.initializeWorker();
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

export const onModelProgress = (callback: (progress: any) => void) => {
  return LocalAIService.subscribe(callback);
};

export const preloadModel = async () => {
  // Notify subscribers immediately that we are starting
  LocalAIService.notifySubscribers({ status: 'initiate', progress: 0 });
  return LocalAIService.preloadModel();
};

