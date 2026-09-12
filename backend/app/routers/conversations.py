import uuid
import json
import sqlite3
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from app.database import get_db
from app.middleware.auth_middleware import get_current_user

router = APIRouter(prefix="/api/conversations", tags=["conversations"])


class ConversationCreate(BaseModel):
    title: Optional[str] = None
    model: Optional[str] = None


class MessageCreate(BaseModel):
    role: str
    content: str
    sources: Optional[list] = None


@router.get("/")
async def list_conversations(
    db: sqlite3.Connection = Depends(get_db),
    current_user=Depends(get_current_user),
):
    cursor = db.cursor()
    cursor.execute(
        "SELECT * FROM conversations WHERE user_id = ? ORDER BY updated_at DESC LIMIT 50",
        (current_user.user_id,),
    )
    return [dict(r) for r in cursor.fetchall()]


@router.post("/")
async def create_conversation(
    req: ConversationCreate,
    db: sqlite3.Connection = Depends(get_db),
    current_user=Depends(get_current_user),
):
    conv_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    db.execute(
        "INSERT INTO conversations (id, user_id, title, model, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
        (conv_id, current_user.user_id, req.title or "New Conversation", req.model, now, now),
    )
    db.commit()
    return {"id": conv_id, "title": req.title or "New Conversation", "model": req.model, "created_at": now}


@router.get("/{conv_id}/messages")
async def get_messages(
    conv_id: str,
    db: sqlite3.Connection = Depends(get_db),
    current_user=Depends(get_current_user),
):
    cursor = db.cursor()
    cursor.execute("SELECT user_id FROM conversations WHERE id = ?", (conv_id,))
    conv = cursor.fetchone()
    if not conv or (conv["user_id"] != current_user.user_id and current_user.role != "ADMIN"):
        raise HTTPException(status_code=404, detail="Conversation not found")
    cursor.execute(
        "SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC",
        (conv_id,),
    )
    return [dict(r) for r in cursor.fetchall()]


@router.post("/{conv_id}/messages")
async def add_message(
    conv_id: str,
    msg: MessageCreate,
    db: sqlite3.Connection = Depends(get_db),
    current_user=Depends(get_current_user),
):
    msg_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    db.execute(
        "INSERT INTO messages (id, conversation_id, role, content, sources, created_at) VALUES (?, ?, ?, ?, ?, ?)",
        (msg_id, conv_id, msg.role, msg.content, json.dumps(msg.sources) if msg.sources else None, now),
    )
    db.execute(
        "UPDATE conversations SET updated_at = ? WHERE id = ?", (now, conv_id)
    )
    db.commit()
    return {"id": msg_id, "conversation_id": conv_id, "role": msg.role, "content": msg.content, "created_at": now}


@router.patch("/{conv_id}/title")
async def update_title(
    conv_id: str,
    title: str,
    db: sqlite3.Connection = Depends(get_db),
    current_user=Depends(get_current_user),
):
    db.execute(
        "UPDATE conversations SET title = ? WHERE id = ? AND user_id = ?",
        (title, conv_id, current_user.user_id),
    )
    db.commit()
    return {"status": "updated"}


@router.delete("/{conv_id}")
async def delete_conversation(
    conv_id: str,
    db: sqlite3.Connection = Depends(get_db),
    current_user=Depends(get_current_user),
):
    db.execute("DELETE FROM messages WHERE conversation_id = ?", (conv_id,))
    db.execute(
        "DELETE FROM conversations WHERE id = ? AND user_id = ?",
        (conv_id, current_user.user_id),
    )
    db.commit()
    return {"status": "deleted"}
