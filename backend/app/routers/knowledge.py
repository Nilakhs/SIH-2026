from fastapi import APIRouter, Depends
from app.dependencies import get_rag_service
from rag.service import RAGService

router = APIRouter(prefix="/knowledge", tags=["knowledge"])

@router.get("/status")
def get_status(rag_service: RAGService = Depends(get_rag_service)):
    try:
        client = rag_service.vector_store.client
        collection_info = client.get_collection(rag_service.collection_name)
        return {
            "status": "connected",
            "collection_name": rag_service.collection_name,
            "vector_count": collection_info.points_count,
            "status_details": collection_info.status.value if hasattr(collection_info.status, "value") else str(collection_info.status)
        }
    except Exception as e:
        return {
            "status": "error",
            "message": str(e)
        }
