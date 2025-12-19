
import React, { useEffect, useState } from 'react';
import { onModelProgress } from '../services/localAiService';

export const ModelStatus: React.FC = () => {
    const [progress, setProgress] = useState<{ status: string; progress: number } | null>(null);
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const unsubscribe = onModelProgress((data) => {
            if (data.status === 'progress' || data.status === 'initiate' || data.status === 'download') {
                setVisible(true);
                setProgress(data);
                // Auto-hide when complete (users might want to see 100% for a moment)
                if (data.progress >= 100) {
                    setTimeout(() => setVisible(false), 2000);
                }
            } else if (data.status === 'done' || data.status === 'ready') {
                setProgress({ status: 'Ready', progress: 100 });
                setTimeout(() => setVisible(false), 2000);
            }
        });
        return () => unsubscribe();
    }, []);

    if (!visible || !progress) return null;

    return (
        <div className="fixed bottom-4 right-4 bg-white rounded-lg shadow-lg border border-indigo-100 p-4 w-80 z-50 animate-fade-in-up">
            <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">AI Model Setup</span>
                <span className="text-xs text-indigo-600 font-bold">{progress.progress.toFixed(0)}%</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                <div
                    className="bg-indigo-600 h-full rounded-full transition-all duration-300 ease-out"
                    style={{ width: `${progress.progress}%` }}
                />
            </div>
            <p className="text-xs text-gray-400 mt-2 truncate">
                {progress.status === 'initiate' ? 'Starting download...' :
                    progress.status === 'progress' ? 'Downloading model weights...' :
                        'Model Ready'}
            </p>
        </div>
    );
};
