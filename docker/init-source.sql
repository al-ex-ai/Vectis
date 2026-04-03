-- ============================================================================
-- Source CRM + E-Commerce databases for testing Vectis pipelines
-- Two schemas with rich many-to-many relationships
-- ============================================================================

-- ════════════════════════════════════════════════════════════════════════════
-- SCHEMA 1: CRM — Accounts, Contacts, Deals, Products, Campaigns
-- Many-to-many: contact_accounts, deal_products, campaign_contacts,
--               account_tags, deal_tags
-- ════════════════════════════════════════════════════════════════════════════

CREATE SCHEMA IF NOT EXISTS crm;

-- Dimension tables ---------------------------------------------------------

CREATE TABLE crm.tags (
    tag_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    color VARCHAR(7) DEFAULT '#6366f1',
    created_on TIMESTAMP DEFAULT NOW()
);

CREATE TABLE crm.accounts (
    account_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    industry VARCHAR(100),
    website VARCHAR(255),
    phone VARCHAR(50),
    email VARCHAR(255),
    annual_revenue DECIMAL(18,2),
    employee_count INT,
    city VARCHAR(100),
    country VARCHAR(100),
    status VARCHAR(50) DEFAULT 'active',
    created_on TIMESTAMP DEFAULT NOW(),
    modified_on TIMESTAMP DEFAULT NOW()
);

CREATE TABLE crm.contacts (
    contact_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    job_title VARCHAR(150),
    status VARCHAR(50) DEFAULT 'active',
    created_on TIMESTAMP DEFAULT NOW(),
    modified_on TIMESTAMP DEFAULT NOW()
);

CREATE TABLE crm.products (
    product_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    sku VARCHAR(50) UNIQUE,
    category VARCHAR(100),
    unit_price DECIMAL(18,2),
    is_active BOOLEAN DEFAULT true,
    created_on TIMESTAMP DEFAULT NOW()
);

CREATE TABLE crm.campaigns (
    campaign_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50),          -- email, webinar, event, ads
    status VARCHAR(50) DEFAULT 'planned',  -- planned, active, completed
    budget DECIMAL(18,2),
    start_date DATE,
    end_date DATE,
    created_on TIMESTAMP DEFAULT NOW()
);

CREATE TABLE crm.deals (
    deal_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    account_id UUID REFERENCES crm.accounts(account_id),
    owner_contact_id UUID REFERENCES crm.contacts(contact_id),
    stage VARCHAR(50) DEFAULT 'prospecting', -- prospecting, qualification, proposal, negotiation, closed_won, closed_lost
    amount DECIMAL(18,2),
    probability INT DEFAULT 10,
    expected_close DATE,
    actual_close DATE,
    source VARCHAR(100),       -- inbound, outbound, referral, partner
    created_on TIMESTAMP DEFAULT NOW(),
    modified_on TIMESTAMP DEFAULT NOW()
);

-- Many-to-many junction tables --------------------------------------------

-- M2M: contacts work across multiple accounts with different roles
CREATE TABLE crm.contact_accounts (
    contact_id UUID REFERENCES crm.contacts(contact_id),
    account_id UUID REFERENCES crm.accounts(account_id),
    role VARCHAR(100),         -- decision_maker, influencer, end_user, billing
    is_primary BOOLEAN DEFAULT false,
    since DATE DEFAULT CURRENT_DATE,
    PRIMARY KEY (contact_id, account_id)
);

-- M2M: deals contain multiple products, products appear in multiple deals
CREATE TABLE crm.deal_products (
    deal_id UUID REFERENCES crm.deals(deal_id),
    product_id UUID REFERENCES crm.products(product_id),
    quantity INT DEFAULT 1,
    discount_pct DECIMAL(5,2) DEFAULT 0,
    unit_price DECIMAL(18,2),
    line_total DECIMAL(18,2),
    PRIMARY KEY (deal_id, product_id)
);

-- M2M: contacts targeted by multiple campaigns
CREATE TABLE crm.campaign_contacts (
    campaign_id UUID REFERENCES crm.campaigns(campaign_id),
    contact_id UUID REFERENCES crm.contacts(contact_id),
    status VARCHAR(50) DEFAULT 'sent',  -- sent, opened, clicked, converted, bounced
    responded_on TIMESTAMP,
    PRIMARY KEY (campaign_id, contact_id)
);

-- M2M: accounts tagged with multiple tags
CREATE TABLE crm.account_tags (
    account_id UUID REFERENCES crm.accounts(account_id),
    tag_id UUID REFERENCES crm.tags(tag_id),
    PRIMARY KEY (account_id, tag_id)
);

-- M2M: deals tagged for pipeline filtering
CREATE TABLE crm.deal_tags (
    deal_id UUID REFERENCES crm.deals(deal_id),
    tag_id UUID REFERENCES crm.tags(tag_id),
    PRIMARY KEY (deal_id, tag_id)
);

-- Activities (references contacts + accounts)
CREATE TABLE crm.activities (
    activity_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type VARCHAR(50),          -- email, call, meeting, note, task
    subject VARCHAR(255),
    description TEXT,
    contact_id UUID REFERENCES crm.contacts(contact_id),
    account_id UUID REFERENCES crm.accounts(account_id),
    deal_id UUID REFERENCES crm.deals(deal_id),
    due_date TIMESTAMP,
    completed_on TIMESTAMP,
    created_on TIMESTAMP DEFAULT NOW()
);

-- ── CRM Seed Data ────────────────────────────────────────────────────────

INSERT INTO crm.tags (name, color) VALUES
('Enterprise', '#3b82f6'),
('Strategic', '#8b5cf6'),
('At Risk', '#ef4444'),
('Upsell', '#f59e0b'),
('New Business', '#10b981'),
('Partner', '#06b6d4'),
('Government', '#6366f1'),
('SMB', '#ec4899'),
('High Priority', '#dc2626'),
('Renewable', '#84cc16');

INSERT INTO crm.accounts (name, industry, website, phone, email, annual_revenue, employee_count, city, country) VALUES
('Acme Corp', 'Technology', 'https://acme.com', '+1-555-0100', 'info@acme.com', 5000000.00, 250, 'San Francisco', 'USA'),
('GlobalTech Inc', 'Technology', 'https://globaltech.io', '+1-555-0101', 'hello@globaltech.io', 12000000.00, 800, 'New York', 'USA'),
('EuroFinance AG', 'Finance', 'https://eurofinance.de', '+49-30-5550102', 'contact@eurofinance.de', 45000000.00, 2000, 'Berlin', 'Germany'),
('Pacific Trading', 'Retail', 'https://pacifictrading.co', '+81-3-5550103', 'sales@pacifictrading.co', 8000000.00, 400, 'Tokyo', 'Japan'),
('Nordic Solutions', 'Consulting', 'https://nordic.se', '+46-8-5550104', 'info@nordic.se', 3000000.00, 150, 'Stockholm', 'Sweden'),
('Maple Industries', 'Manufacturing', 'https://maple.ca', '+1-416-5550105', 'ops@maple.ca', 20000000.00, 1200, 'Toronto', 'Canada'),
('Sahara Ventures', 'Energy', 'https://sahara-v.com', '+971-4-5550106', 'invest@sahara-v.com', 75000000.00, 500, 'Dubai', 'UAE'),
('Southern Cross Ltd', 'Mining', 'https://southerncross.au', '+61-2-5550107', 'admin@southerncross.au', 30000000.00, 3000, 'Sydney', 'Australia'),
('Rhine Pharma', 'Healthcare', 'https://rhinepharma.ch', '+41-44-5550108', 'info@rhinepharma.ch', 60000000.00, 1800, 'Zurich', 'Switzerland'),
('Atlas Logistics', 'Transportation', 'https://atlas-log.com', '+44-20-5550109', 'ops@atlas-log.com', 15000000.00, 900, 'London', 'UK'),
('Crimson Media', 'Media', 'https://crimsonmedia.com', '+1-310-5550110', 'contact@crimsonmedia.com', 9500000.00, 320, 'Los Angeles', 'USA'),
('NovaBio Labs', 'Biotech', 'https://novabio.com', '+1-617-5550111', 'research@novabio.com', 35000000.00, 600, 'Boston', 'USA');

