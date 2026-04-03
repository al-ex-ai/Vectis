"""Auth service — login, register, invite, user management."""

import logging
from datetime import UTC, datetime, timedelta

from fastapi import HTTPException
from jose import JWTError, jwt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from vectis.core.config import settings
from vectis.core.security import hash_password, verify_password
from vectis.models.organization import Organization
from vectis.models.user import User
from vectis.schemas.auth import (
    InviteRequest,
    InviteResponse,
    LoginRequest,
    MeResponse,
    OrganizationResponse,
    RegisterRequest,
    UserResponse,
    UserUpdate,
)

logger = logging.getLogger(__name__)

VALID_ROLES = {"owner", "admin", "editor", "viewer"}


class AuthService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def login(self, data: LoginRequest) -> tuple[User, str]:
        """Validate credentials, return (user, access_token)."""
        result = await self.session.execute(
            select(User).where(User.email == data.email)
        )
        user = result.scalar_one_or_none()
        if not user or not verify_password(data.password, user.hashed_password):
            raise HTTPException(status_code=401, detail="Invalid email or password")
        if not user.is_active:
            raise HTTPException(status_code=403, detail="Account is disabled")

        from vectis.core.security import create_access_token

        token = create_access_token(user.id, user.org_id)
        return user, token

    async def register(self, data: RegisterRequest) -> User:
        """Register a new user using an invite token."""
        try:
            payload = jwt.decode(data.invite_token, settings.secret_key, algorithms=[settings.algorithm])
        except JWTError as exc:
            raise HTTPException(status_code=400, detail="Invalid or expired invite token") from exc

        invite_email = payload.get("email")
        invite_role = payload.get("role", "editor")
        invite_org_id = payload.get("org")

        if invite_email and invite_email != data.email:
            raise HTTPException(status_code=400, detail="Email does not match invite")

        existing = await self.session.execute(
            select(User).where(User.email == data.email)
        )
        if existing.scalar_one_or_none():
            raise HTTPException(status_code=409, detail="Email already registered")

        user = User(
            org_id=invite_org_id,
            email=data.email,
            hashed_password=hash_password(data.password),
            name=data.name,
            role=invite_role,
        )
        self.session.add(user)
        await self.session.commit()
        await self.session.refresh(user)
        return user

    async def get_me(self, user: User) -> MeResponse:
        """Return current user with organization info."""
        result = await self.session.execute(
            select(Organization).where(Organization.id == user.org_id)
        )
        org = result.scalar_one()
        return MeResponse(
            user=UserResponse.model_validate(user),
            organization=OrganizationResponse.model_validate(org),
        )

    async def create_invite(self, data: InviteRequest, inviter: User) -> InviteResponse:
        """Generate an invite token (admin/owner only)."""
        if data.role not in VALID_ROLES:
            raise HTTPException(status_code=400, detail=f"Invalid role: {data.role}")
        if data.role == "owner":
            raise HTTPException(status_code=400, detail="Cannot invite as owner")

        expire = datetime.now(UTC) + timedelta(days=7)
        payload = {
            "email": data.email,
            "role": data.role,
            "org": inviter.org_id,
            "type": "invite",
            "exp": expire,
        }
        token = jwt.encode(payload, settings.secret_key, algorithm=settings.algorithm)
        return InviteResponse(invite_token=token, email=data.email, role=data.role)

    async def list_users(self, org_id: int) -> list[UserResponse]:
        """List all users in an organization."""
        result = await self.session.execute(
            select(User).where(User.org_id == org_id).order_by(User.created_at.desc())
        )
        return [UserResponse.model_validate(u) for u in result.scalars().all()]

    async def update_user(self, user_id: int, data: UserUpdate, actor: User) -> UserResponse:
        """Update a user (admin/owner only)."""
        result = await self.session.execute(
            select(User).where(User.id == user_id, User.org_id == actor.org_id)
        )
        user = result.scalar_one_or_none()
        if not user:
            raise HTTPException(status_code=404, detail=f"User {user_id} not found")

        if data.role is not None:
            if data.role not in VALID_ROLES:
                raise HTTPException(status_code=400, detail=f"Invalid role: {data.role}")
            if data.role == "owner" and actor.role != "owner":
                raise HTTPException(status_code=403, detail="Only owners can assign owner role")
            if user.role == "owner" and actor.role != "owner":
                raise HTTPException(status_code=403, detail="Cannot modify owner")

        for key, value in data.model_dump(exclude_unset=True).items():
            setattr(user, key, value)
        await self.session.commit()
        await self.session.refresh(user)
        return UserResponse.model_validate(user)
