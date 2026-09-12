import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface Props {
  children: React.ReactNode;
  requiredRole?: 'ADMIN' | 'ANALYST' | 'VIEWER';
}

const PrivateRoute: React.FC<Props> = ({ children, requiredRole }) => {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-950">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-slate-400 text-sm">Verifying session...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Role-based access check
  if (requiredRole && user) {
    const roleRank = { VIEWER: 0, ANALYST: 1, ADMIN: 2 };
    if (roleRank[user.role] < roleRank[requiredRole]) {
      return (
        <div className="flex items-center justify-center h-screen bg-slate-950">
          <div className="text-center space-y-3">
            <div className="text-red-400 text-6xl">🔒</div>
            <h2 className="text-xl font-bold text-slate-100">Access Denied</h2>
            <p className="text-slate-400">
              This page requires <span className="text-amber-400 font-semibold">{requiredRole}</span> access.
              Your role is <span className="text-slate-200 font-semibold">{user.role}</span>.
            </p>
          </div>
        </div>
      );
    }
  }

  return <>{children}</>;
};

export default PrivateRoute;