INSERT INTO crm.contacts (first_name, last_name, email, phone, job_title) VALUES
('John', 'Smith', 'john.smith@acme.com', '+1-555-1001', 'CEO'),
('Sarah', 'Johnson', 'sarah.johnson@globaltech.io', '+1-555-1002', 'CTO'),
('Michael', 'Brown', 'michael.brown@eurofinance.de', '+49-30-1003', 'VP Sales'),
('Emily', 'Davis', 'emily.davis@pacifictrading.co', '+81-3-1004', 'Director of Operations'),
('James', 'Wilson', 'james.wilson@nordic.se', '+46-8-1005', 'Managing Director'),
('Lisa', 'Chen', 'lisa.chen@maple.ca', '+1-416-1006', 'CFO'),
('Ahmed', 'Hassan', 'ahmed.hassan@sahara-v.com', '+971-4-1007', 'Head of Strategy'),
('Rachel', 'Taylor', 'rachel.taylor@southerncross.au', '+61-2-1008', 'CIO'),
('Thomas', 'Weber', 'thomas.weber@rhinepharma.ch', '+41-44-1009', 'VP Engineering'),
('Oliver', 'White', 'oliver.white@atlas-log.com', '+44-20-1010', 'COO'),
('Maria', 'Garcia', 'maria.garcia@acme.com', '+1-555-1011', 'VP Product'),
('David', 'Kim', 'david.kim@globaltech.io', '+1-555-1012', 'Head of Data'),
('Anna', 'Mueller', 'anna.mueller@eurofinance.de', '+49-30-1013', 'Risk Manager'),
('Yuki', 'Tanaka', 'yuki.tanaka@pacifictrading.co', '+81-3-1014', 'Supply Chain Lead'),
('Sophie', 'Larsson', 'sophie.larsson@nordic.se', '+46-8-1015', 'Senior Consultant'),
('Robert', 'Martin', 'robert.martin@maple.ca', '+1-416-1016', 'Plant Manager'),
('Fatima', 'Al-Rashid', 'fatima.alrashid@sahara-v.com', '+971-4-1017', 'Investment Director'),
('William', 'Ross', 'william.ross@southerncross.au', '+61-2-1018', 'Operations Manager'),
('Clara', 'Hofmann', 'clara.hofmann@rhinepharma.ch', '+41-44-1019', 'Head of R&D'),
('George', 'Baker', 'george.baker@atlas-log.com', '+44-20-1020', 'Fleet Director'),
('Priya', 'Patel', 'priya.patel@crimsonmedia.com', '+1-310-1021', 'Creative Director'),
('Marcus', 'Lee', 'marcus.lee@novabio.com', '+1-617-1022', 'Lab Director'),
('Ingrid', 'Bergstrom', 'ingrid.bergstrom@nordic.se', '+46-8-1023', 'Partner'),
('Daniel', 'O''Brien', 'daniel.obrien@acme.com', '+1-555-1024', 'Engineering Lead');

-- M2M: contact_accounts (contacts work across multiple accounts)
INSERT INTO crm.contact_accounts (contact_id, account_id, role, is_primary, since)
SELECT c.contact_id, a.account_id, r.role, r.is_primary, r.since::DATE
FROM crm.contacts c, crm.accounts a,
LATERAL (VALUES
    ('John', 'Smith', 'Acme Corp', 'decision_maker', true, '2021-03-15'),
    ('John', 'Smith', 'GlobalTech Inc', 'influencer', false, '2023-06-01'),
    ('Sarah', 'Johnson', 'GlobalTech Inc', 'decision_maker', true, '2020-09-01'),
    ('Sarah', 'Johnson', 'Acme Corp', 'influencer', false, '2022-11-10'),
    ('Michael', 'Brown', 'EuroFinance AG', 'decision_maker', true, '2019-01-20'),
    ('Emily', 'Davis', 'Pacific Trading', 'decision_maker', true, '2020-06-15'),
    ('Emily', 'Davis', 'Atlas Logistics', 'influencer', false, '2023-01-10'),
    ('James', 'Wilson', 'Nordic Solutions', 'decision_maker', true, '2018-04-01'),
    ('Lisa', 'Chen', 'Maple Industries', 'decision_maker', true, '2021-07-20'),
    ('Lisa', 'Chen', 'Southern Cross Ltd', 'billing', false, '2023-09-01'),
    ('Ahmed', 'Hassan', 'Sahara Ventures', 'decision_maker', true, '2020-02-15'),
    ('Rachel', 'Taylor', 'Southern Cross Ltd', 'decision_maker', true, '2019-11-01'),
    ('Thomas', 'Weber', 'Rhine Pharma', 'decision_maker', true, '2020-03-10'),
    ('Thomas', 'Weber', 'NovaBio Labs', 'influencer', false, '2024-01-15'),
    ('Oliver', 'White', 'Atlas Logistics', 'decision_maker', true, '2021-05-01'),
    ('Maria', 'Garcia', 'Acme Corp', 'end_user', true, '2022-01-15'),
    ('David', 'Kim', 'GlobalTech Inc', 'end_user', true, '2021-08-20'),
    ('Anna', 'Mueller', 'EuroFinance AG', 'end_user', true, '2020-05-01'),
    ('Yuki', 'Tanaka', 'Pacific Trading', 'end_user', true, '2021-02-10'),
    ('Sophie', 'Larsson', 'Nordic Solutions', 'end_user', true, '2019-06-01'),
    ('Robert', 'Martin', 'Maple Industries', 'end_user', true, '2022-03-15'),
    ('Fatima', 'Al-Rashid', 'Sahara Ventures', 'end_user', true, '2021-04-01'),
    ('William', 'Ross', 'Southern Cross Ltd', 'end_user', true, '2020-07-20'),
    ('Clara', 'Hofmann', 'Rhine Pharma', 'end_user', true, '2021-09-01'),
    ('George', 'Baker', 'Atlas Logistics', 'end_user', true, '2022-06-10'),
    ('Priya', 'Patel', 'Crimson Media', 'decision_maker', true, '2022-08-01'),
    ('Marcus', 'Lee', 'NovaBio Labs', 'decision_maker', true, '2021-10-15'),
    ('Ingrid', 'Bergstrom', 'Nordic Solutions', 'billing', false, '2019-06-01'),
    ('Ingrid', 'Bergstrom', 'EuroFinance AG', 'influencer', false, '2023-03-20'),
    ('Daniel', 'O''Brien', 'Acme Corp', 'end_user', true, '2023-02-01'),
    ('Daniel', 'O''Brien', 'Crimson Media', 'influencer', false, '2024-04-15')
) AS r(fn, ln, acc_name, role, is_primary, since)
WHERE c.first_name = r.fn AND c.last_name = r.ln AND a.name = r.acc_name;

INSERT INTO crm.products (name, sku, category, unit_price) VALUES
('Enterprise License', 'ENT-001', 'Software', 50000.00),
('Professional License', 'PRO-001', 'Software', 15000.00),
('Basic License', 'BAS-001', 'Software', 5000.00),
('Premium Support', 'SUP-001', 'Services', 12000.00),
('Implementation Package', 'IMP-001', 'Services', 25000.00),
('Training (per seat)', 'TRN-001', 'Services', 2000.00),
('Data Migration', 'MIG-001', 'Services', 8000.00),
('API Access', 'API-001', 'Add-ons', 3000.00),
('SSO Integration', 'SSO-001', 'Add-ons', 5000.00),
('Custom Reports', 'RPT-001', 'Add-ons', 4000.00),
('White-Label Module', 'WHL-001', 'Add-ons', 20000.00),
('Compliance Pack', 'CMP-001', 'Add-ons', 8000.00);

-- Campaigns
INSERT INTO crm.campaigns (name, type, status, budget, start_date, end_date) VALUES
('Q1 Product Launch', 'email', 'completed', 15000.00, '2025-01-15', '2025-02-28'),
('Spring Webinar Series', 'webinar', 'completed', 8000.00, '2025-03-01', '2025-04-15'),
('Enterprise Summit 2025', 'event', 'completed', 45000.00, '2025-05-10', '2025-05-12'),
('Summer Digital Ads', 'ads', 'completed', 25000.00, '2025-06-01', '2025-08-31'),
('Partner Referral Program', 'email', 'active', 10000.00, '2025-09-01', '2025-12-31'),
('Year-End Promo', 'email', 'active', 12000.00, '2025-11-15', '2025-12-31'),
('AI Features Preview', 'webinar', 'planned', 5000.00, '2026-01-20', '2026-01-20'),
('Global User Conference', 'event', 'planned', 80000.00, '2026-04-15', '2026-04-17');

-- Deals (referencing accounts and contacts)
INSERT INTO crm.deals (name, account_id, owner_contact_id, stage, amount, probability, expected_close, actual_close, source)
SELECT d.deal_name, a.account_id, c.contact_id, d.stage, d.amount, d.probability,
       d.expected_close::DATE, d.actual_close, d.source
