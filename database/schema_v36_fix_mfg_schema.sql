-- Fix Manufacturing Tables (Recreate to fix FKs and missing columns)
-- We need to drop dependent tables first

DROP TABLE IF EXISTS mfg_bom_components;
DROP TABLE IF EXISTS mfg_routing_operations;
DROP TABLE IF EXISTS mfg_routings;
DROP TABLE IF EXISTS mfg_job_cards;
DROP TABLE IF EXISTS mfg_production_order_inputs; -- If exists
DROP TABLE IF EXISTS mfg_production_orders;
DROP TABLE IF EXISTS mfg_boms;

-- Recreate BOMs
CREATE TABLE mfg_boms (
    id TEXT PRIMARY KEY,
    bom_number TEXT UNIQUE NOT NULL,
    item_id TEXT NOT NULL, -- References ITEMS
    batch_size DECIMAL(10, 2) DEFAULT 1,
    type TEXT DEFAULT 'PRODUCTION',
    version INTEGER DEFAULT 1,
    is_default BOOLEAN DEFAULT 0,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (item_id) REFERENCES items(id)
);

-- Recreate BOM Components
CREATE TABLE mfg_bom_components (
    id TEXT PRIMARY KEY,
    bom_id TEXT NOT NULL,
    item_id TEXT NOT NULL, -- References ITEMS
    quantity DECIMAL(12, 4) NOT NULL,
    scarp_percentage DECIMAL(5, 2) DEFAULT 0,
    is_critical BOOLEAN DEFAULT 0,
    FOREIGN KEY (bom_id) REFERENCES mfg_boms(id) ON DELETE CASCADE,
    FOREIGN KEY (item_id) REFERENCES items(id)
);

-- Recreate Routings
CREATE TABLE mfg_routings (
    id TEXT PRIMARY KEY,
    bom_id TEXT NOT NULL,
    name TEXT NOT NULL,
    is_default BOOLEAN DEFAULT 1,
    FOREIGN KEY (bom_id) REFERENCES mfg_boms(id)
);

-- Recreate Routing Operations
CREATE TABLE mfg_routing_operations (
    id TEXT PRIMARY KEY,
    routing_id TEXT NOT NULL,
    sequence_order INTEGER NOT NULL,
    work_center_id TEXT NOT NULL,
    description TEXT NOT NULL,
    step_type TEXT DEFAULT 'OPERATION',
    setup_time_minutes DECIMAL(10, 2) DEFAULT 0,
    run_time_minutes DECIMAL(10, 2) DEFAULT 0,
    FOREIGN KEY (routing_id) REFERENCES mfg_routings(id) ON DELETE CASCADE,
    FOREIGN KEY (work_center_id) REFERENCES mfg_work_centers(id)
);

-- Recreate Production Orders
CREATE TABLE mfg_production_orders (
    id TEXT PRIMARY KEY,
    order_number TEXT UNIQUE NOT NULL,
    bom_id TEXT NOT NULL,
    routing_id TEXT,
    item_id TEXT NOT NULL, -- References ITEMS
    type TEXT DEFAULT 'STANDARD',
    status TEXT DEFAULT 'DRAFT',
    quantity DECIMAL(12, 2) NOT NULL,
    start_date DATE,
    due_date DATE,
    branch_id TEXT,
    warehouse_id TEXT,
    sales_order_id TEXT,
    parent_order_id TEXT,
    actual_material_cost DECIMAL(15, 2) DEFAULT 0,
    actual_labor_cost DECIMAL(15, 2) DEFAULT 0,
    actual_overhead_cost DECIMAL(15, 2) DEFAULT 0,
    total_cost DECIMAL(15, 2) DEFAULT 0,
    unit_cost DECIMAL(15, 2) DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (bom_id) REFERENCES mfg_boms(id),
    FOREIGN KEY (item_id) REFERENCES items(id)
);

-- Recreate Job Cards
CREATE TABLE mfg_job_cards (
    id TEXT PRIMARY KEY,
    production_order_id TEXT NOT NULL,
    operation_id TEXT NOT NULL,
    work_center_id TEXT NOT NULL,
    equipment_id TEXT,
    employee_id TEXT,
    start_time DATETIME,
    end_time DATETIME,
    duration_minutes INTEGER GENERATED ALWAYS AS ((julianday(end_time) - julianday(start_time)) * 1440) VIRTUAL,
    produced_quantity DECIMAL(12, 2) DEFAULT 0,
    status TEXT DEFAULT 'PENDING',
    FOREIGN KEY (production_order_id) REFERENCES mfg_production_orders(id),
    FOREIGN KEY (operation_id) REFERENCES mfg_routing_operations(id)
);

-- Recreate Production Order Inputs (Material Issues)
CREATE TABLE IF NOT EXISTS mfg_production_order_inputs (
    id TEXT PRIMARY KEY,
    production_order_id TEXT NOT NULL,
    item_id TEXT NOT NULL,
    qty_issued DECIMAL(12, 4),
    unit_cost DECIMAL(12, 4),
    warehouse_id TEXT,
    issued_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (production_order_id) REFERENCES mfg_production_orders(id)
);
