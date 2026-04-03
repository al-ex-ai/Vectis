import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_create_and_list_projects(client: AsyncClient) -> None:
    # Create a project
    response = await client.post(
        "/api/v1/projects/",
        json={"name": "Test Project", "description": "A test project"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Test Project"
    assert "id" in data

    # List projects
    response = await client.get("/api/v1/projects/")
    assert response.status_code == 200
    projects = response.json()
    assert len(projects) >= 1
    assert any(p["name"] == "Test Project" for p in projects)
