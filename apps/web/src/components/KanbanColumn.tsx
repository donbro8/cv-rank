import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { KanbanCard } from './KanbanCard';
import { CandidateResult, CandidateStage } from '../types';

interface KanbanColumnProps {
    id: CandidateStage;
    title: string;
    candidates: CandidateResult[];
    color: string;
    onCardClick: (candidate: CandidateResult) => void;
}

export const KanbanColumn: React.FC<KanbanColumnProps> = ({ id, title, candidates, color, onCardClick }) => {
    const { setNodeRef } = useDroppable({ id });

    return (
        <div className="flex flex-col h-full bg-gray-50/50 rounded-xl border border-gray-200 min-w-[280px] w-80">
            {/* Header */}
            <div className={`p-3 rounded-t-xl border-b border-gray-100 bg-white flex justify-between items-center`}>
                <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${color}`}></div>
                    <h3 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">{title}</h3>
                </div>
                <span className="bg-gray-100 text-gray-600 py-0.5 px-2 rounded-full text-xs font-bold">
                    {candidates.length}
                </span>
            </div>

            {/* Cards container */}
            <div ref={setNodeRef} className="flex-1 p-2 space-y-2 overflow-y-auto min-h-[150px]">
                <SortableContext
                    id={id}
                    items={candidates.map(c => c.id)}
                    strategy={verticalListSortingStrategy}
                >
                    {candidates.map((candidate) => (
                        <KanbanCard
                            key={candidate.id}
                            candidate={candidate}
                            onClick={onCardClick}
                        />
                    ))}
                </SortableContext>

                {candidates.length === 0 && (
                    <div className="h-full flex items-center justify-center text-gray-300 text-xs italic border-2 border-dashed border-gray-200 rounded-lg m-2">
                        Drop items here
                    </div>
                )}
            </div>
        </div>
    );
};
