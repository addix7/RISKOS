from fastapi import APIRouter, HTTPException, status, Depends
from app.schemas.auth import LoginRequest, TokenResponse, UserInfo
from app.auth.jwt_auth import DEMO_ANALYSTS, create_access_token, require_auth, get_current_analyst
from app.config import settings

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest):
    """
    Authenticate an analyst/admin user and return a JWT Bearer token.
    Default credentials for demo:
    - Email: analyst@riskos.ai | Password: analyst_demo_secret_2026
    - Email: priya@riskos.ai   | Password: analyst_demo_secret_2026
    - Email: admin@riskos.ai   | Password: admin_demo_secret_2026
    """
    user_data = DEMO_ANALYSTS.get(payload.email.lower())
    if not user_data:
        # Also allow matching by username prefix
        for email, u in DEMO_ANALYSTS.items():
            if email.startswith(payload.email.lower()):
                user_data = u
                payload.email = email
                break

    if not user_data or payload.password != user_data["password"]:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = create_access_token({
        "sub": payload.email,
        "name": user_data["name"],
        "role": user_data["role"],
    })

    return TokenResponse(
        access_token=token,
        token_type="bearer",
        expires_in_minutes=settings.jwt_expire_minutes,
        user=UserInfo(
            name=user_data["name"],
            email=payload.email,
            role=user_data["role"],
        ),
    )


@router.get("/me")
def get_current_user_profile(user: dict = Depends(require_auth)):
    """Return currently authenticated analyst profile (protected route)."""
    return {
        "authenticated": True,
        "user": user,
    }