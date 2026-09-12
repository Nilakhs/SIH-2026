import React, { useState, useEffect, useCallback } from 'react';
import {
  ScrollText, RefreshCw, Shield, CheckCircle2, XCircle,
  AlertTriangle, Filter, ChevronLeft, ChevronRight, Search
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface AuditLog {
  id: string;
  timestamp: string;
  username: string;
  action: string;
  resource_type: string | null;
  resource_id: string | null;
  ip_address: string | null;
  status: string;
  entry_hash: string;
  prev_hash: string;
}

interface ChainVerification {
  total_entries: number;
  chain_valid: boolean;
  broken_entries: string[];
  verified_at?: string;
}

const ACTION_COLORS: Record<string, string> = {
  LOGIN_SUCCESS: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  LOGIN_FAILED: 'bg-red-500/15 text-red-400 border-red-500/30',
  USER_REGISTERED: 'bg-sky-500/15 text-sky-400 border-sky-500/30',
  AGENT_RUN: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  DOCUMENT_UPLOAD: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
  DOCUMENT_DELETE: 'bg-red-500/15 text-red-400 border-red-500/30',
};

const AuditLog: React.FC = () => {
  const { token, user } = useAuth();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [verification, setVerification] = useState<ChainVerification | null>(null);
  const [verifying, setVerifying] = useState(false);
  const LIMIT = 20;

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        limit: String(LIMIT),
        offset: String(page * LIMIT),
        ...(search ? { action: search } : {}),
      });
      const res = await fetch(`/api/audit/logs?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs);
        setTotal(data.total);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [token, page, search]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const verifyChain = async () => {
    setVerifying(true);
    try {
      const res = await fetch('/api/audit/verify', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setVerification(await res.json());
    } finally {
      setVerifying(false);
    }
  };

  const totalPages = Math.ceil(total / LIMIT);

  const formatTime = (ts: string) => {
    const d = new Date(ts);
    return d.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/10 border border-amber-500/30 rounded-lg">
              <ScrollText className="w-6 h-6 text-amber-500" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Audit Trail</h1>
              <p className="text-slate-400 text-sm">Hash-chained tamper-evident log of all actions</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {user?.role === 'ADMIN' && (
            <button
              onClick={verifyChain}
              disabled={verifying}
              className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded-lg text-sm font-medium transition-colors"
            >
              <Shield className="w-4 h-4 text-amber-400" />
              {verifying ? 'Verifying...' : 'Verify Chain'}
            </button>
          )}
          <button onClick={fetchLogs} className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded-lg text-sm font-medium transition-colors">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Chain Verification Banner */}
      {verification && (
        <div className={`flex items-center gap-4 p-4 rounded-xl border ${
          verification.chain_valid
            ? 'bg-emerald-950/20 border-emerald-900/50'
            : 'bg-red-950/20 border-red-900/50'
        }`}>
          {verification.chain_valid
            ? <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
            : <XCircle className="w-6 h-6 text-red-400 shrink-0" />}
          <div>
            <p className={`font-semibold text-sm ${verification.chain_valid ? 'text-emerald-300' : 'text-red-300'}`}>
              {verification.chain_valid
                ? `✅ Chain Integrity Verified — ${verification.total_entries} entries, zero tampering detected`
                : `⚠️ Chain Compromised — ${verification.broken_entries.length} tampered entries detected`}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">
              SHA-256 hash chain verified at {verification.verified_at ? formatTime(verification.verified_at) : 'now'}
            </p>
          </div>
        </div>
      )}

      {/* Stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Events', value: total, color: 'text-slate-100' },
          { label: 'This Page', value: logs.length, color: 'text-sky-400' },
          { label: 'Page', value: `${page + 1} / ${Math.max(1, totalPages)}`, color: 'text-amber-400' },
          { label: 'Chain Status', value: verification ? (verification.chain_valid ? 'VALID ✓' : 'BROKEN ✗') : 'UNVERIFIED', color: verification ? (verification.chain_valid ? 'text-emerald-400' : 'text-red-400') : 'text-slate-500' },
        ].map(s => (
          <div key={s.label} className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <p className="text-xs text-slate-400 uppercase tracking-wider">{s.label}</p>
            <p className={`text-xl font-bold font-mono mt-1 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Search + Filter */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { setSearch(searchInput); setPage(0); } }}
            placeholder="Filter by action..."
            className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-9 pr-4 py-2 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500/60 text-sm"
          />
        </div>
        <button
          onClick={() => { setSearch(searchInput); setPage(0); }}
          className="flex items-center gap-2 px-4 py-2 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-lg text-sm font-medium hover:bg-amber-500/20 transition-colors"
        >
          <Filter className="w-4 h-4" />
          Filter
        </button>
        {search && (
          <button onClick={() => { setSearch(''); setSearchInput(''); setPage(0); }}
            className="text-xs text-slate-500 hover:text-slate-300 transition-colors">
            Clear
          </button>
        )}
      </div>

      {/* Log Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-900/90 text-slate-400 border-b border-slate-800 uppercase text-[10px]">
              <tr>
                <th className="p-3">Timestamp</th>
                <th className="p-3">User</th>
                <th className="p-3">Action</th>
                <th className="p-3">Resource</th>
                <th className="p-3">IP</th>
                <th className="p-3">Status</th>
                <th className="p-3">Hash</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Loading audit logs...
                    </div>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500">No audit events found.</td>
                </tr>
              ) : (
                logs.map(log => (
                  <tr key={log.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="p-3 text-slate-400 whitespace-nowrap">{formatTime(log.timestamp)}</td>
                    <td className="p-3 text-slate-200 font-semibold">{log.username || '—'}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${ACTION_COLORS[log.action] || 'bg-slate-800 text-slate-400 border-slate-700'}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="p-3 text-slate-400">
                      {log.resource_type && <span className="text-slate-300">{log.resource_type}</span>}
                      {log.resource_id && <span className="text-slate-600 ml-1">#{log.resource_id.slice(0, 8)}</span>}
                      {!log.resource_type && '—'}
                    </td>
                    <td className="p-3 text-slate-500">{log.ip_address || '—'}</td>
                    <td className="p-3">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        log.status === 'SUCCESS' ? 'text-emerald-400 bg-emerald-500/10' : 'text-red-400 bg-red-500/10'
                      }`}>
                        {log.status}
                      </span>
                    </td>
                    <td className="p-3 text-slate-600" title={log.entry_hash}>
                      {log.entry_hash?.slice(0, 12)}…
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-800">
            <p className="text-xs text-slate-500 font-mono">
              Showing {page * LIMIT + 1}–{Math.min((page + 1) * LIMIT, total)} of {total}
            </p>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
                className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                <ChevronLeft className="w-4 h-4 text-slate-300" />
              </button>
              <span className="text-xs text-slate-400 font-mono px-2">{page + 1} / {totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
                className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                <ChevronRight className="w-4 h-4 text-slate-300" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuditLog;
