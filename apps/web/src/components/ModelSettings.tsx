import React, { useState, useEffect, useRef } from 'react';
import { setAiModel, getAiModel } from '../services/localAiService';

interface ModelSettingsProps {
    isOpen: boolean;
    onClose: () => void;
}

const AVAILABLE_MODELS = [
    { id: 'Xenova/all-MiniLM-L6-v2', name: 'MiniLM-L6-v2', description: 'Fastest (45MB)', recommended: true },
    { id: 'Xenova/bge-small-en-v1.5', name: 'BGE-Small-EN', description: 'Accurate (67MB)' },
];

export const ModelSettings: React.FC<ModelSettingsProps> = ({ isOpen, onClose }) => {
    const [currentModel, setCurrentModel] = useState<string>('');
    const [loading, setLoading] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isOpen) {
            setCurrentModel(getAiModel());
        }
    }, [isOpen]);

    // Handle click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen, onClose]);

    const handleModelChange = async (modelId: string) => {
        setLoading(true);
        try {
            await setAiModel(modelId);
            setCurrentModel(modelId);
            setTimeout(() => onClose(), 500); // Auto close after short delay
        } catch (error) {
            console.error("Failed to switch model", error);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div
            ref={dropdownRef}
            className="absolute right-0 top-full mt-2 w-72 bg-white rounded-lg shadow-xl border border-gray-200 z-50 overflow-hidden transform transition-all"
        >
            <div className="p-3 border-b border-gray-100 bg-gray-50">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    AI Model Selection
                </h3>
            </div>

            <div className="p-2 space-y-1">
                {AVAILABLE_MODELS.map((model) => (
                    <button
                        key={model.id}
                        onClick={() => !loading && handleModelChange(model.id)}
                        className={`
                            w-full text-left px-3 py-2 rounded-md text-sm transition-colors flex items-center justify-between group
                            ${currentModel === model.id ? 'bg-indigo-50 text-indigo-700' : 'text-gray-700 hover:bg-gray-100'}
                            ${loading ? 'opacity-50 cursor-wait' : ''}
                        `}
                        disabled={loading}
                    >
                        <div>
                            <span className="font-medium block">{model.name}</span>
                            <span className={`text-xs ${currentModel === model.id ? 'text-indigo-400' : 'text-gray-400'}`}>
                                {model.description}
                            </span>
                        </div>
                        {currentModel === model.id && (
                            <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                        )}
                    </button>
                ))}
            </div>

            <div className="p-2 border-t border-gray-100">
                <p className="text-[10px] text-gray-400 text-center">
                    Models run locally in your browser.
                </p>
            </div>
        </div>
    );
};
