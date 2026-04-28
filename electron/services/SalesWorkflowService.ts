import { db } from '../database';
import { v4 as uuidv4 } from 'uuid';

type WorkflowResult = {
    status: string;
    action: string;
    [key: string]: any;
};

const EPSILON = 0.000001;
const AR_PENDING_STATUS = 'PENDING_APPROVAL_L1';
const AR_DISPATCH_DRAFT = 'محفوظ';

export class SalesWorkflowService {
    private static initialized = false;

    static ensureSchema(): void {
        if (this.initialized) return;

        this.addColumn('sales_quotations', 'version', 'INTEGER DEFAULT 1');
        this.addColumn('sales_quotations', 'doc_date', 'TEXT');
        this.addColumn('sales_quotations', 'created_by', 'TEXT');
        this.addColumn('sales_quotations', 'submitted_at', 'DATETIME');
        this.addColumn('sales_quotations', 'submitted_by', 'TEXT');
        this.addColumn('sales_quotations', 'converted_order_id', 'TEXT');

        this.addColumn('sales_orders', 'version', 'INTEGER DEFAULT 1');
        this.addColumn('sales_orders', 'doc_date', 'TEXT');
        this.addColumn('sales_orders', 'created_by', 'TEXT');
        this.addColumn('sales_orders', 'exchange_rate', 'REAL DEFAULT 1');
        this.addColumn('sales_orders', 'posted_at', 'DATETIME');
        this.addColumn('sales_orders', 'posted_by', 'TEXT');
        this.addColumn('sales_orders', 'delivery_status', "TEXT DEFAULT 'PENDING'");
        this.addColumn('sales_orders', 'production_status', "TEXT DEFAULT 'NOT_REQUIRED'");

        this.addColumn('sales_order_lines', 'line_no', 'INTEGER DEFAULT 0');
        this.addColumn('sales_order_lines', 'dispatched_qty', 'REAL DEFAULT 0');
        this.addColumn('sales_order_lines', 'invoiced_qty', 'REAL DEFAULT 0');
        this.addColumn('sales_order_lines', 'source_quotation_line_id', 'TEXT');

        this.addColumn('dispatch_header', 'source_type', 'TEXT');
        this.addColumn('dispatch_header', 'source_id', 'TEXT');
        this.addColumn('dispatch_header', 'invoice_id', 'TEXT');
        this.addColumn('dispatch_header', 'posted_at', 'DATETIME');
        this.addColumn('dispatch_header', 'invoiced_at', 'DATETIME');
        this.addColumn('dispatch_header', 'region_id', 'TEXT');
        this.addColumn('dispatch_header', 'loading_area', 'TEXT');
        this.addColumn('dispatch_header', 'loading_sheet_no', 'TEXT');
        this.addColumn('dispatch_header', 'order_loading_list_no', 'TEXT');
        this.addColumn('dispatch_lines', 'source_line_id', 'TEXT');

        this.initialized = true;
    }

    static postQuotationToPending(id: string, userId = 'admin'): WorkflowResult {
        this.ensureSchema();
        const quoteId = this.required(id, 'Quotation id is required');

        return db.transaction(() => {
            const quote = this.requireRow('sales_quotations', quoteId, 'عرض السعر غير موجود');
            const status = this.status(quote.status);
            if (status === 'CONVERTED') {
                return { status: 'CONVERTED', action: 'already_converted' };
            }
            if (status === AR_PENDING_STATUS) {
                return { status: AR_PENDING_STATUS, action: 'already_pending' };
            }
            if (status !== 'DRAFT' && status !== 'REJECTED' && status !== 'SENT') {
                throw new Error(`لا يمكن ترحيل عرض السعر من الحالة ${status}`);
            }

            this.assertHasLines('sales_quotation_lines', 'quotation_id', quoteId, 'يجب إدخال صنف واحد على الأقل قبل ترحيل عرض السعر');
            db.prepare(`
                UPDATE sales_quotations
                SET status = ?,
                    submitted_by = ?,
                    submitted_at = CURRENT_TIMESTAMP,
                    version = COALESCE(version, 1) + 1
                WHERE id = ?
            `).run(AR_PENDING_STATUS, userId, quoteId);

            return { status: AR_PENDING_STATUS, action: 'posted_to_pending' };
        })();
    }

