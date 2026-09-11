from fastapi import APIRouter
from datetime import datetime, timezone
from ..config import settings

router = APIRouter(tags=["health"])

@router.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "version": settings.APP_VERSION,
        "sovereignty": {
            "mode": "air-gapped",
            "external_api_calls": 0
        }
    }
