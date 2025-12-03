import React, { useMemo, useEffect, useState } from 'react';
import { CandidateResult, DocumentFile } from '../types';

interface PreviewModalProps {
  file: DocumentFile | CandidateResult | null;
  onClose: () => void;
  jobSpec?: DocumentFile | null;
}

interface DocumentViewerProps {
  doc: DocumentFile | CandidateResult | null;
  title: string;
  colorTheme: 'gray' | 'indigo';
}

// Internal component for viewing a single document
const DocumentViewer: React.FC<DocumentViewerProps> = ({ doc, title, colorTheme }) => {
  const isPdf = doc?.name.toLowerCase().endsWith('.pdf');
  const hasFileObject = !!doc?.file;
  
  // State to toggle between PDF and Text view
  // Default to PDF if available, otherwise Text
  const [viewMode, setViewMode] = useState<'pdf' | 'text'>('text');

  useEffect(() => {
    if (isPdf && hasFileObject) {
      setViewMode('pdf');
    } else {
      setViewMode('text');
    }
  }, [doc, isPdf, hasFileObject]);
  
  // Create Blob URL for PDF display if File object exists
  const pdfUrl = useMemo(() => {
    if (isPdf && hasFileObject && doc?.file) {
      return URL.createObjectURL(doc.file);
    }
    return null;
  }, [doc, isPdf, hasFileObject]);

  // Cleanup Blob URL to prevent memory leaks
  useEffect(() => {
    return () => {
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    };
  }, [pdfUrl]);

  const themeClasses = {
    indigo: {
      border: 'border-indigo-200',
      bgHeader: 'bg-indigo-50',
      textHeader: 'text-indigo-900',
      icon: 'text-indigo-500',
      badge: 'text-indigo-600 bg-indigo-100 border-indigo-200',
      activeTab: 'bg-indigo-600 text-white shadow-sm',
      inactiveTab: 'text-indigo-600 hover:bg-indigo-100'
    },
    gray: {
      border: 'border-gray-200',
      bgHeader: 'bg-gray-50',
      textHeader: 'text-gray-700',
      icon: 'text-gray-500',
      badge: 'text-gray-600 bg-gray-100 border-gray-200',
      activeTab: 'bg-gray-800 text-white shadow-sm',
      inactiveTab: 'text-gray-600 hover:bg-gray-200'
    }
  };

  const theme = themeClasses[colorTheme];

  const TextView = () => (
    <div className="h-full overflow-y-auto p-6 scroll-smooth bg-white">
        <pre className="whitespace-pre-wrap font-mono text-sm text-gray-800 leading-relaxed font-normal">
        {doc?.text || "No text content available."}
        </pre>
    </div>
  );

  if (!doc) {
    return (
       <div className={`flex flex-col h-full bg-white rounded-xl shadow-sm border ${theme.border} overflow-hidden`}>
          <div className={`px-4 py-3 ${theme.bgHeader} border-b ${theme.border} flex items-center justify-between shrink-0`}>
             <h4 className={`font-semibold ${theme.textHeader}`}>{title}</h4>
          </div>
          <div className="flex-1 flex items-center justify-center text-gray-400 p-6">
             <p>No document loaded.</p>
          </div>
       </div>
    );
  }

  return (
    <div className={`flex flex-col h-full bg-white rounded-xl shadow-sm border ${theme.border} overflow-hidden`}>
      <div className={`px-4 py-3 ${theme.bgHeader} border-b ${theme.border} flex items-center justify-between shrink-0`}>
        <div className="flex items-center gap-2 min-w-0">
          {colorTheme === 'gray' ? (
             <svg className={`w-5 h-5 ${theme.icon} shrink-0`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
           ) : (
             <svg className={`w-5 h-5 ${theme.icon} shrink-0`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
           )}
          <h4 className={`font-semibold ${theme.textHeader} truncate`} title={doc.name}>
             {doc.name}
          </h4>
        </div>
        
        <div className="flex items-center gap-2 shrink-0">
            {isPdf && hasFileObject && (
                <a 
                    href={pdfUrl!} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className={`p-1.5 rounded hover:bg-gray-200 transition-colors ${theme.icon}`}
                    title="Open PDF in new tab"
                >
                     <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                </a>
            )}

            {isPdf && hasFileObject ? (
                <div className="flex bg-gray-200/50 p-0.5 rounded-lg border border-gray-200">
                    <button
                        onClick={() => setViewMode('text')}
                        className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${viewMode === 'text' ? theme.activeTab : theme.inactiveTab}`}
                    >
                        Text
                    </button>
                    <button
                        onClick={() => setViewMode('pdf')}
                        className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${viewMode === 'pdf' ? theme.activeTab : theme.inactiveTab}`}
                    >
                        PDF
                    </button>
                </div>
            ) : (
                 <span className={`text-xs px-2 py-0.5 rounded border font-medium ${theme.badge}`}>
                    Text View
                </span>
            )}
        </div>
      </div>
      
      <div className="flex-1 overflow-hidden relative bg-gray-100">
        {viewMode === 'pdf' && pdfUrl ? (
          <div className="w-full h-full flex flex-col">
             {/* Use object tag for better PDF embedding support compared to iframe */}
             <object
               data={pdfUrl}
               type="application/pdf"
               className="w-full h-full"
             >
                {/* Fallback content: Displays if PDF fails to load (e.g. mobile or strict security) */}
                <div className="flex flex-col h-full bg-white">
                   <div className="p-4 bg-yellow-50 border-b border-yellow-100 flex items-start gap-3">
                       <svg className="w-5 h-5 text-yellow-600 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                       <div className="flex-1">
                           <p className="text-sm text-yellow-800 font-medium">PDF Preview Unavailable</p>
                           <p className="text-xs text-yellow-700 mt-1">Your browser blocked the inline PDF. You can read the extracted text below or open the file.</p>
                           <a 
                             href={pdfUrl} 
                             target="_blank" 
                             rel="noopener noreferrer"
                             className="inline-flex items-center mt-2 px-3 py-1.5 bg-white border border-yellow-300 rounded text-xs font-medium text-yellow-800 hover:bg-yellow-100 transition-colors"
                           >
                             Open PDF in New Tab
                             <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                           </a>
                       </div>
                   </div>
                   {/* Render text as fallback */}
                   <TextView />
                </div>
             </object>
          </div>
        ) : (
          <TextView />
        )}
      </div>
    </div>
  );
};

export const PreviewModal: React.FC<PreviewModalProps> = ({ file, onClose, jobSpec }) => {
  if (!file) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-hidden" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-gray-900 bg-opacity-75 transition-opacity backdrop-blur-sm" aria-hidden="true" onClick={onClose}></div>

      {/* Modal Positioning Container */}
      <div className="flex items-center justify-center min-h-screen p-4 sm:p-6">
        
        {/* Modal Content */}
        <div className="relative bg-white rounded-2xl shadow-2xl transform transition-all w-full max-w-[95vw] h-[90vh] flex flex-col overflow-hidden">
          
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-white shrink-0">
            <div className="min-w-0">
              <h3 className="text-xl font-bold text-gray-900 truncate flex items-center gap-3">
                {file.name}
                {'score' in file && (
                  <span className={`text-sm px-3 py-1 rounded-full font-bold border shrink-0 ${
                    (file as CandidateResult).score >= 0.7 ? 'bg-green-100 text-green-700 border-green-200' :
                    (file as CandidateResult).score >= 0.4 ? 'bg-yellow-100 text-yellow-700 border-yellow-200' :
                    'bg-red-100 text-red-700 border-red-200'
                  }`}>
                    {Math.round((file as CandidateResult).score * 100)}% Match
                  </span>
                )}
              </h3>
              <p className="text-sm text-gray-500 mt-1 truncate">
                Comparing Candidate CV against Job Specification
              </p>
            </div>
            
            <button
              onClick={onClose}
              className="ml-4 text-gray-400 hover:text-gray-500 hover:bg-gray-100 p-2 rounded-full transition-colors focus:outline-none shrink-0"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Body Content - Split View */}
          <div className="flex-1 bg-gray-50 overflow-hidden p-4 sm:p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 h-full">
              
              {/* Left Panel: Candidate Document */}
              <DocumentViewer 
                doc={file} 
                title="Candidate CV" 
                colorTheme="gray" 
              />

              {/* Right Panel: Job Spec */}
              <DocumentViewer 
                doc={jobSpec || null} 
                title="Job Specification" 
                colorTheme="indigo" 
              />

            </div>
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex justify-end shrink-0">
            <button
              type="button"
              className="inline-flex justify-center rounded-lg border border-gray-300 shadow-sm px-6 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none transition-colors"
              onClick={onClose}
            >
              Close Preview
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};