import os
import re
import uuid
import shutil
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, UploadFile, File, BackgroundTasks, HTTPException, Depends
from pydantic import BaseModel
import sqlite3

from app.database import get_db, DB_PATH
from document_processing import process_document

router = APIRouter()

UPLOAD_DIR = r"c:\SIH\backend\data\uploads"
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB
ALLOWED_EXTENSIONS = {'.pdf', '.docx', '.txt', '.csv', '.xlsx', '.png', '.jpg'}

os.makedirs(UPLOAD_DIR, exist_ok=True)

def secure_filename(filename: str) -> str:
    if not filename:
        return "unnamed"
    # Keep only alphanumeric characters, dots, dashes, and underscores
    filename = re.sub(r'[^a-zA-Z0-9_.-]', '_', filename)
    # Strip leading/trailing dots and underscores
    return filename.strip('._')

class DocumentResponse(BaseModel):
    id: str
    filename: str
    file_path: str
    mime_type: Optional[str]
    file_size: int
    status: str
    page_count: Optional[int]
    upload_time: str
    error_msg: Optional[str]

class DocumentChunkResponse(BaseModel):
    id: int
    chunk_index: int
    metadata: str
    content: str

@router.post("/upload", response_model=DocumentResponse)
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    db: sqlite3.Connection = Depends(get_db)
):
    ext = os.path.splitext(file.filename)[1].lower() if file.filename else ""
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail="File extension not allowed")
    
    safe_name = secure_filename(file.filename)
    if not safe_name:
        safe_name = "unnamed" + ext
        
    doc_id = str(uuid.uuid4())
    final_filename = f"{doc_id}_{safe_name}"
    file_path = os.path.join(UPLOAD_DIR, final_filename)
    
    # Save file
    file_size = 0
    try:
        with open(file_path, "wb") as buffer:
            while True:
                chunk = await file.read(1024 * 1024)
                if not chunk:
                    break
                file_size += len(chunk)
                if file_size > MAX_FILE_SIZE:
                    os.remove(file_path)
                    raise HTTPException(status_code=400, detail="File size exceeds 50MB limit")
                buffer.write(chunk)
    except Exception as e:
        if os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(status_code=500, detail=f"Failed to save file: {str(e)}")
            
    mime_type = file.content_type
    upload_time = datetime.utcnow().isoformat()
    status = "UPLOADED"
    
    # Insert to DB
    cursor = db.cursor()
    cursor.execute("""
        INSERT INTO documents (id, filename, file_path, mime_type, file_size, status, page_count, upload_time, error_msg)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (doc_id, safe_name, file_path, mime_type, file_size, status, 0, upload_time, None))
    db.commit()
    
    # Launch background task
    background_tasks.add_task(process_document, doc_id, file_path, mime_type, DB_PATH)
    
    return DocumentResponse(
        id=doc_id,
        filename=safe_name,
        file_path=file_path,
        mime_type=mime_type,
        file_size=file_size,
        status=status,
        page_count=0,
        upload_time=upload_time,
        error_msg=None
    )

@router.get("/list", response_model=List[DocumentResponse])
async def list_documents(db: sqlite3.Connection = Depends(get_db)):
    cursor = db.cursor()
    cursor.execute("SELECT * FROM documents")
    rows = cursor.fetchall()
    return [dict(row) for row in rows]

@router.get("/{doc_id}", response_model=DocumentResponse)
async def get_document(doc_id: str, db: sqlite3.Connection = Depends(get_db)):
    cursor = db.cursor()
    cursor.execute("SELECT * FROM documents WHERE id = ?", (doc_id,))
    row = cursor.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Document not found")
    return dict(row)

@router.get("/{doc_id}/chunks", response_model=List[DocumentChunkResponse])
async def get_document_chunks(doc_id: str, db: sqlite3.Connection = Depends(get_db)):
    cursor = db.cursor()
    cursor.execute("SELECT * FROM document_chunks WHERE document_id = ?", (doc_id,))
    rows = cursor.fetchall()
    return [dict(row) for row in rows]

@router.delete("/{doc_id}")
async def delete_document(doc_id: str, db: sqlite3.Connection = Depends(get_db)):
    cursor = db.cursor()
    cursor.execute("SELECT file_path FROM documents WHERE id = ?", (doc_id,))
    row = cursor.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Document not found")
    
    file_path = row['file_path']
    if os.path.exists(file_path):
        os.remove(file_path)
        
    cursor.execute("DELETE FROM document_chunks WHERE document_id = ?", (doc_id,))
    cursor.execute("DELETE FROM documents WHERE id = ?", (doc_id,))
    db.commit()
    
    return {"status": "deleted"}
