export type UserRole = 'ADMIN' | 'RECRUITER' | 'HIRING_MANAGER';

export interface IUser {
    uid: string;
    email: string;
    displayName?: string;
    photoURL?: string;
    role: UserRole;
    tenantId: string;
    allowedDepts?: string[];
}

export interface ICandidate {
    id: string;
    name: string;
    email?: string;
    phone?: string;
    linkedinUrl?: string;
    resumeUrl: string; // Path to Firebase Storage
    status: 'new' | 'screening' | 'interview' | 'offer' | 'rejected' | 'hired';
    skills: string[];
    experienceYears: number;
    appliedRoleIds: string[];
    createdAt: string; // ISO Date
    updatedAt: string; // ISO Date
}

export interface IJob {
    id: string;
    title: string;
    department: string;
    description: string;
    requirements: string[];
    status: 'open' | 'closed' | 'draft';
    createdAt: string;
    createdBy: string; // User UID
}

export interface IAnalysisResult {
    candidateId: string;
    summary: string;
    matchScore: number; // 0-100
    keyStrengths: string[];
    potentialRedFlags: string[];
    skillsFound: string[];
    experienceMatch: string;
}
