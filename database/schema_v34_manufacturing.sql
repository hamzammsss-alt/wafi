-- Manufacturing Module Schema Fixes

-- 1. Work Centers
CREATE TABLE IF NOT EXISTS mfg_work_centers (
    id TEXT PRIMARY KEY,
    code TEXT,
    name TEXT NOT NULL,
    cost_per_hour REAL DEFAULT 0,
    capacity_per_hour REAL DEFAULT 1,
    overhead_rate_per_hour REAL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. Machines
CREATE TABLE IF NOT EXISTS mfg_machines (
    id TEXT PRIMARY KEY,
    work_center_id TEXT,
    name TEXT NOT NULL,
    serial_number TEXT,
    brand TEXT,
    model TEXT,
    status TEXT DEFAULT 'ACTIVE', -- ACTIVE, MAINTENANCE, RETIRED
    purchase_date DATE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(work_center_id) REFERENCES mfg_work_centers(id)
);

-- 3. Bill of Materials (BOM)
CREATE TABLE IF NOT EXISTS mfg_boms (
    id TEXT PRIMARY KEY,
    bom_number TEXT UNIQUE,
    item_id TEXT NOT NULL, -- Finished Good linking to items table
    batch_size REAL DEFAULT 1,
    type TEXT DEFAULT 'PRODUCTION', -- PRODUCTION, DISASSEMBLY
    version INTEGER DEFAULT 1,
    notes TEXT,
    is_default BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(item_id) REFERENCES items(id)
);

CREATE TABLE IF NOT EXISTS mfg_bom_components (
    id TEXT PRIMARY KEY,
    bom_id TEXT NOT NULL,
    item_id TEXT NOT NULL, -- Raw Material
    quantity REAL NOT NULL,
    scarp_percentage REAL DEFAULT 0,
    FOREIGN KEY(bom_id) REFERENCES mfg_boms(id) ON DELETE CASCADE,
    FOREIGN KEY(item_id) REFERENCES items(id)
);

-- 4. Routings
CREATE TABLE IF NOT EXISTS mfg_routings (
    id TEXT PRIMARY KEY,
    bom_id TEXT,
    name TEXT,
    is_default BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(bom_id) REFERENCES mfg_boms(id)
);

CREATE TABLE IF NOT EXISTS mfg_routing_operations (
    id TEXT PRIMARY KEY,
    routing_id TEXT NOT NULL,
    sequence_order INTEGER,
    work_center_id TEXT,
    description TEXT,
    setup_time_minutes REAL DEFAULT 0,
    run_time_minutes REAL DEFAULT 0,
    FOREIGN KEY(routing_id) REFERENCES mfg_routings(id) ON DELETE CASCADE,
    FOREIGN KEY(work_center_id) REFERENCES mfg_work_centers(id)
);

-- 5. Production Orders
CREATE TABLE IF NOT EXISTS mfg_production_orders (
    id TEXT PRIMARY KEY,
    order_number TEXT UNIQUE,
    bom_id TEXT,
    routing_id TEXT,
    item_id TEXT NOT NULL, -- Finished Good
    type TEXT DEFAULT 'STANDARD',
    quantity REAL NOT NULL,
    produced_quantity REAL DEFAULT 0,
    start_date DATE,
    due_date DATE,
    status TEXT DEFAULT 'DRAFT', -- DRAFT, RELEASED, IN_PROGRESS, COMPLETED, CANCELLED
    branch_id TEXT,
    warehouse_id TEXT,
    
    -- Costing (Actuals)
    actual_material_cost REAL DEFAULT 0,
    actual_labor_cost REAL DEFAULT 0,
    actual_overhead_cost REAL DEFAULT 0,
    total_cost REAL DEFAULT 0,
    unit_cost REAL DEFAULT 0,
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(bom_id) REFERENCES mfg_boms(id),
    FOREIGN KEY(item_id) REFERENCES items(id)
);

-- Material Inputs (Actual Issued)
CREATE TABLE IF NOT EXISTS mfg_production_order_inputs (
    id TEXT PRIMARY KEY,
    production_order_id TEXT NOT NULL,
    item_id TEXT,
    qty_issued REAL,
    unit_cost REAL,
    issued_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(production_order_id) REFERENCES mfg_production_orders(id) ON DELETE CASCADE
);

-- 6. Job Cards (Shop Floor Execution)
CREATE TABLE IF NOT EXISTS mfg_job_cards (
    id TEXT PRIMARY KEY,
    production_order_id TEXT NOT NULL,
    operation_id TEXT,
    work_center_id TEXT,
    employee_id TEXT,
    
    start_time DATETIME,
    end_time DATETIME,
    
    produced_quantity REAL DEFAULT 0,
    scarp_quantity REAL DEFAULT 0,
    
    status TEXT DEFAULT 'PENDING', -- PENDING, IN_PROGRESS, PAUSED, COMPLETED
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY(production_order_id) REFERENCES mfg_production_orders(id) ON DELETE CASCADE
);

-- 7. Quality Control
CREATE TABLE IF NOT EXISTS mfg_qc_tests (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    test_type TEXT, -- VISUAL, MEASUREMENT, PASS_FAIL
    min_value REAL,
    max_value REAL,
    unit TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS mfg_qc_inspections (
    id TEXT PRIMARY KEY,
    reference_type TEXT, -- PO_RECEIPT, PRODUCTION_ORDER
    reference_id TEXT,
    inspector_id TEXT,
    inspection_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    batch_number TEXT,
    sample_size REAL,
    passed_quantity REAL,
    failed_quantity REAL,
    
    status TEXT, -- PASS, FAIL, CONDITIONALLY_PASS
    notes TEXT
);

CREATE TABLE IF NOT EXISTS mfg_qc_inspection_results (
    id TEXT PRIMARY KEY,
    inspection_id TEXT NOT NULL,
    test_id TEXT,
    result_value TEXT,
    is_passed BOOLEAN,
    notes TEXT,
    FOREIGN KEY(inspection_id) REFERENCES mfg_qc_inspections(id) ON DELETE CASCADE
);

-- 8. Maintenance
CREATE TABLE IF NOT EXISTS mfg_maintenance_requests (
    id TEXT PRIMARY KEY,
    request_number TEXT UNIQUE,
    machine_id TEXT,
    requested_by TEXT,
    request_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    issue_description TEXT,
    priority TEXT DEFAULT 'MEDIUM', -- LOW, MEDIUM, HIGH, CRITICAL
    status TEXT DEFAULT 'OPEN', -- OPEN, IN_PROGRESS, COMPLETED, CANCELLED
    
    assigned_to TEXT,
    completed_date DATETIME,
    resolution_notes TEXT,
    cost REAL DEFAULT 0
);
