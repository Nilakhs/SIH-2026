import React from 'react';
import { Cpu } from 'lucide-react';
import HardwareCard from './HardwareCard';
import type { CpuInfo } from '../../types';

interface CpuCardProps {
  cpu: CpuInfo;
}

const CpuCard: React.FC<CpuCardProps> = ({ cpu }) => {
  let barColor = 'bg-emerald-500';
  if (cpu.usage_percent > 85) barColor = 'bg-red-500';
  else if (cpu.usage_percent > 60) barColor = 'bg-amber-500';

  return (
    <HardwareCard title="CPU" icon={Cpu}>
      <div className="text-white font-medium text-lg mb-2 truncate" title={cpu.name}>{cpu.name}</div>
      
      <div className="space-y-1">
        <div className="flex justify-between text-xs font-mono text-slate-400 mb-1">
          <span>Usage</span>
          <span>{cpu.usage_percent.toFixed(1)}%</span>
        </div>
        <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
          <div className={`h-full rounded-full ${barColor}`} style={{ width: `${cpu.usage_percent}%` }} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mt-2">
        <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-800">
          <div className="text-xs text-slate-500 mb-1">Cores (Phys/Log)</div>
          <div className="font-mono text-emerald-500">{cpu.physical_cores} / {cpu.logical_cores}</div>
        </div>
        <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-800">
          <div className="text-xs text-slate-500 mb-1">Frequency</div>
          <div className="font-mono text-amber-500">{cpu.frequency_mhz} MHz</div>
        </div>
      </div>
    </HardwareCard>
  );
};

export default CpuCard;
