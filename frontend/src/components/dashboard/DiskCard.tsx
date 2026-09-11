import React from 'react';
import { HardDrive } from 'lucide-react';
import HardwareCard from './HardwareCard';
import type { DiskInfo } from '../../types';

interface DiskCardProps {
  disk: DiskInfo;
}

const DiskCard: React.FC<DiskCardProps> = ({ disk }) => {
  let barColor = 'bg-emerald-500';
  if (disk.usage_percent > 85) barColor = 'bg-red-500';
  else if (disk.usage_percent > 60) barColor = 'bg-amber-500';

  return (
    <HardwareCard title="Primary Storage" icon={HardDrive}>
      <div className="space-y-1">
        <div className="flex justify-between text-xs font-mono text-slate-400 mb-1">
          <span>Usage ({disk.usage_percent.toFixed(1)}%)</span>
          <span>{disk.used_gb.toFixed(1)} GB / {disk.total_gb.toFixed(1)} GB</span>
        </div>
        <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
          <div className={`h-full rounded-full ${barColor}`} style={{ width: `${disk.usage_percent}%` }} />
        </div>
      </div>

      <div className="mt-4 bg-slate-900/50 rounded-lg p-3 border border-slate-800">
        <div className="text-xs text-slate-500 mb-1">Free Space</div>
        <div className="font-mono text-emerald-500 text-lg">{disk.free_gb.toFixed(1)} GB</div>
      </div>
    </HardwareCard>
  );
};

export default DiskCard;
