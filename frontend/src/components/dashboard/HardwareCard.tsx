import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface HardwareCardProps {
  title: string;
  icon: LucideIcon;
  children: React.ReactNode;
}

const HardwareCard: React.FC<HardwareCardProps> = ({ title, icon: Icon, children }) => {
  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 hover:bg-slate-800/70 transition-colors">
      <div className="flex items-center gap-2 mb-4 text-slate-400">
        <Icon className="w-5 h-5" />
        <h3 className="font-medium text-sm uppercase tracking-wider">{title}</h3>
      </div>
      <div className="flex flex-col gap-4">
        {children}
      </div>
    </div>
  );
};

export default HardwareCard;
