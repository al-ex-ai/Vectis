from fastapi import APIRouter
from pydantic import BaseModel

from vectis import __version__
from vectis.core.config import settings

router = APIRouter(tags=["health"])


class HealthResponse(BaseModel):
    status: str
    version: str
    demo_mode: bool
    demo_email: str = ""
    demo_password: str = ""


@router.get("/health", response_model=HealthResponse)
async def health_check() -> HealthResponse:
    return HealthResponse(
        status="ok",
        version=__version__,
        demo_mode=settings.demo_mode,
        demo_email=settings.demo_email,
        demo_password=settings.demo_password,
    )
