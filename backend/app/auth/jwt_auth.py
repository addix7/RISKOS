from datetime import datetime, timedelta, timezone
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
bearer_scheme = HTTPBearer(auto_error=False)

# Seeded Analysts for Hackathon Auth
DEMO_ANALYSTS = {
    "analyst@riskos.ai": {
        "password": "analyst_demo_secret_2026", # demo plain password
        "name": "Senior Analyst Vikram",
        "role": "senior_analyst",
    },
    "priya@riskos.ai": {
        "password": "analyst_demo_secret_2026",
        "name": "Analyst Priya",
        "role": "analyst",
    },
    "admin@riskos.ai": {
        "password": "admin_demo_secret_2026",
        "name": "Risk Operations Lead",
        "role": "admin",
    },
}


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=settings.jwt_expire_minutes))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def verify_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
        return payload
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authentication token",
            headers={"WWW-Authenticate": "Bearer"},
        )


def get_current_analyst(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme)
) -> dict:
    """Dependency: validate Bearer JWT token; fall back to demo analyst for unauthenticated dev routes."""
    if credentials is None:
        return {"sub": "analyst@riskos.ai", "name": "Senior Analyst Vikram", "role": "analyst"}
    return verify_token(credentials.credentials)


def require_auth(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme)
) -> dict:
    """Strict Dependency: requires a valid JWT Bearer token."""
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing Authorization header with Bearer token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return verify_token(credentials.credentials)