"""Rich demo seed data — two realistic projects with pipelines, flows, schedules, and run history."""

import json
import logging
from datetime import UTC, datetime, timedelta

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from vectis.models.connection import Connection
from vectis.models.flow import Flow
from vectis.models.flow_run import FlowRun
from vectis.models.organization import Organization
from vectis.models.pipeline import EntityMapping, Pipeline
from vectis.models.pipeline_run import PipelineRun
from vectis.models.project import Project
from vectis.models.schedule import Schedule

logger = logging.getLogger(__name__)

NOW = datetime.now(UTC)


def _ago(**kwargs: int) -> datetime:
    return NOW - timedelta(**kwargs)


async def seed_demo(session: AsyncSession) -> None:
    """Seed rich demo data. Skips if data already exists."""
    existing = (await session.execute(select(Project))).scalars().first()
    if existing:
        return

    # ── Org (use existing or create) ──
    org = (await session.execute(select(Organization).where(Organization.slug == "vectis-dev"))).scalar_one_or_none()
    org_id = org.id if org else None

    # ── Connections ──
    crm_src = Connection(
        name="CRM Source (PostgreSQL)", type="postgresql", org_id=org_id,
        description="Source CRM database with accounts, contacts, deals, campaigns, and many-to-many relationships",
        config={"host": "127.0.0.1", "port": "5441", "database": "source_crm", "schema": "crm"},
        created_by="admin@vectis.dev",
    )
    sql_dest = Connection(
        name="Analytics Warehouse", type="postgresql", org_id=org_id,
        description="Destination warehouse with star-schema tables for CRM analytics",
        config={"host": "127.0.0.1", "port": "5442", "database": "dest_warehouse", "schema": "dbo"},
        created_by="admin@vectis.dev",
    )
    ecom_src = Connection(
        name="E-Commerce Source (PostgreSQL)", type="postgresql", org_id=org_id,
        description="Source e-commerce database with stores, products, categories, orders, and many-to-many relationships",
        config={"host": "127.0.0.1", "port": "5441", "database": "source_crm", "schema": "ecommerce"},
        created_by="admin@vectis.dev",
    )
    ecom_dest = Connection(
        name="E-Commerce Data Lake", type="postgresql", org_id=org_id,
        description="Destination data lake for e-commerce analytics with product, order, and inventory dimensions",
        config={"host": "127.0.0.1", "port": "5442", "database": "dest_warehouse", "schema": "ecommerce"},
        created_by="admin@vectis.dev",
    )
    session.add_all([crm_src, sql_dest, ecom_src, ecom_dest])
    await session.flush()

    # ════════════════════════════════════════════════════════════════════
    # PROJECT 1: CRM to Warehouse
    # ════════════════════════════════════════════════════════════════════
    proj1 = Project(
        name="CRM to Warehouse",
        description="Migrate CRM data (accounts, contacts, deals, products, campaigns) into the analytics warehouse. Handles many-to-many junction tables for deal-products, campaign-contacts, and account-tags.",
        org_id=org_id, created_by="admin@vectis.dev",
    )
    session.add(proj1)
    await session.flush()

    # Pipelines
    p_accounts = Pipeline(
        name="Extract Accounts", description="CRM accounts to warehouse AccountDim table",
        source_connection_id=crm_src.id, dest_connection_id=sql_dest.id,
        project_id=proj1.id, status="active", tags=["crm", "accounts", "core"],
        settings=json.dumps({"batch_size": 2000, "dest_schema": "dbo", "track_fks": True}),
        created_by="admin@vectis.dev",
    )
    p_contacts = Pipeline(
        name="Extract Contacts", description="CRM contacts with account roles (M2M contact_accounts)",
        source_connection_id=crm_src.id, dest_connection_id=sql_dest.id,
        project_id=proj1.id, status="active", tags=["crm", "contacts", "core", "m2m"],
        settings=json.dumps({"batch_size": 2000, "dest_schema": "dbo", "track_fks": True}),
        created_by="admin@vectis.dev",
    )
    p_products = Pipeline(
        name="Extract Products", description="Product catalog and price lists",
        source_connection_id=crm_src.id, dest_connection_id=sql_dest.id,
        project_id=proj1.id, status="active", tags=["crm", "products"],
        settings=json.dumps({"batch_size": 500, "dest_schema": "dbo"}),
        created_by="admin@vectis.dev",
    )
    p_deals = Pipeline(
        name="Extract Deals", description="Sales deals with stage, revenue, and probability",
        source_connection_id=crm_src.id, dest_connection_id=sql_dest.id,
        project_id=proj1.id, status="active", tags=["crm", "deals", "sales"],
        settings=json.dumps({"batch_size": 1000, "dest_schema": "dbo"}),
        created_by="admin@vectis.dev",
    )
    p_deal_products = Pipeline(
        name="Sync Deal-Products", description="M2M junction: products bundled in each deal",
        source_connection_id=crm_src.id, dest_connection_id=sql_dest.id,
        project_id=proj1.id, status="active", tags=["crm", "m2m", "deals", "products"],
        settings=json.dumps({"batch_size": 2000, "dest_schema": "dbo"}),
        created_by="admin@vectis.dev",
    )
    p_campaigns = Pipeline(
        name="Extract Campaigns", description="Marketing campaigns dimension",
        source_connection_id=crm_src.id, dest_connection_id=sql_dest.id,
        project_id=proj1.id, status="active", tags=["crm", "campaigns", "marketing"],
        settings=json.dumps({"batch_size": 500, "dest_schema": "dbo"}),
        created_by="admin@vectis.dev",
    )
    p_campaign_contacts = Pipeline(
        name="Sync Campaign-Contacts", description="M2M junction: contacts targeted by campaigns with response status",
        source_connection_id=crm_src.id, dest_connection_id=sql_dest.id,
        project_id=proj1.id, status="active", tags=["crm", "m2m", "campaigns", "contacts"],
        settings=json.dumps({"batch_size": 2000, "dest_schema": "dbo"}),
        created_by="admin@vectis.dev",
    )
    p_account_tags = Pipeline(
        name="Sync Account-Tags", description="M2M junction: tags assigned to accounts",
        source_connection_id=crm_src.id, dest_connection_id=sql_dest.id,
        project_id=proj1.id, status="active", tags=["crm", "m2m", "accounts", "tags"],
        settings=json.dumps({"batch_size": 1000, "dest_schema": "dbo"}),
        created_by="admin@vectis.dev",
    )
    p_activities = Pipeline(
        name="Extract Activities", description="Emails, calls, meetings from CRM",
        source_connection_id=crm_src.id, dest_connection_id=sql_dest.id,
        project_id=proj1.id, status="active", tags=["crm", "activities"],
        settings=json.dumps({"batch_size": 5000, "dest_schema": "dbo"}),
        created_by="admin@vectis.dev",
    )
    p_tags = Pipeline(
        name="Extract Tags", description="Tag dimension table",
        source_connection_id=crm_src.id, dest_connection_id=sql_dest.id,
        project_id=proj1.id, status="active", tags=["crm", "tags"],
        settings=json.dumps({"batch_size": 500, "dest_schema": "dbo"}),
        created_by="admin@vectis.dev",
    )
    session.add_all([p_accounts, p_contacts, p_products, p_deals, p_deal_products,
                     p_campaigns, p_campaign_contacts, p_account_tags, p_activities, p_tags])
    await session.flush()

    # Entity mappings for project 1
    mappings_data = [
        (p_accounts.id, "crm.accounts", "dbo.AccountDim", {"columns": {"account_id": "AccountId", "name": "AccountName", "industry": "Industry", "email": "PrimaryEmail", "phone": "Phone", "annual_revenue": "AnnualRevenue", "employee_count": "EmployeeCount", "city": "City", "country": "Country", "status": "Status"}, "load_strategy": "replace", "primary_key": "account_id"}),
        (p_contacts.id, "crm.contact_accounts", "dbo.ContactDim", {"columns": {"contact_id": "ContactId", "first_name": "FirstName", "last_name": "LastName", "email": "Email", "account_id": "AccountId", "job_title": "JobTitle", "role": "Role", "is_primary": "IsPrimary"}, "load_strategy": "replace", "primary_key": "contact_id", "join": "contact_accounts.contact_id = contacts.contact_id"}),
        (p_products.id, "crm.products", "dbo.ProductDim", {"columns": {"product_id": "ProductId", "name": "ProductName", "sku": "SKU", "category": "Category", "unit_price": "UnitPrice", "is_active": "IsActive"}, "load_strategy": "replace", "primary_key": "product_id"}),
        (p_deals.id, "crm.deals", "dbo.DealFact", {"columns": {"deal_id": "DealId", "name": "DealName", "account_id": "AccountId", "owner_contact_id": "OwnerContactId", "stage": "Stage", "amount": "Amount", "probability": "Probability", "expected_close": "ExpectedClose", "actual_close": "ActualClose", "source": "Source"}, "load_strategy": "replace", "primary_key": "deal_id"}),
        (p_deal_products.id, "crm.deal_products", "dbo.DealProductBridge", {"columns": {"deal_id": "DealId", "product_id": "ProductId", "quantity": "Quantity", "discount_pct": "DiscountPct", "unit_price": "UnitPrice", "line_total": "LineTotal"}, "load_strategy": "replace", "primary_key": ["deal_id", "product_id"]}),
        (p_campaigns.id, "crm.campaigns", "dbo.CampaignDim", {"columns": {"campaign_id": "CampaignId", "name": "CampaignName", "type": "Type", "status": "Status", "budget": "Budget", "start_date": "StartDate", "end_date": "EndDate"}, "load_strategy": "replace", "primary_key": "campaign_id"}),
        (p_campaign_contacts.id, "crm.campaign_contacts", "dbo.CampaignContactBridge", {"columns": {"campaign_id": "CampaignId", "contact_id": "ContactId", "status": "ResponseStatus", "responded_on": "RespondedOn"}, "load_strategy": "replace", "primary_key": ["campaign_id", "contact_id"]}),
        (p_account_tags.id, "crm.account_tags", "dbo.AccountTagBridge", {"columns": {"account_id": "AccountId", "name": "TagName", "color": "TagColor"}, "load_strategy": "replace", "primary_key": ["account_id", "tag_name"], "join": "account_tags.tag_id = tags.tag_id"}),
        (p_activities.id, "crm.activities", "dbo.ActivityLog", {"columns": {"activity_id": "ActivityId", "type": "Type", "subject": "Subject", "contact_id": "ContactId", "account_id": "AccountId", "deal_id": "DealId", "due_date": "DueDate", "completed_on": "CompletedOn"}, "load_strategy": "append", "primary_key": "activity_id"}),
        (p_tags.id, "crm.tags", "dbo.TagDim", {"columns": {"tag_id": "TagId", "name": "TagName", "color": "Color"}, "load_strategy": "replace", "primary_key": "tag_id"}),
    ]
    for pid, src, dst, cfg in mappings_data:
        session.add(EntityMapping(
            pipeline_id=pid, source_entity=src, dest_table=dst,
            mapping_config=json.dumps(cfg), transform_type="column_map", sort_order=0,
        ))

    # Flow: Full CRM Sync (dependency-aware)
    flow1 = Flow(
        name="Full CRM Sync",
        description="Complete CRM data refresh: tags and accounts first, then contacts and deals in parallel, then junction tables, activities last",
        project_id=proj1.id, created_by="admin@vectis.dev",
        steps=[
            {"pipeline_id": p_tags.id, "x": 100, "y": 100, "depends_on": []},
            {"pipeline_id": p_accounts.id, "x": 100, "y": 300, "depends_on": []},
            {"pipeline_id": p_products.id, "x": 100, "y": 500, "depends_on": []},
            {"pipeline_id": p_contacts.id, "x": 350, "y": 200, "depends_on": [p_accounts.id]},
            {"pipeline_id": p_deals.id, "x": 350, "y": 400, "depends_on": [p_accounts.id]},
            {"pipeline_id": p_campaigns.id, "x": 350, "y": 600, "depends_on": []},
            {"pipeline_id": p_account_tags.id, "x": 600, "y": 100, "depends_on": [p_accounts.id, p_tags.id]},
            {"pipeline_id": p_deal_products.id, "x": 600, "y": 300, "depends_on": [p_deals.id, p_products.id]},
            {"pipeline_id": p_campaign_contacts.id, "x": 600, "y": 500, "depends_on": [p_campaigns.id, p_contacts.id]},
            {"pipeline_id": p_activities.id, "x": 850, "y": 300, "depends_on": [p_contacts.id, p_deals.id]},
        ],
    )
    session.add(flow1)
    await session.flush()

    # Schedules for project 1
    session.add_all([
        Schedule(
            name="Daily CRM Sync", description="Full CRM refresh every morning at 6 AM UTC",
            target_type="flow", flow_id=flow1.id, project_id=proj1.id,
            cron_expression="0 6 * * *", timezone="UTC", enabled=False, overlap_policy="skip",
            last_run_at=_ago(hours=18), last_status="completed", run_count=45,
        ),
        Schedule(
            name="Hourly Accounts", description="Keep accounts fresh throughout the day",
            target_type="pipeline", pipeline_id=p_accounts.id, project_id=proj1.id,
            cron_expression="0 * * * *", timezone="UTC", enabled=False, overlap_policy="skip",
            last_run_at=_ago(minutes=35), last_status="completed", run_count=312,
        ),
        Schedule(
            name="Hourly Deal Sync", description="Keep deals and deal-products updated",
            target_type="pipeline", pipeline_id=p_deals.id, project_id=proj1.id,
            cron_expression="15 * * * *", timezone="UTC", enabled=False, overlap_policy="skip",
            last_run_at=_ago(minutes=20), last_status="completed", run_count=290,
        ),
    ])

    # Pipeline run history for project 1 — ALL COMPLETED
    run_history_1 = [
        (p_accounts.id, "completed", _ago(minutes=35), _ago(minutes=32), 12, 12, 0, 2000, None, "scheduler"),
        (p_accounts.id, "completed", _ago(hours=1, minutes=35), _ago(hours=1, minutes=31), 12, 12, 0, 2000, None, "scheduler"),
        (p_contacts.id, "completed", _ago(hours=18), _ago(hours=17, minutes=55), 31, 31, 0, 2000, None, "scheduler"),
        (p_products.id, "completed", _ago(hours=18), _ago(hours=17, minutes=58), 12, 12, 0, 500, None, "scheduler"),
        (p_deals.id, "completed", _ago(minutes=20), _ago(minutes=18), 16, 16, 0, 1000, None, "scheduler"),
        (p_deals.id, "completed", _ago(hours=1, minutes=20), _ago(hours=1, minutes=18), 16, 16, 0, 1000, None, "scheduler"),
        (p_deal_products.id, "completed", _ago(hours=18), _ago(hours=17, minutes=56), 48, 48, 0, 2000, None, "scheduler"),
        (p_campaigns.id, "completed", _ago(hours=18), _ago(hours=17, minutes=58), 8, 8, 0, 500, None, "scheduler"),
        (p_campaign_contacts.id, "completed", _ago(hours=18), _ago(hours=17, minutes=54), 36, 36, 0, 2000, None, "scheduler"),
        (p_account_tags.id, "completed", _ago(hours=18), _ago(hours=17, minutes=57), 28, 28, 0, 1000, None, "scheduler"),
        (p_activities.id, "completed", _ago(hours=17, minutes=50), _ago(hours=17, minutes=30), 60, 60, 0, 5000, None, "scheduler"),
        (p_tags.id, "completed", _ago(hours=18), _ago(hours=17, minutes=59), 10, 10, 0, 500, None, "scheduler"),
        # Older completed runs
        (p_accounts.id, "completed", _ago(days=1, minutes=35), _ago(days=1, minutes=31), 12, 12, 0, 2000, None, "scheduler"),
        (p_accounts.id, "completed", _ago(days=2, minutes=35), _ago(days=2, minutes=32), 12, 12, 0, 2000, None, "admin@vectis.dev"),
        (p_deals.id, "completed", _ago(days=1, minutes=20), _ago(days=1, minutes=18), 16, 16, 0, 1000, None, "scheduler"),
        (p_contacts.id, "completed", _ago(days=1), _ago(days=1) + timedelta(minutes=5), 31, 31, 0, 2000, None, "scheduler"),
        (p_deal_products.id, "completed", _ago(days=1), _ago(days=1) + timedelta(minutes=4), 48, 48, 0, 2000, None, "scheduler"),
        (p_campaign_contacts.id, "completed", _ago(days=1), _ago(days=1) + timedelta(minutes=6), 36, 36, 0, 2000, None, "scheduler"),
    ]
    for pid, status, started, completed, total, processed, failed, batch, error, by in run_history_1:
        session.add(PipelineRun(
            pipeline_id=pid, status=status, started_at=started, completed_at=completed,
            total_records=total, processed_records=processed, failed_records=failed,
            batch_size=batch, error_message=error, started_by=by,
        ))

    # Flow run history — ALL COMPLETED
    session.add_all([
        FlowRun(
            flow_id=flow1.id, status="completed", started_at=_ago(hours=18),
            completed_at=_ago(hours=17, minutes=30), total_steps=10, completed_steps=10, failed_steps=0,
            step_results={
                str(p_tags.id): {"status": "completed", "run_id": None, "error": None},
                str(p_accounts.id): {"status": "completed", "run_id": None, "error": None},
                str(p_products.id): {"status": "completed", "run_id": None, "error": None},
                str(p_contacts.id): {"status": "completed", "run_id": None, "error": None},
                str(p_deals.id): {"status": "completed", "run_id": None, "error": None},
                str(p_campaigns.id): {"status": "completed", "run_id": None, "error": None},
                str(p_account_tags.id): {"status": "completed", "run_id": None, "error": None},
                str(p_deal_products.id): {"status": "completed", "run_id": None, "error": None},
                str(p_campaign_contacts.id): {"status": "completed", "run_id": None, "error": None},
                str(p_activities.id): {"status": "completed", "run_id": None, "error": None},
            },
            started_by="scheduler",
        ),
        FlowRun(
            flow_id=flow1.id, status="completed", started_at=_ago(days=1),
            completed_at=_ago(days=1) + timedelta(minutes=28), total_steps=10, completed_steps=10, failed_steps=0,
            step_results={
                str(p_tags.id): {"status": "completed", "run_id": None, "error": None},
                str(p_accounts.id): {"status": "completed", "run_id": None, "error": None},
                str(p_products.id): {"status": "completed", "run_id": None, "error": None},
                str(p_contacts.id): {"status": "completed", "run_id": None, "error": None},
                str(p_deals.id): {"status": "completed", "run_id": None, "error": None},
                str(p_campaigns.id): {"status": "completed", "run_id": None, "error": None},
                str(p_account_tags.id): {"status": "completed", "run_id": None, "error": None},
                str(p_deal_products.id): {"status": "completed", "run_id": None, "error": None},
                str(p_campaign_contacts.id): {"status": "completed", "run_id": None, "error": None},
                str(p_activities.id): {"status": "completed", "run_id": None, "error": None},
            },
            started_by="scheduler",
        ),
        FlowRun(
            flow_id=flow1.id, status="completed", started_at=_ago(days=2),
            completed_at=_ago(days=2) + timedelta(minutes=30), total_steps=10, completed_steps=10, failed_steps=0,
            step_results={
                str(p_tags.id): {"status": "completed", "run_id": None, "error": None},
                str(p_accounts.id): {"status": "completed", "run_id": None, "error": None},
                str(p_products.id): {"status": "completed", "run_id": None, "error": None},
                str(p_contacts.id): {"status": "completed", "run_id": None, "error": None},
                str(p_deals.id): {"status": "completed", "run_id": None, "error": None},
                str(p_campaigns.id): {"status": "completed", "run_id": None, "error": None},
                str(p_account_tags.id): {"status": "completed", "run_id": None, "error": None},
                str(p_deal_products.id): {"status": "completed", "run_id": None, "error": None},
                str(p_campaign_contacts.id): {"status": "completed", "run_id": None, "error": None},
                str(p_activities.id): {"status": "completed", "run_id": None, "error": None},
            },
            started_by="admin@vectis.dev",
        ),
    ])

    # ════════════════════════════════════════════════════════════════════
    # PROJECT 2: E-Commerce Data Lake
    # ════════════════════════════════════════════════════════════════════
    proj2 = Project(
        name="E-Commerce Data Lake",
        description="Consolidate e-commerce data (stores, products, categories, orders, wishlists) into the data lake. Handles many-to-many junction tables for product-categories, product-tags, product-collections, and wishlist-products.",
        org_id=org_id, created_by="admin@vectis.dev",
    )
    session.add(proj2)
    await session.flush()

    p_stores = Pipeline(
        name="Sync Stores", description="Store dimension across regions",
        source_connection_id=ecom_src.id, dest_connection_id=ecom_dest.id,
        project_id=proj2.id, status="active", tags=["ecommerce", "stores", "core"],
        settings=json.dumps({"batch_size": 100, "dest_schema": "ecommerce"}),
        created_by="admin@vectis.dev",
    )
    p_categories = Pipeline(
        name="Sync Categories", description="Hierarchical product categories (parent-child)",
        source_connection_id=ecom_src.id, dest_connection_id=ecom_dest.id,
        project_id=proj2.id, status="active", tags=["ecommerce", "categories"],
        settings=json.dumps({"batch_size": 500, "dest_schema": "ecommerce"}),
        created_by="admin@vectis.dev",
    )
    p_ecom_products = Pipeline(
        name="Sync Products", description="Product catalog with variants, pricing, and inventory",
        source_connection_id=ecom_src.id, dest_connection_id=ecom_dest.id,
        project_id=proj2.id, status="active", tags=["ecommerce", "products", "core"],
        settings=json.dumps({"batch_size": 1000, "dest_schema": "ecommerce"}),
        created_by="admin@vectis.dev",
    )
    p_variants = Pipeline(
        name="Sync Variants", description="Product variants (size, color, storage)",
        source_connection_id=ecom_src.id, dest_connection_id=ecom_dest.id,
        project_id=proj2.id, status="active", tags=["ecommerce", "variants", "products"],
        settings=json.dumps({"batch_size": 2000, "dest_schema": "ecommerce"}),
        created_by="admin@vectis.dev",
    )
    p_product_categories = Pipeline(
        name="Sync Product-Categories", description="M2M junction: products in multiple categories",
        source_connection_id=ecom_src.id, dest_connection_id=ecom_dest.id,
        project_id=proj2.id, status="active", tags=["ecommerce", "m2m", "products", "categories"],
        settings=json.dumps({"batch_size": 2000, "dest_schema": "ecommerce"}),
        created_by="admin@vectis.dev",
    )
    p_product_tags = Pipeline(
        name="Sync Product-Tags", description="M2M junction: products tagged for filtering",
        source_connection_id=ecom_src.id, dest_connection_id=ecom_dest.id,
        project_id=proj2.id, status="active", tags=["ecommerce", "m2m", "products", "tags"],
        settings=json.dumps({"batch_size": 2000, "dest_schema": "ecommerce"}),
        created_by="admin@vectis.dev",
    )
    p_collections = Pipeline(
        name="Sync Collections", description="Curated product collections",
        source_connection_id=ecom_src.id, dest_connection_id=ecom_dest.id,
        project_id=proj2.id, status="active", tags=["ecommerce", "collections"],
        settings=json.dumps({"batch_size": 500, "dest_schema": "ecommerce"}),
        created_by="admin@vectis.dev",
    )
    p_product_collections = Pipeline(
        name="Sync Product-Collections", description="M2M junction: products in curated collections",
        source_connection_id=ecom_src.id, dest_connection_id=ecom_dest.id,
        project_id=proj2.id, status="active", tags=["ecommerce", "m2m", "products", "collections"],
        settings=json.dumps({"batch_size": 2000, "dest_schema": "ecommerce"}),
        created_by="admin@vectis.dev",
    )
    p_customers = Pipeline(
        name="Sync Customers", description="Customer profiles with lifetime value",
        source_connection_id=ecom_src.id, dest_connection_id=ecom_dest.id,
        project_id=proj2.id, status="active", tags=["ecommerce", "customers", "core"],
        settings=json.dumps({"batch_size": 3000, "dest_schema": "ecommerce"}),
        created_by="admin@vectis.dev",
    )
    p_orders = Pipeline(
        name="Sync Orders", description="Orders with payment and fulfillment status",
        source_connection_id=ecom_src.id, dest_connection_id=ecom_dest.id,
        project_id=proj2.id, status="active", tags=["ecommerce", "orders", "core"],
        settings=json.dumps({"batch_size": 5000, "dest_schema": "ecommerce"}),
        created_by="admin@vectis.dev",
    )
    p_order_items = Pipeline(
        name="Sync Order Items", description="M2M junction: products in orders with quantities and pricing",
        source_connection_id=ecom_src.id, dest_connection_id=ecom_dest.id,
        project_id=proj2.id, status="active", tags=["ecommerce", "m2m", "orders", "products"],
        settings=json.dumps({"batch_size": 5000, "dest_schema": "ecommerce"}),
        created_by="admin@vectis.dev",
    )
    p_inventory = Pipeline(
        name="Sync Inventory", description="Real-time inventory levels per product per store",
        source_connection_id=ecom_src.id, dest_connection_id=ecom_dest.id,
        project_id=proj2.id, status="active", tags=["ecommerce", "inventory"],
        settings=json.dumps({"batch_size": 2000, "dest_schema": "ecommerce"}),
        created_by="admin@vectis.dev",
    )
    p_wishlists = Pipeline(
        name="Sync Wishlists", description="M2M junction: customer wishlist products",
        source_connection_id=ecom_src.id, dest_connection_id=ecom_dest.id,
        project_id=proj2.id, status="active", tags=["ecommerce", "m2m", "wishlists"],
        settings=json.dumps({"batch_size": 2000, "dest_schema": "ecommerce"}),
        created_by="admin@vectis.dev",
    )
    session.add_all([p_stores, p_categories, p_ecom_products, p_variants,
                     p_product_categories, p_product_tags, p_collections,
                     p_product_collections, p_customers, p_orders, p_order_items,
                     p_inventory, p_wishlists])
    await session.flush()

    # Entity mappings for project 2
    mappings_data_2 = [
        (p_stores.id, "ecommerce.stores", "ecommerce.store_dim", {"columns": {"store_id": "store_id", "name": "store_name", "slug": "slug", "currency": "currency", "country": "country", "timezone": "timezone", "status": "status"}, "load_strategy": "replace", "primary_key": "store_id"}),
        (p_categories.id, "ecommerce.categories", "ecommerce.category_dim", {"columns": {"category_id": "category_id", "name": "category_name", "slug": "slug", "parent_id": "parent_id", "depth": "depth"}, "load_strategy": "replace", "primary_key": "category_id"}),
        (p_ecom_products.id, "ecommerce.products", "ecommerce.product_dim", {"columns": {"product_id": "product_id", "store_id": "store_id", "name": "product_name", "slug": "slug", "sku": "sku", "price": "price", "compare_at_price": "compare_at_price", "cost": "cost", "vendor": "vendor", "status": "status"}, "load_strategy": "replace", "primary_key": "product_id", "computed": {"margin_pct": "ROUND((price - cost) / price * 100, 2)"}}),
        (p_variants.id, "ecommerce.product_variants", "ecommerce.variant_dim", {"columns": {"variant_id": "variant_id", "product_id": "product_id", "name": "variant_name", "sku": "sku", "price": "price", "inventory_qty": "inventory_qty", "option1": "option1", "option2": "option2"}, "load_strategy": "replace", "primary_key": "variant_id"}),
        (p_product_categories.id, "ecommerce.product_categories", "ecommerce.product_category_bridge", {"columns": {"product_id": "product_id", "category_id": "category_id", "sort_order": "sort_order"}, "load_strategy": "replace", "primary_key": ["product_id", "category_id"]}),
        (p_product_tags.id, "ecommerce.product_tags", "ecommerce.product_tag_bridge", {"columns": {"product_id": "product_id", "name": "tag_name"}, "load_strategy": "replace", "primary_key": ["product_id", "tag_name"], "join": "product_tags.tag_id = tags.tag_id"}),
        (p_collections.id, "ecommerce.collections", "ecommerce.collection_dim", {"columns": {"collection_id": "collection_id", "name": "collection_name", "slug": "slug", "store_id": "store_id", "is_featured": "is_featured"}, "load_strategy": "replace", "primary_key": "collection_id"}),
        (p_product_collections.id, "ecommerce.product_collections", "ecommerce.product_collection_bridge", {"columns": {"product_id": "product_id", "collection_id": "collection_id", "sort_order": "sort_order"}, "load_strategy": "replace", "primary_key": ["product_id", "collection_id"]}),
        (p_customers.id, "ecommerce.customers", "ecommerce.customer_dim", {"columns": {"customer_id": "customer_id", "store_id": "store_id", "email": "email", "first_name": "first_name", "last_name": "last_name", "city": "city", "country": "country", "total_orders": "total_orders", "total_spent": "lifetime_value", "created_on": "first_order_date"}, "load_strategy": "replace", "primary_key": "customer_id"}),
        (p_orders.id, "ecommerce.orders", "ecommerce.order_fact", {"columns": {"order_id": "order_id", "store_id": "store_id", "customer_id": "customer_id", "order_number": "order_number", "status": "status", "payment_status": "payment_status", "subtotal": "subtotal", "discount_total": "discount_total", "tax_total": "tax_total", "shipping_total": "shipping_total", "grand_total": "grand_total", "shipping_city": "shipping_city", "shipping_country": "shipping_country", "order_date": "order_date", "shipped_date": "shipped_date", "delivered_date": "delivered_date"}, "load_strategy": "append", "primary_key": "order_id"}),
        (p_order_items.id, "ecommerce.order_items", "ecommerce.order_item_fact", {"columns": {"item_id": "item_id", "order_id": "order_id", "product_id": "product_id", "variant_id": "variant_id", "quantity": "quantity", "unit_price": "unit_price", "discount": "discount", "line_total": "line_total"}, "load_strategy": "append", "primary_key": "item_id"}),
        (p_inventory.id, "ecommerce.products", "ecommerce.inventory_snapshot", {"columns": {"product_id": "product_id", "store_id": "store_id", "inventory_qty": "inventory_qty"}, "load_strategy": "replace", "primary_key": ["product_id", "store_id"]}),
        (p_wishlists.id, "ecommerce.wishlist_products", "ecommerce.wishlist_fact", {"columns": {"wishlist_id": "wishlist_id", "customer_id": "customer_id", "product_id": "product_id", "name": "wishlist_name", "added_on": "added_on"}, "load_strategy": "replace", "primary_key": ["wishlist_id", "product_id"], "join": "wishlist_products.wishlist_id = wishlists.wishlist_id"}),
    ]
    for pid, src, dst, cfg in mappings_data_2:
        session.add(EntityMapping(
            pipeline_id=pid, source_entity=src, dest_table=dst,
            mapping_config=json.dumps(cfg), transform_type="column_map", sort_order=0,
        ))

    # Flow: Full E-Commerce Refresh
    flow2 = Flow(
        name="Full E-Commerce Refresh",
        description="Stores and categories first, then products, then variants/tags/collections in parallel, then customers and orders, order items and wishlists last",
        project_id=proj2.id, created_by="admin@vectis.dev",
        steps=[
            {"pipeline_id": p_stores.id, "x": 100, "y": 100, "depends_on": []},
            {"pipeline_id": p_categories.id, "x": 100, "y": 300, "depends_on": []},
            {"pipeline_id": p_ecom_products.id, "x": 300, "y": 200, "depends_on": [p_stores.id]},
            {"pipeline_id": p_variants.id, "x": 500, "y": 100, "depends_on": [p_ecom_products.id]},
            {"pipeline_id": p_product_categories.id, "x": 500, "y": 250, "depends_on": [p_ecom_products.id, p_categories.id]},
            {"pipeline_id": p_product_tags.id, "x": 500, "y": 400, "depends_on": [p_ecom_products.id]},
            {"pipeline_id": p_collections.id, "x": 300, "y": 500, "depends_on": [p_stores.id]},
            {"pipeline_id": p_product_collections.id, "x": 500, "y": 550, "depends_on": [p_ecom_products.id, p_collections.id]},
            {"pipeline_id": p_customers.id, "x": 700, "y": 100, "depends_on": [p_stores.id]},
            {"pipeline_id": p_orders.id, "x": 700, "y": 300, "depends_on": [p_customers.id]},
            {"pipeline_id": p_order_items.id, "x": 900, "y": 200, "depends_on": [p_orders.id, p_ecom_products.id]},
            {"pipeline_id": p_inventory.id, "x": 900, "y": 400, "depends_on": [p_ecom_products.id, p_stores.id]},
            {"pipeline_id": p_wishlists.id, "x": 900, "y": 550, "depends_on": [p_customers.id, p_ecom_products.id]},
        ],
    )
    # Flow: Quick Inventory Sync
    flow3 = Flow(
        name="Quick Inventory Sync",
        description="Fast inventory-only sync for stock alerts",
        project_id=proj2.id, created_by="admin@vectis.dev",
        steps=[
            {"pipeline_id": p_stores.id, "x": 100, "y": 200, "depends_on": []},
            {"pipeline_id": p_ecom_products.id, "x": 350, "y": 200, "depends_on": [p_stores.id]},
            {"pipeline_id": p_inventory.id, "x": 600, "y": 200, "depends_on": [p_ecom_products.id]},
        ],
    )
    session.add_all([flow2, flow3])
    await session.flush()

    # Schedules for project 2
    session.add_all([
        Schedule(
            name="Nightly E-Commerce Sync", description="Full refresh every night at midnight",
            target_type="flow", flow_id=flow2.id, project_id=proj2.id,
            cron_expression="0 0 * * *", timezone="US/Eastern", enabled=False, overlap_policy="skip",
            last_run_at=_ago(hours=6), last_status="completed", run_count=28,
        ),
        Schedule(
            name="Inventory Every 15 Min", description="Keep inventory fresh for stock alerts",
            target_type="flow", flow_id=flow3.id, project_id=proj2.id,
            cron_expression="*/15 * * * *", timezone="UTC", enabled=False, overlap_policy="skip",
            last_run_at=_ago(minutes=8), last_status="completed", run_count=1890,
        ),
        Schedule(
            name="Hourly Orders", description="Incremental order sync",
            target_type="pipeline", pipeline_id=p_orders.id, project_id=proj2.id,
            cron_expression="0 * * * *", timezone="UTC", enabled=False, overlap_policy="skip",
            last_run_at=_ago(minutes=22), last_status="completed", run_count=445,
        ),
        Schedule(
            name="Daily Product Catalog", description="Full product catalog refresh",
            target_type="pipeline", pipeline_id=p_ecom_products.id, project_id=proj2.id,
            cron_expression="0 4 * * *", timezone="UTC", enabled=False, overlap_policy="skip",
            last_run_at=_ago(hours=8), last_status="completed", run_count=60,
        ),
    ])

    # Pipeline run history for project 2 — ALL COMPLETED
    run_history_2 = [
        (p_stores.id, "completed", _ago(hours=6), _ago(hours=5, minutes=59), 3, 3, 0, 100, None, "scheduler"),
        (p_categories.id, "completed", _ago(hours=6), _ago(hours=5, minutes=59), 20, 20, 0, 500, None, "scheduler"),
        (p_ecom_products.id, "completed", _ago(hours=6), _ago(hours=5, minutes=57), 34, 34, 0, 1000, None, "scheduler"),
        (p_ecom_products.id, "completed", _ago(hours=8), _ago(hours=7, minutes=58), 34, 34, 0, 1000, None, "scheduler"),
        (p_variants.id, "completed", _ago(hours=6), _ago(hours=5, minutes=56), 13, 13, 0, 2000, None, "scheduler"),
        (p_product_categories.id, "completed", _ago(hours=6), _ago(hours=5, minutes=55), 30, 30, 0, 2000, None, "scheduler"),
        (p_product_tags.id, "completed", _ago(hours=6), _ago(hours=5, minutes=55), 47, 47, 0, 2000, None, "scheduler"),
        (p_collections.id, "completed", _ago(hours=6), _ago(hours=5, minutes=58), 5, 5, 0, 500, None, "scheduler"),
        (p_product_collections.id, "completed", _ago(hours=6), _ago(hours=5, minutes=54), 26, 26, 0, 2000, None, "scheduler"),
        (p_customers.id, "completed", _ago(hours=6), _ago(hours=5, minutes=55), 15, 15, 0, 3000, None, "scheduler"),
        (p_orders.id, "completed", _ago(minutes=22), _ago(minutes=18), 26, 26, 0, 5000, None, "scheduler"),
        (p_orders.id, "completed", _ago(hours=1, minutes=22), _ago(hours=1, minutes=17), 26, 26, 0, 5000, None, "scheduler"),
        (p_order_items.id, "completed", _ago(hours=6), _ago(hours=5, minutes=53), 43, 43, 0, 5000, None, "scheduler"),
        (p_inventory.id, "completed", _ago(minutes=8), _ago(minutes=7), 34, 34, 0, 2000, None, "scheduler"),
        (p_inventory.id, "completed", _ago(minutes=23), _ago(minutes=22), 34, 34, 0, 2000, None, "scheduler"),
        (p_wishlists.id, "completed", _ago(hours=6), _ago(hours=5, minutes=54), 16, 16, 0, 2000, None, "scheduler"),
        # Older completed runs
        (p_orders.id, "completed", _ago(days=1, minutes=22), _ago(days=1, minutes=17), 26, 26, 0, 5000, None, "scheduler"),
        (p_customers.id, "completed", _ago(days=1, hours=6), _ago(days=1, hours=5, minutes=54), 15, 15, 0, 3000, None, "scheduler"),
        (p_inventory.id, "completed", _ago(hours=1, minutes=8), _ago(hours=1, minutes=7), 34, 34, 0, 2000, None, "scheduler"),
        (p_ecom_products.id, "completed", _ago(days=1, hours=8), _ago(days=1, hours=7, minutes=58), 34, 34, 0, 1000, None, "scheduler"),
    ]
    for pid, status, started, completed, total, processed, failed, batch, error, by in run_history_2:
        session.add(PipelineRun(
            pipeline_id=pid, status=status, started_at=started, completed_at=completed,
            total_records=total, processed_records=processed, failed_records=failed,
            batch_size=batch, error_message=error, started_by=by,
        ))

    # Flow run history for project 2 — ALL COMPLETED
    all_ecom_steps_completed = {
        str(p_stores.id): {"status": "completed", "run_id": None, "error": None},
        str(p_categories.id): {"status": "completed", "run_id": None, "error": None},
        str(p_ecom_products.id): {"status": "completed", "run_id": None, "error": None},
        str(p_variants.id): {"status": "completed", "run_id": None, "error": None},
        str(p_product_categories.id): {"status": "completed", "run_id": None, "error": None},
        str(p_product_tags.id): {"status": "completed", "run_id": None, "error": None},
        str(p_collections.id): {"status": "completed", "run_id": None, "error": None},
        str(p_product_collections.id): {"status": "completed", "run_id": None, "error": None},
        str(p_customers.id): {"status": "completed", "run_id": None, "error": None},
        str(p_orders.id): {"status": "completed", "run_id": None, "error": None},
        str(p_order_items.id): {"status": "completed", "run_id": None, "error": None},
        str(p_inventory.id): {"status": "completed", "run_id": None, "error": None},
        str(p_wishlists.id): {"status": "completed", "run_id": None, "error": None},
    }
    inv_steps_completed = {
        str(p_stores.id): {"status": "completed", "run_id": None, "error": None},
        str(p_ecom_products.id): {"status": "completed", "run_id": None, "error": None},
        str(p_inventory.id): {"status": "completed", "run_id": None, "error": None},
    }

    session.add_all([
        FlowRun(
            flow_id=flow2.id, status="completed", started_at=_ago(hours=6),
            completed_at=_ago(hours=5, minutes=50), total_steps=13, completed_steps=13, failed_steps=0,
            step_results=all_ecom_steps_completed,
            started_by="scheduler",
        ),
        FlowRun(
            flow_id=flow2.id, status="completed", started_at=_ago(days=1, hours=6),
            completed_at=_ago(days=1, hours=5, minutes=48), total_steps=13, completed_steps=13, failed_steps=0,
            step_results=all_ecom_steps_completed,
            started_by="scheduler",
        ),
        FlowRun(
            flow_id=flow3.id, status="completed", started_at=_ago(minutes=8),
            completed_at=_ago(minutes=6), total_steps=3, completed_steps=3, failed_steps=0,
            step_results=inv_steps_completed,
            started_by="scheduler",
        ),
        FlowRun(
            flow_id=flow3.id, status="completed", started_at=_ago(minutes=23),
            completed_at=_ago(minutes=21), total_steps=3, completed_steps=3, failed_steps=0,
            step_results=inv_steps_completed,
            started_by="scheduler",
        ),
        FlowRun(
            flow_id=flow3.id, status="completed", started_at=_ago(minutes=38),
            completed_at=_ago(minutes=36), total_steps=3, completed_steps=3, failed_steps=0,
            step_results=inv_steps_completed,
            started_by="scheduler",
        ),
    ])

    await session.commit()

    logger.info(
        "[seed] Demo data: 2 projects, 4 connections, 23 pipelines, "
        "3 flows, 7 schedules, 38 pipeline runs, 8 flow runs — all green"
    )
