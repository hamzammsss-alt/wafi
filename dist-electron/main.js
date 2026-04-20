"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const database_1 = require("./database");
// Disable security warnings in dev
process.env['ELECTRON_DISABLE_SECURITY_WARNINGS'] = 'true';
const InventoryService_1 = require("./services/InventoryService");
const LogisticsService_1 = require("./services/LogisticsService");
const SalesService_1 = require("./services/SalesService");
const CheckService_1 = require("./services/CheckService");
const HRService_1 = require("./services/HRService");
const AssetService_1 = require("./services/AssetService");
const AuthService_1 = require("./services/AuthService");
const SystemService_1 = require("./services/SystemService");
// import { ReportsService } from './services/ReportsService';
const ReportService_1 = require("./services/ReportService");
const ManufacturingService_1 = require("./services/ManufacturingService"); // The new one for SQL Views
const MasterDataService_1 = require("./services/MasterDataService");
const CurrencyService_1 = require("./services/CurrencyService");
const CostCenterService_1 = require("./services/CostCenterService");
const TaxGroupService_1 = require("./services/TaxGroupService");
const WarehouseService_1 = require("./services/WarehouseService");
const ItemTrackingService_1 = require("./services/ItemTrackingService");
const BranchService_1 = require("./services/BranchService");
const AccountService_1 = require("./services/AccountService");
const ItemService_1 = require("./services/ItemService");
const PartnerService_1 = require("./services/PartnerService");
const FinancialDefinitionService_1 = require("./services/FinancialDefinitionService");
// JournalService imported only once
const JournalService_1 = require("./services/JournalService");
const PurchaseService_1 = require("./services/PurchaseService");
const TreasuryService_1 = require("./services/TreasuryService");
const ChequeService_1 = require("./services/ChequeService");
const ProductionService_1 = require("./services/ProductionService");
const CommissionService_1 = require("./services/CommissionService");
const BudgetService_1 = require("./services/BudgetService");
const ImportService_1 = require("./services/ImportService");
const CurrencyScraperService_1 = require("./services/CurrencyScraperService");
const AttendanceService_1 = require("./services/AttendanceService");
const PayrollService_1 = require("./services/PayrollService");
const LeaveService_1 = require("./services/LeaveService");
const WorkflowTestService_1 = require("./services/WorkflowTestService");
const DispatchService_1 = require("./services/DispatchService");
const GRNService_1 = require("./services/GRNService");
const WorkflowService_1 = require("./services/WorkflowService");
const SalesInvoiceService_1 = require("./services/SalesInvoiceService");
const PurchaseInvoiceService_1 = require("./services/PurchaseInvoiceService");
const StockTransferService_1 = require("./services/StockTransferService");
const JournalVoucherService_1 = require("./services/JournalVoucherService");
const DocumentServiceFactory_1 = require("./services/DocumentServiceFactory");
const fixedAssets_ipc_1 = require("../src/main/ipc/fixedAssets.ipc");
const SqliteFixedAssetRepo_1 = require("../src/main/infrastructure/adapters/SqliteFixedAssetRepo");
const FixedAssetUseCases_1 = require("../src/main/application/useCases/FixedAssetUseCases");
const manufacturing_ipc_1 = require("../src/main/ipc/manufacturing.ipc");
const SqliteManufacturingRepo_1 = require("../src/main/infrastructure/adapters/SqliteManufacturingRepo");
const ManufacturingUseCases_1 = require("../src/main/application/useCases/ManufacturingUseCases");
const ManufacturingStockLedgerService_1 = require("../src/main/application/services/ManufacturingStockLedgerService");
const ManufacturingAccountingBuilder_1 = require("../src/main/application/services/ManufacturingAccountingBuilder");
const ManufacturingService_2 = require("../src/main/application/services/ManufacturingService");
const customerReceivables_ipc_1 = require("../src/main/ipc/customerReceivables.ipc");
const SqliteCustomerReceivablesRepo_1 = require("../src/main/infrastructure/adapters/SqliteCustomerReceivablesRepo");
const CustomerReceivablesService_1 = require("../src/main/application/services/CustomerReceivablesService");
const CustomerReceivablesUseCases_1 = require("../src/main/application/useCases/CustomerReceivablesUseCases");
const vendorPayables_ipc_1 = require("../src/main/ipc/vendorPayables.ipc");
const SqliteVendorPayablesRepo_1 = require("../src/main/infrastructure/adapters/SqliteVendorPayablesRepo");
const VendorPayablesService_1 = require("../src/main/application/services/VendorPayablesService");
const VendorPayablesUseCases_1 = require("../src/main/application/useCases/VendorPayablesUseCases");
const finance_ipc_1 = require("../src/main/ipc/finance.ipc");
const SqliteCurrencyRepo_1 = require("../src/main/infrastructure/adapters/SqliteCurrencyRepo");
const SqliteCostCenterRepo_1 = require("../src/main/infrastructure/adapters/SqliteCostCenterRepo");
const SqliteTaxGroupRepo_1 = require("../src/main/infrastructure/adapters/SqliteTaxGroupRepo");
const FinanceUseCases_1 = require("../src/main/application/useCases/FinanceUseCases");
const SqliteExpenseDimensionsRepo_1 = require("../src/main/infrastructure/adapters/SqliteExpenseDimensionsRepo");
const ExpenseDimensionsUseCases_1 = require("../src/main/application/useCases/ExpenseDimensionsUseCases");
const expenseDimensions_ipc_1 = require("../src/main/ipc/expenseDimensions.ipc");
const SqliteAccountingFoundationRepo_1 = require("../src/main/infrastructure/adapters/SqliteAccountingFoundationRepo");
const AccountingFoundationUseCases_1 = require("../src/main/application/useCases/AccountingFoundationUseCases");
const accountingFoundation_ipc_1 = require("../src/main/ipc/accountingFoundation.ipc");
const SqliteChartOfAccountsRepo_1 = require("../src/main/infrastructure/adapters/SqliteChartOfAccountsRepo");
const ChartOfAccountsSeedService_1 = require("../src/main/infrastructure/services/ChartOfAccountsSeedService");
const ChartOfAccountsUseCases_1 = require("../src/main/application/useCases/ChartOfAccountsUseCases");
const chartOfAccounts_ipc_1 = require("../src/main/ipc/chartOfAccounts.ipc");
const SqliteAccountingResolutionRepo_1 = require("../src/main/infrastructure/adapters/SqliteAccountingResolutionRepo");
const AccountingResolutionUseCases_1 = require("../src/main/application/useCases/AccountingResolutionUseCases");
const accountingResolution_ipc_1 = require("../src/main/ipc/accountingResolution.ipc");
const SqliteJournalHeaderRepo_1 = require("../src/main/infrastructure/adapters/SqliteJournalHeaderRepo");
const SqliteJournalLineRepo_1 = require("../src/main/infrastructure/adapters/SqliteJournalLineRepo");
const SqlitePostingRegistryRepo_1 = require("../src/main/infrastructure/adapters/SqlitePostingRegistryRepo");
const SqliteJournalFiscalPeriodRepo_1 = require("../src/main/infrastructure/adapters/SqliteJournalFiscalPeriodRepo");
const SqliteJournalAccountLookupRepo_1 = require("../src/main/infrastructure/adapters/SqliteJournalAccountLookupRepo");
const JournalEngineService_1 = require("../src/main/application/services/JournalEngineService");
const JournalEngineUseCases_1 = require("../src/main/application/useCases/JournalEngineUseCases");
const accountingJournals_ipc_1 = require("../src/main/ipc/accountingJournals.ipc");
const SqliteSalesInvoiceAccountingRepo_1 = require("../src/main/infrastructure/adapters/SqliteSalesInvoiceAccountingRepo");
const SalesInvoicePostingBuilder_1 = require("../src/main/application/services/SalesInvoicePostingBuilder");
const SalesInvoiceAccountingService_1 = require("../src/main/application/services/SalesInvoiceAccountingService");
const SalesInvoiceAccountingUseCases_1 = require("../src/main/application/useCases/SalesInvoiceAccountingUseCases");
const salesInvoiceAccounting_ipc_1 = require("../src/main/ipc/salesInvoiceAccounting.ipc");
const SqlitePurchaseInvoiceAccountingRepo_1 = require("../src/main/infrastructure/adapters/SqlitePurchaseInvoiceAccountingRepo");
const PurchaseInvoicePostingBuilder_1 = require("../src/main/application/services/PurchaseInvoicePostingBuilder");
const PurchaseInvoiceAccountingService_1 = require("../src/main/application/services/PurchaseInvoiceAccountingService");
const PurchaseInvoiceAccountingUseCases_1 = require("../src/main/application/useCases/PurchaseInvoiceAccountingUseCases");
const purchaseInvoiceAccounting_ipc_1 = require("../src/main/ipc/purchaseInvoiceAccounting.ipc");
const SqliteInventoryDocumentRepo_1 = require("../src/main/infrastructure/adapters/SqliteInventoryDocumentRepo");
const InventoryPostingBuilder_1 = require("../src/main/application/services/InventoryPostingBuilder");
const InventoryDocumentService_1 = require("../src/main/application/services/InventoryDocumentService");
const InventoryDocumentUseCases_1 = require("../src/main/application/useCases/InventoryDocumentUseCases");
const inventoryDocument_ipc_1 = require("../src/main/ipc/inventoryDocument.ipc");
const SqliteTreasuryRepo_1 = require("../src/main/infrastructure/adapters/SqliteTreasuryRepo");
const TreasuryPostingBuilder_1 = require("../src/main/application/services/TreasuryPostingBuilder");
const TreasuryChequeLifecycleService_1 = require("../src/main/application/services/TreasuryChequeLifecycleService");
const TreasuryDocumentService_1 = require("../src/main/application/services/TreasuryDocumentService");
const TreasuryDocumentUseCases_1 = require("../src/main/application/useCases/TreasuryDocumentUseCases");
const TreasuryChequeUseCases_1 = require("../src/main/application/useCases/TreasuryChequeUseCases");
const treasuryDocument_ipc_1 = require("../src/main/ipc/treasuryDocument.ipc");
const treasuryCheque_ipc_1 = require("../src/main/ipc/treasuryCheque.ipc");
const SqliteSalesOperationsRepo_1 = require("../src/main/infrastructure/adapters/SqliteSalesOperationsRepo");
const SalesOperationsAccountingBuilder_1 = require("../src/main/application/services/SalesOperationsAccountingBuilder");
const SalesStockLedgerService_1 = require("../src/main/application/services/SalesStockLedgerService");
const SalesOperationsService_1 = require("../src/main/application/services/SalesOperationsService");
const SalesOperationsUseCases_1 = require("../src/main/application/useCases/SalesOperationsUseCases");
const salesQuotation_ipc_1 = require("../src/main/ipc/salesQuotation.ipc");
const salesOrder_ipc_1 = require("../src/main/ipc/salesOrder.ipc");
const deliveryNote_ipc_1 = require("../src/main/ipc/deliveryNote.ipc");
const salesReturn_ipc_1 = require("../src/main/ipc/salesReturn.ipc");
const SqlitePurchaseOperationsRepo_1 = require("../src/main/infrastructure/adapters/SqlitePurchaseOperationsRepo");
const PurchaseOperationsAccountingBuilder_1 = require("../src/main/application/services/PurchaseOperationsAccountingBuilder");
const PurchaseStockLedgerService_1 = require("../src/main/application/services/PurchaseStockLedgerService");
const PurchaseOperationsService_1 = require("../src/main/application/services/PurchaseOperationsService");
const PurchaseOperationsUseCases_1 = require("../src/main/application/useCases/PurchaseOperationsUseCases");
const purchaseRequest_ipc_1 = require("../src/main/ipc/purchaseRequest.ipc");
const purchaseRfq_ipc_1 = require("../src/main/ipc/purchaseRfq.ipc");
const purchaseOrder_ipc_1 = require("../src/main/ipc/purchaseOrder.ipc");
const goodsReceiptNote_ipc_1 = require("../src/main/ipc/goodsReceiptNote.ipc");
const purchaseReturn_ipc_1 = require("../src/main/ipc/purchaseReturn.ipc");
const CapabilityRegistry_1 = require("../src/main/application/services/CapabilityRegistry");
const PermissionSnapshotService_1 = require("../src/main/application/services/PermissionSnapshotService");
const SqlitePermissionEngineRepo_1 = require("../src/main/infrastructure/adapters/SqlitePermissionEngineRepo");
const security_ipc_1 = require("../src/main/ipc/security.ipc");
const ScreenRegistry_1 = require("../src/main/application/services/ScreenRegistry");
const ScreenQueryBuilder_1 = require("../src/main/application/services/ScreenQueryBuilder");
const ScreenViewsService_1 = require("../src/main/application/services/ScreenViewsService");
const SqliteScreenViewsRepo_1 = require("../src/main/infrastructure/adapters/SqliteScreenViewsRepo");
const screenViews_ipc_1 = require("../src/main/ipc/screenViews.ipc");
const AuditService_1 = require("../src/main/application/services/AuditService");
const SqliteAuditRepo_1 = require("../src/main/infrastructure/adapters/SqliteAuditRepo");
const audit_ipc_1 = require("../src/main/ipc/audit.ipc");
const AuthContext_1 = require("../src/main/ipc/AuthContext");
const SqliteFinancialPlatformRepo_1 = require("../src/main/infrastructure/adapters/SqliteFinancialPlatformRepo");
const FinancialPlatformUseCases_1 = require("../src/main/application/useCases/FinancialPlatformUseCases");
const financialPlatform_ipc_1 = require("../src/main/ipc/financialPlatform.ipc");
const SqliteRuntimeGovernanceRepo_1 = require("../src/main/infrastructure/adapters/SqliteRuntimeGovernanceRepo");
const ConcurrentLicenseService_1 = require("../src/main/application/services/ConcurrentLicenseService");
const AttachmentStorageService_1 = require("../src/main/application/services/AttachmentStorageService");
const runtimeGovernance_ipc_1 = require("../src/main/ipc/runtimeGovernance.ipc");
const AuditDiffService_1 = require("../src/main/application/services/AuditDiffService");
let db;
let permissionSnapshotService = null;
let auditService = null;
let concurrentLicenseService = null;
let attachmentStorageService = null;
// Services will be initialized after DB is ready in app.on('ready')
let importService;
/**
 * Safe ipcMain.handle wrapper — prevents "Attempted to register a second handler" crash.
 * Duplicate channel registrations are silently skipped with a console warning.
 * This is needed because main.ts has grown large and some handlers were registered twice.
 */
