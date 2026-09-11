import React, { useEffect } from 'react';
import type { DocumentInfo } from '../../api/client';
import { Trash2, Eye } from 'lucide-react';

interface DocumentListProps {
  documents: DocumentInfo[];
  selectedDocumentId: string | null;
  onSelectDocument: (id: string) => void;
  onDeleteDocument: (id: string) => void;
  refreshDocuments: () => void;
}

const DocumentList: React.FC<DocumentListProps> = ({
  documents,
  selectedDocumentId,
  onSelectDocument,
  onDeleteDocument,
  refreshDocuments
}) => {
  useEffect(() => {
    const hasProcessing = documents.some(doc => doc.status === 'PROCESSING');
    if (hasProcessing) {
      const interval = setInterval(() => {
        refreshDocuments();
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [documents, refreshDocuments]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">COMPLETED</span>;
      case 'PROCESSING':
        return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 animate-pulse">PROCESSING</span>;
      case 'FAILED':
        return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-500/20 text-red-400 border border-red-500/30">FAILED</span>;
      default:
        return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-slate-500/20 text-slate-400 border border-slate-500/30">{status}</span>;
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
      <table className="w-full text-left text-sm text-slate-300">
        <thead className="bg-slate-900/50 text-slate-400 uppercase">
          <tr>
            <th className="px-4 py-3 font-medium">Filename</th>
            <th className="px-4 py-3 font-medium">Size</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 font-medium text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-700/50">
          {documents.length === 0 ? (
            <tr>
              <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
                No documents uploaded yet.
              </td>
            </tr>
          ) : (
            documents.map((doc) => (
              <tr 
                key={doc.id} 
                className={`transition-colors hover:bg-slate-700/30 ${selectedDocumentId === doc.id ? 'bg-slate-700/50' : ''}`}
              >
                <td className="px-4 py-3 font-medium text-slate-200 truncate max-w-[200px]" title={doc.filename}>
                  {doc.filename}
                </td>
                <td className="px-4 py-3 text-slate-400">
                  {formatSize(doc.file_size)}
                </td>
                <td className="px-4 py-3">
                  {getStatusBadge(doc.status)}
                </td>
                <td className="px-4 py-3 text-right space-x-2">
                  <button 
                    onClick={() => onSelectDocument(doc.id)}
                    className="p-1.5 text-slate-400 hover:text-emerald-400 hover:bg-slate-700 rounded transition-colors"
                    title="View"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => onDeleteDocument(doc.id)}
                    className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-700 rounded transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default DocumentList;
