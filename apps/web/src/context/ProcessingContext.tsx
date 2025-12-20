import React, { createContext, useContext, useState, useEffect } from 'react';

interface ProcessingContextType {
    activeApplication: {
        companyId: string;
        roleId: string;
        applicationId: string;
        departmentId?: string;
    } | null;
    setActiveApplication: (app: { companyId: string; roleId: string; applicationId: string; departmentId?: string; } | null) => void;
}

const ProcessingContext = createContext<ProcessingContextType | undefined>(undefined);

export const ProcessingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [activeApplication, setActiveApplicationState] = useState<ProcessingContextType['activeApplication']>(null);

    const setActiveApplication = (app: ProcessingContextType['activeApplication']) => {
        setActiveApplicationState(app);
        // Optional: clear after some time or persist?
        // For now, let's keep it simple. It stays until cleared or replaced.
    };

    return (
        <ProcessingContext.Provider value={{ activeApplication, setActiveApplication }}>
            {children}
        </ProcessingContext.Provider>
    );
};

export const useProcessing = () => {
    const context = useContext(ProcessingContext);
    if (context === undefined) {
        throw new Error('useProcessing must be used within a ProcessingProvider');
    }
    return context;
};
