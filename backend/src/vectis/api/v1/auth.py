from fastapi import APIRouter, Depends, Request, Response
from sqlalchemy.ext.asyncio import AsyncSession

from vectis.core.security import (
    COOKIE_NAME,
    create_access_token,
    decode_token,
    get_current_user,
    require_role,
)
from vectis.db.engine import get_session
from vectis.models.user import User
from vectis.schemas.auth import (
    InviteRequest,
    InviteResponse,
    LoginRequest,
    LoginResponse,
    MeResponse,
    RegisterRequest,
    UserResponse,
    UserUpdate,
)
from vectis.schemas.common import SuccessResponse
from vectis.services.auth_service import AuthService

router = APIRouter(prefix="/auth", tags=["auth"])


async def get_service(session: AsyncSession = Depends(get_session)) -> AuthService:
    return AuthService(session)


@router.post("/login", response_model=LoginResponse)
async def login(
    data: LoginRequest,
    response: Response,
    service: AuthService = Depends(get_service),
) -> LoginResponse:
    user, token = await service.login(data)
    response.set_cookie(
        key=COOKIE_NAME,
        value=token,
        httponly=True,
        samesite="lax",
        path="/",
        max_age=3600,
    )
    return LoginResponse(user=UserResponse.model_validate(user), token=token)


@router.post("/register", response_model=LoginResponse)
async def register(
    data: RegisterRequest,
    response: Response,
    service: AuthService = Depends(get_service),
) -> LoginResponse:
    user = await service.register(data)
    token = create_access_token(user.id, user.org_id)
    response.set_cookie(
        key=COOKIE_NAME,
        value=token,
        httponly=True,
        samesite="lax",
        path="/",
        max_age=3600,
    )
    return LoginResponse(user=UserResponse.model_validate(user), token=token)


@router.post("/logout", response_model=SuccessResponse)
async def logout(response: Response) -> SuccessResponse:
    response.delete_cookie(key=COOKIE_NAME, path="/")
    return SuccessResponse()


@router.get("/me", response_model=MeResponse)
async def get_me(
    request: Request,
    response: Response,
    user: User = Depends(get_current_user),
    service: AuthService = Depends(get_service),
) -> MeResponse:
    # Sliding window: refresh token if past half its lifetime
    from datetime import UTC, datetime

    from vectis.core.config import settings

    token = request.cookies.get(COOKIE_NAME, "")
    try:
        payload = decode_token(token)
        exp = datetime.fromtimestamp(float(payload.get("exp", 0)), tz=UTC)  # type: ignore[arg-type]
        remaining = (exp - datetime.now(UTC)).total_seconds()
        half_life = (settings.access_token_expire_minutes * 60) / 2
        if remaining < half_life:
            new_token = create_access_token(user.id, user.org_id)
            response.set_cookie(key=COOKIE_NAME, value=new_token, httponly=True, samesite="lax", path="/", max_age=settings.access_token_expire_minutes * 60)
    except Exception:
        pass

    return await service.get_me(user)


@router.post("/invite", response_model=InviteResponse)
async def create_invite(
    data: InviteRequest,
    user: User = Depends(require_role("owner", "admin")),
    service: AuthService = Depends(get_service),
) -> InviteResponse:
    return await service.create_invite(data, user)


@router.get("/users", response_model=list[UserResponse])
async def list_users(
    user: User = Depends(require_role("owner", "admin")),
    service: AuthService = Depends(get_service),
) -> list[UserResponse]:
    return await service.list_users(user.org_id)


@router.put("/users/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: int,
    data: UserUpdate,
    user: User = Depends(require_role("owner", "admin")),
    service: AuthService = Depends(get_service),
) -> UserResponse:
    return await service.update_user(user_id, data, user)
