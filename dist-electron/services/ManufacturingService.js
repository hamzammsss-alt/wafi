"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ManufacturingService = void 0;
const database_1 = require("../database");
const uuid_1 = require("uuid");
const InventoryService_1 = require("./InventoryService");
const JournalService_1 = require("./JournalService");
class ManufacturingService {
    // ================================================================
    // 1. FACTORY SETUP (Work Centers)
    // ================================================================
    static getWorkCenters() {
        return database_1.db.prepare('SELECT * FROM mfg_work_centers ORDER BY name').all();
    }
    static saveWorkCenter(data) {
        const isNew = !data.id;
        const id = data.id || (0, uuid_1.v4)();
        if (isNew) {
            database_1.db.prepare(`
                INSERT INTO mfg_work_centers (id, code, name, cost_per_hour, capacity_per_hour, overhead_rate_per_hour)
                VALUES (@id, @code, @name, @cost_per_hour, @capacity_per_hour, @overhead_rate_per_hour)
            `).run({
                ...data,
                id,
                cost_per_hour: data.cost_per_hour || 0,
                capacity_per_hour: data.capacity_per_hour || 1,
                overhead_rate_per_hour: data.overhead_rate_per_hour || 0
            });
        }
        else {
            database_1.db.prepare(`
                UPDATE mfg_work_centers 
                SET code = @code, name = @name, cost_per_hour = @cost_per_hour, 
                    capacity_per_hour = @capacity_per_hour, overhead_rate_per_hour = @overhead_rate_per_hour
                WHERE id = @id
            `).run(data);
        }
        return { success: true, id };
    }
    static deleteWorkCenter(id) {
        database_1.db.prepare('DELETE FROM mfg_work_centers WHERE id = ?').run(id);
        return { success: true };
    }
    // --- Machines ---
    static getMachines() {
        return database_1.db.prepare(`
            SELECT m.*, wc.name as work_center_name 
            FROM mfg_machines m
            LEFT JOIN mfg_work_centers wc ON m.work_center_id = wc.id
            ORDER BY m.name
        `).all();
    }
    static saveMachine(data) {
        const id = data.id || (0, uuid_1.v4)();
        if (data.id) {
            database_1.db.prepare(`
                UPDATE mfg_machines 
                SET work_center_id = @work_center_id, name = @name, 
                    serial_number = @serial_number, brand = @brand, model = @model, status = @status
                WHERE id = @id
            `).run({
                ...data,
                serial_number: data.serial_number || '',
                brand: data.brand || '',
                model: data.model || '',
                status: data.status || 'ACTIVE'
            });
        }
        else {
            database_1.db.prepare(`
                INSERT INTO mfg_machines (
                    id, work_center_id, name, serial_number, brand, model, status
                ) VALUES (
                    @id, @work_center_id, @name, @serial_number, @brand, @model, 'ACTIVE'
                )
            `).run({
                ...data,
                id,
                serial_number: data.serial_number || '',
                brand: data.brand || '',
                model: data.model || '',
                status: data.status || 'ACTIVE'
            });
        }
        return { success: true, id };
    }
    static deleteMachine(id) {
        database_1.db.prepare('DELETE FROM mfg_machines WHERE id = ?').run(id);
        return { success: true };
    }
    // ================================================================
    // 2. ENGINEERING (BOM & Routing)
    // ================================================================
    // --- BOM ---
    static createBOM(header, lines) {
        const id = (0, uuid_1.v4)();
        // BOM-001 format
        const bom_number = JournalService_1.JournalService.getNextVoucherNo('BOM');
        const tx = database_1.db.transaction(() => {
            // New Schema: mfg_boms (not mfg_bom_headers)
            database_1.db.prepare(`
                INSERT INTO mfg_boms (id, bom_number, item_id, batch_size, type, version, notes, is_default)
                VALUES (@id, @bom_number, @item_id, @batch_size, @type, @version, @notes, @is_default)
            `).run({
                id,
                bom_number,
                item_id: header.product_id || header.item_id, // flexible input
                batch_size: header.batch_size || 1,
                type: header.type || 'PRODUCTION',
                version: 1,
                notes: header.notes || '',
                is_default: header.is_default ? 1 : 0
            });
            const insertComponent = database_1.db.prepare(`
                INSERT INTO mfg_bom_components (id, bom_id, item_id, quantity, scarp_percentage)
                VALUES (@id, @bom_id, @item_id, @quantity, @scarp_percentage)
            `);
            for (const line of lines) {
                insertComponent.run({
                    id: (0, uuid_1.v4)(),
                    bom_id: id,
                    item_id: line.item_id,
                    quantity: line.quantity,
                    scarp_percentage: line.scarp_percentage || 0
                });
            }
            JournalService_1.JournalService.incrementVoucherNo('BOM');
        });
        tx();
        return { success: true, id, bom_number };
    }
    static getBOMs() {
        return database_1.db.prepare(`
            SELECT b.*, i.name_ar as item_name, i.code as item_code
            FROM mfg_boms b
            LEFT JOIN items i ON b.item_id = i.id
            ORDER BY b.bom_number DESC
        `).all();
    }
    static getBOM(id) {
        const header = database_1.db.prepare(`
            SELECT b.*, i.name_ar as item_name, i.code as item_code
            FROM mfg_boms b
            LEFT JOIN items i ON b.item_id = i.id
            WHERE b.id = ?
        `).get(id);
        if (!header)
            return null;
        const components = database_1.db.prepare(`
            SELECT c.*, i.name_ar, i.code, u.name_ar as unit_name
            FROM mfg_bom_components c
            LEFT JOIN items i ON c.item_id = i.id
            LEFT JOIN units u ON i.base_unit_id = u.id
            WHERE c.bom_id = ?
        `).all(id);
        return { ...header, components };
    }
    // --- Routing ---
    static saveRouting(header, operations) {
        const id = header.id || (0, uuid_1.v4)();
        const isNew = !header.id;
        const tx = database_1.db.transaction(() => {
            if (isNew) {
                database_1.db.prepare(`INSERT INTO mfg_routings (id, bom_id, name) VALUES (@id, @bom_id, @name)`).run({
                    id, bom_id: header.bom_id, name: header.name
                });
            }
            else {
                database_1.db.prepare(`UPDATE mfg_routings SET name = @name WHERE id = @id`).run({
                    id, name: header.name
                });
                // Delete old ops to replace
                database_1.db.prepare('DELETE FROM mfg_routing_operations WHERE routing_id = ?').run(id);
            }
            const insertOp = database_1.db.prepare(`
                INSERT INTO mfg_routing_operations (
                    id, routing_id, sequence_order, work_center_id, description, 
                    setup_time_minutes, run_time_minutes
                ) VALUES (
                    @id, @routing_id, @sequence_order, @work_center_id, @description, 
                    @setup_time_minutes, @run_time_minutes
                )
            `);
            for (const op of operations) {
                insertOp.run({
                    id: (0, uuid_1.v4)(),
                    routing_id: id,
                    sequence_order: op.sequence_order,
                    work_center_id: op.work_center_id,
                    description: op.description,
                    setup_time_minutes: op.setup_time_minutes || 0,
                    run_time_minutes: op.run_time_minutes || 0
                });
            }
        });
        tx();
        return { success: true, id };
    }
    static getRoutings(bomId) {
        const routings = database_1.db.prepare('SELECT * FROM mfg_routings WHERE bom_id = ?').all(bomId);
        return routings.map((r) => {
            const operations = database_1.db.prepare(`
                SELECT op.*, wc.name as work_center_name 
                FROM mfg_routing_operations op
                LEFT JOIN mfg_work_centers wc ON op.work_center_id = wc.id
                WHERE op.routing_id = ?
                ORDER BY op.sequence_order ASC
             `).all(r.id);
            return { ...r, operations };
        });
    }
    // ================================================================
    // 3. PRODUCTION ORDERS (Planning & Execution)
    // ================================================================
    static createProductionOrder(order) {
        const id = (0, uuid_1.v4)();
        const order_number = JournalService_1.JournalService.getNextVoucherNo('MFG');
        // Logic: if disassembly, might auto-create sub-orders? 
        // For now, standard creation.
        database_1.db.prepare(`
            INSERT INTO mfg_production_orders (
                id, order_number, bom_id, routing_id, item_id, 
                type, quantity, start_date, due_date, status, branch_id, warehouse_id
            ) VALUES (
                @id, @order_number, @bom_id, @routing_id, @item_id, 
                @type, @quantity, @start_date, @due_date, 'DRAFT', @branch_id, @warehouse_id
            )
        `).run({
            id,
            order_number,
            bom_id: order.bom_id,
            routing_id: order.routing_id || null,
            item_id: order.item_id, // Finished Good
            type: order.type || 'STANDARD',
            quantity: order.quantity,
            start_date: order.start_date,
            due_date: order.due_date,
            branch_id: order.branch_id || '1',
            warehouse_id: order.warehouse_id
        });
        JournalService_1.JournalService.incrementVoucherNo('MFG');
        return { success: true, id, order_number };
    }
    static getProductionOrders() {
        return database_1.db.prepare(`
            SELECT po.*, i.name_ar as item_name, w.name as warehouse_name
            FROM mfg_production_orders po
            LEFT JOIN items i ON po.item_id = i.id
            LEFT JOIN warehouses w ON po.warehouse_id = w.id
            ORDER BY po.order_number DESC
        `).all();
    }
    static updateOrderStatus(id, status) {
        database_1.db.prepare('UPDATE mfg_production_orders SET status = ? WHERE id = ?').run(status, id);
        return { success: true };
    }
    // Execute (Release Materials -> Finish Product)
    // Simplified logic for MVP: Single Step Completion
    // Real system would use Job Cards + Material Issue Vouchers
    static executeProductionOrder(orderId, actualQuantity, date) {
        const tx = database_1.db.transaction(() => {
            const order = database_1.db.prepare('SELECT * FROM mfg_production_orders WHERE id = ?').get(orderId);
            if (!order)
                throw new Error("Order not found");
            if (order.status === 'COMPLETED')
                throw new Error("Already completed");
            // 1. Get BOM Components
            const components = database_1.db.prepare('SELECT * FROM mfg_bom_components WHERE bom_id = ?').all(order.bom_id);
            if (components.length === 0)
                throw new Error("BOM has no components");
            const bomHeader = database_1.db.prepare('SELECT batch_size FROM mfg_boms WHERE id = ?').get(order.bom_id);
            const batchSize = bomHeader?.batch_size || 1;
            const ratio = actualQuantity / batchSize;
            let totalMaterialCost = 0;
            // 2. Deduct Materials
            for (const comp of components) {
                const requiredQty = comp.quantity * ratio;
                const wastage = requiredQty * (comp.scarp_percentage / 100);
                const finalQty = requiredQty + wastage;
                // Get Cost (FIFO or Avg) - here using current Avg Cost from Stock Balances
                // We need Warehouse ID from Order
                const stock = InventoryService_1.InventoryService.getStock(comp.item_id, order.warehouse_id);
                const unitCost = parseFloat(String(stock.avg_cost || '0'));
                // Fallback to item cost price if stock cost is 0
                // const itemMaster = db.prepare('SELECT cost_price FROM items WHERE id = ?').get(comp.item_id);
                // const finalUnitCost = unitCost > 0 ? unitCost : parseFloat(itemMaster?.cost_price || '0');
                const totalLineCost = finalQty * unitCost;
                totalMaterialCost += totalLineCost;
                // Execute Stock OUT
                InventoryService_1.InventoryService.updateStock(comp.item_id, finalQty, // Deducting quantity
                'OUT', order.order_number, `Consumed for MFG ${order.order_number}`, unitCost, order.warehouse_id);
            }
            // 3. Add Overhead / Labor Calculation (from Routing)
            // For MVP: Assuming 0 or fixed. 
            // TODO: Fetch Job Cards linked to this order and sum costs. 
            const laborCost = 0;
            const overheadCost = 0;
            const grandTotalCost = totalMaterialCost + laborCost + overheadCost;
            const unitCost = grandTotalCost / actualQuantity;
            // 4. Add Finished Good
            InventoryService_1.InventoryService.updateStock(order.item_id, actualQuantity, 'IN', order.order_number, `Produced from MFG ${order.order_number}`, unitCost, order.warehouse_id);
            // 5. Update Order
            database_1.db.prepare(`
                UPDATE mfg_production_orders 
                SET status = 'COMPLETED',
                    produced_quantity = @qty,
                    actual_material_cost = @mat,
                    actual_labor_cost = @lab,
                    actual_overhead_cost = @ovh,
                    total_cost = @total,
                    unit_cost = @unit
                WHERE id = @id
            `).run({
                id: orderId,
                qty: actualQuantity,
                mat: totalMaterialCost,
                lab: laborCost,
                ovh: overheadCost,
                total: grandTotalCost,
                unit: unitCost
            });
            // 6. Generate JV (WIP => FG) or (Raw => FG)
            // Implementation of JV Service linkage...
        });
        tx();
        return { success: true };
    }
    // ================================================================
    // 4. JOB CARDS (Shop Floor)
    // ================================================================
    static getJobCards(filters = {}) {
        let query = `
            SELECT jc.*, 
                   po.order_number, 
                   op.description as operation_name,
                   wc.name as work_center_name,
                   emp.name as employee_name
            FROM mfg_job_cards jc
            LEFT JOIN mfg_production_orders po ON jc.production_order_id = po.id
            LEFT JOIN mfg_routing_operations op ON jc.operation_id = op.id
            LEFT JOIN mfg_work_centers wc ON jc.work_center_id = wc.id
            LEFT JOIN employees emp ON jc.employee_id = emp.id
            WHERE 1=1
        `;
        const params = [];
        if (filters.production_order_id) {
            query += ` AND jc.production_order_id = ?`;
            params.push(filters.production_order_id);
        }
        if (filters.status) {
            query += ` AND jc.status = ?`;
            params.push(filters.status);
        }
        query += ` ORDER BY jc.start_time DESC`;
        return database_1.db.prepare(query).all(...params);
    }
    static createJobCard(data) {
        const id = (0, uuid_1.v4)();
        database_1.db.prepare(`
            INSERT INTO mfg_job_cards (
                id, production_order_id, operation_id, work_center_id, 
                employee_id, start_time, status
            ) VALUES (
                @id, @production_order_id, @operation_id, @work_center_id, 
                @employee_id, @start_time, 'IN_PROGRESS'
            )
        `).run({
            id,
            production_order_id: data.production_order_id,
            operation_id: data.operation_id,
            work_center_id: data.work_center_id,
            employee_id: data.employee_id || null,
            start_time: data.start_time || new Date().toISOString()
        });
        return { success: true, id };
    }
    static stopJobCard(id, data) {
        database_1.db.prepare(`
            UPDATE mfg_job_cards 
            SET end_time = @end_time,
                produced_quantity = @produced_quantity,
                status = 'COMPLETED'
            WHERE id = @id
        `).run({
            id,
            end_time: data.end_time || new Date().toISOString(),
            produced_quantity: data.produced_quantity || 0
        });
        return { success: true };
    }
    // ================================================================
    // 5. QUALITY CONTROL
    // ================================================================
    static getQCTests() {
        return database_1.db.prepare('SELECT * FROM mfg_qc_tests').all();
    }
    static saveQCTest(data) {
        const id = data.id || (0, uuid_1.v4)();
        if (data.id) {
            database_1.db.prepare(`
                UPDATE mfg_qc_tests 
                SET name = @name, description = @description, test_type = @test_type, 
                    min_value = @min_value, max_value = @max_value, unit = @unit
                WHERE id = @id
            `).run(data);
        }
        else {
            database_1.db.prepare(`
                INSERT INTO mfg_qc_tests (id, name, description, test_type, min_value, max_value, unit)
                VALUES (@id, @name, @description, @test_type, @min_value, @max_value, @unit)
            `).run({ ...data, id });
        }
        return { success: true, id };
    }
    static getInspections(filters = {}) {
        let query = 'SELECT * FROM mfg_qc_inspections WHERE 1=1';
        const params = [];
        if (filters.status) {
            query += ' AND status = ?';
            params.push(filters.status);
        }
        query += ' ORDER BY inspection_date DESC';
        return database_1.db.prepare(query).all(...params);
    }
    static saveInspection(data) {
        const id = (0, uuid_1.v4)();
        database_1.db.prepare(`
            INSERT INTO mfg_qc_inspections (
                id, reference_type, reference_id, inspector_id, batch_number,
                sample_size, passed_quantity, failed_quantity, status, notes
            ) VALUES (
                @id, @reference_type, @reference_id, @inspector_id, @batch_number,
                @sample_size, @passed_quantity, @failed_quantity, @status, @notes
            )
        `).run({ ...data, id });
        return { success: true, id };
    }
    // ================================================================
    // 6. MAINTENANCE
    // ================================================================
    static getMaintenanceRequests(filters = {}) {
        let query = `
            SELECT mr.*, wc.name as machine_name 
            FROM mfg_maintenance_requests mr
            LEFT JOIN mfg_machines wc ON mr.machine_id = wc.id
            WHERE 1=1
        `;
        const params = [];
        if (filters.status) {
            query += ' AND mr.status = ?';
            params.push(filters.status);
        }
        query += ' ORDER BY request_date DESC';
        return database_1.db.prepare(query).all(...params);
    }
    static saveMaintenanceRequest(data) {
        const id = data.id || (0, uuid_1.v4)();
        const request_number = JournalService_1.JournalService.getNextVoucherNo('MAINT');
        if (data.id) {
            database_1.db.prepare(`
                UPDATE mfg_maintenance_requests 
                SET issue_description = @issue_description, priority = @priority, status = @status
                WHERE id = @id
            `).run(data);
        }
        else {
            database_1.db.prepare(`
                INSERT INTO mfg_maintenance_requests (
                    id, request_number, machine_id, requested_by, issue_description, priority, status
                ) VALUES (
                    @id, @request_number, @machine_id, @requested_by, @issue_description, @priority, 'OPEN'
                )
            `).run({ ...data, id, request_number });
            JournalService_1.JournalService.incrementVoucherNo('MAINT');
        }
        return { success: true, id };
    }
    // ================================================================
    // 7. REPORTS
    // ================================================================
    static getWIPReport() {
        // Active Orders
        const query = `
            SELECT 
                po.id, po.order_number, po.status, po.quantity,
                p.name as product_name, p.cost_price as std_cost,
                
                -- Material Cost (Actual Issued)
                COALESCE((
                    SELECT SUM(qty_issued * unit_cost) 
                    FROM mfg_production_order_inputs 
                    WHERE production_order_id = po.id
                ), 0) as material_cost,

                -- Labor Cost (From Job Cards)
                -- Assuming fixed rate for now, e.g. 50/hr, can be improved to use Work Center Cost
                COALESCE((
                    SELECT SUM(
                        (julianday(IFNULL(end_time, datetime('now'))) - julianday(start_time)) * 24 * 
                        COALESCE((SELECT hourly_cost FROM mfg_work_centers WHERE id = jc.work_center_id), 0)
                    )
                    FROM mfg_job_cards jc 
                    WHERE jc.production_order_id = po.id
                ), 0) as labor_cost

            FROM mfg_production_orders po
            LEFT JOIN items p ON po.item_id = p.id
            WHERE po.status IN ('RELEASED', 'IN_PROGRESS')
            ORDER BY po.start_date DESC
        `;
        return database_1.db.prepare(query).all();
    }
}
exports.ManufacturingService = ManufacturingService;