FROM crm.accounts a
JOIN crm.contacts c ON TRUE
CROSS JOIN LATERAL (VALUES
    ('Acme Corp', 'John', 'Smith', 'Acme Enterprise Renewal', 'closed_won', 150000.00, 90, '2025-06-30', '2025-06-15'::DATE, 'inbound'),
    ('Acme Corp', 'Maria', 'Garcia', 'Acme API Expansion', 'closed_won', 35000.00, 85, '2025-09-15', '2025-09-10'::DATE, 'upsell'),
    ('GlobalTech Inc', 'Sarah', 'Johnson', 'GlobalTech Platform Deal', 'closed_won', 280000.00, 95, '2025-04-30', '2025-04-22'::DATE, 'outbound'),
    ('GlobalTech Inc', 'David', 'Kim', 'GlobalTech Data Migration', 'closed_won', 45000.00, 80, '2025-07-15', '2025-07-12'::DATE, 'referral'),
    ('EuroFinance AG', 'Michael', 'Brown', 'EuroFinance Compliance Suite', 'negotiation', 320000.00, 70, '2026-03-31', NULL, 'inbound'),
    ('EuroFinance AG', 'Anna', 'Mueller', 'EuroFinance Risk Module', 'proposal', 95000.00, 50, '2026-05-15', NULL, 'partner'),
    ('Pacific Trading', 'Emily', 'Davis', 'Pacific Trading Integration', 'closed_won', 120000.00, 90, '2025-08-31', '2025-08-28'::DATE, 'outbound'),
    ('Nordic Solutions', 'James', 'Wilson', 'Nordic Consulting License', 'closed_won', 75000.00, 85, '2025-05-15', '2025-05-10'::DATE, 'referral'),
    ('Nordic Solutions', 'Sophie', 'Larsson', 'Nordic Training Package', 'closed_won', 24000.00, 90, '2025-10-31', '2025-10-25'::DATE, 'upsell'),
    ('Maple Industries', 'Lisa', 'Chen', 'Maple Manufacturing Suite', 'qualification', 210000.00, 40, '2026-06-30', NULL, 'inbound'),
    ('Sahara Ventures', 'Ahmed', 'Hassan', 'Sahara Enterprise Deal', 'closed_won', 450000.00, 95, '2025-03-31', '2025-03-20'::DATE, 'outbound'),
    ('Southern Cross Ltd', 'Rachel', 'Taylor', 'Southern Cross Migration', 'closed_won', 185000.00, 90, '2025-11-30', '2025-11-22'::DATE, 'inbound'),
    ('Rhine Pharma', 'Thomas', 'Weber', 'Rhine Pharma Compliance', 'proposal', 275000.00, 60, '2026-04-30', NULL, 'partner'),
    ('Atlas Logistics', 'Oliver', 'White', 'Atlas Fleet Integration', 'closed_won', 95000.00, 85, '2025-07-31', '2025-07-28'::DATE, 'outbound'),
    ('Crimson Media', 'Priya', 'Patel', 'Crimson Creative Platform', 'negotiation', 140000.00, 65, '2026-05-31', NULL, 'inbound'),
    ('NovaBio Labs', 'Marcus', 'Lee', 'NovaBio Research License', 'prospecting', 195000.00, 25, '2026-08-31', NULL, 'referral')
) AS d(acc_name, cfn, cln, deal_name, stage, amount, probability, expected_close, actual_close, source)
WHERE a.name = d.acc_name AND c.first_name = d.cfn AND c.last_name = d.cln;

-- M2M: deal_products (each deal bundles multiple products)
INSERT INTO crm.deal_products (deal_id, product_id, quantity, discount_pct, unit_price, line_total)
SELECT d.deal_id, p.product_id, dp.qty, dp.discount, p.unit_price,
       (p.unit_price * dp.qty * (1 - dp.discount / 100))::DECIMAL(18,2)
FROM crm.deals d
JOIN crm.products p ON TRUE
CROSS JOIN LATERAL (VALUES
    ('Acme Enterprise Renewal', 'ENT-001', 3, 10.00),
    ('Acme Enterprise Renewal', 'SUP-001', 3, 0.00),
    ('Acme Enterprise Renewal', 'SSO-001', 1, 0.00),
    ('Acme API Expansion', 'API-001', 5, 15.00),
    ('Acme API Expansion', 'RPT-001', 2, 0.00),
    ('GlobalTech Platform Deal', 'ENT-001', 5, 12.00),
    ('GlobalTech Platform Deal', 'IMP-001', 1, 0.00),
    ('GlobalTech Platform Deal', 'SUP-001', 5, 5.00),
    ('GlobalTech Platform Deal', 'WHL-001', 1, 0.00),
    ('GlobalTech Data Migration', 'MIG-001', 3, 0.00),
    ('GlobalTech Data Migration', 'TRN-001', 10, 20.00),
    ('EuroFinance Compliance Suite', 'ENT-001', 4, 8.00),
    ('EuroFinance Compliance Suite', 'CMP-001', 4, 0.00),
    ('EuroFinance Compliance Suite', 'SUP-001', 4, 0.00),
    ('EuroFinance Compliance Suite', 'SSO-001', 1, 0.00),
    ('EuroFinance Risk Module', 'PRO-001', 6, 10.00),
    ('EuroFinance Risk Module', 'RPT-001', 6, 5.00),
    ('Pacific Trading Integration', 'PRO-001', 8, 10.00),
    ('Pacific Trading Integration', 'IMP-001', 1, 0.00),
    ('Pacific Trading Integration', 'API-001', 3, 0.00),
    ('Nordic Consulting License', 'PRO-001', 5, 0.00),
    ('Nordic Consulting License', 'TRN-001', 15, 25.00),
    ('Nordic Training Package', 'TRN-001', 12, 15.00),
    ('Maple Manufacturing Suite', 'ENT-001', 3, 5.00),
    ('Maple Manufacturing Suite', 'IMP-001', 2, 0.00),
    ('Maple Manufacturing Suite', 'MIG-001', 2, 0.00),
    ('Maple Manufacturing Suite', 'SUP-001', 3, 0.00),
    ('Sahara Enterprise Deal', 'ENT-001', 8, 15.00),
    ('Sahara Enterprise Deal', 'IMP-001', 2, 10.00),
    ('Sahara Enterprise Deal', 'SUP-001', 8, 10.00),
    ('Sahara Enterprise Deal', 'WHL-001', 2, 5.00),
    ('Sahara Enterprise Deal', 'CMP-001', 2, 0.00),
    ('Southern Cross Migration', 'MIG-001', 5, 10.00),
    ('Southern Cross Migration', 'PRO-001', 10, 12.00),
    ('Southern Cross Migration', 'TRN-001', 20, 20.00),
    ('Rhine Pharma Compliance', 'ENT-001', 3, 0.00),
    ('Rhine Pharma Compliance', 'CMP-001', 3, 0.00),
    ('Rhine Pharma Compliance', 'SUP-001', 3, 0.00),
    ('Rhine Pharma Compliance', 'SSO-001', 1, 0.00),
    ('Atlas Fleet Integration', 'PRO-001', 6, 8.00),
    ('Atlas Fleet Integration', 'API-001', 6, 5.00),
    ('Atlas Fleet Integration', 'IMP-001', 1, 0.00),
    ('Crimson Creative Platform', 'PRO-001', 4, 0.00),
    ('Crimson Creative Platform', 'WHL-001', 1, 10.00),
    ('Crimson Creative Platform', 'RPT-001', 4, 0.00),
    ('NovaBio Research License', 'ENT-001', 2, 0.00),
    ('NovaBio Research License', 'CMP-001', 2, 0.00),
    ('NovaBio Research License', 'API-001', 4, 0.00)
) AS dp(deal_name, sku, qty, discount)
WHERE d.name = dp.deal_name AND p.sku = dp.sku;

-- M2M: campaign_contacts (contacts targeted by multiple campaigns)
INSERT INTO crm.campaign_contacts (campaign_id, contact_id, status, responded_on)
SELECT camp.campaign_id, c.contact_id, cc.status,
       CASE WHEN cc.status IN ('opened','clicked','converted') THEN camp.start_date + (RANDOM() * 14 || ' days')::INTERVAL ELSE NULL END
FROM crm.campaigns camp
JOIN crm.contacts c ON TRUE
CROSS JOIN LATERAL (VALUES
    ('Q1 Product Launch', 'John', 'Smith', 'converted'),
    ('Q1 Product Launch', 'Sarah', 'Johnson', 'clicked'),
    ('Q1 Product Launch', 'Michael', 'Brown', 'opened'),
    ('Q1 Product Launch', 'Lisa', 'Chen', 'sent'),
    ('Q1 Product Launch', 'Ahmed', 'Hassan', 'converted'),
    ('Q1 Product Launch', 'Thomas', 'Weber', 'opened'),
    ('Spring Webinar Series', 'Sarah', 'Johnson', 'converted'),
    ('Spring Webinar Series', 'Emily', 'Davis', 'clicked'),
    ('Spring Webinar Series', 'James', 'Wilson', 'converted'),
    ('Spring Webinar Series', 'Rachel', 'Taylor', 'clicked'),
    ('Spring Webinar Series', 'David', 'Kim', 'opened'),
    ('Spring Webinar Series', 'Priya', 'Patel', 'opened'),
    ('Enterprise Summit 2025', 'John', 'Smith', 'converted'),
    ('Enterprise Summit 2025', 'Sarah', 'Johnson', 'converted'),
    ('Enterprise Summit 2025', 'Michael', 'Brown', 'converted'),
    ('Enterprise Summit 2025', 'Ahmed', 'Hassan', 'converted'),
    ('Enterprise Summit 2025', 'Rachel', 'Taylor', 'clicked'),
    ('Enterprise Summit 2025', 'Oliver', 'White', 'converted'),
    ('Enterprise Summit 2025', 'Marcus', 'Lee', 'clicked'),
    ('Enterprise Summit 2025', 'Ingrid', 'Bergstrom', 'converted'),
    ('Summer Digital Ads', 'Emily', 'Davis', 'clicked'),
    ('Summer Digital Ads', 'Yuki', 'Tanaka', 'opened'),
    ('Summer Digital Ads', 'Sophie', 'Larsson', 'clicked'),
    ('Summer Digital Ads', 'Robert', 'Martin', 'opened'),
    ('Summer Digital Ads', 'Priya', 'Patel', 'converted'),
    ('Summer Digital Ads', 'Marcus', 'Lee', 'clicked'),
    ('Partner Referral Program', 'James', 'Wilson', 'converted'),
    ('Partner Referral Program', 'Ingrid', 'Bergstrom', 'converted'),
    ('Partner Referral Program', 'Michael', 'Brown', 'opened'),
    ('Partner Referral Program', 'Thomas', 'Weber', 'clicked'),
    ('Year-End Promo', 'John', 'Smith', 'opened'),
    ('Year-End Promo', 'Lisa', 'Chen', 'clicked'),
    ('Year-End Promo', 'Fatima', 'Al-Rashid', 'opened'),
    ('Year-End Promo', 'Clara', 'Hofmann', 'sent'),
    ('Year-End Promo', 'George', 'Baker', 'opened'),
    ('Year-End Promo', 'Daniel', 'O''Brien', 'clicked')
) AS cc(camp_name, cfn, cln, status)
WHERE camp.name = cc.camp_name AND c.first_name = cc.cfn AND c.last_name = cc.cln;

