import React, { useState } from 'react';
import {
    DndContext,
    closestCorners,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragOverlay,
    DragStartEvent,
    DragOverEvent,
    DragEndEvent,
    defaultDropAnimationSideEffects,
    DropAnimation
} from '@dnd-kit/core';
import { arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { KanbanColumn } from './KanbanColumn';
import { KanbanCard } from './KanbanCard';
import { CandidateResult, CandidateStage } from '../types';

interface KanbanBoardProps {
    candidates: CandidateResult[];
    onStatusChange: (candidateId: string, newStage: CandidateStage) => void;
    onCardClick: (candidate: CandidateResult) => void;
}

const COLUMNS: { id: CandidateStage; title: string; color: string }[] = [
    { id: 'new', title: 'New', color: 'bg-blue-400' },
    { id: 'screening', title: 'Screening', color: 'bg-indigo-400' },
    { id: 'interview', title: 'Interview', color: 'bg-purple-400' },
    { id: 'offer', title: 'Offer', color: 'bg-green-400' },
    { id: 'rejected', title: 'Rejected', color: 'bg-red-400' },
];

export const KanbanBoard: React.FC<KanbanBoardProps> = ({ candidates, onStatusChange, onCardClick }) => {
    const [activeId, setActiveId] = useState<string | null>(null);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 5, // minimum distance to move before drag starts
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    // Group candidates by stage
    const getCandidatesByStage = (stage: CandidateStage) => {
        return candidates.filter((c) => (c.stage || 'new') === stage);
    };

    const handleDragStart = (event: DragStartEvent) => {
        setActiveId(event.active.id as string);
    };

    const handleDragOver = (event: DragOverEvent) => {
        const { active, over } = event;
        if (!over) return;

        // We don't need complex reordering logic deeply for now, 
        // just visual feedback is handled by dnd-kit mostly
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        if (!over) {
            setActiveId(null);
            return;
        }

        const activeId = active.id as string;
        const overId = over.id as string;

        // Check if dropped on a column
        const overColumn = COLUMNS.find(col => col.id === overId);

        // Check if dropped on another card
        const overCard = candidates.find(c => c.id === overId);

        let newStage: CandidateStage | null = null;

        if (overColumn) {
            newStage = overColumn.id;
        } else if (overCard) {
            newStage = overCard.stage || 'new';
        }

        if (newStage) {
            // Only update if stage changed
            const candidate = candidates.find(c => c.id === activeId);
            if (candidate && (candidate.stage || 'new') !== newStage) {
                onStatusChange(activeId, newStage);
            }
        }

        setActiveId(null);
    };

    const dropAnimation: DropAnimation = {
        sideEffects: defaultDropAnimationSideEffects({
            styles: {
                active: {
                    opacity: '0.5',
                },
            },
        }),
    };

    const activeCandidate = candidates.find(c => c.id === activeId);

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
        >
            <div className="flex h-full gap-4 overflow-x-auto pb-4 items-start">
                {COLUMNS.map((col) => (
                    <KanbanColumn
                        key={col.id}
                        id={col.id}
                        title={col.title}
                        color={col.color}
                        candidates={getCandidatesByStage(col.id)}
                        onCardClick={onCardClick}
                    />
                ))}
            </div>

            <DragOverlay dropAnimation={dropAnimation}>
                {activeCandidate ? (
                    <div className="transform rotate-3 cursor-grabbing w-full max-w-[280px]">
                        <KanbanCard candidate={activeCandidate} onClick={() => { }} />
                    </div>
                ) : null}
            </DragOverlay>
        </DndContext>
    );
};
