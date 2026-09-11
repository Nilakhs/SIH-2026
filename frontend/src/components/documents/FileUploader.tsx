import React, { useCallback, useState } from 'react';
import { uploadDocument } from '../../api/client';
import { UploadCloud, Loader2 } from 'lucide-react';

interface FileUploaderProps {
  onUploadSuccess: () => void;
}

const FileUploader: React.FC<FileUploaderProps> = ({ onUploadSuccess }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragging(true);
    } else if (e.type === 'dragleave') {
      setIsDragging(false);
    }
  }, []);

  const processFile = async (file: File) => {
    setIsUploading(true);
    setError(null);
    try {
      await uploadDocument(file);
      onUploadSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to upload document');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  return (
    <div
      className={`relative border-2 border-dashed rounded-lg p-8 flex flex-col items-center justify-center transition-colors
        ${isDragging ? 'border-emerald-500 bg-slate-800' : 'border-slate-700 bg-slate-900'}
        ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
    >
      <input
        type="file"
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        onChange={handleChange}
        disabled={isUploading}
      />
      {isUploading ? (
        <Loader2 className="w-10 h-10 text-emerald-500 animate-spin mb-4" />
      ) : (
        <UploadCloud className="w-10 h-10 text-slate-400 mb-4" />
      )}
      <p className="text-slate-300 text-lg font-medium">
        {isUploading ? 'Uploading...' : 'Click or drag file to this area to upload'}
      </p>
      <p className="text-slate-500 text-sm mt-2">
        PDF, TXT, DOCX, etc.
      </p>
      {error && (
        <p className="text-red-400 text-sm mt-4 font-medium">{error}</p>
      )}
    </div>
  );
};

export default FileUploader;
