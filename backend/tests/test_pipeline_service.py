"""Tests for pipeline service — validate and discover via API endpoints."""

import json

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_create_pipeline_and_validate(client: AsyncClient) -> None:
    # Create connections
    src = await client.post("/api/v1/connections/", json={
        "name": "Test Source", "type": "sqlserver",
        "description": "test", "config": {"server": "localhost"},
    })
    dst = await client.post("/api/v1/connections/", json={
        "name": "Test Dest", "type": "sqlserver",
        "description": "test", "config": {"server": "localhost"},
    })
    src_id = src.json()["id"]
    dst_id = dst.json()["id"]

    # Create pipeline
    resp = await client.post("/api/v1/pipelines/", json={
        "name": "Test Pipeline", "description": "test",
        "source_connection_id": src_id, "dest_connection_id": dst_id,
    })
    assert resp.status_code == 200
    pipeline_id = resp.json()["id"]

    # Validate with no mappings — should fail
    resp = await client.post(f"/api/v1/pipelines/{pipeline_id}/validate")
    assert resp.status_code == 200
    data = resp.json()
    assert data["valid"] is False
    assert data["summary"]["fail"] >= 1

    # Add a mapping
    resp = await client.post(f"/api/v1/pipelines/{pipeline_id}/mappings", json={
        "source_entity": "accounts",
        "dest_table": "Accounts",
        "mapping_config": json.dumps({"columns": {"id": "Id", "name": "Name"}, "load_strategy": "replace"}),
        "transform_type": "column_map",
    })
    assert resp.status_code == 200

    # Validate again — should pass
    resp = await client.post(f"/api/v1/pipelines/{pipeline_id}/validate")
    data = resp.json()
    assert data["valid"] is True
    assert data["summary"]["fail"] == 0
    assert len(data["mappings"]) == 1
    assert data["mappings"][0]["source_entity"] == "accounts"


@pytest.mark.asyncio
async def test_get_pipeline_returns_mappings(client: AsyncClient) -> None:
    # Create connections + pipeline
    src = await client.post("/api/v1/connections/", json={
        "name": "Src2", "type": "postgresql", "description": "", "config": {},
    })
    dst = await client.post("/api/v1/connections/", json={
        "name": "Dst2", "type": "postgresql", "description": "", "config": {},
    })
    pipe = await client.post("/api/v1/pipelines/", json={
        "name": "Pipe2", "description": "",
        "source_connection_id": src.json()["id"],
        "dest_connection_id": dst.json()["id"],
    })
    pid = pipe.json()["id"]

    # Add mapping
    await client.post(f"/api/v1/pipelines/{pid}/mappings", json={
        "source_entity": "users", "dest_table": "Users",
    })

    # Get pipeline detail
    resp = await client.get(f"/api/v1/pipelines/{pid}")
    assert resp.status_code == 200
    data = resp.json()
    assert data["pipeline"]["name"] == "Pipe2"
    assert len(data["mappings"]) == 1
    assert data["mappings"][0]["source_entity"] == "users"


@pytest.mark.asyncio
async def test_discover_with_no_connector_returns_empty(client: AsyncClient) -> None:
    src = await client.post("/api/v1/connections/", json={
        "name": "Unknown", "type": "unknown_type", "description": "", "config": {},
    })
    dst = await client.post("/api/v1/connections/", json={
        "name": "Dst3", "type": "unknown_type", "description": "", "config": {},
    })
    pipe = await client.post("/api/v1/pipelines/", json={
        "name": "Pipe3", "description": "",
        "source_connection_id": src.json()["id"],
        "dest_connection_id": dst.json()["id"],
    })
    pid = pipe.json()["id"]

    resp = await client.get(f"/api/v1/pipelines/{pid}/discover?side=source")
    assert resp.status_code == 200
    data = resp.json()
    assert data["entities"] == []


@pytest.mark.asyncio
async def test_pipeline_settings(client: AsyncClient) -> None:
    src = await client.post("/api/v1/connections/", json={
        "name": "S4", "type": "sqlserver", "description": "", "config": {},
    })
    dst = await client.post("/api/v1/connections/", json={
        "name": "D4", "type": "sqlserver", "description": "", "config": {},
    })
    pipe = await client.post("/api/v1/pipelines/", json={
        "name": "Pipe4", "description": "",
        "source_connection_id": src.json()["id"],
        "dest_connection_id": dst.json()["id"],
    })
    pid = pipe.json()["id"]

    resp = await client.put(f"/api/v1/pipelines/{pid}/settings", json={
        "batch_size": 500, "track_fks": False,
    })
    assert resp.status_code == 200
    assert resp.json()["success"] is True
