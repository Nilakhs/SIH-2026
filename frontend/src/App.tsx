import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import ComingSoon from './pages/ComingSoon';
import Workbench from './pages/Workbench';
import Documents from './pages/Documents';
import KnowledgeBase from './pages/KnowledgeBase';
import Agents from './pages/Agents';
import SovereigntyMonitor from './pages/SovereigntyMonitor';
import GeneratedFiles from './pages/GeneratedFiles';
import ExecutionLogs from './pages/ExecutionLogs';

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="workbench" element={<Workbench />} />
          <Route path="documents" element={<Documents />} />
          <Route path="knowledge-base" element={<KnowledgeBase />} />
          <Route path="agents" element={<Agents />} />
          <Route path="execution-logs" element={<ExecutionLogs />} />
          <Route path="generated-files" element={<GeneratedFiles />} />
          <Route path="sovereignty" element={<SovereigntyMonitor />} />
          <Route path="settings" element={<ComingSoon title="Settings" description="Configuration — Phase 10" />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
};

export default App;
