import React, { useState, useEffect, useCallback } from 'react';
import { 
  Shield, 
  Wifi, 
  WifiOff, 
  Activity, 
  Radio, 
  ArrowUpRight, 
  ArrowDownLeft, 
  RefreshCw, 
  Server, 
  CheckCircle2, 
  HelpCircle,
  Cpu,
  Database,
  Terminal,
  Layers
} from 'lucide-react';
import { fetchSovereigntyTelemetry, type SovereigntyReport } from '../api/client';

const SovereigntyMonitor: React.FC = () => {
  const [telemetry, setTelemetry] = useState<SovereigntyReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<'ALL' | 'LOOPBACK' | 'PRIVATE_LAN' | 'EXTERNAL'>('ALL');
  const [autoRefresh, setAutoRefresh] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const data = await fetchSovereigntyTelemetry();
      setTelemetry(data);
    } catch (err) {
      console.error('Failed to fetch sovereignty telemetry', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    if (!autoRefresh) return;
    const interval = setInterval(loadData, 2500);
    return () => clearInterval(interval);
  }, [loadData, autoRefresh]);

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  };

  const evidence = telemetry?.network_evidence;
  const services = telemetry?.services || {};

  const filteredConnections = (telemetry?.connections || []).filter(c => {
    if (filterType === 'ALL') return true;
    return c.type === filterType;
  });

  return (
    <div className="flex flex-col h-full w-full bg-slate-950 text-slate-200 overflow-y-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-lg">
            <Shield className="w-7 h-7 text-amber-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
              Sovereignty Monitor
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                LIVE AUDIT
              </span>
            </h1>
            <p className="text-slate-400 text-sm">
              Real-time Windows network telemetry, port inspection, and air-gap evidence.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors flex items-center gap-2 ${
              autoRefresh 
                ? 'bg-emerald-950/40 text-emerald-400 border-emerald-800/60' 
                : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${autoRefresh ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
            {autoRefresh ? 'Live Polling (2.5s)' : 'Polling Paused'}
          </button>

          <button
            onClick={loadData}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 text-xs font-medium transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* SECTION 1: NETWORK EVIDENCE */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-amber-500" />
            <h2 className="text-base font-semibold uppercase tracking-wider text-slate-300">
              Network Evidence
            </h2>
          </div>
          <span className="text-xs font-mono text-slate-400">
            Source: OS Kernel Network Socket Table
          </span>
        </div>

        {/* Internet Status Banner */}
        <div className={`p-4 rounded-xl border flex items-center justify-between ${
          evidence?.internet === 'DISCONNECTED'
            ? 'bg-emerald-950/20 border-emerald-900/50 text-emerald-300'
            : evidence?.internet === 'CONNECTED'
            ? 'bg-amber-950/20 border-amber-900/50 text-amber-300'
            : 'bg-slate-900 border-slate-800 text-slate-300'
        }`}>
          <div className="flex items-center gap-3">
            {evidence?.internet === 'DISCONNECTED' ? (
              <div className="p-3 bg-emerald-900/30 border border-emerald-700/40 rounded-xl">
                <WifiOff className="w-6 h-6 text-emerald-400" />
              </div>
            ) : evidence?.internet === 'CONNECTED' ? (
              <div className="p-3 bg-amber-900/30 border border-amber-700/40 rounded-xl">
                <Wifi className="w-6 h-6 text-amber-400" />
              </div>
            ) : (
              <div className="p-3 bg-slate-800 border border-slate-700 rounded-xl">
                <HelpCircle className="w-6 h-6 text-slate-400" />
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase tracking-wider font-semibold text-slate-400">
                  Internet Connectivity Status
                </span>
                <span className={`px-2 py-0.5 rounded font-mono font-bold text-xs ${
                  evidence?.internet === 'DISCONNECTED'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : evidence?.internet === 'CONNECTED'
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    : 'bg-slate-800 text-slate-400'
                }`}>
                  {evidence?.internet || 'DETECTING...'}
                </span>
              </div>
              <p className="text-sm mt-1">
                {evidence?.internet === 'DISCONNECTED'
                  ? 'AIR-GAPPED: No outbound default gateway or internet route available. Zero internet connectivity.'
                  : evidence?.internet === 'CONNECTED'
                  ? 'ONLINE: Host has an active internet route. Disconnect Wi-Fi to demonstrate full air-gap isolation.'
                  : 'Probing host network routing tables...'}
              </p>
            </div>
          </div>

          <div className="text-right text-xs font-mono text-slate-400 hidden md:block">
            Verified by: Transport-layer raw socket probe (Zero Cloud APIs)
          </div>
        </div>

        {/* Evidence Metric Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* External Connections */}
          <div className="bg-slate-900/70 border border-slate-800 p-4 rounded-xl">
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-2">
              <span>External Connections</span>
              <Radio className="w-4 h-4 text-amber-500" />
            </div>
            <div className={`text-2xl font-bold font-mono ${
              (evidence?.external_connections ?? 0) === 0 ? 'text-emerald-400' : 'text-amber-400'
            }`}>
              {evidence?.external_connections ?? '---'}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Active TCP sockets bound to public IPs
            </p>
          </div>

          {/* Localhost Connections */}
          <div className="bg-slate-900/70 border border-slate-800 p-4 rounded-xl">
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-2">
              <span>Local Connections</span>
              <Layers className="w-4 h-4 text-sky-400" />
            </div>
            <div className="text-2xl font-bold font-mono text-sky-400">
              {evidence?.local_connections ?? '---'}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Internal loopback (127.0.0.1 / ::1)
            </p>
          </div>

          {/* Outbound Bytes */}
          <div className="bg-slate-900/70 border border-slate-800 p-4 rounded-xl">
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-2">
              <span>Outbound Bytes</span>
              <ArrowUpRight className="w-4 h-4 text-slate-400" />
            </div>
            <div className="text-2xl font-bold font-mono text-slate-200">
              {evidence ? formatBytes(evidence.outbound_bytes) : '---'}
            </div>
            <p className="text-xs text-slate-500 mt-1 font-mono">
              Raw: {evidence?.outbound_bytes.toLocaleString() ?? 0} B
            </p>
          </div>

          {/* Inbound Bytes */}
          <div className="bg-slate-900/70 border border-slate-800 p-4 rounded-xl">
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-2">
              <span>Inbound Bytes</span>
              <ArrowDownLeft className="w-4 h-4 text-slate-400" />
            </div>
            <div className="text-2xl font-bold font-mono text-slate-200">
              {evidence ? formatBytes(evidence.inbound_bytes) : '---'}
            </div>
            <p className="text-xs text-slate-500 mt-1 font-mono">
              Raw: {evidence?.inbound_bytes.toLocaleString() ?? 0} B
            </p>
          </div>
        </div>

        {/* Active Local Services Section */}
        <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-xl space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <Server className="w-4 h-4 text-emerald-400" />
              Active Local Services (Localhost Only)
            </h3>
            <span className="text-xs text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 px-2 py-0.5 rounded font-mono">
              Zero External Ingestion
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Ollama */}
            <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-lg flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-sm text-slate-200 flex items-center gap-1.5">
                  <Cpu className="w-4 h-4 text-amber-500" />
                  Ollama (LLM)
                </span>
                <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                  services.Ollama?.status === 'RUNNING'
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : 'bg-slate-800 text-slate-500'
                }`}>
                  {services.Ollama?.status || 'STOPPED'}
                </span>
              </div>
              <div className="mt-2 text-xs font-mono text-slate-400">
                <div>Port: <span className="text-amber-400">11434</span> (localhost)</div>
                <div>Sockets: <span className="text-slate-200">{services.Ollama?.connection_count ?? 0} active</span></div>
              </div>
            </div>

            {/* Qdrant */}
            <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-lg flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-sm text-slate-200 flex items-center gap-1.5">
                  <Database className="w-4 h-4 text-emerald-500" />
                  Qdrant (Vector DB)
                </span>
                <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                  services.Qdrant?.status === 'RUNNING'
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : 'bg-slate-800 text-slate-500'
                }`}>
                  {services.Qdrant?.status || 'STOPPED'}
                </span>
              </div>
              <div className="mt-2 text-xs font-mono text-slate-400">
                <div>Port: <span className="text-emerald-400">6333</span> (localhost)</div>
                <div>Sockets: <span className="text-slate-200">{services.Qdrant?.connection_count ?? 0} active</span></div>
              </div>
            </div>

            {/* FastAPI */}
            <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-lg flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-sm text-slate-200 flex items-center gap-1.5">
                  <Server className="w-4 h-4 text-sky-500" />
                  FastAPI (Backend)
                </span>
                <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                  services.FastAPI?.status === 'RUNNING'
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : 'bg-slate-800 text-slate-500'
                }`}>
                  {services.FastAPI?.status || 'STOPPED'}
                </span>
              </div>
              <div className="mt-2 text-xs font-mono text-slate-400">
                <div>Port: <span className="text-sky-400">8000</span> (localhost)</div>
                <div>Sockets: <span className="text-slate-200">{services.FastAPI?.connection_count ?? 0} active</span></div>
              </div>
            </div>

            {/* Frontend */}
            <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-lg flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-sm text-slate-200 flex items-center gap-1.5">
                  <Terminal className="w-4 h-4 text-purple-500" />
                  Frontend (Vite)
                </span>
                <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                  services.Frontend?.status === 'RUNNING'
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : 'bg-slate-800 text-slate-500'
                }`}>
                  {services.Frontend?.status || 'STOPPED'}
                </span>
              </div>
              <div className="mt-2 text-xs font-mono text-slate-400">
                <div>Port: <span className="text-purple-400">5173</span> (localhost)</div>
                <div>Sockets: <span className="text-slate-200">{services.Frontend?.connection_count ?? 0} active</span></div>
              </div>
            </div>
          </div>

          {/* Formal Sovereignty Statement */}
          <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span className="text-sm font-medium text-slate-200">
              {evidence?.explanation || 'All AI inference and data processing services are running locally.'}
            </span>
          </div>
        </div>
      </section>

      {/* SECTION 2: NETWORK INTERFACES */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-2">
            <Radio className="w-5 h-5 text-sky-400" />
            Detected Network Interfaces ({telemetry?.interfaces.length || 0})
          </h2>
          <span className="text-xs font-mono text-slate-500">
            Hardware / Virtual Adapter Counters
          </span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-x-auto custom-scrollbar">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-900/90 text-slate-400 border-b border-slate-800 uppercase text-[11px]">
              <tr>
                <th className="p-3">Interface Name</th>
                <th className="p-3">Status</th>
                <th className="p-3">IP Addresses</th>
                <th className="p-3">Bytes Sent</th>
                <th className="p-3">Bytes Recv</th>
                <th className="p-3">Type</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {(telemetry?.interfaces || []).map((iface, idx) => (
                <tr key={idx} className="hover:bg-slate-800/30 transition-colors">
                  <td className="p-3 font-semibold text-slate-100 flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${iface.status === 'UP' ? 'bg-emerald-400' : 'bg-slate-600'}`} />
                    {iface.name}
                  </td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                      iface.status === 'UP' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-500'
                    }`}>
                      {iface.status}
                    </span>
                  </td>
                  <td className="p-3 max-w-[200px] truncate" title={iface.ip_addresses.join(', ')}>
                    {iface.ip_addresses.length > 0 ? iface.ip_addresses.join(' | ') : 'None'}
                  </td>
                  <td className="p-3 text-slate-300">
                    {formatBytes(iface.bytes_sent)}
                  </td>
                  <td className="p-3 text-slate-300">
                    {formatBytes(iface.bytes_recv)}
                  </td>
                  <td className="p-3">
                    {iface.is_loopback ? (
                      <span className="text-purple-400">Loopback</span>
                    ) : (
                      <span className="text-slate-400">Physical/Virtual</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* SECTION 3: ACTIVE TCP CONNECTIONS (LIVE AUDIT) */}
      <section className="space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-purple-400" />
            <h2 className="text-base font-semibold uppercase tracking-wider text-slate-300">
              Active TCP Socket Audit
            </h2>
            <span className="text-xs font-mono text-slate-500">
              ({telemetry?.summary.total_tcp_connections || 0} total detected)
            </span>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 p-1 rounded-lg text-xs font-medium">
            <button
              onClick={() => setFilterType('ALL')}
              className={`px-2.5 py-1 rounded transition-colors ${
                filterType === 'ALL' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All ({telemetry?.summary.total_tcp_connections || 0})
            </button>
            <button
              onClick={() => setFilterType('LOOPBACK')}
              className={`px-2.5 py-1 rounded transition-colors ${
                filterType === 'LOOPBACK' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Localhost ({telemetry?.summary.loopback_count || 0})
            </button>
            <button
              onClick={() => setFilterType('PRIVATE_LAN')}
              className={`px-2.5 py-1 rounded transition-colors ${
                filterType === 'PRIVATE_LAN' ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Private LAN ({telemetry?.summary.private_lan_count || 0})
            </button>
            <button
              onClick={() => setFilterType('EXTERNAL')}
              className={`px-2.5 py-1 rounded transition-colors ${
                filterType === 'EXTERNAL' ? 'bg-red-500/20 text-red-300 border border-red-500/30' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              External Internet ({telemetry?.summary.external_count || 0})
            </button>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-x-auto max-h-[350px] custom-scrollbar">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-900/90 text-slate-400 border-b border-slate-800 uppercase text-[11px] sticky top-0 backdrop-blur-sm">
              <tr>
                <th className="p-3">Local Address</th>
                <th className="p-3">Remote Address</th>
                <th className="p-3">Traffic Type</th>
                <th className="p-3">Identified Service</th>
                <th className="p-3">Socket State</th>
                <th className="p-3">PID</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {filteredConnections.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-slate-500">
                    No connections match the selected filter.
                  </td>
                </tr>
              ) : (
                filteredConnections.map((conn, idx) => (
                  <tr key={idx} className="hover:bg-slate-800/30 transition-colors">
                    <td className="p-3 text-slate-200 font-medium">
                      {conn.local_address}
                    </td>
                    <td className="p-3 text-slate-400">
                      {conn.remote_address}
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        conn.type === 'LOOPBACK'
                          ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                          : conn.type === 'PRIVATE_LAN'
                          ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                          : conn.type === 'EXTERNAL'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : 'bg-slate-800 text-slate-400'
                      }`}>
                        {conn.type}
                      </span>
                    </td>
                    <td className="p-3">
                      {conn.service ? (
                        <span className="text-emerald-400 font-semibold bg-emerald-950/40 border border-emerald-800/40 px-2 py-0.5 rounded text-[10px]">
                          {conn.service}
                        </span>
                      ) : (
                        <span className="text-slate-600">-</span>
                      )}
                    </td>
                    <td className="p-3">
                      <span className="text-slate-400 font-mono text-[11px]">
                        {conn.status}
                      </span>
                    </td>
                    <td className="p-3 text-slate-500">
                      {conn.pid ?? '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

export default SovereigntyMonitor;
