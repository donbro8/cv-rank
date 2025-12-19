
import { pipeline, env } from '@xenova/transformers';

// Skip local model checks for this environment to avoid 404s on localhost
env.allowLocalModels = false;
env.useBrowserCache = true;

class AIWorker {
    static instance: any = null;
    static currentModelId = 'Xenova/all-MiniLM-L6-v2';

    static async getInstance(modelId: string, onProgress?: (progress: any) => void) {
        if (!this.instance) {
            console.log(`Worker: Loading model ${modelId} inside worker...`);
            try {
                this.instance = await pipeline('feature-extraction', modelId, {
                    quantized: true,
                    progress_callback: (data: any) => {
                        console.log('Worker raw progress:', data);
                        if (onProgress) onProgress(data);
                    },
                });
            } catch (e) {
                console.error("Worker Pipeline Error:", e);
                throw e;
            }
            this.currentModelId = modelId;
            console.log(`Worker: Model ${modelId} loaded.`);
        } else if (this.currentModelId !== modelId) {
            console.log(`Worker: Switching model to ${modelId}`);
            // Dispose old if possible or just overwrite
            this.instance = await pipeline('feature-extraction', modelId, {
                quantized: true,
                progress_callback: onProgress
            });
            this.currentModelId = modelId;
        }
        return this.instance;
    }
}

self.addEventListener('message', async (event) => {
    const { type, data } = event.data;

    try {
        if (type === 'init') {
            await AIWorker.getInstance(data.modelId, (progress: any) => {
                self.postMessage({ type: 'download_progress', data: progress });
            });
            self.postMessage({ type: 'init_complete', status: 'success' });
        }
        else if (type === 'generate') {
            const extractor = await AIWorker.getInstance(data.modelId);
            const output = await extractor(data.text, { pooling: 'mean', normalize: true });
            self.postMessage({
                type: 'generate_complete',
                requestId: data.requestId, // Echo back the request ID
                data: Array.from(output.data)
            });
        }
    } catch (err: any) {
        self.postMessage({
            type: 'error',
            requestId: data?.requestId, // Echo back ID on error too if possible
            error: err.message || 'Unknown worker error'
        });
    }
});
