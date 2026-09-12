import uuid
import sqlite3
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from typing import Optional
from app.database import get_db
from app.middleware.auth_middleware import require_admin, get_current_user
from app.services.auth_service import hash_password

router = APIRouter(prefix="/api/users", tags=["users"])


class UserUpdate(BaseModel):
    role: Optional[str] = None
    is_active: Optional[bool] = None
    department_id: Optional[str] = None
    full_name: Optional[str] = None


class DepartmentCreate(BaseModel):
    name: str
    description: Optional[str] = ""


class UserCreate(BaseModel):
    username: str
    password: str
    email: str
    full_name: str
    role: str = "ANALYST"
    department_id: Optional[str] = None

@router.post("/")
async def create_user(
    user: UserCreate,
    db: sqlite3.Connection = Depends(get_db),
    current_user=Depends(require_admin),
):
    if user.role not in ("ADMIN", "ANALYST", "VIEWER"):
        raise HTTPException(status_code=400, detail="Invalid role")
    
    user_id = str(uuid.uuid4())
    hashed = hash_password(user.password)
    
    try:
        db.execute(
            """INSERT INTO users (id, username, email, hashed_password, full_name, role, department_id)
               VALUES (?, ?, ?, ?, ?, ?, ?)""",
            (user_id, user.username, user.email, hashed, user.full_name, user.role, user.department_id)
        )
        db.commit()
        return {"id": user_id, "username": user.username, "status": "created"}
    except sqlite3.IntegrityError:
        raise HTTPException(status_code=400, detail="Username or email already exists")

@router.get("/")
async def list_users(
    db: sqlite3.Connection = Depends(get_db),
    current_user=Depends(require_admin),
):
    cursor = db.cursor()
    cursor.execute("""
        SELECT u.id, u.username, u.email, u.full_name, u.role, u.is_active,
               u.created_at, u.last_login, d.name as department_name
        FROM users u LEFT JOIN departments d ON u.department_id = d.id
        ORDER BY u.created_at DESC
    """)
    return [dict(r) for r in cursor.fetchall()]


@router.patch("/{user_id}")
async def update_user(
    user_id: str,
    update: UserUpdate,
    db: sqlite3.Connection = Depends(get_db),
    current_user=Depends(require_admin),
):
    fields, values = [], []
    if update.role is not None:
        if update.role not in ("ADMIN", "ANALYST", "VIEWER"):
            raise HTTPException(status_code=400, detail="Role must be ADMIN, ANALYST, or VIEWER")
        fields.append("role = ?")
        values.append(update.role)
    if update.is_active is not None:
        fields.append("is_active = ?")
        values.append(1 if update.is_active else 0)
    if update.department_id is not None:
        fields.append("department_id = ?")
        values.append(update.department_id)
    if update.full_name is not None:
        fields.append("full_name = ?")
        values.append(update.full_name)
    if not fields:
        raise HTTPException(status_code=400, detail="No fields to update")
    values.append(user_id)
    db.execute(f"UPDATE users SET {', '.join(fields)} WHERE id = ?", values)
    db.commit()
    return {"status": "updated"}


@router.delete("/{user_id}")
async def deactivate_user(
    user_id: str,
    db: sqlite3.Connection = Depends(get_db),
    current_user=Depends(require_admin),
):
    if user_id == current_user.user_id:
        raise HTTPException(status_code=400, detail="Cannot deactivate yourself")
    db.execute("UPDATE users SET is_active = 0 WHERE id = ?", (user_id,))
    db.commit()
    return {"status": "deactivated"}


@router.get("/departments")
async def list_departments(
    db: sqlite3.Connection = Depends(get_db),
    current_user=Depends(get_current_user),
):
    cursor = db.cursor()
    cursor.execute("""
        SELECT d.*, COUNT(u.id) as member_count
        FROM departments d
        LEFT JOIN users u ON u.department_id = d.id AND u.is_active = 1
        GROUP BY d.id ORDER BY d.name
    """)
    return [dict(r) for r in cursor.fetchall()]


@router.post("/departments")
async def create_department(
    dept: DepartmentCreate,
    db: sqlite3.Connection = Depends(get_db),
    current_user=Depends(require_admin),
):
    dept_id = str(uuid.uuid4())
    try:
        db.execute(
            "INSERT INTO departments (id, name, description) VALUES (?, ?, ?)",
            (dept_id, dept.name, dept.description),
        )
        db.commit()
        return {"id": dept_id, "name": dept.name, "description": dept.description}
    except Exception:
        raise HTTPException(status_code=400, detail="Department name already exists")
