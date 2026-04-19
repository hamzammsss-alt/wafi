import { app, BrowserWindow, ipcMain, screen, dialog, protocol, net } from 'electron';
import { pathToFileURL } from 'url';
import path from 'path';
import fs from 'fs';
import nodemailer from 'nodemailer';

import { initDB, seedCOA, seedSystem } from './database';

// Disable security warnings in dev
process.env['ELECTRON_DISABLE_SECURITY_WARNINGS'] = 'true';

[process.stdout, process.stderr].forEach((stream) => {
  stream?.on?.('error', (error: any) => {
    if (error?.code === 'EPIPE') {
      return;
    }
  });
});

import { InventoryService } from './services/InventoryService';
import { LogisticsService } from './services/LogisticsService';
import { SalesService } from './services/SalesService';
import { CheckService } from './services/CheckService';
import { HRService } from './services/HRService';
import { AssetService } from './services/AssetService';
import { AuthService } from './services/AuthService';
import { SystemService } from './services/SystemService';
// import { ReportsService } from './services/ReportsService';
import { ReportService } from './services/ReportService';
import { ManufacturingService } from './services/ManufacturingService'; // The new one for SQL Views
import { MasterDataService } from './services/MasterDataService';
import { CurrencyService } from './services/CurrencyService';
import { CostCenterService } from './services/CostCenterService';
import { TaxGroupService } from './services/TaxGroupService';
import { WarehouseService } from './services/WarehouseService';
import { ItemTrackingService } from './services/ItemTrackingService';
import { BranchService } from './services/BranchService';
import { AccountService } from './services/AccountService';
import { ItemService } from './services/ItemService';
import { PartnerService } from './services/PartnerService';
import { FinancialDefinitionService } from './services/FinancialDefinitionService';
// JournalService imported only once
import { JournalService } from './services/JournalService';
import { AccountingEngineService } from './services/AccountingEngineService';
import { PurchaseService } from './services/PurchaseService';
import { ExportService } from './services/ExportService';
import { TreasuryService } from './services/TreasuryService';
import { ChequeService } from './services/ChequeService';
import { ProductionService } from './services/ProductionService';
import { CommissionService } from './services/CommissionService';
import { BudgetService } from './services/BudgetService';
import { ImportService } from './services/ImportService';
import { CurrencyScraperService } from './services/CurrencyScraperService';
import { AttendanceService } from './services/AttendanceService';
import { PayrollService } from './services/PayrollService';
import { LeaveService } from './services/LeaveService';
import { WorkflowTestService } from './services/WorkflowTestService';
import { DispatchService } from './services/DispatchService';
import { GRNService } from './services/GRNService';
import { WorkflowService } from './services/WorkflowService';
import { SalesInvoiceService } from './services/SalesInvoiceService';
import { PurchaseInvoiceService } from './services/PurchaseInvoiceService';
import { StockTransferService } from './services/StockTransferService';
import { JournalVoucherService } from './services/JournalVoucherService';
import { DocumentServiceFactory } from './services/DocumentServiceFactory';
import { registerFixedAssetIPC } from '../src/main/ipc/fixedAssets.ipc';
import { SqliteFixedAssetRepo } from '../src/main/infrastructure/adapters/SqliteFixedAssetRepo';
import { FixedAssetUseCases } from '../src/main/application/useCases/FixedAssetUseCases';
import { registerManufacturingIPC } from '../src/main/ipc/manufacturing.ipc';
import { SqliteManufacturingRepo } from '../src/main/infrastructure/adapters/SqliteManufacturingRepo';
import { ManufacturingUseCases } from '../src/main/application/useCases/ManufacturingUseCases';
import { ManufacturingStockLedgerService } from '../src/main/application/services/ManufacturingStockLedgerService';
import { ManufacturingAccountingBuilder } from '../src/main/application/services/ManufacturingAccountingBuilder';
import { ManufacturingService as ManufacturingDomainService } from '../src/main/application/services/ManufacturingService';
import { registerCustomerReceivablesIPC } from '../src/main/ipc/customerReceivables.ipc';
import { SqliteCustomerReceivablesRepo } from '../src/main/infrastructure/adapters/SqliteCustomerReceivablesRepo';
import { CustomerReceivablesService } from '../src/main/application/services/CustomerReceivablesService';
import { CustomerReceivablesUseCases } from '../src/main/application/useCases/CustomerReceivablesUseCases';
import { registerVendorPayablesIPC } from '../src/main/ipc/vendorPayables.ipc';
import { SqliteVendorPayablesRepo } from '../src/main/infrastructure/adapters/SqliteVendorPayablesRepo';
import { VendorPayablesService } from '../src/main/application/services/VendorPayablesService';
import { VendorPayablesUseCases } from '../src/main/application/useCases/VendorPayablesUseCases';
import { registerFinanceIPC } from '../src/main/ipc/finance.ipc';
import { SqliteCurrencyRepo } from '../src/main/infrastructure/adapters/SqliteCurrencyRepo';
import { SqliteCostCenterRepo } from '../src/main/infrastructure/adapters/SqliteCostCenterRepo';
import { SqliteTaxGroupRepo } from '../src/main/infrastructure/adapters/SqliteTaxGroupRepo';
import { FinanceUseCases } from '../src/main/application/useCases/FinanceUseCases';
import { SqliteExpenseDimensionsRepo } from '../src/main/infrastructure/adapters/SqliteExpenseDimensionsRepo';
import { ExpenseDimensionsUseCases } from '../src/main/application/useCases/ExpenseDimensionsUseCases';
import { registerExpenseDimensionsIPC } from '../src/main/ipc/expenseDimensions.ipc';
import { SqliteAccountingFoundationRepo } from '../src/main/infrastructure/adapters/SqliteAccountingFoundationRepo';
import { AccountingFoundationUseCases } from '../src/main/application/useCases/AccountingFoundationUseCases';
import { registerAccountingFoundationIPC } from '../src/main/ipc/accountingFoundation.ipc';
import { SqliteChartOfAccountsRepo } from '../src/main/infrastructure/adapters/SqliteChartOfAccountsRepo';
import { ChartOfAccountsSeedService } from '../src/main/infrastructure/services/ChartOfAccountsSeedService';
import { ChartOfAccountsUseCases } from '../src/main/application/useCases/ChartOfAccountsUseCases';
import { registerChartOfAccountsIPC } from '../src/main/ipc/chartOfAccounts.ipc';
import { SqliteAccountingResolutionRepo } from '../src/main/infrastructure/adapters/SqliteAccountingResolutionRepo';
import { AccountingResolutionUseCases } from '../src/main/application/useCases/AccountingResolutionUseCases';
import { registerAccountingResolutionIPC } from '../src/main/ipc/accountingResolution.ipc';
import { SqliteJournalHeaderRepo } from '../src/main/infrastructure/adapters/SqliteJournalHeaderRepo';
import { SqliteJournalLineRepo } from '../src/main/infrastructure/adapters/SqliteJournalLineRepo';
import { SqlitePostingRegistryRepo } from '../src/main/infrastructure/adapters/SqlitePostingRegistryRepo';
import { SqliteJournalFiscalPeriodRepo } from '../src/main/infrastructure/adapters/SqliteJournalFiscalPeriodRepo';
import { SqliteJournalAccountLookupRepo } from '../src/main/infrastructure/adapters/SqliteJournalAccountLookupRepo';
import { JournalEngineService } from '../src/main/application/services/JournalEngineService';
import { JournalEngineUseCases } from '../src/main/application/useCases/JournalEngineUseCases';
import { registerAccountingJournalsIPC } from '../src/main/ipc/accountingJournals.ipc';
import { SqliteSalesInvoiceAccountingRepo } from '../src/main/infrastructure/adapters/SqliteSalesInvoiceAccountingRepo';
import { SalesInvoicePostingBuilder } from '../src/main/application/services/SalesInvoicePostingBuilder';
import { SalesInvoiceAccountingService } from '../src/main/application/services/SalesInvoiceAccountingService';
import { SalesInvoiceAccountingUseCases } from '../src/main/application/useCases/SalesInvoiceAccountingUseCases';
import { registerSalesInvoiceAccountingIPC } from '../src/main/ipc/salesInvoiceAccounting.ipc';
import { SqlitePurchaseInvoiceAccountingRepo } from '../src/main/infrastructure/adapters/SqlitePurchaseInvoiceAccountingRepo';
import { PurchaseInvoicePostingBuilder } from '../src/main/application/services/PurchaseInvoicePostingBuilder';
import { PurchaseInvoiceAccountingService } from '../src/main/application/services/PurchaseInvoiceAccountingService';
import { PurchaseInvoiceAccountingUseCases } from '../src/main/application/useCases/PurchaseInvoiceAccountingUseCases';
import { registerPurchaseInvoiceAccountingIPC } from '../src/main/ipc/purchaseInvoiceAccounting.ipc';
import { SqliteInventoryDocumentRepo } from '../src/main/infrastructure/adapters/SqliteInventoryDocumentRepo';
import { InventoryPostingBuilder } from '../src/main/application/services/InventoryPostingBuilder';
import { InventoryDocumentService } from '../src/main/application/services/InventoryDocumentService';
import { InventoryDocumentUseCases } from '../src/main/application/useCases/InventoryDocumentUseCases';
import { registerInventoryDocumentIPC } from '../src/main/ipc/inventoryDocument.ipc';
import { SqliteTreasuryRepo } from '../src/main/infrastructure/adapters/SqliteTreasuryRepo';
import { TreasuryPostingBuilder } from '../src/main/application/services/TreasuryPostingBuilder';
import { TreasuryChequeLifecycleService } from '../src/main/application/services/TreasuryChequeLifecycleService';
import { TreasuryDocumentService } from '../src/main/application/services/TreasuryDocumentService';
import { TreasuryDocumentUseCases } from '../src/main/application/useCases/TreasuryDocumentUseCases';
import { TreasuryChequeUseCases } from '../src/main/application/useCases/TreasuryChequeUseCases';
import { registerTreasuryDocumentIPC } from '../src/main/ipc/treasuryDocument.ipc';
import { registerTreasuryChequeIPC } from '../src/main/ipc/treasuryCheque.ipc';
import { SqliteSalesOperationsRepo } from '../src/main/infrastructure/adapters/SqliteSalesOperationsRepo';
import { SalesOperationsAccountingBuilder } from '../src/main/application/services/SalesOperationsAccountingBuilder';
import { SalesStockLedgerService } from '../src/main/application/services/SalesStockLedgerService';
import { SalesOperationsService } from '../src/main/application/services/SalesOperationsService';
import { SalesOperationsUseCases } from '../src/main/application/useCases/SalesOperationsUseCases';
import { registerSalesQuotationIPC } from '../src/main/ipc/salesQuotation.ipc';
import { registerSalesOrderIPC } from '../src/main/ipc/salesOrder.ipc';
import { registerDeliveryNoteIPC } from '../src/main/ipc/deliveryNote.ipc';
import { registerSalesReturnIPC } from '../src/main/ipc/salesReturn.ipc';
import { SqlitePurchaseOperationsRepo } from '../src/main/infrastructure/adapters/SqlitePurchaseOperationsRepo';
import { PurchaseOperationsAccountingBuilder } from '../src/main/application/services/PurchaseOperationsAccountingBuilder';
import { PurchaseStockLedgerService } from '../src/main/application/services/PurchaseStockLedgerService';
import { PurchaseOperationsService } from '../src/main/application/services/PurchaseOperationsService';
import { PurchaseOperationsUseCases } from '../src/main/application/useCases/PurchaseOperationsUseCases';
import { registerPurchaseRequestIPC } from '../src/main/ipc/purchaseRequest.ipc';
import { registerPurchaseRfqIPC } from '../src/main/ipc/purchaseRfq.ipc';
import { registerPurchaseOrderIPC } from '../src/main/ipc/purchaseOrder.ipc';
import { registerGoodsReceiptNoteIPC } from '../src/main/ipc/goodsReceiptNote.ipc';
import { registerPurchaseReturnIPC } from '../src/main/ipc/purchaseReturn.ipc';
import { CapabilityRegistry } from '../src/main/application/services/CapabilityRegistry';
import { PermissionSnapshotService } from '../src/main/application/services/PermissionSnapshotService';
import { SqlitePermissionEngineRepo } from '../src/main/infrastructure/adapters/SqlitePermissionEngineRepo';
import { registerSecurityIPC } from '../src/main/ipc/security.ipc';
import { ScreenRegistry } from '../src/main/application/services/ScreenRegistry';
import { ScreenQueryBuilder } from '../src/main/application/services/ScreenQueryBuilder';
import { ScreenViewsService } from '../src/main/application/services/ScreenViewsService';
import { SqliteScreenViewsRepo } from '../src/main/infrastructure/adapters/SqliteScreenViewsRepo';
import { registerScreenViewsIPC } from '../src/main/ipc/screenViews.ipc';
import { registerPrintingIPC } from '../src/main/ipc/printing.ipc';
import { AuditService, configureGlobalAuditService, getGlobalAuditService } from '../src/main/application/services/AuditService';
import { SqliteAuditRepo } from '../src/main/infrastructure/adapters/SqliteAuditRepo';
import { registerAuditIPC } from '../src/main/ipc/audit.ipc';
import { bindAuthSession, clearAuthSession, clearAuthSessionByWebContentsId, configureAuthContext, getContext } from '../src/main/ipc/AuthContext';
import { SqliteFinancialPlatformRepo } from '../src/main/infrastructure/adapters/SqliteFinancialPlatformRepo';
import { FinancialPlatformUseCases } from '../src/main/application/useCases/FinancialPlatformUseCases';
import { registerFinancialPlatformIPC } from '../src/main/ipc/financialPlatform.ipc';
import { SqliteRuntimeGovernanceRepo } from '../src/main/infrastructure/adapters/SqliteRuntimeGovernanceRepo';
import { ConcurrentLicenseService } from '../src/main/application/services/ConcurrentLicenseService';
import { AttachmentStorageService } from '../src/main/application/services/AttachmentStorageService';
import { registerRuntimeGovernanceIPC } from '../src/main/ipc/runtimeGovernance.ipc';
import { diffPlainObjects } from '../src/main/application/services/AuditDiffService';

