from typing import List, Dict, Any, Optional
from fastapi import APIRouter, HTTPException, Query, Response
from pydantic import BaseModel

from audit import get_audit_logs, get_audit_stats, export_audit_csv

router = APIRouter(tags=["audit"])

class AuditLogItem(BaseModel):
    id: int
    timestamp: str
    event_type: str
    task_type: Optional[str] = None
    model: Optional[str] = None
    tool_name: Optional[str] = None
    duration_ms: Optional[float] = 0.0
    exit_code: Optional[int] = 0
    image_filename: Optional[str] = None
    status: str
    summary: Optional[str] = None
    airgap_verified: int = 1

class AuditStatsResponse(BaseModel):
    total_events: int
    sandbox_runs: int
    vision_inferences: int
    documents_generated: int
    success_rate_percent: float
    airgap_compliance_percent: float

@router.get("/logs", response_model=List[AuditLogItem])
async def list_audit_logs(
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    event_type: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    search: Optional[str] = Query(None)
):
    try:
        return get_audit_logs(
            limit=limit,
            offset=offset,
            event_type=event_type,
            status=status,
            search=search
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch audit logs: {e}")

@router.get("/stats", response_model=AuditStatsResponse)
async def fetch_audit_stats():
    try:
        return get_audit_stats()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch audit stats: {e}")

@router.get("/export")
async def export_audit_log_csv():
    try:
        csv_data = export_audit_csv()
        return Response(
            content=csv_data,
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=sovereign_ai_audit_trail.csv"}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to export audit CSV: {e}")
