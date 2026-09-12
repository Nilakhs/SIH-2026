import React, { useState, useEffect, useCallback } from 'react';
import {
  FolderOutput, Download, Trash2, RefreshCw, FileText,
  File, Search, AlertCircle, CheckCircle2, Clock,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface ReportFile {
  filename: string;
  format: 'PDF' | 'DOCX';
  size_kb: number;
  created_at: string;
  download_url: string;
}

const GeneratedFiles: React.FC = () => {
  const { token } = useAuth();
  const [reports, setReports] = useState<ReportFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState('');

  const fetchReports = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/reports/list', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setReports(data.reports);
      }
    } catch (e) {
      setError('Failed to load reports. Is the backend running?');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchReports(); }, [fetchReports]);

  const handleDownload = async (report: ReportFile) => {
    const res = await fetch(`${report.download_url}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = report.filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDelete = async (filename: string) => {
    if (!confirm(`Delete ${filename}?`)) return;
    setDeleting(filename);
    try {
      await fetch(`/api/reports/${encodeURIComponent(filename)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      setReports(prev => prev.filter(r => r.filename !== filename));
    } finally {
      setDeleting(null);
    }
  };

  const filtered = reports.filter(r =>
    r.filename.toLowerCase().includes(search.toLowerCase())
  );

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });

  const totalSize = reports.reduce((acc, r) => acc + r.size_kb, 0);

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-500/10 border border-amber-500/30 rounded-lg">
            <FolderOutput className="w-6 h-6 text-amber-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Generated Files</h1>
            <p className="text-slate-400 text-sm">AI-generated PDF and DOCX reports</p>
          </div>
        </div>
        <button
          onClick={fetchReports}
          className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded-lg text-sm font-medium transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Reports', value: reports.length, icon: FileText, color: 'text-amber-400' },
          { label: 'PDF Files', value: reports.filter(r => r.format === 'PDF').length, icon: File, color: 'text-red-400' },
          { label: 'Total Size', value: `${(totalSize / 1024).toFixed(1)} MB`, icon: FolderOutput, color: 'text-sky-400' },
        ].map(stat => (
          <div key={stat.label} className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center gap-3">
            <stat.icon className={`w-5 h-5 ${stat.color}`} />
            <div>
              <p className="text-xs text-slate-400">{stat.label}</p>
              <p className={`text-xl font-bold font-mono ${stat.color}`}>{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search files..."
          className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-9 pr-4 py-2 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500/60 text-sm"
        />
      </div>

      {/* Info banner */}
      <div className="bg-amber-950/20 border border-amber-900/40 rounded-xl p-4 flex gap-3 items-start">
        <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm text-amber-300 font-medium">How to generate reports</p>
          <p className="text-xs text-slate-400 mt-1">
            Ask the AI Agent in the Workbench: <span className="font-mono bg-slate-800 px-1.5 py-0.5 rounded text-amber-300">"Generate a PDF report analyzing [topic]"</span>.
            The AI will use the <span className="font-mono text-slate-300">GENERATE_REPORT</span> tool and the file will appear here automatically.
          </p>
        </div>
      </div>

      {/* File List */}
      {error ? (
        <div className="text-center py-16 text-red-400 space-y-2">
          <AlertCircle className="w-10 h-10 mx-auto" />
          <p>{error}</p>
        </div>
      ) : loading ? (
        <div className="flex items-center justify-center py-16 gap-3 text-slate-500">
          <RefreshCw className="w-5 h-5 animate-spin" />
          Loading reports...
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 space-y-4">
          <FolderOutput className="w-14 h-14 mx-auto text-slate-700" />
          <div>
            <p className="text-slate-400 font-medium">
              {search ? 'No reports match your search.' : 'No reports generated yet.'}
            </p>
            <p className="text-slate-600 text-sm mt-1">
              Ask the AI in the Workbench to generate a PDF or DOCX report.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map(report => (
            <div
              key={report.filename}
              className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center gap-4 hover:border-slate-700 transition-colors"
            >
              {/* Icon */}
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                report.format === 'PDF'
                  ? 'bg-red-500/10 border border-red-500/30'
                  : 'bg-sky-500/10 border border-sky-500/30'
              }`}>
                <FileText className={`w-5 h-5 ${report.format === 'PDF' ? 'text-red-400' : 'text-sky-400'}`} />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-slate-100 font-medium text-sm truncate">{report.filename}</p>
                <div className="flex items-center gap-3 mt-1">
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border font-mono ${
                    report.format === 'PDF'
                      ? 'bg-red-500/10 text-red-400 border-red-500/30'
                      : 'bg-sky-500/10 text-sky-400 border-sky-500/30'
                  }`}>{report.format}</span>
                  <span className="text-xs text-slate-500">{report.size_kb} KB</span>
                  <span className="flex items-center gap-1 text-xs text-slate-500">
                    <Clock className="w-3 h-3" />
                    {formatDate(report.created_at)}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => handleDownload(report)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 rounded-lg text-xs font-medium transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download
                </button>
                <button
                  onClick={() => handleDelete(report.filename)}
                  disabled={deleting === report.filename}
                  className="p-1.5 text-slate-500 hover:text-red-400 transition-colors rounded-lg hover:bg-red-500/10"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default GeneratedFiles;
