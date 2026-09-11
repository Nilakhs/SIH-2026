import React from 'react';
import { Shield, ShieldAlert, ShieldCheck } from 'lucide-react';
import type { HealthInfo } from '../../types';

interface SovereigntyBadgeProps {
  health: HealthInfo | null;
}

const SovereigntyBadge: React.FC<SovereigntyBadgeProps> = ({ health }) => {
  if (!health) return null;

  const isFullyAirgapped = health.sovereignty.external_api_calls === 0;

  return (
    <div className={`border rounded-xl p-6 flex items-center justify-between transition-colors ${
      isFullyAirgapped 
        ? 'bg-emerald-950/20 border-emerald-900/50' 
        : 'bg-amber-950/20 border-amber-900/50'
    }`}>
      <div className="flex items-center gap-6">
        <div className={`p-4 rounded-full ${isFullyAirgapped ? 'bg-emerald-900/30' : 'bg-amber-900/30'}`}>
          {isFullyAirgapped ? (
            <ShieldCheck className="w-12 h-12 text-emerald-500 drop-shadow-[0_0_15px_rgba(16,185,129,0.5)]" />
          ) : (
            <Shield className="w-12 h-12 text-amber-500 drop-shadow-[0_0_15px_rgba(245,158,11,0.5)]" />
          )}
        </div>
        <div>
          <h2 className={`text-2xl font-bold tracking-widest ${isFullyAirgapped ? 'text-emerald-500' : 'text-amber-500'}`}>
            SOVEREIGN MODE ACTIVE
          </h2>
          <div className="flex gap-6 mt-2 text-sm font-mono text-slate-400">
            <div className="flex items-center gap-2">
              <span className="uppercase text-slate-500">Mode:</span>
              <span className="text-slate-300">{health.sovereignty.mode}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="uppercase text-slate-500">External API Calls:</span>
              <span className={isFullyAirgapped ? 'text-emerald-400' : 'text-amber-400'}>
                {health.sovereignty.external_api_calls}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="uppercase text-slate-500">Outbound Connections:</span>
              <span className="text-emerald-400">0</span>
            </div>
          </div>
        </div>
      </div>
      
      {!isFullyAirgapped && (
        <div className="flex items-center gap-2 text-amber-500 bg-amber-950/30 px-4 py-2 rounded border border-amber-900/50">
          <ShieldAlert className="w-5 h-5" />
          <span className="text-sm font-medium">External dependencies detected</span>
        </div>
      )}
    </div>
  );
};

export default SovereigntyBadge;
