import os
import json
import sqlite3
from pathlib import Path
from datetime import datetime
from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import FileResponse
from app.middleware.auth_middleware import get_current_user

router = APIRouter(prefix="/api/reports", tags=["reports"])

REPORTS_DIR = Path(__file__).resolve().parents[3] / "data" / "generated_reports"
REPORTS_DIR.mkdir(parents=True, exist_ok=True)


@router.get("/list")
async def list_reports(current_user=Depends(get_current_user)):
    """List all AI-generated report files."""
    reports = []
    for f in sorted(REPORTS_DIR.iterdir(), key=lambda x: x.stat().st_mtime, reverse=True):
        if f.is_file() and f.suffix in (".pdf", ".docx"):
            stat = f.stat()
            reports.append({
                "filename": f.name,
                "format": f.suffix.lstrip(".").upper(),
                "size_kb": round(stat.st_size / 1024, 1),
                "created_at": datetime.fromtimestamp(stat.st_mtime).isoformat(),
                "download_url": f"/api/reports/download/{f.name}",
            })
    return {"reports": reports, "total": len(reports)}


@router.get("/download/{filename}")
async def download_report(filename: str, current_user=Depends(get_current_user)):
    """Download a generated report file."""
    # Sanitize: prevent path traversal
    safe_name = Path(filename).name
    filepath = REPORTS_DIR / safe_name
    if not filepath.exists() or not filepath.is_file():
        raise HTTPException(status_code=404, detail="Report not found")
    
    media_type = "application/pdf" if safe_name.endswith(".pdf") else \
                 "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    return FileResponse(str(filepath), media_type=media_type, filename=safe_name)


@router.delete("/{filename}")
async def delete_report(filename: str, current_user=Depends(get_current_user)):
    """Delete a generated report file."""
    safe_name = Path(filename).name
    filepath = REPORTS_DIR / safe_name
    if filepath.exists():
        filepath.unlink()
    return {"status": "deleted", "filename": safe_name}
