from pydantic import BaseModel

class ModelConfig(BaseModel):
    """Configuration for a specific model role."""
    role: str
    model_name: str
    description: str
    min_vram_mb: int = 0
    supports_streaming: bool = True

DEFAULT_MODEL_CONFIGS = [
    ModelConfig(role="chat", model_name="qwen2.5:7b-instruct-q4_K_M", description="General reasoning and conversation", min_vram_mb=4096),
    ModelConfig(role="coder", model_name="qwen2.5-coder:7b-instruct-q4_K_M", description="Code generation and data analysis", min_vram_mb=4096),
    ModelConfig(role="embedding", model_name="nomic-embed-text", description="Text embeddings for RAG", min_vram_mb=512),
    ModelConfig(role="vision", model_name="moondream2", description="Image and diagram analysis", min_vram_mb=2048),
]
