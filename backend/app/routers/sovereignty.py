from fastapi import APIRouter
import sys
import os

sys.path.append(r"c:\SIH")
from network_monitor.telemetry import get_sovereignty_report

router = APIRouter(prefix="/sovereignty", tags=["sovereignty"])

@router.get("/telemetry")
async def get_telemetry():
    """
    Returns genuine, demonstrable local network telemetry.
    Zero cloud APIs, zero external data transmission.
    """
    return get_sovereignty_report()
