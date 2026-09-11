from models.provider import ModelProvider
from models.ollama_provider import OllamaProvider
from models.router import TaskRouter
from rag.embeddings import OllamaEmbeddingProvider, EmbeddingProvider
from rag.vector_store import QdrantStore
from rag.service import RAGService
from .config import settings

# Singleton instances
_provider: ModelProvider | None = None
_router: TaskRouter | None = None
_embedding_provider: EmbeddingProvider | None = None
_rag_service: RAGService | None = None

def get_model_provider() -> ModelProvider:
    global _provider
    if _provider is None:
        _provider = OllamaProvider(host=settings.OLLAMA_HOST)
    return _provider

def get_task_router() -> TaskRouter:
    global _router
    if _router is None:
        _router = TaskRouter()
    return _router

def get_embedding_provider() -> EmbeddingProvider:
    global _embedding_provider
    if _embedding_provider is None:
        _embedding_provider = OllamaEmbeddingProvider(host=settings.OLLAMA_HOST)
    return _embedding_provider

def get_rag_service() -> RAGService:
    global _rag_service
    if _rag_service is None:
        ep = get_embedding_provider()
        vs = QdrantStore(url="http://localhost:6333")
        _rag_service = RAGService(ep, vs)
    return _rag_service
