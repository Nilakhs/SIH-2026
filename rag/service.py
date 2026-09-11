import uuid
import sqlite3
from rag.embeddings import EmbeddingProvider
from rag.vector_store import QdrantStore

class RAGService:
    def __init__(self, embedding_provider: EmbeddingProvider, vector_store: QdrantStore):
        self.embedding_provider = embedding_provider
        self.vector_store = vector_store
        self.collection_name = "workbench_knowledge"
        
        try:
            self.vector_store.initialize_collection(
                self.collection_name, 
                self.embedding_provider.get_dimension()
            )
        except Exception as e:
            print(f"Warning: Failed to initialize Qdrant collection: {e}")
            
    def index_document(self, doc_id: str, db_path: str):
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        cursor.execute("SELECT chunk_index, metadata, content FROM document_chunks WHERE document_id = ?", (doc_id,))
        rows = cursor.fetchall()
        
        chunks_to_index = []
        for row in rows:
            chunk_index, metadata, content = row
            vector = self.embedding_provider.embed_text(content)
            if not vector:
                continue
                
            payload = {
                "doc_id": doc_id,
                "chunk_index": chunk_index,
                "metadata": metadata,
                "content": content
            }
            chunks_to_index.append({
                "id": str(uuid.uuid4()),
                "vector": vector,
                "payload": payload
            })
            
        if chunks_to_index:
            self.vector_store.index_chunks(self.collection_name, chunks_to_index)
            
        conn.close()
        
    def search(self, query: str, top_k=5) -> list[dict]:
        vector = self.embedding_provider.embed_text(query)
        if not vector:
            return []
        return self.vector_store.search(self.collection_name, vector, top_k)