-- M2M: account_tags
INSERT INTO crm.account_tags (account_id, tag_id)
SELECT a.account_id, t.tag_id
FROM crm.accounts a
JOIN crm.tags t ON TRUE
CROSS JOIN LATERAL (VALUES
    ('Acme Corp', 'Enterprise'),
    ('Acme Corp', 'Strategic'),
    ('Acme Corp', 'Upsell'),
    ('GlobalTech Inc', 'Enterprise'),
    ('GlobalTech Inc', 'Strategic'),
    ('GlobalTech Inc', 'Partner'),
    ('EuroFinance AG', 'Enterprise'),
    ('EuroFinance AG', 'High Priority'),
    ('EuroFinance AG', 'Government'),
    ('Pacific Trading', 'SMB'),
    ('Pacific Trading', 'New Business'),
    ('Nordic Solutions', 'Partner'),
    ('Nordic Solutions', 'Renewable'),
    ('Maple Industries', 'Enterprise'),
    ('Maple Industries', 'New Business'),
    ('Sahara Ventures', 'Enterprise'),
    ('Sahara Ventures', 'Strategic'),
    ('Sahara Ventures', 'High Priority'),
    ('Southern Cross Ltd', 'Enterprise'),
    ('Southern Cross Ltd', 'Upsell'),
    ('Rhine Pharma', 'Enterprise'),
    ('Rhine Pharma', 'High Priority'),
    ('Atlas Logistics', 'SMB'),
    ('Atlas Logistics', 'Renewable'),
    ('Crimson Media', 'New Business'),
    ('Crimson Media', 'SMB'),
    ('NovaBio Labs', 'New Business'),
    ('NovaBio Labs', 'Strategic')
) AS at(acc_name, tag_name)
WHERE a.name = at.acc_name AND t.name = at.tag_name;

-- M2M: deal_tags
INSERT INTO crm.deal_tags (deal_id, tag_id)
SELECT d.deal_id, t.tag_id
FROM crm.deals d
JOIN crm.tags t ON TRUE
CROSS JOIN LATERAL (VALUES
    ('Acme Enterprise Renewal', 'Enterprise'),
    ('Acme Enterprise Renewal', 'Renewable'),
    ('Acme API Expansion', 'Upsell'),
    ('GlobalTech Platform Deal', 'Enterprise'),
    ('GlobalTech Platform Deal', 'Strategic'),
    ('EuroFinance Compliance Suite', 'Enterprise'),
    ('EuroFinance Compliance Suite', 'High Priority'),
    ('Pacific Trading Integration', 'New Business'),
    ('Sahara Enterprise Deal', 'Enterprise'),
    ('Sahara Enterprise Deal', 'Strategic'),
    ('Sahara Enterprise Deal', 'High Priority'),
    ('Southern Cross Migration', 'Enterprise'),
    ('Rhine Pharma Compliance', 'Enterprise'),
    ('Rhine Pharma Compliance', 'High Priority'),
    ('Atlas Fleet Integration', 'SMB'),
    ('Crimson Creative Platform', 'New Business'),
    ('NovaBio Research License', 'New Business'),
    ('NovaBio Research License', 'Strategic')
) AS dt(deal_name, tag_name)
WHERE d.name = dt.deal_name AND t.name = dt.tag_name;

-- Activities
INSERT INTO crm.activities (type, subject, contact_id, account_id, deal_id, due_date, completed_on)
SELECT a.type, a.subject, c.contact_id, acc.account_id, d.deal_id,
       (NOW() - (RANDOM() * 90 || ' days')::INTERVAL),
       (NOW() - (RANDOM() * 90 || ' days')::INTERVAL)
FROM crm.contacts c
JOIN crm.contact_accounts ca ON ca.contact_id = c.contact_id AND ca.is_primary = true
JOIN crm.accounts acc ON acc.account_id = ca.account_id
LEFT JOIN crm.deals d ON d.account_id = acc.account_id
CROSS JOIN LATERAL (VALUES
    ('email', 'Follow-up on proposal'),
    ('call', 'Quarterly review call'),
    ('meeting', 'Product demo session'),
    ('note', 'Updated requirements doc')
) AS a(type, subject)
WHERE d.deal_id IS NOT NULL
LIMIT 60;


-- ════════════════════════════════════════════════════════════════════════════
-- SCHEMA 2: ECOMMERCE — Multi-tenant store, products, categories, orders
-- Many-to-many: product_categories, product_tags, order_items,
--               wishlist_products, product_collections
-- ════════════════════════════════════════════════════════════════════════════

CREATE SCHEMA IF NOT EXISTS ecommerce;

-- Dimension tables ---------------------------------------------------------

CREATE TABLE ecommerce.stores (
    store_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE,
    currency VARCHAR(3) DEFAULT 'USD',
    country VARCHAR(100),
    timezone VARCHAR(50),
    status VARCHAR(50) DEFAULT 'active',
    created_on TIMESTAMP DEFAULT NOW()
);

CREATE TABLE ecommerce.categories (
    category_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE,
    parent_id UUID REFERENCES ecommerce.categories(category_id),
    depth INT DEFAULT 0,
    sort_order INT DEFAULT 0,
    created_on TIMESTAMP DEFAULT NOW()
);

CREATE TABLE ecommerce.tags (
    tag_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    created_on TIMESTAMP DEFAULT NOW()
);

CREATE TABLE ecommerce.collections (
    collection_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE,
    description TEXT,
    store_id UUID REFERENCES ecommerce.stores(store_id),
    is_featured BOOLEAN DEFAULT false,
    created_on TIMESTAMP DEFAULT NOW()
);

CREATE TABLE ecommerce.customers (
    customer_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID REFERENCES ecommerce.stores(store_id),
    email VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    phone VARCHAR(50),
    city VARCHAR(100),
    country VARCHAR(100),
    total_orders INT DEFAULT 0,
    total_spent DECIMAL(18,2) DEFAULT 0,
    created_on TIMESTAMP DEFAULT NOW()
);

CREATE TABLE ecommerce.products (
    product_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID REFERENCES ecommerce.stores(store_id),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255),
    sku VARCHAR(50),
    description TEXT,
    price DECIMAL(18,2),
    compare_at_price DECIMAL(18,2),
    cost DECIMAL(18,2),
    inventory_qty INT DEFAULT 0,
    weight DECIMAL(10,2),
    status VARCHAR(50) DEFAULT 'active',    -- active, draft, archived
    vendor VARCHAR(255),
    created_on TIMESTAMP DEFAULT NOW(),
    modified_on TIMESTAMP DEFAULT NOW()
);

CREATE TABLE ecommerce.product_variants (
    variant_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES ecommerce.products(product_id),
    name VARCHAR(255),
    sku VARCHAR(50),
    price DECIMAL(18,2),
    inventory_qty INT DEFAULT 0,
    option1 VARCHAR(100),    -- e.g. "Red"
    option2 VARCHAR(100),    -- e.g. "Large"
    sort_order INT DEFAULT 0,
    created_on TIMESTAMP DEFAULT NOW()
);

CREATE TABLE ecommerce.orders (
    order_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID REFERENCES ecommerce.stores(store_id),
    customer_id UUID REFERENCES ecommerce.customers(customer_id),
    order_number VARCHAR(50) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',   -- pending, confirmed, shipped, delivered, cancelled
    payment_status VARCHAR(50) DEFAULT 'pending', -- pending, paid, refunded, partially_refunded
    subtotal DECIMAL(18,2),
    discount_total DECIMAL(18,2) DEFAULT 0,
    tax_total DECIMAL(18,2) DEFAULT 0,
    shipping_total DECIMAL(18,2) DEFAULT 0,
    grand_total DECIMAL(18,2),
    shipping_city VARCHAR(100),
    shipping_country VARCHAR(100),
    order_date TIMESTAMP DEFAULT NOW(),
    shipped_date TIMESTAMP,
    delivered_date TIMESTAMP,
    created_on TIMESTAMP DEFAULT NOW()
);

CREATE TABLE ecommerce.wishlists (
    wishlist_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES ecommerce.customers(customer_id),
    name VARCHAR(255) DEFAULT 'My Wishlist',
    created_on TIMESTAMP DEFAULT NOW()
);

-- Many-to-many junction tables --------------------------------------------

-- M2M: products belong to multiple categories
CREATE TABLE ecommerce.product_categories (
    product_id UUID REFERENCES ecommerce.products(product_id),
    category_id UUID REFERENCES ecommerce.categories(category_id),
    sort_order INT DEFAULT 0,
    PRIMARY KEY (product_id, category_id)
);

-- M2M: products tagged with multiple tags
CREATE TABLE ecommerce.product_tags (
    product_id UUID REFERENCES ecommerce.products(product_id),
    tag_id UUID REFERENCES ecommerce.tags(tag_id),
    PRIMARY KEY (product_id, tag_id)
);

