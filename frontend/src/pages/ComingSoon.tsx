import React from 'react';
import { HardHat } from 'lucide-react';

interface ComingSoonProps {
  title: string;
  description: string;
}

const ComingSoon: React.FC<ComingSoonProps> = ({ title, description }) => {
  return (
    <div className="flex flex-col items-center justify-center h-[70vh] text-center space-y-6">
      <div className="p-6 bg-slate-900/50 rounded-full border border-slate-800">
        <HardHat className="w-16 h-16 text-amber-500" />
      </div>
      <div>
        <h1 className="text-3xl font-bold text-white mb-2 tracking-wide uppercase">{title}</h1>
        <p className="text-slate-400 font-mono">{description}</p>
      </div>
      <div className="mt-8 px-4 py-2 border border-slate-800 bg-slate-900 rounded text-slate-500 text-sm font-mono uppercase tracking-wider">
        Module Under Construction
      </div>
    </div>
  );
};

export default ComingSoon;