    static convertQuotationToOrder(payload: { quotationId: string; userId?: string }): WorkflowResult {
        this.ensureSchema();
        const quotationId = this.required(payload?.quotationId, 'Quotation id is required');
        const userId = String(payload?.userId || 'admin');

        return db.transaction(() => {
            const quote = this.requireRow('sales_quotations', quotationId, 'عرض السعر غير موجود');
            const status = this.status(quote.status);
            if (status === 'DRAFT') {
                throw new Error('يجب ترحيل عرض السعر إلى عالق قبل تحويله إلى طلبية مبيعات');
            }
            if (status === 'CANCELLED' || status === 'EXPIRED') {
                throw new Error('لا يمكن تحويل عرض سعر ملغى أو منتهي');
            }

            const existing = db.prepare(`
                SELECT id, order_no
                FROM sales_orders
                WHERE quotation_id = ?
                  AND UPPER(COALESCE(status, '')) <> 'CANCELLED'
                ORDER BY created_at DESC
                LIMIT 1
            `).get(quotationId) as any;
            if (existing?.id) {
                this.markQuotationConverted(quotationId, existing.id);
                return {
                    status: 'CONVERTED',
                    action: 'already_converted',
                    targetDocumentId: existing.id,
                    targetDocNo: existing.order_no,
                };
            }

            const lines = this.listRows('sales_quotation_lines', 'quotation_id', quotationId);
            if (!lines.length) throw new Error('لا يوجد أسطر لتحويل عرض السعر إلى طلبية');

            const orderId = uuidv4();
            const orderNo = this.nextDocNo('sales_order', 'SO');
            const today = new Date().toISOString().slice(0, 10);
            const warehouseId = this.firstWarehouseId();

            this.insertRow('sales_orders', {
                id: orderId,
                order_no: orderNo,
                quotation_id: quotationId,
                customer_id: quote.customer_id,
                branch_id: quote.branch_id || this.defaultBranchId(),
                warehouse_id: warehouseId,
                date: today,
                doc_date: today,
                delivery_date: null,
                subtotal: this.toNumber(quote.subtotal),
                tax_total: this.toNumber(quote.tax_total),
                discount_total: this.toNumber(quote.discount_total),
                grand_total: this.toNumber(quote.grand_total),
                currency_id: quote.currency_id || 'ILS',
                exchange_rate: this.toNumber(quote.exchange_rate, 1),
                status: 'DRAFT',
                delivery_status: 'PENDING',
                production_status: 'NOT_REQUIRED',
                notes: quote.notes || null,
                created_by: userId,
                created_at: new Date().toISOString(),
                version: 1,
            });

            lines.forEach((line, index) => {
                const qty = this.toNumber(line.quantity ?? line.qty);
                const price = this.toNumber(line.unit_price ?? line.price);
                const discountAmount = this.toNumber(line.discount_amount);
                const taxAmount = this.toNumber(line.tax_amount);
                const netTotal = this.toNumber(line.net_total ?? line.line_total ?? line.total_price);
                this.insertRow('sales_order_lines', {
                    id: uuidv4(),
                    order_id: orderId,
                    line_no: index + 1,
                    item_id: line.item_id,
                    description: line.description || '',
                    quantity: qty,
                    unit_id: line.unit_id || 'PCS',
                    unit_price: price,
                    total_price: this.toNumber(line.total_price, qty * price - discountAmount),
                    discount_amount: discountAmount,
                    discount: this.toNumber(line.discount),
                    tax_amount: taxAmount,
                    tax_rate: this.toNumber(line.tax_rate),
                    net_total: netTotal,
                    line_total: netTotal,
                    dispatched_qty: 0,
                    invoiced_qty: 0,
                    source_quotation_line_id: line.id,
                });
            });

            this.markQuotationConverted(quotationId, orderId);

            return {
                status: 'CONVERTED',
                action: 'converted_to_order',
                targetDocumentId: orderId,
                targetDocNo: orderNo,
            };
        })();
    }

