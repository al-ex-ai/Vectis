"""Dynamics 365 CRM connector — built-in plugin with real OAuth2 + OData implementation."""

import time
from collections.abc import AsyncIterator

import httpx

from vectis.plugins.connectors.base import Attribute, Entity, SourceConnector
from vectis.plugins.registry import PluginInfo, registry

# Token cache: {key: {"access_token": ..., "expires_at": ...}}
_token_cache: dict[str, dict[str, object]] = {}

_ODATA_HEADERS = {
    "OData-MaxVersion": "4.0",
    "OData-Version": "4.0",
    "Accept": "application/json",
}


class Dynamics365Connector(SourceConnector):
    """Connects to Dynamics 365 CRM via OData v4 API with OAuth2 client credentials."""

    def __init__(self, config: dict[str, str]) -> None:
        self.base_url = config.get("base_url", "").rstrip("/")
        self.api_version = config.get("api_version", "v9.2")
        self.tenant_id = config.get("tenant_id", "")
        self.client_id = config.get("client_id", "")
        self.client_secret = config.get("client_secret", "")

    async def _get_token(self) -> str:
        """Acquire OAuth2 token using client credentials flow."""
        cache_key = f"{self.tenant_id}:{self.client_id}"
        cached = _token_cache.get(cache_key)
        if cached and float(str(cached["expires_at"])) > time.time() + 60:
            return str(cached["access_token"])

        token_url = f"https://login.microsoftonline.com/{self.tenant_id}/oauth2/v2.0/token"
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                token_url,
                data={
                    "grant_type": "client_credentials",
                    "client_id": self.client_id,
                    "client_secret": self.client_secret,
                    "scope": f"{self.base_url}/.default",
                },
                timeout=30,
            )
        if resp.status_code != 200:
            msg = f"Token request failed ({resp.status_code}): {resp.text[:500]}"
            raise ConnectionError(msg)
        data = resp.json()

        _token_cache[cache_key] = {
            "access_token": data["access_token"],
            "expires_at": time.time() + data.get("expires_in", 3600),
        }
        return str(data["access_token"])

    async def _api_get(self, path: str, params: dict[str, str] | None = None) -> dict[str, object]:
        """Make authenticated GET request to Dataverse Web API."""
        token = await self._get_token()
        url = f"{self.base_url}/api/data/{self.api_version}/{path}"
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                url,
                params=params,
                headers={
                    **_ODATA_HEADERS,
                    "Authorization": f"Bearer {token}",
                    "Prefer": "odata.include-annotations=*",
                },
                timeout=60,
            )
        resp.raise_for_status()
        return resp.json()

    async def test_connection(self) -> bool:
        """Test OAuth2 auth and WhoAmI endpoint."""
        if not self.base_url or not self.client_id or not self.tenant_id:
            return False
        try:
            cache_key = f"{self.tenant_id}:{self.client_id}"
            _token_cache.pop(cache_key, None)
            await self._api_get("WhoAmI")
            return True
        except Exception:
            return False

    async def discover_entities(self) -> list[Entity]:
        """Discover all entities in the Dataverse environment."""
        data = await self._api_get(
            "EntityDefinitions",
            params={
                "$select": "LogicalName,DisplayName,EntitySetName,PrimaryIdAttribute,PrimaryNameAttribute,IsCustomEntity,IsPrivate,IsIntersect",
            },
        )

        raw = [e for e in data.get("value", []) if not e.get("IsPrivate")]
        raw.sort(key=lambda e: e.get("LogicalName", ""))

        entities = []
        for ed in raw:
            display_name = ""
            dn = ed.get("DisplayName", {})
            if dn and isinstance(dn, dict) and dn.get("UserLocalizedLabel"):
                display_name = dn["UserLocalizedLabel"].get("Label", "")

            entities.append(Entity(
                name=ed["LogicalName"],
                display_name=display_name or ed["LogicalName"],
                entity_set_name=ed.get("EntitySetName", ""),
                primary_id=ed.get("PrimaryIdAttribute", ""),
                is_custom=ed.get("IsCustomEntity", False),
                is_intersect=ed.get("IsIntersect", False),
            ))

        return entities

    async def discover_attributes(self, entity_name: str) -> list[Attribute]:
        """Get detailed attributes for a specific entity."""
        attr_data = await self._api_get(
            f"EntityDefinitions(LogicalName='{entity_name}')/Attributes",
        )

        raw_attrs = [a for a in attr_data.get("value", []) if a.get("IsValidForRead", True)]
        raw_attrs.sort(key=lambda a: a.get("LogicalName", ""))

        attributes = []
        for attr in raw_attrs:
            display_name = ""
            dn = attr.get("DisplayName", {})
            if dn and isinstance(dn, dict) and dn.get("UserLocalizedLabel"):
                display_name = dn["UserLocalizedLabel"].get("Label", "")

            attributes.append(Attribute(
                name=attr["LogicalName"],
                display_name=display_name or attr["LogicalName"],
                type=attr.get("AttributeType", "Unknown"),
                required=attr.get("RequiredLevel", {}).get("Value", "None") != "None",
                max_length=attr.get("MaxLength"),
                is_primary_id=attr.get("IsPrimaryId", False),
            ))

        return attributes

    async def fetch_data(
        self,
        entity_name: str,
        columns: list[str] | None = None,
        page_size: int = 1000,
        offset: int = 0,
        filter_expr: str | None = None,
        entity_set_name: str | None = None,
    ) -> AsyncIterator[dict[str, object]]:
        """Fetch data from a CRM entity with OData pagination."""
        if entity_set_name:
            entity_set = entity_set_name
        else:
            ed = await self._api_get(
                f"EntityDefinitions(LogicalName='{entity_name}')",
                params={"$select": "EntitySetName"},
            )
            entity_set = ed.get("EntitySetName", entity_name + "s")

        params: dict[str, str] = {}
        if columns:
            params["$select"] = ",".join(columns)
        if filter_expr:
            params["$filter"] = filter_expr

        token = await self._get_token()
        url = f"{self.base_url}/api/data/{self.api_version}/{entity_set}"
        next_link: str | None = url

        async with httpx.AsyncClient() as client:
            while next_link:
                resp = await client.get(
                    next_link,
                    params=params if next_link == url else None,
                    headers={
                        **_ODATA_HEADERS,
                        "Authorization": f"Bearer {token}",
                        "Prefer": f"odata.maxpagesize={page_size}",
                    },
                    timeout=120,
                )
                resp.raise_for_status()
                data = resp.json()

                for record in data.get("value", []):
                    clean: dict[str, object] = {
                        k: v for k, v in record.items()
                        if not k.startswith("@") and not k.startswith("_")
                    }
                    for k, v in record.items():
                        if k.startswith("_") and k.endswith("_value") and v is not None:
                            clean[k[1:-6]] = v
                    yield clean

                next_link = data.get("@odata.nextLink")
                params = {}

    async def get_count(self, entity_name: str) -> int:
        """Get total record count for an entity."""
        try:
            ed = await self._api_get(
                f"EntityDefinitions(LogicalName='{entity_name}')",
                params={"$select": "EntitySetName"},
            )
            entity_set = ed.get("EntitySetName", entity_name + "s")

            token = await self._get_token()
            url = f"{self.base_url}/api/data/{self.api_version}/{entity_set}"
            async with httpx.AsyncClient() as client:
                resp = await client.get(
                    url,
                    params={"$count": "true", "$top": "1"},
                    headers={
                        **_ODATA_HEADERS,
                        "Authorization": f"Bearer {token}",
                    },
                    timeout=30,
                )
            resp.raise_for_status()
            count = resp.json().get("@odata.count")
            return int(count) if count is not None else -1
        except Exception:
            return -1


# Register with the global registry
registry.register_connector(
    PluginInfo(
        name="Dynamics 365",
        type="connector",
        description="Connect to Microsoft Dynamics 365 CRM via OData v4 API. Supports entity discovery, attribute metadata, filtered data extraction, and lookup field resolution.",
        version="0.1.0",
        author="Vectis",
        connection_types=["dynamics_crm"],
        config_schema={
            "base_url": {"type": "string", "required": True, "placeholder": "https://org.api.crm.dynamics.com"},
            "api_version": {"type": "string", "default": "v9.2"},
            "tenant_id": {"type": "string", "required": True},
            "client_id": {"type": "string", "required": True},
            "client_secret": {"type": "string", "required": True, "secret": True},
        },
        builtin=True,
    ),
    Dynamics365Connector,
)
