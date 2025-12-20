import React, { useEffect, useState, useRef } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebaseConfig';

interface LogEntry {
    timestamp: string;
    message: string;
    step: string;
}

interface StreamOfThoughtProps {
    companyId: string;
    departmentId?: string;
    roleId: string;
    applicationId: string;
}

export const StreamOfThought: React.FC<StreamOfThoughtProps> = ({
    companyId,
    departmentId = 'default',
    roleId,
    applicationId
}) => {
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [status, setStatus] = useState<string>('');
    const bottomRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!companyId || !roleId || !applicationId) return;

        const path = `companies/${companyId}/departments/${departmentId}/roles/${roleId}/applications`;
        const docRef = doc(db, path, applicationId);

        const unsubscribe = onSnapshot(docRef, (snapshot) => {
            if (snapshot.exists()) {
                const data = snapshot.data();
                setLogs(data.processingLogs || []);
                setStatus(data.status || '');
            }
        });

        return () => unsubscribe();
    }, [companyId, departmentId, roleId, applicationId]);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [logs]);

    if (logs.length === 0) return null;

    return (
        <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm shadow-inner max-h-60 overflow-y-auto border border-gray-700">
            <h3 className="text-xs uppercase tracking-widest text-gray-500 mb-2 border-b border-gray-800 pb-1">
                AI Reasoning Stream
            </h3>
            <div className="space-y-1">
                {logs.map((log, index) => (
                    <div key={index} className="flex gap-2 animate-fade-in">
                        <span className="text-gray-600 select-none">
                            {new Date(log.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </span>
                        <span>{'>'} {log.message}</span>
                    </div>
                ))}
                {status === 'Processing' && (
                    <div className="flex gap-2 animate-pulse">
                        <span className="text-gray-600 select-none">
                            {new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </span>
                        <span className="inline-block w-2 h-4 bg-green-400"></span>
                    </div>
                )}
                <div ref={bottomRef} />
            </div>

            <style>{`
                @keyframes fade-in {
                    from { opacity: 0; transform: translateY(5px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fade-in {
                    animation: fade-in 0.3s ease-out forwards;
                }
            `}</style>
        </div>
    );
};