let db: any;
let permissionSnapshotService: PermissionSnapshotService | null = null;
let auditService: AuditService | null = null;
let concurrentLicenseService: ConcurrentLicenseService | null = null;
let attachmentStorageService: AttachmentStorageService | null = null;
const DEFAULT_RENDERER_URL = 'http://localhost:4600';

// Services will be initialized after DB is ready in app.on('ready')
let importService: ImportService;

/**
 * Safe ipcMain.handle wrapper — prevents "Attempted to register a second handler" crash.
 * Duplicate channel registrations are silently skipped with a console warning.
 * This is needed because main.ts has grown large and some handlers were registered twice.
 */
function safeHandle(channel: string, handler: (...args: any[]) => any) {
  try {
    ipcMain.handle(channel, handler);
  } catch (e: any) {
    if (e.message?.includes('register a second handler')) {
      console.warn(`[IPC] Skipped duplicate handler for: '${channel}'`);
    } else {
      throw e;
    }
  }
}

safeHandle('email:send', async (payload: any) => {
  const {
    host,
    port,
    secure,
    user,
    pass,
    to,
    cc,
    subject,
    text,
    html,
  } = payload;

  const transporter = nodemailer.createTransport({
    host,
    port: Number(port || 587),
    secure: secure ?? Number(port) === 465,
    auth: {
      user,
      pass,
    },
    tls: {
      rejectUnauthorized: false,
    },
  });

  const info = await transporter.sendMail({
    from: user,
    to,
    cc,
    subject,
    text,
    html,
  });

  return {
    ok: true,
    data: {
      messageId: info.messageId,
      response: info.response,
    },
  };
});

