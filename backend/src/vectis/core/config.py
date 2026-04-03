import secrets
import warnings

from pydantic_settings import BaseSettings

_DEFAULT_SECRET = "change-me-in-production"


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    app_name: str = "Vectis"
    debug: bool = False

    # Database
    database_url: str = "sqlite+aiosqlite:///./vectis.db"

    # Auth
    secret_key: str = _DEFAULT_SECRET
    access_token_expire_minutes: int = 60
    algorithm: str = "HS256"

    # Server
    host: str = "127.0.0.1"
    port: int = 8000
    workers: int = 1

    # Demo mode — read-only, blocks all POST/PUT/DELETE except health
    demo_mode: bool = False
    demo_email: str = ""
    demo_password: str = ""

    model_config = {"env_prefix": "VECTIS_", "env_file": ".env", "extra": "ignore"}


settings = Settings()

if settings.secret_key == _DEFAULT_SECRET:
    if settings.debug:
        settings.secret_key = secrets.token_urlsafe(32)
        warnings.warn(
            "VECTIS_SECRET_KEY not set — using random key (sessions won't survive restarts)",
            stacklevel=1,
        )
    else:
        raise RuntimeError(
            "VECTIS_SECRET_KEY must be set in production (VECTIS_DEBUG=false)"
        )
