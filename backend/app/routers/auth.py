import uuid
import sqlite3
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Request
from pydantic import BaseModel
from app.database import get_db
from app.services.auth_service import verify_password, hash_password, create_access_token, decode_token
from app.services.audit_service import log_action

router = APIRouter(prefix="/api/auth", tags=["auth"])


class LoginRequest(BaseModel):
    username: str
    password: str


class RegisterRequest(BaseModel):
    username: str
    email: str
    password: str
    full_name: Optional[str] = None
    department_id: Optional[str] = None


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict


@router.post("/login", response_model=TokenResponse)
async def login(
    req: LoginRequest,
    request: Request,
    db: sqlite3.Connection = Depends(get_db),
):
    cursor = db.cursor()
    cursor.execute(
        "SELECT * FROM users WHERE username = ? AND is_active = 1", (req.username,)
    )
    user = cursor.fetchone()

    if not user or not verify_password(req.password, user["hashed_password"]):
        log_action(
            "LOGIN_FAILED",
            username=req.username,
            status="FAILURE",
            ip_address=request.client.host if request.client else None,
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
        )

    db.execute(
        "UPDATE users SET last_login = ? WHERE id = ?",
        (datetime.now(timezone.utc).isoformat(), user["id"]),
    )
    db.commit()

    token_data = {
        "sub": user["id"],
        "username": user["username"],
        "role": user["role"],
        "department_id": user["department_id"],
    }
    access_token = create_access_token(token_data)

    log_action(
        "LOGIN_SUCCESS",
        user_id=user["id"],
        username=user["username"],
        ip_address=request.client.host if request.client else None,
    )

    return TokenResponse(
        access_token=access_token,
        user={
            "id": user["id"],
            "username": user["username"],
            "email": user["email"],
            "full_name": user["full_name"],
            "role": user["role"],
            "department_id": user["department_id"],
        },
    )


@router.post("/register", response_model=TokenResponse)
async def register(
    req: RegisterRequest,
    request: Request,
    db: sqlite3.Connection = Depends(get_db),
):
    cursor = db.cursor()
    cursor.execute(
        "SELECT id FROM users WHERE username = ? OR email = ?",
        (req.username, req.email),
    )
    if cursor.fetchone():
        raise HTTPException(status_code=400, detail="Username or email already exists")

    dept_id = req.department_id
    if not dept_id:
        cursor.execute("SELECT id FROM departments LIMIT 1")
        dept_row = cursor.fetchone()
        dept_id = dept_row["id"] if dept_row else None

    user_id = str(uuid.uuid4())
    hashed = hash_password(req.password)
    db.execute(
        """INSERT INTO users
           (id, username, email, hashed_password, full_name, role, department_id)
           VALUES (?, ?, ?, ?, ?, ?, ?)""",
        (user_id, req.username, req.email, hashed, req.full_name, "ANALYST", dept_id),
    )
    db.commit()

    token_data = {
        "sub": user_id,
        "username": req.username,
        "role": "ANALYST",
        "department_id": dept_id,
    }
    access_token = create_access_token(token_data)

    log_action(
        "USER_REGISTERED",
        user_id=user_id,
        username=req.username,
        ip_address=request.client.host if request.client else None,
    )

    return TokenResponse(
        access_token=access_token,
        user={
            "id": user_id,
            "username": req.username,
            "email": req.email,
            "full_name": req.full_name,
            "role": "ANALYST",
            "department_id": dept_id,
        },
    )


@router.get("/me")
async def get_me(request: Request, db: sqlite3.Connection = Depends(get_db)):
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = auth_header[7:]
    token_data = decode_token(token)
    if not token_data:
        raise HTTPException(status_code=401, detail="Invalid token")
    cursor = db.cursor()
    cursor.execute(
        "SELECT id, username, email, full_name, role, department_id, last_login FROM users WHERE id = ?",
        (token_data.user_id,),
    )
    user = cursor.fetchone()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return dict(user)


@router.get("/departments")
async def get_departments(db: sqlite3.Connection = Depends(get_db)):
    cursor = db.cursor()
    cursor.execute("SELECT * FROM departments ORDER BY name")
    return [dict(r) for r in cursor.fetchall()]
