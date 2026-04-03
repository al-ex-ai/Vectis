from datetime import datetime

from pydantic import BaseModel, ConfigDict, field_validator


class LoginRequest(BaseModel):
    email: str
    password: str


class RegisterRequest(BaseModel):
    email: str
    password: str
    name: str
    invite_token: str

    @field_validator("password")
    @classmethod
    def _password_min_length(cls, v: str) -> str:
        if len(v) < 8:
            msg = "Password must be at least 8 characters"
            raise ValueError(msg)
        return v

    @field_validator("name")
    @classmethod
    def _name_not_empty(cls, v: str) -> str:
        if not v.strip():
            msg = "Name is required"
            raise ValueError(msg)
        return v.strip()


class InviteRequest(BaseModel):
    email: str
    role: str = "editor"


class InviteResponse(BaseModel):
    invite_token: str
    email: str
    role: str


class UserUpdate(BaseModel):
    name: str | None = None
    role: str | None = None
    is_active: bool | None = None


class LoginResponse(BaseModel):
    user: "UserResponse"
    token: str


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    org_id: int
    email: str
    name: str
    role: str
    is_active: bool
    created_at: datetime
    updated_at: datetime | None = None


class OrganizationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    slug: str
    created_at: datetime


class MeResponse(BaseModel):
    user: UserResponse
    organization: OrganizationResponse
