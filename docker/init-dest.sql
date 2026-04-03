-- ============================================================================
-- Destination warehouse database — target tables for Vectis ETL pipelines
-- Pre-created schemas matching the entity mappings in seed.py
-- ============================================================================

-- ════════════════════════════════════════════════════════════════════════════
-- SCHEMA: dbo — CRM warehouse tables (Project 1: CRM to Warehouse)
-- ════════════════════════════════════════════════════════════════════════════

CREATE SCHEMA IF NOT EXISTS dbo;

CREATE TABLE dbo."AccountDim" (
    "AccountId" UUID PRIMARY KEY,
    "AccountName" VARCHAR(255),
    "Industry" VARCHAR(100),
    "PrimaryEmail" VARCHAR(255),
    "Phone" VARCHAR(50),
    "AnnualRevenue" DECIMAL(18,2),
    "EmployeeCount" INT,
    "City" VARCHAR(100),
    "Country" VARCHAR(100),
    "Status" VARCHAR(50),
    "LoadedAt" TIMESTAMP DEFAULT NOW()
);

CREATE TABLE dbo."ContactDim" (
    "ContactId" UUID PRIMARY KEY,
    "FirstName" VARCHAR(100),
    "LastName" VARCHAR(100),
    "Email" VARCHAR(255),
    "AccountId" UUID,
    "JobTitle" VARCHAR(150),
    "Role" VARCHAR(100),
    "IsPrimary" BOOLEAN,
    "LoadedAt" TIMESTAMP DEFAULT NOW()
);

CREATE TABLE dbo."DealFact" (
    "DealId" UUID PRIMARY KEY,
    "DealName" VARCHAR(255),
    "AccountId" UUID,
    "OwnerContactId" UUID,
    "Stage" VARCHAR(50),
    "Amount" DECIMAL(18,2),
    "Probability" INT,
    "ExpectedClose" DATE,
    "ActualClose" DATE,
    "Source" VARCHAR(100),
    "LoadedAt" TIMESTAMP DEFAULT NOW()
);

CREATE TABLE dbo."DealProductBridge" (
    "DealId" UUID,
    "ProductId" UUID,
    "Quantity" INT,
    "DiscountPct" DECIMAL(5,2),
    "UnitPrice" DECIMAL(18,2),
    "LineTotal" DECIMAL(18,2),
    "LoadedAt" TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY ("DealId", "ProductId")
);

CREATE TABLE dbo."ProductDim" (
    "ProductId" UUID PRIMARY KEY,
    "ProductName" VARCHAR(255),
    "SKU" VARCHAR(50),
    "Category" VARCHAR(100),
    "UnitPrice" DECIMAL(18,2),
    "IsActive" BOOLEAN,
    "LoadedAt" TIMESTAMP DEFAULT NOW()
);

CREATE TABLE dbo."CampaignDim" (
    "CampaignId" UUID PRIMARY KEY,
    "CampaignName" VARCHAR(255),
    "Type" VARCHAR(50),
    "Status" VARCHAR(50),
    "Budget" DECIMAL(18,2),
    "StartDate" DATE,
    "EndDate" DATE,
    "LoadedAt" TIMESTAMP DEFAULT NOW()
);

CREATE TABLE dbo."CampaignContactBridge" (
    "CampaignId" UUID,
    "ContactId" UUID,
    "ResponseStatus" VARCHAR(50),
    "RespondedOn" TIMESTAMP,
    "LoadedAt" TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY ("CampaignId", "ContactId")
);

CREATE TABLE dbo."AccountTagBridge" (
    "AccountId" UUID,
    "TagName" VARCHAR(100),
    "TagColor" VARCHAR(7),
    "LoadedAt" TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY ("AccountId", "TagName")
);

CREATE TABLE dbo."ActivityLog" (
    "ActivityId" UUID PRIMARY KEY,
    "Type" VARCHAR(50),
    "Subject" VARCHAR(255),
    "ContactId" UUID,
    "AccountId" UUID,
    "DealId" UUID,
    "DueDate" TIMESTAMP,
    "CompletedOn" TIMESTAMP,
    "LoadedAt" TIMESTAMP DEFAULT NOW()
);

