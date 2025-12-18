import React from 'react';
import { CandidateResult } from '../types';

interface ResultCardProps {
  candidate: CandidateResult;
  rank: number;
  onClick: () => void;
}

export const ResultCard: React.FC<ResultCardProps> = ({ candidate, rank, onClick }) => {
  // Determine color based on score
  const getScoreColor = (score: number) => {
    if (score >= 0.8) return 'text-green-600 bg-green-50 border-green-200';
    if (score >= 0.6) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  const scorePercentage = Math.round(candidate.score * 100);

  return (
    <div 
      onClick={onClick}
      className="group relative flex items-center p-4 bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md hover:border-indigo-300 transition-all cursor-pointer"
    >
      <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 font-semibold text-sm mr-4">
        #{rank}
      </div>
      
      <div className="flex-1 min-w-0">
        <h3 className="text-base font-medium text-gray-900 truncate group-hover:text-indigo-600">
          {candidate.name}
        </h3>
        <p className="text-sm text-gray-500 truncate">
          File size: {(candidate.size / 1024).toFixed(1)} KB
        </p>
      </div>

      <div className={`ml-4 flex items-center justify-center px-3 py-1 rounded-full border text-sm font-bold ${getScoreColor(candidate.score)}`}>
        {scorePercentage}% Match
      </div>
    </div>
  );
};