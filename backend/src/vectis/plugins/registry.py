"""Plugin registry — discovers and manages connectors and providers."""

from dataclasses import dataclass, field

from vectis.plugins.connectors.base import SourceConnector
from vectis.plugins.providers.base import DBProvider


@dataclass
class PluginInfo:
    """Metadata about a registered plugin."""

    name: str
    type: str  # "connector" or "provider"
    description: str
    version: str
    author: str
    connection_types: list[str]  # e.g. ["dynamics_crm"] or ["sqlserver", "azure_sql"]
    config_schema: dict[str, object] = field(default_factory=dict)
    builtin: bool = True


class PluginRegistry:
    """Central registry for all connectors and providers."""

    def __init__(self) -> None:
        self._connectors: dict[str, tuple[PluginInfo, type[SourceConnector]]] = {}
        self._providers: dict[str, tuple[PluginInfo, type[DBProvider]]] = {}

    def register_connector(
        self, info: PluginInfo, cls: type[SourceConnector]
    ) -> None:
        for conn_type in info.connection_types:
            self._connectors[conn_type] = (info, cls)

    def register_provider(
        self, info: PluginInfo, cls: type[DBProvider]
    ) -> None:
        for conn_type in info.connection_types:
            self._providers[conn_type] = (info, cls)

    def get_connector(self, connection_type: str) -> type[SourceConnector] | None:
        entry = self._connectors.get(connection_type)
        return entry[1] if entry else None

    def get_provider(self, connection_type: str) -> type[DBProvider] | None:
        entry = self._providers.get(connection_type)
        return entry[1] if entry else None

    def list_connectors(self) -> list[PluginInfo]:
        seen: set[str] = set()
        result: list[PluginInfo] = []
        for info, _ in self._connectors.values():
            if info.name not in seen:
                seen.add(info.name)
                result.append(info)
        return result

    def list_providers(self) -> list[PluginInfo]:
        seen: set[str] = set()
        result: list[PluginInfo] = []
        for info, _ in self._providers.values():
            if info.name not in seen:
                seen.add(info.name)
                result.append(info)
        return result

    def list_all(self) -> list[PluginInfo]:
        return self.list_connectors() + self.list_providers()


def autodiscover() -> None:
    """Import all plugin modules in connectors/ and providers/ to trigger registration."""
    import importlib
    import pkgutil

    import vectis.plugins.connectors as connectors_pkg
    import vectis.plugins.providers as providers_pkg

    for pkg in (connectors_pkg, providers_pkg):
        for _importer, modname, _ispkg in pkgutil.iter_modules(pkg.__path__):
            if modname == "base":
                continue
            importlib.import_module(f"{pkg.__name__}.{modname}")


# Global registry instance
registry = PluginRegistry()
