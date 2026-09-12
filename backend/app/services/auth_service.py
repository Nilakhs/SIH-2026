import uuid
import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional
from passlib.context import CryptContext
from jose import JWTError, jwt
from pydantic import BaseModel

# Secret key for JWT — change this in production
SECRET_KEY = "sovereign-ai-workbench-secret-key-sih2026-never-share"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = 8  # 8-hour sessions for enterprise use

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


class TokenData(BaseModel):
    user_id: str
    username: str
    role: str
    department_id: Optional[str] = None


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS)
    )
    to_encode.update({"exp": expire, "iat": datetime.now(timezone.utc).timestamp()})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token: str) -> Optional[TokenData]:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        username: str = payload.get("username")
        role: str = payload.get("role", "VIEWER")
        department_id: Optional[str] = payload.get("department_id")
        if not user_id:
            return None
        return TokenData(
            user_id=user_id,
            username=username,
            role=role,
            department_id=department_id,
        )
    except JWTError:
        return None
