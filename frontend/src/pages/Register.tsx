import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Shield, Eye, EyeOff, UserPlus, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface Department {
  id: string;
  name: string;
  description: string;
}

const Register: React.FC = () => {
  const { register, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    username: '', email: '', password: '', confirmPassword: '',
    full_name: '', department_id: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [departments, setDepartments] = useState<Department[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (isAuthenticated) navigate('/', { replace: true });
    fetch('/api/auth/departments')
      .then(r => r.json())
      .then(setDepartments)
      .catch(() => {});
  }, [isAuthenticated, navigate]);

  const passwordStrength = (pwd: string) => {
    let score = 0;
    if (pwd.length >= 8) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;
    return score;
  };

  const strength = passwordStrength(form.password);
  const strengthLabel = ['', 'Weak', 'Fair', 'Good', 'Strong'][strength];
  const strengthColor = ['', 'bg-red-500', 'bg-orange-400', 'bg-yellow-400', 'bg-emerald-500'][strength];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      await register({
        username: form.username.trim(),
        email: form.email.trim(),
        password: form.password,
        full_name: form.full_name.trim() || undefined,
        department_id: form.department_id || undefined,
      });
      navigate('/', { replace: true });
    } catch (err: any) {
      setError(err.message || 'Registration failed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(245,158,11,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(245,158,11,0.03)_1px,transparent_1px)] bg-[size:64px_64px]" />
      <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl animate-pulse" />

      <div className={`relative z-10 w-full max-w-md transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-amber-500/10 border border-amber-500/30 rounded-2xl mb-4">
            <Shield className="w-8 h-8 text-amber-500" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Create Account</h1>
          <p className="text-slate-400 text-sm mt-2">Join the Sovereign AI Workbench</p>
        </div>

        <div className="bg-slate-900/80 backdrop-blur border border-slate-800 rounded-2xl p-8 shadow-2xl">
          {error && (
            <div className="flex items-center gap-2 bg-red-950/40 border border-red-900/50 text-red-400 rounded-lg px-4 py-3 mb-5 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1.5">Username *</label>
                <input name="username" required value={form.username} onChange={handleChange} placeholder="johndoe"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/30 transition-colors text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1.5">Full Name</label>
                <input name="full_name" value={form.full_name} onChange={handleChange} placeholder="John Doe"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/30 transition-colors text-sm" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1.5">Email *</label>
              <input name="email" type="email" required value={form.email} onChange={handleChange} placeholder="john@org.com"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/30 transition-colors text-sm" />
            </div>

            {departments.length > 0 && (
              <div>
                <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1.5">Department</label>
                <select name="department_id" value={form.department_id} onChange={handleChange}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-slate-100 focus:outline-none focus:border-amber-500/60 transition-colors text-sm">
                  <option value="">Select department...</option>
                  {departments.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1.5">Password *</label>
              <div className="relative">
                <input name="password" type={showPassword ? 'text' : 'password'} required value={form.password} onChange={handleChange} placeholder="Min 6 characters"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 pr-10 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/30 transition-colors text-sm" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {form.password && (
                <div className="mt-2 flex items-center gap-2">
                  <div className="flex-1 h-1 bg-slate-700 rounded-full overflow-hidden">
                    <div className={`h-full ${strengthColor} transition-all`} style={{ width: `${(strength / 4) * 100}%` }} />
                  </div>
                  <span className="text-xs text-slate-400">{strengthLabel}</span>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1.5">Confirm Password *</label>
              <div className="relative">
                <input name="confirmPassword" type="password" required value={form.confirmPassword} onChange={handleChange} placeholder="Repeat password"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 pr-10 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/30 transition-colors text-sm" />
                {form.confirmPassword && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {form.password === form.confirmPassword
                      ? <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      : <AlertCircle className="w-4 h-4 text-red-400" />}
                  </div>
                )}
              </div>
            </div>

            <p className="text-xs text-slate-500 bg-slate-800/50 rounded-lg p-3">
              New accounts are assigned <span className="text-amber-400 font-medium">ANALYST</span> role. Contact your admin to change access level.
            </p>

            <button type="submit" disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 disabled:bg-amber-500/50 text-slate-900 font-semibold rounded-lg py-3 transition-all text-sm shadow-lg shadow-amber-500/20">
              {isLoading ? <div className="w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" /> : <UserPlus className="w-4 h-4" />}
              {isLoading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>

          <div className="mt-5 pt-5 border-t border-slate-800 text-center text-sm text-slate-500">
            Already have an account?{' '}
            <Link to="/login" className="text-amber-400 hover:text-amber-300 font-medium transition-colors">Sign in</Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
