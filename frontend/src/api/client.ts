import axios from 'axios';
import type { HealthInfo, SystemInfo, ServiceInfo, ModelStatus, AvailableModel, TaskClassification } from '../types';

const client = axios.create({
  baseURL: '/api',
  timeout: 10000,
});

// Automatically inject JWT token from localStorage into every request
client.interceptors.request.use((config) => {
  const token = localStorage.getItem('sovereign_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const fetchHealth = async (): Promise<HealthInfo> => {
  const response = await client.get<HealthInfo>('/health');
  return response.data;
};

export const fetchSystemInfo = async (): Promise<SystemInfo> => {
  const response = await client.get<SystemInfo>('/system/info');
  return response.data;
};

export const fetchServices = async (): Promise<ServiceInfo[]> => {
  const response = await client.get<ServiceInfo[]>('/system/services');
  return response.data;
};

export const fetchModelStatus = async (): Promise<ModelStatus> => {
  const response = await client.get<ModelStatus>('/models/status');
  return response.data;
};

export const fetchAvailableModels = async (): Promise<AvailableModel[]> => {
  const response = await client.get<AvailableModel[]>('/models/list');
  return response.data;
};

export const classifyTask = async (message: string): Promise<TaskClassification> => {
  const response = await client.get<TaskClassification>('/models/router/classify', {
    params: { message }
  });
  return response.data;
};

export interface DocumentInfo {
  id: string;
  filename: string;
  mime_type: string;
  file_size: number;
  status: 'UPLOADED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  page_count: number;
  upload_time: string;
  error_msg?: string;
}

export interface DocumentChunk {
  id: number;
  chunk_index: number;
  metadata: string;
  content: string;
}

export const uploadDocument = async (file: File): Promise<DocumentInfo> => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await client.post('/documents/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 120000,
  });
  return response.data;
};

export const fetchDocuments = async (): Promise<DocumentInfo[]> => {
  const response = await client.get('/documents/list');
  return response.data;
};

export const fetchDocumentChunks = async (id: string): Promise<DocumentChunk[]> => {
  const response = await client.get(`/documents/${id}/chunks`);
  return response.data;
};

export const deleteDocument = async (id: string): Promise<void> => {
  await client.delete(`/documents/${id}`);
};

export interface KnowledgeStatus {
  available: boolean;
  collection: string;
  vector_count: number;
}

export const fetchKnowledgeStatus = async (): Promise<KnowledgeStatus> => {
  const response = await client.get('/knowledge/status');
  const data = response.data;
  return {
    available: data.status === 'connected',
    collection: data.collection_name || '',
    vector_count: data.vector_count || 0,
  };
};

export const reindexDocument = async (id: string): Promise<void> => {
  await client.post(`/documents/${id}/reindex`);
};

export interface AgentEvent {
  type: 'agent_step' | 'tool_call' | 'tool_result' | 'final' | 'error';
  step?: string;
  tool?: string;
  status?: string;
  answer?: string;
  sources?: any[];
  error?: string;
  code?: string;
  stdout?: string;
  stderr?: string;
  exit_code?: number;
}

export interface SandboxStatus {
  docker_available: boolean;
  status: string;
}

export const fetchSandboxStatus = async (): Promise<SandboxStatus> => {
  const response = await client.get<SandboxStatus>('/sandbox/status');
  return response.data;
};

export interface NetworkInterfaceInfo {
  name: string;
  status: 'UP' | 'DOWN';
  speed_mbps: number;
  ip_addresses: string[];
  is_loopback: boolean;
  bytes_sent: number;
  bytes_recv: number;
  packets_sent: number;
  packets_recv: number;
}

export interface ConnectionInfo {
  local_address: string;
  remote_address: string;
  status: string;
  type: 'LOOPBACK' | 'PRIVATE_LAN' | 'EXTERNAL' | 'UNKNOWN';
  service: string | null;
  pid: number | null;
}

export interface ServiceTelemetry {
  port: number;
  status: 'RUNNING' | 'STOPPED';
  connection_count: number;
  transport: string;
}

export interface NetworkEvidence {
  internet: 'CONNECTED' | 'DISCONNECTED' | 'UNKNOWN';
  external_connections: number;
  local_connections: number;
  private_lan_connections: number;
  outbound_bytes: number;
  inbound_bytes: number;
  active_local_services: string[];
  explanation: string;
}

export interface SovereigntyReport {
  network_evidence: NetworkEvidence;
  services: Record<string, ServiceTelemetry>;
  interfaces: NetworkInterfaceInfo[];
  connections: ConnectionInfo[];
  summary: {
    total_tcp_connections: number;
    external_count: number;
    loopback_count: number;
    private_lan_count: number;
  };
}

export const fetchSovereigntyTelemetry = async (): Promise<SovereigntyReport> => {
  const response = await client.get<SovereigntyReport>('/sovereignty/telemetry');
  return response.data;
};

// ─── Conversations ───────────────────────────────────────────────
export interface Conversation {
  id: string;
  user_id: string;
  title: string;
  model: string | null;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  sources: string | null;
  created_at: string;
}

export const fetchConversations = async (): Promise<Conversation[]> => {
  const res = await client.get('/conversations/');
  return res.data;
};

export const createConversation = async (title?: string, model?: string): Promise<Conversation> => {
  const res = await client.post('/conversations/', { title, model });
  return res.data;
};

export const fetchMessages = async (convId: string): Promise<Message[]> => {
  const res = await client.get(`/conversations/${convId}/messages`);
  return res.data;
};

export const addMessage = async (convId: string, role: string, content: string, sources?: any[]): Promise<Message> => {
  const res = await client.post(`/conversations/${convId}/messages`, { role, content, sources });
  return res.data;
};

export const deleteConversation = async (convId: string): Promise<void> => {
  await client.delete(`/conversations/${convId}`);
};

// ─── LAN Discovery ───────────────────────────────────────────────
export interface LanServer {
  app: string;
  host: string;
  hostname: string;
  backend_port: number;
  frontend_port: number;
  timestamp: string;
}

export const discoverLanServers = async (): Promise<{ servers: LanServer[]; local_ip: string }> => {
  const res = await client.get('/lan/servers');
  return res.data;
};

// ─── Available Models ─────────────────────────────────────────────
export const fetchModels = async (): Promise<AvailableModel[]> => {
  const res = await client.get('/models/list');
  return res.data;
};
