import React, { useCallback } from 'react';

interface DropZoneProps {
  onFilesAdded: (files: File[]) => void;
  accept?: string;
  label: string;
  subLabel?: string;
  icon?: React.ReactNode;
  compact?: boolean;
  multiple?: boolean;
}

export const DropZone: React.FC<DropZoneProps> = ({ 
  onFilesAdded, 
  accept = ".pdf,.txt", 
  label,
  subLabel,
  icon,
  compact = false,
  multiple = false
}) => {
  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const filesArray = Array.from(e.dataTransfer.files);
      onFilesAdded(filesArray);
    }
  }, [onFilesAdded]);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const filesArray = Array.from(e.target.files);
      onFilesAdded(filesArray);
    }
  };

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      className={`
        relative border-2 border-dashed border-gray-300 rounded-xl 
        hover:border-indigo-500 hover:bg-indigo-50 transition-colors cursor-pointer
        flex flex-col items-center justify-center text-center
        ${compact ? 'p-4' : 'p-8'}
      `}
    >
      <input
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={handleChange}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
      />
      
      {icon && <div className="mb-3 text-indigo-500">{icon}</div>}
      
      <p className={`font-medium text-gray-700 ${compact ? 'text-sm' : 'text-lg'}`}>
        {label}
      </p>
      
      {subLabel && (
        <p className="mt-1 text-sm text-gray-400">
          {subLabel}
        </p>
      )}
    </div>
  );
};
