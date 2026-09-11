import httpx
from abc import ABC, abstractmethod

class EmbeddingProvider(ABC):
    @abstractmethod
    def get_dimension(self) -> int:
        pass
    
    @abstractmethod
    def embed_text(self, text: str) -> list[float]:
        pass

class OllamaEmbeddingProvider(EmbeddingProvider):
    def __init__(self, host: str = "http://localhost:11434"):
        self.host = host
        self.model = "nomic-embed-text"
        
    def get_dimension(self) -> int:
        return 768
        
    def embed_text(self, text: str) -> list[float]:
        try:
            response = httpx.post(
                f"{self.host}/api/embeddings",
                json={"model": self.model, "prompt": text},
                timeout=30.0
            )
            response.raise_for_status()
            data = response.json()
            return data.get("embedding", [])
        except Exception as e:
            print(f"Error generating embedding: {e}")
            return []
