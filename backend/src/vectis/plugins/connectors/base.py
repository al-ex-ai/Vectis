"""Base interface for source connectors (CRM, API, etc.)."""

from abc import ABC, abstractmethod
from collections.abc import AsyncIterator
from dataclasses import dataclass


@dataclass
class Entity:
    name: str
    display_name: str
    entity_set_name: str | None = None
    primary_id: str | None = None
    is_custom: bool = False
    is_intersect: bool = False


@dataclass
class Attribute:
    name: str
    display_name: str
    type: str
    required: bool = False
    nullable: bool = True
    max_length: int | None = None
    is_primary_id: bool = False


class SourceConnector(ABC):
    """Interface that all source connectors must implement."""

    source_category: str = "api"
    """'api' for CRM/REST sources (Dynamics, Salesforce), 'sql' for database sources."""

    @abstractmethod
    async def test_connection(self) -> bool:
        """Verify the connection is valid."""
        ...

    @abstractmethod
    async def discover_entities(self) -> list[Entity]:
        """List all available entities/tables in the source."""
        ...

    @abstractmethod
    async def discover_attributes(self, entity_name: str) -> list[Attribute]:
        """List all attributes/columns for a given entity."""
        ...

    @abstractmethod
    async def fetch_data(
        self,
        entity_name: str,
        columns: list[str] | None = None,
        page_size: int = 1000,
        offset: int = 0,
        filter_expr: str | None = None,
        entity_set_name: str | None = None,
    ) -> AsyncIterator[dict[str, object]]:
        """Fetch data from the source entity, yielding rows.

        Args:
            filter_expr: Optional filter (OData $filter for CRM, WHERE clause for SQL).
            entity_set_name: Optional override for the entity set name (CRM only).
        """
        ...

    @abstractmethod
    async def get_count(self, entity_name: str) -> int:
        """Get total record count for an entity."""
        ...
