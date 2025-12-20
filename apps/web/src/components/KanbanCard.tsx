import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { CandidateResult } from '../types';

interface KanbanCardProps {
    candidate: CandidateResult;
    onClick: (candidate: CandidateResult) => void;
}

export const KanbanCard: React.FC<KanbanCardProps> = ({ candidate, onClick }) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: candidate.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    const getScoreColor = (score: number) => {
        if (score >= 0.8) return 'text-green-600 bg-green-50 border-green-200';
        if (score >= 0.6) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
        return 'text-red-600 bg-red-50 border-red-200';
    };

    const scorePercentage = Math.round(candidate.score * 100);

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`bg-white p-3 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-all cursor-move ${isDragging ? 'ring-2 ring-indigo-500 shadow-lg rotate-2' : ''
                }`}
            onClick={(e) => {
                // Prevent click if dragging
                if (!isDragging) {
                    onClick(candidate);
                }
            }}
            {...attributes}
            {...listeners}
        >
            <div className="flex justify-between items-start mb-2">
                <h4 className="font-medium text-gray-900 truncate pr-2 text-sm" title={candidate.name}>
                    {candidate.name}
                </h4>
                {candidate.score >= 0 && (
                    <span className={`text-xs px-1.5 py-0.5 rounded font-bold border ${getScoreColor(candidate.score)}`}>
                        {scorePercentage}%
                    </span>
                )}
            </div>

            <div className="flex items-center justify-between text-xs text-gray-500">
                <span>{(candidate.size / 1024).toFixed(1)} KB</span>
            </div>
        </div>
    );
};
