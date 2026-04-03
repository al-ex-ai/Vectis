"""Tests for schedule CRUD operations via API endpoints."""

import pytest
from httpx import AsyncClient


async def _create_pipeline(client: AsyncClient) -> int:
    """Helper: create a minimal pipeline and return its ID."""
    src = await client.post("/api/v1/connections/", json={
        "name": "Sched Src", "type": "sqlserver", "description": "", "config": {},
    })
    dst = await client.post("/api/v1/connections/", json={
        "name": "Sched Dst", "type": "sqlserver", "description": "", "config": {},
    })
    pipe = await client.post("/api/v1/pipelines/", json={
        "name": "Sched Pipeline", "description": "",
        "source_connection_id": src.json()["id"],
        "dest_connection_id": dst.json()["id"],
    })
    return pipe.json()["id"]


@pytest.mark.asyncio
async def test_schedule_crud(client: AsyncClient) -> None:
    pipeline_id = await _create_pipeline(client)

    # Create
    resp = await client.post("/api/v1/schedules/", json={
        "name": "Daily Sync",
        "description": "Runs every day at midnight",
        "target_type": "pipeline",
        "pipeline_id": pipeline_id,
        "cron_expression": "0 0 * * *",
        "timezone": "UTC",
        "enabled": True,
        "overlap_policy": "skip",
    })
    assert resp.status_code == 200
    data = resp.json()
    assert data["name"] == "Daily Sync"
    assert data["target_type"] == "pipeline"
    assert data["pipeline_id"] == pipeline_id
    assert data["enabled"] is True
    assert data["cron_expression"] == "0 0 * * *"
    schedule_id = data["id"]

    # Get
    resp = await client.get(f"/api/v1/schedules/{schedule_id}")
    assert resp.status_code == 200
    assert resp.json()["name"] == "Daily Sync"
    assert resp.json()["pipeline_name"] == "Sched Pipeline"

    # List
    resp = await client.get("/api/v1/schedules/")
    assert resp.status_code == 200
    schedules = resp.json()
    assert any(s["id"] == schedule_id for s in schedules)

    # Update
    resp = await client.put(f"/api/v1/schedules/{schedule_id}", json={
        "description": "Updated description",
        "cron_expression": "0 6 * * *",
    })
    assert resp.status_code == 200
    assert resp.json()["description"] == "Updated description"
    assert resp.json()["cron_expression"] == "0 6 * * *"

    # Pause
    resp = await client.post(f"/api/v1/schedules/{schedule_id}/pause")
    assert resp.status_code == 200
    assert resp.json()["enabled"] is False

    # Resume
    resp = await client.post(f"/api/v1/schedules/{schedule_id}/resume")
    assert resp.status_code == 200
    assert resp.json()["enabled"] is True

    # Delete
    resp = await client.delete(f"/api/v1/schedules/{schedule_id}")
    assert resp.status_code == 200
    assert resp.json()["success"] is True

    # Verify deleted
    resp = await client.get(f"/api/v1/schedules/{schedule_id}")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_schedule_validation(client: AsyncClient) -> None:
    # Missing pipeline_id for pipeline target
    resp = await client.post("/api/v1/schedules/", json={
        "name": "Bad Schedule",
        "target_type": "pipeline",
        "cron_expression": "0 0 * * *",
    })
    assert resp.status_code == 400

    # Invalid target_type
    resp = await client.post("/api/v1/schedules/", json={
        "name": "Bad Schedule",
        "target_type": "invalid",
        "cron_expression": "0 0 * * *",
    })
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_schedule_filter_by_target_type(client: AsyncClient) -> None:
    pipeline_id = await _create_pipeline(client)

    await client.post("/api/v1/schedules/", json={
        "name": "Pipeline Schedule",
        "target_type": "pipeline",
        "pipeline_id": pipeline_id,
        "cron_expression": "0 0 * * *",
    })

    resp = await client.get("/api/v1/schedules/?target_type=pipeline")
    assert resp.status_code == 200
    assert all(s["target_type"] == "pipeline" for s in resp.json())

    resp = await client.get("/api/v1/schedules/?target_type=flow")
    assert resp.status_code == 200
    # May be empty, but should not include pipeline schedules
    assert all(s["target_type"] == "flow" for s in resp.json())