    static postOrderToPending(id: string, userId = 'admin'): WorkflowResult {
        this.ensureSchema();
        const orderId = this.required(id, 'Order id is required');

        return db.transaction(() => {
            const order = this.requireRow('sales_orders', orderId, 'طلبية المبيعات غير موجودة');
            const status = this.status(order.status);
            if (status === 'COMPLETED' || status === 'CANCELLED') {
                throw new Error('لا يمكن ترحيل طلبية مكتملة أو ملغاة');
            }

            this.assertHasLines('sales_order_lines', 'order_id', orderId, 'يجب إدخال صنف واحد على الأقل قبل ترحيل الطلبية');
            const productionOrders = this.createProductionOrdersForShortage(order, userId);
            const productionStatus = productionOrders.length > 0 ? 'CREATED' : 'NOT_REQUIRED';

            db.prepare(`
                UPDATE sales_orders
                SET status = 'CONFIRMED',
                    delivery_status = COALESCE(NULLIF(delivery_status, ''), 'PENDING'),
                    production_status = ?,
                    posted_by = ?,
                    posted_at = CURRENT_TIMESTAMP,
                    version = COALESCE(version, 1) + 1
                WHERE id = ?
            `).run(productionStatus, userId, orderId);

            return {
                status: 'CONFIRMED',
                action: status === 'CONFIRMED' ? 'already_pending' : 'posted_to_pending',
                productionOrdersCreated: productionOrders.length,
                productionOrderIds: productionOrders,
            };
        })();
    }

    static convertOrderToDispatch(payload: {
        orderId: string;
        warehouseId?: string | null;
        truckId?: string | null;
        regionId?: string | null;
        loadingArea?: string | null;
        loadingSheetNo?: string | null;
        userId?: string | null;
    }): WorkflowResult {
        this.ensureSchema();
        const orderId = this.required(payload?.orderId, 'Order id is required');

        return db.transaction(() => {
            const order = this.requireRow('sales_orders', orderId, 'طلبية المبيعات غير موجودة');
            const status = this.status(order.status);
            if (!['CONFIRMED', 'PARTIAL', AR_PENDING_STATUS].includes(status)) {
                throw new Error('يجب أن تكون الطلبية عالقة قبل تحويلها إلى سند إرسال');
            }

            const sourceLines = this.listRows('sales_order_lines', 'order_id', orderId)
                .map((line) => {
                    const qty = this.toNumber(line.quantity ?? line.qty);
                    const dispatched = this.toNumber(line.dispatched_qty);
                    return { line, remaining: Math.max(0, qty - dispatched) };
                })
                .filter((row) => row.remaining > EPSILON);

            if (!sourceLines.length) {
                throw new Error('لا توجد كميات متبقية للتحويل إلى سند إرسال');
            }

            const dispatchId = uuidv4();
            const serialNo = this.nextDispatchNo();
            const now = new Date();
            const warehouseId = this.required(payload?.warehouseId || order.warehouse_id || this.firstWarehouseId(), 'المستودع مطلوب لإنشاء سند الإرسال');

            this.insertRow('dispatch_header', {
                id: dispatchId,
                serial_no: serialNo,
                status: AR_DISPATCH_DRAFT,
                dispatch_type: 'تحميل طلبية مبيعات',
                dispatch_date: now.toISOString().slice(0, 10),
                dispatch_time: now.toTimeString().slice(0, 8),
                from_warehouse_id: warehouseId,
                to_type: 'Customer',
                to_id: order.customer_id,
                ledger_id: order.customer_id,
                truck_id: payload?.truckId || null,
                region_id: payload?.regionId || null,
                loading_area: payload?.loadingArea || null,
                loading_sheet_no: payload?.loadingSheetNo || serialNo,
                order_loading_list_no: payload?.loadingSheetNo || serialNo,
                send_to: order.customer_name || null,
                source_type: 'SALES_ORDER',
                source_id: orderId,
                notes: `من طلبية المبيعات ${order.order_no || ''}`.trim(),
                created_at: now.toISOString(),
                updated_at: now.toISOString(),
            });

            sourceLines.forEach((entry, index) => {
                this.insertRow('dispatch_lines', {
                    id: uuidv4(),
                    header_id: dispatchId,
                    line_no: index + 1,
                    item_id: entry.line.item_id,
                    uom: entry.line.unit_id || 'PCS',
                    qty: entry.remaining,
                    ref: order.order_no || null,
                    line_note: entry.line.description || null,
                    source_line_id: entry.line.id,
                });
            });

            return {
                status: AR_DISPATCH_DRAFT,
                action: 'converted_to_dispatch',
                targetDocumentId: dispatchId,
                targetDocNo: serialNo,
            };
        })();
    }