-- M2M: products in multiple collections, collections have multiple products
CREATE TABLE ecommerce.product_collections (
    product_id UUID REFERENCES ecommerce.products(product_id),
    collection_id UUID REFERENCES ecommerce.collections(collection_id),
    sort_order INT DEFAULT 0,
    PRIMARY KEY (product_id, collection_id)
);

-- M2M: order line items (orders contain products, products in many orders)
CREATE TABLE ecommerce.order_items (
    item_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES ecommerce.orders(order_id),
    product_id UUID REFERENCES ecommerce.products(product_id),
    variant_id UUID REFERENCES ecommerce.product_variants(variant_id),
    quantity INT NOT NULL DEFAULT 1,
    unit_price DECIMAL(18,2),
    discount DECIMAL(18,2) DEFAULT 0,
    line_total DECIMAL(18,2),
    created_on TIMESTAMP DEFAULT NOW()
);

-- M2M: wishlist products
CREATE TABLE ecommerce.wishlist_products (
    wishlist_id UUID REFERENCES ecommerce.wishlists(wishlist_id),
    product_id UUID REFERENCES ecommerce.products(product_id),
    added_on TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (wishlist_id, product_id)
);

-- ── E-Commerce Seed Data ─────────────────────────────────────────────────

INSERT INTO ecommerce.stores (name, slug, currency, country, timezone) VALUES
('TechGear US', 'techgear-us', 'USD', 'USA', 'America/New_York'),
('TechGear EU', 'techgear-eu', 'EUR', 'Germany', 'Europe/Berlin'),
('TechGear UK', 'techgear-uk', 'GBP', 'UK', 'Europe/London');

-- Hierarchical categories (parent -> child)
INSERT INTO ecommerce.categories (name, slug, depth, sort_order) VALUES
('Electronics', 'electronics', 0, 1),
('Audio', 'audio', 0, 2),
('Accessories', 'accessories', 0, 3),
('Gaming', 'gaming', 0, 4),
('Office', 'office', 0, 5);

INSERT INTO ecommerce.categories (name, slug, parent_id, depth, sort_order)
SELECT child.name, child.slug, p.category_id, 1, child.sort_order
FROM ecommerce.categories p
CROSS JOIN LATERAL (VALUES
    ('Electronics', 'Laptops', 'laptops', 1),
    ('Electronics', 'Phones', 'phones', 2),
    ('Electronics', 'Tablets', 'tablets', 3),
    ('Audio', 'Headphones', 'headphones', 1),
    ('Audio', 'Speakers', 'speakers', 2),
    ('Audio', 'Microphones', 'microphones', 3),
    ('Accessories', 'Cases', 'cases', 1),
    ('Accessories', 'Chargers', 'chargers', 2),
    ('Accessories', 'Cables', 'cables', 3),
    ('Gaming', 'Controllers', 'controllers', 1),
    ('Gaming', 'Keyboards', 'keyboards', 2),
    ('Gaming', 'Mice', 'mice', 3),
    ('Office', 'Monitors', 'monitors', 1),
    ('Office', 'Desks', 'desks', 2),
    ('Office', 'Chairs', 'chairs', 3)
) AS child(parent_name, name, slug, sort_order)
WHERE p.name = child.parent_name AND p.parent_id IS NULL;

INSERT INTO ecommerce.tags (name) VALUES
('bestseller'), ('new-arrival'), ('on-sale'), ('limited-edition'),
('eco-friendly'), ('premium'), ('budget'), ('wireless'),
('usb-c'), ('bluetooth'), ('noise-cancelling'), ('ergonomic'),
('portable'), ('pro'), ('gaming'), ('office');

-- Products across stores
INSERT INTO ecommerce.products (store_id, name, slug, sku, description, price, compare_at_price, cost, inventory_qty, weight, status, vendor)
SELECT s.store_id, p.name, p.slug, p.sku || '-' || s.slug, p.description, p.price, p.compare_at, p.cost, p.inv, p.weight, 'active', p.vendor
FROM ecommerce.stores s
CROSS JOIN LATERAL (VALUES
    ('ProBook Laptop 15"',    'probook-laptop-15',    'LAP-001', 'High-performance laptop with 32GB RAM', 1299.99, 1499.99, 850.00, 45, 2.1, 'ProTech'),
    ('ProBook Laptop 13"',    'probook-laptop-13',    'LAP-002', 'Ultralight laptop for professionals',    999.99, NULL,     650.00, 60, 1.4, 'ProTech'),
    ('CloudPhone X',          'cloudphone-x',         'PHN-001', 'Flagship phone with 108MP camera',       899.99, NULL,     520.00, 120, 0.19, 'CloudMobile'),
    ('CloudPhone Lite',       'cloudphone-lite',       'PHN-002', 'Budget-friendly smartphone',             349.99, 399.99,  180.00, 200, 0.17, 'CloudMobile'),
    ('TabletMax Pro',         'tabletmax-pro',        'TAB-001', '12.9" tablet with stylus support',       749.99, NULL,     450.00, 35, 0.68, 'ProTech'),
    ('SoundWave Pro',         'soundwave-pro',        'AUD-001', 'Premium noise-cancelling headphones',    349.99, NULL,     120.00, 80, 0.25, 'SoundCo'),
    ('SoundWave Buds',        'soundwave-buds',       'AUD-002', 'True wireless earbuds',                  129.99, 149.99,   45.00, 150, 0.05, 'SoundCo'),
    ('BassBox Speaker',       'bassbox-speaker',      'AUD-003', 'Portable Bluetooth speaker',             199.99, NULL,      85.00, 70, 0.8, 'SoundCo'),
    ('StudioMic USB',         'studiomic-usb',        'AUD-004', 'Professional USB condenser microphone',  179.99, NULL,      65.00, 40, 0.45, 'AudioPro'),
    ('ShieldCase Universal',  'shieldcase-universal', 'ACC-001', 'Rugged protective case',                  39.99, NULL,      12.00, 300, 0.1, 'ShieldTech'),
    ('PowerCharge 65W',       'powercharge-65w',      'ACC-002', 'GaN USB-C fast charger',                  49.99, 59.99,    18.00, 180, 0.12, 'PowerUp'),
    ('FlexCable USB-C 2m',    'flexcable-usbc-2m',    'ACC-003', 'Braided USB-C cable',                     14.99, NULL,       4.00, 500, 0.05, 'PowerUp'),
    ('GamePad Elite',         'gamepad-elite',        'GAM-001', 'Wireless gaming controller',             69.99, NULL,      28.00, 90, 0.28, 'GameZone'),
    ('MechBoard RGB',         'mechboard-rgb',        'GAM-002', 'Mechanical gaming keyboard',             149.99, NULL,      55.00, 55, 0.95, 'GameZone'),
    ('PrecisionMouse X',      'precisionmouse-x',     'GAM-003', 'Lightweight gaming mouse',               79.99, NULL,      30.00, 110, 0.06, 'GameZone'),
    ('UltraWide 34"',         'ultrawide-34',         'OFF-001', '34" curved ultrawide monitor',           599.99, 699.99,  350.00, 25, 7.5, 'ViewMax'),
    ('StandDesk Pro',         'standdesk-pro',        'OFF-002', 'Electric sit/stand desk',                449.99, NULL,     220.00, 15, 30.0, 'OfficeWorks'),
    ('ErgoChair Mesh',        'ergochair-mesh',       'OFF-003', 'Ergonomic mesh office chair',            399.99, 499.99,  180.00, 20, 15.0, 'OfficeWorks')
) AS p(name, slug, sku, description, price, compare_at, cost, inv, weight, vendor)
WHERE s.slug = 'techgear-us';

-- Add subset of products to EU and UK stores
INSERT INTO ecommerce.products (store_id, name, slug, sku, description, price, compare_at_price, cost, inventory_qty, weight, status, vendor)
SELECT s.store_id, p.name, p.slug, p.sku || '-' || s.slug, p.description,
       (p.price * CASE WHEN s.slug='techgear-eu' THEN 0.92 ELSE 0.79 END)::DECIMAL(18,2),
       NULL, (p.cost * 0.9)::DECIMAL(18,2), (p.inventory_qty * 0.6)::INT, p.weight, 'active', p.vendor
FROM ecommerce.stores s
JOIN ecommerce.products p ON p.store_id = (SELECT store_id FROM ecommerce.stores WHERE slug = 'techgear-us')
WHERE s.slug IN ('techgear-eu', 'techgear-uk')
AND p.sku LIKE '%-techgear-us'
AND p.name IN ('ProBook Laptop 15"', 'CloudPhone X', 'SoundWave Pro', 'SoundWave Buds', 'UltraWide 34"', 'GamePad Elite', 'MechBoard RGB', 'ErgoChair Mesh');

