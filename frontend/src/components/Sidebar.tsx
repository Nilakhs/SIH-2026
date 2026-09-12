import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  Shield,
  LayoutDashboard,
  Terminal,
  FileText,
  Database,
  Bot,
  ScrollText,
  FolderOutput,
  Settings,
  LogOut,
  User,
  Users,
  HardDrive,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const ROLE_COLORS: Record<string, string> = {
  ADMIN: 'bg-red-500/20 text-red-400 border-red-500/30',
  ANALYST: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  VIEWER: 'bg-sky-500/20 text-sky-400 border-sky-500/30',
};

const Sidebar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const navItems = [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/workbench', icon: Terminal, label: 'Workbench' },
    { to: '/documents', icon: FileText, label: 'Documents' },
    { to: '/knowledge-base', icon: Database, label: 'Knowledge Base' },
    { to: '/agents', icon: Bot, label: 'Agents' },
    { to: '/execution-logs', icon: ScrollText, label: 'Audit Trail' },
    { to: '/generated-files', icon: FolderOutput, label: 'Generated Files' },
    { to: '/drive', icon: HardDrive, label: 'Shared Drive' },
    { to: '/sovereignty', icon: Shield, label: 'Sovereignty' },
    ...(user?.role === 'ADMIN' ? [{ to: '/user-management', icon: Users, label: 'User Mgmt' }] : []),
    { to: '/settings', icon: Settings, label: 'Settings' },
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="w-64 h-full bg-slate-900 border-r border-slate-800 flex flex-col shrink-0">
      {/* Logo */}
      <div className="p-6 flex items-center gap-3 border-b border-slate-800/60">
        <div className="p-1.5 bg-amber-500/10 border border-amber-500/30 rounded-lg">
          <Shield className="w-6 h-6 text-amber-500" />
        </div>
        <div className="flex flex-col">
          <span className="text-white font-bold tracking-wider uppercase text-sm">Sovereign AI</span>
          <span className="text-amber-500 font-mono text-[10px] uppercase tracking-widest">Workbench</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 flex flex-col gap-0.5 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-5 py-2.5 mx-2 rounded-lg transition-all text-sm ${
                isActive
                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20 shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50 border border-transparent'
              }`
            }
          >
            <item.icon className="w-4 h-4 shrink-0" />
            <span className="font-medium">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* User info + logout */}
      {user && (
        <div className="p-4 border-t border-slate-800 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-slate-700 rounded-full flex items-center justify-center shrink-0">
              <User className="w-4 h-4 text-slate-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-100 truncate">
                {user.full_name || user.username}
              </p>
              <p className="text-xs text-slate-500 truncate">{user.email}</p>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded border font-mono ${ROLE_COLORS[user.role]}`}>
              {user.role}
            </span>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-red-400 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign out
            </button>
          </div>
          <p className="text-[10px] text-slate-600 font-mono text-center">v0.6.0 — Phase 6+</p>
        </div>
      )}
    </div>
  );
};

export default Sidebar;
