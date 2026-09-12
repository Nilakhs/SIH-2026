from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.services.auth_service import decode_token, TokenData

bearer_scheme = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
) -> TokenData:
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated. Please log in.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    token_data = decode_token(credentials.credentials)
    if not token_data:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token. Please log in again.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return token_data


def require_admin(
    current_user: TokenData = Depends(get_current_user),
) -> TokenData:
    if current_user.role != "ADMIN":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required for this operation.",
        )
    return current_user


def require_analyst_or_admin(
    current_user: TokenData = Depends(get_current_user),
) -> TokenData:
    if current_user.role not in ("ADMIN", "ANALYST"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Analyst or Admin access required.",
        )
    return current_user
