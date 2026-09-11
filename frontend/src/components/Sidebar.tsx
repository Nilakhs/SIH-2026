import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  Shield,
  LayoutDashboard,
  Terminal,
  FileText,
  Database,
  Bot,
  ScrollText,
  FolderOutput,
  Settings
} from 'lucide-react';

const Sidebar: React.FC = () => {
  const navItems = [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/workbench', icon: Terminal, label: 'Workbench' },
    { to: '/documents', icon: FileText, label: 'Documents' },
    { to: '/knowledge-base', icon: Database, label: 'Knowledge Base' },
    { to: '/agents', icon: Bot, label: 'Agents' },
    { to: '/execution-logs', icon: ScrollText, label: 'Execution Logs' },
    { to: '/generated-files', icon: FolderOutput, label: 'Generated Files' },
    { to: '/sovereignty', icon: Shield, label: 'Sovereignty Monitor' },
    { to: '/settings', icon: Settings, label: 'Settings' },
  ];

  return (
    <div className="w-64 h-full bg-slate-900 border-r border-slate-800 flex flex-col shrink-0">
      <div className="p-6 flex items-center gap-3">
        <Shield className="w-8 h-8 text-amber-500" />
        <div className="flex flex-col">
          <span className="text-white font-bold tracking-wider uppercase text-sm">Sovereign AI</span>
          <span className="text-amber-500 font-mono text-xs uppercase tracking-widest">Workbench</span>
        </div>
      </div>
      
      <nav className="flex-1 py-4 flex flex-col gap-1 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-6 py-3 transition-colors ${
                isActive
                  ? 'bg-slate-800/50 text-amber-500 border-l-2 border-amber-500'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/25 border-l-2 border-transparent'
              }`
            }
          >
            <item.icon className="w-5 h-5" />
            <span className="font-medium text-sm">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-800 text-center">
        <span className="text-xs text-slate-500 font-mono">v0.1.0 — Phase 1</span>
      </div>
    </div>
  );
};

export default Sidebar;
