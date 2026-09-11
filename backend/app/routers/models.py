from typing import Any
from fastapi import APIRouter, Depends
from models.provider import ModelInfo, ModelProvider
from app.dependencies import get_model_provider, get_task_router
from models.router import TaskRouter

router = APIRouter(tags=["models"])

@router.get("/list", response_model=list[ModelInfo])
async def list_models(provider: ModelProvider = Depends(get_model_provider)):
    return await provider.list_models()

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
