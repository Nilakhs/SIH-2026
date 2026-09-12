export interface GpuInfo {
  name: string;
  vram_total_mb: number;
  vram_used_mb: number;
  vram_free_mb: number;
  gpu_utilization: number;
  temperature: number;
  cuda_version: string;
  driver_version: string;
}

export interface CpuInfo {
  name: string;
  physical_cores: number;
  logical_cores: number;
  usage_percent: number;
  frequency_mhz: number;
}

export interface MemoryInfo {
  total_gb: number;
  available_gb: number;
  used_gb: number;
  usage_percent: number;
}

export interface DiskInfo {
  total_gb: number;
  free_gb: number;
  used_gb: number;
  usage_percent: number;
}

export interface OsInfo {
  system: string;
  release: string;
  version: string;
  machine: string;
}

export interface ModelRecommendation {
  tier: string;
  recommended_models: Array<{
    role: string;
    model: string;
    size: string;
    target: string;
  }>;
}

export interface SystemInfo {
  gpu: GpuInfo | null;
  cpu: CpuInfo;
  memory: MemoryInfo;
  disk: DiskInfo;
  os: OsInfo;
  model_recommendation: ModelRecommendation;
}

export interface ServiceInfo {
  name: string;
  status: 'running' | 'stopped';
  endpoint: string;
  details: string;
}

export interface HealthInfo {
  status: string;
  timestamp: string;
  version: string;
  sovereignty: {
    mode: string;
    external_api_calls: number;
  };
}

export interface SourceDocument {
  doc_id: string;
  filename: string;
  metadata: string;
  content: string;
  score: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  model?: string;
  taskType?: string;
  sources?: SourceDocument[];
  images?: string[];
  imagePreview?: string;
}

export interface ModelStatus {
  available: boolean;
  host: string;
  version: string | null;
  models_loaded: string[];
}

export interface AvailableModel {
  name: string;
  size: string | null;
  quantization: string | null;
  family: string | null;
  parameter_size: string | null;
  modified_at: string | null;
}

export interface TaskClassification {
  task_type: string;
  reason: string;
  recommended_model: string | null;
}

export interface ChatStreamChunk {
  content: string;
  model: string;
  task_type: string | null;
  done: boolean;
  sources?: SourceDocument[];
}

export interface GeneratedFileInfo {
  filename: string;
  format: string;
  size_bytes: number;
  size_formatted: string;
  created_at: string;
  download_url: string;
}

export interface GenerateDocumentRequest {
  format: 'docx' | 'xlsx' | 'pptx';
  title: string;
  subtitle?: string;
  summary?: string;
  use_sample_dataset?: boolean;
}

export interface AuditLogItem {
  id: number;
  timestamp: string;
  event_type: string;
  task_type?: string;
  model?: string;
  tool_name?: string;
  duration_ms?: number;
  exit_code?: number;
  image_filename?: string;
  status: string;
  summary?: string;
  airgap_verified: number;
}

export interface AuditStatsResponse {
  total_events: number;
  sandbox_runs: number;
  vision_inferences: number;
  documents_generated: number;
  success_rate_percent: number;
  airgap_compliance_percent: number;
}


