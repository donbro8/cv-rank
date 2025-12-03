
import React, { useState, useEffect } from 'react';
import { DropZone } from './components/DropZone';
import { ResultCard } from './components/ResultCard';
import { PreviewModal } from './components/PreviewModal';
import { AuthScreen } from './components/AuthScreen';
import { SidePanel } from './components/SidePanel';
import { DocumentFile, CandidateResult, AppStatus, SavedJob } from './types';
import { readFileContent } from './services/pdfService';
import { generateEmbedding, preloadModel } from './services/localAiService';
import { cosineSimilarity } from './utils/math';
import * as authService from './services/authService';
import * as jobService from './services/jobService';

const App: React.FC = () => {
  const [user, setUser] = useState<authService.User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  
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
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loadingModel, setLoadingModel] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Initialize Auth Listener and Model
  useEffect(() => {
    const unsubscribe = authService.subscribeToAuthChanges((currentUser) => {
      setUser(currentUser);
      setIsAuthLoading(false);
      
      if (currentUser) {
        refreshJobs(currentUser.uid);
      } else {
        // Clear sensitive data on logout
        clearWorkspace();
        setSavedJobs([]);
      }
    });

    preloadModel().catch(console.error);
    
    return () => unsubscribe();
  }, []);

  const refreshJobs = async (userId: string) => {
    try {
      const jobs = await jobService.getJobs(userId);
      setSavedJobs(jobs);
    } catch (err) {
      console.error("Failed to load jobs:", err);
    }
  };

  const handleLogout = async () => {
    await authService.logout();
    setIsSidebarOpen(true);
  };

  const clearWorkspace = () => {
    setJobSpec(null);
    setCandidates([]);
    setResults([]);
    setStatus(AppStatus.IDLE);
    setErrorMessage(null);
    setCurrentJobId(null);
    setJobName("Untitled Job");
  };

  const handleCreateNewJob = () => {
    clearWorkspace();
    if (window.innerWidth < 1024) {
      setIsSidebarOpen(false); // Close sidebar on mobile after action
    }
  };

  const handleSaveJob = async () => {
    if (!user) return;
    
    // If no name has been set (it's default), ask for one
    let nameToSave = jobName;
    if (!currentJobId && jobName === "Untitled Job") {
      const inputName = window.prompt("Enter a name for this job:", "New Job Spec");
      if (!inputName) return; // Cancelled
      nameToSave = inputName;
      setJobName(nameToSave);
    }

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
      await refreshJobs(user.uid);
      alert("Job saved successfully!");
    } catch (e: any) {
      setErrorMessage(e.message);
    }
  };

  const handleSelectJob = (job: SavedJob) => {
    setCurrentJobId(job.id);
    setJobName(job.name);
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
    if (window.innerWidth < 1024) {
      setIsSidebarOpen(false);
    }
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

  const isValidFile = (file: File): boolean => {
    const validTypes = ['application/pdf', 'text/plain'];
    const validExtensions = ['.pdf', '.txt'];
    return validTypes.includes(file.type) || 
           validExtensions.some(ext => file.name.toLowerCase().endsWith(ext));
  };

  const handleJobSpecUpload = async (files: File[]) => {
    setErrorMessage(null);
    if (files.length === 0) return;
    const file = files[0];

    if (!isValidFile(file)) {
      setErrorMessage("Invalid file format. Only PDF and Text files are accepted for the Job Specification.");
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
      if (!isValidFile(file)) {
        failCount++;
        lastError = `File ${file.name} has invalid format`;
        continue;
      }

      try {
        const text = await readFileContent(file);
        if (!text || text.trim().length === 0) {
            console.warn(`Skipping empty file: ${file.name}`);
            failCount++;
            lastError = `${file.name} appears to be empty or an image-only PDF`;
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
      if (results.length > 0) setResults([]); // Reset results on new upload
    }

    if (failCount > 0) {
      setErrorMessage(`Successfully added ${successCount} files. Failed to read ${failCount} files. Last error: ${lastError}`);
    } else if (successCount === 0 && files.length > 0) {
      setErrorMessage(`No files were added. Error: ${lastError || "Unknown error"}`);
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
            // Optimisation: use stored embedding if available
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
      setErrorMessage("Analysis failed. Please check if your browser supports WebGL or WebAssembly for local AI.");
      setStatus(AppStatus.ERROR);
    }
  };

  const removeCandidate = (id: string) => {
    setCandidates(prev => prev.filter(c => c.id !== id));
    setResults(prev => prev.filter(c => c.id !== id));
  };

  // Auth Loading Screen
  if (isAuthLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-700">Loading CV Scout...</h2>
        </div>
      </div>
    );
  }

  // Auth Screen (Login/Register)
  if (!user) {
    return <AuthScreen onLoginSuccess={() => {}} />; // Callback handled by listener
  }

  // Main App Interface
  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden font-sans">
      
      {/* Sidebar */}
      <SidePanel 
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        jobs={savedJobs}
        currentJobId={currentJobId}
        onSelectJob={handleSelectJob}
        onDeleteJob={handleDeleteJob}
        onCreateNew={handleCreateNewJob}
      />

      {/* Main Content Wrapper */}
      <div className="flex-1 flex flex-col min-w-0 bg-gray-50 h-full">
        
        {/* Header */}
        <header className="bg-white border-b border-gray-200 flex-shrink-0 z-20">
          <div className="px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Sidebar Toggle */}
              <button 
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="p-2 -ml-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md focus:outline-none"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
              </button>

              <div className="flex items-center gap-2">
                 <div className="bg-indigo-600 rounded-lg p-1.5">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                 </div>
                 <div className="flex flex-col">
                   <input 
                      type="text" 
                      value={jobName}
                      onChange={(e) => setJobName(e.target.value)}
                      className="font-bold text-gray-900 bg-transparent border-none focus:ring-0 p-0 h-6 text-lg hover:bg-gray-50 rounded"
                   />
                 </div>
              </div>
            </div>

            <div className="flex items-center gap-4">
               {/* Status Indicator */}
               {status === AppStatus.ANALYZING && (
                 <span className="hidden sm:flex items-center text-sm text-indigo-600 font-medium animate-pulse">
                   <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                     <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                     <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                   </svg>
                   {loadingModel ? 'Loading Model...' : 'Processing...'}
                 </span>
               )}

               {/* Save Button */}
               <button 
                  onClick={handleSaveJob}
                  disabled={!user || status === AppStatus.ANALYZING}
                  className="flex items-center gap-1.5 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 px-3 py-1.5 rounded-md text-sm font-medium transition-colors shadow-sm disabled:opacity-50"
               >
                  <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg>
                  Save to Cloud
               </button>

               <div className="h-6 w-px bg-gray-200"></div>

               <div className="flex items-center gap-3">
                 <span className="text-sm font-medium text-gray-700 hidden sm:block">
                   {user.username}
                 </span>
                 <button 
                  onClick={handleLogout}
                  className="text-sm text-gray-500 hover:text-red-600 font-medium transition-colors"
                 >
                   Sign out
                 </button>
               </div>
            </div>
          </div>
        </header>

        {/* Scrollable Main Content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
          
            {errorMessage && (
              <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative" role="alert">
                <strong className="font-bold">Notice: </strong>
                <span className="block sm:inline">{errorMessage}</span>
                <span className="absolute top-0 bottom-0 right-0 px-4 py-3" onClick={() => setErrorMessage(null)}>
                  <svg className="fill-current h-6 w-6 text-red-500" role="button" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><title>Close</title><path d="M14.348 14.849a1.2 1.2 0 0 1-1.697 0L10 11.819l-2.651 3.029a1.2 1.2 0 1 1-1.697-1.697l2.758-3.15-2.759-3.152a1.2 1.2 0 1 1 1.697-1.697L10 8.183l2.651-3.031a1.2 1.2 0 1 1 1.697 1.697l-2.758 3.152 2.758 3.15a1.2 1.2 0 0 1 0 1.698z"/></svg>
                </span>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              
              {/* Left Column: Job Spec (4 cols) */}
              <div className="lg:col-span-4 space-y-6">
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
                      subLabel="PDF and Text files supported"
                      onFilesAdded={handleJobSpecUpload}
                      accept=".pdf,.txt"
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
                            {jobSpec.size ? (jobSpec.size / 1024).toFixed(1) + ' KB' : 'Size unavailable'}
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
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                        View Content
                      </button>
                    </div>
                  )}
                </div>

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
                      subLabel="Drag & drop multiple files (PDF/TXT)"
                      onFilesAdded={handleCandidateUpload}
                      compact
                      accept=".pdf,.txt"
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

              {/* Right Column: Results (8 cols) */}
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
                             <p className="text-sm max-w-md text-center">
                               {loadingModel 
                                 ? 'We are downloading a lightweight AI model to your browser. This happens once.' 
                                 : 'We are calculating vector embeddings for your documents to find the best match.'}
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
          </div>
        </main>
      </div>

      {/* Preview Modal */}
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

export default App;
