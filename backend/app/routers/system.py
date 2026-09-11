from fastapi import APIRouter
import httpx
from ..config import settings
from ..services.hardware import get_full_system_info

router = APIRouter(tags=["system"])

@router.get("/info")
async def get_system_info():
    return await get_full_system_info()

@router.get("/services")
async def get_services_status():
    services = []
    
    # Check Ollama
    try:
        async with httpx.AsyncClient(timeout=2.0) as client:
            resp = await client.get(f"{settings.OLLAMA_HOST}/api/version")
            if resp.status_code == 200:
                services.append({
                    "name": "Ollama",
                    "status": "running",
                    "endpoint": settings.OLLAMA_HOST,
                    "details": resp.json()
                })
            else:
                services.append({
                    "name": "Ollama",
                    "status": "stopped",
                    "endpoint": settings.OLLAMA_HOST,
                    "details": f"HTTP {resp.status_code}"
                })
    except Exception as e:
        services.append({
            "name": "Ollama",
            "status": "stopped",
            "endpoint": settings.OLLAMA_HOST,
            "details": str(e)
        })

    # Check Qdrant
    try:
        async with httpx.AsyncClient(timeout=2.0) as client:
            resp = await client.get(f"{settings.QDRANT_HOST}")
            if resp.status_code == 200:
                services.append({
                    "name": "Qdrant",
                    "status": "running",
                    "endpoint": settings.QDRANT_HOST,
                    "details": resp.json()
                })
            else:
                services.append({
                    "name": "Qdrant",
                    "status": "stopped",
                    "endpoint": settings.QDRANT_HOST,
                    "details": f"HTTP {resp.status_code}"
                })
    except Exception as e:
        services.append({
            "name": "Qdrant",
            "status": "stopped",
            "endpoint": settings.QDRANT_HOST,
            "details": str(e)
        })

    return services
