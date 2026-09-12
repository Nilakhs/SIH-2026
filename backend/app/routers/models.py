from typing import Any
from fastapi import APIRouter, Depends
from models.provider import ModelInfo, ModelProvider
from app.dependencies import get_model_provider, get_task_router
from models.router import TaskRouter

router = APIRouter(tags=["models"])

@router.get("/list", response_model=list[ModelInfo])
async def list_models(provider: ModelProvider = Depends(get_model_provider)):
    all_models = await provider.list_models()
    # Filter out embedding models that cannot be used for chat
    embedding_keywords = ['embed', 'nomic']
    return [m for m in all_models if not any(kw in m.name.lower() for kw in embedding_keywords)]

@router.get("/status")
async def get_status(provider: ModelProvider = Depends(get_model_provider)):
    return await provider.get_status()

@router.get("/router/classify")
async def classify_message(
    message: str, 
    router: TaskRouter = Depends(get_task_router),
    provider: ModelProvider = Depends(get_model_provider)
):
    task_type, reason = router.classify(message)
    available = await provider.list_models()
    model_names = [m.name for m in available]
    recommended_model = router.get_model_for_task(task_type, model_names)
    
    return {
        "task_type": task_type,
        "reason": reason,
        "recommended_model": recommended_model
    }
