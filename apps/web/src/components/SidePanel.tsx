import React from 'react';
import { SavedJob } from '../types';

interface SidePanelProps {
  isOpen: boolean;
  onClose: () => void;
  jobs: SavedJob[];
  currentJobId: string | null;
  onSelectJob: (job: SavedJob) => void;
  onDeleteJob: (jobId: string, e: React.MouseEvent) => void;
  onCreateNew: () => void;
}

export const SidePanel: React.FC<SidePanelProps> = ({
  isOpen,
  onClose,
  jobs,
  currentJobId,
  onSelectJob,
  onDeleteJob,
  onCreateNew
}) => {
  return (
    <>
      {/* Mobile Overlay */}
      <div 
        className={`fixed inset-0 bg-gray-600 bg-opacity-75 z-20 transition-opacity lg:hidden ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />

      {/* Sidebar Container */}
      <div 
        className={`
          fixed lg:static inset-y-0 left-0 z-30 w-64 bg-white border-r border-gray-200 transform transition-transform duration-300 ease-in-out flex flex-col
          ${isOpen ? 'translate-x-0' : '-translate-x-full lg:hidden'} 
          ${!isOpen && 'lg:hidden'} /* Hide completely on desktop if toggled off, assuming flex layout handles the space */
        `}
      >
        <div className="h-16 flex items-center justify-between px-4 border-b border-gray-200 bg-gray-50">
          <h2 className="text-lg font-bold text-gray-800">My Jobs</h2>
          <button 
            onClick={onCreateNew}
            title="Create New Job"
            className="p-1 rounded-full hover:bg-indigo-100 text-indigo-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {jobs.length === 0 && (
            <div className="text-center py-8">
              <p className="text-sm text-gray-400">No saved jobs yet.</p>
              <button onClick={onCreateNew} className="mt-2 text-sm text-indigo-600 font-medium hover:underline">Start a new job</button>
            </div>
          )}

          {jobs.map((job) => (
            <div 
              key={job.id}
              onClick={() => onSelectJob(job)}
              className={`
                group relative flex flex-col p-3 rounded-lg cursor-pointer transition-all border
                ${currentJobId === job.id 
                  ? 'bg-indigo-50 border-indigo-200 shadow-sm' 
                  : 'bg-white border-transparent hover:bg-gray-50 hover:border-gray-200'
                }
              `}
            >
              <div className="flex justify-between items-start">
                <h3 className={`font-medium text-sm truncate pr-6 ${currentJobId === job.id ? 'text-indigo-900' : 'text-gray-900'}`}>
                  {job.name}
                </h3>
                <button 
                  onClick={(e) => onDeleteJob(job.id, e)}
                  className="absolute right-2 top-2 p-1 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Delete Job"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
              </div>
              
              <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
                <span>{new Date(job.updatedAt).toLocaleDateString()}</span>
                <span className={`${currentJobId === job.id ? 'text-indigo-400' : 'text-gray-400'}`}>
                  {job.candidates.length} candidates
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
};