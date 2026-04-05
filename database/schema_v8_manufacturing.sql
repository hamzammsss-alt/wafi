-- ================================================================
-- V8 ADVANCED MANUFACTURING SCHEMA
-- Supports: BOM, Routing, Work Centers, QC, Maintenance, Costing
-- ================================================================

-- 1. FACTORY SETUP (Infrastructure)
-- ================================================================

-- Work Centers (Stations/Departments)
CREATE TABLE IF NOT EXISTS mfg_work_centers (
    id TEXT PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    
    -- Costing
    cost_per_hour DECIMAL(10, 2) DEFAULT 0, -- Direct running cost
    overhead_rate_per_hour DECIMAL(10, 2) DEFAULT 0, -- Allocated overheads
    capacity_per_hour DECIMAL(10, 2) DEFAULT 1, -- Output rate
    
    -- GL Integration
    wip_account_id TEXT, -- Work In Progress Account
    expense_account_id TEXT, -- For Labor/Overhead posting
    
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Machines (Assets linked to Work Centers)
CREATE TABLE IF NOT EXISTS mfg_machines (
    id TEXT PRIMARY KEY,
    work_center_id TEXT NOT NULL,
    asset_id TEXT, -- Link to Fixed Assets Module
    
    name TEXT NOT NULL,
    serial_number TEXT,
    brand TEXT,
    model TEXT,
    
    purchase_date DATE,
    warranty_expiry DATE,
    
    maintenance_interval_hours INTEGER, -- e.g. every 500 hours
    current_run_hours INTEGER DEFAULT 0,
    
    status TEXT DEFAULT 'ACTIVE', -- ACTIVE, MAINTENANCE, BROKEN
    
    FOREIGN KEY (work_center_id) REFERENCES mfg_work_centers(id)
);

-- 2. ENGINEERING (Product Definition)
-- ================================================================

-- Bill of Materials Header
CREATE TABLE IF NOT EXISTS mfg_boms (
    id TEXT PRIMARY KEY,
    bom_number TEXT UNIQUE NOT NULL, -- BOM-XXXX
    
    item_id TEXT NOT NULL, -- The Finished Good
    batch_size DECIMAL(10, 2) DEFAULT 1, -- For 1 unit or 100 units?
    
    type TEXT DEFAULT 'PRODUCTION', -- PRODUCTION, DISASSEMBLY, KIT
    version INTEGER DEFAULT 1,
    is_default BOOLEAN DEFAULT 0, -- Active BOM for MRP
    
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (item_id) REFERENCES products(id)
);

-- BOM Components (Ingredients)
CREATE TABLE IF NOT EXISTS mfg_bom_components (
    id TEXT PRIMARY KEY,
    bom_id TEXT NOT NULL,
    
    item_id TEXT NOT NULL, -- Raw Material
    quantity DECIMAL(12, 4) NOT NULL,
    
    scarp_percentage DECIMAL(5, 2) DEFAULT 0, -- e.g. 5% waste
    
    is_critical BOOLEAN DEFAULT 0, -- Stops production if missing
    
    FOREIGN KEY (bom_id) REFERENCES mfg_boms(id) ON DELETE CASCADE,
    FOREIGN KEY (item_id) REFERENCES products(id)
);

-- Routings (Process Flow)
CREATE TABLE IF NOT EXISTS mfg_routings (
    id TEXT PRIMARY KEY,
    bom_id TEXT NOT NULL, -- Linked to BOM
    name TEXT NOT NULL,
    
    is_default BOOLEAN DEFAULT 1,
    FOREIGN KEY (bom_id) REFERENCES mfg_boms(id)
);

-- Routing Operations (Steps)
CREATE TABLE IF NOT EXISTS mfg_routing_operations (
    id TEXT PRIMARY KEY,
    routing_id TEXT NOT NULL,
    
    sequence_order INTEGER NOT NULL, -- 10, 20, 30...
    work_center_id TEXT NOT NULL,
    
    description TEXT NOT NULL, -- "Cutting", "Assembly"
    step_type TEXT DEFAULT 'OPERATION', -- OPERATION, INSPECTION, OUTSOURCE
    
    setup_time_minutes DECIMAL(10, 2) DEFAULT 0,
    run_time_minutes DECIMAL(10, 2) DEFAULT 0, -- Per unit/batch
    
    FOREIGN KEY (routing_id) REFERENCES mfg_routings(id) ON DELETE CASCADE,
    FOREIGN KEY (work_center_id) REFERENCES mfg_work_centers(id)
);

-- 3. PRODUCTION ORDERS (Execution)
-- ================================================================

CREATE TABLE IF NOT EXISTS mfg_production_orders (
    id TEXT PRIMARY KEY,
    order_number TEXT UNIQUE NOT NULL,
    
    bom_id TEXT NOT NULL,
    routing_id TEXT,
    
    item_id TEXT NOT NULL, -- Planned Product
    
    type TEXT DEFAULT 'STANDARD', -- STANDARD, DISASSEMBLY, REWORK
    status TEXT DEFAULT 'DRAFT', -- DRAFT, RELEASED, IN_PROGRESS, COMPLETED, CLOSED, CANCELLED
    
    -- Planning
    quantity DECIMAL(12, 2) NOT NULL,
    start_date DATE,
    due_date DATE,
    
    branch_id TEXT,
    warehouse_id TEXT, -- Destination Warehouse
    
    -- Linking
    sales_order_id TEXT, -- If Make-to-Order
    parent_order_id TEXT, -- Sub-order
    
    -- Costing Snapshot (Actuals)
    actual_material_cost DECIMAL(15, 2) DEFAULT 0,
    actual_labor_cost DECIMAL(15, 2) DEFAULT 0,
    actual_overhead_cost DECIMAL(15, 2) DEFAULT 0,
    total_cost DECIMAL(15, 2) DEFAULT 0,
    unit_cost DECIMAL(15, 2) DEFAULT 0,
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (bom_id) REFERENCES mfg_boms(id),
    FOREIGN KEY (item_id) REFERENCES products(id)
);

-- Job Cards (Shop Floor Time Tracking)
CREATE TABLE IF NOT EXISTS mfg_job_cards (
    id TEXT PRIMARY KEY,
    production_order_id TEXT NOT NULL,
    operation_id TEXT NOT NULL, -- Which routing step
    
    work_center_id TEXT NOT NULL,
    equipment_id TEXT,
    
    employee_id TEXT, -- Who did it
    
    start_time DATETIME,
    end_time DATETIME,
    duration_minutes INTEGER GENERATED ALWAYS AS ((julianday(end_time) - julianday(start_time)) * 1440) VIRTUAL,
    
    produced_quantity DECIMAL(12, 2) DEFAULT 0,
    status TEXT DEFAULT 'PENDING', -- PENDING, IN_PROGRESS, COMPLETED, STOPPED
    
    FOREIGN KEY (production_order_id) REFERENCES mfg_production_orders(id),
    FOREIGN KEY (operation_id) REFERENCES mfg_routing_operations(id)
);

-- 4. MATERIAL MOVEMENTS (Issues & Receipts)
-- ================================================================
-- We use standard Transaction/Inventory tables but formatted for MFG
-- (This logic will be handled by Service Logic inserting into standard inventory tables with type='MFG_ISSUE' or 'MFG_RECEIPT')


-- 5. QUALITY CONTROL
-- ================================================================

CREATE TABLE IF NOT EXISTS mfg_qc_tests (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    test_type TEXT, -- VISUAL, MEASUREMENT, PASS_FAIL
    min_value DECIMAL,
    max_value DECIMAL,
    unit TEXT 
);

CREATE TABLE IF NOT EXISTS mfg_qc_inspections (
    id TEXT PRIMARY KEY,
    reference_type TEXT, -- PRODUCTION_ORDER, RECEIPT, JOB_CARD
    reference_id TEXT,
    
    inspector_id TEXT,
    inspection_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    batch_number TEXT,
    
    sample_size DECIMAL,
    passed_quantity DECIMAL,
    failed_quantity DECIMAL,
    
    status TEXT, -- PASSED, FAILED, PARTIAL
    notes TEXT
);

-- 6. MAINTENANCE
-- ================================================================

CREATE TABLE IF NOT EXISTS mfg_maintenance_requests (
    id TEXT PRIMARY KEY,
    request_number TEXT UNIQUE,
    machine_id TEXT NOT NULL,
    
    requested_by TEXT,
    request_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    issue_description TEXT NOT NULL,
    priority TEXT DEFAULT 'NORMAL', -- LOW, NORMAL, HIGH, CRITICAL
    
    status TEXT DEFAULT 'OPEN', -- OPEN, IN_PROGRESS, RESOLVED, CLOSED
    
    FOREIGN KEY (machine_id) REFERENCES mfg_machines(id)
);

CREATE TABLE IF NOT EXISTS mfg_maintenance_orders (
    id TEXT PRIMARY KEY,
    order_number TEXT UNIQUE,
    request_id TEXT,
    machine_id TEXT,
    
    technician_id TEXT,
    scheduled_date DATE,
    
    work_performed TEXT,
    cost_materials DECIMAL(10, 2) DEFAULT 0,
    cost_labor DECIMAL(10, 2) DEFAULT 0,
    
    completed_date DATETIME,
    status TEXT DEFAULT 'PLANNED',
    
    FOREIGN KEY (request_id) REFERENCES mfg_maintenance_requests(id)
);
