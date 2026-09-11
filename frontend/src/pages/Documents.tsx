import React, { useState, useEffect, useCallback } from 'react';
import FileUploader from '../components/documents/FileUploader';
import DocumentList from '../components/documents/DocumentList';
import DocumentViewer from '../components/documents/DocumentViewer';
import { fetchDocuments, deleteDocument } from '../api/client';
import type { DocumentInfo } from '../api/client';
import { Database } from 'lucide-react';

const Documents: React.FC = () => {
  const [documents, setDocuments] = useState<DocumentInfo[]>([]);
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);

  const loadDocuments = useCallback(async () => {
    try {
      const docs = await fetchDocuments();
      setDocuments(docs);
    } catch (error) {
      console.error('Failed to fetch documents:', error);
    }
  }, []);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this document?')) return;
    try {
      await deleteDocument(id);
      if (selectedDocumentId === id) {
        setSelectedDocumentId(null);
      }
      loadDocuments();
    } catch (error) {
      console.error('Failed to delete document:', error);
      alert('Failed to delete document');
    }
  };

  const selectedDocument = documents.find(d => d.id === selectedDocumentId) || null;

  return (
    <div className="h-full flex flex-col space-y-6">
      <div className="flex items-center space-x-3 mb-2">
        <Database className="w-8 h-8 text-emerald-500" />
        <h1 className="text-2xl font-bold text-slate-200">Documents</h1>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-0">
        {/* Left Column: Upload & List */}
        <div className="lg:col-span-5 flex flex-col space-y-6 overflow-y-auto pr-2 custom-scrollbar">
          <section>
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">Upload Document</h2>
            <FileUploader onUploadSuccess={loadDocuments} />
          </section>

          <section className="flex-1 flex flex-col min-h-0">
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">Document Library</h2>
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              <DocumentList 
                documents={documents}
                selectedDocumentId={selectedDocumentId}
                onSelectDocument={setSelectedDocumentId}
                onDeleteDocument={handleDelete}
                refreshDocuments={loadDocuments}
              />
            </div>
          </section>
        </div>

        {/* Right Column: Viewer */}
        <div className="lg:col-span-7 h-[600px] lg:h-auto overflow-hidden">
          <DocumentViewer document={selectedDocument} />
        </div>
      </div>
    </div>
  );
};

export default Documents;
