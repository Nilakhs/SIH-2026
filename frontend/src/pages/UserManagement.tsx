import React, { useState, useEffect, useCallback } from 'react';
import {
  Users, Shield, User, Building2, RefreshCw, CheckCircle2,
  XCircle, Edit2, Trash2, PlusCircle, Search, ChevronDown,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface UserRecord {
  id: string;
  username: string;
  email: string;
  full_name: string | null;
  role: 'ADMIN' | 'ANALYST' | 'VIEWER';
  is_active: number;
  created_at: string;
  last_login: string | null;
  department_name: string | null;
}

interface Department {
  id: string;
  name: string;
  description: string;
  member_count?: number;
}

const ROLE_COLORS: Record<string, string> = {
  ADMIN: 'bg-red-500/15 text-red-400 border-red-500/30',
  ANALYST: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  VIEWER: 'bg-sky-500/15 text-sky-400 border-sky-500/30',
};

const UserManagement: React.FC = () => {
  const { token, user: me } = useAuth();
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [editRole, setEditRole] = useState('');
  const [editDept, setEditDept] = useState('');
  const [saving, setSaving] = useState(false);
  const [newDeptName, setNewDeptName] = useState('');
  const [addingDept, setAddingDept] = useState(false);
  const [showDepts, setShowDepts] = useState(false);

  // Add Employee State
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUser, setNewUser] = useState({
    username: '',
    email: '',
    password: '',
    full_name: '',
    role: 'ANALYST',
    department_id: '',
  });
  const [addingUser, setAddingUser] = useState(false);
  const [addError, setAddError] = useState('');

  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const fetchUsersAndDepts = useCallback(async () => {
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [uRes, dRes] = await Promise.all([
        fetch('/api/users/', { headers }),
        fetch('/api/users/departments', { headers }),
      ]);
      if (uRes.ok) setUsers(await uRes.json());
      if (dRes.ok) setDepartments(await dRes.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchUsersAndDepts(); }, [fetchUsersAndDepts]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError('');
    setAddingUser(true);
    try {
      const res = await fetch('/api/users/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(newUser),
      });
      if (!res.ok) {
        const data = await res.json();
        setAddError(data.detail || 'Failed to create user');
      } else {
        setShowAddUser(false);
        setNewUser({ username: '', email: '', password: '', full_name: '', role: 'ANALYST', department_id: '' });
        fetchUsersAndDepts();
      }
    } catch (err) {
      setAddError('Connection error');
    } finally {
      setAddingUser(false);
    }
  };

  const startEdit = (u: UserRecord) => {
    setEditingUser(u.id);
    setEditRole(u.role);
    setEditDept(u.department_name || '');
  };

  const saveEdit = async (userId: string) => {
    setSaving(true);
    const dept = departments.find(d => d.name === editDept);
    await fetch(`/api/users/${userId}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ role: editRole, department_id: dept?.id }),
    });
    setSaving(false);
    setEditingUser(null);
    fetchUsersAndDepts();
  };

  const toggleActive = async (userId: string, currentlyActive: boolean) => {
    await fetch(`/api/users/${userId}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ is_active: !currentlyActive }),
    });
    fetchUsersAndDepts();
  };

  const deactivate = async (userId: string) => {
    if (!confirm('Deactivate this user? They will lose access immediately.')) return;
    await fetch(`/api/users/${userId}`, { method: 'DELETE', headers });
    fetchUsersAndDepts();
  };

  const createDept = async () => {
    if (!newDeptName.trim()) return;
    setAddingDept(true);
    await fetch(`/api/users/departments?name=${encodeURIComponent(newDeptName)}`, {
      method: 'POST', headers,
    });
    setNewDeptName('');
    setAddingDept(false);
    fetchUsersAndDepts();
  };

  const filtered = users.filter(u =>
    [u.username, u.email, u.full_name, u.department_name].some(
      v => v?.toLowerCase().includes(search.toLowerCase())
    )
  );

  const formatDate = (iso: string | null) =>
    iso ? new Date(iso).toLocaleDateString('en-IN', { dateStyle: 'medium' }) : '—';

  const stats = {
    total: users.length,
    active: users.filter(u => u.is_active).length,
    admins: users.filter(u => u.role === 'ADMIN').length,
    depts: departments.length,
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-500/10 border border-amber-500/30 rounded-lg">
            <Users className="w-6 h-6 text-amber-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">User Management</h1>
            <p className="text-slate-400 text-sm">Manage access, roles and departments</p>
          </div>
        </div>
        <button onClick={fetchUsersAndDepts} className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded-lg text-sm font-medium transition-colors">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Users', value: stats.total, color: 'text-slate-100' },
          { label: 'Active', value: stats.active, color: 'text-emerald-400' },
          { label: 'Admins', value: stats.admins, color: 'text-red-400' },
          { label: 'Departments', value: stats.depts, color: 'text-amber-400' },
        ].map(s => (
          <div key={s.label} className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <p className="text-xs text-slate-400 uppercase tracking-wider">{s.label}</p>
            <p className={`text-2xl font-bold font-mono mt-1 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Departments Panel */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <button
          onClick={() => setShowDepts(!showDepts)}
          className="w-full flex items-center justify-between p-4 hover:bg-slate-800/40 transition-colors"
        >
          <div className="flex items-center gap-2 text-slate-200 font-medium">
            <Building2 className="w-4 h-4 text-amber-400" />
            Departments ({departments.length})
          </div>
          <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform ${showDepts ? 'rotate-180' : ''}`} />
        </button>
        {showDepts && (
          <div className="border-t border-slate-800 p-4 space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {departments.map(d => (
                <div key={d.id} className="bg-slate-800 rounded-lg px-3 py-2">
                  <p className="text-sm text-slate-100 font-medium">{d.name}</p>
                  <p className="text-xs text-slate-500">{d.member_count ?? 0} members</p>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2 pt-2">
              <input
                type="text" value={newDeptName} onChange={e => setNewDeptName(e.target.value)}
                placeholder="New department name..."
                className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500/60 text-sm"
                onKeyDown={e => e.key === 'Enter' && createDept()}
              />
              <button onClick={createDept} disabled={addingDept || !newDeptName.trim()}
                className="flex items-center gap-1.5 px-3 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-900 rounded-lg text-sm font-medium transition-colors">
                <PlusCircle className="w-4 h-4" />
                Add
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add Employee Form */}
      {showAddUser && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 mb-6">
          <h3 className="text-sm font-medium text-slate-200 mb-4">Add New Employee</h3>
          <form onSubmit={handleCreateUser} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Full Name</label>
              <input required type="text" value={newUser.full_name} onChange={e => setNewUser({...newUser, full_name: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 text-sm focus:outline-none focus:border-amber-500/60" />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Username</label>
              <input required type="text" value={newUser.username} onChange={e => setNewUser({...newUser, username: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 text-sm focus:outline-none focus:border-amber-500/60" />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Email</label>
              <input required type="email" value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 text-sm focus:outline-none focus:border-amber-500/60" />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Password</label>
              <input required type="password" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 text-sm focus:outline-none focus:border-amber-500/60" />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Role</label>
              <select value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 text-sm focus:outline-none focus:border-amber-500/60">
                <option value="ANALYST">ANALYST</option>
                <option value="VIEWER">VIEWER</option>
                <option value="ADMIN">ADMIN</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Department</label>
              <select value={newUser.department_id} onChange={e => setNewUser({...newUser, department_id: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 text-sm focus:outline-none focus:border-amber-500/60">
                <option value="">No Department</option>
                {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            
            {addError && <div className="col-span-full text-red-400 text-xs">{addError}</div>}
            
            <div className="col-span-full flex justify-end gap-2 mt-2">
              <button type="button" onClick={() => setShowAddUser(false)} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm transition-colors">Cancel</button>
              <button type="submit" disabled={addingUser} className="px-4 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-900 rounded-lg text-sm font-medium transition-colors">
                {addingUser ? 'Creating...' : 'Create Employee'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Search & Header Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search users..."
            className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-9 pr-4 py-2 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500/60 text-sm"
          />
        </div>
        <button
          onClick={() => setShowAddUser(true)}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <PlusCircle className="w-4 h-4" />
          Add Employee
        </button>
      </div>

      {/* User Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-900 border-b border-slate-800 text-slate-400 text-xs uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Department</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Last Login</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-slate-500">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Loading users...
                    </div>
                  </td>
                </tr>
              ) : filtered.map(u => (
                <tr key={u.id} className="hover:bg-slate-800/30 transition-colors">
                  {/* User */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-slate-700 rounded-full flex items-center justify-center">
                        <User className="w-4 h-4 text-slate-400" />
                      </div>
                      <div>
                        <p className="text-slate-100 font-medium">{u.full_name || u.username}</p>
                        <p className="text-xs text-slate-500">{u.email}</p>
                      </div>
                    </div>
                  </td>

                  {/* Role — editable */}
                  <td className="px-4 py-3">
                    {editingUser === u.id ? (
                      <select
                        value={editRole}
                        onChange={e => setEditRole(e.target.value)}
                        className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-slate-100 text-xs focus:outline-none"
                      >
                        <option>ADMIN</option>
                        <option>ANALYST</option>
                        <option>VIEWER</option>
                      </select>
                    ) : (
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded border font-mono ${ROLE_COLORS[u.role]}`}>
                        {u.role}
                      </span>
                    )}
                  </td>

                  {/* Department */}
                  <td className="px-4 py-3">
                    {editingUser === u.id ? (
                      <select
                        value={editDept}
                        onChange={e => setEditDept(e.target.value)}
                        className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-slate-100 text-xs focus:outline-none"
                      >
                        <option value="">—</option>
                        {departments.map(d => <option key={d.id}>{d.name}</option>)}
                      </select>
                    ) : (
                      <span className="text-slate-400 text-xs">{u.department_name || '—'}</span>
                    )}
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3">
                    <button
                      onClick={() => u.id !== me?.id && toggleActive(u.id, Boolean(u.is_active))}
                      disabled={u.id === me?.id}
                      className="flex items-center gap-1.5"
                    >
                      {u.is_active ? (
                        <><CheckCircle2 className="w-4 h-4 text-emerald-400" /><span className="text-emerald-400 text-xs">Active</span></>
                      ) : (
                        <><XCircle className="w-4 h-4 text-red-400" /><span className="text-red-400 text-xs">Inactive</span></>
                      )}
                    </button>
                  </td>

                  {/* Last Login */}
                  <td className="px-4 py-3 text-xs text-slate-500">{formatDate(u.last_login)}</td>

                  {/* Actions */}
                  <td className="px-4 py-3">
                    {u.id === me?.id ? (
                      <span className="text-xs text-slate-600 italic">You</span>
                    ) : editingUser === u.id ? (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => saveEdit(u.id)}
                          disabled={saving}
                          className="px-2 py-1 bg-amber-500 hover:bg-amber-400 text-slate-900 rounded text-xs font-medium transition-colors"
                        >
                          {saving ? '...' : 'Save'}
                        </button>
                        <button
                          onClick={() => setEditingUser(null)}
                          className="px-2 py-1 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded text-xs transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => startEdit(u)}
                          className="p-1.5 text-slate-500 hover:text-amber-400 hover:bg-amber-500/10 rounded transition-colors"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => deactivate(u.id)}
                          className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default UserManagement;
