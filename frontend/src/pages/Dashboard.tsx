import React, { useEffect, useState } from 'react';
import { AlertCircle, AlertTriangle } from 'lucide-react';
import { fetchSystemInfo, fetchServices, fetchHealth, fetchSandboxStatus } from '../api/client';
import type { SystemInfo, ServiceInfo, HealthInfo } from '../types';
import type { SandboxStatus } from '../api/client';
import GpuCard from '../components/dashboard/GpuCard';
import CpuCard from '../components/dashboard/CpuCard';
import MemoryCard from '../components/dashboard/MemoryCard';
import DiskCard from '../components/dashboard/DiskCard';
import ServiceStatusCard from '../components/dashboard/ServiceStatusCard';
import SovereigntyBadge from '../components/dashboard/SovereigntyBadge';
import ModelRecommendationCard from '../components/dashboard/ModelRecommendationCard';

const Dashboard: React.FC = () => {
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [services, setServices] = useState<ServiceInfo[]>([]);
  const [health, setHealth] = useState<HealthInfo | null>(null);
  const [sandboxStatus, setSandboxStatus] = useState<SandboxStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [sysData, srvData, healthData, sandboxData] = await Promise.all([
          fetchSystemInfo(),
          fetchServices(),
          fetchHealth(),
          fetchSandboxStatus().catch(() => null)
        ]);
        setSystemInfo(sysData);
        setServices(srvData);
        setHealth(healthData);
        if (sandboxData) setSandboxStatus(sandboxData);
        setError(null);
      } catch (err) {
        console.error('Failed to fetch dashboard data:', err);
        setError('Unable to connect to workbench backend services.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  if (loading && !systemInfo) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-48 bg-slate-800 rounded"></div>
        <div className="h-32 w-full bg-slate-800 rounded-xl"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-64 bg-slate-800 rounded-xl"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error && !systemInfo) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-4">
        <AlertCircle className="w-12 h-12 text-red-500" />
        <h2 className="text-xl font-medium text-slate-200">Connection Error</h2>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      <header>
        <h1 className="text-3xl font-bold text-white tracking-wide">Dashboard</h1>
        <p className="text-slate-400 mt-1 uppercase text-sm tracking-widest">System Overview</p>
      </header>

      {sandboxStatus && !sandboxStatus.docker_available && (
        <div className="flex items-center gap-3 bg-amber-950/40 border border-amber-900/50 p-4 rounded-xl text-amber-500">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm font-medium">
            Docker is not installed. Code execution sandbox is disabled to protect host security.
          </span>
        </div>
      )}

      <SovereigntyBadge health={health} />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
          {systemInfo && (
            <>
              <GpuCard gpu={systemInfo.gpu} />
              <CpuCard cpu={systemInfo.cpu} />
              <MemoryCard memory={systemInfo.memory} />
              <DiskCard disk={systemInfo.disk} />
            </>
          )}
        </div>
        <div className="xl:col-span-1">
          <ServiceStatusCard services={services} />
        </div>
      </div>

      {systemInfo?.model_recommendation && (
        <div className="grid grid-cols-1">
          <ModelRecommendationCard recommendation={systemInfo.model_recommendation} />
        </div>
      )}
    </div>
  );
};

export default Dashboard;