-- Product variants (for select products)
INSERT INTO ecommerce.product_variants (product_id, name, sku, price, inventory_qty, option1, option2, sort_order)
SELECT p.product_id, v.vname, p.sku || '-' || v.opt1_code, (p.price + v.price_adj)::DECIMAL(18,2), v.inv, v.opt1, v.opt2, v.sort
FROM ecommerce.products p
CROSS JOIN LATERAL (VALUES
    ('ProBook Laptop 15"', 'techgear-us', '16GB / 512GB', 'S1', -200.00, 20, '16GB RAM', '512GB SSD', 1),
    ('ProBook Laptop 15"', 'techgear-us', '32GB / 1TB',   'S2', 0.00,    15, '32GB RAM', '1TB SSD', 2),
    ('ProBook Laptop 15"', 'techgear-us', '64GB / 2TB',   'S3', 400.00,  10, '64GB RAM', '2TB SSD', 3),
    ('CloudPhone X', 'techgear-us', '128GB Black',  'BK128', 0.00,   40, 'Black', '128GB', 1),
    ('CloudPhone X', 'techgear-us', '128GB Silver', 'SV128', 0.00,   35, 'Silver', '128GB', 2),
    ('CloudPhone X', 'techgear-us', '256GB Black',  'BK256', 100.00, 25, 'Black', '256GB', 3),
    ('CloudPhone X', 'techgear-us', '256GB Silver', 'SV256', 100.00, 20, 'Silver', '256GB', 4),
    ('SoundWave Pro', 'techgear-us', 'Midnight Black', 'BLK', 0.00,   30, 'Midnight Black', NULL, 1),
    ('SoundWave Pro', 'techgear-us', 'Arctic White',   'WHT', 0.00,   25, 'Arctic White', NULL, 2),
    ('SoundWave Pro', 'techgear-us', 'Navy Blue',      'NVY', 0.00,   25, 'Navy Blue', NULL, 3),
    ('ShieldCase Universal', 'techgear-us', 'Phone',   'PH', -10.00, 100, 'Phone', NULL, 1),
    ('ShieldCase Universal', 'techgear-us', 'Tablet',  'TB', 5.00,   80, 'Tablet', NULL, 2),
    ('ShieldCase Universal', 'techgear-us', 'Laptop',  'LP', 15.00,  60, 'Laptop', NULL, 3)
) AS v(pname, store_slug, vname, opt1_code, price_adj, inv, opt1, opt2, sort)
WHERE p.name = v.pname AND p.sku LIKE '%-' || v.store_slug;

-- M2M: product_categories
INSERT INTO ecommerce.product_categories (product_id, category_id, sort_order)
SELECT p.product_id, cat.category_id, pc.sort
FROM ecommerce.products p
CROSS JOIN LATERAL (VALUES
    ('ProBook Laptop 15"',    'laptops', 1),
    ('ProBook Laptop 15"',    'office', 2),
    ('ProBook Laptop 13"',    'laptops', 1),
    ('ProBook Laptop 13"',    'office', 2),
    ('CloudPhone X',          'phones', 1),
    ('CloudPhone Lite',       'phones', 1),
    ('TabletMax Pro',         'tablets', 1),
    ('TabletMax Pro',         'office', 2),
    ('SoundWave Pro',         'headphones', 1),
    ('SoundWave Pro',         'office', 3),
    ('SoundWave Buds',        'headphones', 1),
    ('BassBox Speaker',       'speakers', 1),
    ('StudioMic USB',         'microphones', 1),
    ('StudioMic USB',         'office', 2),
    ('ShieldCase Universal',  'cases', 1),
    ('PowerCharge 65W',       'chargers', 1),
    ('FlexCable USB-C 2m',    'cables', 1),
    ('GamePad Elite',         'controllers', 1),
    ('GamePad Elite',         'gaming', 2),
    ('MechBoard RGB',         'keyboards', 1),
    ('MechBoard RGB',         'gaming', 2),
    ('PrecisionMouse X',      'mice', 1),
    ('PrecisionMouse X',      'gaming', 2),
    ('UltraWide 34"',         'monitors', 1),
    ('UltraWide 34"',         'gaming', 3),
    ('UltraWide 34"',         'office', 2),
    ('StandDesk Pro',         'desks', 1),
    ('StandDesk Pro',         'office', 2),
    ('ErgoChair Mesh',        'chairs', 1),
    ('ErgoChair Mesh',        'office', 2)
) AS pc(pname, cat_slug, sort)
JOIN ecommerce.categories cat ON cat.slug = pc.cat_slug
WHERE p.name = pc.pname AND p.store_id = (SELECT store_id FROM ecommerce.stores WHERE slug = 'techgear-us');

-- M2M: product_tags
INSERT INTO ecommerce.product_tags (product_id, tag_id)
SELECT p.product_id, t.tag_id
FROM ecommerce.products p
CROSS JOIN LATERAL (VALUES
    ('ProBook Laptop 15"',    'bestseller'),
    ('ProBook Laptop 15"',    'premium'),
    ('ProBook Laptop 15"',    'usb-c'),
    ('ProBook Laptop 13"',    'new-arrival'),
    ('ProBook Laptop 13"',    'portable'),
    ('ProBook Laptop 13"',    'usb-c'),
    ('CloudPhone X',          'bestseller'),
    ('CloudPhone X',          'wireless'),
    ('CloudPhone X',          'usb-c'),
    ('CloudPhone Lite',       'budget'),
    ('CloudPhone Lite',       'wireless'),
    ('TabletMax Pro',         'premium'),
    ('TabletMax Pro',         'usb-c'),
    ('SoundWave Pro',         'bestseller'),
    ('SoundWave Pro',         'noise-cancelling'),
    ('SoundWave Pro',         'wireless'),
    ('SoundWave Pro',         'bluetooth'),
    ('SoundWave Buds',        'on-sale'),
    ('SoundWave Buds',        'wireless'),
    ('SoundWave Buds',        'bluetooth'),
    ('BassBox Speaker',       'portable'),
    ('BassBox Speaker',       'bluetooth'),
    ('BassBox Speaker',       'wireless'),
    ('StudioMic USB',         'pro'),
    ('StudioMic USB',         'usb-c'),
    ('ShieldCase Universal',  'bestseller'),
    ('PowerCharge 65W',       'usb-c'),
    ('PowerCharge 65W',       'on-sale'),
    ('FlexCable USB-C 2m',    'usb-c'),
    ('FlexCable USB-C 2m',    'budget'),
    ('GamePad Elite',         'wireless'),
    ('GamePad Elite',         'gaming'),
    ('GamePad Elite',         'bluetooth'),
    ('MechBoard RGB',         'gaming'),
    ('MechBoard RGB',         'usb-c'),
    ('MechBoard RGB',         'premium'),
    ('PrecisionMouse X',      'gaming'),
    ('PrecisionMouse X',      'wireless'),
    ('PrecisionMouse X',      'ergonomic'),
    ('UltraWide 34"',         'premium'),
    ('UltraWide 34"',         'on-sale'),
    ('UltraWide 34"',         'office'),
    ('StandDesk Pro',         'ergonomic'),
    ('StandDesk Pro',         'office'),
    ('ErgoChair Mesh',        'ergonomic'),
    ('ErgoChair Mesh',        'on-sale'),
    ('ErgoChair Mesh',        'office')
) AS pt(pname, tag_name)
JOIN ecommerce.tags t ON t.name = pt.tag_name
WHERE p.name = pt.pname AND p.store_id = (SELECT store_id FROM ecommerce.stores WHERE slug = 'techgear-us');

-- Collections
INSERT INTO ecommerce.collections (name, slug, description, store_id, is_featured)
SELECT col.name, col.slug, col.description, s.store_id, col.featured
FROM ecommerce.stores s
CROSS JOIN LATERAL (VALUES
    ('Work From Home Essentials', 'wfh-essentials', 'Everything you need for a productive home office', true),
    ('Summer Sale 2025',          'summer-sale-2025', 'Hot deals on top products',                       true),
    ('Gaming Setup',              'gaming-setup',     'Build the ultimate gaming station',                true),
    ('Travel Gear',               'travel-gear',      'Lightweight and portable tech for travelers',      false),
    ('Budget Picks',              'budget-picks',     'Great products under $100',                        false)
) AS col(name, slug, description, featured)
WHERE s.slug = 'techgear-us';

-- M2M: product_collections
INSERT INTO ecommerce.product_collections (product_id, collection_id, sort_order)
SELECT p.product_id, col.collection_id, pc.sort
FROM ecommerce.products p
CROSS JOIN LATERAL (VALUES
    ('ProBook Laptop 15"',    'wfh-essentials', 1),
    ('ProBook Laptop 13"',    'wfh-essentials', 2),
    ('SoundWave Pro',         'wfh-essentials', 3),
    ('StudioMic USB',         'wfh-essentials', 4),
    ('UltraWide 34"',         'wfh-essentials', 5),
    ('StandDesk Pro',         'wfh-essentials', 6),
    ('ErgoChair Mesh',        'wfh-essentials', 7),
    ('SoundWave Buds',        'summer-sale-2025', 1),
    ('PowerCharge 65W',       'summer-sale-2025', 2),
    ('UltraWide 34"',         'summer-sale-2025', 3),
    ('ErgoChair Mesh',        'summer-sale-2025', 4),
    ('MechBoard RGB',         'gaming-setup', 1),
    ('PrecisionMouse X',      'gaming-setup', 2),
    ('GamePad Elite',         'gaming-setup', 3),
    ('UltraWide 34"',         'gaming-setup', 4),
    ('SoundWave Pro',         'gaming-setup', 5),
    ('ProBook Laptop 13"',    'travel-gear', 1),
    ('CloudPhone X',          'travel-gear', 2),
    ('SoundWave Buds',        'travel-gear', 3),
    ('BassBox Speaker',       'travel-gear', 4),
    ('PowerCharge 65W',       'travel-gear', 5),
    ('ShieldCase Universal',  'travel-gear', 6),
    ('CloudPhone Lite',       'budget-picks', 1),
    ('ShieldCase Universal',  'budget-picks', 2),
    ('FlexCable USB-C 2m',    'budget-picks', 3),
    ('GamePad Elite',         'budget-picks', 4)
) AS pc(pname, col_slug, sort)
JOIN ecommerce.collections col ON col.slug = pc.col_slug
WHERE p.name = pc.pname AND p.store_id = col.store_id;

