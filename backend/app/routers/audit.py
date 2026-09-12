import sqlite3
from fastapi import APIRouter, Depends, Query
from app.database import get_db
from app.middleware.auth_middleware import get_current_user, require_admin
from app.services.audit_service import verify_chain

router = APIRouter(prefix="/api/audit", tags=["audit"])


@router.get("/logs")
async def get_audit_logs(
    limit: int = Query(100, le=500),
    offset: int = Query(0),
    action: str = Query(None),
    username: str = Query(None),
    db: sqlite3.Connection = Depends(get_db),
    current_user=Depends(get_current_user),
):
    cursor = db.cursor()
    conditions = []
    params = []
    if action:
        conditions.append("action LIKE ?")
        params.append(f"%{action}%")
    if username:
        conditions.append("username LIKE ?")
        params.append(f"%{username}%")
    where = f"WHERE {' AND '.join(conditions)}" if conditions else ""
    cursor.execute(
        f"SELECT * FROM audit_logs {where} ORDER BY timestamp DESC LIMIT ? OFFSET ?",
        params + [limit, offset],
    )
    logs = [dict(r) for r in cursor.fetchall()]
    cursor.execute(f"SELECT COUNT(*) FROM audit_logs {where}", params)
    total = cursor.fetchone()[0]
    return {"logs": logs, "total": total, "limit": limit, "offset": offset}


@router.get("/verify")
async def verify_audit_chain(current_user=Depends(require_admin)):
    """Verify the cryptographic integrity of the entire audit log chain."""
    return verify_chain()