    private static createProductionOrdersForShortage(order: any, userId: string): string[] {
        if (!this.tableExists('mfg_production_orders')) return [];

        const orderId = String(order.id || '');
        const warehouseId = String(order.warehouse_id || this.firstWarehouseId() || '').trim();
        if (!warehouseId) return [];

        const created: string[] = [];
        const lines = this.listRows('sales_order_lines', 'order_id', orderId);
        for (const line of lines) {
            const itemId = String(line.item_id || '').trim();
            if (!itemId) continue;
            if (this.isServiceItem(itemId)) continue;

            const requestedQty = this.toNumber(line.quantity ?? line.qty);
            const availableQty = this.stockQty(itemId, warehouseId);
            const shortageQty = Math.max(0, requestedQty - availableQty);
            if (shortageQty <= EPSILON) continue;

            const existing = db.prepare(`
                SELECT id
                FROM mfg_production_orders
                WHERE source_doc_type = 'SALES_ORDER'
                  AND source_doc_id = ?
                  AND item_id = ?
                  AND UPPER(COALESCE(status, '')) <> 'CANCELLED'
                LIMIT 1
            `).get(orderId, itemId) as { id?: string } | undefined;
            if (existing?.id) continue;

            created.push(this.createProductionOrder(order, line, shortageQty, warehouseId, userId));
        }
        return created;
    }

    private static createProductionOrder(order: any, line: any, qtyPlanned: number, warehouseId: string, userId: string): string {
        const companyId = String(order.company_id || 'COMP_01');
        const branchId = String(order.branch_id || this.defaultBranchId());
        const itemId = String(line.item_id || '');
        const now = new Date().toISOString();
        const bom = this.defaultBom(companyId, itemId);
        const routing = this.defaultRouting(companyId, itemId);
        const orderId = uuidv4();

        this.insertRow('mfg_production_orders', {
            id: orderId,
            company_id: companyId,
            branch_id: branchId,
            order_no: this.nextMfgOrderNo(companyId, branchId),
            order_date: now.slice(0, 10),
            status: 'DRAFT',
            item_id: itemId,
            bom_id: bom?.id || null,
            routing_id: routing?.id || null,
            warehouse_id: warehouseId,
            qty_planned: qtyPlanned,
            qty_started: 0,
            qty_completed: 0,
            qty_scrapped: 0,
            qty_issued: 0,
            material_cost_issued: 0,
            labor_cost_estimated: 0,
            machine_cost_estimated: 0,
            cost_capitalized: 0,
            total_wip_cost: 0,
            unit_cost_completed: 0,
            reference_no: order.order_no || null,
            remarks: 'تم إنشاؤه تلقائياً من نقص طلبية المبيعات',
            created_by: userId,
            approved_by: null,
            source_doc_type: 'SALES_ORDER',
            source_doc_id: order.id,
            created_at: now,
            updated_at: now,
        });

        if (bom?.id) {
            const bomLines = this.listRows('mfg_bom_lines', 'bom_id', bom.id);
            bomLines.forEach((bomLine, index) => {
                const outputQty = Math.max(this.toNumber(bom.output_qty, 1), EPSILON);
                const qtyRequired = this.round(qtyPlanned * (this.toNumber(bomLine.qty_per) / outputQty) * (1 + this.toNumber(bomLine.scrap_percent) / 100));
                const unitCost = this.itemCost(bomLine.component_item_id);
                this.insertRow('mfg_production_order_components', {
                    id: uuidv4(),
                    production_order_id: orderId,
                    line_no: index + 1,
                    component_item_id: bomLine.component_item_id,
                    warehouse_id: bomLine.warehouse_id || warehouseId,
                    qty_required: qtyRequired,
                    qty_issued: 0,
                    qty_returned: 0,
                    issue_method: bomLine.issue_method || 'MANUAL',
                    unit_cost: unitCost,
                    total_cost: this.round(qtyRequired * unitCost),
                    remarks: bomLine.remarks || null,
                });
            });
        }

        if (routing?.id) {
            const steps = this.listRows('mfg_routing_steps', 'routing_id', routing.id);
            steps.forEach((step, index) => {
                this.insertRow('mfg_production_order_operations', {
                    id: uuidv4(),
                    production_order_id: orderId,
                    step_no: index + 1,
                    work_center_code: step.work_center_code,
                    operation_code: step.operation_code,
                    status: 'PENDING',
                    setup_time_minutes: this.toNumber(step.setup_time_minutes),
                    run_time_minutes: this.toNumber(step.run_time_minutes),
                    labor_cost_rate: this.toNumber(step.labor_cost_rate),
                    machine_cost_rate: this.toNumber(step.machine_cost_rate),
                });
            });
        }

        return orderId;
    }

