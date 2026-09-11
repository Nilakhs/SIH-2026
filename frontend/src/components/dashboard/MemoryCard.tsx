import React from 'react';
import { Database } from 'lucide-react';
import HardwareCard from './HardwareCard';
import type { MemoryInfo } from '../../types';

interface MemoryCardProps {
  memory: MemoryInfo;
}

const MemoryCard: React.FC<MemoryCardProps> = ({ memory }) => {
  let barColor = 'bg-emerald-500';
  if (memory.usage_percent > 85) barColor = 'bg-red-500';
  else if (memory.usage_percent > 60) barColor = 'bg-amber-500';

  return (
    <HardwareCard title="System RAM" icon={Database}>
      <div className="space-y-1">
        <div className="flex justify-between text-xs font-mono text-slate-400 mb-1">
          <span>Usage ({memory.usage_percent.toFixed(1)}%)</span>
          <span>{memory.used_gb.toFixed(1)} GB / {memory.total_gb.toFixed(1)} GB</span>
        </div>
        <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
          <div className={`h-full rounded-full ${barColor}`} style={{ width: `${memory.usage_percent}%` }} />
        </div>
      </div>

      <div className="mt-4 bg-slate-900/50 rounded-lg p-3 border border-slate-800">
        <div className="text-xs text-slate-500 mb-1">Available Memory</div>
        <div className="font-mono text-emerald-500 text-lg">{memory.available_gb.toFixed(1)} GB</div>
      </div>
    </HardwareCard>
  );
};

export default MemoryCard;
