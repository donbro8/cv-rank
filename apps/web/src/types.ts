export interface DocumentFile {
  id: string;
  name: string;
  text: string;
  file?: File; // Optional because restored files from storage won't have the File object
  size: number; // Persisted file size
  type: 'job-spec' | 'cv';
}

export type CandidateStage = 'new' | 'screening' | 'interview' | 'offer' | 'rejected' | 'closed';

export interface CandidateResult extends DocumentFile {
  score: number; // 0 to 1
  embedding?: number[];
  summary?: string;
  stage?: CandidateStage;
}

export enum AppStatus {
  IDLE = 'IDLE',
  PARSING = 'PARSING',
  ANALYZING = 'ANALYZING',
  COMPLETE = 'COMPLETE',
  ERROR = 'ERROR'
}

export interface AnalysisMetrics {
  totalCandidates: number;
  averageScore: number;
  topScore: number;
}

export interface SavedJob {
  id: string;
  userId: string;
  name: string;
  updatedAt: number;
  jobSpec: DocumentFile | null;
  candidates: CandidateResult[];
}