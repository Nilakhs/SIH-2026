import React from 'react';
import { Monitor } from 'lucide-react';
import HardwareCard from './HardwareCard';
import type { GpuInfo } from '../../types';

interface GpuCardProps {
  gpu: GpuInfo | null;
}

const GpuCard: React.FC<GpuCardProps> = ({ gpu }) => {
  if (!gpu) {
    return (
      <HardwareCard title="GPU" icon={Monitor}>
        <div className="text-slate-500 font-mono text-sm py-4">No GPU Detected</div>
      </HardwareCard>
    );
  }

  const usagePercent = (gpu.vram_used_mb / gpu.vram_total_mb) * 100;
  
  let barColor = 'bg-emerald-500';
  if (usagePercent > 85) barColor = 'bg-red-500';
  else if (usagePercent > 60) barColor = 'bg-amber-500';

  return (
    <HardwareCard title="GPU" icon={Monitor}>
      <div className="text-white font-medium text-lg mb-2 truncate" title={gpu.name}>{gpu.name}</div>
      
      <div className="space-y-1">
        <div className="flex justify-between text-xs font-mono text-slate-400 mb-1">
          <span>VRAM Usage</span>
          <span>{gpu.vram_used_mb} MB / {gpu.vram_total_mb} MB</span>
        </div>
        <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
          <div className={`h-full rounded-full ${barColor}`} style={{ width: `${usagePercent}%` }} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mt-2">
        <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-800">
          <div className="text-xs text-slate-500 mb-1">Temperature</div>
          <div className="font-mono text-amber-500">{gpu.temperature}°C</div>
        </div>
        <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-800">
          <div className="text-xs text-slate-500 mb-1">Utilization</div>
          <div className="font-mono text-emerald-500">{gpu.gpu_utilization}%</div>
        </div>
      </div>

      <div className="flex justify-between text-xs font-mono text-slate-500 mt-2 border-t border-slate-800/50 pt-3">
        <span>CUDA: {gpu.cuda_version}</span>
        <span>Driver: {gpu.driver_version}</span>
      </div>
    </HardwareCard>
  );
};

export default GpuCard;
