
import React, { createContext, useContext, useState, ReactNode } from 'react';

interface PrivacyContextType {
    isPrivacyMode: boolean;
    setPrivacyMode: (value: boolean) => void;
}

const PrivacyContext = createContext<PrivacyContextType | undefined>(undefined);

export const PrivacyProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    // Default to true for "Local First" principle
    const [isPrivacyMode, setIsPrivacyMode] = useState<boolean>(true);

    const setPrivacyMode = (value: boolean) => {
        setIsPrivacyMode(value);
        // Optional: Persist to localStorage
        localStorage.setItem('privacy_mode', String(value));
    };

    // Load initial state from local storage if checking existence (optional refinement)
    // For now simple state is enough.

    return (
        <PrivacyContext.Provider value={{ isPrivacyMode, setPrivacyMode }}>
            {children}
        </PrivacyContext.Provider>
    );
};

export const usePrivacy = (): PrivacyContextType => {
    const context = useContext(PrivacyContext);
    if (!context) {
        throw new Error('usePrivacy must be used within a PrivacyProvider');
    }
    return context;
};