// Register protocol for local images
// Register protocol for local images
protocol.registerSchemesAsPrivileged([
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

app.whenReady().then(() => {
  // Protocol Handler for wafi:// scheme
  console.log('[WAFI Protocol] Registering wafi:// protocol handler');

  protocol.handle('wafi', async (request) => {
    const log = (msg: string) => {
      console.log(`[WAFI Protocol] ${msg}`);
    };

    try {
      log(`Incoming Request: ${request.url}`);

      // 1. Parse the URL - wafi://employees/image.jpg
      let urlPath = request.url.replace(/^wafi:\/\//, '');

      // 2. Remove query/hash
      const qIdx = urlPath.indexOf('?');
      if (qIdx !== -1) urlPath = urlPath.substring(0, qIdx);
      const hIdx = urlPath.indexOf('#');
      if (hIdx !== -1) urlPath = urlPath.substring(0, hIdx);

      // 3. Decode URL encoding
      const decodedPath = decodeURIComponent(urlPath);
      log(`Decoded Path: ${decodedPath}`);

      // 4. Construct Absolute Path
      const uploadsDir = path.join(app.getPath('userData'), 'uploads');
      const targetPath = path.join(uploadsDir, decodedPath);
      const normalizedPath = path.normalize(targetPath);

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
      if (!fs.existsSync(normalizedPath)) {
        log(`Error: File does not exist at ${normalizedPath}`);
        return new Response('File not found', {
          status: 404,
          headers: { 'Content-Type': 'text/plain' }
        });
      }

      // 7. Read and serve the file
      const fileBuffer = fs.readFileSync(normalizedPath);
      const ext = path.extname(normalizedPath).toLowerCase();

      // Determine MIME type
      let contentType = 'application/octet-stream';
      if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
      else if (ext === '.png') contentType = 'image/png';
      else if (ext === '.gif') contentType = 'image/gif';
      else if (ext === '.webp') contentType = 'image/webp';
      else if (ext === '.svg') contentType = 'image/svg+xml';

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

    } catch (error: any) {
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
const registerIPCHandlers = (db: any) => {

  // Reseed Accounts (Fix Data)
  safeHandle('reseed-accounts', () => {
    try {
      seedCOA();
      return { success: true };
    } catch (error: any) {
      console.error('Reseed failed:', error);
      throw error;
    }
  });

  // --- Budgets ---
  safeHandle('budgets:list', () => BudgetService.getAllBudgets());
  safeHandle('budgets:get', (_, id: string) => BudgetService.getBudgetById(id));
  safeHandle('budgets:create', (_, data: any) => BudgetService.createBudget(data));
  safeHandle('budgets:updateStatus', (_, id: string, status: string, userId: string) => BudgetService.updateBudgetStatus(id, status, userId));
  safeHandle('budgets:getVsActual', (_, id: string, period?: number) => BudgetService.getBudgetVsActual(id, period));


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
      if (!account) break;
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

    if (!allowedTables.includes(table)) throw new Error(`Table ${table} not allowed via Generic CRUD.`);

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
    } catch (err) {
      console.error(`CRUD Error on ${table}:`, err);
      throw new Error(err.message);
    }
  });

  // Save Transaction (Refactored to use Service)
  safeHandle('save-transaction', async (event, data) => {
    try {
      const {
        type, voucher_type, ref_no, date,
        description, currency, exchange_rate, status, lines, created_by
      } = data;

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

      const journalLines = lines.map((l: any) => ({
        account_id: l.account_id,
        debit: String(l.debit || 0),
        credit: String(l.credit || 0),
        description: l.description || description,
        cost_center_id: l.cost_center || null,
        reference_no: l.reference_no || null
      }));

      const id = JournalService.createJournalEntry(journalHeader as any, journalLines);
      return { success: true, id };

    } catch (e: any) {
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

      details.forEach((d: any) => {
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

      checks.forEach((c: any) => {
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
      const postLine = (accId: number, debit: number, credit: number, desc: string) => {
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
      details.forEach((d: any) => {
        if (d.amount > 0) {
          const desc = `قبض ${d.payment_method === 'CASH' ? 'نقدي' : 'تحويل'} - ${d.reference || ''}`;
          postLine(d.account_id, d.amount, 0, desc);
        }
      });

      // Debits (from Checks)
      checks.forEach((c: any) => {
        // 1. Create Financial Line (Debit: Check Box or Check-in-Hand)
        // Ideally we use a specific Check Box Account.
        // For now, if checkFundId is provided or fallback.
        const debitAccountId = checkFundId || header.payer_account_id; // Fallback is bad, but keeping safe.

        if (debitAccountId) {
          const desc = `شيك رقم ${c.check_number} - ${c.bank_name}`;
          postLine(debitAccountId, c.amount, 0, desc);

          // 2. Register Check in CheckService (DB)
          CheckService.registerCheck({
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
    } catch (e) {
      console.error('Save RV Error:', e);
      throw e;
    }
  });

  // --- Inventory Handlers (New) ---
  safeHandle('inventory:get-brands', () => InventoryService.getBrands());
  safeHandle('inventory:create-brand', (event, brand) => InventoryService.createBrand(brand));
  safeHandle('inventory:update-brand', (event, brand) => InventoryService.updateBrand(brand));
  safeHandle('inventory:delete-brand', (event, id) => InventoryService.deleteBrand(id));
  safeHandle('inventory:delete-unit', (event, id) => InventoryService.deleteUnit(id));
  safeHandle('inventory:seed-default-units', () => InventoryService.seedDefaultUnits());

  safeHandle('inventory:get-items-v2', () => InventoryService.getItems());
  safeHandle('inventory:get-item-details', (event, id) => InventoryService.getItemDetails(id));
  safeHandle('inventory:create-item', (event, item) => InventoryService.createItem(item));
  safeHandle('inventory:update-item', (event, item) => InventoryService.updateItem(item));
  safeHandle('inventory:bulk-update-items', (event, updates) => InventoryService.bulkUpdateItems(updates));
  safeHandle('save-item', (event, item) => InventoryService.updateItem(item)); // Alias for legacy calls

  // --- Item Service (Suggestions/Lists) ---
  safeHandle('inventory:suggest-items', (event, q, limit) => ItemService.suggest(q, limit));
  safeHandle('inventory:list-items', (event, q, limit, offset) => ItemService.list(q, limit, offset));
  safeHandle('inventory:quick-create-item', (event, item) => ItemService.quickCreate(item));

  // Stock Take
  safeHandle('inventory:get-stock-takes', () => InventoryService.getStockTakes());
  safeHandle('inventory:get-stock-take', (event, id) => InventoryService.getStockTake(id));
  safeHandle('inventory:create-stock-take', (event, data) => InventoryService.createStockTake(data));
  safeHandle('inventory:update-stock-take-item', (event, id, qty) => InventoryService.updateStockTakeItem(id, qty));
  safeHandle('inventory:approve-stock-take', (event, id) => InventoryService.approveStockTake(id));

  // Period Closing
  safeHandle('inventory:get-last-closing-date', () => InventoryService.getLastClosingDate());
  safeHandle('inventory:close-period', (event, date) => InventoryService.closePeriod(date));

  safeHandle('inventory:get-batches', (event, itemId) => InventoryService.getBatches(itemId));
  safeHandle('inventory:create-batch', (event, batch) => InventoryService.createBatch(batch));

  safeHandle('inventory:transfer-request', (event, data) => InventoryService.createTransferRequest(data));
  safeHandle('inventory:get-transfer-requests', (event, filters) => InventoryService.getTransferRequests(filters));
  safeHandle('inventory:get-transfer-request', (event, id) => InventoryService.getTransferRequest(id));

  // Attributes
  safeHandle('inventory:get-attributes', () => InventoryService.getAttributeDefinitions());
  safeHandle('inventory:save-attribute', (_, attr) => InventoryService.saveAttributeDefinition(attr));
  safeHandle('inventory:delete-attribute', (_, id) => InventoryService.deleteAttribute(id));

  // Attribute Values
  safeHandle('inventory:get-attribute-values', (_, attrId) => InventoryService.getAttributeValues(attrId));
  safeHandle('inventory:save-attribute-value', (_, data) => InventoryService.saveAttributeValue(data));
  safeHandle('inventory:delete-attribute-value', (_, id) => InventoryService.deleteAttributeValue(id));




  // --- Partner Handlers (New Master Data) ---
  safeHandle('partner:get-customer-types', () => PartnerService.getCustomerTypes());
  safeHandle('partner:save-customer-type', (event, data) => PartnerService.saveCustomerType(data));
  safeHandle('partner:delete-customer-type', (event, id) => PartnerService.deleteCustomerType(id));

  safeHandle('partner:get-vendor-types', () => PartnerService.getVendorTypes());
  safeHandle('partner:save-vendor-type', (event, data) => PartnerService.saveVendorType(data));
  safeHandle('partner:delete-vendor-type', (event, id) => PartnerService.deleteVendorType(id));

  safeHandle('partner:get-contact-types', () => PartnerService.getContactTypes());

  safeHandle('partner:get-memberships', () => PartnerService.getMemberships());
  safeHandle('partner:save-membership', (event, data) => PartnerService.saveMembership(data));
  safeHandle('partner:delete-membership', (event, id) => PartnerService.deleteMembership(id));

  safeHandle('partner:get-sectors', () => PartnerService.getSectors());
  safeHandle('partner:save-sector', (event, data) => PartnerService.saveSector(data));
  safeHandle('partner:delete-sector', (event, id) => PartnerService.deleteSector(id));

  safeHandle('partner:get-credit-policies', () => PartnerService.getCreditPolicies());
  safeHandle('partner:save-credit-policy', (event, data) => PartnerService.saveCreditPolicy(data));
  safeHandle('partner:delete-credit-policy', (event, id) => PartnerService.deleteCreditPolicy(id));

  safeHandle('partner:get-regions', () => PartnerService.getRegions());
  safeHandle('partner:save-region', (event, data) => PartnerService.saveRegion(data)); // Handles create/update
  // Explicit create/update if needed by frontend, but saveRegion wraps them
  safeHandle('partner:create-region', (event, data) => PartnerService.createRegion(data));
  safeHandle('partner:update-region', (event, data) => PartnerService.updateRegion(data));
  safeHandle('partner:delete-region', (event, id) => PartnerService.deleteRegion(id));

  safeHandle('partner:get-groups', () => PartnerService.getGroups());
  safeHandle('partner:save-group', (event, data) => PartnerService.saveGroup(data));
  safeHandle('partner:delete-group', (event, id) => PartnerService.deleteGroup(id));

  safeHandle('partner:get-sales-reps', () => PartnerService.getSalesReps());
  safeHandle('partner:save-sales-rep', (event, data) => PartnerService.saveSalesRep(data));
  safeHandle('partner:delete-sales-rep', (event, id) => PartnerService.deleteSalesRep(id));

  safeHandle('partner:get-price-lists', () => PartnerService.getPriceLists());
  safeHandle('partner:save-price-list', (event, data) => PartnerService.savePriceList(data));
  safeHandle('partner:delete-price-list', (event, id) => PartnerService.deletePriceList(id));
  safeHandle('partner:get-price-list-items', (event, id) => PartnerService.getPriceListItems(id));
  safeHandle('partner:save-price-list-item', (event, data) => PartnerService.savePriceListItem(data));
  safeHandle('partner:delete-price-list-item', (event, id) => PartnerService.deletePriceListItem(id));

  // --- Warehouse Handlers ---
  safeHandle('get-warehouses', () => InventoryService.getWarehouses());
  safeHandle('create-warehouse', (event, wh) => InventoryService.createWarehouse(wh));
  safeHandle('update-warehouse', (event, wh) => InventoryService.updateWarehouse(wh));
  safeHandle('delete-warehouse', (event, id) => InventoryService.deleteWarehouse(id));
  // Map inventory: names too for consistency if needed
  safeHandle('inventory:get-warehouses', () => InventoryService.getWarehouses());
  safeHandle('inventory:create-warehouse', (event, wh) => InventoryService.createWarehouse(wh));
  safeHandle('inventory:update-warehouse', (event, wh) => InventoryService.updateWarehouse(wh));
  safeHandle('inventory:delete-warehouse', (event, id) => InventoryService.deleteWarehouse(id));

  // --- Stock Handlers ---
  safeHandle('get-stock', (event, { itemId, warehouseId }) => {
    return InventoryService.getStock(itemId, warehouseId);
  });

  safeHandle('inventory:get-valuation', (event, filters) => InventoryService.getInventoryValuation(filters));

  safeHandle('add-stock-transaction', (event, trx) => {
    return InventoryService.addStockTransaction(trx);
  });
  // --- Bins ---
  safeHandle('get-warehouse-bins', (event, warehouseId) => InventoryService.getBins(warehouseId));
  safeHandle('create-warehouse-bin', (event, bin) => InventoryService.createBin(bin));
  safeHandle('delete-warehouse-bin', (event, id) => InventoryService.deleteBin(id));

  // --- Stock Documents ---
  safeHandle('inventory-get-grns', () => InventoryService.getGoodsReceipts());
  safeHandle('inventory-get-dispatches', () => InventoryService.getDispatches());

  // -- Dispatch Service --
  safeHandle('dispatch:update', (_, id, payload) => DispatchService.update(id, payload));
  safeHandle('dispatch:post-to-pending', (_, id) => DispatchService.postToPending(id));
  safeHandle('dispatch:invoice-from-dispatch', (_, dispatchId) => DispatchService.invoiceFromDispatch(dispatchId));
  safeHandle('dispatch:getAll', () => DispatchService.getAll());
  safeHandle('dispatch:getById', (_, id) => DispatchService.getById(id));

  safeHandle('inventory-get-stock-document', (event, id) => InventoryService.getStockDocument(id));
  safeHandle('create-stock-document', (event, doc) => InventoryService.createStockDocument(doc));
  safeHandle('update-stock-document', (event, doc) => InventoryService.updateStockDocument(doc));

  // --- Logistics ---
  safeHandle('logistics-get-drivers', () => LogisticsService.getDrivers());
  safeHandle('logistics-save-driver', (event, data) => LogisticsService.saveDriver(data));
  safeHandle('logistics-delete-driver', (event, id) => LogisticsService.deleteDriver(id));
  safeHandle('logistics-get-vehicles', () => LogisticsService.getVehicles());
  safeHandle('logistics-save-vehicle', (event, data) => LogisticsService.saveVehicle(data));
  safeHandle('logistics-delete-vehicle', (event, id) => LogisticsService.deleteVehicle(id));

  // --- Stock Taking Handlers ---
  // Handlers registered above with 'inventory:' prefix. Legacy handlers below removed.
  // safeHandle('get-stock-takes', (event) => InventoryService.getStockTakes());
  // safeHandle('get-stock-take', (event, id) => InventoryService.getStockTake(id));  // safeHandle('get-inventory-dashboard', () => InventoryService.getInventoryDashboard());

  safeHandle('inventory:receive-transfer', (event, data) => InventoryService.receiveTransfer(data));

  // --- Assembly ---
  safeHandle('inventory:get-kit', (event, itemId) => InventoryService.getKit(itemId));
  safeHandle('inventory:create-assembly', (event, data) => InventoryService.createAssembly(data));

  // --- Reports Handlers ---
  safeHandle('reports-get-item-movement', (event, filters) => ReportService.getItemMovement(filters));
  safeHandle('reports-get-top-customers', (event) => ReportService.getTopCustomers());
  safeHandle('get-report-pnl', (event, range) => ReportService.getReportPnL(range));
  safeHandle('get-trial-balance', (event, params) => ReportService.getTrialBalance()); // Modified signature match

  // Register ALL other reports
  safeHandle('reports-get-partner-ledger', (event, filters) => ReportService.getPartnerLedger(filters));
  safeHandle('reports-get-inventory-status', () => ReportService.getInventoryStatus());
  safeHandle('reports-get-sales-analytics', (event, range) => ReportService.getSalesAnalytics(range));
  safeHandle('reports-get-profitability', (event, range) => ReportService.getProfitabilityReport(range));
  safeHandle('reports-get-purchasing-analysis', (event, range) => ReportService.getPurchasingAnalysis(range));
  safeHandle('reports-get-purchases-by-vendor', (event, range) => ReportService.getPurchasesByVendor(range));
  safeHandle('reports-get-import-reports', () => ReportService.getImportReports());
  safeHandle('reports-get-cheques', (event, filters) => ReportService.getChequesReport(filters));
  safeHandle('reports-get-account-statement', (event, filters) => ReportService.getAccountStatement(filters));
  safeHandle('reports-get-aging', () => ReportService.getAgingReport());
  safeHandle('reports-get-tax', (event, range) => ReportService.getTaxReport(range));
  safeHandle('get-dashboard-kpis', () => ReportService.getDashboardKPIs());
  safeHandle('get-dashboard-charts', () => ReportService.getDashboardCharts());

  safeHandle('reports-get-slow-moving', (event, days) => ReportService.getSlowMovingItems(days));
  safeHandle('reports-get-expiry', (event, days) => ReportService.getExpiryReport(days));

  safeHandle('save-invoice', (event, data) => {
    const ctx = getContext(event as any);
    return SalesService.createInvoice(data, {
      companyId: ctx?.companyId,
      branchId: ctx?.branchId,
      userId: ctx?.userId,
    });
  });
  safeHandle('sales-create-invoice', (event, data) => {
    const ctx = getContext(event as any);
    return SalesService.createInvoice(data, {
      companyId: ctx?.companyId,
      branchId: ctx?.branchId,
      userId: ctx?.userId,
    });
  });
  safeHandle('get-next-invoice-no', (event) => SalesService.getNextInvoiceNumber());
  safeHandle('sales-get-invoice', (event, id) => SalesService.getInvoice(id));
  safeHandle('sales-post-invoice', (event, id, userId) => {
    const ctx = getContext(event as any);
    const granted = new Set<string>([
      ...(Array.isArray(ctx?.permissions) ? ctx.permissions : []),
      ...(Array.isArray(ctx?.capabilities) ? ctx.capabilities : []),
    ]);

    const canPost =
      granted.has('ALL') ||
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
      const err: any = new Error('PERMISSION_DENIED');
      err.code = 'PERMISSION_DENIED';
      err.messageKey = 'error.permission_denied.ti.sales.invoice.post';
      throw err;
    }

    return SalesService.postInvoice(id, userId);
  });
  safeHandle('sales-submit-invoice-approval', (event, id, userId) => SalesService.submitInvoiceForApproval(id, userId));

  // Sales Orders
  safeHandle('sales-get-pending-orders', () => SalesService.getPendingOrders());

  // 4. Check Management Handlers
  safeHandle('get-checks', (event, status) => CheckService.getChecks(status));
  safeHandle('register-check', (event, { data, customerId, reference, userId }) => CheckService.registerCheck(data, customerId, reference, userId));
  safeHandle('update-check-status', (event, data) => CheckService.updateStatus(data));



  // 5. HR & Payroll Handlers
  // Organization
  safeHandle('hr-get-departments', () => HRService.getDepartments());
  safeHandle('hr-save-department', (event, data) => HRService.saveDepartment(data));
  safeHandle('hr-delete-department', (event, id) => HRService.deleteDepartment(id));

  safeHandle('hr-get-job-titles', () => HRService.getJobTitles());
  safeHandle('hr-get-titles', () => HRService.getJobTitles()); // Alias for hr.getTitles
  safeHandle('hr-save-job-title', (event, data) => HRService.saveJobTitle(data));
  safeHandle('hr-save-title', (event, data) => HRService.saveJobTitle(data)); // Alias
  safeHandle('hr-delete-job-title', (event, id) => HRService.deleteJobTitle(id));
  safeHandle('hr-delete-title', (event, id) => HRService.deleteJobTitle(id)); // Alias

  // Employees
  safeHandle('hr-get-employees', () => HRService.getEmployees());
  safeHandle('hr-get-employee', (event, id) => HRService.getEmployee(id));
  safeHandle('hr-save-employee', (event, data) => HRService.saveEmployee(data));
  safeHandle('hr-get-next-code', () => HRService.getNextEmployeeCode());
  safeHandle('hr-save-photo', (event, { buffer, name }) => HRService.saveEmployeePhoto(buffer, name));

  // Attendance
  safeHandle('hr-get-shifts', () => AttendanceService.getShifts());
  safeHandle('hr-save-shift', (event, data) => AttendanceService.saveShift(data));
  safeHandle('hr-import-attendance', (event, records) => AttendanceService.importAttendanceRaw(records));
  safeHandle('hr-process-daily-attendance', (event, date) => AttendanceService.processDayAttendance(date));
  safeHandle('hr-process-attendance', (event, date) => AttendanceService.processDayAttendance(date)); // Alias
  safeHandle('hr-get-daily-attendance', (event, date) => AttendanceService.getDailyAttendance(date));

  // Leaves
  safeHandle('hr-get-leave-types', () => LeaveService.getLeaveTypes());
  safeHandle('hr-save-leave-type', (event, data) => LeaveService.saveLeaveType(data));
  safeHandle('hr-delete-leave-type', (event, id) => LeaveService.deleteLeaveType(id));
  safeHandle('hr-get-leave-requests', (event, filter) => LeaveService.getLeaveRequests(filter));
  safeHandle('hr-save-leave-request', (event, data) => LeaveService.saveLeaveRequest(data));
  safeHandle('hr-update-leave-status', (event, { id, status, reason }) => LeaveService.updateRequestStatus(id, status, reason));
  safeHandle('hr-get-employee-balances', (event, { employeeId, year }) => LeaveService.getEmployeeBalances(employeeId, year));

  // Payroll
  safeHandle('hr-get-payroll-preview', (event, { month, year }) => PayrollService.generatePayrollPreview(month, year));
  safeHandle('hr-post-payroll', (event, { month, year, slips }) => PayrollService.postPayroll(month, year, slips));
  safeHandle('hr-save-advance', (event, data) => PayrollService.saveAdvance(data));
  safeHandle('hr-get-slips', (event, { month, year }) => PayrollService.getSlips(month, year));
  safeHandle('hr-calc-eos', (event, { employeeId, endDate }) => PayrollService.calculateEOS(employeeId, endDate));


  // HR - Production & Commission
  safeHandle('hr-get-production-logs', (event, date) => ProductionService.getLogs(date));
  safeHandle('hr-save-production-log', (event, data) => ProductionService.saveLog(data));
  safeHandle('hr-delete-production-log', (event, id) => ProductionService.deleteLog(id));

  safeHandle('hr-get-commissions', (event, { month, year }) => CommissionService.getCommissions(month, year));
  safeHandle('hr-save-commissions', (event, data) => CommissionService.saveCommissions(data));

  safeHandle('hr-generate-salary-entry', (event, { month, year }) => PayrollService.generateSalaryEntry(month, year));





  // 6. Fixed Assets Handlers
  safeHandle('get-assets', () => AssetService.getAssets());
  safeHandle('save-asset', (event, data) => AssetService.saveAsset(data));
  safeHandle('calc-depreciation', (event, assetId) => AssetService.calculateDepreciation(assetId));
  safeHandle('post-depreciation', (event, { assetId, amount, date }) => AssetService.postDepreciation(assetId, amount, date));
  safeHandle('get-asset-categories', () => AssetService.getCategories());
  safeHandle('save-asset-category', (event, data) => AssetService.saveCategory(data));
  safeHandle('get-next-asset-code', () => AssetService.getNextCode());

  // 7. System & Auth Handlers
  safeHandle('auth-login', (event, { username, password }) => {
    const user = AuthService.login(username, password);
    bindAuthSession(event as any, user);
    if (concurrentLicenseService) {
      try {
        concurrentLicenseService.acquireSessionOrThrow({
          userId: String(user?.id || user?.userId || ''),
          companyId: String(user?.company_id || user?.companyId || 'COMP_01'),
          branchId: String(user?.branch_id || user?.branchId || 'BR_01'),
          webContentsId: Number((event as any)?.sender?.id),
        });
      } catch (error) {
        clearAuthSession(event as any);
        throw error;
      }
    }
    return user;
  });
  safeHandle('auth-logout', (event) => {
    const ctx = getContext(event as any);
    concurrentLicenseService?.releaseSession(Number((event as any)?.sender?.id), {
      userId: String(ctx?.userId || ''),
      companyId: String(ctx?.companyId || 'COMP_01'),
      branchId: String(ctx?.branchId || 'BR_01'),
    });
    clearAuthSession(event as any);
    return { success: true };
  });
  safeHandle('auth-change-password', (event, { userId, oldPass, newPass }) => AuthService.changePassword(userId, oldPass, newPass));

  safeHandle('get-users', () => AuthService.getUsers());
  safeHandle('save-user', (event, user) => {
    const result = user.id ? AuthService.updateUser(user) : AuthService.createUser(user);
    permissionSnapshotService?.onLegacyPermissionsChanged('COMP_01');
    if (user?.id) permissionSnapshotService?.invalidateUser(String(user.id));
    return result;
  });
  safeHandle('delete-user', (event, id) => {
    const result = AuthService.deleteUser(id);
    permissionSnapshotService?.onLegacyPermissionsChanged('COMP_01');
    if (id) permissionSnapshotService?.invalidateUser(String(id));
    return result;
  });

  safeHandle('get-roles', () => AuthService.getRoles());
  safeHandle('save-role', (event, role) => {
    const result = role.id ? AuthService.updateRole(role) : AuthService.createRole(role);
    permissionSnapshotService?.onLegacyPermissionsChanged('COMP_01');
    return result;
  });
  safeHandle('delete-role', (event, id) => {
    const result = AuthService.deleteRole(id);
    permissionSnapshotService?.onLegacyPermissionsChanged('COMP_01');
    return result;
  });

  safeHandle('get-permissions', (event, roleId) => AuthService.getPermissions(roleId));
  safeHandle('save-permissions', (event, { roleId, permissions, companyId }) => {
    const result = AuthService.savePermissions(roleId, permissions);
    permissionSnapshotService?.onLegacyPermissionsChanged(companyId || 'COMP_01');
    return result;
  });



  // 8. System Maintenance
  safeHandle('backup-database', () => SystemService.backupDatabase());
  safeHandle('restore-database', () => SystemService.restoreDatabase());
  safeHandle('check-integrity', () => SystemService.checkIntegrity());
  safeHandle('get-audit-logs', (event, filters) => SystemService.getAuditLogs(filters));
  // --- Purchase Handlers ---
  safeHandle('purchase-create-invoice', (event, data) => PurchaseService.createInvoice(data));
  safeHandle('purchase-get-invoices', () => PurchaseService.getInvoices());
  safeHandle('purchase-get-invoice', (event, id) => PurchaseService.getInvoice(id));
  safeHandle('purchase-get-next-no', () => PurchaseService.getNextInvoiceNo());

  safeHandle('purchase-create-order', (event, data) => PurchaseService.createOrder(data));
  safeHandle('purchase-get-orders', () => PurchaseService.getOrders());
  safeHandle('purchase-get-order', (event, id) => PurchaseService.getOrder(id));
  safeHandle('purchase-update-order', (event, data) => PurchaseService.updateOrder(data));
  safeHandle('purchase-delete-order', (event, id) => PurchaseService.deleteOrder(id));
  safeHandle('purchase-post-order', (event, id, userId) => PurchaseService.postOrder(id, userId));
  safeHandle('purchase-approve-order', (event, id, userId) => PurchaseService.approveOrder(id, userId));
  safeHandle('purchase-reject-order', (event, id, userId, reason) => PurchaseService.rejectOrder(id, userId, reason));

  safeHandle('purchase-create-request', (event, data) => PurchaseService.createRequest(data));
  safeHandle('purchase-get-requests', () => PurchaseService.getRequests());
  safeHandle('purchase-get-request', (event, id) => PurchaseService.getRequest(id));
  safeHandle('purchase-update-request', (event, data) => PurchaseService.updateRequest(data));
  safeHandle('purchase-delete-request', (event, id) => PurchaseService.deleteRequest(id));
  safeHandle('purchase-post-request', (event, id, userId) => PurchaseService.postRequest(id, userId));
  safeHandle('purchase-approve-request', (event, id, userId) => PurchaseService.approveRequest(id, userId));
  safeHandle('purchase-reject-request', (event, id, userId, reason) => PurchaseService.rejectRequest(id, userId, reason));

  // RFQ
  safeHandle('purchase-create-rfq', (event, data) => PurchaseService.createRFQ(data));
  safeHandle('purchase-get-rfqs', () => PurchaseService.getRFQs());
  safeHandle('purchase-get-rfq', (event, id) => PurchaseService.getRFQ(id));
  safeHandle('purchase-update-rfq', (event, data) => PurchaseService.updateRFQ(data));


  safeHandle('purchase-create-return', (event, data) => PurchaseService.createReturn(data));
  safeHandle('purchase-get-returns', () => PurchaseService.getReturns());
  safeHandle('purchase-get-return', (event, id) => PurchaseService.getReturn(id));
  safeHandle('get-settings', () => SystemService.getSettings());
  safeHandle('save-settings', (event, data) => SystemService.saveSettings(data));
  safeHandle('save-logo', (event, { buffer, name }) => SystemService.saveLogo(buffer, name));
  safeHandle('system:save-image', (event, { buffer, name }) => SystemService.saveImage(buffer, name));

  safeHandle('dialog:open-file', async (event, options) => {
    const { canceled, filePaths } = await dialog.showOpenDialog(options);
    if (canceled) return { canceled: true, filePaths: [] };
    return { canceled: false, filePaths };
  });

  // --- Currency Handlers ---
  safeHandle('get-currencies', (event, companyId) => CurrencyService.getCurrencies(companyId || '1'));
  safeHandle('get-base-currency', (event, companyId) => CurrencyService.getBaseCurrency(companyId || '1'));
  safeHandle('create-currency', (event, currency) => CurrencyService.createCurrency(currency));
  safeHandle('update-currency', (event, id, companyId, updates) => CurrencyService.updateCurrency(id, companyId || '1', updates));
  safeHandle('delete-currency', (event, id, companyId) => CurrencyService.deleteCurrency(id, companyId || '1'));

  // --- Cost Center Handlers ---
  safeHandle('get-cost-centers', (event, companyId) => CostCenterService.getCostCenters(companyId || '1'));
  safeHandle('get-cost-center', (event, id, companyId) => CostCenterService.getCostCenter(id, companyId || '1'));
  safeHandle('create-cost-center', (event, data) => CostCenterService.createCostCenter({ ...data, companyId: data.companyId || '1' }));
  safeHandle('update-cost-center', (event, id, companyId, updates) => CostCenterService.updateCostCenter(id, companyId || '1', updates));
  safeHandle('delete-cost-center', (event, id, companyId) => CostCenterService.deleteCostCenter(id, companyId || '1'));

  // --- Tax Group Handlers ---
  safeHandle('get-tax-groups', (event, companyId) => TaxGroupService.getTaxGroups(companyId || '1'));
  safeHandle('get-tax-group', (event, id, companyId) => TaxGroupService.getTaxGroup(id, companyId || '1'));
  safeHandle('create-tax-group', (event, data) => TaxGroupService.createTaxGroup({ ...data, companyId: data.companyId || '1' }));
  safeHandle('update-tax-group', (event, id, companyId, updates) => TaxGroupService.updateTaxGroup(id, companyId || '1', updates));
  safeHandle('delete-tax-group', (event, id, companyId) => TaxGroupService.deleteTaxGroup(id, companyId || '1'));

  // --- Warehouse Handlers ---
  safeHandle('get-warehouses', (event, companyId) => WarehouseService.getWarehouses(companyId || '1'));
  safeHandle('get-warehouse', (event, id, companyId) => WarehouseService.getWarehouse(id, companyId || '1'));
  safeHandle('create-warehouse', (event, data) => WarehouseService.createWarehouse({ ...data, companyId: data.companyId || '1' }));
  safeHandle('update-warehouse', (event, id, companyId, updates) => WarehouseService.updateWarehouse(id, companyId || '1', updates));
  safeHandle('delete-warehouse', (event, id, companyId) => WarehouseService.deleteWarehouse(id, companyId || '1'));

  safeHandle('get-bin-locations', (event, warehouseId) => WarehouseService.getBinLocations(warehouseId));
  safeHandle('get-bin-location', (event, id) => WarehouseService.getBinLocation(id));
  safeHandle('create-bin-location', (event, data) => WarehouseService.createBinLocation(data));
  safeHandle('update-bin-location', (event, id, updates) => WarehouseService.updateBinLocation(id, updates));
  safeHandle('delete-bin-location', (event, id) => WarehouseService.deleteBinLocation(id));

  // --- Item Tracking Handlers (Batches & Serials) ---
  safeHandle('get-item-batches', (event, itemId) => ItemTrackingService.getBatches(itemId));
  safeHandle('get-item-batch', (event, id) => ItemTrackingService.getBatch(id));
  safeHandle('create-item-batch', (event, data) => ItemTrackingService.createBatch(data));
  safeHandle('update-item-batch', (event, id, updates) => ItemTrackingService.updateBatch(id, updates));
  safeHandle('delete-item-batch', (event, id) => ItemTrackingService.deleteBatch(id));

  safeHandle('get-item-serials', (event, itemId) => ItemTrackingService.getSerials(itemId));
  safeHandle('get-item-serial', (event, id) => ItemTrackingService.getSerial(id));
  safeHandle('create-item-serial', (event, data) => ItemTrackingService.createSerial(data));
  safeHandle('update-item-serial-status', (event, id, status) => ItemTrackingService.updateSerialStatus(id, status));
  safeHandle('delete-item-serial', (event, id) => ItemTrackingService.deleteSerial(id));

  // Manual Trigger for Scraper
  safeHandle('currency-scraper-trigger', async () => {
    const service = new CurrencyScraperService(); // Or use singleton if exported
    return await service.updateRates();
  });

  safeHandle('currency-get-history', (event, { code, days }) => CurrencyService.getCurrencyHistory(code, days));

  // --- Branch Handlers ---
  safeHandle('get-branches', () => BranchService.getBranches());
  safeHandle('save-branch', (event, branch) => branch.id ? BranchService.updateBranch(branch) : BranchService.createBranch(branch));
  safeHandle('delete-branch', (event, id) => BranchService.deleteBranch(id));

  // --- Account Handlers ---
  safeHandle('get-accounts', () => AccountService.getAccounts());
  safeHandle('get-account-tree', () => AccountService.getAccountTree());
  safeHandle('save-account', (event, account) => {
    const before = account?.id
      ? db.prepare(`SELECT * FROM gl_chart_of_accounts WHERE id = ?`).get(account.id)
      : null;

    const result = account?.id
      ? AccountService.updateAccount(account)
      : AccountService.createAccount(account);

    const entityId = String(account?.id || result || '').trim();
    if (entityId) {
      const after = db.prepare(`SELECT * FROM gl_chart_of_accounts WHERE id = ?`).get(entityId);
      const ctx = getContext(event as any);
      const ipcid = String((event as any)?.sender?.id || '');

      try {
        getGlobalAuditService()?.recordEvent(
          {
            companyId: String(ctx?.companyId || 'COMP_01'),
            branchId: String(ctx?.branchId || 'BR_01'),
            userId: String(ctx?.userId || 'SYSTEM'),
            sessionId: String((ctx as any)?.sessionId || ipcid || ''),
            correlationId: String(
              account?.correlationId ||
              (ctx as any)?.correlationId ||
              `acc_${Date.now()}_${Math.floor(Math.random() * 1000000)}`
            ),
            ipcid,
          },
          {
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
          },
          diffPlainObjects(before || {}, after || {}, {
            basePath: 'account',
            ignoreKeys: ['id', 'created_at', 'updated_at'],
            maxChanges: 150,
          }),
        );
      } catch (auditError) {
        console.warn('[AccountHandlers] audit record failed:', auditError);
      }
    }

    return result;
  });
  safeHandle('delete-account', (event, id) => AccountService.deleteAccount(id));
  safeHandle('get-account-by-id', (event, id) => {
    const acc = db.prepare("SELECT * FROM gl_chart_of_accounts WHERE id = ?").get(id);
    return acc;
  });

  // --- Inventory (Items) ---
  safeHandle('get-items', () => ItemService.getItems());
  // safeHandle('save-item', (event, item) => ItemService.saveItem(item)); // DUPLICATE REMOVED
  safeHandle('delete-item', (event, id) => ItemService.deleteItem(id));
  safeHandle('get-units', () => ItemService.getUnits());
  safeHandle('inventory:get-units', () => InventoryService.getUnits()); // Add this handler for frontend compatibility
  safeHandle('create-unit', (event, unit) => ItemService.createUnit(unit));
  safeHandle('delete-unit', (event, id) => ItemService.deleteUnit(id));
  safeHandle('get-categories', () => ItemService.getCategories());
  safeHandle('create-category', (event, cat) => ItemService.createCategory(cat));
  safeHandle('update-category', (event, cat) => ItemService.updateCategory(cat));
  safeHandle('delete-category', (event, id) => ItemService.deleteCategory(id));

  // --- Inventory V2 Handlers ---
  // Moved to top of file to avoid duplicate registration errors.


  // Inventory Attributes
  safeHandle('inventory:getAttributes', () => ItemService.getAttributesDefinitions());
  safeHandle('inventory:saveAttribute', (event, data) => ItemService.saveAttributeDefinition(data));
  safeHandle('inventory:saveAttributeValue', (event, data) => ItemService.saveAttributeValue(data));
  safeHandle('inventory:deleteAttribute', (event, id) => ItemService.deleteAttributeDefinition(id));
  safeHandle('inventory:deleteAttributeValue', (event, id) => ItemService.deleteAttributeValue(id));

  // --- Partners (Customers/Suppliers) ---
  safeHandle('get-partners', (event, type) => PartnerService.getPartners(type));
  safeHandle('get-partner', (event, id) => PartnerService.getPartner(id));
  safeHandle('save-partner', (event, partner) => PartnerService.savePartner(partner));
  safeHandle('delete-partner', (event, id) => PartnerService.deletePartner(id));



  // Price Lists
  safeHandle('partner:getPriceLists', () => PartnerService.getPriceLists());
  safeHandle('partner:savePriceList', (event, data) => PartnerService.savePriceList(data));
  safeHandle('partner:deletePriceList', (event, id) => PartnerService.deletePriceList(id));
  safeHandle('partner:getPriceListItems', (event, listId) => PartnerService.getPriceListItems(listId));
  safeHandle('partner:savePriceListItem', (event, data) => PartnerService.savePriceListItem(data));
  safeHandle('partner:deletePriceListItem', (event, id) => PartnerService.deletePriceListItem(id));

  // --- Financial Definitions ---
  safeHandle('finance:getTaxes', () => FinancialDefinitionService.getTaxes());
  safeHandle('finance:saveTax', (event, data) => FinancialDefinitionService.saveTax(data));
  safeHandle('finance:deleteTax', (event, id) => FinancialDefinitionService.deleteTax(id));

  safeHandle('finance:getAnalysisCodes', () => FinancialDefinitionService.getAnalysisCodes());
  safeHandle('finance:getAnalysisCodesFlat', () => FinancialDefinitionService.getAnalysisCodesFlat());
  safeHandle('finance:saveAnalysisCode', (event, data) => FinancialDefinitionService.saveAnalysisCode(data));
  safeHandle('finance:deleteAnalysisCode', (event, id) => FinancialDefinitionService.deleteAnalysisCode(id));

  // --- Financial Core (Journals) ---
  safeHandle('get-next-voucher-no', (event, prefix) => JournalService.getNextVoucherNo(prefix));
  safeHandle('create-journal-entry', (event, { header, lines }) => JournalService.createJournalEntry(header, lines));
  safeHandle('get-journal-entry', (event, id) => JournalService.getJournalEntry(id));
  safeHandle('get-journal-entries', (event, filters) => JournalService.getJournalEntries(filters));

  // --- Financial Core (Accounting Engine V66) ---
  safeHandle('ae:list-sub-accounts', (event, accountId) => AccountingEngineService.listSubAccounts(accountId));
  safeHandle('ae:create-sub-account', (event, data) => AccountingEngineService.createSubAccount(data));
  safeHandle('ae:list-references', (event, refType) => AccountingEngineService.listReferences(refType));
  safeHandle('ae:create-reference', (event, data) => AccountingEngineService.createReference(data));
  safeHandle('ae:save-draft-voucher', (event, payload) => AccountingEngineService.saveDraftVoucher(payload));
  safeHandle('ae:post-voucher', (event, payload) => AccountingEngineService.postVoucher(payload));
  safeHandle('ae:post-draft-voucher', (event, voucherId) => AccountingEngineService.postDraftVoucher(voucherId));
  safeHandle('ae:get-voucher', (event, id) => AccountingEngineService.getVoucher(id));
  safeHandle('ae:get-vouchers', (event, filters) => AccountingEngineService.getVouchers(filters));
  safeHandle('ae:get-trial-balance', (event, params) => AccountingEngineService.getTrialBalance(params));

  // 9. Reports (Legacy - Removed, handled above)
  // safeHandle('get-trial-balance', (event, params) => ReportsService.getTrialBalance(params));


  // 10. Manufacturing
  // Work Centers
  safeHandle('mfg-get-work-centers', () => ManufacturingService.getWorkCenters());
  safeHandle('mfg-save-work-center', (event, data) => ManufacturingService.saveWorkCenter(data));
  safeHandle('mfg-delete-work-center', (event, id) => ManufacturingService.deleteWorkCenter(id));

  // Machines
  safeHandle('mfg-get-machines', () => ManufacturingService.getMachines());
  safeHandle('mfg-save-machine', (event, data) => ManufacturingService.saveMachine(data));
  safeHandle('mfg-delete-machine', (event, id) => ManufacturingService.deleteMachine(id));

  // BOM & Routing
  safeHandle('mfg-create-bom', (event, header, lines) => ManufacturingService.createBOM(header, lines));
  safeHandle('mfg-get-boms', () => ManufacturingService.getBOMs());
  safeHandle('mfg-get-bom', (event, id) => ManufacturingService.getBOM(id));

  safeHandle('mfg-save-routing', (event, header, ops) => ManufacturingService.saveRouting(header, ops));
  safeHandle('mfg-get-routings', (event, bomId) => ManufacturingService.getRoutings(bomId));

  // Orders
  safeHandle('mfg-create-order', (event, order) => ManufacturingService.createProductionOrder(order));
  safeHandle('mfg-get-orders', () => ManufacturingService.getProductionOrders());
  safeHandle('mfg-update-order-status', (event, { id, status }) => ManufacturingService.updateOrderStatus(id, status));
  safeHandle('mfg-execute-order', (event, id, qty, date) => ManufacturingService.executeProductionOrder(id, qty, date));

  // Job Cards
  safeHandle('mfg-get-job-cards', (event, filters) => ManufacturingService.getJobCards(filters));
  safeHandle('mfg-start-job', (event, data) => ManufacturingService.createJobCard(data));
  safeHandle('mfg-stop-job', (event, { id, data }) => ManufacturingService.stopJobCard(id, data));

  // QC
  safeHandle('mfg-get-qc-tests', () => ManufacturingService.getQCTests());
  safeHandle('mfg-save-qc-test', (event, data) => ManufacturingService.saveQCTest(data));
  safeHandle('mfg-get-inspections', (event, filters) => ManufacturingService.getInspections(filters));
  safeHandle('mfg-save-inspection', (event, data) => ManufacturingService.saveInspection(data));

  // Maintenance
  safeHandle('mfg-get-maintenance-requests', (event, filters) => ManufacturingService.getMaintenanceRequests(filters));
  safeHandle('mfg-save-maintenance-request', (event, data) => ManufacturingService.saveMaintenanceRequest(data));

  // TEST WORKFLOW
  safeHandle('test:run-full-workflow', () => WorkflowTestService.runFullWorkflow());

  safeHandle('mfg-get-wip-report', () => ManufacturingService.getWIPReport());

  // 11. Master Data Definitions (Financials)
  // Banks
  safeHandle('md-get-banks', () => MasterDataService.getBanks());
  safeHandle('md-save-bank', (event, data) => MasterDataService.saveBank(data));
  safeHandle('md-delete-bank', (event, id) => MasterDataService.deleteBank(id));

  safeHandle('md-import-banks-html', async (event, filePath) => {
    return MasterDataService.importBanksFromHTML(filePath);
  });

  // Note: dialog:open-file is already registered at line 788, so we don't need to re-register it if it works.
  // Let's check line 788 in the file content I saw earlier.
  // Line 788: safeHandle('dialog:open-file', async (event, options) => { ...
  // So I can just use 'dialog:open-file' from frontend.


  // Bank Accounts
  safeHandle('md-get-bank-accounts', () => MasterDataService.getBankAccounts());
  safeHandle('md-save-bank-account', (event, data) => MasterDataService.saveBankAccount(data));
  safeHandle('md-delete-bank-account', (event, id) => MasterDataService.deleteBankAccount(id));

  // Cash Boxes
  safeHandle('md-get-cash-boxes', () => MasterDataService.getCashBoxes());
  safeHandle('md-save-cash-box', (event, data) => MasterDataService.saveCashBox(data));
  safeHandle('md-delete-cash-box', (event, id) => MasterDataService.deleteCashBox(id));

  // Cost Centers
  safeHandle('md-get-cost-centers', () => MasterDataService.getCostCenters());
  safeHandle('md-save-cost-center', (event, data) => MasterDataService.saveCostCenter(data));
  safeHandle('md-delete-cost-center', (event, id) => MasterDataService.deleteCostCenter(id));

  // Payment Methods
  safeHandle('md-get-payment-methods', () => MasterDataService.getPaymentMethods());
  safeHandle('md-save-payment-method', (event, data) => MasterDataService.savePaymentMethod(data));

  // Branches
  safeHandle('md-get-branches', () => MasterDataService.getBranches());
  safeHandle('md-save-branch', (event, data) => MasterDataService.saveBranch(data));
  safeHandle('md-delete-branch', (event, id) => MasterDataService.deleteBranch(id));

  // 11. Master Data Definitions (Financials)


  safeHandle('get-products', (event, search) => {
    if (!search) return db.prepare('SELECT * FROM products LIMIT 50').all();
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
  safeHandle('sales-create-quotation', (event, data) => SalesService.createQuotation(data));
  safeHandle('sales-get-quotations', (event) => SalesService.getQuotations());
  safeHandle('sales-get-quotation', (event, id) => SalesService.getQuotation(id));
  // sales-get-invoice → already registered at line ~692
  safeHandle('sales-update-quotation-status', (event, { id, status }) => SalesService.updateQuotationStatus(id, status));

  // Orders
  safeHandle('sales-create-order', (event, data) => SalesService.createOrder(data));
  safeHandle('sales-get-orders', (event) => SalesService.getOrders());
  safeHandle('sales-get-order', (event, id) => SalesService.getOrder(id));

  safeHandle('sales-update-order-status', (event, { id, status }) => SalesService.updateOrderStatus(id, status));

  // Returns
  safeHandle('sales-create-return', (event, data) => SalesService.createReturn(data));
  safeHandle('sales-get-returns', (event) => SalesService.getReturns());
  safeHandle('sales-get-return', (event, id) => SalesService.getReturn(id));

  // Sales Lists & Deletes
  safeHandle('sales-get-invoices', (event) => SalesService.getInvoices());
  safeHandle('sales-delete-quotation', (event, id) => SalesService.deleteQuotation(id));
  safeHandle('sales-delete-order', (event, id) => SalesService.deleteOrder(id));

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
  safeHandle('treasury-create-receipt', (event, data) => TreasuryService.createReceiptVoucher(data));
  safeHandle('treasury-create-payment', (event, data) => TreasuryService.createPaymentVoucher(data));
  safeHandle('treasury-delete-receipt', (event, id) => TreasuryService.deleteReceiptVoucher(id));
  safeHandle('treasury-delete-payment', (event, id) => TreasuryService.deletePaymentVoucher(id));
  safeHandle('treasury-post-receipt', (event, id) => TreasuryService.postReceiptVoucher(id));
  safeHandle('treasury-post-payment', (event, id) => TreasuryService.postPaymentVoucher(id));
  safeHandle('treasury-update-receipt-status', (event, { id, status }) => TreasuryService.updateReceiptVoucherStatus(id, status));
  safeHandle('treasury-update-payment-status', (event, { id, status }) => TreasuryService.updatePaymentVoucherStatus(id, status));
  safeHandle('treasury-get-receipt', (event, id) => TreasuryService.getReceipt(id)); // Existing mapping, now exposed.
  safeHandle('treasury-get-payment', (event, id) => TreasuryService.getPaymentVoucher(id));
  safeHandle('treasury-get-payments', (event, filters) => TreasuryService.getPaymentVouchers(filters));
  safeHandle('treasury-get-receipts', (event, filters) => TreasuryService.getReceiptVouchers(filters));
  safeHandle('treasury-get-book-balance', (event, { accountId, date }) => TreasuryService.getBookBalance(accountId, date));

  safeHandle('cheques-get', async (_, filters) => {
    return ChequeService.getCheques(filters);
  });
  safeHandle('cheques-update-status', async (_, data) => {
    return ChequeService.updateStatus(data.id, data.status, data.date, data.options);
  });

  // 10. Report Engine Handlers (New)
  // safeHandle('reports-get-partner-ledger', (event, filters) => ReportService.getPartnerLedger(filters)); // DUPLICATE REMOVED
  // safeHandle('reports-get-item-movement', (event, filters) => ReportService.getItemMovement(filters)); // DUPLICATE REMOVED
  safeHandle('reports-get-trial-balance', (event) => ReportService.getTrialBalance());
  // safeHandle('reports-get-top-customers', () => ReportsService.getTopCustomers()); // Duplicate removed

  // 11. Budgeting Module
  safeHandle('budget-get-all', () => BudgetService.getAllBudgets());
  safeHandle('budget-get-by-id', (event, id) => BudgetService.getBudgetById(id));
  safeHandle('budget-create', (event, data) => BudgetService.createBudget(data));
  safeHandle('budget-update-status', (event, { id, status }) => BudgetService.updateBudgetStatus(id, status, 'Admin')); // TODO: userId
  safeHandle('budget-get-report', (event, { id, period }) => BudgetService.getBudgetVsActual(id, period));

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
    } catch (err) {
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
  safeHandle('get-report-balance-sheet', () => ReportService.getBalanceSheet());

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
        if (remainingDebt <= 0) break;

        const invDate = new Date(inv.date);
        const diffTime = Math.abs(today.getTime() - invDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        const amount = Math.min(remainingDebt, inv.total);

        if (diffDays <= 30) buckets['0-30'] += amount;
        else if (diffDays <= 60) buckets['31-60'] += amount;
        else if (diffDays <= 90) buckets['61-90'] += amount;
        else buckets['90+'] += amount;

        remainingDebt -= amount;
      }

      // If there is still debt not matched to invoices (e.g. Opening Balance), put it in 90+
      if (remainingDebt > 0) buckets['90+'] += remainingDebt;

      return { ...customer, buckets };
    });

    return report;
  });

  // --- Licensing & Security Handlers ---

  // 1. Get Machine Fingerprint
  safeHandle('get-machine-id', async () => {
    return new Promise((resolve) => {
      // Windows command to get UUID
      require('child_process').exec('wmic csproduct get uuid', (err: any, stdout: any) => {
        if (err) {
          resolve('UNKNOWN-ID');
        } else {
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
    if (!license) return { status: 'unlicensed' };

    // In a real app, verify the hash. Here we just check if it exists.
    return { status: 'active', key: license.value };
  });

  // 3. Activate Product
  safeHandle('activate-product', (event, key) => {
    // Simple check: Key must start with "WAFI-"
    if (!key.startsWith("WAFI-")) throw new Error("مفتاح غير صالح");

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
          if (row.name) stmt.run({
            barcode: row.barcode || `GEN-${Date.now()}-${Math.random()}`,
            name: row.name,
            cost_price: row.cost || 0,
            sell_price: row.price || 0,
            quantity: row.quantity || 0
          });
        }
      } else if (type === 'customers') {
        const stmt = db.prepare(`
      INSERT OR IGNORE INTO accounts (code, name, type, balance) 
      VALUES (@code, @name, 'ASSET', @balance)
    `);
        for (const row of data) {
          if (row.name) stmt.run({
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
    } catch (err: any) {
      throw new Error("فشل الاستيراد: " + err.message);
    }
  });


  // ============================================
  // GRN (Goods Receipt Note) Handlers
  // ============================================
  safeHandle('grn:save', (_, data) => {
    try { return GRNService.save(data); }
    catch (e: any) { console.error('[GRN:save]', e); throw e; }
  });

  safeHandle('grn:post-to-pending', (_, id) => {
    try { return GRNService.postToPending(id); }
    catch (e: any) { console.error('[GRN:postToPending]', e); throw e; }
  });

  safeHandle('grn:invoice', (_, id) => {
    try { return GRNService.invoiceFromGRN(id); }
    catch (e: any) { console.error('[GRN:invoice]', e); throw e; }
  });

  safeHandle('grn:get', (_, id) => {
    try { return GRNService.get(id); }
    catch (e: any) { console.error('[GRN:get]', e); throw e; }
  });

  safeHandle('grn:list', () => {
    try { return GRNService.list(); }
    catch (e: any) { console.error('[GRN:list]', e); throw e; }
  });

  WorkflowService.register();
  SalesInvoiceService.register();
  PurchaseInvoiceService.register();
  StockTransferService.register();
  JournalVoucherService.register();

  // ----- Procurement Generic Document Services -----
  const PurchaseRequestService = DocumentServiceFactory.createService({
    docType: 'purchase_request',
    tableName: 'purchase_requests',
    lineTableName: 'purchase_request_lines',
    foreignKey: 'request_id',
    headerPrefix: 'PRQ',
    partnerField: 'requester_id',
    hasTotals: false
  });
  PurchaseRequestService.register('purchaseRequests');

  const PurchaseQuotationService = DocumentServiceFactory.createService({
    docType: 'purchase_rfq',
    tableName: 'purchase_rfqs',
    lineTableName: 'purchase_rfq_lines',
    foreignKey: 'rfq_id',
    headerPrefix: 'RFQ',
    partnerField: 'supplier_id',
    hasTotals: false // Usually just QTY & expected terms mapping
  });
  PurchaseQuotationService.register('purchaseQuotations');

  const PurchaseOrderService = DocumentServiceFactory.createService({
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
  const SalesQuotationService = DocumentServiceFactory.createService({
    docType: 'sales_quotation',
    tableName: 'sales_quotations',
    lineTableName: 'sales_quotation_lines',
    foreignKey: 'quotation_id',
    headerPrefix: 'SQ',
    partnerField: 'customer_id',
    hasTotals: true
  });
  SalesQuotationService.register('salesQuotations');

  const SalesOrderService = DocumentServiceFactory.createService({
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

const getBundledRendererPath = () =>
  path.resolve(__dirname, '../../dist/index.html');

const loadRenderer = async (mainWindow: BrowserWindow) => {
  const rendererUrl =
    process.env.VITE_DEV_SERVER_URL ||
    process.env.ELECTRON_RENDERER_URL ||
    DEFAULT_RENDERER_URL;
  const bundledRendererPath = getBundledRendererPath();

  if (!app.isPackaged) {
    try {
      console.log(`[Renderer] Trying dev server: ${rendererUrl}`);
      await mainWindow.loadURL(rendererUrl);
      console.log(`[Renderer] Loaded dev server: ${mainWindow.webContents.getURL()}`);
      return;
    } catch (error) {
      console.warn(`[Renderer] Dev server unavailable, falling back to bundled UI: ${rendererUrl}`);
      console.warn(error);
    }
  }

  if (!fs.existsSync(bundledRendererPath)) {
    throw new Error(`[Renderer] Bundled UI not found at ${bundledRendererPath}`);
  }

  const bundledRendererUrl = pathToFileURL(bundledRendererPath).toString();
  console.log(`[Renderer] Loading bundled UI: ${bundledRendererPath}`);
  await mainWindow.loadURL(bundledRendererUrl);
  console.log(`[Renderer] Loaded bundled UI: ${mainWindow.webContents.getURL()}`);
};

const reportWindowCreationFailure = (error: any) => {
  console.error('[Startup] Failed to create the main window:', error);
  dialog.showErrorBox('WAFI ERP', error?.message || 'Failed to load the application UI.');
};

const createWindow = async () => {

  // Calculate Inverse Scaling to neutralize Windows Scale
  // If Windows is 125% (1.25), we zoom to 80% (0.8) so 1.25 * 0.8 = 1.0 visual scale
  const primaryDisplay = screen.getPrimaryDisplay();
  const scaleFactor = primaryDisplay.scaleFactor;
  const inverseZoom = 1.0 / scaleFactor;

  console.log('Display Scale Factor:', scaleFactor);
  console.log('Applying Inverse Zoom:', inverseZoom);

  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
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
  }, 60_000);

  // Enforce the inverse zoom
  mainWindow.webContents.setZoomFactor(inverseZoom);

  // Enable visual zoom still (Ctrl+/Ctrl-) but starting from our calculated base
  mainWindow.webContents.on('did-finish-load', () => {
    console.log(`[Renderer] did-finish-load: ${mainWindow.webContents.getURL()}`);
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

  mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL, isMainFrame) => {
    if (!isMainFrame) return;
    console.error(`[Renderer] Failed to load (${errorCode}): ${errorDescription} -> ${validatedURL}`);
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
  await loadRenderer(mainWindow);
  mainWindow.on('closed', () => {
    clearInterval(heartbeatTimer);
    concurrentLicenseService?.releaseSession(webContentsId);
    clearAuthSessionByWebContentsId(webContentsId);
  });
};

app.on('ready', async () => {
  // Initialize DB schema
  const dbPath = path.join(app.getPath('userData'), 'wafi.db');
  console.log('Initializing Database at:', dbPath);
  const dbInstance = initDB(dbPath);
  console.log('Database instance created:', !!dbInstance);
  db = dbInstance;

  // [CRITICAL FIX] Clean up rogue triggers that prevent database operations
  try {
    const query = "SELECT name FROM sqlite_master WHERE type = 'trigger' AND (sql LIKE '%business_partners_backup_fix_fk%' OR sql LIKE '%backup_fix_fk%' OR sql LIKE '%gl_journal_headers%')";
    const rogueTriggers = db.prepare(query).all();
    if (rogueTriggers.length > 0) {
      console.log(`[Startup Fix] Found ${rogueTriggers.length} rogue triggers. Cleaning up...`);
      rogueTriggers.forEach((t: any) => {
        try {
          db.prepare(`DROP TRIGGER IF EXISTS "${t.name}"`).run();
          console.log(`[Startup Fix] Dropped rogue trigger: ${t.name}`);
        } catch (e) {
          console.error(`[Startup Fix] Failed to drop trigger ${t.name}`, e);
        }
      });
    }

    // Also drop any backup tables left behind
    const rogueTables = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND (name LIKE '%backup_fix%' OR name LIKE '%business_partners_old%')").all();
    rogueTables.forEach((t: any) => {
      try {
        db.prepare(`DROP TABLE IF EXISTS "${t.name}"`).run();
        console.log(`[Startup Fix] Dropped rogue table: ${t.name}`);
      } catch (e) {
        console.error(`[Startup Fix] Failed to drop table ${t.name}`, e);
      }
    });
  } catch (err) {
    console.error("[Startup Fix] Trigger cleanup failed:", err);
  }

  // Initialize Services that depend on DB
  new CurrencyScraperService();
  importService = new ImportService(db);
  seedSystem();

  // --- Security Capability Engine (registry + scoped snapshot) ---
  const capabilityRegistry = new CapabilityRegistry();
  const permissionEngineRepo = new SqlitePermissionEngineRepo(db);
  permissionEngineRepo.seedCatalog(
    capabilityRegistry.getCatalog(),
    capabilityRegistry.getVersion()
  );
  permissionEngineRepo.seedCapabilityRegistry(capabilityRegistry.getCapabilityRegistryRows());
  permissionSnapshotService = new PermissionSnapshotService(permissionEngineRepo);
  configureAuthContext({
    database: db,
    permissionSnapshotService,
  });

  // --- Global Audit Engine (field-level + IPC guard audit) ---
  const auditRepo = new SqliteAuditRepo(db);
  auditService = new AuditService(auditRepo);
  configureGlobalAuditService(auditService);
  registerAuditIPC(auditService);

  registerSecurityIPC(permissionSnapshotService);

  // --- Dynamic Filters + Saved Views (screen registry + whitelisted query builder) ---
  const screenRegistry = new ScreenRegistry();
  const screenViewsRepo = new SqliteScreenViewsRepo(db);
  const screenQueryBuilder = new ScreenQueryBuilder();
  const screenViewsService = new ScreenViewsService(
    screenViewsRepo,
    screenRegistry,
    screenQueryBuilder,
    auditService
  );
  registerScreenViewsIPC(screenViewsService);

  // --- Printing IPC ---
  registerPrintingIPC();

  // --- Fixed Assets (domain-driven IPC) ---
  const fixedAssetRepo = new SqliteFixedAssetRepo(db);
  const fixedAssetUseCases = new FixedAssetUseCases(fixedAssetRepo);
  registerFixedAssetIPC(fixedAssetUseCases);

  // --- Finance (domain-driven IPC) ---
  const currencyRepo = new SqliteCurrencyRepo(db);
  const costCenterRepo = new SqliteCostCenterRepo(db);
  const taxGroupRepo = new SqliteTaxGroupRepo(db);
  const financeUseCases = new FinanceUseCases(currencyRepo, costCenterRepo, taxGroupRepo);
  registerFinanceIPC(financeUseCases);

  // --- Expense Dimensions (expense types + cost centers + vehicles + reports) ---
  const expenseDimensionsRepo = new SqliteExpenseDimensionsRepo(db);
  const expenseDimensionsUseCases = new ExpenseDimensionsUseCases(expenseDimensionsRepo);
  registerExpenseDimensionsIPC(expenseDimensionsUseCases);

  // --- Accounting Foundation (CoA + Financial Definitions + Account Resolution) ---
  const accountingFoundationRepo = new SqliteAccountingFoundationRepo(db);
  const accountingFoundationUseCases = new AccountingFoundationUseCases(
    accountingFoundationRepo,
    accountingFoundationRepo,
  );
  registerAccountingFoundationIPC(accountingFoundationUseCases);

  // --- Fixed-Width Chart of Accounts Foundation ---
  const chartOfAccountsRepo = new SqliteChartOfAccountsRepo(db);
  const chartOfAccountsSeedService = new ChartOfAccountsSeedService(chartOfAccountsRepo);
  const chartOfAccountsUseCases = new ChartOfAccountsUseCases(
    chartOfAccountsRepo,
    chartOfAccountsSeedService,
  );
  registerChartOfAccountsIPC(chartOfAccountsUseCases);

  // --- Financial Definitions + Account Resolution Engine ---
  const accountingResolutionRepo = new SqliteAccountingResolutionRepo(db);
  const accountingResolutionUseCases = new AccountingResolutionUseCases(accountingResolutionRepo);
  SalesService.configureAccountResolutionUseCases(accountingResolutionUseCases);
  registerAccountingResolutionIPC(accountingResolutionUseCases);

  // --- Central Journal Engine (posting + reversal + source query) ---
  const journalHeaderRepo = new SqliteJournalHeaderRepo(db);
  const journalLineRepo = new SqliteJournalLineRepo(db);
  const postingRegistryRepo = new SqlitePostingRegistryRepo(db);
  const journalFiscalPeriodRepo = new SqliteJournalFiscalPeriodRepo(db);
  const journalAccountLookupRepo = new SqliteJournalAccountLookupRepo(db);
  const journalEngineService = new JournalEngineService({
    database: db,
    journalsRepo: journalHeaderRepo,
    journalLinesRepo: journalLineRepo,
    postingRegistryRepo,
    fiscalPeriodRepo: journalFiscalPeriodRepo,
    accountLookupRepo: journalAccountLookupRepo,
  });
  const journalEngineUseCases = new JournalEngineUseCases(journalEngineService);
  SalesInvoiceService.configurePostingPipeline({
    accountResolutionUseCases: accountingResolutionUseCases,
    journalEngineUseCases,
  });
  PurchaseInvoiceService.configurePostingPipeline({
    accountResolutionUseCases: accountingResolutionUseCases,
    journalEngineUseCases,
  });
  registerAccountingJournalsIPC(journalEngineUseCases);

  // --- Sales Invoice Accounting Pipeline (Account Resolution -> Journal Engine) ---
  const salesInvoiceAccountingRepo = new SqliteSalesInvoiceAccountingRepo(db);
  const salesInvoicePostingBuilder = new SalesInvoicePostingBuilder(
    accountingResolutionUseCases,
    salesInvoiceAccountingRepo,
  );
  const salesInvoiceAccountingService = new SalesInvoiceAccountingService(
    salesInvoiceAccountingRepo,
    salesInvoicePostingBuilder,
    journalEngineUseCases,
  );
  const salesInvoiceAccountingUseCases = new SalesInvoiceAccountingUseCases(salesInvoiceAccountingService);
  registerSalesInvoiceAccountingIPC(salesInvoiceAccountingUseCases);

  // --- Purchase Invoice Accounting Pipeline (Account Resolution -> Journal Engine) ---
  const purchaseInvoiceAccountingRepo = new SqlitePurchaseInvoiceAccountingRepo(db);
  const purchaseInvoicePostingBuilder = new PurchaseInvoicePostingBuilder(
    accountingResolutionUseCases,
    purchaseInvoiceAccountingRepo,
  );
  const purchaseInvoiceAccountingService = new PurchaseInvoiceAccountingService(
    purchaseInvoiceAccountingRepo,
    purchaseInvoicePostingBuilder,
    journalEngineUseCases,
  );
  const purchaseInvoiceAccountingUseCases = new PurchaseInvoiceAccountingUseCases(purchaseInvoiceAccountingService);
  PurchaseInvoiceService.configureAccountingUseCases(purchaseInvoiceAccountingUseCases);
  registerPurchaseInvoiceAccountingIPC(purchaseInvoiceAccountingUseCases);

  // --- Inventory Documents Posting Pipeline (Inventory -> Account Resolution -> Journal Engine) ---
  const inventoryDocumentRepo = new SqliteInventoryDocumentRepo(db);
  const inventoryPostingBuilder = new InventoryPostingBuilder(
    accountingResolutionUseCases,
    inventoryDocumentRepo,
  );
  const inventoryDocumentService = new InventoryDocumentService(
    inventoryDocumentRepo,
    inventoryPostingBuilder,
    journalEngineUseCases,
  );
  const inventoryDocumentUseCases = new InventoryDocumentUseCases(inventoryDocumentService);
  registerInventoryDocumentIPC(inventoryDocumentUseCases);

  // --- Treasury Documents + Cheque Lifecycle (Treasury -> Account Resolution -> Journal Engine) ---
  const treasuryRepo = new SqliteTreasuryRepo(db);
  const treasuryPostingBuilder = new TreasuryPostingBuilder(
    accountingResolutionUseCases,
    treasuryRepo,
  );
  const treasuryChequeLifecycleService = new TreasuryChequeLifecycleService(
    treasuryRepo,
    accountingResolutionUseCases,
    journalEngineUseCases,
  );
  const treasuryDocumentService = new TreasuryDocumentService(
    treasuryRepo,
    treasuryPostingBuilder,
    treasuryChequeLifecycleService,
    journalEngineUseCases,
  );
  const treasuryDocumentUseCases = new TreasuryDocumentUseCases(treasuryDocumentService);
  const treasuryChequeUseCases = new TreasuryChequeUseCases(treasuryChequeLifecycleService);
  registerTreasuryDocumentIPC(treasuryDocumentUseCases);
  registerTreasuryChequeIPC(treasuryChequeUseCases);

  // --- Sales Operations Foundation (Quotation -> Order -> Delivery -> Return) ---
  const salesOperationsRepo = new SqliteSalesOperationsRepo(db);
  const salesStockLedgerService = new SalesStockLedgerService(salesOperationsRepo);
  const salesOperationsAccountingBuilder = new SalesOperationsAccountingBuilder(
    accountingResolutionUseCases,
    salesOperationsRepo,
  );
  const salesOperationsService = new SalesOperationsService(
    salesOperationsRepo,
    salesStockLedgerService,
    salesOperationsAccountingBuilder,
    journalEngineUseCases,
  );
  const salesOperationsUseCases = new SalesOperationsUseCases(salesOperationsService);
  registerSalesQuotationIPC(salesOperationsUseCases);
  registerSalesOrderIPC(salesOperationsUseCases);
  registerDeliveryNoteIPC(salesOperationsUseCases);
  registerSalesReturnIPC(salesOperationsUseCases);

  // --- Purchase Operations Foundation (Request -> RFQ -> Order -> GRN -> Return) ---
  const purchaseOperationsRepo = new SqlitePurchaseOperationsRepo(db);
  const purchaseStockLedgerService = new PurchaseStockLedgerService(purchaseOperationsRepo);
  const purchaseOperationsAccountingBuilder = new PurchaseOperationsAccountingBuilder(
    accountingResolutionUseCases,
    purchaseOperationsRepo,
  );
  const purchaseOperationsService = new PurchaseOperationsService(
    purchaseOperationsRepo,
    purchaseStockLedgerService,
    purchaseOperationsAccountingBuilder,
    journalEngineUseCases,
  );
  const purchaseOperationsUseCases = new PurchaseOperationsUseCases(purchaseOperationsService);
  registerPurchaseRequestIPC(purchaseOperationsUseCases);
  registerPurchaseRfqIPC(purchaseOperationsUseCases);
  registerPurchaseOrderIPC(purchaseOperationsUseCases);
  registerGoodsReceiptNoteIPC(purchaseOperationsUseCases);
  registerPurchaseReturnIPC(purchaseOperationsUseCases);

  // --- Manufacturing Foundation (BOM -> Routing -> Production Order -> Issue/Receipt) ---
  const manufacturingRepo = new SqliteManufacturingRepo(db);
  const manufacturingStockLedgerService = new ManufacturingStockLedgerService(manufacturingRepo);
  const manufacturingAccountingBuilder = new ManufacturingAccountingBuilder(
    accountingResolutionUseCases,
    manufacturingRepo,
  );
  const manufacturingDomainService = new ManufacturingDomainService(
    manufacturingRepo,
    manufacturingStockLedgerService,
    manufacturingAccountingBuilder,
    journalEngineUseCases,
  );
  const manufacturingUseCases = new ManufacturingUseCases(manufacturingDomainService);
  registerManufacturingIPC(manufacturingUseCases);

  // --- CRM + Receivables Foundation (Customer Master -> Credit Control -> Statement/Aging/Timeline) ---
  const customerReceivablesRepo = new SqliteCustomerReceivablesRepo(db);
  const customerReceivablesService = new CustomerReceivablesService(customerReceivablesRepo);
  const customerReceivablesUseCases = new CustomerReceivablesUseCases(customerReceivablesService);
  registerCustomerReceivablesIPC(customerReceivablesUseCases);

  // --- Vendor + Payables Foundation (Vendor Master -> Payment Control -> Statement/Aging/Timeline) ---
  const vendorPayablesRepo = new SqliteVendorPayablesRepo(db);
  const vendorPayablesService = new VendorPayablesService(vendorPayablesRepo);
  const vendorPayablesUseCases = new VendorPayablesUseCases(vendorPayablesService);
  registerVendorPayablesIPC(vendorPayablesUseCases);

  // --- Financial Platform (Accounting/Treasury/Risk/Revenue/Carbon/Analytics) ---
  const financialPlatformRepo = new SqliteFinancialPlatformRepo(db);
  const financialPlatformUseCases = new FinancialPlatformUseCases(financialPlatformRepo);
  registerFinancialPlatformIPC(financialPlatformUseCases);

  // --- Runtime Governance (Concurrent seats + Attachments quota/chunking) ---
  const runtimeGovernanceRepo = new SqliteRuntimeGovernanceRepo(db);
  concurrentLicenseService = new ConcurrentLicenseService(runtimeGovernanceRepo);
  attachmentStorageService = new AttachmentStorageService(runtimeGovernanceRepo);
  registerRuntimeGovernanceIPC({
    concurrentLicenseService,
    attachmentStorageService,
  });

  // Register IPC handlers
  registerIPCHandlers(db);

  // Note: wafi:// protocol handler is registered in app.whenReady() above

  try {
    await createWindow();
  } catch (error: any) {
    reportWindowCreationFailure(error);
    app.quit();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  for (const win of BrowserWindow.getAllWindows()) {
    const wcId = win.webContents.id;
    concurrentLicenseService?.releaseSession(wcId);
    clearAuthSessionByWebContentsId(wcId);
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    void createWindow().catch(reportWindowCreationFailure);
  }
});