-- Customers (across stores)
INSERT INTO ecommerce.customers (store_id, email, first_name, last_name, phone, city, country, total_orders, total_spent)
SELECT s.store_id, cu.email, cu.fn, cu.ln, cu.phone, cu.city, cu.country, cu.orders, cu.spent
FROM ecommerce.stores s
CROSS JOIN LATERAL (VALUES
    ('techgear-us', 'alex.morgan@gmail.com', 'Alex', 'Morgan', '+1-555-2001', 'San Francisco', 'USA', 8, 4250.00),
    ('techgear-us', 'jordan.lee@outlook.com', 'Jordan', 'Lee', '+1-555-2002', 'Austin', 'USA', 5, 2890.00),
    ('techgear-us', 'casey.nguyen@gmail.com', 'Casey', 'Nguyen', '+1-555-2003', 'Seattle', 'USA', 12, 8400.00),
    ('techgear-us', 'taylor.williams@yahoo.com', 'Taylor', 'Williams', '+1-555-2004', 'Chicago', 'USA', 3, 1650.00),
    ('techgear-us', 'riley.jackson@gmail.com', 'Riley', 'Jackson', '+1-555-2005', 'Denver', 'USA', 6, 3200.00),
    ('techgear-us', 'avery.chen@gmail.com', 'Avery', 'Chen', '+1-555-2006', 'Boston', 'USA', 15, 12500.00),
    ('techgear-us', 'drew.martinez@outlook.com', 'Drew', 'Martinez', '+1-555-2007', 'Miami', 'USA', 2, 890.00),
    ('techgear-us', 'sam.patel@gmail.com', 'Sam', 'Patel', '+1-555-2008', 'Portland', 'USA', 9, 5600.00),
    ('techgear-eu', 'lukas.schmidt@web.de', 'Lukas', 'Schmidt', '+49-170-3001', 'Berlin', 'Germany', 4, 2100.00),
    ('techgear-eu', 'emma.dubois@gmail.com', 'Emma', 'Dubois', '+33-6-3002', 'Paris', 'France', 7, 3800.00),
    ('techgear-eu', 'marco.rossi@libero.it', 'Marco', 'Rossi', '+39-320-3003', 'Milan', 'Italy', 3, 1500.00),
    ('techgear-eu', 'anna.kowalska@onet.pl', 'Anna', 'Kowalska', '+48-501-3004', 'Warsaw', 'Poland', 6, 2900.00),
    ('techgear-uk', 'james.smith@bt.com', 'James', 'Smith', '+44-7700-4001', 'London', 'UK', 5, 2400.00),
    ('techgear-uk', 'olivia.jones@gmail.com', 'Olivia', 'Jones', '+44-7700-4002', 'Manchester', 'UK', 8, 4100.00),
    ('techgear-uk', 'harry.patel@outlook.com', 'Harry', 'Patel', '+44-7700-4003', 'Birmingham', 'UK', 2, 950.00)
) AS cu(store_slug, email, fn, ln, phone, city, country, orders, spent)
WHERE s.slug = cu.store_slug;

-- Orders (realistic order history)
INSERT INTO ecommerce.orders (store_id, customer_id, order_number, status, payment_status, subtotal, discount_total, tax_total, shipping_total, grand_total, shipping_city, shipping_country, order_date, shipped_date, delivered_date)
SELECT c.store_id, c.customer_id, o.order_number, o.status, o.pay_status, o.subtotal, o.discount, o.tax, o.shipping, o.grand_total,
       c.city, c.country, o.order_date::TIMESTAMP, o.shipped::TIMESTAMP, o.delivered::TIMESTAMP
FROM ecommerce.customers c
CROSS JOIN LATERAL (VALUES
    ('alex.morgan@gmail.com', 'ORD-US-10001', 'delivered', 'paid', 1649.98, 0, 132.00, 0, 1781.98, '2025-08-12', '2025-08-14', '2025-08-18'),
    ('alex.morgan@gmail.com', 'ORD-US-10002', 'delivered', 'paid', 479.98, 20.00, 36.80, 9.99, 506.77, '2025-10-05', '2025-10-07', '2025-10-11'),
    ('alex.morgan@gmail.com', 'ORD-US-10003', 'delivered', 'paid', 399.99, 50.00, 28.00, 0, 377.99, '2026-01-20', '2026-01-22', '2026-01-26'),
    ('jordan.lee@outlook.com', 'ORD-US-10004', 'delivered', 'paid', 899.99, 0, 72.00, 0, 971.99, '2025-09-22', '2025-09-24', '2025-09-28'),
    ('jordan.lee@outlook.com', 'ORD-US-10005', 'delivered', 'paid', 229.98, 0, 18.40, 5.99, 254.37, '2025-12-01', '2025-12-03', '2025-12-07'),
    ('casey.nguyen@gmail.com', 'ORD-US-10006', 'delivered', 'paid', 2049.97, 100.00, 156.00, 0, 2105.97, '2025-07-08', '2025-07-10', '2025-07-15'),
    ('casey.nguyen@gmail.com', 'ORD-US-10007', 'delivered', 'paid', 749.99, 0, 60.00, 0, 809.99, '2025-11-15', '2025-11-17', '2025-11-22'),
    ('casey.nguyen@gmail.com', 'ORD-US-10008', 'shipped', 'paid', 599.99, 50.00, 44.00, 0, 593.99, '2026-03-20', '2026-03-22', NULL),
    ('taylor.williams@yahoo.com', 'ORD-US-10009', 'delivered', 'paid', 349.99, 0, 28.00, 0, 377.99, '2025-11-28', '2025-11-30', '2025-12-04'),
    ('riley.jackson@gmail.com', 'ORD-US-10010', 'delivered', 'paid', 1299.99, 0, 104.00, 0, 1403.99, '2025-06-15', '2025-06-17', '2025-06-22'),
    ('riley.jackson@gmail.com', 'ORD-US-10011', 'delivered', 'paid', 299.97, 0, 24.00, 5.99, 329.96, '2025-09-10', '2025-09-12', '2025-09-16'),
    ('avery.chen@gmail.com', 'ORD-US-10012', 'delivered', 'paid', 3149.96, 200.00, 236.00, 0, 3185.96, '2025-05-20', '2025-05-22', '2025-05-28'),
    ('avery.chen@gmail.com', 'ORD-US-10013', 'delivered', 'paid', 1049.98, 0, 84.00, 0, 1133.98, '2025-08-30', '2025-09-01', '2025-09-05'),
    ('avery.chen@gmail.com', 'ORD-US-10014', 'confirmed', 'paid', 449.99, 0, 36.00, 0, 485.99, '2026-03-28', NULL, NULL),
    ('drew.martinez@outlook.com', 'ORD-US-10015', 'delivered', 'paid', 129.99, 10.00, 9.60, 5.99, 135.58, '2026-02-14', '2026-02-16', '2026-02-20'),
    ('sam.patel@gmail.com', 'ORD-US-10016', 'delivered', 'paid', 849.98, 0, 68.00, 0, 917.98, '2025-10-18', '2025-10-20', '2025-10-25'),
    ('sam.patel@gmail.com', 'ORD-US-10017', 'delivered', 'paid', 449.99, 30.00, 33.60, 0, 453.59, '2026-01-05', '2026-01-07', '2026-01-12'),
    ('lukas.schmidt@web.de', 'ORD-EU-20001', 'delivered', 'paid', 1195.99, 0, 227.24, 0, 1423.23, '2025-09-15', '2025-09-18', '2025-09-24'),
    ('emma.dubois@gmail.com', 'ORD-EU-20002', 'delivered', 'paid', 551.58, 0, 104.80, 0, 656.38, '2025-10-22', '2025-10-25', '2025-10-30'),
    ('emma.dubois@gmail.com', 'ORD-EU-20003', 'delivered', 'paid', 321.99, 0, 61.18, 0, 383.17, '2026-02-10', '2026-02-13', '2026-02-18'),
    ('marco.rossi@libero.it', 'ORD-EU-20004', 'delivered', 'paid', 119.59, 0, 22.72, 0, 142.31, '2025-12-20', '2025-12-23', '2025-12-30'),
    ('anna.kowalska@onet.pl', 'ORD-EU-20005', 'delivered', 'paid', 827.99, 50.00, 147.82, 0, 925.81, '2025-08-05', '2025-08-08', '2025-08-14'),
    ('james.smith@bt.com', 'ORD-UK-30001', 'delivered', 'paid', 1027.99, 0, 205.60, 0, 1233.59, '2025-07-20', '2025-07-22', '2025-07-26'),
    ('olivia.jones@gmail.com', 'ORD-UK-30002', 'delivered', 'paid', 552.78, 0, 110.56, 0, 663.34, '2025-11-08', '2025-11-10', '2025-11-14'),
    ('olivia.jones@gmail.com', 'ORD-UK-30003', 'shipped', 'paid', 276.59, 20.00, 51.32, 0, 307.91, '2026-03-15', '2026-03-17', NULL),
    ('harry.patel@outlook.com', 'ORD-UK-30004', 'delivered', 'paid', 63.39, 0, 12.68, 5.99, 82.06, '2026-01-30', '2026-02-01', '2026-02-05')
) AS o(cust_email, order_number, status, pay_status, subtotal, discount, tax, shipping, grand_total, order_date, shipped, delivered)
WHERE c.email = o.cust_email;