CREATE TABLE dbo."TagDim" (
    "TagId" UUID PRIMARY KEY,
    "TagName" VARCHAR(100),
    "Color" VARCHAR(7),
    "LoadedAt" TIMESTAMP DEFAULT NOW()
);


-- ════════════════════════════════════════════════════════════════════════════
-- SCHEMA: ecommerce — E-Commerce warehouse tables (Project 2: E-Commerce Data Lake)
-- ════════════════════════════════════════════════════════════════════════════

CREATE SCHEMA IF NOT EXISTS ecommerce;

CREATE TABLE ecommerce.store_dim (
    store_id UUID PRIMARY KEY,
    store_name VARCHAR(255),
    slug VARCHAR(100),
    currency VARCHAR(3),
    country VARCHAR(100),
    timezone VARCHAR(50),
    status VARCHAR(50),
    loaded_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE ecommerce.product_dim (
    product_id UUID PRIMARY KEY,
    store_id UUID,
    product_name VARCHAR(255),
    slug VARCHAR(255),
    sku VARCHAR(50),
    price DECIMAL(18,2),
    compare_at_price DECIMAL(18,2),
    cost DECIMAL(18,2),
    margin_pct DECIMAL(5,2),
    vendor VARCHAR(255),
    status VARCHAR(50),
    loaded_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE ecommerce.variant_dim (
    variant_id UUID PRIMARY KEY,
    product_id UUID,
    variant_name VARCHAR(255),
    sku VARCHAR(50),
    price DECIMAL(18,2),
    inventory_qty INT,
    option1 VARCHAR(100),
    option2 VARCHAR(100),
    loaded_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE ecommerce.category_dim (
    category_id UUID PRIMARY KEY,
    category_name VARCHAR(255),
    slug VARCHAR(100),
    parent_id UUID,
    depth INT,
    loaded_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE ecommerce.product_category_bridge (
    product_id UUID,
    category_id UUID,
    sort_order INT,
    loaded_at TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (product_id, category_id)
);

CREATE TABLE ecommerce.product_tag_bridge (
    product_id UUID,
    tag_name VARCHAR(100),
    loaded_at TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (product_id, tag_name)
);

CREATE TABLE ecommerce.collection_dim (
    collection_id UUID PRIMARY KEY,
    collection_name VARCHAR(255),
    slug VARCHAR(100),
    store_id UUID,
    is_featured BOOLEAN,
    loaded_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE ecommerce.product_collection_bridge (
    product_id UUID,
    collection_id UUID,
    sort_order INT,
    loaded_at TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (product_id, collection_id)
);

CREATE TABLE ecommerce.customer_dim (
    customer_id UUID PRIMARY KEY,
    store_id UUID,
    email VARCHAR(255),
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    city VARCHAR(100),
    country VARCHAR(100),
    total_orders INT,
    lifetime_value DECIMAL(18,2),
    first_order_date TIMESTAMP,
    loaded_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE ecommerce.order_fact (
    order_id UUID PRIMARY KEY,
    store_id UUID,
    customer_id UUID,
    order_number VARCHAR(50),
    status VARCHAR(50),
    payment_status VARCHAR(50),
    subtotal DECIMAL(18,2),
    discount_total DECIMAL(18,2),
    tax_total DECIMAL(18,2),
    shipping_total DECIMAL(18,2),
    grand_total DECIMAL(18,2),
    shipping_city VARCHAR(100),
    shipping_country VARCHAR(100),
    order_date TIMESTAMP,
    shipped_date TIMESTAMP,
    delivered_date TIMESTAMP,
    loaded_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE ecommerce.order_item_fact (
    item_id UUID PRIMARY KEY,
    order_id UUID,
    product_id UUID,
    variant_id UUID,
    quantity INT,
    unit_price DECIMAL(18,2),
    discount DECIMAL(18,2),
    line_total DECIMAL(18,2),
    loaded_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE ecommerce.inventory_snapshot (
    product_id UUID,
    store_id UUID,
    inventory_qty INT,
    snapshot_date TIMESTAMP DEFAULT NOW(),
    loaded_at TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (product_id, store_id)
);

CREATE TABLE ecommerce.wishlist_fact (
    wishlist_id UUID,
    customer_id UUID,
    product_id UUID,
    wishlist_name VARCHAR(255),
    added_on TIMESTAMP,
    loaded_at TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (wishlist_id, product_id)
);
