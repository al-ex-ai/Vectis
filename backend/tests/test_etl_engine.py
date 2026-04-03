"""Tests for ETL engine — dependency sorting, progress tracking, cancellation."""

import json

from vectis.services.etl_engine import (
    progress_cancel,
    progress_cleanup,
    progress_get,
    progress_update,
    resolve_dependency_order,
)

# ── Dependency sorting ───────────────────────────────────────────────


class TestResolveDependencyOrder:
    def _mapping(self, entity: str, sort_order: int = 0, depends_on: list[str] | None = None, relations: list[dict[str, str]] | None = None) -> dict[str, object]:
        cfg: dict[str, object] = {}
        if depends_on:
            cfg["depends_on"] = depends_on
        if relations:
            cfg["relations"] = relations
        return {
            "id": hash(entity),
            "source_entity": entity,
            "dest_table": entity,
            "mapping_config": json.dumps(cfg),
            "sort_order": sort_order,
        }

    def test_single_mapping_returns_as_is(self) -> None:
        m = [self._mapping("account")]
        assert resolve_dependency_order(m) == m

    def test_explicit_sort_order(self) -> None:
        mappings = [
            self._mapping("contacts", sort_order=2),
            self._mapping("accounts", sort_order=1),
            self._mapping("orders", sort_order=3),
        ]
        result = resolve_dependency_order(mappings)
        assert [m["source_entity"] for m in result] == ["accounts", "contacts", "orders"]

    def test_depends_on_graph(self) -> None:
        mappings = [
            self._mapping("order_lines", depends_on=["orders"]),
            self._mapping("orders", depends_on=["accounts"]),
            self._mapping("accounts"),
        ]
        result = resolve_dependency_order(mappings)
        names = [m["source_entity"] for m in result]
        assert names.index("accounts") < names.index("orders")
        assert names.index("orders") < names.index("order_lines")

    def test_relations_graph(self) -> None:
        mappings = [
            self._mapping("contacts", relations=[{"to_table": "accounts", "from_column": "account_id", "to_column": "id"}]),
            self._mapping("accounts"),
        ]
        result = resolve_dependency_order(mappings)
        names = [m["source_entity"] for m in result]
        assert names.index("accounts") < names.index("contacts")

    def test_independent_mappings_preserve_order(self) -> None:
        mappings = [
            self._mapping("alpha"),
            self._mapping("beta"),
            self._mapping("gamma"),
        ]
        result = resolve_dependency_order(mappings)
        assert [m["source_entity"] for m in result] == ["alpha", "beta", "gamma"]

    def test_circular_dependency_doesnt_crash(self) -> None:
        mappings = [
            self._mapping("a", depends_on=["b"]),
            self._mapping("b", depends_on=["a"]),
        ]
        result = resolve_dependency_order(mappings)
        assert len(result) == 2

    def test_mixed_depends_on_and_sort_order(self) -> None:
        """When sort_orders differ, sort_order wins over depends_on."""
        mappings = [
            self._mapping("child", sort_order=1, depends_on=["parent"]),
            self._mapping("parent", sort_order=2),
        ]
        result = resolve_dependency_order(mappings)
        assert [m["source_entity"] for m in result] == ["child", "parent"]


# ── Progress tracking ────────────────────────────────────────────────


class TestProgressTracking:
    def test_update_and_get(self) -> None:
        progress_update(999, status="running", processed=50, total=100)
        p = progress_get(999)
        assert p is not None
        assert p["status"] == "running"
        assert p["processed"] == 50
        progress_cleanup(999)

    def test_get_nonexistent_returns_none(self) -> None:
        assert progress_get(88888) is None

    def test_cancel(self) -> None:
        progress_update(998, status="running")
        progress_cancel(998)
        p = progress_get(998)
        assert p is not None
        assert p["cancelled"] is True
        progress_cleanup(998)

    def test_cancel_before_start(self) -> None:
        progress_cancel(997)
        p = progress_get(997)
        assert p is not None
        assert p["cancelled"] is True
        progress_cleanup(997)

    def test_cleanup_removes(self) -> None:
        progress_update(996, status="done")
        progress_cleanup(996)
        assert progress_get(996) is None
