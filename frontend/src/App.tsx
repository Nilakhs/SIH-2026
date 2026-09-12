import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import PrivateRoute from './components/PrivateRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Workbench from './pages/Workbench';
import Documents from './pages/Documents';
import KnowledgeBase from './pages/KnowledgeBase';
import Agents from './pages/Agents';
import AuditLog from './pages/AuditLog';
import GeneratedFiles from './pages/GeneratedFiles';
import UserManagement from './pages/UserManagement';
import SovereigntyMonitor from './pages/SovereigntyMonitor';
import SharedDrive from './pages/SharedDrive';
import ComingSoon from './pages/ComingSoon';

const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Protected app shell */}
          <Route
            path="/"
            element={
              <PrivateRoute>
                <Layout />
              </PrivateRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="workbench" element={<Workbench />} />
            <Route path="documents" element={<Documents />} />
            <Route path="knowledge-base" element={<KnowledgeBase />} />
            <Route path="agents" element={<Agents />} />
            <Route path="execution-logs" element={<AuditLog />} />
            <Route path="generated-files" element={<GeneratedFiles />} />
            <Route path="sovereignty" element={<SovereigntyMonitor />} />
            <Route path="drive" element={<SharedDrive />} />
            {/* Admin-only routes */}
            <Route
              path="user-management"
              element={
                <PrivateRoute requiredRole="ADMIN">
                  <UserManagement />
                </PrivateRoute>
              }
            />
            <Route
              path="settings"
              element={<ComingSoon title="Settings" description="System configuration — coming in Phase 10" />}
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
