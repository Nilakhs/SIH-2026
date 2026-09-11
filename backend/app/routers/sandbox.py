from fastapi import APIRouter
from app.sandbox.manager import get_sandbox_status

router = APIRouter(prefix="/sandbox", tags=["sandbox"])

@router.get("/status")
def status():
    return get_sandbox_status()
