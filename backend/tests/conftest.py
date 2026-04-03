import os

# Override BEFORE any vectis imports — settings are read at import time
os.environ["VECTIS_DEBUG"] = "true"
os.environ["VECTIS_DATABASE_URL"] = "sqlite+aiosqlite:///file:testdb?mode=memory&cache=shared&uri=true"
os.environ["VECTIS_DEMO_MODE"] = "false"

import pytest_asyncio
from httpx import ASGITransport, AsyncClient

# Now safe to import vectis modules (they'll pick up SQLite URL)
from vectis.db.engine import Base, engine


@pytest_asyncio.fixture
async def client() -> AsyncClient:  # type: ignore[misc]
    # Create tables fresh for each test
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # Import app lazily so seed_demo_data doesn't run during fixture setup
    from vectis.app import app

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # Seed a default org + user and login so all routes are accessible
        await _ensure_auth(ac)
        yield ac

    # Clean up
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest_asyncio.fixture
async def raw_client() -> AsyncClient:  # type: ignore[misc]
    """Client without auto-login — for testing auth endpoints directly."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    from vectis.app import app

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


async def _ensure_auth(client: AsyncClient) -> None:
    """Create a test org + owner user and login, setting the auth cookie on the client."""
    from sqlalchemy import select

    from vectis.core.security import hash_password
    from vectis.db.engine import async_session
    from vectis.models.organization import Organization
    from vectis.models.user import User

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with async_session() as session:
        existing = (await session.execute(select(Organization).where(Organization.slug == "test-org"))).scalar_one_or_none()
        if not existing:
            org = Organization(name="Test Org", slug="test-org")
            session.add(org)
            await session.flush()
            user = User(
                org_id=org.id, email="test@test.dev",
                hashed_password=hash_password("testpass"),
                name="Test User", role="owner",
            )
            session.add(user)
            await session.commit()

    resp = await client.post("/api/v1/auth/login", json={
        "email": "test@test.dev", "password": "testpass",
    })
    assert resp.status_code == 200, f"Auth setup failed: {resp.text}"