    private static markQuotationConverted(quotationId: string, orderId: string): void {
        db.prepare(`
            UPDATE sales_quotations
            SET status = 'CONVERTED',
                converted_order_id = ?,
                version = COALESCE(version, 1) + 1
            WHERE id = ?
        `).run(orderId, quotationId);
    }

    private static defaultBom(companyId: string, itemId: string): any | null {
        try {
            return db.prepare(`
                SELECT *
                FROM mfg_bom_headers
                WHERE item_id = ?
                  AND UPPER(COALESCE(status, '')) = 'CONFIRMED'
                  AND COALESCE(is_default, 0) = 1
                  AND (company_id = ? OR COALESCE(company_id, '') = '')
                ORDER BY version_no DESC, updated_at DESC
                LIMIT 1
            `).get(itemId, companyId) || null;
        } catch {
            return null;
        }
    }

    private static defaultRouting(companyId: string, itemId: string): any | null {
        try {
            return db.prepare(`
                SELECT *
                FROM mfg_routing_headers
                WHERE item_id = ?
                  AND UPPER(COALESCE(status, '')) = 'CONFIRMED'
                  AND COALESCE(is_default, 0) = 1
                  AND (company_id = ? OR COALESCE(company_id, '') = '')
                ORDER BY version_no DESC, updated_at DESC
                LIMIT 1
            `).get(itemId, companyId) || null;
        } catch {
            return null;
        }
    }

    private static listRows(table: string, foreignKey: string, id: string): any[] {
        try {
            return db.prepare(`SELECT * FROM ${table} WHERE ${foreignKey} = ? ORDER BY COALESCE(line_no, rowid), rowid`).all(id) as any[];
        } catch {
            return [];
        }
    }

    private static requireRow(table: string, id: string, message: string): any {
        const row = db.prepare(`SELECT * FROM ${table} WHERE id = ? LIMIT 1`).get(id) as any;
        if (!row) throw new Error(message);
        return row;
    }

    private static assertHasLines(table: string, foreignKey: string, id: string, message: string): void {
        const row = db.prepare(`SELECT COUNT(1) AS count FROM ${table} WHERE ${foreignKey} = ?`).get(id) as { count?: number } | undefined;
        if (Number(row?.count || 0) <= 0) throw new Error(message);
    }

    private static nextDocNo(sequenceKey: string, prefix: string): string {
        db.prepare(`INSERT OR IGNORE INTO doc_sequences(doc_type, next_no) VALUES(?, 1)`).run(sequenceKey);
        const row = db.prepare(`SELECT next_no FROM doc_sequences WHERE doc_type = ? LIMIT 1`).get(sequenceKey) as { next_no?: number } | undefined;
        const next = Math.max(Number(row?.next_no || 1), 1);
        db.prepare(`UPDATE doc_sequences SET next_no = next_no + 1 WHERE doc_type = ?`).run(sequenceKey);
        return `${prefix}-${String(next).padStart(4, '0')}`;
    }

    private static nextDispatchNo(): string {
        return this.nextDocNo('dispatch_note', `DSP-${new Date().getFullYear()}`);
    }

