import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import ComingSoon from './pages/ComingSoon';
import Workbench from './pages/Workbench';
import Documents from './pages/Documents';
import KnowledgeBase from './pages/KnowledgeBase';
import Agents from './pages/Agents';

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
          <Route path="execution-logs" element={<ComingSoon title="Execution Logs" description="Audit trail — Phase 9" />} />
          <Route path="generated-files" element={<ComingSoon title="Generated Files" description="Document generation — Phase 7" />} />
          <Route path="sovereignty" element={<ComingSoon title="Sovereignty Monitor" description="Network telemetry — Phase 8" />} />
          <Route path="settings" element={<ComingSoon title="Settings" description="Configuration — Phase 10" />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
};

export default App;
