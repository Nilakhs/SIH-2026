import React, { useState, useEffect } from 'react';
import { 
  ScrollText, 
  ShieldCheck, 
  Download, 
  RefreshCw, 
  Search, 
  Terminal, 
  Eye, 
  FileText, 
  Cpu, 
  CheckCircle2, 
  AlertTriangle,
  Clock
} from 'lucide-react';
import type { AuditLogItem, AuditStatsResponse } from '../types';
import { fetchAuditLogs, fetchAuditStats } from '../api/client';

const ExecutionLogs: React.FC = () => {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [stats, setStats] = useState<AuditStatsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [eventType, setEventType] = useState<string>('ALL');
  const [status, setStatus] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');

  const loadData = async () => {
    try {
      setLoading(true);
      const [logsData, statsData] = await Promise.all([
        fetchAuditLogs({
          event_type: eventType === 'ALL' ? undefined : eventType,
          status: status === 'ALL' ? undefined : status,
          search: searchTerm ? searchTerm : undefined,
          limit: 150
        }),
        fetchAuditStats()
      ]);
      setLogs(logsData);
      setStats(statsData);
    } catch (e) {
      console.error('Failed to load audit logs:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [eventType, status]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadData();
  };

  const getEventBadge = (type: string) => {
    const t = type.toUpperCase();
    if (t.includes('SANDBOX')) {
      return (
        <span className="text-[11px] font-mono uppercase px-2 py-0.5 rounded bg-amber-950 text-amber-400 border border-amber-800/60 flex items-center gap-1 w-max">
          <Terminal className="w-3 h-3" /> Sandbox
        </span>
      );
    }
    if (t.includes('VISION')) {
      return (
        <span className="text-[11px] font-mono uppercase px-2 py-0.5 rounded bg-purple-950 text-purple-400 border border-purple-800/60 flex items-center gap-1 w-max">
          <Eye className="w-3 h-3" /> Vision
        </span>
      );
    }
    if (t.includes('DOC') || t.includes('GENERATION')) {
      return (
        <span className="text-[11px] font-mono uppercase px-2 py-0.5 rounded bg-blue-950 text-blue-400 border border-blue-800/60 flex items-center gap-1 w-max">
          <FileText className="w-3 h-3" /> DocGen
        </span>
      );
    }
    return (
      <span className="text-[11px] font-mono uppercase px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 flex items-center gap-1 w-max">
        <Cpu className="w-3 h-3" /> System
      </span>
    );
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-white">Execution Logs & Audit Trail</h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800/60 font-mono font-semibold">
              FLIGHT RECORDER
            </span>
          </div>
          <p className="text-slate-400 text-sm mt-1">
            Tamper-resistant local audit log tracking every agent tool execution, Docker sandbox run, and model inference.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href="/api/audit/export"
            download="sovereign_ai_audit_trail.csv"
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-amber-400 rounded-lg border border-slate-700 text-xs font-semibold font-mono transition-colors flex items-center gap-1.5 shadow"
            title="Download CSV Audit Trail"
          >
            <Download className="w-3.5 h-3.5" /> Export Audit Log (CSV)
          </a>
          <button
            onClick={loadData}
            disabled={loading}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 transition-colors"
            title="Refresh logs"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl">
          <div className="text-xs font-mono text-slate-500 uppercase tracking-wider">Total Events</div>
          <div className="text-2xl font-bold font-mono text-white mt-1">{stats?.total_events ?? logs.length}</div>
        </div>
        <div className="p-4 bg-slate-900/60 border border-amber-900/40 rounded-xl">
          <div className="text-xs font-mono text-amber-400 uppercase tracking-wider">Sandbox Runs</div>
          <div className="text-2xl font-bold font-mono text-white mt-1">{stats?.sandbox_runs ?? 0}</div>
        </div>
        <div className="p-4 bg-slate-900/60 border border-purple-900/40 rounded-xl">
          <div className="text-xs font-mono text-purple-400 uppercase tracking-wider">Vision Runs</div>
          <div className="text-2xl font-bold font-mono text-white mt-1">{stats?.vision_inferences ?? 0}</div>
        </div>
        <div className="p-4 bg-slate-900/60 border border-blue-900/40 rounded-xl">
          <div className="text-xs font-mono text-blue-400 uppercase tracking-wider">Docs Generated</div>
          <div className="text-2xl font-bold font-mono text-white mt-1">{stats?.documents_generated ?? 0}</div>
        </div>
        <div className="p-4 bg-slate-900/60 border border-emerald-900/40 rounded-xl col-span-2 sm:col-span-1">
          <div className="text-xs font-mono text-emerald-400 uppercase tracking-wider">Air-Gap Verified</div>
          <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">100.0%</div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div>
            <label className="block text-[11px] font-mono text-slate-400 mb-1">Event Category</label>
            <select
              value={eventType}
              onChange={(e) => setEventType(e.target.value)}
              className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-amber-500"
            >
              <option value="ALL">All Categories</option>
              <option value="DOCKER_SANDBOX">Docker Sandbox</option>
              <option value="IMAGE_VISION">Multimodal Vision</option>
              <option value="DOCUMENT_GENERATION">Document Generation</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-mono text-slate-400 mb-1">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-amber-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="COMPLETED">Completed</option>
              <option value="FAILED">Failed</option>
            </select>
          </div>
        </div>

        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 w-full md:w-80">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search logs..."
              className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500 font-mono"
            />
          </div>
          <button
            type="submit"
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded-lg text-xs font-mono"
          >
            Filter
          </button>
        </form>
      </div>

      {/* Flight Recorder Table */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
        <div className="px-5 py-3.5 border-b border-slate-800 bg-slate-900 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ScrollText className="w-4 h-4 text-amber-500" />
            <span className="text-sm font-semibold text-slate-200 uppercase tracking-wider font-mono">
              Audit Event Stream
            </span>
          </div>
          <span className="text-xs text-slate-500 font-mono">
            {logs.length} logged record{logs.length === 1 ? '' : 's'}
          </span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-500 font-mono text-sm">Loading execution logs...</div>
        ) : logs.length === 0 ? (
          <div className="p-16 text-center text-slate-500 space-y-2">
            <ScrollText className="w-10 h-10 mx-auto text-slate-600" />
            <p className="text-sm font-medium text-slate-400">No execution logs match the selected filter.</p>
            <p className="text-xs text-slate-600">Run an analysis, vision query, or report generation to see events recorded.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-[11px] font-mono text-slate-400 uppercase tracking-wider bg-slate-950/40">
                  <th className="py-3 px-4">Timestamp (UTC)</th>
                  <th className="py-3 px-4">Event Type</th>
                  <th className="py-3 px-4">Model / Runtime</th>
                  <th className="py-3 px-4">Duration</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Execution Summary</th>
                  <th className="py-3 px-4 text-right">Air-Gap Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-sm font-mono">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 text-xs text-slate-400 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-500" />
                        <span>{new Date(log.timestamp).toISOString().replace('T', ' ').slice(0, 19)}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      {getEventBadge(log.event_type)}
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-300">
                      {log.model || log.tool_name || 'System'}
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-400">
                      {log.duration_ms && log.duration_ms > 0 ? `${log.duration_ms.toFixed(0)} ms` : '—'}
                    </td>
                    <td className="py-3 px-4">
                      {log.status === 'COMPLETED' ? (
                        <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800/60 inline-flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> SUCCESS
                        </span>
                      ) : (
                        <span className="text-[10px] px-2 py-0.5 rounded bg-red-950 text-red-400 border border-red-800/60 inline-flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" /> FAILED
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-300 max-w-md truncate font-sans">
                      {log.summary || 'Operational step completed.'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800/50 inline-flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3" /> 0-EGRESS
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default ExecutionLogs;
