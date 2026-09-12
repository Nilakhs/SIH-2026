import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { Shield, Eye, EyeOff, LogIn, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Login: React.FC = () => {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as any)?.from?.pathname || '/';

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (isAuthenticated) navigate(from, { replace: true });
  }, [isAuthenticated, navigate, from]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('Please enter both username and password.');
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      await login(username.trim(), password);
      navigate(from, { replace: true });
    } catch (err: any) {
      setError(err.message || 'Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background grid */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(245,158,11,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(245,158,11,0.03)_1px,transparent_1px)] bg-[size:64px_64px]" />

      {/* Glow blobs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-sky-500/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />

      <div
        className={`relative z-10 w-full max-w-md transition-all duration-700 ${
          mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
        }`}
      >
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-amber-500/10 border border-amber-500/30 rounded-2xl mb-4">
            <Shield className="w-8 h-8 text-amber-500" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Sovereign AI</h1>
          <p className="text-amber-500 font-mono text-xs uppercase tracking-widest mt-1">Workbench</p>
          <p className="text-slate-400 text-sm mt-3">On-premise · Air-gapped · Zero cloud</p>
        </div>

        {/* Card */}
        <div className="bg-slate-900/80 backdrop-blur border border-slate-800 rounded-2xl p-8 shadow-2xl">
          <h2 className="text-lg font-semibold text-slate-100 mb-6">Sign in to your account</h2>

          {error && (
            <div className="flex items-center gap-2 bg-red-950/40 border border-red-900/50 text-red-400 rounded-lg px-4 py-3 mb-5 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="Enter username"
                autoComplete="username"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/30 transition-colors text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter password"
                  autoComplete="current-password"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 pr-12 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/30 transition-colors text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 disabled:bg-amber-500/50 text-slate-900 font-semibold rounded-lg py-3 transition-all text-sm shadow-lg shadow-amber-500/20"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
              ) : (
                <LogIn className="w-4 h-4" />
              )}
              {isLoading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-slate-800 text-center text-sm text-slate-500">
            Don't have an account?{' '}
            <Link to="/register" className="text-amber-400 hover:text-amber-300 font-medium transition-colors">
              Register
            </Link>
          </div>
        </div>

        {/* Default credentials hint */}
        <div className="mt-4 text-center">
          <p className="text-xs text-slate-600 font-mono">Default admin: admin / admin123</p>
        </div>

        <div className="mt-6 text-center">
          <p className="text-xs text-slate-600">
            🛡️ All data processed locally · Zero internet required
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
