import React, { useState, useEffect } from 'react';
import { DropZone } from '../components/DropZone';
import { ResultCard } from '../components/ResultCard';
import { PreviewModal } from '../components/PreviewModal';
import { ModelSettings } from '../components/ModelSettings';
import { DocumentFile, CandidateResult, AppStatus, SavedJob } from '../types';
import { readFileContent } from '../services/fileService';
import { generateEmbedding, preloadModel, getAiModel } from '../services/localAiService';
import { cosineSimilarity } from '../utils/math';
import * as authService from '../services/authService';
import * as jobService from '../services/jobService';

interface DashboardProps {
    user: authService.User;
    onLogout: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ user, onLogout }) => {
    // Job State
    const [currentJobId, setCurrentJobId] = useState<string | null>(null);
    const [jobName, setJobName] = useState<string>("Untitled Job");
    const [savedJobs, setSavedJobs] = useState<SavedJob[]>([]);

    // App Data State
    const [jobSpec, setJobSpec] = useState<DocumentFile | null>(null);
    const [candidates, setCandidates] = useState<DocumentFile[]>([]);
    const [results, setResults] = useState<CandidateResult[]>([]);

    // UI State
    const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
    const [previewFile, setPreviewFile] = useState<DocumentFile | CandidateResult | null>(null);
    const [showSettings, setShowSettings] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [loadingModel, setLoadingModel] = useState(false);

    // Initialize Data when User is available
    useEffect(() => {
        if (user) {
            loadInitialData();
        }
    }, [user]);

    // Preload model on mount
    useEffect(() => {
        preloadModel().catch(console.error);
    }, []);

    const loadInitialData = async () => {
        // 1. Load the list of jobs from Firestore
        const jobs = await refreshJobs(user.uid);

        // 2. CHECK LOCAL STORAGE: Did the user have a job open before reload?
        const lastActiveJobId = localStorage.getItem('activeJobId');

        if (lastActiveJobId && jobs.length > 0) {
            const jobToRestore = jobs.find(j => j.id === lastActiveJobId);
            if (jobToRestore) {
                console.log("Restoring previous session...");
                handleSelectJob(jobToRestore);
            }
        }
    };

    const refreshJobs = async (userId: string) => {
        try {
            const jobs = await jobService.getJobs(userId);
            setSavedJobs(jobs);
            return jobs; // Return jobs for chaining
        } catch (err) {
            console.error("Failed to load jobs:", err);
            return [];
        }
    };

    const clearWorkspace = () => {
        setJobSpec(null);
        setCandidates([]);
        setResults([]);
        setStatus(AppStatus.IDLE);
        setErrorMessage(null);
        setCurrentJobId(null);
        setJobName("Untitled Job");
        localStorage.removeItem('activeJobId'); // Stop remembering this job
    };

    const handleCreateNewJob = () => {
        clearWorkspace();
    };

    const handleSaveJob = async () => {
        if (!user) return;

        let nameToSave = jobName;
        if (!currentJobId && jobName === "Untitled Job") {
            const inputName = window.prompt("Enter a name for this job:", "New Job Spec");
            if (!inputName) return;
            nameToSave = inputName;
            setJobName(nameToSave);
        }

        // Ensure we aren't saving an empty state effectively
        const newJob: SavedJob = {
            id: currentJobId || `job-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            userId: user.uid,
            name: nameToSave,
            updatedAt: Date.now(),
            jobSpec,
            candidates: results.length > 0 ? results : candidates as CandidateResult[],
        };

        try {
            await jobService.saveJob(newJob);
            setCurrentJobId(newJob.id);

            // Save ID to local storage so it persists on reload
            localStorage.setItem('activeJobId', newJob.id);

            await refreshJobs(user.uid);
            alert("Job saved successfully!");
        } catch (e: any) {
            setErrorMessage(e.message);
        }
    };

    const handleSelectJob = (job: SavedJob) => {
        setCurrentJobId(job.id);
        setJobName(job.name);

        // Remember this choice
        localStorage.setItem('activeJobId', job.id);

        // Note: Firestore strips the 'File' object. 
        // We rely on 'text' content and 'name' for the UI.
        setJobSpec(job.jobSpec);

        const hasScores = job.candidates.some(c => c.score !== undefined && c.score >= 0);

        setCandidates(job.candidates);
        if (hasScores) {
            setResults(job.candidates);
            setStatus(AppStatus.COMPLETE);
        } else {
            setResults([]);
            setStatus(AppStatus.IDLE);
        }

        setErrorMessage(null);
    };

    const handleDeleteJob = async (jobId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!user) return;
        if (window.confirm("Are you sure you want to delete this job?")) {
            try {
                await jobService.deleteJob(user.uid, jobId);
                await refreshJobs(user.uid);
                if (currentJobId === jobId) {
                    clearWorkspace();
                }
            } catch (err: any) {
                setErrorMessage(err.message);
            }
        }
    };

    const isValidJobSpecFile = (file: File): boolean => {
        const validTypes = [
            'application/pdf',
            'text/plain',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // docx
            'application/msword', // doc
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // xlsx
            'application/vnd.ms-excel', // xls
            'text/csv'
        ];
        const validExtensions = ['.pdf', '.txt', '.docx', '.doc', '.xlsx', '.xls', '.csv'];

        return validTypes.includes(file.type) ||
            validExtensions.some(ext => file.name.toLowerCase().endsWith(ext));
    };

    const isValidCandidateFile = (file: File): boolean => {
        const validTypes = [
            'application/pdf',
            'text/plain',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // docx
            'application/msword', // doc
        ];
        // Explicitly excluding .csv, .xlsx, .xls for candidates
        const validExtensions = ['.pdf', '.txt', '.docx', '.doc'];

        return validTypes.includes(file.type) ||
            validExtensions.some(ext => file.name.toLowerCase().endsWith(ext));
    };

    const handleJobSpecUpload = async (files: File[]) => {
        setErrorMessage(null);
        if (files.length === 0) return;
        const file = files[0];

        if (!isValidJobSpecFile(file)) {
            setErrorMessage("Invalid file format. Accepted: PDF, TXT, DOCX, CSV, XLSX.");
            return;
        }

        try {
            setStatus(AppStatus.PARSING);
            const text = await readFileContent(file);
            setJobSpec({
                id: 'job-spec',
                name: file.name,
                text,
                file,
                size: file.size,
                type: 'job-spec'
            });
            setStatus(AppStatus.IDLE);
        } catch (err: any) {
            console.error(err);
            setErrorMessage(err.message || "Failed to read job spec file.");
            setStatus(AppStatus.ERROR);
        }
    };

    const handleCandidateUpload = async (files: File[]) => {
        setErrorMessage(null);
        setStatus(AppStatus.PARSING);

        let successCount = 0;
        let failCount = 0;
        let lastError = "";
        const newCandidates: DocumentFile[] = [];

        for (const file of files) {
            if (!isValidCandidateFile(file)) {
                failCount++;
                lastError = `File ${file.name} has invalid format. Accepted: PDF, TXT, DOCX.`;
                continue;
            }

            try {
                const text = await readFileContent(file);
                if (!text || text.trim().length === 0) {
                    console.warn(`Skipping empty file: ${file.name}`);
                    failCount++;
                    lastError = `${file.name} appears to be empty or an image-only document`;
                    continue;
                }

                const newCandidate: DocumentFile = {
                    id: `cand-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                    name: file.name,
                    text,
                    file,
                    size: file.size,
                    type: 'cv'
                };
                newCandidates.push(newCandidate);
                successCount++;
            } catch (err: any) {
                console.error(`Failed to read ${file.name}`, err);
                failCount++;
                lastError = `${file.name}: ${err.message}`;
            }
        }

        if (newCandidates.length > 0) {
            setCandidates(prev => [...prev, ...newCandidates]);
            if (results.length > 0) setResults([]);
        }

        if (failCount > 0) {
            setErrorMessage(`Successfully added ${successCount} files. Failed to read ${failCount} files. Last error: ${lastError}`);
        }

        setStatus(AppStatus.IDLE);
    };

    const runAnalysis = async () => {
        if (!jobSpec || candidates.length === 0) return;

        setStatus(AppStatus.ANALYZING);
        setErrorMessage(null);
        setLoadingModel(true);

        try {
            const jobEmbedding = await generateEmbedding(jobSpec.text);
            setLoadingModel(false);

            const analyzedCandidates = await Promise.all(
                candidates.map(async (candidate) => {
                    try {
                        let embedding = (candidate as CandidateResult).embedding;
                        if (!embedding) {
                            embedding = await generateEmbedding(candidate.text);
                        }
                        const score = cosineSimilarity(jobEmbedding, embedding);
                        return { ...candidate, embedding, score } as CandidateResult;
                    } catch (e) {
                        console.error(`Failed to analyze ${candidate.name}`, e);
                        return { ...candidate, score: -1 } as CandidateResult;
                    }
                })
            );

            const sortedResults = analyzedCandidates
                .filter(c => c.score !== -1)
                .sort((a, b) => b.score - a.score);

            setResults(sortedResults);
            setStatus(AppStatus.COMPLETE);

        } catch (err) {
            console.error(err);
            setLoadingModel(false);
            setErrorMessage("Analysis failed. Check WebGL support.");
            setStatus(AppStatus.ERROR);
        }
    };

    const removeCandidate = (id: string) => {
        setCandidates(prev => prev.filter(c => c.id !== id));
        setResults(prev => prev.filter(c => c.id !== id));
    };

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            {/* Header / Toolbar */}
            <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div>
                        <input
                            type="text"
                            value={jobName}
                            onChange={(e) => setJobName(e.target.value)}
                            className="font-bold text-gray-900 bg-transparent border-none focus:ring-0 p-0 text-xl hover:bg-gray-50 rounded px-2"
                        />
                        <p className="text-xs text-gray-400 mt-1 px-2">Autosaved to {user.username}'s workspace</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {status === AppStatus.ANALYZING && (
                        <span className="flex items-center text-sm text-indigo-600 font-medium animate-pulse">
                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Analyzing...
                        </span>
                    )}

                    <div className="relative">
                        <button
                            onClick={() => setShowSettings(true)}
                            className="btn bg-gray-50 text-gray-600 hover:text-indigo-600 border border-gray-200"
                            title="AI Model Settings"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                        </button>
                        <ModelSettings isOpen={showSettings} onClose={() => setShowSettings(false)} />
                    </div>

                    <button
                        onClick={handleSaveJob}
                        disabled={!user || status === AppStatus.ANALYZING}
                        className="btn bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
                    >
                        Save
                    </button>
                    <button
                        onClick={handleCreateNewJob}
                        className="btn bg-indigo-50 border-none text-indigo-700 hover:bg-indigo-100"
                    >
                        + New Job
                    </button>
                </div>
            </div>

            {errorMessage && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative" role="alert">
                    <strong className="font-bold">Notice: </strong>
                    <span className="block sm:inline">{errorMessage}</span>
                    <span className="absolute top-0 bottom-0 right-0 px-4 py-3 cursor-pointer" onClick={() => setErrorMessage(null)}>
                        x
                    </span>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left Column: Job Spec & Uploads */}
                <div className="lg:col-span-4 space-y-6">
                    {/* Job Spec Card */}
                    <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                                <span className="bg-indigo-100 text-indigo-700 w-6 h-6 rounded-full flex items-center justify-center text-xs">1</span>
                                Job Specification
                            </h2>
                            {jobSpec && (
                                <button onClick={() => setJobSpec(null)} className="text-xs text-red-500 hover:underline">Clear</button>
                            )}
                        </div>

                        {!jobSpec ? (
                            <DropZone
                                label="Drop Job Spec"
                                subLabel="PDF, DOCX, TXT, CSV, XLSX supported"
                                onFilesAdded={handleJobSpecUpload}
                                accept=".pdf,.txt,.docx,.doc,.xlsx,.xls,.csv"
                                multiple={false}
                                icon={
                                    <svg className="w-8 h-8 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
                                }
                            />
                        ) : (
                            <div className="relative group">
                                <div className="border border-indigo-200 bg-indigo-50 rounded-xl p-4 flex items-start justify-between">
                                    <div className="overflow-hidden">
                                        <p className="font-medium text-indigo-900 truncate" title={jobSpec.name}>{jobSpec.name}</p>
                                        <p className="text-xs text-indigo-500 mt-1">
                                            {jobSpec.size ? (jobSpec.size / 1024).toFixed(1) + ' KB' : 'Stored in Cloud'}
                                        </p>
                                    </div>
                                    <div className="text-indigo-400">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setPreviewFile(jobSpec)}
                                    className="mt-2 text-xs font-medium text-indigo-600 hover:text-indigo-800 flex items-center"
                                >
                                    View Content
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Candidates Card */}
                    <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                                <span className="bg-indigo-100 text-indigo-700 w-6 h-6 rounded-full flex items-center justify-center text-xs">2</span>
                                Candidates ({candidates.length})
                            </h2>
                            {candidates.length > 0 && (
                                <button onClick={() => { setCandidates([]); setResults([]); }} className="text-xs text-red-500 hover:underline">Clear All</button>
                            )}
                        </div>

                        <DropZone
                            label="Add Candidate CVs"
                            subLabel="PDF, DOCX, TXT supported"
                            onFilesAdded={handleCandidateUpload}
                            compact
                            accept=".pdf,.txt,.docx,.doc"
                            multiple={true}
                            icon={
                                <svg className="w-6 h-6 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" /></svg>
                            }
                        />

                        <div className="mt-4 max-h-60 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                            {candidates.map((c) => (
                                <div key={c.id} className="flex items-center justify-between text-sm p-2 bg-gray-50 rounded-lg border border-gray-100 group">
                                    <span className="truncate flex-1 text-gray-700" title={c.name}>{c.name}</span>
                                    <button
                                        onClick={() => removeCandidate(c.id)}
                                        className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                    </button>
                                </div>
                            ))}
                            {candidates.length === 0 && (
                                <p className="text-sm text-gray-400 text-center py-4 italic">No candidates added yet.</p>
                            )}
                        </div>
                    </div>

                    <button
                        onClick={runAnalysis}
                        disabled={!jobSpec || candidates.length === 0 || status === AppStatus.ANALYZING}
                        className={`
                            w-full py-4 px-6 rounded-xl font-bold text-white shadow-lg transform transition-all
                            ${!jobSpec || candidates.length === 0 || status === AppStatus.ANALYZING
                                ? 'bg-gray-300 cursor-not-allowed'
                                : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 hover:-translate-y-1 hover:shadow-xl'
                            }
                        `}
                    >
                        {status === AppStatus.ANALYZING ? 'Processing...' : 'Rank Candidates'}
                    </button>
                </div>

                {/* Right Column: Results */}
                <div className="lg:col-span-8">
                    <div className="bg-white rounded-2xl shadow-sm min-h-[600px] border border-gray-100 flex flex-col h-full">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 rounded-t-2xl">
                            <h2 className="text-xl font-bold text-gray-900">Analysis Results</h2>
                            {results.length > 0 && (
                                <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full font-medium">
                                    Analysis Complete
                                </span>
                            )}
                        </div>

                        <div className="p-6 flex-1 overflow-y-auto bg-gray-50/30">
                            {results.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-4">
                                    {status === AppStatus.ANALYZING ? (
                                        <>
                                            <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                                            <p className="text-lg font-medium text-gray-600">
                                                {loadingModel ? 'Loading AI Model (First time only)...' : 'Analyzing semantic similarity...'}
                                            </p>
                                        </>
                                    ) : (
                                        <>
                                            <svg className="w-16 h-16 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                                            <p>Upload job spec and candidate files to rank them.</p>
                                        </>
                                    )}
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {results.map((candidate, index) => (
                                        <ResultCard
                                            key={candidate.id}
                                            candidate={candidate}
                                            rank={index + 1}
                                            onClick={() => setPreviewFile(candidate)}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {previewFile && (
                <PreviewModal
                    file={previewFile}
                    jobSpec={jobSpec}
                    onClose={() => setPreviewFile(null)}
                />
            )}


        </div>
    );
};
