"""Tests for auth — login, register, me, invite, role enforcement."""

import pytest
from httpx import AsyncClient


async def _seed_org_and_user(client: AsyncClient) -> dict[str, object]:
    """Seed an org + owner user and login."""
    from sqlalchemy import select

    from vectis.core.security import hash_password
    from vectis.db.engine import Base, async_session, engine

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with async_session() as session:
        from vectis.models.organization import Organization
        from vectis.models.user import User

        existing = (await session.execute(select(Organization).where(Organization.slug == "auth-test"))).scalar_one_or_none()
        if not existing:
            org = Organization(name="Auth Test Org", slug="auth-test")
            session.add(org)
            await session.flush()
            user = User(
                org_id=org.id, email="owner@auth.dev",
                hashed_password=hash_password("password123"),
                name="Auth Owner", role="owner",
            )
            session.add(user)
            await session.commit()
            org_id = org.id
            user_id = user.id
        else:
            org_id = existing.id
            from vectis.models.user import User

            user_result = (await session.execute(select(User).where(User.email == "owner@auth.dev"))).scalar_one()
            user_id = user_result.id

    resp = await client.post("/api/v1/auth/login", json={
        "email": "owner@auth.dev", "password": "password123",
    })
    assert resp.status_code == 200
    return {"org_id": org_id, "user_id": user_id}


@pytest.mark.asyncio
async def test_login_success(raw_client: AsyncClient) -> None:
    await _seed_org_and_user(raw_client)

    resp = await raw_client.post("/api/v1/auth/login", json={
        "email": "owner@auth.dev", "password": "password123",
    })
    assert resp.status_code == 200
    data = resp.json()
    assert data["user"]["email"] == "owner@auth.dev"
    assert data["user"]["role"] == "owner"
    assert "token" in data


@pytest.mark.asyncio
async def test_login_wrong_password(raw_client: AsyncClient) -> None:
    await _seed_org_and_user(raw_client)

    resp = await raw_client.post("/api/v1/auth/login", json={
        "email": "owner@auth.dev", "password": "wrong",
    })
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_me_authenticated(raw_client: AsyncClient) -> None:
    await _seed_org_and_user(raw_client)

    resp = await raw_client.get("/api/v1/auth/me")
    assert resp.status_code == 200
    data = resp.json()
    assert data["user"]["email"] == "owner@auth.dev"
    assert data["organization"]["slug"] == "auth-test"


@pytest.mark.asyncio
async def test_me_unauthenticated(raw_client: AsyncClient) -> None:
    resp = await raw_client.get("/api/v1/auth/me")
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_logout(raw_client: AsyncClient) -> None:
    await _seed_org_and_user(raw_client)

    resp = await raw_client.post("/api/v1/auth/logout")
    assert resp.status_code == 200

    resp = await raw_client.get("/api/v1/auth/me")
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_invite_and_register(raw_client: AsyncClient) -> None:
    await _seed_org_and_user(raw_client)

    resp = await raw_client.post("/api/v1/auth/invite", json={
        "email": "editor@auth.dev", "role": "editor",
    })
    assert resp.status_code == 200
    invite_token = resp.json()["invite_token"]

    resp = await raw_client.post("/api/v1/auth/register", json={
        "email": "editor@auth.dev", "password": "newpass123",
        "name": "New Editor", "invite_token": invite_token,
    })
    assert resp.status_code == 200
    assert resp.json()["user"]["email"] == "editor@auth.dev"
    assert resp.json()["user"]["role"] == "editor"


@pytest.mark.asyncio
async def test_register_without_invite_fails(raw_client: AsyncClient) -> None:
    resp = await raw_client.post("/api/v1/auth/register", json={
        "email": "rando@auth.dev", "password": "pass12345",
        "name": "Random", "invite_token": "invalid-token",
    })
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_list_users(raw_client: AsyncClient) -> None:
    await _seed_org_and_user(raw_client)

    resp = await raw_client.get("/api/v1/auth/users")
    assert resp.status_code == 200
    users = resp.json()
    assert len(users) >= 1
    assert any(u["email"] == "owner@auth.dev" for u in users)


@pytest.mark.asyncio
async def test_viewer_cannot_invite(raw_client: AsyncClient) -> None:
    await _seed_org_and_user(raw_client)

    resp = await raw_client.post("/api/v1/auth/invite", json={
        "email": "viewer@auth.dev", "role": "viewer",
    })
    invite_token = resp.json()["invite_token"]

    await raw_client.post("/api/v1/auth/register", json={
        "email": "viewer@auth.dev", "password": "viewpass",
        "name": "Viewer", "invite_token": invite_token,
    })

    await raw_client.post("/api/v1/auth/login", json={
        "email": "viewer@auth.dev", "password": "viewpass",
    })

    resp = await raw_client.post("/api/v1/auth/invite", json={
        "email": "another@auth.dev", "role": "editor",
    })
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_update_user_role(raw_client: AsyncClient) -> None:
    await _seed_org_and_user(raw_client)

    resp = await raw_client.post("/api/v1/auth/invite", json={
        "email": "editor2@auth.dev", "role": "editor",
    })
    invite_token = resp.json()["invite_token"]

    resp = await raw_client.post("/api/v1/auth/register", json={
        "email": "editor2@auth.dev", "password": "pass12345",
        "name": "Editor 2", "invite_token": invite_token,
    })
    editor_id = resp.json()["user"]["id"]

    await raw_client.post("/api/v1/auth/login", json={
        "email": "owner@auth.dev", "password": "password123",
    })

    resp = await raw_client.put(f"/api/v1/auth/users/{editor_id}", json={"role": "admin"})
    assert resp.status_code == 200
    assert resp.json()["role"] == "admin"
