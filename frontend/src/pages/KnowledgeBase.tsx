import React, { useState, useEffect, useCallback } from 'react';
import { Database, Server, RefreshCw, Trash2 } from 'lucide-react';
import { fetchKnowledgeStatus, fetchDocuments, deleteDocument, reindexDocument } from '../api/client';
import type { KnowledgeStatus, DocumentInfo } from '../api/client';

const KnowledgeBase: React.FC = () => {
  const [status, setStatus] = useState<KnowledgeStatus | null>(null);
  const [documents, setDocuments] = useState<DocumentInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [reindexingId, setReindexingId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [statusData, docsData] = await Promise.all([
        fetchKnowledgeStatus().catch(() => null),
        fetchDocuments().catch(() => [])
      ]);
      if (statusData) setStatus(statusData);
      setDocuments(docsData);
    } catch (error) {
      console.error('Failed to load knowledge base data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, [loadData]);

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this document from the knowledge base?')) return;
    try {
      await deleteDocument(id);
      loadData();
    } catch (error) {
      console.error('Failed to delete document:', error);
      alert('Failed to delete document');
    }
  };

  const handleReindex = async (id: string) => {
    try {
      setReindexingId(id);
      await reindexDocument(id);
      loadData();
    } catch (error) {
      console.error('Failed to re-index document:', error);
      alert('Failed to re-index document');
    } finally {
      setReindexingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">INDEXED</span>;
      case 'PROCESSING':
        return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 animate-pulse">INDEXING</span>;
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
    <div className="h-full flex flex-col space-y-6">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-3">
          <Database className="w-8 h-8 text-emerald-500" />
          <h1 className="text-2xl font-bold text-slate-200">Knowledge Base</h1>
        </div>
        <button 
          onClick={loadData}
          className="flex items-center space-x-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span className="text-sm font-medium">Refresh</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-6 shadow-sm flex flex-col">
          <div className="flex items-center space-x-3 mb-4">
            <div className={`p-2 rounded-lg ${status?.available ? 'bg-emerald-900/30 text-emerald-500' : 'bg-red-900/30 text-red-500'}`}>
              <Server className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-medium text-slate-300">Qdrant Connection</h2>
          </div>
          <div className="mt-auto">
            <p className="text-3xl font-bold text-slate-100">
              {status ? (status.available ? 'Connected' : 'Disconnected') : 'Loading...'}
            </p>
            <p className="text-sm text-slate-500 mt-1">Vector Database Status</p>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-lg p-6 shadow-sm flex flex-col">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2 rounded-lg bg-blue-900/30 text-blue-500">
              <Database className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-medium text-slate-300">Total Indexed Chunks</h2>
          </div>
          <div className="mt-auto">
            <p className="text-3xl font-bold text-slate-100">
              {status?.vector_count !== undefined ? status.vector_count.toLocaleString() : '---'}
            </p>
            <p className="text-sm text-slate-500 mt-1">Embeddings in collection {status?.collection ? `'${status.collection}'` : ''}</p>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-lg p-6 shadow-sm flex flex-col">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2 rounded-lg bg-amber-900/30 text-amber-500">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
              </svg>
            </div>
            <h2 className="text-lg font-medium text-slate-300">Documents</h2>
          </div>
          <div className="mt-auto">
            <p className="text-3xl font-bold text-slate-100">
              {documents.length}
            </p>
            <p className="text-sm text-slate-500 mt-1">Total documents processed</p>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col min-h-0 bg-slate-900 border border-slate-800 rounded-lg shadow-sm">
        <div className="p-4 border-b border-slate-800 bg-slate-900/50">
          <h2 className="text-lg font-medium text-slate-200">Document Index</h2>
        </div>
        <div className="flex-1 overflow-auto custom-scrollbar">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-900/80 text-slate-400 uppercase sticky top-0 z-10 backdrop-blur-sm">
              <tr>
                <th className="px-6 py-4 font-medium">Filename</th>
                <th className="px-6 py-4 font-medium">Size</th>
                <th className="px-6 py-4 font-medium">Pages</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {documents.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                    No documents have been added to the knowledge base yet.
                  </td>
                </tr>
              ) : (
                documents.map((doc) => (
                  <tr key={doc.id} className="transition-colors hover:bg-slate-800/50 group">
                    <td className="px-6 py-4 font-medium text-slate-200 truncate max-w-[250px]" title={doc.filename}>
                      {doc.filename}
                    </td>
                    <td className="px-6 py-4 text-slate-400">
                      {formatSize(doc.file_size)}
                    </td>
                    <td className="px-6 py-4 text-slate-400">
                      {doc.page_count || '-'}
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(doc.status)}
                    </td>
                    <td className="px-6 py-4 text-right space-x-2 opacity-100 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => handleReindex(doc.id)}
                        disabled={reindexingId === doc.id || doc.status === 'PROCESSING'}
                        className="px-3 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 disabled:opacity-50 disabled:hover:bg-slate-800 text-slate-300 rounded border border-slate-700 transition-colors inline-flex items-center"
                        title="Re-index document"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${reindexingId === doc.id ? 'animate-spin text-amber-500' : 'text-slate-400'}`} />
                        Re-index
                      </button>
                      <button 
                        onClick={() => handleDelete(doc.id)}
                        className="px-3 py-1.5 text-xs font-medium bg-red-950/30 hover:bg-red-900/40 text-red-400 rounded border border-red-900/30 hover:border-red-800/50 transition-colors inline-flex items-center"
                        title="Delete document and embeddings"
                      >
                        <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default KnowledgeBase;
