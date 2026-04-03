from fastapi import APIRouter, Depends
from pydantic import BaseModel

from vectis.core.security import get_current_user
from vectis.plugins.registry import registry

router = APIRouter(prefix="/plugins", tags=["plugins"], dependencies=[Depends(get_current_user)])


class PluginResponse(BaseModel):
    name: str
    type: str
    description: str
    version: str
    author: str
    connection_types: list[str]
    config_schema: dict[str, object]
    builtin: bool


@router.get("/", response_model=list[PluginResponse])
async def list_plugins() -> list[PluginResponse]:
    return [
        PluginResponse(
            name=p.name,
            type=p.type,
            description=p.description,
            version=p.version,
            author=p.author,
            connection_types=p.connection_types,
            config_schema=p.config_schema,
            builtin=p.builtin,
        )
        for p in registry.list_all()
    ]


@router.get("/connectors", response_model=list[PluginResponse])
async def list_connectors() -> list[PluginResponse]:
    return [
        PluginResponse(
            name=p.name,
            type=p.type,
            description=p.description,
            version=p.version,
            author=p.author,
            connection_types=p.connection_types,
            config_schema=p.config_schema,
            builtin=p.builtin,
        )
        for p in registry.list_connectors()
    ]


@router.get("/providers", response_model=list[PluginResponse])
async def list_providers() -> list[PluginResponse]:
    return [
        PluginResponse(
            name=p.name,
            type=p.type,
            description=p.description,
            version=p.version,
            author=p.author,
            connection_types=p.connection_types,
            config_schema=p.config_schema,
            builtin=p.builtin,
        )
        for p in registry.list_providers()
    ]
