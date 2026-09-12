import os
import shutil
from pathlib import Path
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import List
from app.middleware.auth_middleware import get_current_user

router = APIRouter(prefix="/api/drive", tags=["drive"])

# This is our offline shared drive storage location
DRIVE_ROOT = Path(__file__).resolve().parents[3] / "data" / "shared_drive"
DRIVE_ROOT.mkdir(parents=True, exist_ok=True)

def get_safe_path(subpath: str) -> Path:
    """Ensure path traversal (e.g. ../../) is not allowed."""
    subpath = subpath.strip("/")
    target = (DRIVE_ROOT / subpath).resolve()
    # Ensure the resolved path is strictly within DRIVE_ROOT
    if not str(target).startswith(str(DRIVE_ROOT.resolve())):
        raise HTTPException(status_code=403, detail="Invalid path")
    return target

class FolderReq(BaseModel):
    path: str
    name: str

@router.get("/list")
async def list_directory(path: str = "", current_user=Depends(get_current_user)):
    target = get_safe_path(path)
    if not target.exists():
        target.mkdir(parents=True, exist_ok=True)
    
    items = []
    for item in target.iterdir():
        items.append({
            "name": item.name,
            "is_dir": item.is_dir(),
            "size_kb": round(item.stat().st_size / 1024, 1) if not item.is_dir() else 0,
            "modified": item.stat().st_mtime
        })
    # Sort folders first, then files
    return sorted(items, key=lambda x: (not x["is_dir"], x["name"].lower()))

@router.post("/folder")
async def create_folder(req: FolderReq, current_user=Depends(get_current_user)):
    target = get_safe_path(req.path) / req.name
    if target.exists():
        raise HTTPException(status_code=400, detail="Folder already exists")
    target.mkdir(parents=True, exist_ok=True)
    return {"status": "success", "folder": req.name}

@router.post("/upload")
async def upload_file(
    path: str = Form(""),
    file: UploadFile = File(...),
    current_user=Depends(get_current_user)
):
    target_dir = get_safe_path(path)
    target_dir.mkdir(parents=True, exist_ok=True)
    
    # Sanitize filename
    safe_filename = file.filename.replace("/", "").replace("\\", "")
    target_file = target_dir / safe_filename
    
    with open(target_file, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    return {"status": "success", "filename": safe_filename}

@router.get("/download")
async def download_file(path: str, current_user=Depends(get_current_user)):
    target = get_safe_path(path)
    if not target.exists() or target.is_dir():
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(str(target), filename=target.name)

@router.delete("/delete")
async def delete_item(path: str, current_user=Depends(get_current_user)):
    target = get_safe_path(path)
    if not target.exists() or target == DRIVE_ROOT.resolve():
        raise HTTPException(status_code=400, detail="Cannot delete root or non-existent path")
        
    if target.is_dir():
        shutil.rmtree(target)
    else:
        target.unlink()
    return {"status": "deleted"}
