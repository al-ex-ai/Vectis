"""Tests for role enforcement — viewer blocked from mutations, editor allowed, unauthenticated blocked."""

import pytest
from httpx import AsyncClient


async def _create_user_with_role(client: AsyncClient, role: str) -> None:
    """Create a user with a specific role and login as them."""
    from sqlalchemy import select

    from vectis.core.security import hash_password
    from vectis.db.engine import Base, async_session, engine

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    email = f"{role}@roles.dev"
    async with async_session() as session:
        from vectis.models.organization import Organization
        from vectis.models.user import User

        org = (await session.execute(select(Organization).where(Organization.slug == "roles-test"))).scalar_one_or_none()
        if not org:
            org = Organization(name="Roles Test", slug="roles-test")
            session.add(org)
            await session.flush()

        existing = (await session.execute(select(User).where(User.email == email))).scalar_one_or_none()
        if not existing:
            session.add(User(
                org_id=org.id, email=email,
                hashed_password=hash_password("pass1234"),
                name=f"Test {role.title()}", role=role,
            ))
            await session.commit()

    resp = await client.post("/api/v1/auth/login", json={"email": email, "password": "pass1234"})
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_viewer_can_read_projects(raw_client: AsyncClient) -> None:
    await _create_user_with_role(raw_client, "viewer")
    resp = await raw_client.get("/api/v1/projects/")
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_viewer_cannot_create_project(raw_client: AsyncClient) -> None:
    await _create_user_with_role(raw_client, "viewer")
    resp = await raw_client.post("/api/v1/projects/", json={"name": "Blocked", "description": ""})
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_viewer_cannot_create_connection(raw_client: AsyncClient) -> None:
    await _create_user_with_role(raw_client, "viewer")
    resp = await raw_client.post("/api/v1/connections/", json={
        "name": "Blocked", "type": "postgresql", "description": "", "config": {},
    })
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_viewer_cannot_create_schedule(raw_client: AsyncClient) -> None:
    await _create_user_with_role(raw_client, "viewer")
    resp = await raw_client.post("/api/v1/schedules/", json={
        "name": "Blocked", "target_type": "pipeline", "pipeline_id": 1, "cron_expression": "0 0 * * *",
    })
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_editor_can_create_project(raw_client: AsyncClient) -> None:
    await _create_user_with_role(raw_client, "editor")
    resp = await raw_client.post("/api/v1/projects/", json={"name": "Editor Project", "description": ""})
    assert resp.status_code == 200
    assert resp.json()["name"] == "Editor Project"


@pytest.mark.asyncio
async def test_editor_cannot_invite(raw_client: AsyncClient) -> None:
    await _create_user_with_role(raw_client, "editor")
    resp = await raw_client.post("/api/v1/auth/invite", json={"email": "x@test.dev", "role": "viewer"})
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_unauthenticated_blocked(raw_client: AsyncClient) -> None:
    resp = await raw_client.get("/api/v1/projects/")
    assert resp.status_code == 401

    resp = await raw_client.get("/api/v1/connections/")
    assert resp.status_code == 401

    resp = await raw_client.get("/api/v1/pipelines/")
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_health_is_public(raw_client: AsyncClient) -> None:
    resp = await raw_client.get("/api/v1/health")
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_password_validation(raw_client: AsyncClient) -> None:
    await _create_user_with_role(raw_client, "owner")

    # Create invite
    resp = await raw_client.post("/api/v1/auth/invite", json={"email": "weak@roles.dev", "role": "editor"})
    assert resp.status_code == 200
    token = resp.json()["invite_token"]

    # Try short password
    resp = await raw_client.post("/api/v1/auth/register", json={
        "email": "weak@roles.dev", "password": "short", "name": "Weak", "invite_token": token,
    })
    assert resp.status_code == 422  # Pydantic validation error