    private static nextMfgOrderNo(companyId: string, branchId: string): string {
        const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const pattern = `MO-${today}-%`;
        const row = db.prepare(`
            SELECT COUNT(1) AS count
            FROM mfg_production_orders
            WHERE COALESCE(company_id, '') = ?
              AND COALESCE(branch_id, '') = ?
              AND order_no LIKE ?
        `).get(companyId, branchId, pattern) as { count?: number } | undefined;
        return `MO-${today}-${String(Number(row?.count || 0) + 1).padStart(4, '0')}`;
    }

    private static getColumns(table: string): Set<string> {
        try {
            const rows = db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;
            return new Set(rows.map((row) => String(row.name || '').trim()).filter(Boolean));
        } catch {
            return new Set();
        }
    }

    private static tableExists(table: string): boolean {
        try {
            const row = db.prepare(`
                SELECT name
                FROM sqlite_master
                WHERE type = 'table' AND name = ?
                LIMIT 1
            `).get(table) as { name?: string } | undefined;
            return Boolean(row?.name);
        } catch {
            return false;
        }
    }

    private static addColumn(table: string, column: string, ddl: string): void {
        try {
            if (!this.getColumns(table).has(column)) {
                db.prepare(`ALTER TABLE ${table} ADD COLUMN ${column} ${ddl}`).run();
            }
        } catch (error: any) {
            if (!String(error?.message || '').includes('duplicate column name')) {
                console.warn(`[SalesWorkflowService] Could not add ${table}.${column}: ${error?.message || error}`);
            }
        }
    }

    private static insertRow(table: string, values: Record<string, any>): void {
        const columns = this.getColumns(table);
        const entries = Object.entries(values).filter(([key]) => columns.has(key));
        if (!entries.length) return;
        const names = entries.map(([key]) => key);
        const placeholders = names.map((key) => `@${key}`);
        db.prepare(`INSERT INTO ${table} (${names.join(', ')}) VALUES (${placeholders.join(', ')})`)
            .run(Object.fromEntries(entries));
    }

    private static required(value: unknown, message: string): string {
        const normalized = String(value || '').trim();
        if (!normalized) throw new Error(message);
        return normalized;
    }

    private static status(value: unknown): string {
        return String(value || 'DRAFT').trim().toUpperCase();
    }

    private static toNumber(value: unknown, fallback = 0): number {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : fallback;
    }

    private static round(value: number): number {
        return Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
    }

    private static stockQty(itemId: string, warehouseId: string): number {
        const row = db.prepare(`
            SELECT COALESCE(quantity, 0) AS quantity
            FROM stock_balances
            WHERE item_id = ? AND warehouse_id = ?
            LIMIT 1
        `).get(itemId, warehouseId) as { quantity?: number } | undefined;
        return this.toNumber(row?.quantity);
    }

    private static itemCost(itemId: string): number {
        const row = db.prepare(`SELECT COALESCE(cost_price, 0) AS cost_price FROM items WHERE id = ? LIMIT 1`).get(itemId) as { cost_price?: number } | undefined;
        return this.toNumber(row?.cost_price);
    }

    private static isServiceItem(itemId: string): boolean {
        const row = db.prepare(`SELECT COALESCE(type, item_type, '') AS type FROM items WHERE id = ? LIMIT 1`).get(itemId) as { type?: string } | undefined;
        return ['SERVICE', 'SERVICES'].includes(String(row?.type || '').trim().toUpperCase());
    }

    private static defaultBranchId(): string {
        const main = db.prepare(`SELECT id FROM branches WHERE COALESCE(is_main, 0) = 1 LIMIT 1`).get() as { id?: string } | undefined;
        if (main?.id) return String(main.id);
        const anyBranch = db.prepare(`SELECT id FROM branches LIMIT 1`).get() as { id?: string } | undefined;
        return String(anyBranch?.id || 'MAIN');
    }

    private static firstWarehouseId(): string {
        const row = db.prepare(`SELECT id FROM warehouses WHERE COALESCE(is_active, 1) = 1 LIMIT 1`).get() as { id?: string } | undefined;
        return String(row?.id || '').trim();
    }
}
