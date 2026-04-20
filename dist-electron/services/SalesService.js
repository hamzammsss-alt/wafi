"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SalesService = void 0;
const database_1 = require("../database");
const uuid_1 = require("uuid");
const JournalService_1 = require("./JournalService");
const InventoryService_1 = require("./InventoryService");
const FinancialAccountRole_1 = require("../../src/main/domain/accountingResolution/enums/FinancialAccountRole");
const ResolutionDirection_1 = require("../../src/main/domain/accountingResolution/enums/ResolutionDirection");
class SalesService {
    static configureAccountResolutionUseCases(useCases) {
        this.accountResolutionUseCases = useCases;
    }
    // --- Invoice Operations ---
    // --- Invoice Operations ---
    static async createInvoice(invoice, createContext = {}) {
        // Invoice Data Structure:
        // { header: { customer_id, branch_id, manual_ref, cost_center_id, ... }, lines: [ ... ] }
        const { header, lines } = invoice;
        const invoiceId = (0, uuid_1.v4)();
        const dispatchDocumentId = String(header?.dispatch_document_id || '').trim();
        const salesOrderId = String(header?.sales_order_id || '').trim();
        const quotationId = String(header?.quotation_id || '').trim();
        const companyId = String(header?.company_id || createContext.companyId || 'COMP_01').trim() || 'COMP_01';
        // 0. Self-Heal Schema (Add missing columns)
        try {
            const cols = database_1.db.prepare("PRAGMA table_info(sales_invoices)").all();
            if (!cols.some((c) => c.name === 'manual_ref')) {
                database_1.db.prepare("ALTER TABLE sales_invoices ADD COLUMN manual_ref TEXT").run();
            }
            if (!cols.some((c) => c.name === 'cost_center_id')) {
                database_1.db.prepare("ALTER TABLE sales_invoices ADD COLUMN cost_center_id TEXT").run();
            }
            if (!cols.some((c) => c.name === 'dispatch_document_id')) {
                database_1.db.prepare("ALTER TABLE sales_invoices ADD COLUMN dispatch_document_id TEXT").run();
            }
            if (!cols.some((c) => c.name === 'sales_order_id')) {
                database_1.db.prepare("ALTER TABLE sales_invoices ADD COLUMN sales_order_id TEXT").run();
            }
            if (!cols.some((c) => c.name === 'quotation_id')) {
                database_1.db.prepare("ALTER TABLE sales_invoices ADD COLUMN quotation_id TEXT").run();
            }
        }
        catch (e) {
            console.error("Schema heal failed", e);
        }
        // Generate unique Invoice No (Self-Healing)
        let invoiceNo = header.invoice_no;
        if (!invoiceNo || invoiceNo === 'NEW') {
            invoiceNo = JournalService_1.JournalService.getNextVoucherNo('INV');
            let retries = 0;
            while (database_1.db.prepare('SELECT 1 FROM sales_invoices WHERE invoice_no = ?').get(invoiceNo)) {
                JournalService_1.JournalService.incrementVoucherNo('INV');
                invoiceNo = JournalService_1.JournalService.getNextVoucherNo('INV');
                retries++;
                if (retries > 1000)
                    throw new Error("Failed to generate unique Invoice No after 1000 attempts");
            }
        }
        // Resolve Branch (Fallback logic)
        let branchId = String(header?.branch_id || createContext.branchId || '').trim();
        if (!branchId || branchId.toUpperCase() === 'MAIN') {
            const main = database_1.db.prepare("SELECT id FROM branches WHERE is_main = 1").get();
            if (main)
                branchId = main.id;
            else {
                const any = database_1.db.prepare("SELECT id FROM branches LIMIT 1").get();
                if (any)
                    branchId = any.id;
                else {
                    const newId = (0, uuid_1.v4)();
                    database_1.db.prepare("INSERT INTO branches (id, name, is_main) VALUES (?, 'Main Branch', 1)").run(newId);
                    branchId = newId;
                }
            }
        }
        // 1. Validate
        if (!header.customer_id || lines.length === 0)
            throw new Error("Invalid invoice data");
        const workingLines = (Array.isArray(lines) ? lines : []).filter((line) => {
            const marker = this.normalizeNullableId(line?.item_id || line?.itemId);
            const qty = this.toNumber(line?.quantity ?? line?.qty);
            const price = this.toNumber(line?.unit_price ?? line?.price);
            const tax = this.toNumber(line?.tax_amount ?? line?.taxAmount);
            return Boolean(marker) || qty !== 0 || price !== 0 || tax !== 0;
        });
        if (workingLines.length === 0)
            throw new Error("Invalid invoice data");
        const customer = database_1.db.prepare('SELECT id, name_ar FROM business_partners WHERE id = ?').get(header.customer_id);
        if (!customer)
            throw new Error("Customer not found");
        const postingPlan = await SalesService.prepareSalesInvoicePosting({
            companyId,
            branchId,
            invoiceNo,
            dispatchDocumentId,
            header,
            lines: workingLines,
        });
        const createdBy = String(createContext.userId || header?.created_by || 'System');
        // Start Transaction
        const runTx = database_1.db.transaction(() => {
            // Create Journal Header
            const journalResult = JournalService_1.JournalService.createJournalEntry({
                voucher_type: 'Sales Invoice',
                date: header.date,
                reference_no: invoiceNo,
                description: `فاتورة مبيعات - ${customer.name_ar} ${header.manual_ref ? `(${header.manual_ref})` : ''}`,
                currency_id: header.currency_id,
                exchange_rate: header.exchange_rate,
                status: 'POSTED',
                branch_id: branchId
            }, postingPlan.journalLines);
            if (!journalResult.success)
                throw new Error("Failed to create journal entry");
            // 3. Save Invoice Header
            database_1.db.prepare(`
                INSERT INTO sales_invoices (
                    id, invoice_no, customer_id, branch_id, warehouse_id, date, due_date,
                    subtotal, tax_total, grand_total, currency_id, exchange_rate,
                    status, payment_status, journal_header_id, created_by,
                    manual_ref, cost_center_id, notes,
                    dispatch_document_id, sales_order_id, quotation_id
                ) VALUES (
                    @id, @no, @custId, @branchId, @whId, @date, @dueDate,
                    @sub, @tax, @grand, @curr, @rate,
                    'POSTED', 'UNPAID', @journalId, @user,
                    @manual_ref, @cost_center_id, @notes,
                    @dispatch_document_id, @sales_order_id, @quotation_id
                )
            `).run({
                id: invoiceId, no: invoiceNo, custId: header.customer_id, branchId: branchId, whId: header.warehouse_id,
                date: header.date, dueDate: header.due_date,
                sub: postingPlan.subtotal, tax: postingPlan.taxTotal, grand: postingPlan.grandTotal,
                curr: header.currency_id, rate: header.exchange_rate,
                journalId: journalResult.id, user: createdBy,
                manual_ref: header.manual_ref || null,
                cost_center_id: header.cost_center_id || null,
                notes: header.notes || null,
                dispatch_document_id: dispatchDocumentId || null,
                sales_order_id: salesOrderId || null,
                quotation_id: quotationId || null
            });
            // 4. Save Lines & Update Stock
            const insertLine = database_1.db.prepare(`
                INSERT INTO sales_invoice_lines (
                    id, invoice_id, item_id, description, quantity, unit_id,
                    unit_price, total_price, tax_amount, net_total, dispatch_line_id
                ) VALUES (
                    @id, @invId, @itemId, @desc, @qty, @unitId,
                    @price, @total, @tax, @net, @dispatchLineId
                )
            `);
            for (const preparedLine of postingPlan.lines) {
                const line = preparedLine.sourceLine;
                // Get dispatch line to trace back to source sales order line
                let sourceLineId = null;
                if (dispatchDocumentId) {
                    const dl = database_1.db.prepare('SELECT source_line_id FROM dispatch_lines WHERE id = ?').get(line.dispatch_line_id);
                    if (dl)
                        sourceLineId = dl.source_line_id;
                }
                // Insert Line
                insertLine.run({
                    id: (0, uuid_1.v4)(),
                    invId: invoiceId,
                    itemId: preparedLine.itemId,
                    desc: line.description,
                    qty: preparedLine.quantity,
                    unitId: line.unit_id,
                    price: preparedLine.unitPrice,
                    total: preparedLine.subtotal,
                    tax: preparedLine.taxAmount,
                    net: preparedLine.netTotal,
                    dispatchLineId: line.dispatch_line_id || null
                });
                // Update Sales Order Line invoiced_qty if we have a source
                if (sourceLineId) {
                    database_1.db.prepare(`
                        UPDATE sales_order_lines
                        SET invoiced_qty = COALESCE(invoiced_qty, 0) + ?
                        WHERE id = ?
                    `).run(preparedLine.quantity, sourceLineId);
                }
                // Update Stock ONLY IF NOT DISPATCHED (direct invoice)
                if (!dispatchDocumentId && preparedLine.itemId) {
                    InventoryService_1.InventoryService.updateStock(preparedLine.itemId, preparedLine.quantity, 'OUT', invoiceNo, `Sales Invoice`, preparedLine.unitCost, header.warehouse_id);
                }
            }
            // Update associated documents
            if (dispatchDocumentId) {
                database_1.db.prepare("UPDATE dispatch_header SET status = 'مرحل', invoice_id = ?, invoiced_at = CURRENT_TIMESTAMP WHERE id = ?").run(invoiceId, dispatchDocumentId);
            }
            if (salesOrderId) {
                database_1.db.prepare("UPDATE sales_orders SET status = 'COMPLETED' WHERE id = ?").run(salesOrderId);
            }
            if (quotationId) {
                database_1.db.prepare("UPDATE sales_quotations SET status = 'CONVERTED' WHERE id = ?").run(quotationId);
            }
        });
        runTx();
        return { success: true, id: invoiceId, invoice_no: invoiceNo };
    }
    static async prepareSalesInvoicePosting(input) {
        const resolutionUseCases = this.getAccountResolutionUseCases();
        const itemMetaCache = new Map();
        const preparedLines = [];
        const journalAccumulator = new Map();
        let subtotal = 0;
        let taxTotal = 0;
        let grandTotal = 0;
        for (let index = 0; index < input.lines.length; index += 1) {
            const sourceLine = input.lines[index];
            const itemId = this.normalizeNullableId(sourceLine?.item_id || sourceLine?.itemId);
            const quantity = this.roundAmount(this.toNumber(sourceLine?.quantity ?? sourceLine?.qty));
            const unitPrice = this.roundAmount(this.toNumber(sourceLine?.unit_price ?? sourceLine?.price));
            const lineSubtotal = this.roundAmount(quantity * unitPrice);
            const taxRate = this.toNumber(sourceLine?.tax_rate);
            const explicitTaxAmount = this.toNumber(sourceLine?.tax_amount ?? sourceLine?.taxAmount);
            const lineTaxAmount = this.roundAmount(explicitTaxAmount !== 0 ? explicitTaxAmount : lineSubtotal * (taxRate / 100));
            const lineNetTotal = this.roundAmount(lineSubtotal + lineTaxAmount);
            let itemMeta = null;
            if (itemId) {
                if (!itemMetaCache.has(itemId)) {
                    itemMetaCache.set(itemId, this.getItemResolutionMeta(itemId));
                }
                itemMeta = itemMetaCache.get(itemId) || null;
            }
            const isService = this.isServiceLine(sourceLine, itemMeta);
            const requiresInventory = !input.dispatchDocumentId && !isService;
            const requiredRoles = [FinancialAccountRole_1.FinancialAccountRole.RECEIVABLE_ACCOUNT];
            if (lineTaxAmount > 0)
                requiredRoles.push(FinancialAccountRole_1.FinancialAccountRole.VAT_OUTPUT_ACCOUNT);
            if (requiresInventory) {
                requiredRoles.push(FinancialAccountRole_1.FinancialAccountRole.COGS_ACCOUNT);
                requiredRoles.push(FinancialAccountRole_1.FinancialAccountRole.INVENTORY_ACCOUNT);
            }
            const resolution = await resolutionUseCases.resolveRequiredAccounts(input.companyId, {
                companyId: input.companyId,
                branchId: input.branchId,
                documentType: 'SALES_INVOICE',
                lineType: isService ? 'SERVICE' : 'ITEM',
                itemId,
                itemGroupId: itemMeta?.itemGroupId || null,
                warehouseId: this.normalizeNullableId(input.header?.warehouse_id),
                partnerId: this.normalizeNullableId(input.header?.customer_id),
                taxProfileId: this.normalizeNullableId(input.header?.tax_group_id),
                isService,
                requiresInventory,
                requiresTax: lineTaxAmount > 0,
                currencyCode: this.normalizeNullableId(input.header?.currency_id),
                direction: ResolutionDirection_1.ResolutionDirection.SALE,
                requiredRoles,
                optionalRoles: [
                    FinancialAccountRole_1.FinancialAccountRole.REVENUE_ACCOUNT,
                    FinancialAccountRole_1.FinancialAccountRole.SERVICE_REVENUE_ACCOUNT,
                    FinancialAccountRole_1.FinancialAccountRole.SALES_DISCOUNT_ACCOUNT,
                    FinancialAccountRole_1.FinancialAccountRole.ROUNDING_ACCOUNT,
                ],
            });
            if (!resolution.success) {
                throw this.buildResolutionError(index + 1, resolution);
            }
            const receivable = resolution.resolvedAccounts[FinancialAccountRole_1.FinancialAccountRole.RECEIVABLE_ACCOUNT];
            if (!receivable) {
                throw this.buildRoleMissingError(index + 1, FinancialAccountRole_1.FinancialAccountRole.RECEIVABLE_ACCOUNT, resolution);
            }
            const preferredRevenueRole = isService
                ? FinancialAccountRole_1.FinancialAccountRole.SERVICE_REVENUE_ACCOUNT
                : FinancialAccountRole_1.FinancialAccountRole.REVENUE_ACCOUNT;
            const alternateRevenueRole = isService
                ? FinancialAccountRole_1.FinancialAccountRole.REVENUE_ACCOUNT
                : FinancialAccountRole_1.FinancialAccountRole.SERVICE_REVENUE_ACCOUNT;
            const revenue = resolution.resolvedAccounts[preferredRevenueRole] ||
                resolution.resolvedAccounts[alternateRevenueRole];
            if (!revenue) {
                throw this.buildRoleMissingError(index + 1, preferredRevenueRole, resolution, {
                    fallbackRole: alternateRevenueRole,
                });
            }
            const vatOutput = lineTaxAmount > 0
                ? resolution.resolvedAccounts[FinancialAccountRole_1.FinancialAccountRole.VAT_OUTPUT_ACCOUNT] || null
                : null;
            if (lineTaxAmount > 0 && !vatOutput) {
                throw this.buildRoleMissingError(index + 1, FinancialAccountRole_1.FinancialAccountRole.VAT_OUTPUT_ACCOUNT, resolution);
            }
            const cogs = requiresInventory
                ? resolution.resolvedAccounts[FinancialAccountRole_1.FinancialAccountRole.COGS_ACCOUNT] || null
                : null;
            const inventory = requiresInventory
                ? resolution.resolvedAccounts[FinancialAccountRole_1.FinancialAccountRole.INVENTORY_ACCOUNT] || null
                : null;
            if (requiresInventory && (!cogs || !inventory)) {
                throw this.buildRoleMissingError(index + 1, FinancialAccountRole_1.FinancialAccountRole.COGS_ACCOUNT, resolution, {
                    requiredPair: FinancialAccountRole_1.FinancialAccountRole.INVENTORY_ACCOUNT,
                });
            }
            let unitCost = 0;
            let cogsTotal = 0;
            if (requiresInventory && itemId) {
                const stockInfo = InventoryService_1.InventoryService.getStock(itemId, input.header?.warehouse_id);
                unitCost = this.roundAmount(this.toNumber(stockInfo?.avg_cost));
                cogsTotal = this.roundAmount(unitCost * quantity);
            }
            preparedLines.push({
                sourceLine,
                itemId,
                quantity,
                unitPrice,
                subtotal: lineSubtotal,
                taxAmount: lineTaxAmount,
                netTotal: lineNetTotal,
                receivableAccountId: receivable.accountId,
                revenueAccountId: revenue.accountId,
                vatOutputAccountId: vatOutput ? vatOutput.accountId : null,
                cogsAccountId: cogs ? cogs.accountId : null,
                inventoryAccountId: inventory ? inventory.accountId : null,
                unitCost,
                cogsTotal,
            });
            subtotal = this.roundAmount(subtotal + lineSubtotal);
            taxTotal = this.roundAmount(taxTotal + lineTaxAmount);
            grandTotal = this.roundAmount(grandTotal + lineNetTotal);
            this.addJournalAmount(journalAccumulator, receivable.accountId, lineNetTotal, 0, `فاتورة مبيعات رقم ${input.invoiceNo}`);
            this.addJournalAmount(journalAccumulator, revenue.accountId, 0, lineSubtotal, 'مبيعات');
            if (lineTaxAmount > 0 && vatOutput) {
                this.addJournalAmount(journalAccumulator, vatOutput.accountId, 0, lineTaxAmount, 'ضريبة مبيعات');
            }
            if (cogsTotal > 0 && cogs && inventory) {
                this.addJournalAmount(journalAccumulator, cogs.accountId, cogsTotal, 0, `تكلفة مبيعات الإرسالية ${input.invoiceNo}`);
                this.addJournalAmount(journalAccumulator, inventory.accountId, 0, cogsTotal, `نقص مخزون إرسالية ${input.invoiceNo}`);
            }
        }
        const journalLines = Array.from(journalAccumulator.entries()).map(([accountId, value]) => ({
            account_id: accountId,
            debit: this.roundAmount(value.debit),
            credit: this.roundAmount(value.credit),
            line_description: value.description,
            cost_center_id: input.header?.cost_center_id || null,
        }));
        const debitTotal = this.roundAmount(journalLines.reduce((sum, line) => sum + this.toNumber(line.debit), 0));
        const creditTotal = this.roundAmount(journalLines.reduce((sum, line) => sum + this.toNumber(line.credit), 0));
        if (Math.abs(debitTotal - creditTotal) > 0.000001) {
            const err = new Error('Unbalanced Sales Invoice posting after account resolution');
            err.code = 'UNBALANCED_POSTING';
            err.messageKey = 'error.sales_invoice.posting.unbalanced';
            err.details = {
                debitTotal,
                creditTotal,
                journalLines,
            };
            throw err;
        }
        return {
            lines: preparedLines,
            journalLines,
            subtotal,
            taxTotal,
            grandTotal,
        };
    }
    static addJournalAmount(bucket, accountId, debit, credit, description) {
        if (!accountId) {
            return;
        }
        const normalizedDebit = this.roundAmount(this.toNumber(debit));
        const normalizedCredit = this.roundAmount(this.toNumber(credit));
        if (normalizedDebit === 0 && normalizedCredit === 0) {
            return;
        }
        const current = bucket.get(accountId);
        if (!current) {
            bucket.set(accountId, {
                debit: normalizedDebit,
                credit: normalizedCredit,
                description,
            });
            return;
        }
        current.debit = this.roundAmount(current.debit + normalizedDebit);
        current.credit = this.roundAmount(current.credit + normalizedCredit);
    }
    static getItemResolutionMeta(itemId) {
        const row = database_1.db.prepare('SELECT * FROM items WHERE id = ?').get(itemId);
        if (!row) {
            return null;
        }
        const type = String(row.type || '').trim().toUpperCase();
        const isService = this.toNumber(row.is_service) === 1 ||
            type === 'SERVICE' ||
            type === 'SERVICES';
        return {
            itemGroupId: this.normalizeNullableId(row.item_group_id ||
                row.group_id ||
                row.category_id),
            isService,
        };
    }
    static isServiceLine(line, itemMeta) {
        if (this.toNumber(line?.is_service) === 1) {
            return true;
        }
        if (itemMeta?.isService) {
            return true;
        }
        const type = String(line?.type || line?.item_type || '').trim().toUpperCase();
        return type === 'SERVICE' || type === 'SERVICES';
    }
    static getAccountResolutionUseCases() {
        if (!this.accountResolutionUseCases) {
            const err = new Error('Account Resolution Engine is not configured for SalesService');
            err.code = 'ACCOUNT_RESOLUTION_NOT_CONFIGURED';
            err.messageKey = 'error.account_resolution.not_configured';
            throw err;
        }
        return this.accountResolutionUseCases;
    }
    static buildResolutionError(lineNo, resolution) {
        const err = new Error(`Account resolution failed for sales invoice line ${lineNo}`);
        err.code = 'ACCOUNT_RESOLUTION_FAILED';
        err.messageKey = 'error.sales_invoice.account_resolution.failed';
        err.details = {
            line: lineNo,
            missingRoles: resolution.missingRoles,
            trace: resolution.trace,
        };
        return err;
    }
    static buildRoleMissingError(lineNo, role, resolution, extra = {}) {
        const err = new Error(`Resolved accounts missing role ${role} for sales invoice line ${lineNo}`);
        err.code = 'ACCOUNT_RESOLUTION_ROLE_MISSING';
        err.messageKey = 'error.sales_invoice.account_resolution.role_missing';
        err.details = {
            line: lineNo,
            role,
            ...extra,
            resolvedAccounts: resolution.resolvedAccounts,
            trace: resolution.trace,
        };
        return err;
    }
    static normalizeNullableId(value) {
        const normalized = String(value || '').trim();
        return normalized ? normalized : null;
    }
    static toNumber(value) {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : 0;
    }
    static roundAmount(value) {
        return Number(value.toFixed(6));
    }
    // --- Helpers (Mocking Configuration) ---
    static getSalesAccount() {
        // In real app, fetch from Settings or Item Category
        const acc = database_1.db.prepare("SELECT id FROM accounts WHERE code = '4101'").get(); // General Sales
        return acc ? acc.id : 'UNKNOWN_SALES_ACC';
    }
    static getVATAccount() {
        // Output VAT
        // We'll search for it or fallback
        const acc = database_1.db.prepare("SELECT id FROM accounts WHERE name LIKE '%مخرجات%' OR name LIKE '%Output%'").get();
        return acc ? acc.id : '';
    }
    static getNextInvoiceNumber() {
        // Use JournalService Counter Logic or custom
        return JournalService_1.JournalService.getNextVoucherNo('INV');
    }
    static getInvoice(idOrNo) {
        // Try searching by ID first, then by No
        let header = database_1.db.prepare(`
            SELECT i.*, c.name_ar as customer_name, c.payment_term_days
            FROM sales_invoices i
            LEFT JOIN business_partners c ON i.customer_id = c.id
            WHERE i.id = ?
        `).get(idOrNo);
        if (!header) {
            header = database_1.db.prepare(`
                SELECT i.*, c.name_ar as customer_name, c.payment_term_days
                FROM sales_invoices i
                LEFT JOIN business_partners c ON i.customer_id = c.id
                WHERE i.invoice_no = ?
            `).get(idOrNo);
        }
        if (!header)
            return null;
        const lines = database_1.db.prepare(`
            SELECT l.*, i.name_ar as item_name, i.code as item_code
            FROM sales_invoice_lines l
            LEFT JOIN items i ON l.item_id = i.id
            WHERE l.invoice_id = ?
        `).all(header.id);
        return { header, lines };
    }
    static getInvoices() {
        return database_1.db.prepare(`
            SELECT i.*, c.name_ar as customer_name 
            FROM sales_invoices i
            LEFT JOIN business_partners c ON i.customer_id = c.id
            ORDER BY i.created_at DESC
        `).all();
    }
    static postInvoice(id, userId = 'System') {
        const doc = database_1.db.prepare('SELECT status FROM sales_invoices WHERE id = ?').get(id);
        if (!doc)
            throw new Error("Document not found");
        if (doc.status === 'POSTED')
            throw new Error("Document is already POSTED");
        try {
            const cols = database_1.db.prepare("PRAGMA table_info(sales_invoices)").all();
            if (!cols.some((c) => c.name === 'posted_by')) {
                database_1.db.prepare("ALTER TABLE sales_invoices ADD COLUMN posted_by TEXT").run();
                database_1.db.prepare("ALTER TABLE sales_invoices ADD COLUMN posted_at DATETIME").run();
            }
        }
        catch (e) {
            console.error("Schema heal failed", e);
        }
        database_1.db.prepare(`
            UPDATE sales_invoices 
            SET status = 'POSTED', posted_by = ?, posted_at = CURRENT_TIMESTAMP 
            WHERE id = ?
        `).run(userId, id);
        return { success: true };
    }
    static submitInvoiceForApproval(id, userId = 'System') {
        const doc = database_1.db.prepare('SELECT status FROM sales_invoices WHERE id = ?').get(id);
        if (!doc)
            throw new Error("Document not found");
        if (doc.status === 'POSTED')
            throw new Error("Document is already POSTED");
        try {
            const cols = database_1.db.prepare("PRAGMA table_info(sales_invoices)").all();
            if (!cols.some((c) => c.name === 'submitted_by')) {
                database_1.db.prepare("ALTER TABLE sales_invoices ADD COLUMN submitted_by TEXT").run();
                database_1.db.prepare("ALTER TABLE sales_invoices ADD COLUMN submitted_at DATETIME").run();
            }
        }
        catch (e) {
            console.error("Schema heal failed", e);
        }
        database_1.db.prepare(`
            UPDATE sales_invoices 
            SET status = 'PENDING_APPROVAL', submitted_by = ?, submitted_at = CURRENT_TIMESTAMP 
            WHERE id = ?
        `).run(userId, id);
        return { success: true };
    }
    // --- Quotations ---
    static createQuotation(data) {
        const { header, lines } = data;
        const id = (0, uuid_1.v4)();
        // Generate unique Quotation No (Self-Healing)
        let no = header.quotation_no;
        if (!no) {
            no = JournalService_1.JournalService.getNextVoucherNo('QT');
            let retries = 0;
            // Loop until we find a gap or synchronization
            while (database_1.db.prepare('SELECT 1 FROM sales_quotations WHERE quotation_no = ?').get(no)) {
                // Counter is lagging behind actual data, force push it forward
                JournalService_1.JournalService.incrementVoucherNo('QT');
                no = JournalService_1.JournalService.getNextVoucherNo('QT');
                retries++;
                if (retries > 1000)
                    throw new Error("Failed to generate unique Quotation No after 1000 attempts");
            }
        }
        // Resolve Branch (Fallback logic)
        let branchId = header.branch_id;
        if (!branchId || branchId === 'MAIN') {
            // Try getting Main branch
            const main = database_1.db.prepare("SELECT id FROM branches WHERE is_main = 1").get();
            if (main)
                branchId = main.id;
            else {
                const any = database_1.db.prepare("SELECT id FROM branches LIMIT 1").get();
                if (any)
                    branchId = any.id;
                else {
                    // Create a default branch if absolutely none exist
                    const newId = (0, uuid_1.v4)();
                    database_1.db.prepare("INSERT INTO branches (id, name, is_main) VALUES (?, 'Main Branch', 1)").run(newId);
                    branchId = newId;
                }
            }
        }
        const runTx = database_1.db.transaction(() => {
            database_1.db.prepare(`
                INSERT INTO sales_quotations (
                    id, quotation_no, customer_id, branch_id, date, expiry_date,
                    subtotal, tax_total, discount_total, grand_total,
                    currency_id, exchange_rate, status, notes
                ) VALUES (
                    @id, @no, @custId, @branchId, @date, @expiry,
                    @sub, @tax, @disc, @grand,
                    @curr, @rate, 'DRAFT', @notes
                )
            `).run({
                id, no, custId: header.customer_id, branchId: branchId,
                date: header.date, expiry: header.expiry_date || header.due_date,
                sub: header.subtotal || 0, tax: header.tax_total || 0,
                disc: header.discount_total || 0, grand: header.grand_total || 0,
                curr: header.currency_id, rate: header.exchange_rate, notes: header.notes
            });
            const insertLine = database_1.db.prepare(`
                INSERT INTO sales_quotation_lines (
                    id, quotation_id, item_id, description, quantity, unit_id,
                    unit_price, total_price, discount_amount, tax_amount, net_total
                ) VALUES (
                    @id, @qid, @itemId, @desc, @qty, @unitId,
                    @price, @total, @disc, @tax, @net
                )
            `);
            for (const line of lines) {
                insertLine.run({
                    id: (0, uuid_1.v4)(), qid: id, itemId: line.item_id, desc: line.description,
                    qty: line.quantity, unitId: line.unit_id,
                    price: line.unit_price, total: line.total_price,
                    disc: line.discount_amount || 0, tax: line.tax_amount || 0, net: line.net_total
                });
            }
            // Increment Counter
            JournalService_1.JournalService.incrementVoucherNo('QT');
        });
        runTx();
        return { success: true, id, quotation_no: no };
    }
    static getQuotations() {
        return database_1.db.prepare(`
            SELECT q.*, c.name_ar as customer_name 
            FROM sales_quotations q
            LEFT JOIN business_partners c ON q.customer_id = c.id
            ORDER BY q.created_at DESC
        `).all();
    }
    static getQuotation(id) {
        const header = database_1.db.prepare(`
            SELECT q.*, c.name_ar as customer_name, c.payment_term_days 
            FROM sales_quotations q
            LEFT JOIN business_partners c ON q.customer_id = c.id
            WHERE q.id = ?
        `).get(id);
        if (!header)
            return null;
        const lines = database_1.db.prepare(`
            SELECT l.*, i.name_ar as item_name, i.code as item_code
            FROM sales_quotation_lines l
            LEFT JOIN items i ON l.item_id = i.id
            WHERE l.quotation_id = ?
        `).all(id);
        return { header, lines };
    }
    static updateQuotationStatus(id, status) {
        return database_1.db.prepare('UPDATE sales_quotations SET status = ? WHERE id = ?').run(status, id);
    }
    static deleteQuotation(id) {
        // Only allow delete if DRAFT
        const q = database_1.db.prepare('SELECT status FROM sales_quotations WHERE id = ?').get(id);
        if (q && q.status !== 'DRAFT')
            throw new Error("Cannot delete non-draft quotation");
        database_1.db.prepare('DELETE FROM sales_quotations WHERE id = ?').run(id);
        return { success: true };
    }
    // --- Sales Orders ---
    static createOrder(data) {
        const { header, lines } = data;
        const id = (0, uuid_1.v4)();
        // Generate unique Order No (Self-Healing)
        let no = header.order_no;
        if (!no) {
            no = JournalService_1.JournalService.getNextVoucherNo('SO');
            let retries = 0;
            // Loop until we find a gap or synchronization
            while (database_1.db.prepare('SELECT 1 FROM sales_orders WHERE order_no = ?').get(no)) {
                // Counter is lagging behind actual data, force push it forward
                JournalService_1.JournalService.incrementVoucherNo('SO');
                no = JournalService_1.JournalService.getNextVoucherNo('SO');
                retries++;
                if (retries > 1000)
                    throw new Error("Failed to generate unique Order No after 1000 attempts");
            }
        }
        // Resolve Branch (Fallback logic)
        let branchId = header.branch_id;
        if (!branchId || branchId === 'MAIN') {
            // Try getting Main branch
            const main = database_1.db.prepare("SELECT id FROM branches WHERE is_main = 1").get();
            if (main)
                branchId = main.id;
            else {
                const any = database_1.db.prepare("SELECT id FROM branches LIMIT 1").get();
                if (any)
                    branchId = any.id;
                else {
                    // Create a default branch if absolutely none exist
                    const newId = (0, uuid_1.v4)();
                    database_1.db.prepare("INSERT INTO branches (id, name, is_main) VALUES (?, 'Main Branch', 1)").run(newId);
                    branchId = newId;
                }
            }
        }
        const runTx = database_1.db.transaction(() => {
            database_1.db.prepare(`
                INSERT INTO sales_orders (
                    id, order_no, quotation_id, customer_id, branch_id, warehouse_id,
                    date, delivery_date, subtotal, tax_total, discount_total, grand_total,
                    currency_id, status, notes
                ) VALUES (
                    @id, @no, @qid, @custId, @branchId, @whId,
                    @date, @delDate, @sub, @tax, @disc, @grand,
                    @curr, @status, @notes
                )
            `).run({
                id, no, qid: header.quotation_id, custId: header.customer_id,
                branchId: header.branch_id, whId: header.warehouse_id,
                date: header.date, delDate: header.delivery_date,
                sub: header.subtotal || 0, tax: header.tax_total || 0,
                disc: header.discount_total || 0, grand: header.grand_total || 0,
                curr: header.currency_id, status: header.status || 'CONFIRMED', notes: header.notes
            });
            const insertLine = database_1.db.prepare(`
                INSERT INTO sales_order_lines (
                    id, order_id, item_id, description, quantity, unit_id,
                    unit_price, total_price, discount_amount, tax_amount, net_total
                ) VALUES (
                    @id, @oid, @itemId, @desc, @qty, @unitId,
                    @price, @total, @disc, @tax, @net
                )
            `);
            for (const line of lines) {
                insertLine.run({
                    id: (0, uuid_1.v4)(), oid: id, itemId: line.item_id, desc: line.description,
                    qty: line.quantity, unitId: line.unit_id,
                    price: line.unit_price, total: line.total_price,
                    disc: line.discount_amount || 0, tax: line.tax_amount || 0, net: line.net_total
                });
            }
            // Increment Counter
            JournalService_1.JournalService.incrementVoucherNo('SO');
            // If linked to quotation, update status
            if (header.quotation_id) {
                database_1.db.prepare("UPDATE sales_quotations SET status = 'CONVERTED' WHERE id = ?").run(header.quotation_id);
            }
        });
        runTx();
        return { success: true, id, order_no: no };
    }
    static getOrders() {
        return database_1.db.prepare(`
            SELECT o.*, c.name_ar as customer_name, q.quotation_no
            FROM sales_orders o
            LEFT JOIN business_partners c ON o.customer_id = c.id
            LEFT JOIN sales_quotations q ON o.quotation_id = q.id
            ORDER BY o.created_at DESC
        `).all();
    }
    static getPendingOrders() {
        return database_1.db.prepare(`
            SELECT o.*, c.name_ar as customer_name
            FROM sales_orders o
            LEFT JOIN business_partners c ON o.customer_id = c.id
            WHERE o.status = 'CONFIRMED' AND o.delivery_status IN ('PENDING', 'PARTIAL')
            ORDER BY o.date ASC
        `).all();
    }
    static getOrder(id) {
        const header = database_1.db.prepare(`
            SELECT o.*, c.name_ar as customer_name 
            FROM sales_orders o
            LEFT JOIN business_partners c ON o.customer_id = c.id
            WHERE o.id = ?
        `).get(id);
        if (!header)
            return null;
        const lines = database_1.db.prepare(`
            SELECT l.*, i.name_ar as item_name, i.code as item_code
            FROM sales_order_lines l
            LEFT JOIN items i ON l.item_id = i.id
            WHERE l.order_id = ?
        `).all(id);
        return { header, lines };
    }
    static updateOrderStatus(id, status) {
        return database_1.db.prepare('UPDATE sales_orders SET status = ? WHERE id = ?').run(status, id);
    }
    static deleteOrder(id) {
        const o = database_1.db.prepare('SELECT status FROM sales_orders WHERE id = ?').get(id);
        if (o && o.status !== 'DRAFT' && o.status !== 'CONFIRMED')
            throw new Error("Cannot delete processed order");
        database_1.db.prepare('DELETE FROM sales_orders WHERE id = ?').run(id);
        return { success: true };
    }
    // --- Sales Returns ---
    static createReturn(data) {
        const { header, lines } = data;
        const id = (0, uuid_1.v4)();
        // Generate unique Return No (Self-Healing)
        let no = header.return_no;
        if (!no) {
            no = JournalService_1.JournalService.getNextVoucherNo('SR');
            let retries = 0;
            while (database_1.db.prepare('SELECT 1 FROM sales_returns WHERE return_no = ?').get(no)) {
                JournalService_1.JournalService.incrementVoucherNo('SR');
                no = JournalService_1.JournalService.getNextVoucherNo('SR');
                retries++;
                if (retries > 1000)
                    throw new Error("Failed to generate unique Return No after 1000 attempts");
            }
        }
        // 1. Validate
        if (!header.customer_id || lines.length === 0)
            throw new Error("Invalid return data");
        const runTx = database_1.db.transaction(() => {
            // 2. Create Journal Entry (Financial Impact)
            // Debit: Sales Returns (Contra Revenue)
            // Debit: VAT Output (Decrease Liability)
            // Credit: Customer (Decrease AR)
            const customer = database_1.db.prepare('SELECT linked_account_id, name_ar FROM business_partners WHERE id = ?').get(header.customer_id);
            // Relaxed check for linked_account_id failure in prototype? No, strict is better.
            const customerAccountId = customer?.linked_account_id;
            if (!customerAccountId)
                throw new Error("Customer has no linked account");
            // Calculate Totals
            const subtotal = lines.reduce((sum, l) => sum + (l.quantity * l.unit_price), 0);
            const vatTotal = lines.reduce((sum, l) => sum + (l.tax_amount || 0), 0);
            const grandTotal = subtotal + vatTotal;
            const journalResult = JournalService_1.JournalService.createJournalEntry({
                voucher_type: 'Sales Return',
                date: header.date,
                reference_no: no,
                description: `مردودات مبيعات - ${customer.name_ar}`,
                currency_id: header.currency_id,
                exchange_rate: header.exchange_rate,
                status: 'POSTED',
                branch_id: header.branch_id
            }, [
                // DEBIT: Sales Returns (Use Sales Account for now or find specific)
                {
                    account_id: this.getSalesReturnAccount(),
                    debit: subtotal,
                    credit: 0,
                    line_description: `مردودات مبيعات`
                },
                // DEBIT: VAT (Account 213 - Output VAT) - Reducing Liability
                ...(vatTotal > 0 ? [{
                        account_id: this.getVATAccount(),
                        debit: vatTotal,
                        credit: 0,
                        line_description: `ضريبة مبيعات (مردود)`
                    }] : []),
                // CREDIT: Customer
                {
                    account_id: customerAccountId,
                    debit: 0,
                    credit: grandTotal,
                    line_description: `مردود مبيعات رقم ${no}`
                }
            ]);
            if (!journalResult.success)
                throw new Error("Failed to create journal entry");
            // 3. Save Header
            database_1.db.prepare(`
                INSERT INTO sales_returns (
                    id, return_no, invoice_id, customer_id, branch_id, warehouse_id, date,
                    subtotal, tax_total, grand_total, currency_id, exchange_rate,
                    status, journal_header_id, notes
                ) VALUES (
                    @id, @no, @invId, @custId, @branchId, @whId, @date,
                    @sub, @tax, @grand, @curr, @rate,
                    'POSTED', @journalId, @notes
                )
            `).run({
                id, no, invId: header.invoice_id || null, custId: header.customer_id,
                branchId: header.branch_id, whId: header.warehouse_id, date: header.date,
                sub: subtotal, tax: vatTotal, grand: grandTotal,
                curr: header.currency_id, rate: header.exchange_rate || 1,
                journalId: journalResult.id, notes: header.notes
            });
            // 4. Save Lines & Update Stock (IN)
            const insertLine = database_1.db.prepare(`
                INSERT INTO sales_return_lines (
                    id, return_id, item_id, description, quantity, unit_id,
                    unit_price, total_price, tax_amount, net_total
                ) VALUES (
                    @id, @rid, @itemId, @desc, @qty, @unitId,
                    @price, @total, @tax, @net
                )
            `);
            for (const line of lines) {
                insertLine.run({
                    id: (0, uuid_1.v4)(), rid: id, itemId: line.item_id, desc: line.description,
                    qty: line.quantity, unitId: line.unit_id,
                    price: line.unit_price, total: line.quantity * line.unit_price,
                    tax: line.tax_amount || 0, net: (line.quantity * line.unit_price) + (line.tax_amount || 0)
                });
                // Update Stock (IN)
                InventoryService_1.InventoryService.updateStock(line.item_id, line.quantity, 'IN', // Return brings stock back
                no, `Sales Return`, 0, // Cost irrelevant for IN update logic usually unless Weighted Avg
                header.warehouse_id);
            }
        });
        runTx();
        return { success: true, id, return_no: no };
    }
    static getReturns() {
        return database_1.db.prepare(`
            SELECT r.*, c.name_ar as customer_name 
            FROM sales_returns r
            LEFT JOIN business_partners c ON r.customer_id = c.id
            ORDER BY r.created_at DESC
        `).all();
    }
    static getReturn(id) {
        const header = database_1.db.prepare(`
            SELECT r.*, c.name_ar as customer_name, c.address, c.phone
            FROM sales_returns r
            LEFT JOIN business_partners c ON r.customer_id = c.id
            WHERE r.id = ?
        `).get(id);
        if (!header)
            return null;
        const lines = database_1.db.prepare(`
            SELECT l.*, i.name_ar as item_name, u.name_ar as unit_name
            FROM sales_return_lines l
            LEFT JOIN items i ON l.item_id = i.id
            LEFT JOIN units u ON l.unit_id = u.id
            WHERE l.return_id = ?
        `).all(id);
        return { header, lines };
    }
    static getSalesReturnAccount() {
        // Ideally distinct account. Fallback to Sales (4101) but mocked here.
        // We'll try to find 'Sales Returns' or use 4101
        const acc = database_1.db.prepare("SELECT id FROM accounts WHERE name LIKE '%Returns%' AND type = 'Revenue'").get();
        if (acc)
            return acc.id;
        return this.getSalesAccount(); // Fallback
    }
}
exports.SalesService = SalesService;
SalesService.accountResolutionUseCases = null;
