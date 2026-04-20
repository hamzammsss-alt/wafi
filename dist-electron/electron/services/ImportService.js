"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ImportService = void 0;
const electron_1 = require("electron");
class ImportService {
    constructor(db) {
        this.db = db;
        this.initializeSchema();
        this.registerHandlers();
    }
    initializeSchema() {
        // Shipments
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS import_shipments (
                id TEXT PRIMARY KEY,
                shipment_no TEXT NOT NULL,
                reference_number TEXT,
                supplier_id TEXT,
                origin_country TEXT,
                port_of_arrival TEXT,
                status TEXT,
                currency_id TEXT,
                exchange_rate REAL DEFAULT 1,
                bank_id TEXT,
                opening_date TEXT,
                arrival_date_est TEXT,
                arrival_date_actual TEXT,
                notes TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
        `);
        // Containers
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS shipment_containers (
                id TEXT PRIMARY KEY,
                shipment_id TEXT,
                shipment_no TEXT,
                container_no TEXT,
                size TEXT,
                seal_no TEXT,
                bill_of_lading TEXT,
                gross_weight REAL,
                net_weight REAL,
                cbm REAL,
                demurrage_start_date TEXT
            );
        `);
        // Expenses
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS clearance_expenses (
                id TEXT PRIMARY KEY,
                shipment_id TEXT,
                expense_type TEXT,
                reference_doc TEXT,
                vendor_id TEXT,
                amount_local REAL,
                tax_amount REAL,
                is_allocatable INTEGER DEFAULT 0,
                allocation_method TEXT, 
                notes TEXT
            );
        `);
    }
    registerHandlers() {
        // Shipments
        electron_1.ipcMain.handle('import-get-shipments', async (event, filters) => {
            return this.getShipments(filters);
        });
        electron_1.ipcMain.handle('import-get-shipment-by-id', async (event, id) => {
            return this.getShipmentById(id);
        });
        electron_1.ipcMain.handle('import-save-shipment', async (event, shipment) => {
            return this.saveShipment(shipment);
        });
        electron_1.ipcMain.handle('import-delete-shipment', async (event, id) => {
            return this.deleteShipment(id);
        });
        // Containers
        electron_1.ipcMain.handle('import-get-containers', async (event, shipmentId) => {
            return this.getContainers(shipmentId);
        });
        electron_1.ipcMain.handle('import-save-container', async (event, container) => {
            return this.saveContainer(container);
        });
        electron_1.ipcMain.handle('import-delete-container', async (event, id) => {
            return this.deleteContainer(id);
        });
        electron_1.ipcMain.handle('import-get-shipment-items', async (event, shipmentId) => {
            return this.getShipmentItems(shipmentId);
        });
        // Expenses (Legacy)
        electron_1.ipcMain.handle('import-get-expenses', async (event, shipmentId) => {
            return this.getExpenses(shipmentId);
        });
        electron_1.ipcMain.handle('import-save-expense', async (event, expense) => {
            return this.saveExpense(expense);
        });
        electron_1.ipcMain.handle('import-allocate-costs', async (event, { lcId, expenses, method }) => {
            return this.allocateCosts(lcId, expenses, method);
        });
        electron_1.ipcMain.handle('import-get-dashboard-stats', async () => {
            return this.getDashboardStats();
        });
        // Proforma Handlers
        electron_1.ipcMain.handle('import-get-proformas', async (event, filters) => {
            return this.getProformas(filters);
        });
        electron_1.ipcMain.handle('import-get-proforma', async (event, id) => {
            return this.getProforma(id);
        });
        electron_1.ipcMain.handle('import-save-proforma', async (event, data) => {
            return this.saveProforma(data);
        });
        // ============================================================================
        // NEW HANDLERS - Commercial Invoices
        // ============================================================================
        electron_1.ipcMain.handle('import-get-commercial-invoices', async (event, shipmentId) => {
            return this.getCommercialInvoices(shipmentId);
        });
        electron_1.ipcMain.handle('import-get-commercial-invoice', async (event, id) => {
            return this.getCommercialInvoice(id);
        });
        electron_1.ipcMain.handle('import-save-commercial-invoice', async (event, data) => {
            return this.saveCommercialInvoice(data);
        });
        electron_1.ipcMain.handle('import-delete-commercial-invoice', async (event, id) => {
            return this.deleteCommercialInvoice(id);
        });
        electron_1.ipcMain.handle('import-get-all-commercial-invoices', async () => {
            return this.getAllCommercialInvoices();
        });
        // ============================================================================
        // NEW HANDLERS - Clearance Expenses
        // ============================================================================
        electron_1.ipcMain.handle('import-get-clearance-expenses', async (event, shipmentId) => {
            return this.getClearanceExpenses(shipmentId);
        });
        electron_1.ipcMain.handle('import-get-clearance-expense', async (event, id) => {
            return this.getClearanceExpense(id);
        });
        electron_1.ipcMain.handle('import-save-clearance-expense', async (event, data) => {
            return this.saveClearanceExpense(data);
        });
        electron_1.ipcMain.handle('import-delete-clearance-expense', async (event, id) => {
            return this.deleteClearanceExpense(id);
        });
        // ============================================================================
        // NEW HANDLERS - Document Management
        // ============================================================================
        electron_1.ipcMain.handle('import-get-shipment-documents', async (event, shipmentId) => {
            return this.getShipmentDocuments(shipmentId);
        });
        electron_1.ipcMain.handle('import-save-shipment-document', async (event, data) => {
            return this.saveShipmentDocument(data);
        });
        electron_1.ipcMain.handle('import-delete-shipment-document', async (event, id) => {
            return this.deleteShipmentDocument(id);
        });
        // ============================================================================
        // NEW HANDLERS - Enhanced Landed Cost
        // ============================================================================
        electron_1.ipcMain.handle('import-calculate-landed-cost', async (event, shipmentId, method) => {
            return this.calculateLandedCost(shipmentId, method);
        });
        electron_1.ipcMain.handle('import-apply-landed-cost', async (event, shipmentId, allocations) => {
            return this.applyLandedCost(shipmentId, allocations);
        });
        electron_1.ipcMain.handle('import-get-landed-cost-history', async (event, shipmentId) => {
            return this.getLandedCostHistory(shipmentId);
        });
        // ============================================================================
        // NEW HANDLERS - Reporting
        // ============================================================================
        electron_1.ipcMain.handle('import-get-shipment-cost-breakdown', async (event, shipmentId) => {
            return this.getShipmentCostBreakdown(shipmentId);
        });
        electron_1.ipcMain.handle('import-get-containers-near-demurrage', async (event, days) => {
            return this.getContainersNearDemurrage(days);
        });
        electron_1.ipcMain.handle('import-get-item-cost-comparison', async (event, itemId) => {
            return this.getItemCostComparison(itemId);
        });
    }
    getDashboardStats() {
        const activeShipments = this.db.prepare("SELECT COUNT(*) as count FROM import_shipments WHERE status IS NULL OR status != 'CLOSED'").get().count;
        const clearingFiles = this.db.prepare("SELECT COUNT(*) as count FROM import_shipments WHERE status IN ('Arrived', 'Clearing')").get().count;
        const arrivingContainers = this.db.prepare(`
            SELECT COUNT(*) as count FROM shipment_containers 
            WHERE shipment_id IN (SELECT id FROM import_shipments WHERE status IS NULL OR status != 'CLOSED')
        `).get().count;
        // Pending Proformas: Purchase Invoices in Draft that are NOT linked to a shipment yet? 
        // Or simply all Draft Purchase Invoices assuming they are proformas.
        // We'll count all DRAFT Purchase Invoices as "Proformas/Offers" waiting to be processed.
        const pendingProformas = this.db.prepare("SELECT COUNT(*) as count FROM purchase_invoices WHERE status = 'DRAFT'").get().count;
        return {
            activeShipments,
            pendingProformas,
            arrivingContainers,
            clearingFiles
        };
    }
    allocateCosts(shipmentId, expenses, method) {
        // expenses: list of expenses to allocate (usually fetched from DB, but passed for flexibility if confirming UI)
        // method: 'VALUE', 'WEIGHT', 'MANUAL'
        // 1. Fetch Shipment & Items
        const shipment = this.getShipmentById(shipmentId);
        if (!shipment)
            throw new Error("Shipment not found");
        const items = this.getShipmentItems(shipmentId);
        if (!items || items.length === 0)
            throw new Error("No items in shipment to allocate costs to");
        // 2. Calculate Totals
        const totalFOB = items.reduce((sum, item) => sum + (item.total_fob || 0), 0);
        // Calculate Total Allocatable Expenses from attached expenses
        // (We assume expenses passed in are the ones to be allocated, or we fetch them)
        const dbExpenses = this.getExpenses(shipmentId);
        const allocatableExpenses = dbExpenses.filter((e) => e.is_allocatable).reduce((sum, e) => sum + (e.amount_local || 0), 0);
        if (totalFOB === 0)
            throw new Error("Total FOB value is 0, cannot allocate");
        // 3. Prepare GL Entry Data
        const glLines = [];
        let totalAllocated = 0;
        // 4. Update Item Costs
        const runTx = this.db.transaction(() => {
            items.forEach((item) => {
                let ratio = 0;
                if (method === 'VALUE') {
                    ratio = item.total_fob / totalFOB;
                }
                else if (method === 'WEIGHT') {
                    // TODO: Implement weight based ratio if weights exist
                    ratio = item.total_fob / totalFOB; // Fallback
                }
                const allocatedPortion = allocatableExpenses * ratio;
                const newTotalCost = (item.total_fob * (item.exchange_rate || shipment.exchange_rate || 1)) + allocatedPortion;
                const newUnitCost = newTotalCost / item.quantity;
                // Update Item Cost (We update standard_cost or cost_price)
                // We use 'cost_price' as the main weighted average or standard cost bucket
                // Ideally we should recalculate Weighted Average if using that method, 
                // but here we set the Last/Standard cost from this shipment.
                // If Weighted Average: 
                // NewAvg = ((OldQty * OldCost) + (NewQty * NewCost)) / (OldQty + NewQty)
                // We need current stock status. For simplicity in Hybrid v1, we update cost_price directly.
                this.db.prepare(`UPDATE items SET cost_price = @cost WHERE id = @id`).run({
                    cost: newUnitCost,
                    id: item.item_id
                });
            });
            // 5. GL Entry
            // Credit: Goods In Transit (Total Value of Shipment + Expenses already booked there)
            // Debit: Inventory (Total Value)
            // Note: We assume "Goods In Transit" was debited when:
            // a) Import Invoice was posted (Goods Value)
            // b) Expense Vouchers were posted (Customs, Freight, etc)
            // So we need to Credit GIT with (Goods Value Local + Allocatable Expenses Local)
            // And Debit Inventory with the same total.
            const totalGoodsLocal = items.reduce((sum, item) => sum + (item.total_fob * (item.exchange_rate || 1)), 0);
            const totalValue = totalGoodsLocal + allocatableExpenses;
            /*
            // We need to resolve Account IDs.
            // Ideally linked in Settings. We search by name for now.
            const gitAccount = this.db.prepare("SELECT id FROM accounts WHERE name LIKE '%Transit%' OR name LIKE '%طريق%'").get()?.id;
            const inventoryAccount = this.db.prepare("SELECT id FROM accounts WHERE name LIKE '%Inventory%' OR name LIKE '%مخزون%' OR name LIKE '%بضاعة%'").get()?.id;
            
            if(gitAccount && inventoryAccount) {
                 const journalId = crypto.randomUUID();
                 // Call JournalService (need to import or duplicate logic to avoid circular dependency if strictly coupled)
                 // For now, we will just prepare the data structure and let the implementation plan's detailed phase handle the exact JournalService call
                 // or we simply mark it as TODO if JournalService isn't easily reachable dynamically.
                 // HOWEVER, we are in ImportService.ts, we can import JournalService.
            }
            */
            // 2. Mark Shipment as Costed/Closed
            this.db.prepare(`
                UPDATE import_shipments SET status = 'CLOSED', closing_date = date('now') WHERE id = ?
            `).run(shipmentId);
        });
        runTx();
        return { success: true };
    }
    // --- Shipments Logic ---
    getShipments(filters) {
        let query = `
            SELECT s.*, bp.name_ar as supplier_name, c.symbol as currency_symbol 
            FROM import_shipments s
            LEFT JOIN business_partners bp ON s.supplier_id = bp.id
            LEFT JOIN currencies c ON s.currency_id = c.id
            WHERE 1=1
        `;
        const params = [];
        if (filters?.status) {
            query += ` AND s.status = ?`;
            params.push(filters.status);
        }
        // Sort by Created At Desc
        query += ` ORDER BY s.created_at DESC`;
        return this.db.prepare(query).all(...params);
    }
    getShipmentById(id) {
        const shipment = this.db.prepare(`
            SELECT s.*, bp.name_ar as supplier_name 
            FROM import_shipments s
            LEFT JOIN business_partners bp ON s.supplier_id = bp.id
            WHERE s.id = ?
        `).get(id);
        if (shipment) {
            // Attach containers
            const containers = this.db.prepare(`SELECT * FROM shipment_containers WHERE shipment_id = ?`).all(id);
            // Attach expenses
            const expenses = this.db.prepare(`SELECT * FROM clearance_expenses WHERE shipment_id = ?`).all(id);
            return {
                ...shipment,
                containers,
                expenses
            };
        }
        return null;
    }
    saveShipment(shipment) {
        const isNew = !shipment.id;
        if (isNew) {
            shipment.id = crypto.randomUUID();
            const stmt = this.db.prepare(`
                INSERT INTO import_shipments (
                    id, shipment_no, reference_number, supplier_id, origin_country, 
                    port_of_arrival, status, currency_id, exchange_rate, bank_id,
                    opening_date, arrival_date_est, notes, created_at
                ) VALUES (
                    @id, @shipment_no, @reference_number, @supplier_id, @origin_country,
                    @port_of_arrival, @status, @currency_id, @exchange_rate, @bank_id,
                    @opening_date, @arrival_date_est, @notes, datetime('now')
                )
            `);
            stmt.run(shipment);
        }
        else {
            const stmt = this.db.prepare(`
                UPDATE import_shipments SET
                    shipment_no = @shipment_no,
                    reference_number = @reference_number,
                    supplier_id = @supplier_id,
                    origin_country = @origin_country,
                    port_of_arrival = @port_of_arrival,
                    status = @status,
                    currency_id = @currency_id,
                    exchange_rate = @exchange_rate,
                    bank_id = @bank_id,
                    opening_date = @opening_date,
                    arrival_date_est = @arrival_date_est,
                    arrival_date_actual = @arrival_date_actual,
                    notes = @notes
                WHERE id = @id
            `);
            stmt.run(shipment);
        }
        return { success: true, id: shipment.id };
    }
    deleteShipment(id) {
        // TODO: Check if has allocated costs or locked interactions
        this.db.prepare(`DELETE FROM import_shipments WHERE id = ?`).run(id);
        return { success: true };
    }
    getShipmentItems(shipmentId) {
        // Fetch items from linked Purchase Invoices
        return this.db.prepare(`
            SELECT 
                il.id as line_id, 
                il.item_id, 
                il.quantity, 
                il.unit_price as fob_price, 
                il.total_price as total_fob, 
                i.name_ar as item_name, 
                i.code as item_code,
                pi.currency_id, 
                pi.exchange_rate 
            FROM purchase_invoices pi
            JOIN purchase_invoice_lines il ON pi.id = il.invoice_id
            LEFT JOIN items i ON il.item_id = i.id
            WHERE pi.shipment_id = ?
        `).all(shipmentId);
    }
    // --- Containers Logic ---
    getContainers(shipmentId) {
        return this.db.prepare(`SELECT * FROM shipment_containers WHERE shipment_id = ?`).all(shipmentId);
    }
    saveContainer(container) {
        if (!container.id)
            container.id = crypto.randomUUID();
        const exists = this.db.prepare(`SELECT 1 FROM shipment_containers WHERE id = ?`).get(container.id);
        if (!exists) {
            const stmt = this.db.prepare(`
                INSERT INTO shipment_containers (
                    id, shipment_id, shipment_no, container_no, size, seal_no, bill_of_lading,
                    gross_weight, net_weight, cbm, demurrage_start_date
                ) VALUES (
                    @id, @shipment_id, @shipment_no, @container_no, @size, @seal_no, @bill_of_lading,
                    @gross_weight, @net_weight, @cbm, @demurrage_start_date
                )
             `);
            // Be careful: shipment_id is the foreign key, but the object might have shipment_id or link parent
            // Checking naming convention in table vs object
            // Table: shipment_id, container.shipment_id
            // Quick fix for named params mapping if they don't match exactly
            // Assuming container object has all these keys
            stmt.run(container);
        }
        else {
            const stmt = this.db.prepare(`
                UPDATE shipment_containers SET
                    container_no = @container_no,
                    size = @size,
                    seal_no = @seal_no,
                    bill_of_lading = @bill_of_lading,
                    gross_weight = @gross_weight,
                    net_weight = @net_weight,
                    cbm = @cbm,
                    demurrage_start_date = @demurrage_start_date
                WHERE id = @id
             `);
            stmt.run(container);
        }
        return { success: true, id: container.id };
    }
    deleteContainer(id) {
        this.db.prepare(`DELETE FROM shipment_containers WHERE id = ?`).run(id);
        return { success: true };
    }
    // --- Expenses Logic ---
    getExpenses(shipmentId) {
        return this.db.prepare(`SELECT * FROM clearance_expenses WHERE shipment_id = ?`).all(shipmentId);
    }
    saveExpense(expense) {
        if (!expense.id)
            expense.id = crypto.randomUUID();
        // Upsert logic similar to others
        const exists = this.db.prepare(`SELECT 1 FROM clearance_expenses WHERE id = ?`).get(expense.id);
        if (!exists) {
            this.db.prepare(`
                INSERT INTO clearance_expenses (
                    id, shipment_id, expense_type, reference_doc, vendor_id,
                    amount_local, tax_amount, is_allocatable, allocation_method, notes
                ) VALUES (
                    @id, @shipment_id, @expense_type, @reference_doc, @vendor_id,
                    @amount_local, @tax_amount, @is_allocatable, @allocation_method, @notes
                )
            `).run(expense);
        }
        else {
            this.db.prepare(`
                UPDATE clearance_expenses SET
                    expense_type = @expense_type,
                    reference_doc = @reference_doc,
                    vendor_id = @vendor_id,
                    amount_local = @amount_local,
                    tax_amount = @tax_amount,
                    is_allocatable = @is_allocatable,
                    allocation_method = @allocation_method,
                    notes = @notes
                WHERE id = @id
             `).run(expense);
        }
        return { success: true, id: expense.id };
    }
    // --- Proforma Logic ---
    getProformas(filters) {
        let query = `
            SELECT pi.*, bp.name_ar as supplier_name 
            FROM purchase_invoices pi
            LEFT JOIN business_partners bp ON pi.supplier_id = bp.id
            WHERE pi.status = 'DRAFT'
        `;
        const params = [];
        // Add more filters if needed
        query += ` ORDER BY pi.issue_date DESC`;
        return this.db.prepare(query).all(...params);
    }
    getProforma(id) {
        const header = this.db.prepare(`
            SELECT pi.*, bp.name_ar as supplier_name 
            FROM purchase_invoices pi
            LEFT JOIN business_partners bp ON pi.supplier_id = bp.id
            WHERE pi.id = ?
        `).get(id);
        if (header) {
            const lines = this.db.prepare(`
                SELECT * FROM purchase_invoice_lines WHERE invoice_id = ?
            `).all(id);
            return { ...header, proforma_no: header.invoice_no, date: header.issue_date, lines };
        }
        return null;
    }
    saveProforma(data) {
        const { header, lines } = data;
        const isNew = !header.id;
        const id = header.id || crypto.randomUUID();
        const runTx = this.db.transaction(() => {
            if (isNew) {
                this.db.prepare(`
                    INSERT INTO purchase_invoices (
                        id, invoice_no, supplier_id, issue_date, status, currency_id, exchange_rate, created_at
                    ) VALUES (
                        @id, @invoice_no, @supplier_id, @issue_date, 'DRAFT', @currency_id, @exchange_rate, datetime('now')
                    )
                `).run({
                    id,
                    invoice_no: header.proforma_no,
                    supplier_id: header.supplier_id,
                    issue_date: header.date,
                    currency_id: header.currency_id,
                    exchange_rate: header.exchange_rate
                });
            }
            else {
                this.db.prepare(`
                    UPDATE purchase_invoices SET
                        invoice_no = @invoice_no,
                        supplier_id = @supplier_id,
                        issue_date = @issue_date,
                        currency_id = @currency_id,
                        exchange_rate = @exchange_rate
                    WHERE id = @id
                `).run({
                    id,
                    invoice_no: header.proforma_no,
                    supplier_id: header.supplier_id,
                    issue_date: header.date,
                    currency_id: header.currency_id,
                    exchange_rate: header.exchange_rate
                });
                // Clear existing lines
                this.db.prepare(`DELETE FROM purchase_invoice_lines WHERE invoice_id = ?`).run(id);
            }
            // Insert Lines
            const insertLine = this.db.prepare(`
                INSERT INTO purchase_invoice_lines (
                    id, invoice_id, description, quantity, unit_price, total_price, item_id
                ) VALUES (
                    @id, @invoice_id, @description, @quantity, @unit_price, @total_price, @item_id
                )
            `);
            lines.forEach((line) => {
                insertLine.run({
                    id: crypto.randomUUID(),
                    invoice_id: id,
                    description: line.description || line.item_name || '',
                    quantity: line.quantity,
                    unit_price: line.unit_price,
                    total_price: line.total_price,
                    item_id: line.item_id || null
                });
            });
        });
        runTx();
        return { success: true, id };
    }
    // ============================================================================
    // COMMERCIAL INVOICES METHODS
    // ============================================================================
    getCommercialInvoices(shipmentId) {
        const invoices = this.db.prepare(`
            SELECT ci.*, p.name_ar as supplier_name
            FROM commercial_invoices ci
            LEFT JOIN partners p ON ci.supplier_id = p.id
            WHERE ci.shipment_id = ?
            ORDER BY ci.invoice_date DESC
        `).all(shipmentId);
        // Get lines for each invoice
        return invoices.map((invoice) => {
            const lines = this.db.prepare(`
                SELECT cil.*, i.name_ar as item_name
                FROM commercial_invoice_lines cil
                LEFT JOIN items i ON cil.item_id = i.id
                WHERE cil.invoice_id = ?
            `).all(invoice.id);
            return { ...invoice, lines };
        });
    }
    getAllCommercialInvoices() {
        return this.db.prepare(`
            SELECT ci.*, p.name_ar as supplier_name, s.shipment_no
            FROM commercial_invoices ci
            LEFT JOIN business_partners p ON ci.supplier_id = p.id
            LEFT JOIN import_shipments s ON ci.shipment_id = s.id
            ORDER BY ci.invoice_date DESC
        `).all();
    }
    getCommercialInvoice(id) {
        const invoice = this.db.prepare(`
            SELECT ci.*, p.name_ar as supplier_name
            FROM commercial_invoices ci
            LEFT JOIN partners p ON ci.supplier_id = p.id
            WHERE ci.id = ?
        `).get(id);
        if (!invoice)
            return null;
        const lines = this.db.prepare(`
            SELECT cil.*, i.name_ar as item_name
            FROM commercial_invoice_lines cil
            LEFT JOIN items i ON cil.item_id = i.id
            WHERE cil.invoice_id = ?
        `).all(id);
        return { ...invoice, lines };
    }
    saveCommercialInvoice(data) {
        const { header, lines } = data;
        const id = header.id || crypto.randomUUID();
        const isNew = !header.id;
        const runTx = this.db.transaction(() => {
            if (isNew) {
                this.db.prepare(`
                    INSERT INTO commercial_invoices (
                        id, invoice_no, shipment_id, supplier_id, invoice_date,
                        currency_id, exchange_rate, total_amount, payment_terms,
                        incoterms, status, notes, created_by
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `).run(id, header.invoice_no, header.shipment_id, header.supplier_id, header.invoice_date, header.currency_id || 'USD', header.exchange_rate || 1, header.total_amount || 0, header.payment_terms, header.incoterms, header.status || 'DRAFT', header.notes, header.created_by);
            }
            else {
                this.db.prepare(`
                    UPDATE commercial_invoices SET
                        invoice_no = ?, supplier_id = ?, invoice_date = ?,
                        currency_id = ?, exchange_rate = ?, payment_terms = ?,
                        incoterms = ?, status = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                `).run(header.invoice_no, header.supplier_id, header.invoice_date, header.currency_id, header.exchange_rate, header.payment_terms, header.incoterms, header.status, header.notes, id);
            }
            // Delete existing lines and re-insert
            this.db.prepare('DELETE FROM commercial_invoice_lines WHERE invoice_id = ?').run(id);
            const insertLine = this.db.prepare(`
                INSERT INTO commercial_invoice_lines (
                    id, invoice_id, item_id, description, quantity,
                    unit_price, total_price, weight_kg, volume_cbm, hs_code
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `);
            lines?.forEach((line) => {
                insertLine.run(crypto.randomUUID(), id, line.item_id || null, line.description, line.quantity, line.unit_price, line.total_price, line.weight_kg || 0, line.volume_cbm || 0, line.hs_code);
            });
        });
        runTx();
        return { success: true, id };
    }
    deleteCommercialInvoice(id) {
        this.db.prepare('DELETE FROM commercial_invoices WHERE id = ?').run(id);
        return { success: true };
    }
    // ============================================================================
    // CLEARANCE EXPENSES METHODS
    // ============================================================================
    getClearanceExpenses(shipmentId) {
        return this.db.prepare(`
            SELECT * FROM clearance_expenses
            WHERE shipment_id = ?
            ORDER BY expense_date DESC
        `).all(shipmentId);
    }
    getClearanceExpense(id) {
        return this.db.prepare('SELECT * FROM clearance_expenses WHERE id = ?').get(id);
    }
    saveClearanceExpense(data) {
        const id = data.id || crypto.randomUUID();
        const isNew = !data.id;
        if (isNew) {
            this.db.prepare(`
                INSERT INTO clearance_expenses (
                    id, expense_no, shipment_id, expense_date, expense_type,
                    description, amount, currency_id, exchange_rate,
                    allocation_method, payment_method, paid_to, payment_reference, created_by
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(id, data.expense_no, data.shipment_id, data.expense_date, data.expense_type, data.description, data.amount, data.currency_id || 'ILS', data.exchange_rate || 1, data.allocation_method || 'VALUE', data.payment_method, data.paid_to, data.payment_reference, data.created_by);
        }
        else {
            this.db.prepare(`
                UPDATE clearance_expenses SET
                    expense_date = ?, expense_type = ?, description = ?,
                    amount = ?, currency_id = ?, exchange_rate = ?,
                    allocation_method = ?, payment_method = ?, paid_to = ?,
                    payment_reference = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `).run(data.expense_date, data.expense_type, data.description, data.amount, data.currency_id, data.exchange_rate, data.allocation_method, data.payment_method, data.paid_to, data.payment_reference, id);
        }
        return { success: true, id };
    }
    deleteClearanceExpense(id) {
        this.db.prepare('DELETE FROM clearance_expenses WHERE id = ?').run(id);
        return { success: true };
    }
    // ============================================================================
    // DOCUMENT MANAGEMENT METHODS
    // ============================================================================
    getShipmentDocuments(shipmentId) {
        return this.db.prepare(`
            SELECT * FROM shipment_documents
            WHERE shipment_id = ?
            ORDER BY upload_date DESC
        `).all(shipmentId);
    }
    saveShipmentDocument(data) {
        const id = crypto.randomUUID();
        this.db.prepare(`
            INSERT INTO shipment_documents (
                id, shipment_id, document_type, file_name, file_path,
                file_size, mime_type, uploaded_by, notes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(id, data.shipment_id, data.document_type, data.file_name, data.file_path, data.file_size, data.mime_type, data.uploaded_by, data.notes);
        return { success: true, id };
    }
    deleteShipmentDocument(id) {
        this.db.prepare('DELETE FROM shipment_documents WHERE id = ?').run(id);
        return { success: true };
    }
    // ============================================================================
    // ENHANCED LANDED COST METHODS
    // ============================================================================
    calculateLandedCost(shipmentId, method) {
        // Get total goods value from commercial invoices
        const goodsValue = this.db.prepare(`
            SELECT COALESCE(SUM(total_amount * exchange_rate), 0) as total
            FROM commercial_invoices
            WHERE shipment_id = ?
        `).get(shipmentId);
        // Get total expenses from clearance expenses
        const expenses = this.db.prepare(`
            SELECT COALESCE(SUM(amount_base_currency), 0) as total
            FROM clearance_expenses
            WHERE shipment_id = ? AND is_allocated = 0
        `).get(shipmentId);
        // Get items from commercial invoices
        const items = this.db.prepare(`
            SELECT 
                cil.item_id,
                i.name_ar as item_name,
                SUM(cil.quantity) as quantity,
                SUM(cil.total_price * ci.exchange_rate) as fob_value,
                SUM(cil.weight_kg) as weight_kg,
                SUM(cil.volume_cbm) as volume_cbm,
                i.cost_price as old_cost
            FROM commercial_invoice_lines cil
            INNER JOIN commercial_invoices ci ON cil.invoice_id = ci.id
            LEFT JOIN items i ON cil.item_id = i.id
            WHERE ci.shipment_id = ? AND cil.item_id IS NOT NULL
            GROUP BY cil.item_id
        `).all(shipmentId);
        const totalGoodsValue = goodsValue.total;
        const totalExpenses = expenses.total;
        const totalLandedCost = totalGoodsValue + totalExpenses;
        // Calculate allocation for each item
        const itemsWithAllocation = items.map((item) => {
            let allocationPercentage = 0;
            let allocatedExpense = 0;
            if (method === 'VALUE') {
                allocationPercentage = totalGoodsValue > 0 ? (item.fob_value / totalGoodsValue) * 100 : 0;
            }
            else if (method === 'WEIGHT') {
                const totalWeight = items.reduce((sum, i) => sum + (i.weight_kg || 0), 0);
                allocationPercentage = totalWeight > 0 ? ((item.weight_kg || 0) / totalWeight) * 100 : 0;
            }
            else if (method === 'VOLUME') {
                const totalVolume = items.reduce((sum, i) => sum + (i.volume_cbm || 0), 0);
                allocationPercentage = totalVolume > 0 ? ((item.volume_cbm || 0) / totalVolume) * 100 : 0;
            }
            allocatedExpense = (allocationPercentage / 100) * totalExpenses;
            const newCost = item.quantity > 0 ? (item.fob_value + allocatedExpense) / item.quantity : 0;
            return {
                item_id: item.item_id,
                item_name: item.item_name,
                quantity: item.quantity,
                fob_value: item.fob_value,
                weight_kg: item.weight_kg,
                volume_cbm: item.volume_cbm,
                allocation_percentage: allocationPercentage,
                allocated_expense: allocatedExpense,
                old_cost: item.old_cost || 0,
                new_cost: newCost
            };
        });
        return {
            shipment_id: shipmentId,
            total_goods_value: totalGoodsValue,
            total_expenses: totalExpenses,
            total_landed_cost: totalLandedCost,
            items: itemsWithAllocation
        };
    }
    applyLandedCost(shipmentId, allocations) {
        const allocationId = crypto.randomUUID();
        const runTx = this.db.transaction(() => {
            // Calculate totals
            const totalGoodsValue = allocations.reduce((sum, a) => sum + a.fob_value, 0);
            const totalExpenses = allocations.reduce((sum, a) => sum + a.allocated_expense, 0);
            const totalLandedCost = totalGoodsValue + totalExpenses;
            // Create allocation record
            this.db.prepare(`
                INSERT INTO landed_cost_allocations (
                    id, shipment_id, allocation_method, total_goods_value,
                    total_expenses, total_landed_cost, performed_by
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
            `).run(allocationId, shipmentId, allocations[0]?.allocation_method || 'VALUE', totalGoodsValue, totalExpenses, totalLandedCost, 'system' // TODO: Get actual user
            );
            // Create allocation details and update item costs
            const insertDetail = this.db.prepare(`
                INSERT INTO landed_cost_allocation_details (
                    id, allocation_id, item_id, quantity, fob_value,
                    weight_kg, volume_cbm, allocation_percentage,
                    allocated_expense, old_cost, new_cost
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `);
            const updateItemCost = this.db.prepare(`
                UPDATE items SET cost_price = ? WHERE id = ?
            `);
            allocations.forEach((allocation) => {
                // Insert detail
                insertDetail.run(crypto.randomUUID(), allocationId, allocation.item_id, allocation.quantity, allocation.fob_value, allocation.weight_kg || 0, allocation.volume_cbm || 0, allocation.allocation_percentage, allocation.allocated_expense, allocation.old_cost, allocation.new_cost);
                // Update item cost
                updateItemCost.run(allocation.new_cost, allocation.item_id);
            });
            // Mark expenses as allocated
            this.db.prepare(`
                UPDATE clearance_expenses
                SET is_allocated = 1
                WHERE shipment_id = ?
            `).run(shipmentId);
            // Mark shipment as cost allocated
            this.db.prepare(`
                UPDATE import_shipments
                SET is_cost_allocated = 1, cost_allocation_date = CURRENT_TIMESTAMP
                WHERE id = ?
            `).run(shipmentId);
        });
        runTx();
        return { success: true, allocation_id: allocationId };
    }
    getLandedCostHistory(shipmentId) {
        const allocations = this.db.prepare(`
            SELECT * FROM landed_cost_allocations
            WHERE shipment_id = ?
            ORDER BY allocation_date DESC
        `).all(shipmentId);
        return allocations.map((allocation) => {
            const details = this.db.prepare(`
                SELECT lca.*, i.name_ar as item_name
                FROM landed_cost_allocation_details lca
                LEFT JOIN items i ON lca.item_id = i.id
                WHERE lca.allocation_id = ?
            `).all(allocation.id);
            return { ...allocation, details };
        });
    }
    // ============================================================================
    // REPORTING METHODS
    // ============================================================================
    getShipmentCostBreakdown(shipmentId) {
        const shipment = this.db.prepare('SELECT * FROM import_shipments WHERE id = ?').get(shipmentId);
        const commercialInvoices = this.getCommercialInvoices(shipmentId);
        const clearanceExpenses = this.getClearanceExpenses(shipmentId);
        const totalGoods = commercialInvoices.reduce((sum, inv) => sum + (inv.total_amount * inv.exchange_rate), 0);
        const totalExpenses = clearanceExpenses.reduce((sum, exp) => sum + (exp.amount_base_currency || 0), 0);
        return {
            shipment,
            commercial_invoices: commercialInvoices,
            clearance_expenses: clearanceExpenses,
            total_goods_value: totalGoods,
            total_expenses: totalExpenses,
            total_cost: totalGoods + totalExpenses
        };
    }
    getContainersNearDemurrage(days = 3) {
        const alertDate = new Date();
        alertDate.setDate(alertDate.getDate() + days);
        return this.db.prepare(`
            SELECT c.*, s.shipment_no, s.supplier_id
            FROM containers c
            INNER JOIN import_shipments s ON c.shipment_id = s.id
            WHERE c.container_status IN ('IN_TRANSIT', 'ARRIVED')
            AND c.demurrage_alert_date <= ?
            ORDER BY c.demurrage_alert_date
        `).all(alertDate.toISOString().split('T')[0]);
    }
    getItemCostComparison(itemId) {
        return this.db.prepare(`
            SELECT 
                lcad.*, 
                lca.allocation_date,
                s.shipment_no,
                s.supplier_id,
                bp.name_ar as supplier_name
            FROM landed_cost_allocation_details lcad
            INNER JOIN landed_cost_allocations lca ON lcad.allocation_id = lca.id
            INNER JOIN import_shipments s ON lca.shipment_id = s.id
            LEFT JOIN business_partners bp ON s.supplier_id = bp.id
            WHERE lcad.item_id = ?
            ORDER BY lca.allocation_date DESC
        `).all(itemId);
    }
}
exports.ImportService = ImportService;