-- M2M: order_items (products in orders)
INSERT INTO ecommerce.order_items (order_id, product_id, variant_id, quantity, unit_price, discount, line_total)
SELECT o.order_id, p.product_id, NULL, oi.qty, oi.unit_price, oi.discount, (oi.unit_price * oi.qty - oi.discount)::DECIMAL(18,2)
FROM ecommerce.orders o
CROSS JOIN LATERAL (VALUES
    ('ORD-US-10001', 'ProBook Laptop 15"', 1, 1299.99, 0),
    ('ORD-US-10001', 'SoundWave Pro', 1, 349.99, 0),
    ('ORD-US-10002', 'SoundWave Buds', 1, 129.99, 10.00),
    ('ORD-US-10002', 'SoundWave Pro', 1, 349.99, 10.00),
    ('ORD-US-10003', 'ErgoChair Mesh', 1, 399.99, 50.00),
    ('ORD-US-10004', 'CloudPhone X', 1, 899.99, 0),
    ('ORD-US-10005', 'MechBoard RGB', 1, 149.99, 0),
    ('ORD-US-10005', 'PrecisionMouse X', 1, 79.99, 0),
    ('ORD-US-10006', 'ProBook Laptop 15"', 1, 1299.99, 50.00),
    ('ORD-US-10006', 'TabletMax Pro', 1, 749.99, 50.00),
    ('ORD-US-10007', 'TabletMax Pro', 1, 749.99, 0),
    ('ORD-US-10008', 'UltraWide 34"', 1, 599.99, 50.00),
    ('ORD-US-10009', 'SoundWave Pro', 1, 349.99, 0),
    ('ORD-US-10010', 'ProBook Laptop 15"', 1, 1299.99, 0),
    ('ORD-US-10011', 'GamePad Elite', 1, 69.99, 0),
    ('ORD-US-10011', 'MechBoard RGB', 1, 149.99, 0),
    ('ORD-US-10011', 'PrecisionMouse X', 1, 79.99, 0),
    ('ORD-US-10012', 'ProBook Laptop 15"', 1, 1299.99, 100.00),
    ('ORD-US-10012', 'CloudPhone X', 1, 899.99, 50.00),
    ('ORD-US-10012', 'StandDesk Pro', 1, 449.99, 25.00),
    ('ORD-US-10012', 'UltraWide 34"', 1, 599.99, 25.00),
    ('ORD-US-10013', 'SoundWave Pro', 1, 349.99, 0),
    ('ORD-US-10013', 'UltraWide 34"', 1, 599.99, 0),
    ('ORD-US-10013', 'PowerCharge 65W', 2, 49.99, 0),
    ('ORD-US-10014', 'StandDesk Pro', 1, 449.99, 0),
    ('ORD-US-10015', 'SoundWave Buds', 1, 129.99, 10.00),
    ('ORD-US-10016', 'CloudPhone X', 1, 899.99, 0),
    ('ORD-US-10016', 'ShieldCase Universal', 1, 39.99, 0),
    ('ORD-US-10017', 'StandDesk Pro', 1, 449.99, 30.00),
    ('ORD-EU-20001', 'ProBook Laptop 15"', 1, 1195.99, 0),
    ('ORD-EU-20002', 'SoundWave Pro', 1, 321.99, 0),
    ('ORD-EU-20002', 'SoundWave Buds', 1, 119.59, 0),
    ('ORD-EU-20002', 'GamePad Elite', 1, 64.39, 0),
    ('ORD-EU-20003', 'SoundWave Pro', 1, 321.99, 0),
    ('ORD-EU-20004', 'SoundWave Buds', 1, 119.59, 0),
    ('ORD-EU-20005', 'CloudPhone X', 1, 827.99, 50.00),
    ('ORD-UK-30001', 'ProBook Laptop 15"', 1, 1027.99, 0),
    ('ORD-UK-30002', 'SoundWave Pro', 1, 276.59, 0),
    ('ORD-UK-30002', 'SoundWave Buds', 1, 102.79, 0),
    ('ORD-UK-30002', 'MechBoard RGB', 1, 118.49, 0),
    ('ORD-UK-30003', 'SoundWave Pro', 1, 276.59, 20.00),
    ('ORD-UK-30004', 'GamePad Elite', 1, 55.29, 0)
) AS oi(ord_num, pname, qty, unit_price, discount)
JOIN ecommerce.products p ON p.name = oi.pname AND p.store_id = o.store_id
WHERE o.order_number = oi.ord_num;

-- Wishlists
INSERT INTO ecommerce.wishlists (customer_id, name)
SELECT c.customer_id, w.wname
FROM ecommerce.customers c
CROSS JOIN LATERAL (VALUES
    ('alex.morgan@gmail.com', 'My Wishlist'),
    ('casey.nguyen@gmail.com', 'Want List'),
    ('avery.chen@gmail.com', 'Birthday Ideas'),
    ('sam.patel@gmail.com', 'Upgrade Plans'),
    ('emma.dubois@gmail.com', 'Ma Liste'),
    ('olivia.jones@gmail.com', 'Next Purchase')
) AS w(cust_email, wname)
WHERE c.email = w.cust_email;

-- M2M: wishlist_products
INSERT INTO ecommerce.wishlist_products (wishlist_id, product_id)
SELECT wl.wishlist_id, p.product_id
FROM ecommerce.wishlists wl
JOIN ecommerce.customers c ON c.customer_id = wl.customer_id
CROSS JOIN LATERAL (VALUES
    ('alex.morgan@gmail.com', 'My Wishlist', 'UltraWide 34"'),
    ('alex.morgan@gmail.com', 'My Wishlist', 'StandDesk Pro'),
    ('alex.morgan@gmail.com', 'My Wishlist', 'MechBoard RGB'),
    ('casey.nguyen@gmail.com', 'Want List', 'ErgoChair Mesh'),
    ('casey.nguyen@gmail.com', 'Want List', 'StudioMic USB'),
    ('avery.chen@gmail.com', 'Birthday Ideas', 'CloudPhone X'),
    ('avery.chen@gmail.com', 'Birthday Ideas', 'SoundWave Buds'),
    ('avery.chen@gmail.com', 'Birthday Ideas', 'GamePad Elite'),
    ('sam.patel@gmail.com', 'Upgrade Plans', 'ProBook Laptop 15"'),
    ('sam.patel@gmail.com', 'Upgrade Plans', 'UltraWide 34"'),
    ('sam.patel@gmail.com', 'Upgrade Plans', 'ErgoChair Mesh'),
    ('sam.patel@gmail.com', 'Upgrade Plans', 'StandDesk Pro'),
    ('emma.dubois@gmail.com', 'Ma Liste', 'ProBook Laptop 15"'),
    ('emma.dubois@gmail.com', 'Ma Liste', 'ErgoChair Mesh'),
    ('olivia.jones@gmail.com', 'Next Purchase', 'CloudPhone X'),
    ('olivia.jones@gmail.com', 'Next Purchase', 'UltraWide 34"')
) AS wp(cust_email, wname, pname)
JOIN ecommerce.products p ON p.store_id = c.store_id AND p.name = wp.pname
WHERE c.email = wp.cust_email AND wl.name = wp.wname;

-- ── Summary Views ────────────────────────────────────────────────────────

CREATE VIEW crm.pipeline_stats AS
SELECT
    (SELECT COUNT(*) FROM crm.accounts) AS accounts,
    (SELECT COUNT(*) FROM crm.contacts) AS contacts,
    (SELECT COUNT(*) FROM crm.deals) AS deals,
    (SELECT COUNT(*) FROM crm.products) AS products,
    (SELECT COUNT(*) FROM crm.campaigns) AS campaigns,
    (SELECT COUNT(*) FROM crm.activities) AS activities,
    (SELECT COUNT(*) FROM crm.contact_accounts) AS contact_account_links,
    (SELECT COUNT(*) FROM crm.deal_products) AS deal_product_links,
    (SELECT COUNT(*) FROM crm.campaign_contacts) AS campaign_contact_links,
    (SELECT COUNT(*) FROM crm.account_tags) AS account_tag_links,
    (SELECT COUNT(*) FROM crm.deal_tags) AS deal_tag_links;

CREATE VIEW ecommerce.pipeline_stats AS
SELECT
    (SELECT COUNT(*) FROM ecommerce.stores) AS stores,
    (SELECT COUNT(*) FROM ecommerce.products) AS products,
    (SELECT COUNT(*) FROM ecommerce.product_variants) AS variants,
    (SELECT COUNT(*) FROM ecommerce.categories) AS categories,
    (SELECT COUNT(*) FROM ecommerce.customers) AS customers,
    (SELECT COUNT(*) FROM ecommerce.orders) AS orders,
    (SELECT COUNT(*) FROM ecommerce.order_items) AS order_items,
    (SELECT COUNT(*) FROM ecommerce.product_categories) AS product_category_links,
    (SELECT COUNT(*) FROM ecommerce.product_tags) AS product_tag_links,
    (SELECT COUNT(*) FROM ecommerce.product_collections) AS product_collection_links,
    (SELECT COUNT(*) FROM ecommerce.wishlist_products) AS wishlist_product_links;