function safeHandle(channel, handler) {
    try {
        electron_1.ipcMain.handle(channel, handler);
    }
    catch (e) {
        if (e.message?.includes('register a second handler')) {
            console.warn(`[IPC] Skipped duplicate handler for: '${channel}'`);
        }
        else {
            throw e;
        }
    }
}
// Register protocol for local images
// Register protocol for local images
electron_1.protocol.registerSchemesAsPrivileged([
    {
        scheme: 'wafi',
        privileges: {
            secure: true,
            supportFetchAPI: true,
            corsEnabled: true,
            standard: true,
            bypassCSP: true,
            stream: true
        }
    }
]);
electron_1.app.whenReady().then(() => {
    // Protocol Handler for wafi:// scheme
    console.log('[WAFI Protocol] Registering wafi:// protocol handler');
    electron_1.protocol.handle('wafi', async (request) => {
        const log = (msg) => {
            console.log(`[WAFI Protocol] ${msg}`);
        };
        try {
            log(`Incoming Request: ${request.url}`);
            // 1. Parse the URL - wafi://employees/image.jpg
            let urlPath = request.url.replace(/^wafi:\/\//, '');
            // 2. Remove query/hash
            const qIdx = urlPath.indexOf('?');
            if (qIdx !== -1)
                urlPath = urlPath.substring(0, qIdx);
            const hIdx = urlPath.indexOf('#');
            if (hIdx !== -1)
                urlPath = urlPath.substring(0, hIdx);
            // 3. Decode URL encoding
            const decodedPath = decodeURIComponent(urlPath);
            log(`Decoded Path: ${decodedPath}`);
            // 4. Construct Absolute Path
            const uploadsDir = path_1.default.join(electron_1.app.getPath('userData'), 'uploads');
            const targetPath = path_1.default.join(uploadsDir, decodedPath);
            const normalizedPath = path_1.default.normalize(targetPath);
            log(`Resolved Path: ${normalizedPath}`);
            log(`Uploads Dir: ${uploadsDir}`);
            // 5. Security Check - Prevent path traversal
            if (!normalizedPath.startsWith(uploadsDir)) {
                log('Security Error: Path traversal attempt detected');
                return new Response('Access Denied', {
                    status: 403,
                    headers: { 'Content-Type': 'text/plain' }
                });
            }
            // 6. Check if file exists
            if (!fs_1.default.existsSync(normalizedPath)) {
                log(`Error: File does not exist at ${normalizedPath}`);
                return new Response('File not found', {
                    status: 404,
                    headers: { 'Content-Type': 'text/plain' }
                });
            }
            // 7. Read and serve the file
            const fileBuffer = fs_1.default.readFileSync(normalizedPath);
            const ext = path_1.default.extname(normalizedPath).toLowerCase();
            // Determine MIME type
            let contentType = 'application/octet-stream';
            if (ext === '.jpg' || ext === '.jpeg')
                contentType = 'image/jpeg';
            else if (ext === '.png')
                contentType = 'image/png';
            else if (ext === '.gif')
                contentType = 'image/gif';
            else if (ext === '.webp')
                contentType = 'image/webp';
            else if (ext === '.svg')
                contentType = 'image/svg+xml';
            log(`Serving ${fileBuffer.length} bytes as ${contentType}`);
            return new Response(fileBuffer, {
                status: 200,
                headers: {
                    'Content-Type': contentType,
                    'Content-Length': String(fileBuffer.length),
                    'Access-Control-Allow-Origin': '*',
                    'Cache-Control': 'public, max-age=31536000'
                }
            });
        }
        catch (error) {
            log(`CRITICAL ERROR: ${error.message}`);
            console.error('[WAFI Protocol] Error:', error);
            return new Response('Internal Server Error', {
                status: 500,
                headers: { 'Content-Type': 'text/plain' }
            });
        }
    });
    console.log('[WAFI Protocol] Handler registered successfully');
});
// Register all IPC Handlers
const registerIPCHandlers = (db) => {
    // Reseed Accounts (Fix Data)
    safeHandle('reseed-accounts', () => {
        try {
            (0, database_1.seedCOA)();
            return { success: true };
        }
        catch (error) {
            console.error('Reseed failed:', error);
            throw error;
        }
    });
    // --- Budgets ---
    safeHandle('budgets:list', () => BudgetService_1.BudgetService.getAllBudgets());
    safeHandle('budgets:get', (_, id) => BudgetService_1.BudgetService.getBudgetById(id));
    safeHandle('budgets:create', (_, data) => BudgetService_1.BudgetService.createBudget(data));
    safeHandle('budgets:updateStatus', (_, id, status, userId) => BudgetService_1.BudgetService.updateBudgetStatus(id, status, userId));
    safeHandle('budgets:getVsActual', (_, id, period) => BudgetService_1.BudgetService.getBudgetVsActual(id, period));
    // Get Accounts
    safeHandle('get-account', (event, id) => {
        return db.prepare('SELECT * FROM accounts WHERE id = ?').get(id);
    });
    // Get Transactional Accounts Only (for dropdowns in vouchers)
    safeHandle('get-transactional-accounts', () => {
        return db.prepare('SELECT * FROM accounts WHERE is_transactional = 1 ORDER BY code').all();
    });
    // Get Account Tree (hierarchical structure)
    // Get Account Children
    safeHandle('get-account-children', (event, parentId) => {
        return db.prepare('SELECT * FROM accounts WHERE parent_id = ? ORDER BY code').all(parentId);
    });
    // Get Account Path (breadcrumb from root to account)
    safeHandle('get-account-path', (event, accountId) => {
        const path = [];
        let currentId = accountId;
        while (currentId) {
            const account = db.prepare('SELECT * FROM accounts WHERE id = ?').get(currentId);
            if (!account)
                break;
            path.unshift(account);
            currentId = account.parent_id;
        }
        return path;
    });
    // Add Account
    safeHandle('add-account', (event, account) => {
        // Note: This needs refactoring to use UUID if we want consistency, 
        // but for now relying on database.ts helper or simple logic. 
        // Since we didn't export a generic insert with UUID in db, we might fail here if we don't gen UUID.
        // Let's rely on the crud-operation or fix this. 
        // We will assume UI calls this less often than CRUD.
        // Actually, let's fix it to be safe.
        // For now, let's throw or log that this is deprecated in favor of CRUD or specific service.
        // But to keep app running:
        const { v4: uuidv4 } = require('uuid');
        const id = uuidv4();
        const stmt = db.prepare(`
    INSERT INTO accounts (id, code, name, type, balance, parent_id, account_level, is_transactional, is_active) 
    VALUES (@id, @code, @name, @type, @balance, @parent_id, @account_level, @is_transactional, @is_active)
  `);
        return stmt.run({
            id: id,
            code: account.code,
            name: account.name,
            type: account.type,
            balance: account.balance || '0',
            parent_id: account.parent_id || null,
            account_level: account.account_level || account.code.length,
            is_transactional: account.is_transactional ? 1 : 0,
            is_active: account.is_active !== false ? 1 : 0
        });
    });
    // Update Account
    safeHandle('update-account', (event, account) => {
        const stmt = db.prepare(`
      UPDATE accounts 
      SET name = @name, type = @type, is_transactional = @is_transactional, is_active = @is_active
      WHERE id = @id
    `);
        const result = stmt.run({
            id: account.id,
            name: account.name,
            type: account.type,
            is_transactional: account.is_transactional ? 1 : 0,
            is_active: account.is_active !== false ? 1 : 0
        });
        return result;
    });
    // --- Generic CRUD Handler ---
    safeHandle('crud-operation', (event, { operation, table, data, id }) => {
        const allowedTables = [
            'units', 'brands', 'countries', 'asset_families', 'item_families',
            'item_groups', 'item_categories', 'cost_centers', 'manual_books',
            'expense_types', 'areas', 'payment_terms', 'salesmen', 'check_books',
            'warehouses', 'currencies', 'customer_types', 'vendor_types', 'roles', 'permissions', 'taxes'
        ];
        if (!allowedTables.includes(table))
            throw new Error(`Table ${table} not allowed via Generic CRUD.`);
        try {
            if (operation === 'READ') {
                return db.prepare(`SELECT * FROM ${table}`).all();
            }
            else if (operation === 'CREATE') {
                // Auto-generate UUID for master data tables if not present
                if (!data.id) {
                    const { v4: uuidv4 } = require('uuid');
                    data.id = uuidv4();
                }
                const keys = Object.keys(data).join(', ');
                const placeholders = Object.keys(data).map(k => '@' + k).join(', ');
                const stmt = db.prepare(`INSERT INTO ${table} (${keys}) VALUES (${placeholders})`);
                const info = stmt.run(data);
                return { success: true, id: data.id }; // Return the generated UUID, not rowid
            }
            else if (operation === 'UPDATE') {
                const sets = Object.keys(data).filter(k => k !== 'id').map(k => `${k} = @${k}`).join(', ');
                const stmt = db.prepare(`UPDATE ${table} SET ${sets} WHERE id = @id`);
                stmt.run({ ...data, id });
                return { success: true };
            }
            else if (operation === 'DELETE') {
                db.prepare(`DELETE FROM ${table} WHERE id = ?`).run(id);
                return { success: true };
            }
        }
        catch (err) {
            console.error(`CRUD Error on ${table}:`, err);
            throw new Error(err.message);
        }
    });
    // Save Transaction (Refactored to use Service)
    safeHandle('save-transaction', async (event, data) => {
        try {
            const { type, voucher_type, ref_no, date, description, currency, exchange_rate, status, lines, created_by } = data;
            // Transformation: Frontend passes numbers/objects, Service expects strings/Ids.
            // We map it here to match Service Interface
            const journalHeader = {
                voucher_no: ref_no,
                type: type || 'JV',
                date: date, // "YYYY-MM-DD"
                description: description,
                currency: currency || 'ILS',
                exchange_rate: String(exchange_rate || 1),
                status: status || 'Posted',
                created_by: created_by || 'Admin'
            };
            const journalLines = lines.map((l) => ({
                account_id: l.account_id,
                debit: String(l.debit || 0),
                credit: String(l.credit || 0),
                description: l.description || description,
                cost_center_id: l.cost_center || null,
                reference_no: l.reference_no || null
            }));
            const id = JournalService_1.JournalService.createJournalEntry(journalHeader, journalLines);
            return { success: true, id };
        }
        catch (e) {
            console.error('Save Transaction Error:', e);
            throw new Error(e.message);
        }
    });
    // Save Receipt Voucher
    safeHandle('save-receipt-voucher', (event, data) => {
        const { header, details, checks } = data;
        const saveRvTransaction = db.transaction(() => {
            // 1. Insert Header
            const insertHeader = db.prepare(`
            INSERT INTO receipt_vouchers (
                voucher_number, date, manual_ref, payer_account_id, description, 
                total_amount, currency, exchange_rate, branch, cost_center, created_by
            ) VALUES (
                @voucher_number, @date, @manual_ref, @payer_account_id, @description,
                @total_amount, @currency, @exchange_rate, @branch, @cost_center, 'Admin' 
            )
        `);
            const info = insertHeader.run({
                voucher_number: header.ref_no,
                date: header.date,
                manual_ref: header.manual_ref,
                payer_account_id: header.payer_account_id,
                description: header.description,
                total_amount: header.total_amount,
                currency: header.currency || 'ILS',
                exchange_rate: header.exchange_rate || 1,
                branch: header.branch,
                cost_center: header.cost_center
            });
            const voucherId = info.lastInsertRowid;
            // 2. Insert Details (Cash/Bank)
            const insertDetail = db.prepare(`
            INSERT INTO receipt_voucher_details (voucher_id, payment_method, account_id, amount, reference)
            VALUES (@voucher_id, @payment_method, @account_id, @amount, @reference)
        `);
            details.forEach((d) => {
                if (d.amount > 0) {
                    insertDetail.run({
                        voucher_id: voucherId,
                        payment_method: d.payment_method,
                        account_id: d.account_id,
                        amount: d.amount,
                        reference: d.reference
                    });
                }
            });
            // 3. Insert Checks
            const insertCheck = db.prepare(`
            INSERT INTO checks (
                check_number, bank_name, amount, due_date, status, 
                voucher_id, received_from_id, current_location_id
            ) VALUES (
                @check_number, @bank_name, @amount, @due_date, 'Holding',
                @voucher_id, @received_from_id, @current_location_id
            )
        `);
            // Find "Checks Under Collection" Account ID (Code 1141 - Checks in Box)
            // If not found, fallback or error. We assume seedCOA ran.
            const checkFundAcc = db.prepare("SELECT id FROM accounts WHERE code = '1141'").get();
            const checkFundId = checkFundAcc ? checkFundAcc.id : null;
            checks.forEach((c) => {
                insertCheck.run({
                    check_number: c.check_number,
                    bank_name: c.bank_name,
                    amount: c.amount,
                    due_date: c.due_date,
                    voucher_id: voucherId,
                    received_from_id: header.payer_account_id,
                    current_location_id: checkFundId
                });
            });
            // 4. Generate Journal Entry
            const insertTrans = db.prepare(`
            INSERT INTO transactions (type, ref_no, date, description, total_amount, status)
            VALUES ('RV', @ref_no, @date, @description, @total_amount, 'Posted')
        `);
            const transInfo = insertTrans.run({
                ref_no: header.ref_no,
                date: header.date,
                description: `سند قبض: ${header.description}`,
                total_amount: header.total_amount
            });
            const transId = transInfo.lastInsertRowid;
            const insertLine = db.prepare(`
            INSERT INTO transaction_lines (transaction_id, account_id, debit, credit, description)
            VALUES (@transaction_id, @account_id, @debit, @credit, @description)
        `);
            const updateBalance = db.prepare(`
            UPDATE accounts 
            SET balance = balance + (@change)
            WHERE id = @id
        `);
            // Helper to post line
            const postLine = (accId, debit, credit, desc) => {
                insertLine.run({
                    transaction_id: transId,
                    account_id: accId,
                    debit: debit,
                    credit: credit,
                    description: desc
                });
                updateBalance.run({
                    id: accId,
                    change: debit - credit
                });
            };
            // Debits (from Details)
            details.forEach((d) => {
                if (d.amount > 0) {
                    const desc = `قبض ${d.payment_method === 'CASH' ? 'نقدي' : 'تحويل'} - ${d.reference || ''}`;
                    postLine(d.account_id, d.amount, 0, desc);
                }
            });
            // Debits (from Checks)
            checks.forEach((c) => {
                // 1. Create Financial Line (Debit: Check Box or Check-in-Hand)
                // Ideally we use a specific Check Box Account.
                // For now, if checkFundId is provided or fallback.
                const debitAccountId = checkFundId || header.payer_account_id; // Fallback is bad, but keeping safe.
                if (debitAccountId) {
                    const desc = `شيك رقم ${c.check_number} - ${c.bank_name}`;
                    postLine(debitAccountId, c.amount, 0, desc);
                    // 2. Register Check in CheckService (DB)
                    CheckService_1.CheckService.registerCheck({
                        check_number: c.check_number,
                        bank_name: c.bank_name,
                        amount: c.amount,
                        due_date: c.due_date
                    }, header.payer_account_id, header.ref_no, 'System');
                }
            });
            // Credit (Total to Payer)
            postLine(header.payer_account_id, 0, header.total_amount, `سند قبض رقم ${header.ref_no} - ${header.description}`);
            return { success: true, voucherId };
        });
        try {
            return saveRvTransaction();
        }
        catch (e) {
            console.error('Save RV Error:', e);
            throw e;
        }
    });
    // --- Inventory Handlers (New) ---
    safeHandle('inventory:get-brands', () => InventoryService_1.InventoryService.getBrands());
    safeHandle('inventory:create-brand', (event, brand) => InventoryService_1.InventoryService.createBrand(brand));
    safeHandle('inventory:update-brand', (event, brand) => InventoryService_1.InventoryService.updateBrand(brand));
    safeHandle('inventory:delete-brand', (event, id) => InventoryService_1.InventoryService.deleteBrand(id));
    safeHandle('inventory:delete-unit', (event, id) => InventoryService_1.InventoryService.deleteUnit(id));
    safeHandle('inventory:seed-default-units', () => InventoryService_1.InventoryService.seedDefaultUnits());
    safeHandle('inventory:get-items-v2', () => InventoryService_1.InventoryService.getItems());
    safeHandle('inventory:get-item-details', (event, id) => InventoryService_1.InventoryService.getItemDetails(id));
    safeHandle('inventory:create-item', (event, item) => InventoryService_1.InventoryService.createItem(item));
    safeHandle('inventory:update-item', (event, item) => InventoryService_1.InventoryService.updateItem(item));
    safeHandle('inventory:bulk-update-items', (event, updates) => InventoryService_1.InventoryService.bulkUpdateItems(updates));
    safeHandle('save-item', (event, item) => InventoryService_1.InventoryService.updateItem(item)); // Alias for legacy calls
    // --- Item Service (Suggestions/Lists) ---
    safeHandle('inventory:suggest-items', (event, q, limit) => ItemService_1.ItemService.suggest(q, limit));
    safeHandle('inventory:list-items', (event, q, limit, offset) => ItemService_1.ItemService.list(q, limit, offset));
    safeHandle('inventory:quick-create-item', (event, item) => ItemService_1.ItemService.quickCreate(item));
    // Stock Take
    safeHandle('inventory:get-stock-takes', () => InventoryService_1.InventoryService.getStockTakes());
    safeHandle('inventory:get-stock-take', (event, id) => InventoryService_1.InventoryService.getStockTake(id));
    safeHandle('inventory:create-stock-take', (event, data) => InventoryService_1.InventoryService.createStockTake(data));
    safeHandle('inventory:update-stock-take-item', (event, id, qty) => InventoryService_1.InventoryService.updateStockTakeItem(id, qty));
    safeHandle('inventory:approve-stock-take', (event, id) => InventoryService_1.InventoryService.approveStockTake(id));
    // Period Closing
    safeHandle('inventory:get-last-closing-date', () => InventoryService_1.InventoryService.getLastClosingDate());
    safeHandle('inventory:close-period', (event, date) => InventoryService_1.InventoryService.closePeriod(date));
    safeHandle('inventory:get-batches', (event, itemId) => InventoryService_1.InventoryService.getBatches(itemId));
    safeHandle('inventory:create-batch', (event, batch) => InventoryService_1.InventoryService.createBatch(batch));
    safeHandle('inventory:transfer-request', (event, data) => InventoryService_1.InventoryService.createTransferRequest(data));
    safeHandle('inventory:get-transfer-requests', (event, filters) => InventoryService_1.InventoryService.getTransferRequests(filters));
    safeHandle('inventory:get-transfer-request', (event, id) => InventoryService_1.InventoryService.getTransferRequest(id));
    // Attributes
    safeHandle('inventory:get-attributes', () => InventoryService_1.InventoryService.getAttributeDefinitions());
    safeHandle('inventory:save-attribute', (_, attr) => InventoryService_1.InventoryService.saveAttributeDefinition(attr));
    safeHandle('inventory:delete-attribute', (_, id) => InventoryService_1.InventoryService.deleteAttribute(id));
    // Attribute Values
    safeHandle('inventory:get-attribute-values', (_, attrId) => InventoryService_1.InventoryService.getAttributeValues(attrId));
    safeHandle('inventory:save-attribute-value', (_, data) => InventoryService_1.InventoryService.saveAttributeValue(data));
    safeHandle('inventory:delete-attribute-value', (_, id) => InventoryService_1.InventoryService.deleteAttributeValue(id));
    // --- Partner Handlers (New Master Data) ---
    safeHandle('partner:get-customer-types', () => PartnerService_1.PartnerService.getCustomerTypes());
    safeHandle('partner:save-customer-type', (event, data) => PartnerService_1.PartnerService.saveCustomerType(data));
    safeHandle('partner:delete-customer-type', (event, id) => PartnerService_1.PartnerService.deleteCustomerType(id));
    safeHandle('partner:get-vendor-types', () => PartnerService_1.PartnerService.getVendorTypes());
    safeHandle('partner:save-vendor-type', (event, data) => PartnerService_1.PartnerService.saveVendorType(data));
    safeHandle('partner:delete-vendor-type', (event, id) => PartnerService_1.PartnerService.deleteVendorType(id));
    safeHandle('partner:get-contact-types', () => PartnerService_1.PartnerService.getContactTypes());
    safeHandle('partner:get-memberships', () => PartnerService_1.PartnerService.getMemberships());
    safeHandle('partner:save-membership', (event, data) => PartnerService_1.PartnerService.saveMembership(data));
    safeHandle('partner:delete-membership', (event, id) => PartnerService_1.PartnerService.deleteMembership(id));
    safeHandle('partner:get-sectors', () => PartnerService_1.PartnerService.getSectors());
    safeHandle('partner:save-sector', (event, data) => PartnerService_1.PartnerService.saveSector(data));
    safeHandle('partner:delete-sector', (event, id) => PartnerService_1.PartnerService.deleteSector(id));
    safeHandle('partner:get-credit-policies', () => PartnerService_1.PartnerService.getCreditPolicies());
    safeHandle('partner:save-credit-policy', (event, data) => PartnerService_1.PartnerService.saveCreditPolicy(data));
    safeHandle('partner:delete-credit-policy', (event, id) => PartnerService_1.PartnerService.deleteCreditPolicy(id));
    safeHandle('partner:get-regions', () => PartnerService_1.PartnerService.getRegions());
    safeHandle('partner:save-region', (event, data) => PartnerService_1.PartnerService.saveRegion(data)); // Handles create/update
    // Explicit create/update if needed by frontend, but saveRegion wraps them
    safeHandle('partner:create-region', (event, data) => PartnerService_1.PartnerService.createRegion(data));
    safeHandle('partner:update-region', (event, data) => PartnerService_1.PartnerService.updateRegion(data));
    safeHandle('partner:delete-region', (event, id) => PartnerService_1.PartnerService.deleteRegion(id));
    safeHandle('partner:get-groups', () => PartnerService_1.PartnerService.getGroups());
    safeHandle('partner:save-group', (event, data) => PartnerService_1.PartnerService.saveGroup(data));
    safeHandle('partner:delete-group', (event, id) => PartnerService_1.PartnerService.deleteGroup(id));
    safeHandle('partner:get-sales-reps', () => PartnerService_1.PartnerService.getSalesReps());
    safeHandle('partner:save-sales-rep', (event, data) => PartnerService_1.PartnerService.saveSalesRep(data));
    safeHandle('partner:delete-sales-rep', (event, id) => PartnerService_1.PartnerService.deleteSalesRep(id));
    safeHandle('partner:get-price-lists', () => PartnerService_1.PartnerService.getPriceLists());
    safeHandle('partner:save-price-list', (event, data) => PartnerService_1.PartnerService.savePriceList(data));
    safeHandle('partner:delete-price-list', (event, id) => PartnerService_1.PartnerService.deletePriceList(id));
    safeHandle('partner:get-price-list-items', (event, id) => PartnerService_1.PartnerService.getPriceListItems(id));
    safeHandle('partner:save-price-list-item', (event, data) => PartnerService_1.PartnerService.savePriceListItem(data));
    safeHandle('partner:delete-price-list-item', (event, id) => PartnerService_1.PartnerService.deletePriceListItem(id));
    // --- Warehouse Handlers ---
    safeHandle('get-warehouses', () => InventoryService_1.InventoryService.getWarehouses());
    safeHandle('create-warehouse', (event, wh) => InventoryService_1.InventoryService.createWarehouse(wh));
    safeHandle('update-warehouse', (event, wh) => InventoryService_1.InventoryService.updateWarehouse(wh));
    safeHandle('delete-warehouse', (event, id) => InventoryService_1.InventoryService.deleteWarehouse(id));
    // Map inventory: names too for consistency if needed
    safeHandle('inventory:get-warehouses', () => InventoryService_1.InventoryService.getWarehouses());
    safeHandle('inventory:create-warehouse', (event, wh) => InventoryService_1.InventoryService.createWarehouse(wh));
    safeHandle('inventory:update-warehouse', (event, wh) => InventoryService_1.InventoryService.updateWarehouse(wh));
    safeHandle('inventory:delete-warehouse', (event, id) => InventoryService_1.InventoryService.deleteWarehouse(id));
    // --- Stock Handlers ---
    safeHandle('get-stock', (event, { itemId, warehouseId }) => {
        return InventoryService_1.InventoryService.getStock(itemId, warehouseId);
    });
    safeHandle('inventory:get-valuation', (event, filters) => InventoryService_1.InventoryService.getInventoryValuation(filters));
    safeHandle('add-stock-transaction', (event, trx) => {
        return InventoryService_1.InventoryService.addStockTransaction(trx);
    });
    // --- Bins ---
    safeHandle('get-warehouse-bins', (event, warehouseId) => InventoryService_1.InventoryService.getBins(warehouseId));
    safeHandle('create-warehouse-bin', (event, bin) => InventoryService_1.InventoryService.createBin(bin));
    safeHandle('delete-warehouse-bin', (event, id) => InventoryService_1.InventoryService.deleteBin(id));
    // --- Stock Documents ---
    safeHandle('inventory-get-grns', () => InventoryService_1.InventoryService.getGoodsReceipts());
    safeHandle('inventory-get-dispatches', () => InventoryService_1.InventoryService.getDispatches());
    // -- Dispatch Service --
    safeHandle('dispatch:update', (_, id, payload) => DispatchService_1.DispatchService.update(id, payload));
    safeHandle('dispatch:post-to-pending', (_, id) => DispatchService_1.DispatchService.postToPending(id));
    safeHandle('dispatch:invoice-from-dispatch', (_, dispatchId) => DispatchService_1.DispatchService.invoiceFromDispatch(dispatchId));
    safeHandle('dispatch:getAll', () => DispatchService_1.DispatchService.getAll());
    safeHandle('dispatch:getById', (_, id) => DispatchService_1.DispatchService.getById(id));
    safeHandle('inventory-get-stock-document', (event, id) => InventoryService_1.InventoryService.getStockDocument(id));
    safeHandle('create-stock-document', (event, doc) => InventoryService_1.InventoryService.createStockDocument(doc));
    safeHandle('update-stock-document', (event, doc) => InventoryService_1.InventoryService.updateStockDocument(doc));
    // --- Logistics ---
    safeHandle('logistics-get-drivers', () => LogisticsService_1.LogisticsService.getDrivers());
    safeHandle('logistics-save-driver', (event, data) => LogisticsService_1.LogisticsService.saveDriver(data));
    safeHandle('logistics-delete-driver', (event, id) => LogisticsService_1.LogisticsService.deleteDriver(id));
    safeHandle('logistics-get-vehicles', () => LogisticsService_1.LogisticsService.getVehicles());
    safeHandle('logistics-save-vehicle', (event, data) => LogisticsService_1.LogisticsService.saveVehicle(data));
    safeHandle('logistics-delete-vehicle', (event, id) => LogisticsService_1.LogisticsService.deleteVehicle(id));
    // --- Stock Taking Handlers ---
    // Handlers registered above with 'inventory:' prefix. Legacy handlers below removed.
    // safeHandle('get-stock-takes', (event) => InventoryService.getStockTakes());
    // safeHandle('get-stock-take', (event, id) => InventoryService.getStockTake(id));  // safeHandle('get-inventory-dashboard', () => InventoryService.getInventoryDashboard());
    safeHandle('inventory:receive-transfer', (event, data) => InventoryService_1.InventoryService.receiveTransfer(data));
    // --- Assembly ---
    safeHandle('inventory:get-kit', (event, itemId) => InventoryService_1.InventoryService.getKit(itemId));
    safeHandle('inventory:create-assembly', (event, data) => InventoryService_1.InventoryService.createAssembly(data));
    // --- Reports Handlers ---
    safeHandle('reports-get-item-movement', (event, filters) => ReportService_1.ReportService.getItemMovement(filters));
    safeHandle('reports-get-top-customers', (event) => ReportService_1.ReportService.getTopCustomers());
    safeHandle('get-report-pnl', (event, range) => ReportService_1.ReportService.getReportPnL(range));
    safeHandle('get-trial-balance', (event, params) => ReportService_1.ReportService.getTrialBalance()); // Modified signature match
    // Register ALL other reports
    safeHandle('reports-get-partner-ledger', (event, filters) => ReportService_1.ReportService.getPartnerLedger(filters));
    safeHandle('reports-get-inventory-status', () => ReportService_1.ReportService.getInventoryStatus());
    safeHandle('reports-get-sales-analytics', (event, range) => ReportService_1.ReportService.getSalesAnalytics(range));
    safeHandle('reports-get-profitability', (event, range) => ReportService_1.ReportService.getProfitabilityReport(range));
    safeHandle('reports-get-purchasing-analysis', (event, range) => ReportService_1.ReportService.getPurchasingAnalysis(range));
    safeHandle('reports-get-purchases-by-vendor', (event, range) => ReportService_1.ReportService.getPurchasesByVendor(range));
    safeHandle('reports-get-import-reports', () => ReportService_1.ReportService.getImportReports());
    safeHandle('reports-get-cheques', (event, filters) => ReportService_1.ReportService.getChequesReport(filters));
    safeHandle('reports-get-account-statement', (event, filters) => ReportService_1.ReportService.getAccountStatement(filters));
    safeHandle('reports-get-aging', () => ReportService_1.ReportService.getAgingReport());
    safeHandle('reports-get-tax', (event, range) => ReportService_1.ReportService.getTaxReport(range));
    safeHandle('get-dashboard-kpis', () => ReportService_1.ReportService.getDashboardKPIs());
    safeHandle('get-dashboard-charts', () => ReportService_1.ReportService.getDashboardCharts());
    safeHandle('reports-get-slow-moving', (event, days) => ReportService_1.ReportService.getSlowMovingItems(days));
    safeHandle('reports-get-expiry', (event, days) => ReportService_1.ReportService.getExpiryReport(days));
    safeHandle('save-invoice', (event, data) => {
        const ctx = (0, AuthContext_1.getContext)(event);
        return SalesService_1.SalesService.createInvoice(data, {
            companyId: ctx?.companyId,
            branchId: ctx?.branchId,
            userId: ctx?.userId,
        });
    });
    safeHandle('sales-create-invoice', (event, data) => {
        const ctx = (0, AuthContext_1.getContext)(event);
        return SalesService_1.SalesService.createInvoice(data, {
            companyId: ctx?.companyId,
            branchId: ctx?.branchId,
            userId: ctx?.userId,
        });
    });
    safeHandle('get-next-invoice-no', (event) => SalesService_1.SalesService.getNextInvoiceNumber());
    safeHandle('sales-get-invoice', (event, id) => SalesService_1.SalesService.getInvoice(id));
    safeHandle('sales-post-invoice', (event, id, userId) => {
        const ctx = (0, AuthContext_1.getContext)(event);
        const granted = new Set([
            ...(Array.isArray(ctx?.permissions) ? ctx.permissions : []),
            ...(Array.isArray(ctx?.capabilities) ? ctx.capabilities : []),
        ]);
        const canPost = granted.has('ALL') ||
            granted.has('*.*') ||
            granted.has('ti.sales.invoice.post') ||
            granted.has('sales.invoice.post') ||
            granted.has('sales.post') ||
            granted.has('DOC.POST');
        if (!canPost) {
            console.warn('[IPC_GUARD_DENIED]', {
                eventName: 'sales.post.invoice',
                code: 'PERMISSION_DENIED',
                userId: ctx?.userId,
                companyId: ctx?.companyId,
                branchId: ctx?.branchId,
                capabilityKey: 'ti.sales.invoice.post',
                timestamp: new Date().toISOString()
            });
            const err = new Error('PERMISSION_DENIED');
            err.code = 'PERMISSION_DENIED';
            err.messageKey = 'error.permission_denied.ti.sales.invoice.post';
            throw err;
        }
        return SalesService_1.SalesService.postInvoice(id, userId);
    });
    safeHandle('sales-submit-invoice-approval', (event, id, userId) => SalesService_1.SalesService.submitInvoiceForApproval(id, userId));
    // Sales Orders
    safeHandle('sales-get-pending-orders', () => SalesService_1.SalesService.getPendingOrders());
    // 4. Check Management Handlers
    safeHandle('get-checks', (event, status) => CheckService_1.CheckService.getChecks(status));
    safeHandle('register-check', (event, { data, customerId, reference, userId }) => CheckService_1.CheckService.registerCheck(data, customerId, reference, userId));
    safeHandle('update-check-status', (event, data) => CheckService_1.CheckService.updateStatus(data));
    // 5. HR & Payroll Handlers
    // Organization
    safeHandle('hr-get-departments', () => HRService_1.HRService.getDepartments());
    safeHandle('hr-save-department', (event, data) => HRService_1.HRService.saveDepartment(data));
    safeHandle('hr-delete-department', (event, id) => HRService_1.HRService.deleteDepartment(id));
    safeHandle('hr-get-job-titles', () => HRService_1.HRService.getJobTitles());
    safeHandle('hr-get-titles', () => HRService_1.HRService.getJobTitles()); // Alias for hr.getTitles
    safeHandle('hr-save-job-title', (event, data) => HRService_1.HRService.saveJobTitle(data));
    safeHandle('hr-save-title', (event, data) => HRService_1.HRService.saveJobTitle(data)); // Alias
    safeHandle('hr-delete-job-title', (event, id) => HRService_1.HRService.deleteJobTitle(id));
    safeHandle('hr-delete-title', (event, id) => HRService_1.HRService.deleteJobTitle(id)); // Alias
    // Employees
    safeHandle('hr-get-employees', () => HRService_1.HRService.getEmployees());
    safeHandle('hr-get-employee', (event, id) => HRService_1.HRService.getEmployee(id));
    safeHandle('hr-save-employee', (event, data) => HRService_1.HRService.saveEmployee(data));
    safeHandle('hr-get-next-code', () => HRService_1.HRService.getNextEmployeeCode());
    safeHandle('hr-save-photo', (event, { buffer, name }) => HRService_1.HRService.saveEmployeePhoto(buffer, name));
    // Attendance
    safeHandle('hr-get-shifts', () => AttendanceService_1.AttendanceService.getShifts());
    safeHandle('hr-save-shift', (event, data) => AttendanceService_1.AttendanceService.saveShift(data));
    safeHandle('hr-import-attendance', (event, records) => AttendanceService_1.AttendanceService.importAttendanceRaw(records));
    safeHandle('hr-process-daily-attendance', (event, date) => AttendanceService_1.AttendanceService.processDayAttendance(date));
    safeHandle('hr-process-attendance', (event, date) => AttendanceService_1.AttendanceService.processDayAttendance(date)); // Alias
    safeHandle('hr-get-daily-attendance', (event, date) => AttendanceService_1.AttendanceService.getDailyAttendance(date));
    // Leaves
    safeHandle('hr-get-leave-types', () => LeaveService_1.LeaveService.getLeaveTypes());
    safeHandle('hr-save-leave-type', (event, data) => LeaveService_1.LeaveService.saveLeaveType(data));
    safeHandle('hr-delete-leave-type', (event, id) => LeaveService_1.LeaveService.deleteLeaveType(id));
    safeHandle('hr-get-leave-requests', (event, filter) => LeaveService_1.LeaveService.getLeaveRequests(filter));
    safeHandle('hr-save-leave-request', (event, data) => LeaveService_1.LeaveService.saveLeaveRequest(data));
    safeHandle('hr-update-leave-status', (event, { id, status, reason }) => LeaveService_1.LeaveService.updateRequestStatus(id, status, reason));
    safeHandle('hr-get-employee-balances', (event, { employeeId, year }) => LeaveService_1.LeaveService.getEmployeeBalances(employeeId, year));
    // Payroll
    safeHandle('hr-get-payroll-preview', (event, { month, year }) => PayrollService_1.PayrollService.generatePayrollPreview(month, year));
    safeHandle('hr-post-payroll', (event, { month, year, slips }) => PayrollService_1.PayrollService.postPayroll(month, year, slips));
    safeHandle('hr-save-advance', (event, data) => PayrollService_1.PayrollService.saveAdvance(data));
    safeHandle('hr-get-slips', (event, { month, year }) => PayrollService_1.PayrollService.getSlips(month, year));
    safeHandle('hr-calc-eos', (event, { employeeId, endDate }) => PayrollService_1.PayrollService.calculateEOS(employeeId, endDate));
    // HR - Production & Commission
    safeHandle('hr-get-production-logs', (event, date) => ProductionService_1.ProductionService.getLogs(date));
    safeHandle('hr-save-production-log', (event, data) => ProductionService_1.ProductionService.saveLog(data));
    safeHandle('hr-delete-production-log', (event, id) => ProductionService_1.ProductionService.deleteLog(id));
    safeHandle('hr-get-commissions', (event, { month, year }) => CommissionService_1.CommissionService.getCommissions(month, year));
    safeHandle('hr-save-commissions', (event, data) => CommissionService_1.CommissionService.saveCommissions(data));
    safeHandle('hr-generate-salary-entry', (event, { month, year }) => PayrollService_1.PayrollService.generateSalaryEntry(month, year));
    // 6. Fixed Assets Handlers
    safeHandle('get-assets', () => AssetService_1.AssetService.getAssets());
    safeHandle('save-asset', (event, data) => AssetService_1.AssetService.saveAsset(data));
    safeHandle('calc-depreciation', (event, assetId) => AssetService_1.AssetService.calculateDepreciation(assetId));
    safeHandle('post-depreciation', (event, { assetId, amount, date }) => AssetService_1.AssetService.postDepreciation(assetId, amount, date));
    safeHandle('get-asset-categories', () => AssetService_1.AssetService.getCategories());
    safeHandle('save-asset-category', (event, data) => AssetService_1.AssetService.saveCategory(data));
    safeHandle('get-next-asset-code', () => AssetService_1.AssetService.getNextCode());
    // 7. System & Auth Handlers
    safeHandle('auth-login', (event, { username, password }) => {
        const user = AuthService_1.AuthService.login(username, password);
        (0, AuthContext_1.bindAuthSession)(event, user);
        if (concurrentLicenseService) {
            try {
                concurrentLicenseService.acquireSessionOrThrow({
                    userId: String(user?.id || user?.userId || ''),
                    companyId: String(user?.company_id || user?.companyId || 'COMP_01'),
                    branchId: String(user?.branch_id || user?.branchId || 'BR_01'),
                    webContentsId: Number(event?.sender?.id),
                });
            }
            catch (error) {
                (0, AuthContext_1.clearAuthSession)(event);
                throw error;
            }
        }
        return user;
    });
    safeHandle('auth-logout', (event) => {
        const ctx = (0, AuthContext_1.getContext)(event);
        concurrentLicenseService?.releaseSession(Number(event?.sender?.id), {
            userId: String(ctx?.userId || ''),
            companyId: String(ctx?.companyId || 'COMP_01'),
            branchId: String(ctx?.branchId || 'BR_01'),
        });
        (0, AuthContext_1.clearAuthSession)(event);
        return { success: true };
    });
    safeHandle('auth-change-password', (event, { userId, oldPass, newPass }) => AuthService_1.AuthService.changePassword(userId, oldPass, newPass));
    safeHandle('get-users', () => AuthService_1.AuthService.getUsers());
    safeHandle('save-user', (event, user) => {
        const result = user.id ? AuthService_1.AuthService.updateUser(user) : AuthService_1.AuthService.createUser(user);
        permissionSnapshotService?.onLegacyPermissionsChanged('COMP_01');
        if (user?.id)
            permissionSnapshotService?.invalidateUser(String(user.id));
        return result;
    });
    safeHandle('delete-user', (event, id) => {
        const result = AuthService_1.AuthService.deleteUser(id);
        permissionSnapshotService?.onLegacyPermissionsChanged('COMP_01');
        if (id)
            permissionSnapshotService?.invalidateUser(String(id));
        return result;
    });
    safeHandle('get-roles', () => AuthService_1.AuthService.getRoles());
    safeHandle('save-role', (event, role) => {
        const result = role.id ? AuthService_1.AuthService.updateRole(role) : AuthService_1.AuthService.createRole(role);
        permissionSnapshotService?.onLegacyPermissionsChanged('COMP_01');
        return result;
    });
    safeHandle('delete-role', (event, id) => {
        const result = AuthService_1.AuthService.deleteRole(id);
        permissionSnapshotService?.onLegacyPermissionsChanged('COMP_01');
        return result;
    });
    safeHandle('get-permissions', (event, roleId) => AuthService_1.AuthService.getPermissions(roleId));
    safeHandle('save-permissions', (event, { roleId, permissions, companyId }) => {
        const result = AuthService_1.AuthService.savePermissions(roleId, permissions);
        permissionSnapshotService?.onLegacyPermissionsChanged(companyId || 'COMP_01');
        return result;
    });
    // 8. System Maintenance
    safeHandle('backup-database', () => SystemService_1.SystemService.backupDatabase());
    safeHandle('restore-database', () => SystemService_1.SystemService.restoreDatabase());
    safeHandle('check-integrity', () => SystemService_1.SystemService.checkIntegrity());
    safeHandle('get-audit-logs', (event, filters) => SystemService_1.SystemService.getAuditLogs(filters));
    // --- Purchase Handlers ---
    safeHandle('purchase-create-invoice', (event, data) => PurchaseService_1.PurchaseService.createInvoice(data));
    safeHandle('purchase-get-invoices', () => PurchaseService_1.PurchaseService.getInvoices());
    safeHandle('purchase-get-invoice', (event, id) => PurchaseService_1.PurchaseService.getInvoice(id));
    safeHandle('purchase-get-next-no', () => PurchaseService_1.PurchaseService.getNextInvoiceNo());
    safeHandle('purchase-create-order', (event, data) => PurchaseService_1.PurchaseService.createOrder(data));
    safeHandle('purchase-get-orders', () => PurchaseService_1.PurchaseService.getOrders());
    safeHandle('purchase-get-order', (event, id) => PurchaseService_1.PurchaseService.getOrder(id));
    safeHandle('purchase-update-order', (event, data) => PurchaseService_1.PurchaseService.updateOrder(data));
    safeHandle('purchase-delete-order', (event, id) => PurchaseService_1.PurchaseService.deleteOrder(id));
    safeHandle('purchase-post-order', (event, id, userId) => PurchaseService_1.PurchaseService.postOrder(id, userId));
    safeHandle('purchase-approve-order', (event, id, userId) => PurchaseService_1.PurchaseService.approveOrder(id, userId));
    safeHandle('purchase-reject-order', (event, id, userId, reason) => PurchaseService_1.PurchaseService.rejectOrder(id, userId, reason));
    safeHandle('purchase-create-request', (event, data) => PurchaseService_1.PurchaseService.createRequest(data));
    safeHandle('purchase-get-requests', () => PurchaseService_1.PurchaseService.getRequests());
    safeHandle('purchase-get-request', (event, id) => PurchaseService_1.PurchaseService.getRequest(id));
    safeHandle('purchase-update-request', (event, data) => PurchaseService_1.PurchaseService.updateRequest(data));
    safeHandle('purchase-delete-request', (event, id) => PurchaseService_1.PurchaseService.deleteRequest(id));
    safeHandle('purchase-post-request', (event, id, userId) => PurchaseService_1.PurchaseService.postRequest(id, userId));
    safeHandle('purchase-approve-request', (event, id, userId) => PurchaseService_1.PurchaseService.approveRequest(id, userId));
    safeHandle('purchase-reject-request', (event, id, userId, reason) => PurchaseService_1.PurchaseService.rejectRequest(id, userId, reason));
    // RFQ
    safeHandle('purchase-create-rfq', (event, data) => PurchaseService_1.PurchaseService.createRFQ(data));
    safeHandle('purchase-get-rfqs', () => PurchaseService_1.PurchaseService.getRFQs());
    safeHandle('purchase-get-rfq', (event, id) => PurchaseService_1.PurchaseService.getRFQ(id));
    safeHandle('purchase-update-rfq', (event, data) => PurchaseService_1.PurchaseService.updateRFQ(data));
    safeHandle('purchase-create-return', (event, data) => PurchaseService_1.PurchaseService.createReturn(data));
    safeHandle('purchase-get-returns', () => PurchaseService_1.PurchaseService.getReturns());
    safeHandle('purchase-get-return', (event, id) => PurchaseService_1.PurchaseService.getReturn(id));
    safeHandle('get-settings', () => SystemService_1.SystemService.getSettings());
    safeHandle('save-settings', (event, data) => SystemService_1.SystemService.saveSettings(data));
    safeHandle('save-logo', (event, { buffer, name }) => SystemService_1.SystemService.saveLogo(buffer, name));
    safeHandle('system:save-image', (event, { buffer, name }) => SystemService_1.SystemService.saveImage(buffer, name));
    safeHandle('dialog:open-file', async (event, options) => {
        const { canceled, filePaths } = await electron_1.dialog.showOpenDialog(options);
        if (canceled)
            return { canceled: true, filePaths: [] };
        return { canceled: false, filePaths };
    });
    // --- Currency Handlers ---
    safeHandle('get-currencies', (event, companyId) => CurrencyService_1.CurrencyService.getCurrencies(companyId || '1'));
    safeHandle('get-base-currency', (event, companyId) => CurrencyService_1.CurrencyService.getBaseCurrency(companyId || '1'));
    safeHandle('create-currency', (event, currency) => CurrencyService_1.CurrencyService.createCurrency(currency));
    safeHandle('update-currency', (event, id, companyId, updates) => CurrencyService_1.CurrencyService.updateCurrency(id, companyId || '1', updates));
    safeHandle('delete-currency', (event, id, companyId) => CurrencyService_1.CurrencyService.deleteCurrency(id, companyId || '1'));
    // --- Cost Center Handlers ---
    safeHandle('get-cost-centers', (event, companyId) => CostCenterService_1.CostCenterService.getCostCenters(companyId || '1'));
    safeHandle('get-cost-center', (event, id, companyId) => CostCenterService_1.CostCenterService.getCostCenter(id, companyId || '1'));
    safeHandle('create-cost-center', (event, data) => CostCenterService_1.CostCenterService.createCostCenter({ ...data, companyId: data.companyId || '1' }));
    safeHandle('update-cost-center', (event, id, companyId, updates) => CostCenterService_1.CostCenterService.updateCostCenter(id, companyId || '1', updates));
    safeHandle('delete-cost-center', (event, id, companyId) => CostCenterService_1.CostCenterService.deleteCostCenter(id, companyId || '1'));
    // --- Tax Group Handlers ---
    safeHandle('get-tax-groups', (event, companyId) => TaxGroupService_1.TaxGroupService.getTaxGroups(companyId || '1'));
    safeHandle('get-tax-group', (event, id, companyId) => TaxGroupService_1.TaxGroupService.getTaxGroup(id, companyId || '1'));
    safeHandle('create-tax-group', (event, data) => TaxGroupService_1.TaxGroupService.createTaxGroup({ ...data, companyId: data.companyId || '1' }));
    safeHandle('update-tax-group', (event, id, companyId, updates) => TaxGroupService_1.TaxGroupService.updateTaxGroup(id, companyId || '1', updates));
    safeHandle('delete-tax-group', (event, id, companyId) => TaxGroupService_1.TaxGroupService.deleteTaxGroup(id, companyId || '1'));
    // --- Warehouse Handlers ---
    safeHandle('get-warehouses', (event, companyId) => WarehouseService_1.WarehouseService.getWarehouses(companyId || '1'));
    safeHandle('get-warehouse', (event, id, companyId) => WarehouseService_1.WarehouseService.getWarehouse(id, companyId || '1'));
    safeHandle('create-warehouse', (event, data) => WarehouseService_1.WarehouseService.createWarehouse({ ...data, companyId: data.companyId || '1' }));
    safeHandle('update-warehouse', (event, id, companyId, updates) => WarehouseService_1.WarehouseService.updateWarehouse(id, companyId || '1', updates));
    safeHandle('delete-warehouse', (event, id, companyId) => WarehouseService_1.WarehouseService.deleteWarehouse(id, companyId || '1'));
    safeHandle('get-bin-locations', (event, warehouseId) => WarehouseService_1.WarehouseService.getBinLocations(warehouseId));
    safeHandle('get-bin-location', (event, id) => WarehouseService_1.WarehouseService.getBinLocation(id));
    safeHandle('create-bin-location', (event, data) => WarehouseService_1.WarehouseService.createBinLocation(data));
    safeHandle('update-bin-location', (event, id, updates) => WarehouseService_1.WarehouseService.updateBinLocation(id, updates));
    safeHandle('delete-bin-location', (event, id) => WarehouseService_1.WarehouseService.deleteBinLocation(id));
    // --- Item Tracking Handlers (Batches & Serials) ---
    safeHandle('get-item-batches', (event, itemId) => ItemTrackingService_1.ItemTrackingService.getBatches(itemId));
    safeHandle('get-item-batch', (event, id) => ItemTrackingService_1.ItemTrackingService.getBatch(id));
    safeHandle('create-item-batch', (event, data) => ItemTrackingService_1.ItemTrackingService.createBatch(data));
    safeHandle('update-item-batch', (event, id, updates) => ItemTrackingService_1.ItemTrackingService.updateBatch(id, updates));
    safeHandle('delete-item-batch', (event, id) => ItemTrackingService_1.ItemTrackingService.deleteBatch(id));
    safeHandle('get-item-serials', (event, itemId) => ItemTrackingService_1.ItemTrackingService.getSerials(itemId));
    safeHandle('get-item-serial', (event, id) => ItemTrackingService_1.ItemTrackingService.getSerial(id));
    safeHandle('create-item-serial', (event, data) => ItemTrackingService_1.ItemTrackingService.createSerial(data));
    safeHandle('update-item-serial-status', (event, id, status) => ItemTrackingService_1.ItemTrackingService.updateSerialStatus(id, status));
    safeHandle('delete-item-serial', (event, id) => ItemTrackingService_1.ItemTrackingService.deleteSerial(id));
    // Manual Trigger for Scraper
    safeHandle('currency-scraper-trigger', async () => {
        const service = new CurrencyScraperService_1.CurrencyScraperService(); // Or use singleton if exported
        return await service.updateRates();
    });
    safeHandle('currency-get-history', (event, { code, days }) => CurrencyService_1.CurrencyService.getCurrencyHistory(code, days));
    // --- Branch Handlers ---
    safeHandle('get-branches', () => BranchService_1.BranchService.getBranches());
    safeHandle('save-branch', (event, branch) => branch.id ? BranchService_1.BranchService.updateBranch(branch) : BranchService_1.BranchService.createBranch(branch));
    safeHandle('delete-branch', (event, id) => BranchService_1.BranchService.deleteBranch(id));
    // --- Account Handlers ---
    safeHandle('get-accounts', () => AccountService_1.AccountService.getAccounts());
    safeHandle('get-account-tree', () => AccountService_1.AccountService.getAccountTree());
    safeHandle('save-account', (event, account) => {
        const before = account?.id
            ? db.prepare(`SELECT * FROM gl_chart_of_accounts WHERE id = ?`).get(account.id)
            : null;
        const result = account?.id
            ? AccountService_1.AccountService.updateAccount(account)
            : AccountService_1.AccountService.createAccount(account);
        const entityId = String(account?.id || result || '').trim();
        if (entityId) {
            const after = db.prepare(`SELECT * FROM gl_chart_of_accounts WHERE id = ?`).get(entityId);
            const ctx = (0, AuthContext_1.getContext)(event);
            const ipcid = String(event?.sender?.id || '');
            try {
                (0, AuditService_1.getGlobalAuditService)()?.recordEvent({
                    companyId: String(ctx?.companyId || 'COMP_01'),
                    branchId: String(ctx?.branchId || 'BR_01'),
                    userId: String(ctx?.userId || 'SYSTEM'),
                    sessionId: String(ctx?.sessionId || ipcid || ''),
                    correlationId: String(account?.correlationId ||
                        ctx?.correlationId ||
                        `acc_${Date.now()}_${Math.floor(Math.random() * 1000000)}`),
                    ipcid,
                }, {
                    entityType: 'gl_account',
                    entityId,
                    docType: 'chart_of_accounts',
                    docId: entityId,
                    eventType: account?.id ? 'definition.update' : 'definition.create',
                    summaryI18nKey: account?.id ? 'audit.event.definition.update' : 'audit.event.definition.create',
                    meta: {
                        action: account?.id ? 'update' : 'create',
                        module: 'chart_of_accounts',
                    },
                }, (0, AuditDiffService_1.diffPlainObjects)(before || {}, after || {}, {
                    basePath: 'account',
                    ignoreKeys: ['id', 'created_at', 'updated_at'],
                    maxChanges: 150,
                }));
            }
            catch (auditError) {
                console.warn('[AccountHandlers] audit record failed:', auditError);
            }
        }
        return result;
    });
    safeHandle('delete-account', (event, id) => AccountService_1.AccountService.deleteAccount(id));
    safeHandle('get-account-by-id', (event, id) => {
        const acc = db.prepare("SELECT * FROM gl_chart_of_accounts WHERE id = ?").get(id);
        return acc;
    });
    // --- Inventory (Items) ---
    safeHandle('get-items', () => ItemService_1.ItemService.getItems());
    // safeHandle('save-item', (event, item) => ItemService.saveItem(item)); // DUPLICATE REMOVED
    safeHandle('delete-item', (event, id) => ItemService_1.ItemService.deleteItem(id));
    safeHandle('get-units', () => ItemService_1.ItemService.getUnits());
    safeHandle('inventory:get-units', () => InventoryService_1.InventoryService.getUnits()); // Add this handler for frontend compatibility
    safeHandle('create-unit', (event, unit) => ItemService_1.ItemService.createUnit(unit));
    safeHandle('delete-unit', (event, id) => ItemService_1.ItemService.deleteUnit(id));
    safeHandle('get-categories', () => ItemService_1.ItemService.getCategories());
    safeHandle('create-category', (event, cat) => ItemService_1.ItemService.createCategory(cat));
    safeHandle('update-category', (event, cat) => ItemService_1.ItemService.updateCategory(cat));
    safeHandle('delete-category', (event, id) => ItemService_1.ItemService.deleteCategory(id));
    // --- Inventory V2 Handlers ---
    // Moved to top of file to avoid duplicate registration errors.
    // Inventory Attributes
    safeHandle('inventory:getAttributes', () => ItemService_1.ItemService.getAttributesDefinitions());
    safeHandle('inventory:saveAttribute', (event, data) => ItemService_1.ItemService.saveAttributeDefinition(data));
    safeHandle('inventory:saveAttributeValue', (event, data) => ItemService_1.ItemService.saveAttributeValue(data));
    safeHandle('inventory:deleteAttribute', (event, id) => ItemService_1.ItemService.deleteAttributeDefinition(id));
    safeHandle('inventory:deleteAttributeValue', (event, id) => ItemService_1.ItemService.deleteAttributeValue(id));
    // --- Partners (Customers/Suppliers) ---
    safeHandle('get-partners', (event, type) => PartnerService_1.PartnerService.getPartners(type));
    safeHandle('get-partner', (event, id) => PartnerService_1.PartnerService.getPartner(id));
    safeHandle('save-partner', (event, partner) => PartnerService_1.PartnerService.savePartner(partner));
    safeHandle('delete-partner', (event, id) => PartnerService_1.PartnerService.deletePartner(id));
    // Price Lists
    safeHandle('partner:getPriceLists', () => PartnerService_1.PartnerService.getPriceLists());
    safeHandle('partner:savePriceList', (event, data) => PartnerService_1.PartnerService.savePriceList(data));
    safeHandle('partner:deletePriceList', (event, id) => PartnerService_1.PartnerService.deletePriceList(id));
    safeHandle('partner:getPriceListItems', (event, listId) => PartnerService_1.PartnerService.getPriceListItems(listId));
    safeHandle('partner:savePriceListItem', (event, data) => PartnerService_1.PartnerService.savePriceListItem(data));
    safeHandle('partner:deletePriceListItem', (event, id) => PartnerService_1.PartnerService.deletePriceListItem(id));
    // --- Financial Definitions ---
    safeHandle('finance:getTaxes', () => FinancialDefinitionService_1.FinancialDefinitionService.getTaxes());
    safeHandle('finance:saveTax', (event, data) => FinancialDefinitionService_1.FinancialDefinitionService.saveTax(data));
    safeHandle('finance:deleteTax', (event, id) => FinancialDefinitionService_1.FinancialDefinitionService.deleteTax(id));
    safeHandle('finance:getAnalysisCodes', () => FinancialDefinitionService_1.FinancialDefinitionService.getAnalysisCodes());
    safeHandle('finance:getAnalysisCodesFlat', () => FinancialDefinitionService_1.FinancialDefinitionService.getAnalysisCodesFlat());
    safeHandle('finance:saveAnalysisCode', (event, data) => FinancialDefinitionService_1.FinancialDefinitionService.saveAnalysisCode(data));
    safeHandle('finance:deleteAnalysisCode', (event, id) => FinancialDefinitionService_1.FinancialDefinitionService.deleteAnalysisCode(id));
    // --- Financial Core (Journals) ---
    safeHandle('get-next-voucher-no', (event, prefix) => JournalService_1.JournalService.getNextVoucherNo(prefix));
    safeHandle('create-journal-entry', (event, { header, lines }) => JournalService_1.JournalService.createJournalEntry(header, lines));
    safeHandle('get-journal-entry', (event, id) => JournalService_1.JournalService.getJournalEntry(id));
    safeHandle('get-journal-entries', (event, filters) => JournalService_1.JournalService.getJournalEntries(filters));
    // 9. Reports (Legacy - Removed, handled above)
    // safeHandle('get-trial-balance', (event, params) => ReportsService.getTrialBalance(params));
    // 10. Manufacturing
    // Work Centers
    safeHandle('mfg-get-work-centers', () => ManufacturingService_1.ManufacturingService.getWorkCenters());
    safeHandle('mfg-save-work-center', (event, data) => ManufacturingService_1.ManufacturingService.saveWorkCenter(data));
    safeHandle('mfg-delete-work-center', (event, id) => ManufacturingService_1.ManufacturingService.deleteWorkCenter(id));
    // Machines
    safeHandle('mfg-get-machines', () => ManufacturingService_1.ManufacturingService.getMachines());
    safeHandle('mfg-save-machine', (event, data) => ManufacturingService_1.ManufacturingService.saveMachine(data));
    safeHandle('mfg-delete-machine', (event, id) => ManufacturingService_1.ManufacturingService.deleteMachine(id));
    // BOM & Routing
    safeHandle('mfg-create-bom', (event, header, lines) => ManufacturingService_1.ManufacturingService.createBOM(header, lines));
    safeHandle('mfg-get-boms', () => ManufacturingService_1.ManufacturingService.getBOMs());
    safeHandle('mfg-get-bom', (event, id) => ManufacturingService_1.ManufacturingService.getBOM(id));
    safeHandle('mfg-save-routing', (event, header, ops) => ManufacturingService_1.ManufacturingService.saveRouting(header, ops));
    safeHandle('mfg-get-routings', (event, bomId) => ManufacturingService_1.ManufacturingService.getRoutings(bomId));
    // Orders
    safeHandle('mfg-create-order', (event, order) => ManufacturingService_1.ManufacturingService.createProductionOrder(order));
    safeHandle('mfg-get-orders', () => ManufacturingService_1.ManufacturingService.getProductionOrders());
    safeHandle('mfg-update-order-status', (event, { id, status }) => ManufacturingService_1.ManufacturingService.updateOrderStatus(id, status));
    safeHandle('mfg-execute-order', (event, id, qty, date) => ManufacturingService_1.ManufacturingService.executeProductionOrder(id, qty, date));
    // Job Cards
    safeHandle('mfg-get-job-cards', (event, filters) => ManufacturingService_1.ManufacturingService.getJobCards(filters));
    safeHandle('mfg-start-job', (event, data) => ManufacturingService_1.ManufacturingService.createJobCard(data));
    safeHandle('mfg-stop-job', (event, { id, data }) => ManufacturingService_1.ManufacturingService.stopJobCard(id, data));
    // QC
    safeHandle('mfg-get-qc-tests', () => ManufacturingService_1.ManufacturingService.getQCTests());
    safeHandle('mfg-save-qc-test', (event, data) => ManufacturingService_1.ManufacturingService.saveQCTest(data));
    safeHandle('mfg-get-inspections', (event, filters) => ManufacturingService_1.ManufacturingService.getInspections(filters));
    safeHandle('mfg-save-inspection', (event, data) => ManufacturingService_1.ManufacturingService.saveInspection(data));
    // Maintenance
    safeHandle('mfg-get-maintenance-requests', (event, filters) => ManufacturingService_1.ManufacturingService.getMaintenanceRequests(filters));
    safeHandle('mfg-save-maintenance-request', (event, data) => ManufacturingService_1.ManufacturingService.saveMaintenanceRequest(data));
    // TEST WORKFLOW
    safeHandle('test:run-full-workflow', () => WorkflowTestService_1.WorkflowTestService.runFullWorkflow());
    safeHandle('mfg-get-wip-report', () => ManufacturingService_1.ManufacturingService.getWIPReport());
    // 11. Master Data Definitions (Financials)
    // Banks
    safeHandle('md-get-banks', () => MasterDataService_1.MasterDataService.getBanks());
    safeHandle('md-save-bank', (event, data) => MasterDataService_1.MasterDataService.saveBank(data));
    safeHandle('md-delete-bank', (event, id) => MasterDataService_1.MasterDataService.deleteBank(id));
    safeHandle('md-import-banks-html', async (event, filePath) => {
        return MasterDataService_1.MasterDataService.importBanksFromHTML(filePath);
    });
    // Note: dialog:open-file is already registered at line 788, so we don't need to re-register it if it works.
    // Let's check line 788 in the file content I saw earlier.
    // Line 788: safeHandle('dialog:open-file', async (event, options) => { ...
    // So I can just use 'dialog:open-file' from frontend.
    // Bank Accounts
    safeHandle('md-get-bank-accounts', () => MasterDataService_1.MasterDataService.getBankAccounts());
    safeHandle('md-save-bank-account', (event, data) => MasterDataService_1.MasterDataService.saveBankAccount(data));
    safeHandle('md-delete-bank-account', (event, id) => MasterDataService_1.MasterDataService.deleteBankAccount(id));
    // Cost Centers
    safeHandle('md-get-cost-centers', () => MasterDataService_1.MasterDataService.getCostCenters());
    safeHandle('md-save-cost-center', (event, data) => MasterDataService_1.MasterDataService.saveCostCenter(data));
    safeHandle('md-delete-cost-center', (event, id) => MasterDataService_1.MasterDataService.deleteCostCenter(id));
    // Payment Methods
    safeHandle('md-get-payment-methods', () => MasterDataService_1.MasterDataService.getPaymentMethods());
    safeHandle('md-save-payment-method', (event, data) => MasterDataService_1.MasterDataService.savePaymentMethod(data));
    // Branches
    safeHandle('md-get-branches', () => MasterDataService_1.MasterDataService.getBranches());
    safeHandle('md-save-branch', (event, data) => MasterDataService_1.MasterDataService.saveBranch(data));
    safeHandle('md-delete-branch', (event, id) => MasterDataService_1.MasterDataService.deleteBranch(id));
    // 11. Master Data Definitions (Financials)
    safeHandle('get-products', (event, search) => {
        if (!search)
            return db.prepare('SELECT * FROM products LIMIT 50').all();
        return db.prepare(`
    SELECT * FROM products 
    WHERE name LIKE @val OR barcode LIKE @val
  `).all({ val: `%${search}%` });
    });
    // --- Sales Handlers (New Service) ---
    // NOTE: All sales-* IPC handlers below are already registered in the early handlers block
    // (around lines 689-697). Duplicate registrations cause Electron to throw on startup.
    // Keeping these as comments for documentation only.
    // Quotations
    safeHandle('sales-create-quotation', (event, data) => SalesService_1.SalesService.createQuotation(data));
    safeHandle('sales-get-quotations', (event) => SalesService_1.SalesService.getQuotations());
    safeHandle('sales-get-quotation', (event, id) => SalesService_1.SalesService.getQuotation(id));
    // sales-get-invoice → already registered at line ~692
    safeHandle('sales-update-quotation-status', (event, { id, status }) => SalesService_1.SalesService.updateQuotationStatus(id, status));
    // Orders
    safeHandle('sales-create-order', (event, data) => SalesService_1.SalesService.createOrder(data));
    safeHandle('sales-get-orders', (event) => SalesService_1.SalesService.getOrders());
    safeHandle('sales-get-order', (event, id) => SalesService_1.SalesService.getOrder(id));
    safeHandle('sales-update-order-status', (event, { id, status }) => SalesService_1.SalesService.updateOrderStatus(id, status));
    // Returns
    safeHandle('sales-create-return', (event, data) => SalesService_1.SalesService.createReturn(data));
    safeHandle('sales-get-returns', (event) => SalesService_1.SalesService.getReturns());
    safeHandle('sales-get-return', (event, id) => SalesService_1.SalesService.getReturn(id));
    // Sales Lists & Deletes
    safeHandle('sales-get-invoices', (event) => SalesService_1.SalesService.getInvoices());
    safeHandle('sales-delete-quotation', (event, id) => SalesService_1.SalesService.deleteQuotation(id));
    safeHandle('sales-delete-order', (event, id) => SalesService_1.SalesService.deleteOrder(id));
    // Legacy Handler Removal (or keep alias if needed, but switching to new name 'sales-create-invoice' is cleaner)
    // Converting old calls to new service if signature matches, but for now we are building new UI.
    // safeHandle('save-invoice', ...); // Removed in favor of SalesService
    /*
    // Save Sales Invoice (Deprecated)
    safeHandle('save-invoice', (event, data) => {
      const { header, items, customerId, totalAmount } = data;
    
      // Validation
      if (!customerId || items.length === 0) throw new Error("بيانات الفاتورة ناقصة");
    
      const runInvoice = db.transaction(() => {
        // 1. Save Header
        const stmtHeader = db.prepare(`
        INSERT INTO transactions(type, ref_no, date, description)
        VALUES('INV', @ref_no, @date, @description)
      `);
        const info = stmtHeader.run(header);
        const invoiceId = info.lastInsertRowid;
    
        // 2. Financial Entry
        // Debit Customer
        db.prepare(`
        INSERT INTO transaction_lines(transaction_id, account_id, debit, credit, description)
        VALUES(?, ?, ?, 0, ?)
      `).run(invoiceId, customerId, totalAmount, 'فاتورة مبيعات رقم ' + header.ref_no);
    
        // Update Customer Balance
        db.prepare('UPDATE accounts SET balance = balance + ? WHERE id = ?')
          .run(totalAmount, customerId);
    
        // Credit Sales Account (Assume 4101 exists OR create fallback)
        let salesAccountId;
        const salesAccount = db.prepare("SELECT id FROM accounts WHERE code = '4101'").get();
    
        if (salesAccount) {
          salesAccountId = salesAccount.id;
        } else {
          // Fallback: Create Sales Account if not exists (for stability in this demo)
          const newSales = db.prepare("INSERT INTO accounts (code, name, type, balance) VALUES ('4101', 'Sales Revenue', 'Revenue', 0)").run();
          salesAccountId = newSales.lastInsertRowid;
        }
    */
    // --- Treasury & Cheques Handlers (New) ---
    safeHandle('treasury-create-receipt', (event, data) => TreasuryService_1.TreasuryService.createReceiptVoucher(data));
    safeHandle('treasury-create-payment', (event, data) => TreasuryService_1.TreasuryService.createPaymentVoucher(data));
    safeHandle('treasury-get-receipt', (event, id) => TreasuryService_1.TreasuryService.getReceipt(id)); // Existing mapping, now exposed.
    safeHandle('treasury-get-payment', (event, id) => TreasuryService_1.TreasuryService.getPaymentVoucher(id));
    safeHandle('treasury-get-payments', (event, filters) => TreasuryService_1.TreasuryService.getPaymentVouchers(filters));
    safeHandle('treasury-get-receipts', (event, filters) => TreasuryService_1.TreasuryService.getReceiptVouchers(filters));
    safeHandle('treasury-get-book-balance', (event, { accountId, date }) => TreasuryService_1.TreasuryService.getBookBalance(accountId, date));
    safeHandle('cheques-get', async (_, filters) => {
        return ChequeService_1.ChequeService.getCheques(filters);
    });
    safeHandle('cheques-update-status', async (_, data) => {
        return ChequeService_1.ChequeService.updateStatus(data.id, data.status, data.date, data.options);
    });
    // 10. Report Engine Handlers (New)
    // safeHandle('reports-get-partner-ledger', (event, filters) => ReportService.getPartnerLedger(filters)); // DUPLICATE REMOVED
    // safeHandle('reports-get-item-movement', (event, filters) => ReportService.getItemMovement(filters)); // DUPLICATE REMOVED
    safeHandle('reports-get-trial-balance', (event) => ReportService_1.ReportService.getTrialBalance());
    // safeHandle('reports-get-top-customers', () => ReportsService.getTopCustomers()); // Duplicate removed
    // 11. Budgeting Module
    safeHandle('budget-get-all', () => BudgetService_1.BudgetService.getAllBudgets());
    safeHandle('budget-get-by-id', (event, id) => BudgetService_1.BudgetService.getBudgetById(id));
    safeHandle('budget-create', (event, data) => BudgetService_1.BudgetService.createBudget(data));
    safeHandle('budget-update-status', (event, { id, status }) => BudgetService_1.BudgetService.updateBudgetStatus(id, status, 'Admin')); // TODO: userId
    safeHandle('budget-get-report', (event, { id, period }) => BudgetService_1.BudgetService.getBudgetVsActual(id, period));
    // 12. P&L Report Handler
    // safeHandle('get-report-pnl', (event, range) => ReportsService.getReportPnL(range)); // Duplicate removed
    // 13. Import Module Handlers (Managed via ImportService instance)
    // Save Purchase Invoice (Legacy removal)
    // 3. Invoice Items & Stock Update
    // --- Account Statement Handlers ---
    safeHandle('get-account-statement', (event, { accountId, fromDate, toDate }) => {
        // 1. Opening Balance
        const opening = db.prepare(`
  SELECT SUM(debit - credit) as balance 
  FROM transaction_lines 
  JOIN transactions ON transaction_lines.transaction_id = transactions.id
  WHERE account_id = ? AND date < ?
`).get(accountId, fromDate);
        const openingBalance = opening ? opening.balance : 0;
        // 2. Moves
        const moves = db.prepare(`
  SELECT 
    t.date, 
    t.type, 
    t.ref_no, 
    tl.description, 
    tl.debit, 
    tl.credit
  FROM transaction_lines tl
  JOIN transactions t ON tl.transaction_id = t.id
  WHERE tl.account_id = ? AND t.date BETWEEN ? AND ?
  ORDER BY t.date ASC, t.id ASC
`).all(accountId, fromDate, toDate);
        return { openingBalance, moves };
    });
    // --- Check Cycle Handlers (Refined) ---
    // --- Manufacturing Handlers ---
    // 1. Save BOM
    safeHandle('save-bom', (event, { finishedProductId, name, items }) => {
        const run = db.transaction(() => {
            const stmt = db.prepare('INSERT INTO boms (finished_product_id, name) VALUES (?, ?)');
            const info = stmt.run(finishedProductId, name);
            const bomId = info.lastInsertRowid;
            const stmtItem = db.prepare('INSERT INTO bom_items (bom_id, raw_product_id, quantity) VALUES (?, ?, ?)');
            for (const item of items) {
                stmtItem.run(bomId, item.rawProductId, item.quantity);
            }
        });
        run();
        return { success: true };
    });
    // 2. Get BOMs
    safeHandle('get-boms', () => {
        return db.prepare(`
  SELECT b.id, b.name, p.name as product_name 
  FROM boms b
  JOIN products p ON b.finished_product_id = p.id
`).all();
    });
    // 3. Execute Production (The Industrial Engine)
    safeHandle('execute-production', (event, { bomId, quantity, date, refNo }) => {
        const runProduction = db.transaction(() => {
            // A. Get BOM Details
            const bom = db.prepare('SELECT * FROM boms WHERE id = ?').get(bomId);
            const ingredients = db.prepare('SELECT * FROM bom_items WHERE bom_id = ?').all(bomId);
            let totalCost = 0;
            // B. Deduct Raw Materials & Calculate Cost
            for (const item of ingredients) {
                const requiredQty = item.quantity * quantity; // Total needed for this batch
                // Get current weighted average cost of raw material
                const rawProduct = db.prepare('SELECT cost_price FROM products WHERE id = ?').get(item.raw_product_id);
                const currentCost = rawProduct ? rawProduct.cost_price : 0;
                totalCost += (currentCost * requiredQty);
                // Deduct from Stock
                db.prepare('UPDATE products SET quantity = quantity - ? WHERE id = ?')
                    .run(requiredQty, item.raw_product_id);
            }
            // C. Add Finished Goods & Update Cost
            const costPerUnit = quantity > 0 ? totalCost / quantity : 0;
            // Update Finished Product Stock (Weighted Average Cost)
            // New Cost = ((OldCost * OldQty) + (NewCost * NewQty)) / (OldQty + NewQty)
            db.prepare(`
    UPDATE products 
    SET quantity = quantity + @qty,
        cost_price = ((cost_price * quantity) + (@qty * @cost)) / (quantity + @qty)
    WHERE id = @id
  `).run({ qty: quantity, cost: costPerUnit, id: bom.finished_product_id });
            // D. Log Production Order
            db.prepare(`
    INSERT INTO production_orders (ref_no, date, bom_id, quantity)
    VALUES (?, ?, ?, ?)
  `).run(refNo, date, bomId, quantity);
            // E. Accounting Entry (Inventory Transfer)
            // Dr Type: Finished Goods / Cr Type: Raw Materials
            // For now we skip specific Account IDs as we need a setup/mapping table, 
            // but logic is ready to be plugged in similar to update-check-status
        });
        try {
            runProduction();
            return { success: true };
        }
        catch (err) {
            console.error(err);
            throw new Error(err.message);
        }
    });
    // --- Dashboard Handlers ---
    // 1. Get KPIs (The Cockpit Data)
    // safeHandle('get-dashboard-kpis', async () => {
    //   return SystemService.getDashboardKPIs();
    // });
    // 2. Get Charts Data
    // safeHandle('get-dashboard-charts', async () => {
    //   return ReportService.getDashboardCharts(); 
    // });
    // --- Advanced Reports Handlers ---
    // 1. Profit & Loss (Income Statement) - MOVED TO SERVICE (See line 663)
    // 2. Balance Sheet
    safeHandle('get-report-balance-sheet', () => ReportService_1.ReportService.getBalanceSheet());
    // 3. Inventory Status
    // safeHandle('reports-get-inventory-status', () => ReportService.getInventoryStatus()); // DUPLICATE REMOVED
    // 4. Sales Reports
    // safeHandle('reports-get-sales-analytics', (event, range) => ReportService.getSalesAnalytics(range)); // DUPLICATE REMOVED
    // safeHandle('reports-get-profitability', (event, range) => ReportService.getProfitabilityReport(range)); // DUPLICATE REMOVED
    // 5. Purchasing Reports
    // safeHandle('reports-get-purchasing-analysis', (event, range) => ReportService.getPurchasingAnalysis(range)); // DUPLICATE REMOVED
    // safeHandle('reports-get-import-reports', () => ReportService.getImportReports()); // DUPLICATE REMOVED
    // 6. Cheque Reports
    // safeHandle('reports-get-cheques', (event, filters) => ReportService.getChequesReport(filters)); // DUPLICATE REMOVED
    // 7. General Financial Reports (Account Statement & Aging)
    // safeHandle('reports-get-account-statement', (event, filters) => ReportService.getAccountStatement(filters)); // DUPLICATE REMOVED
    // safeHandle('reports-get-aging', () => ReportService.getAgingReport()); // DUPLICATE REMOVED
    // safeHandle('reports-get-tax', (event, range) => ReportService.getTaxReport(range)); // DUPLICATE REMOVED
    // 3. Debt Aging Report (The Collection List) - REMOVING OLD PLACEHOLDER IF EXISTS or INTEGRATING
    // (Assuming 'get-report-aging' was the old one, but we are standardizing on 'reports-*')
    safeHandle('get-report-aging', () => {
        // Find all customers with negative balance (Debtors)
        // In our system, Debit is positive balance for assets. Wait. 
        // If Customer is Asset: Debit increases balance. So Positive Balance = Debt.
        const debtors = db.prepare("SELECT id, name, balance FROM accounts WHERE type = 'ASSET' AND name LIKE '%Customer%' AND balance > 0").all();
        // If we don't have types set up perfectly, we might need a better query.
        // Fallback: Get all accounts with positive balance that are NOT Banks/Cash.
        // For proper aging, we need to look at OPEN Invoices. 
        // Simplified Logic: We will take the total balance and try to match it against recent invoices to guess the "age".
        // Real "FIFO" allocation is complex. 
        // Hack: We'll fetch the last few invoices for each debtor to see when they bought stuff.
        const report = debtors.map(customer => {
            const invoices = db.prepare(`
    SELECT date, total 
    FROM transactions 
    WHERE description LIKE ? AND type = 'INV'
    ORDER BY date DESC
  `).all(`%${customer.name}%`); // Loose link by name if ID link missing
            // Allocate balance to buckets
            let remainingDebt = customer.balance;
            const buckets = { '0-30': 0, '31-60': 0, '61-90': 0, '90+': 0 };
            const today = new Date();
            // Iterate invoices (newest first) to match debt
            for (const inv of invoices) {
                if (remainingDebt <= 0)
                    break;
                const invDate = new Date(inv.date);
                const diffTime = Math.abs(today.getTime() - invDate.getTime());
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                const amount = Math.min(remainingDebt, inv.total);
                if (diffDays <= 30)
                    buckets['0-30'] += amount;
                else if (diffDays <= 60)
                    buckets['31-60'] += amount;
                else if (diffDays <= 90)
                    buckets['61-90'] += amount;
                else
                    buckets['90+'] += amount;
                remainingDebt -= amount;
            }
            // If there is still debt not matched to invoices (e.g. Opening Balance), put it in 90+
            if (remainingDebt > 0)
                buckets['90+'] += remainingDebt;
            return { ...customer, buckets };
        });
        return report;
    });
    // --- Licensing & Security Handlers ---
    // 1. Get Machine Fingerprint
    safeHandle('get-machine-id', async () => {
        return new Promise((resolve) => {
            // Windows command to get UUID
            require('child_process').exec('wmic csproduct get uuid', (err, stdout) => {
                if (err) {
                    resolve('UNKNOWN-ID');
                }
                else {
                    // Parse output: "UUID \n E442... "
                    const lines = stdout.toString().split('\n');
                    const uuid = lines[1] ? lines[1].trim() : 'UNKNOWN-ID';
                    resolve(uuid);
                }
            });
        });
    });
    // 2. Validate License
    safeHandle('validate-license', () => {
        const license = db.prepare("SELECT value FROM settings WHERE key = 'license_key'").get();
        if (!license)
            return { status: 'unlicensed' };
        // In a real app, verify the hash. Here we just check if it exists.
        return { status: 'active', key: license.value };
    });
    // 3. Activate Product
    safeHandle('activate-product', (event, key) => {
        // Simple check: Key must start with "WAFI-"
        if (!key.startsWith("WAFI-"))
            throw new Error("مفتاح غير صالح");
        db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('license_key', ?)").run(key);
        return { success: true };
    });
    // --- Data Migration Handlers ---
    // 1. Bulk Import (The Bridge)
    safeHandle('import-data', (event, { type, data }) => {
        // data is an array of objects from Excel/CSV
        const runImport = db.transaction(() => {
            if (type === 'products') {
                const stmt = db.prepare(`
      INSERT OR IGNORE INTO products (barcode, name, cost_price, sell_price, quantity) 
      VALUES (@barcode, @name, @cost_price, @sell_price, @quantity)
    `);
                for (const row of data) {
                    if (row.name)
                        stmt.run({
                            barcode: row.barcode || `GEN-${Date.now()}-${Math.random()}`,
                            name: row.name,
                            cost_price: row.cost || 0,
                            sell_price: row.price || 0,
                            quantity: row.quantity || 0
                        });
                }
            }
            else if (type === 'customers') {
                const stmt = db.prepare(`
      INSERT OR IGNORE INTO accounts (code, name, type, balance) 
      VALUES (@code, @name, 'ASSET', @balance)
    `);
                for (const row of data) {
                    if (row.name)
                        stmt.run({
                            code: row.code || `CUST-${Date.now()}-${Math.random()}`,
                            name: row.name,
                            balance: row.balance || 0
                        });
                }
            }
        });
        try {
            runImport();
            return { success: true, count: data.length };
        }
        catch (err) {
            throw new Error("فشل الاستيراد: " + err.message);
        }
    });
    // ============================================
    // GRN (Goods Receipt Note) Handlers
    // ============================================
    safeHandle('grn:save', (_, data) => {
        try {
            return GRNService_1.GRNService.save(data);
        }
        catch (e) {
            console.error('[GRN:save]', e);
            throw e;
        }
    });
    safeHandle('grn:post-to-pending', (_, id) => {
        try {
            return GRNService_1.GRNService.postToPending(id);
        }
        catch (e) {
            console.error('[GRN:postToPending]', e);
            throw e;
        }
    });
    safeHandle('grn:invoice', (_, id) => {
        try {
            return GRNService_1.GRNService.invoiceFromGRN(id);
        }
        catch (e) {
            console.error('[GRN:invoice]', e);
            throw e;
        }
    });
    safeHandle('grn:get', (_, id) => {
        try {
            return GRNService_1.GRNService.get(id);
        }
        catch (e) {
            console.error('[GRN:get]', e);
            throw e;
        }
    });
    safeHandle('grn:list', () => {
        try {
            return GRNService_1.GRNService.list();
        }
        catch (e) {
            console.error('[GRN:list]', e);
            throw e;
        }
    });
    WorkflowService_1.WorkflowService.register();
    SalesInvoiceService_1.SalesInvoiceService.register();
    PurchaseInvoiceService_1.PurchaseInvoiceService.register();
    StockTransferService_1.StockTransferService.register();
    JournalVoucherService_1.JournalVoucherService.register();
    // ----- Procurement Generic Document Services -----
    const PurchaseRequestService = DocumentServiceFactory_1.DocumentServiceFactory.createService({
        docType: 'purchase_request',
        tableName: 'purchase_requests',
        lineTableName: 'purchase_request_lines',
        foreignKey: 'request_id',
        headerPrefix: 'PRQ',
        partnerField: 'requester_id',
        hasTotals: false
    });
    PurchaseRequestService.register('purchaseRequests');
    const PurchaseQuotationService = DocumentServiceFactory_1.DocumentServiceFactory.createService({
        docType: 'purchase_rfq',
        tableName: 'purchase_rfqs',
        lineTableName: 'purchase_rfq_lines',
        foreignKey: 'rfq_id',
        headerPrefix: 'RFQ',
        partnerField: 'supplier_id',
        hasTotals: false // Usually just QTY & expected terms mapping
    });
    PurchaseQuotationService.register('purchaseQuotations');
    const PurchaseOrderService = DocumentServiceFactory_1.DocumentServiceFactory.createService({
        docType: 'purchase_order',
        tableName: 'purchase_orders',
        lineTableName: 'purchase_order_lines',
        foreignKey: 'order_id',
        headerPrefix: 'PO',
        partnerField: 'supplier_id',
        hasTotals: true
    });
    PurchaseOrderService.register('purchaseOrders');
    // ----- Sales Generic Document Services -----
    const SalesQuotationService = DocumentServiceFactory_1.DocumentServiceFactory.createService({
        docType: 'sales_quotation',
        tableName: 'sales_quotations',
        lineTableName: 'sales_quotation_lines',
        foreignKey: 'quotation_id',
        headerPrefix: 'SQ',
        partnerField: 'customer_id',
        hasTotals: true
    });
    SalesQuotationService.register('salesQuotations');
    const SalesOrderService = DocumentServiceFactory_1.DocumentServiceFactory.createService({
        docType: 'sales_order',
        tableName: 'sales_orders',
        lineTableName: 'sales_order_lines',
        foreignKey: 'order_id',
        headerPrefix: 'SO',
        partnerField: 'customer_id',
        hasTotals: true
    });
    SalesOrderService.register('salesOrders');
}; // End of registerIPCHandlers
const createWindow = () => {
    // Calculate Inverse Scaling to neutralize Windows Scale
    // If Windows is 125% (1.25), we zoom to 80% (0.8) so 1.25 * 0.8 = 1.0 visual scale
    const primaryDisplay = electron_1.screen.getPrimaryDisplay();
    const scaleFactor = primaryDisplay.scaleFactor;
    const inverseZoom = 1.0 / scaleFactor;
    console.log('Display Scale Factor:', scaleFactor);
    console.log('Applying Inverse Zoom:', inverseZoom);
    const mainWindow = new electron_1.BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path_1.default.join(__dirname, 'preload.js'),
            zoomFactor: inverseZoom, // Apply inverse zoom
            enableWebSQL: false,
            backgroundThrottling: false, // Prevent input lag when window loses focus
            offscreen: false, // Ensure proper rendering
        },
        autoHideMenuBar: true, // Hide native menu bar for cleaner look
        backgroundColor: '#0f172a', // Dark background to prevent white flash
        show: false, // Don't show until ready
        title: 'WAFI ERP', // Enforce App Name
        focusable: true, // Ensure window can receive focus
    });
    const webContentsId = mainWindow.webContents.id;
    const heartbeatTimer = setInterval(() => {
        concurrentLicenseService?.heartbeat(webContentsId);
    }, 60000);
    // Enforce the inverse zoom
    mainWindow.webContents.setZoomFactor(inverseZoom);
    // Enable visual zoom still (Ctrl+/Ctrl-) but starting from our calculated base
    mainWindow.webContents.on('did-finish-load', () => {
        // Allow zooming but keep our base
        mainWindow.webContents.setVisualZoomLevelLimits(1, 3);
        // Ensure focus after page load
        setTimeout(() => {
            mainWindow.webContents.focus();
        }, 100);
    });
    // Show window when ready to prevent flickering
    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
    });
    // Fix for input focus issues
    // Prevent background throttling which can cause input lag
    mainWindow.webContents.setBackgroundThrottling(false);
    // Auto-focus fix: When window regains focus, ensure webContents is focused
    mainWindow.on('focus', () => {
        mainWindow.webContents.focus();
    });
    // Additional fix: Re-focus on blur events to prevent stuck focus
    mainWindow.on('blur', () => {
        // Small delay to allow OS to handle the blur
        setTimeout(() => {
            if (mainWindow && !mainWindow.isDestroyed() && mainWindow.isFocused()) {
                mainWindow.webContents.focus();
            }
        }, 100);
    });
    // Fix for when user clicks on window but inputs don't respond
    mainWindow.webContents.on('before-input-event', (event, input) => {
        // If user clicks anywhere, ensure webContents has focus
        if (input.type === 'mouseDown') {
            if (!mainWindow.webContents.isFocused()) {
                mainWindow.webContents.focus();
            }
        }
    });
    // Load the app
    mainWindow.loadURL('http://localhost:4600');
    mainWindow.on('closed', () => {
        clearInterval(heartbeatTimer);
        concurrentLicenseService?.releaseSession(webContentsId);
        (0, AuthContext_1.clearAuthSessionByWebContentsId)(webContentsId);
    });
};
electron_1.app.on('ready', () => {
    // Initialize DB schema
    const dbPath = path_1.default.join(electron_1.app.getPath('userData'), 'wafi.db');
    console.log('Initializing Database at:', dbPath);
    const dbInstance = (0, database_1.initDB)(dbPath);
    console.log('Database instance created:', !!dbInstance);
    db = dbInstance;
    // [CRITICAL FIX] Clean up rogue triggers that prevent database operations
    try {
        const query = "SELECT name FROM sqlite_master WHERE type = 'trigger' AND (sql LIKE '%business_partners_backup_fix_fk%' OR sql LIKE '%backup_fix_fk%' OR sql LIKE '%gl_journal_headers%')";
        const rogueTriggers = db.prepare(query).all();
        if (rogueTriggers.length > 0) {
            console.log(`[Startup Fix] Found ${rogueTriggers.length} rogue triggers. Cleaning up...`);
            rogueTriggers.forEach((t) => {
                try {
                    db.prepare(`DROP TRIGGER IF EXISTS "${t.name}"`).run();
                    console.log(`[Startup Fix] Dropped rogue trigger: ${t.name}`);
                }
                catch (e) {
                    console.error(`[Startup Fix] Failed to drop trigger ${t.name}`, e);
                }
            });
        }
        // Also drop any backup tables left behind
        const rogueTables = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND (name LIKE '%backup_fix%' OR name LIKE '%business_partners_old%')").all();
        rogueTables.forEach((t) => {
            try {
                db.prepare(`DROP TABLE IF EXISTS "${t.name}"`).run();
                console.log(`[Startup Fix] Dropped rogue table: ${t.name}`);
            }
            catch (e) {
                console.error(`[Startup Fix] Failed to drop table ${t.name}`, e);
            }
        });
    }
    catch (err) {
        console.error("[Startup Fix] Trigger cleanup failed:", err);
    }
    // Initialize Services that depend on DB
    new CurrencyScraperService_1.CurrencyScraperService();
    importService = new ImportService_1.ImportService(db);
    (0, database_1.seedSystem)();
    // --- Security Capability Engine (registry + scoped snapshot) ---
    const capabilityRegistry = new CapabilityRegistry_1.CapabilityRegistry();
    const permissionEngineRepo = new SqlitePermissionEngineRepo_1.SqlitePermissionEngineRepo(db);
    permissionEngineRepo.seedCatalog(capabilityRegistry.getCatalog(), capabilityRegistry.getVersion());
    permissionEngineRepo.seedCapabilityRegistry(capabilityRegistry.getCapabilityRegistryRows());
    permissionSnapshotService = new PermissionSnapshotService_1.PermissionSnapshotService(permissionEngineRepo);
    (0, AuthContext_1.configureAuthContext)({
        database: db,
        permissionSnapshotService,
    });
    // --- Global Audit Engine (field-level + IPC guard audit) ---
    const auditRepo = new SqliteAuditRepo_1.SqliteAuditRepo(db);
    auditService = new AuditService_1.AuditService(auditRepo);
    (0, AuditService_1.configureGlobalAuditService)(auditService);
    (0, audit_ipc_1.registerAuditIPC)(auditService);
    (0, security_ipc_1.registerSecurityIPC)(permissionSnapshotService);
    // --- Dynamic Filters + Saved Views (screen registry + whitelisted query builder) ---
    const screenRegistry = new ScreenRegistry_1.ScreenRegistry();
    const screenViewsRepo = new SqliteScreenViewsRepo_1.SqliteScreenViewsRepo(db);
    const screenQueryBuilder = new ScreenQueryBuilder_1.ScreenQueryBuilder();
    const screenViewsService = new ScreenViewsService_1.ScreenViewsService(screenViewsRepo, screenRegistry, screenQueryBuilder, auditService);
    (0, screenViews_ipc_1.registerScreenViewsIPC)(screenViewsService);
    // --- Fixed Assets (domain-driven IPC) ---
    const fixedAssetRepo = new SqliteFixedAssetRepo_1.SqliteFixedAssetRepo(db);
    const fixedAssetUseCases = new FixedAssetUseCases_1.FixedAssetUseCases(fixedAssetRepo);
    (0, fixedAssets_ipc_1.registerFixedAssetIPC)(fixedAssetUseCases);
    // --- Finance (domain-driven IPC) ---
    const currencyRepo = new SqliteCurrencyRepo_1.SqliteCurrencyRepo(db);
    const costCenterRepo = new SqliteCostCenterRepo_1.SqliteCostCenterRepo(db);
    const taxGroupRepo = new SqliteTaxGroupRepo_1.SqliteTaxGroupRepo(db);
    const financeUseCases = new FinanceUseCases_1.FinanceUseCases(currencyRepo, costCenterRepo, taxGroupRepo);
    (0, finance_ipc_1.registerFinanceIPC)(financeUseCases);
    // --- Expense Dimensions (expense types + cost centers + vehicles + reports) ---
    const expenseDimensionsRepo = new SqliteExpenseDimensionsRepo_1.SqliteExpenseDimensionsRepo(db);
    const expenseDimensionsUseCases = new ExpenseDimensionsUseCases_1.ExpenseDimensionsUseCases(expenseDimensionsRepo);
    (0, expenseDimensions_ipc_1.registerExpenseDimensionsIPC)(expenseDimensionsUseCases);
    // --- Accounting Foundation (CoA + Financial Definitions + Account Resolution) ---
    const accountingFoundationRepo = new SqliteAccountingFoundationRepo_1.SqliteAccountingFoundationRepo(db);
    const accountingFoundationUseCases = new AccountingFoundationUseCases_1.AccountingFoundationUseCases(accountingFoundationRepo, accountingFoundationRepo);
    (0, accountingFoundation_ipc_1.registerAccountingFoundationIPC)(accountingFoundationUseCases);
    // --- Fixed-Width Chart of Accounts Foundation ---
    const chartOfAccountsRepo = new SqliteChartOfAccountsRepo_1.SqliteChartOfAccountsRepo(db);
    const chartOfAccountsSeedService = new ChartOfAccountsSeedService_1.ChartOfAccountsSeedService(chartOfAccountsRepo);
    const chartOfAccountsUseCases = new ChartOfAccountsUseCases_1.ChartOfAccountsUseCases(chartOfAccountsRepo, chartOfAccountsSeedService);
    (0, chartOfAccounts_ipc_1.registerChartOfAccountsIPC)(chartOfAccountsUseCases);
    // --- Financial Definitions + Account Resolution Engine ---
    const accountingResolutionRepo = new SqliteAccountingResolutionRepo_1.SqliteAccountingResolutionRepo(db);
    const accountingResolutionUseCases = new AccountingResolutionUseCases_1.AccountingResolutionUseCases(accountingResolutionRepo);
    SalesService_1.SalesService.configureAccountResolutionUseCases(accountingResolutionUseCases);
    (0, accountingResolution_ipc_1.registerAccountingResolutionIPC)(accountingResolutionUseCases);
    // --- Central Journal Engine (posting + reversal + source query) ---
    const journalHeaderRepo = new SqliteJournalHeaderRepo_1.SqliteJournalHeaderRepo(db);
    const journalLineRepo = new SqliteJournalLineRepo_1.SqliteJournalLineRepo(db);
    const postingRegistryRepo = new SqlitePostingRegistryRepo_1.SqlitePostingRegistryRepo(db);
    const journalFiscalPeriodRepo = new SqliteJournalFiscalPeriodRepo_1.SqliteJournalFiscalPeriodRepo(db);
    const journalAccountLookupRepo = new SqliteJournalAccountLookupRepo_1.SqliteJournalAccountLookupRepo(db);
    const journalEngineService = new JournalEngineService_1.JournalEngineService({
        database: db,
        journalsRepo: journalHeaderRepo,
        journalLinesRepo: journalLineRepo,
        postingRegistryRepo,
        fiscalPeriodRepo: journalFiscalPeriodRepo,
        accountLookupRepo: journalAccountLookupRepo,
    });
    const journalEngineUseCases = new JournalEngineUseCases_1.JournalEngineUseCases(journalEngineService);
    SalesInvoiceService_1.SalesInvoiceService.configurePostingPipeline({
        accountResolutionUseCases: accountingResolutionUseCases,
        journalEngineUseCases,
    });
    PurchaseInvoiceService_1.PurchaseInvoiceService.configurePostingPipeline({
        accountResolutionUseCases: accountingResolutionUseCases,
        journalEngineUseCases,
    });
    (0, accountingJournals_ipc_1.registerAccountingJournalsIPC)(journalEngineUseCases);
    // --- Sales Invoice Accounting Pipeline (Account Resolution -> Journal Engine) ---
    const salesInvoiceAccountingRepo = new SqliteSalesInvoiceAccountingRepo_1.SqliteSalesInvoiceAccountingRepo(db);
    const salesInvoicePostingBuilder = new SalesInvoicePostingBuilder_1.SalesInvoicePostingBuilder(accountingResolutionUseCases, salesInvoiceAccountingRepo);
    const salesInvoiceAccountingService = new SalesInvoiceAccountingService_1.SalesInvoiceAccountingService(salesInvoiceAccountingRepo, salesInvoicePostingBuilder, journalEngineUseCases);
    const salesInvoiceAccountingUseCases = new SalesInvoiceAccountingUseCases_1.SalesInvoiceAccountingUseCases(salesInvoiceAccountingService);
    (0, salesInvoiceAccounting_ipc_1.registerSalesInvoiceAccountingIPC)(salesInvoiceAccountingUseCases);
    // --- Purchase Invoice Accounting Pipeline (Account Resolution -> Journal Engine) ---
    const purchaseInvoiceAccountingRepo = new SqlitePurchaseInvoiceAccountingRepo_1.SqlitePurchaseInvoiceAccountingRepo(db);
    const purchaseInvoicePostingBuilder = new PurchaseInvoicePostingBuilder_1.PurchaseInvoicePostingBuilder(accountingResolutionUseCases, purchaseInvoiceAccountingRepo);
    const purchaseInvoiceAccountingService = new PurchaseInvoiceAccountingService_1.PurchaseInvoiceAccountingService(purchaseInvoiceAccountingRepo, purchaseInvoicePostingBuilder, journalEngineUseCases);
    const purchaseInvoiceAccountingUseCases = new PurchaseInvoiceAccountingUseCases_1.PurchaseInvoiceAccountingUseCases(purchaseInvoiceAccountingService);
    PurchaseInvoiceService_1.PurchaseInvoiceService.configureAccountingUseCases(purchaseInvoiceAccountingUseCases);
    (0, purchaseInvoiceAccounting_ipc_1.registerPurchaseInvoiceAccountingIPC)(purchaseInvoiceAccountingUseCases);
    // --- Inventory Documents Posting Pipeline (Inventory -> Account Resolution -> Journal Engine) ---
    const inventoryDocumentRepo = new SqliteInventoryDocumentRepo_1.SqliteInventoryDocumentRepo(db);
    const inventoryPostingBuilder = new InventoryPostingBuilder_1.InventoryPostingBuilder(accountingResolutionUseCases, inventoryDocumentRepo);
    const inventoryDocumentService = new InventoryDocumentService_1.InventoryDocumentService(inventoryDocumentRepo, inventoryPostingBuilder, journalEngineUseCases);
    const inventoryDocumentUseCases = new InventoryDocumentUseCases_1.InventoryDocumentUseCases(inventoryDocumentService);
    (0, inventoryDocument_ipc_1.registerInventoryDocumentIPC)(inventoryDocumentUseCases);
    // --- Treasury Documents + Cheque Lifecycle (Treasury -> Account Resolution -> Journal Engine) ---
    const treasuryRepo = new SqliteTreasuryRepo_1.SqliteTreasuryRepo(db);
    const treasuryPostingBuilder = new TreasuryPostingBuilder_1.TreasuryPostingBuilder(accountingResolutionUseCases, treasuryRepo);
    const treasuryChequeLifecycleService = new TreasuryChequeLifecycleService_1.TreasuryChequeLifecycleService(treasuryRepo, accountingResolutionUseCases, journalEngineUseCases);
    const treasuryDocumentService = new TreasuryDocumentService_1.TreasuryDocumentService(treasuryRepo, treasuryPostingBuilder, treasuryChequeLifecycleService, journalEngineUseCases);
    const treasuryDocumentUseCases = new TreasuryDocumentUseCases_1.TreasuryDocumentUseCases(treasuryDocumentService);
    const treasuryChequeUseCases = new TreasuryChequeUseCases_1.TreasuryChequeUseCases(treasuryChequeLifecycleService);
    (0, treasuryDocument_ipc_1.registerTreasuryDocumentIPC)(treasuryDocumentUseCases);
    (0, treasuryCheque_ipc_1.registerTreasuryChequeIPC)(treasuryChequeUseCases);
    // --- Sales Operations Foundation (Quotation -> Order -> Delivery -> Return) ---
    const salesOperationsRepo = new SqliteSalesOperationsRepo_1.SqliteSalesOperationsRepo(db);
    const salesStockLedgerService = new SalesStockLedgerService_1.SalesStockLedgerService(salesOperationsRepo);
    const salesOperationsAccountingBuilder = new SalesOperationsAccountingBuilder_1.SalesOperationsAccountingBuilder(accountingResolutionUseCases, salesOperationsRepo);
    const salesOperationsService = new SalesOperationsService_1.SalesOperationsService(salesOperationsRepo, salesStockLedgerService, salesOperationsAccountingBuilder, journalEngineUseCases);
    const salesOperationsUseCases = new SalesOperationsUseCases_1.SalesOperationsUseCases(salesOperationsService);
    (0, salesQuotation_ipc_1.registerSalesQuotationIPC)(salesOperationsUseCases);
    (0, salesOrder_ipc_1.registerSalesOrderIPC)(salesOperationsUseCases);
    (0, deliveryNote_ipc_1.registerDeliveryNoteIPC)(salesOperationsUseCases);
    (0, salesReturn_ipc_1.registerSalesReturnIPC)(salesOperationsUseCases);
    // --- Purchase Operations Foundation (Request -> RFQ -> Order -> GRN -> Return) ---
    const purchaseOperationsRepo = new SqlitePurchaseOperationsRepo_1.SqlitePurchaseOperationsRepo(db);
    const purchaseStockLedgerService = new PurchaseStockLedgerService_1.PurchaseStockLedgerService(purchaseOperationsRepo);
    const purchaseOperationsAccountingBuilder = new PurchaseOperationsAccountingBuilder_1.PurchaseOperationsAccountingBuilder(accountingResolutionUseCases, purchaseOperationsRepo);
    const purchaseOperationsService = new PurchaseOperationsService_1.PurchaseOperationsService(purchaseOperationsRepo, purchaseStockLedgerService, purchaseOperationsAccountingBuilder, journalEngineUseCases);
    const purchaseOperationsUseCases = new PurchaseOperationsUseCases_1.PurchaseOperationsUseCases(purchaseOperationsService);
    (0, purchaseRequest_ipc_1.registerPurchaseRequestIPC)(purchaseOperationsUseCases);
    (0, purchaseRfq_ipc_1.registerPurchaseRfqIPC)(purchaseOperationsUseCases);
    (0, purchaseOrder_ipc_1.registerPurchaseOrderIPC)(purchaseOperationsUseCases);
    (0, goodsReceiptNote_ipc_1.registerGoodsReceiptNoteIPC)(purchaseOperationsUseCases);
    (0, purchaseReturn_ipc_1.registerPurchaseReturnIPC)(purchaseOperationsUseCases);
    // --- Manufacturing Foundation (BOM -> Routing -> Production Order -> Issue/Receipt) ---
    const manufacturingRepo = new SqliteManufacturingRepo_1.SqliteManufacturingRepo(db);
    const manufacturingStockLedgerService = new ManufacturingStockLedgerService_1.ManufacturingStockLedgerService(manufacturingRepo);
    const manufacturingAccountingBuilder = new ManufacturingAccountingBuilder_1.ManufacturingAccountingBuilder(accountingResolutionUseCases, manufacturingRepo);
    const manufacturingDomainService = new ManufacturingService_2.ManufacturingService(manufacturingRepo, manufacturingStockLedgerService, manufacturingAccountingBuilder, journalEngineUseCases);
    const manufacturingUseCases = new ManufacturingUseCases_1.ManufacturingUseCases(manufacturingDomainService);
    (0, manufacturing_ipc_1.registerManufacturingIPC)(manufacturingUseCases);
    // --- CRM + Receivables Foundation (Customer Master -> Credit Control -> Statement/Aging/Timeline) ---
    const customerReceivablesRepo = new SqliteCustomerReceivablesRepo_1.SqliteCustomerReceivablesRepo(db);
    const customerReceivablesService = new CustomerReceivablesService_1.CustomerReceivablesService(customerReceivablesRepo);
    const customerReceivablesUseCases = new CustomerReceivablesUseCases_1.CustomerReceivablesUseCases(customerReceivablesService);
    (0, customerReceivables_ipc_1.registerCustomerReceivablesIPC)(customerReceivablesUseCases);
    // --- Vendor + Payables Foundation (Vendor Master -> Payment Control -> Statement/Aging/Timeline) ---
    const vendorPayablesRepo = new SqliteVendorPayablesRepo_1.SqliteVendorPayablesRepo(db);
    const vendorPayablesService = new VendorPayablesService_1.VendorPayablesService(vendorPayablesRepo);
    const vendorPayablesUseCases = new VendorPayablesUseCases_1.VendorPayablesUseCases(vendorPayablesService);
    (0, vendorPayables_ipc_1.registerVendorPayablesIPC)(vendorPayablesUseCases);
    // --- Financial Platform (Accounting/Treasury/Risk/Revenue/Carbon/Analytics) ---
    const financialPlatformRepo = new SqliteFinancialPlatformRepo_1.SqliteFinancialPlatformRepo(db);
    const financialPlatformUseCases = new FinancialPlatformUseCases_1.FinancialPlatformUseCases(financialPlatformRepo);
    (0, financialPlatform_ipc_1.registerFinancialPlatformIPC)(financialPlatformUseCases);
    // --- Runtime Governance (Concurrent seats + Attachments quota/chunking) ---
    const runtimeGovernanceRepo = new SqliteRuntimeGovernanceRepo_1.SqliteRuntimeGovernanceRepo(db);
    concurrentLicenseService = new ConcurrentLicenseService_1.ConcurrentLicenseService(runtimeGovernanceRepo);
    attachmentStorageService = new AttachmentStorageService_1.AttachmentStorageService(runtimeGovernanceRepo);
    (0, runtimeGovernance_ipc_1.registerRuntimeGovernanceIPC)({
        concurrentLicenseService,
        attachmentStorageService,
    });
    // Register IPC handlers
    registerIPCHandlers(db);
    // Note: wafi:// protocol handler is registered in app.whenReady() above
    createWindow();
});
electron_1.app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        electron_1.app.quit();
    }
});
electron_1.app.on('before-quit', () => {
    for (const win of electron_1.BrowserWindow.getAllWindows()) {
        const wcId = win.webContents.id;
        concurrentLicenseService?.releaseSession(wcId);
        (0, AuthContext_1.clearAuthSessionByWebContentsId)(wcId);
    }
});
electron_1.app.on('activate', () => {
    if (electron_1.BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});
