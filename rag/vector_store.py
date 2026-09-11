import uuid
from qdrant_client import QdrantClient
from qdrant_client.http import models

class QdrantStore:
    def __init__(self, url="http://localhost:6333"):
        self.client = QdrantClient(url=url)
        
    def initialize_collection(self, collection_name: str, dimension: int):
        collections = self.client.get_collections().collections
        if not any(c.name == collection_name for c in collections):
            self.client.create_collection(
                collection_name=collection_name,
                vectors_config=models.VectorParams(
                    size=dimension,
                    distance=models.Distance.COSINE
                )
            )
            
    def index_chunks(self, collection_name: str, chunks: list[dict]):
        points = []
        for chunk in chunks:
            points.append(
                models.PointStruct(
                    id=str(chunk["id"]),
                    vector=chunk["vector"],
                    payload=chunk["payload"]
                )
            )
        if points:
            self.client.upsert(
                collection_name=collection_name,
                points=points
            )
            
    def search(self, collection_name: str, query_vector: list[float], top_k=5) -> list[dict]:
        results = self.client.search(
            collection_name=collection_name,
            query_vector=query_vector,
            limit=top_k
        )
        return [{"score": hit.score, "payload": hit.payload} for hit in results]
        
    def delete_document(self, collection_name: str, doc_id: str):
        self.client.delete(
            collection_name=collection_name,
            points_selector=models.Filter(
                must=[
                    models.FieldCondition(
                        key="doc_id",
                        match=models.MatchValue(value=doc_id)
                    )
                ]
            )
        )
