import React from 'react';
import { Shield, Network, HardDrive, User, Clock, MemoryStick, Cpu } from 'lucide-react';

const SandboxSecurityPanel: React.FC = () => {
  return (
    <div className="bg-slate-900 border border-slate-700 rounded-lg p-4 font-mono text-sm text-slate-300 my-2 max-w-sm shadow-lg shadow-black/50">
      <div className="flex items-center gap-2 text-amber-500 font-bold mb-3 border-b border-slate-800 pb-2 uppercase tracking-widest">
        <Shield className="w-5 h-5" />
        PYTHON SANDBOX
      </div>
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="flex items-center gap-2 text-slate-400"><Network className="w-4 h-4" /> Network</span>
          <span className="text-red-400 font-bold">DISABLED</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="flex items-center gap-2 text-slate-400"><HardDrive className="w-4 h-4" /> Host FS</span>
          <span className="text-amber-400 font-bold">ISOLATED</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="flex items-center gap-2 text-slate-400"><User className="w-4 h-4" /> User</span>
          <span className="text-emerald-400 font-bold">NON-ROOT</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="flex items-center gap-2 text-slate-400"><Clock className="w-4 h-4" /> Timeout</span>
          <span className="text-slate-200">30 seconds</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="flex items-center gap-2 text-slate-400"><MemoryStick className="w-4 h-4" /> Memory</span>
          <span className="text-slate-200">512 MB</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="flex items-center gap-2 text-slate-400"><Cpu className="w-4 h-4" /> CPU</span>
          <span className="text-slate-200">1 core</span>
        </div>
      </div>
    </div>
  );
};

export default SandboxSecurityPanel;
