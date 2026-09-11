import axios from 'axios';
import type { HealthInfo, SystemInfo, ServiceInfo, ModelStatus, AvailableModel, TaskClassification } from '../types';

const client = axios.create({
  baseURL: '/api',
  timeout: 10000,
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
    headers: { 'Content-Type': 'multipart/form-data' }
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
  const response = await client.get<KnowledgeStatus>('/knowledge/status');
  return response.data;
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
