import React, { useEffect, useState } from 'react';
import { fetchDocumentChunks } from '../../api/client';
import type { DocumentInfo, DocumentChunk } from '../../api/client';
import { Loader2, FileText, AlertCircle } from 'lucide-react';

interface DocumentViewerProps {
  document: DocumentInfo | null;
}

const DocumentViewer: React.FC<DocumentViewerProps> = ({ document }) => {
  const [chunks, setChunks] = useState<DocumentChunk[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadChunks = async () => {
      if (!document || document.status !== 'COMPLETED') {
        setChunks([]);
        return;
      }
      
      setIsLoading(true);
      setError(null);
      try {
        const data = await fetchDocumentChunks(document.id);
        setChunks(data);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch document content');
      } finally {
        setIsLoading(false);
      }
    };

    loadChunks();
  }, [document]);

  if (!document) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-slate-500 bg-slate-800 rounded-lg border border-slate-700">
        <FileText className="w-16 h-16 mb-4 opacity-50" />
        <p className="text-lg font-medium">Select a document to view</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-slate-700 bg-slate-800/80">
        <h2 className="text-lg font-semibold text-slate-200 truncate" title={document.filename}>
          {document.filename}
        </h2>
        <div className="flex items-center text-sm text-slate-400 mt-1 space-x-4">
          <span>{document.page_count} pages</span>
          <span>{document.mime_type}</span>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-4 bg-slate-900">
        {document.status === 'PROCESSING' ? (
          <div className="flex flex-col items-center justify-center h-full text-amber-500">
            <Loader2 className="w-8 h-8 animate-spin mb-2" />
            <p>Processing document...</p>
          </div>
        ) : document.status === 'FAILED' ? (
          <div className="flex flex-col items-center justify-center h-full text-red-400">
            <AlertCircle className="w-8 h-8 mb-2" />
            <p>Failed to process document.</p>
            {document.error_msg && <p className="text-sm mt-2">{document.error_msg}</p>}
          </div>
        ) : isLoading ? (
          <div className="flex flex-col items-center justify-center h-full text-emerald-500">
            <Loader2 className="w-8 h-8 animate-spin mb-2" />
            <p>Loading text...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-full text-red-400">
            <AlertCircle className="w-8 h-8 mb-2" />
            <p>{error}</p>
          </div>
        ) : chunks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-500">
            <p>No content available.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {chunks.map((chunk) => {
              let metaDisplay = `Chunk ${chunk.chunk_index}`;
              try {
                const meta = JSON.parse(chunk.metadata);
                if (meta.page) metaDisplay = `Page ${meta.page}`;
                else if (meta.paragraphs) metaDisplay = `Paragraphs ${meta.paragraphs}`;
                else if (meta.lines) metaDisplay = `Lines ${meta.lines}`;
                else if (meta.sheet) metaDisplay = `Sheet: ${meta.sheet} (Rows ${meta.rows})`;
              } catch (e) {
                // Ignore parse errors
              }

              return (
                <div key={chunk.id} className="relative">
                  <div className="sticky top-0 bg-slate-900 text-emerald-500/80 text-xs font-mono py-1 mb-2 border-b border-slate-800 flex items-center">
                    <span className="bg-slate-800 px-2 py-0.5 rounded text-emerald-400 border border-slate-700">
                      {metaDisplay}
                    </span>
                  </div>
                  <div className="font-mono text-sm text-slate-300 whitespace-pre-wrap pl-2 border-l-2 border-slate-800">
                    {chunk.content}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default DocumentViewer;
