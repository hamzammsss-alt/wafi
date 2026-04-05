import { app, BrowserWindow, ipcMain, screen, dialog, protocol, net } from 'electron';
import { pathToFileURL } from 'url';
import path from 'path';
import fs from 'fs';

import { initDB, seedCOA, seedSystem } from './database';

// Disable security warnings in dev
process.env['ELECTRON_DISABLE_SECURITY_WARNINGS'] = 'true';

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
import { BranchService } from './services/BranchService';
import { AccountService } from './services/AccountService';
import { ItemService } from './services/ItemService';
import { PartnerService } from './services/PartnerService';
import { FinancialDefinitionService } from './services/FinancialDefinitionService';
// JournalService imported only once
import { JournalService } from './services/JournalService';
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



let db: any;

// Services will be initialized after DB is ready in app.on('ready')
let importService: ImportService;

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
  ipcMain.handle('reseed-accounts', () => {
    try {
      seedCOA();
      return { success: true };
    } catch (error: any) {
      console.error('Reseed failed:', error);
      throw error;
    }
  });

  // Get Accounts
  ipcMain.handle('get-account', (event, id) => {
    return db.prepare('SELECT * FROM accounts WHERE id = ?').get(id);
  });


  // Get Transactional Accounts Only (for dropdowns in vouchers)
  ipcMain.handle('get-transactional-accounts', () => {
    return db.prepare('SELECT * FROM accounts WHERE is_transactional = 1 ORDER BY code').all();
  });

  // Get Account Tree (hierarchical structure)


  // Get Account Children
  ipcMain.handle('get-account-children', (event, parentId) => {
    return db.prepare('SELECT * FROM accounts WHERE parent_id = ? ORDER BY code').all(parentId);
  });

  // Get Account Path (breadcrumb from root to account)
  ipcMain.handle('get-account-path', (event, accountId) => {
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
  ipcMain.handle('add-account', (event, account) => {
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
  ipcMain.handle('update-account', (event, account) => {
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
  ipcMain.handle('crud-operation', (event, { operation, table, data, id }) => {
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
  ipcMain.handle('save-transaction', async (event, data) => {
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
  ipcMain.handle('save-receipt-voucher', (event, data) => {
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
  ipcMain.handle('inventory:get-brands', () => InventoryService.getBrands());
  ipcMain.handle('inventory:create-brand', (event, brand) => InventoryService.createBrand(brand));
  ipcMain.handle('inventory:update-brand', (event, brand) => InventoryService.updateBrand(brand));
  ipcMain.handle('inventory:delete-brand', (event, id) => InventoryService.deleteBrand(id));
  ipcMain.handle('inventory:delete-unit', (event, id) => InventoryService.deleteUnit(id));

  ipcMain.handle('inventory:get-items-v2', () => InventoryService.getItems());
  ipcMain.handle('inventory:get-item-details', (event, id) => InventoryService.getItemDetails(id));
  ipcMain.handle('inventory:create-item', (event, item) => InventoryService.createItem(item));
  ipcMain.handle('inventory:update-item', (event, item) => InventoryService.updateItem(item));
  ipcMain.handle('inventory:bulk-update-items', (event, updates) => InventoryService.bulkUpdateItems(updates));
  ipcMain.handle('save-item', (event, item) => InventoryService.updateItem(item)); // Alias for legacy calls

  // Stock Take
  ipcMain.handle('inventory:get-stock-takes', () => InventoryService.getStockTakes());
  ipcMain.handle('inventory:get-stock-take', (event, id) => InventoryService.getStockTake(id));
  ipcMain.handle('inventory:create-stock-take', (event, data) => InventoryService.createStockTake(data));
  ipcMain.handle('inventory:update-stock-take-item', (event, id, qty) => InventoryService.updateStockTakeItem(id, qty));
  ipcMain.handle('inventory:approve-stock-take', (event, id) => InventoryService.approveStockTake(id));

  // Period Closing
  ipcMain.handle('inventory:get-last-closing-date', () => InventoryService.getLastClosingDate());
  ipcMain.handle('inventory:close-period', (event, date) => InventoryService.closePeriod(date));

  ipcMain.handle('inventory:get-batches', (event, itemId) => InventoryService.getBatches(itemId));
  ipcMain.handle('inventory:create-batch', (event, batch) => InventoryService.createBatch(batch));

  ipcMain.handle('inventory:transfer-request', (event, data) => InventoryService.createTransferRequest(data));

  // Attributes
  ipcMain.handle('inventory:get-attributes', () => InventoryService.getAttributeDefinitions());
  ipcMain.handle('inventory:save-attribute', (_, attr) => InventoryService.saveAttributeDefinition(attr));
  ipcMain.handle('inventory:delete-attribute', (_, id) => InventoryService.deleteAttribute(id));

  // Attribute Values
  ipcMain.handle('inventory:get-attribute-values', (_, attrId) => InventoryService.getAttributeValues(attrId));
  ipcMain.handle('inventory:save-attribute-value', (_, data) => InventoryService.saveAttributeValue(data));
  ipcMain.handle('inventory:delete-attribute-value', (_, id) => InventoryService.deleteAttributeValue(id));




  // --- Partner Handlers (New Master Data) ---
  ipcMain.handle('partner:get-customer-types', () => PartnerService.getCustomerTypes());
  ipcMain.handle('partner:save-customer-type', (event, data) => PartnerService.saveCustomerType(data));
  ipcMain.handle('partner:delete-customer-type', (event, id) => PartnerService.deleteCustomerType(id));

  ipcMain.handle('partner:get-vendor-types', () => PartnerService.getVendorTypes());
  ipcMain.handle('partner:save-vendor-type', (event, data) => PartnerService.saveVendorType(data));
  ipcMain.handle('partner:delete-vendor-type', (event, id) => PartnerService.deleteVendorType(id));

  ipcMain.handle('partner:get-regions', () => PartnerService.getRegions());
  ipcMain.handle('partner:save-region', (event, data) => PartnerService.saveRegion(data)); // Handles create/update
  // Explicit create/update if needed by frontend, but saveRegion wraps them
  ipcMain.handle('partner:create-region', (event, data) => PartnerService.createRegion(data));
  ipcMain.handle('partner:update-region', (event, data) => PartnerService.updateRegion(data));
  ipcMain.handle('partner:delete-region', (event, id) => PartnerService.deleteRegion(id));

  ipcMain.handle('partner:get-groups', () => PartnerService.getGroups());
  ipcMain.handle('partner:save-group', (event, data) => PartnerService.saveGroup(data));
  ipcMain.handle('partner:delete-group', (event, id) => PartnerService.deleteGroup(id));

  ipcMain.handle('partner:get-sales-reps', () => PartnerService.getSalesReps());
  ipcMain.handle('partner:save-sales-rep', (event, data) => PartnerService.saveSalesRep(data));
  ipcMain.handle('partner:delete-sales-rep', (event, id) => PartnerService.deleteSalesRep(id));

  ipcMain.handle('partner:get-price-lists', () => PartnerService.getPriceLists());
  ipcMain.handle('partner:save-price-list', (event, data) => PartnerService.savePriceList(data));
  ipcMain.handle('partner:delete-price-list', (event, id) => PartnerService.deletePriceList(id));
  ipcMain.handle('partner:get-price-list-items', (event, id) => PartnerService.getPriceListItems(id));
  ipcMain.handle('partner:save-price-list-item', (event, data) => PartnerService.savePriceListItem(data));
  ipcMain.handle('partner:delete-price-list-item', (event, id) => PartnerService.deletePriceListItem(id));

  // --- Warehouse Handlers ---
  ipcMain.handle('get-warehouses', () => InventoryService.getWarehouses());
  ipcMain.handle('create-warehouse', (event, wh) => InventoryService.createWarehouse(wh));
  ipcMain.handle('update-warehouse', (event, wh) => InventoryService.updateWarehouse(wh));
  ipcMain.handle('delete-warehouse', (event, id) => InventoryService.deleteWarehouse(id));
  // Map inventory: names too for consistency if needed
  ipcMain.handle('inventory:get-warehouses', () => InventoryService.getWarehouses());
  ipcMain.handle('inventory:create-warehouse', (event, wh) => InventoryService.createWarehouse(wh));
  ipcMain.handle('inventory:update-warehouse', (event, wh) => InventoryService.updateWarehouse(wh));
  ipcMain.handle('inventory:delete-warehouse', (event, id) => InventoryService.deleteWarehouse(id));

  // --- Stock Handlers ---
  ipcMain.handle('get-stock', (event, { itemId, warehouseId }) => {
    return InventoryService.getStock(itemId, warehouseId);
  });

  ipcMain.handle('inventory:get-valuation', (event, filters) => InventoryService.getInventoryValuation(filters));

  ipcMain.handle('add-stock-transaction', (event, trx) => {
    return InventoryService.addStockTransaction(trx);
  });
  // --- Bins ---
  ipcMain.handle('get-warehouse-bins', (event, warehouseId) => InventoryService.getBins(warehouseId));
  ipcMain.handle('create-warehouse-bin', (event, bin) => InventoryService.createBin(bin));
  ipcMain.handle('delete-warehouse-bin', (event, id) => InventoryService.deleteBin(id));

  // --- Stock Documents ---
  ipcMain.handle('inventory-get-grns', () => InventoryService.getGoodsReceipts());
  ipcMain.handle('inventory-get-dispatches', () => InventoryService.getDispatches());
  ipcMain.handle('create-stock-document', (event, doc) => InventoryService.createStockDocument(doc));

  // --- Logistics ---
  ipcMain.handle('logistics-get-drivers', () => LogisticsService.getDrivers());
  ipcMain.handle('logistics-save-driver', (event, data) => LogisticsService.saveDriver(data));
  ipcMain.handle('logistics-delete-driver', (event, id) => LogisticsService.deleteDriver(id));
  ipcMain.handle('logistics-get-vehicles', () => LogisticsService.getVehicles());
  ipcMain.handle('logistics-save-vehicle', (event, data) => LogisticsService.saveVehicle(data));
  ipcMain.handle('logistics-delete-vehicle', (event, id) => LogisticsService.deleteVehicle(id));

  // --- Stock Taking Handlers ---
  // Handlers registered above with 'inventory:' prefix. Legacy handlers below removed.
  // ipcMain.handle('get-stock-takes', (event) => InventoryService.getStockTakes());
  // ipcMain.handle('get-stock-take', (event, id) => InventoryService.getStockTake(id));  // ipcMain.handle('get-inventory-dashboard', () => InventoryService.getInventoryDashboard());

  ipcMain.handle('inventory:receive-transfer', (event, data) => InventoryService.receiveTransfer(data));

  // --- Assembly ---
  ipcMain.handle('inventory:get-kit', (event, itemId) => InventoryService.getKit(itemId));
  ipcMain.handle('inventory:create-assembly', (event, data) => InventoryService.createAssembly(data));

  // --- Reports Handlers ---
  ipcMain.handle('reports-get-item-movement', (event, filters) => ReportService.getItemMovement(filters));
  ipcMain.handle('reports-get-top-customers', (event) => ReportService.getTopCustomers());
  ipcMain.handle('get-report-pnl', (event, range) => ReportService.getReportPnL(range));
  ipcMain.handle('get-trial-balance', (event, params) => ReportService.getTrialBalance()); // Modified signature match

  // Register ALL other reports
  ipcMain.handle('reports-get-partner-ledger', (event, filters) => ReportService.getPartnerLedger(filters));
  ipcMain.handle('reports-get-inventory-status', () => ReportService.getInventoryStatus());
  ipcMain.handle('reports-get-sales-analytics', (event, range) => ReportService.getSalesAnalytics(range));
  ipcMain.handle('reports-get-profitability', (event, range) => ReportService.getProfitabilityReport(range));
  ipcMain.handle('reports-get-purchasing-analysis', (event, range) => ReportService.getPurchasingAnalysis(range));
  ipcMain.handle('reports-get-purchases-by-vendor', (event, range) => ReportService.getPurchasesByVendor(range));
  ipcMain.handle('reports-get-import-reports', () => ReportService.getImportReports());
  ipcMain.handle('reports-get-cheques', (event, filters) => ReportService.getChequesReport(filters));
  ipcMain.handle('reports-get-account-statement', (event, filters) => ReportService.getAccountStatement(filters));
  ipcMain.handle('reports-get-aging', () => ReportService.getAgingReport());
  ipcMain.handle('reports-get-tax', (event, range) => ReportService.getTaxReport(range));
  ipcMain.handle('get-dashboard-kpis', () => ReportService.getDashboardKPIs());
  ipcMain.handle('get-dashboard-charts', () => ReportService.getDashboardCharts());

  ipcMain.handle('reports-get-slow-moving', (event, days) => ReportService.getSlowMovingItems(days));
  ipcMain.handle('reports-get-expiry', (event, days) => ReportService.getExpiryReport(days));

  ipcMain.handle('save-invoice', (event, data) => SalesService.createInvoice(data));
  ipcMain.handle('get-next-invoice-no', (event) => SalesService.getNextInvoiceNumber());

  // 4. Check Management Handlers
  ipcMain.handle('get-checks', (event, status) => CheckService.getChecks(status));
  ipcMain.handle('register-check', (event, { data, customerId, reference, userId }) => CheckService.registerCheck(data, customerId, reference, userId));
  ipcMain.handle('update-check-status', (event, data) => CheckService.updateStatus(data));



  // 5. HR & Payroll Handlers
  // Organization
  ipcMain.handle('hr-get-departments', () => HRService.getDepartments());
  ipcMain.handle('hr-save-department', (event, data) => HRService.saveDepartment(data));
  ipcMain.handle('hr-delete-department', (event, id) => HRService.deleteDepartment(id));

  ipcMain.handle('hr-get-job-titles', () => HRService.getJobTitles());
  ipcMain.handle('hr-get-titles', () => HRService.getJobTitles()); // Alias for hr.getTitles
  ipcMain.handle('hr-save-job-title', (event, data) => HRService.saveJobTitle(data));
  ipcMain.handle('hr-save-title', (event, data) => HRService.saveJobTitle(data)); // Alias
  ipcMain.handle('hr-delete-job-title', (event, id) => HRService.deleteJobTitle(id));
  ipcMain.handle('hr-delete-title', (event, id) => HRService.deleteJobTitle(id)); // Alias

  // Employees
  ipcMain.handle('hr-get-employees', () => HRService.getEmployees());
  ipcMain.handle('hr-get-employee', (event, id) => HRService.getEmployee(id));
  ipcMain.handle('hr-save-employee', (event, data) => HRService.saveEmployee(data));
  ipcMain.handle('hr-get-next-code', () => HRService.getNextEmployeeCode());
  ipcMain.handle('hr-save-photo', (event, { buffer, name }) => HRService.saveEmployeePhoto(buffer, name));

  // Attendance
  ipcMain.handle('hr-get-shifts', () => AttendanceService.getShifts());
  ipcMain.handle('hr-save-shift', (event, data) => AttendanceService.saveShift(data));
  ipcMain.handle('hr-import-attendance', (event, records) => AttendanceService.importAttendanceRaw(records));
  ipcMain.handle('hr-process-daily-attendance', (event, date) => AttendanceService.processDayAttendance(date));
  ipcMain.handle('hr-process-attendance', (event, date) => AttendanceService.processDayAttendance(date)); // Alias
  ipcMain.handle('hr-get-daily-attendance', (event, date) => AttendanceService.getDailyAttendance(date));

  // Leaves
  ipcMain.handle('hr-get-leave-types', () => LeaveService.getLeaveTypes());
  ipcMain.handle('hr-save-leave-type', (event, data) => LeaveService.saveLeaveType(data));
  ipcMain.handle('hr-delete-leave-type', (event, id) => LeaveService.deleteLeaveType(id));
  ipcMain.handle('hr-get-leave-requests', (event, filter) => LeaveService.getLeaveRequests(filter));
  ipcMain.handle('hr-save-leave-request', (event, data) => LeaveService.saveLeaveRequest(data));
  ipcMain.handle('hr-update-leave-status', (event, { id, status, reason }) => LeaveService.updateRequestStatus(id, status, reason));
  ipcMain.handle('hr-get-employee-balances', (event, { employeeId, year }) => LeaveService.getEmployeeBalances(employeeId, year));

  // Payroll
  ipcMain.handle('hr-get-payroll-preview', (event, { month, year }) => PayrollService.generatePayrollPreview(month, year));
  ipcMain.handle('hr-post-payroll', (event, { month, year, slips }) => PayrollService.postPayroll(month, year, slips));
  ipcMain.handle('hr-save-advance', (event, data) => PayrollService.saveAdvance(data));
  ipcMain.handle('hr-get-slips', (event, { month, year }) => PayrollService.getSlips(month, year));
  ipcMain.handle('hr-calc-eos', (event, { employeeId, endDate }) => PayrollService.calculateEOS(employeeId, endDate));


  // HR - Production & Commission
  ipcMain.handle('hr-get-production-logs', (event, date) => ProductionService.getLogs(date));
  ipcMain.handle('hr-save-production-log', (event, data) => ProductionService.saveLog(data));
  ipcMain.handle('hr-delete-production-log', (event, id) => ProductionService.deleteLog(id));

  ipcMain.handle('hr-get-commissions', (event, { month, year }) => CommissionService.getCommissions(month, year));
  ipcMain.handle('hr-save-commissions', (event, data) => CommissionService.saveCommissions(data));

  ipcMain.handle('hr-generate-salary-entry', (event, { month, year }) => PayrollService.generateSalaryEntry(month, year));





  // 6. Fixed Assets Handlers
  ipcMain.handle('get-assets', () => AssetService.getAssets());
  ipcMain.handle('save-asset', (event, data) => AssetService.saveAsset(data));
  ipcMain.handle('calc-depreciation', (event, assetId) => AssetService.calculateDepreciation(assetId));
  ipcMain.handle('post-depreciation', (event, { assetId, amount, date }) => AssetService.postDepreciation(assetId, amount, date));
  ipcMain.handle('get-asset-categories', () => AssetService.getCategories());
  ipcMain.handle('save-asset-category', (event, data) => AssetService.saveCategory(data));
  ipcMain.handle('get-next-asset-code', () => AssetService.getNextCode());

  // 7. System & Auth Handlers
  ipcMain.handle('auth-login', (event, { username, password }) => AuthService.login(username, password));
  ipcMain.handle('auth-change-password', (event, { userId, oldPass, newPass }) => AuthService.changePassword(userId, oldPass, newPass));

  ipcMain.handle('get-users', () => AuthService.getUsers());
  ipcMain.handle('save-user', (event, user) => user.id ? AuthService.updateUser(user) : AuthService.createUser(user));
  ipcMain.handle('delete-user', (event, id) => AuthService.deleteUser(id));

  ipcMain.handle('get-roles', () => AuthService.getRoles());
  ipcMain.handle('save-role', (event, role) => role.id ? AuthService.updateRole(role) : AuthService.createRole(role));
  ipcMain.handle('delete-role', (event, id) => AuthService.deleteRole(id));

  ipcMain.handle('get-permissions', (event, roleId) => AuthService.getPermissions(roleId));
  ipcMain.handle('save-permissions', (event, { roleId, permissions }) => AuthService.savePermissions(roleId, permissions));



  // 8. System Maintenance
  ipcMain.handle('backup-database', () => SystemService.backupDatabase());
  ipcMain.handle('restore-database', () => SystemService.restoreDatabase());
  ipcMain.handle('check-integrity', () => SystemService.checkIntegrity());
  ipcMain.handle('get-audit-logs', (event, filters) => SystemService.getAuditLogs(filters));
  // --- Purchase Handlers ---
  ipcMain.handle('purchase-create-invoice', (event, data) => PurchaseService.createInvoice(data));
  ipcMain.handle('purchase-get-invoices', () => PurchaseService.getInvoices());
  ipcMain.handle('purchase-get-invoice', (event, id) => PurchaseService.getInvoice(id));
  ipcMain.handle('purchase-get-next-no', () => PurchaseService.getNextInvoiceNo());

  ipcMain.handle('purchase-create-order', (event, data) => PurchaseService.createOrder(data));
  ipcMain.handle('purchase-get-orders', () => PurchaseService.getOrders());
  ipcMain.handle('purchase-get-order', (event, id) => PurchaseService.getOrder(id));
  ipcMain.handle('purchase-update-order', (event, data) => PurchaseService.updateOrder(data));
  ipcMain.handle('purchase-delete-order', (event, id) => PurchaseService.deleteOrder(id));

  ipcMain.handle('purchase-create-request', (event, data) => PurchaseService.createRequest(data));
  ipcMain.handle('purchase-get-requests', () => PurchaseService.getRequests());
  ipcMain.handle('purchase-get-request', (event, id) => PurchaseService.getRequest(id));
  ipcMain.handle('purchase-update-request', (event, data) => PurchaseService.updateRequest(data));
  ipcMain.handle('purchase-delete-request', (event, id) => PurchaseService.deleteRequest(id));

  // RFQ
  ipcMain.handle('purchase-create-rfq', (event, data) => PurchaseService.createRFQ(data));
  ipcMain.handle('purchase-get-rfqs', () => PurchaseService.getRFQs());
  ipcMain.handle('purchase-get-rfq', (event, id) => PurchaseService.getRFQ(id));
  ipcMain.handle('purchase-update-rfq', (event, data) => PurchaseService.updateRFQ(data));


  ipcMain.handle('purchase-create-return', (event, data) => PurchaseService.createReturn(data));
  ipcMain.handle('purchase-get-returns', () => PurchaseService.getReturns());
  ipcMain.handle('purchase-get-return', (event, id) => PurchaseService.getReturn(id));
  ipcMain.handle('get-settings', () => SystemService.getSettings());
  ipcMain.handle('save-settings', (event, data) => SystemService.saveSettings(data));
  ipcMain.handle('save-logo', (event, { buffer, name }) => SystemService.saveLogo(buffer, name));
  ipcMain.handle('system:save-image', (event, { buffer, name }) => SystemService.saveImage(buffer, name));

  ipcMain.handle('dialog:open-file', async (event, options) => {
    const { canceled, filePaths } = await dialog.showOpenDialog(options);
    if (canceled) return { canceled: true, filePaths: [] };
    return { canceled: false, filePaths };
  });

  // --- Currency Handlers ---
  ipcMain.handle('get-currencies', () => CurrencyService.getCurrencies());
  ipcMain.handle('get-base-currency', () => CurrencyService.getBaseCurrency());
  ipcMain.handle('create-currency', (event, currency) => CurrencyService.createCurrency(currency));
  ipcMain.handle('update-currency', (event, currency) => CurrencyService.updateCurrency(currency));
  ipcMain.handle('delete-currency', (event, id) => CurrencyService.deleteCurrency(id));

  // Manual Trigger for Scraper
  ipcMain.handle('currency-scraper-trigger', async () => {
    const service = new CurrencyScraperService(); // Or use singleton if exported
    return await service.updateRates();
  });

  ipcMain.handle('currency-get-history', (event, { code, days }) => CurrencyService.getCurrencyHistory(code, days));

  // --- Branch Handlers ---
  ipcMain.handle('get-branches', () => BranchService.getBranches());
  ipcMain.handle('save-branch', (event, branch) => branch.id ? BranchService.updateBranch(branch) : BranchService.createBranch(branch));
  ipcMain.handle('delete-branch', (event, id) => BranchService.deleteBranch(id));

  // --- Account Handlers ---
  ipcMain.handle('get-accounts', () => AccountService.getAccounts());
  ipcMain.handle('get-account-tree', () => AccountService.getAccountTree());
  ipcMain.handle('save-account', (event, account) => account.id ? AccountService.updateAccount(account) : AccountService.createAccount(account));
  ipcMain.handle('delete-account', (event, id) => AccountService.deleteAccount(id));
  ipcMain.handle('get-account-by-id', (event, id) => {
    const acc = db.prepare("SELECT * FROM gl_chart_of_accounts WHERE id = ?").get(id);
    return acc;
  });

  // --- Inventory (Items) ---
  ipcMain.handle('get-items', () => ItemService.getItems());
  // ipcMain.handle('save-item', (event, item) => ItemService.saveItem(item)); // DUPLICATE REMOVED
  ipcMain.handle('delete-item', (event, id) => ItemService.deleteItem(id));
  ipcMain.handle('get-units', () => ItemService.getUnits());
  ipcMain.handle('inventory:get-units', () => InventoryService.getUnits()); // Add this handler for frontend compatibility
  ipcMain.handle('create-unit', (event, unit) => ItemService.createUnit(unit));
  ipcMain.handle('delete-unit', (event, id) => ItemService.deleteUnit(id));
  ipcMain.handle('get-categories', () => ItemService.getCategories());
  ipcMain.handle('create-category', (event, cat) => ItemService.createCategory(cat));
  ipcMain.handle('update-category', (event, cat) => ItemService.updateCategory(cat));
  ipcMain.handle('delete-category', (event, id) => ItemService.deleteCategory(id));

  // --- Inventory V2 Handlers ---
  // Moved to top of file to avoid duplicate registration errors.


  // Inventory Attributes
  ipcMain.handle('inventory:getAttributes', () => ItemService.getAttributesDefinitions());
  ipcMain.handle('inventory:saveAttribute', (event, data) => ItemService.saveAttributeDefinition(data));
  ipcMain.handle('inventory:saveAttributeValue', (event, data) => ItemService.saveAttributeValue(data));
  ipcMain.handle('inventory:deleteAttribute', (event, id) => ItemService.deleteAttributeDefinition(id));
  ipcMain.handle('inventory:deleteAttributeValue', (event, id) => ItemService.deleteAttributeValue(id));

  // --- Partners (Customers/Suppliers) ---
  ipcMain.handle('get-partners', (event, type) => PartnerService.getPartners(type));
  ipcMain.handle('get-partner', (event, id) => PartnerService.getPartner(id));
  ipcMain.handle('save-partner', (event, partner) => partner.id ? PartnerService.updatePartner(partner) : PartnerService.createPartner(partner));
  ipcMain.handle('delete-partner', (event, id) => PartnerService.deletePartner(id));



  // Price Lists
  ipcMain.handle('partner:getPriceLists', () => PartnerService.getPriceLists());
  ipcMain.handle('partner:savePriceList', (event, data) => PartnerService.savePriceList(data));
  ipcMain.handle('partner:deletePriceList', (event, id) => PartnerService.deletePriceList(id));
  ipcMain.handle('partner:getPriceListItems', (event, listId) => PartnerService.getPriceListItems(listId));
  ipcMain.handle('partner:savePriceListItem', (event, data) => PartnerService.savePriceListItem(data));
  ipcMain.handle('partner:deletePriceListItem', (event, id) => PartnerService.deletePriceListItem(id));

  // --- Financial Definitions ---
  ipcMain.handle('finance:getTaxes', () => FinancialDefinitionService.getTaxes());
  ipcMain.handle('finance:saveTax', (event, data) => FinancialDefinitionService.saveTax(data));
  ipcMain.handle('finance:deleteTax', (event, id) => FinancialDefinitionService.deleteTax(id));

  ipcMain.handle('finance:getAnalysisCodes', () => FinancialDefinitionService.getAnalysisCodes());
  ipcMain.handle('finance:getAnalysisCodesFlat', () => FinancialDefinitionService.getAnalysisCodesFlat());
  ipcMain.handle('finance:saveAnalysisCode', (event, data) => FinancialDefinitionService.saveAnalysisCode(data));
  ipcMain.handle('finance:deleteAnalysisCode', (event, id) => FinancialDefinitionService.deleteAnalysisCode(id));

  // --- Financial Core (Journals) ---
  ipcMain.handle('get-next-voucher-no', (event, prefix) => JournalService.getNextVoucherNo(prefix));
  ipcMain.handle('create-journal-entry', (event, { header, lines }) => JournalService.createJournalEntry(header, lines));
  ipcMain.handle('get-journal-entry', (event, id) => JournalService.getJournalEntry(id));
  ipcMain.handle('get-journal-entries', (event, filters) => JournalService.getJournalEntries(filters));

  // 9. Reports (Legacy - Removed, handled above)
  // ipcMain.handle('get-trial-balance', (event, params) => ReportsService.getTrialBalance(params));


  // 10. Manufacturing
  // Work Centers
  ipcMain.handle('mfg-get-work-centers', () => ManufacturingService.getWorkCenters());
  ipcMain.handle('mfg-save-work-center', (event, data) => ManufacturingService.saveWorkCenter(data));
  ipcMain.handle('mfg-delete-work-center', (event, id) => ManufacturingService.deleteWorkCenter(id));

  // Machines
  ipcMain.handle('mfg-get-machines', () => ManufacturingService.getMachines());
  ipcMain.handle('mfg-save-machine', (event, data) => ManufacturingService.saveMachine(data));
  ipcMain.handle('mfg-delete-machine', (event, id) => ManufacturingService.deleteMachine(id));

  // BOM & Routing
  ipcMain.handle('mfg-create-bom', (event, header, lines) => ManufacturingService.createBOM(header, lines));
  ipcMain.handle('mfg-get-boms', () => ManufacturingService.getBOMs());
  ipcMain.handle('mfg-get-bom', (event, id) => ManufacturingService.getBOM(id));

  ipcMain.handle('mfg-save-routing', (event, header, ops) => ManufacturingService.saveRouting(header, ops));
  ipcMain.handle('mfg-get-routings', (event, bomId) => ManufacturingService.getRoutings(bomId));

  // Orders
  ipcMain.handle('mfg-create-order', (event, order) => ManufacturingService.createProductionOrder(order));
  ipcMain.handle('mfg-get-orders', () => ManufacturingService.getProductionOrders());
  ipcMain.handle('mfg-update-order-status', (event, { id, status }) => ManufacturingService.updateOrderStatus(id, status));
  ipcMain.handle('mfg-execute-order', (event, id, qty, date) => ManufacturingService.executeProductionOrder(id, qty, date));

  // Job Cards
  ipcMain.handle('mfg-get-job-cards', (event, filters) => ManufacturingService.getJobCards(filters));
  ipcMain.handle('mfg-start-job', (event, data) => ManufacturingService.createJobCard(data));
  ipcMain.handle('mfg-stop-job', (event, { id, data }) => ManufacturingService.stopJobCard(id, data));

  // QC
  ipcMain.handle('mfg-get-qc-tests', () => ManufacturingService.getQCTests());
  ipcMain.handle('mfg-save-qc-test', (event, data) => ManufacturingService.saveQCTest(data));
  ipcMain.handle('mfg-get-inspections', (event, filters) => ManufacturingService.getInspections(filters));
  ipcMain.handle('mfg-save-inspection', (event, data) => ManufacturingService.saveInspection(data));

  // Maintenance
  ipcMain.handle('mfg-get-maintenance-requests', (event, filters) => ManufacturingService.getMaintenanceRequests(filters));
  ipcMain.handle('mfg-save-maintenance-request', (event, data) => ManufacturingService.saveMaintenanceRequest(data));

  // TEST WORKFLOW
  ipcMain.handle('test:run-full-workflow', () => WorkflowTestService.runFullWorkflow());

  ipcMain.handle('mfg-get-wip-report', () => ManufacturingService.getWIPReport());

  // 11. Master Data Definitions (Financials)
  // Banks
  ipcMain.handle('md-get-banks', () => MasterDataService.getBanks());
  ipcMain.handle('md-save-bank', (event, data) => MasterDataService.saveBank(data));
  ipcMain.handle('md-delete-bank', (event, id) => MasterDataService.deleteBank(id));

  ipcMain.handle('md-import-banks-html', async (event, filePath) => {
    return MasterDataService.importBanksFromHTML(filePath);
  });

  // Note: dialog:open-file is already registered at line 788, so we don't need to re-register it if it works.
  // Let's check line 788 in the file content I saw earlier.
  // Line 788: ipcMain.handle('dialog:open-file', async (event, options) => { ...
  // So I can just use 'dialog:open-file' from frontend.


  // Bank Accounts
  ipcMain.handle('md-get-bank-accounts', () => MasterDataService.getBankAccounts());
  ipcMain.handle('md-save-bank-account', (event, data) => MasterDataService.saveBankAccount(data));
  ipcMain.handle('md-delete-bank-account', (event, id) => MasterDataService.deleteBankAccount(id));

  // Cost Centers
  ipcMain.handle('md-get-cost-centers', () => MasterDataService.getCostCenters());
  ipcMain.handle('md-save-cost-center', (event, data) => MasterDataService.saveCostCenter(data));
  ipcMain.handle('md-delete-cost-center', (event, id) => MasterDataService.deleteCostCenter(id));

  // Payment Methods
  ipcMain.handle('md-get-payment-methods', () => MasterDataService.getPaymentMethods());
  ipcMain.handle('md-save-payment-method', (event, data) => MasterDataService.savePaymentMethod(data));

  // Branches
  ipcMain.handle('md-get-branches', () => MasterDataService.getBranches());
  ipcMain.handle('md-save-branch', (event, data) => MasterDataService.saveBranch(data));
  ipcMain.handle('md-delete-branch', (event, id) => MasterDataService.deleteBranch(id));

  // 11. Master Data Definitions (Financials)


  ipcMain.handle('get-products', (event, search) => {
    if (!search) return db.prepare('SELECT * FROM products LIMIT 50').all();
    return db.prepare(`
    SELECT * FROM products 
    WHERE name LIKE @val OR barcode LIKE @val
  `).all({ val: `%${search}%` });
  });

  // --- Sales Handlers (New Service) ---
  ipcMain.handle('sales-create-invoice', (event, data) => SalesService.createInvoice(data));

  // Quotations
  ipcMain.handle('sales-create-quotation', (event, data) => SalesService.createQuotation(data));
  ipcMain.handle('sales-get-quotations', (event) => SalesService.getQuotations());
  ipcMain.handle('sales-get-quotation', (event, id) => SalesService.getQuotation(id));
  ipcMain.handle('sales-get-invoice', (event, id) => SalesService.getInvoice(id)); // Added
  ipcMain.handle('sales-update-quotation-status', (event, { id, status }) => SalesService.updateQuotationStatus(id, status));

  // Orders
  ipcMain.handle('sales-create-order', (event, data) => SalesService.createOrder(data));
  ipcMain.handle('sales-get-orders', (event) => SalesService.getOrders());
  ipcMain.handle('sales-get-order', (event, id) => SalesService.getOrder(id));

  ipcMain.handle('sales-update-order-status', (event, { id, status }) => SalesService.updateOrderStatus(id, status));

  // Returns
  ipcMain.handle('sales-create-return', (event, data) => SalesService.createReturn(data));
  ipcMain.handle('sales-get-returns', (event) => SalesService.getReturns());
  ipcMain.handle('sales-get-return', (event, id) => SalesService.getReturn(id));

  // Sales Lists & Deletes
  ipcMain.handle('sales-get-invoices', (event) => SalesService.getInvoices());
  ipcMain.handle('sales-delete-quotation', (event, id) => SalesService.deleteQuotation(id));
  ipcMain.handle('sales-delete-order', (event, id) => SalesService.deleteOrder(id));

  // Legacy Handler Removal (or keep alias if needed, but switching to new name 'sales-create-invoice' is cleaner)
  // Converting old calls to new service if signature matches, but for now we are building new UI.
  // ipcMain.handle('save-invoice', ...); // Removed in favor of SalesService

  /*
  // Save Sales Invoice (Deprecated)
  ipcMain.handle('save-invoice', (event, data) => {
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
  ipcMain.handle('treasury-create-receipt', (event, data) => TreasuryService.createReceiptVoucher(data));
  ipcMain.handle('treasury-create-payment', (event, data) => TreasuryService.createPaymentVoucher(data));
  ipcMain.handle('treasury-get-receipt', (event, id) => TreasuryService.getReceipt(id)); // Existing mapping, now exposed.
  ipcMain.handle('treasury-get-payment', (event, id) => TreasuryService.getPaymentVoucher(id));
  ipcMain.handle('treasury-get-payments', (event, filters) => TreasuryService.getPaymentVouchers(filters));
  ipcMain.handle('treasury-get-receipts', (event, filters) => TreasuryService.getReceiptVouchers(filters));
  ipcMain.handle('treasury-get-book-balance', (event, { accountId, date }) => TreasuryService.getBookBalance(accountId, date));

  ipcMain.handle('cheques-get', async (_, filters) => {
    return ChequeService.getCheques(filters);
  });
  ipcMain.handle('cheques-update-status', async (_, data) => {
    return ChequeService.updateStatus(data.id, data.status, data.date, data.options);
  });

  // 10. Report Engine Handlers (New)
  // ipcMain.handle('reports-get-partner-ledger', (event, filters) => ReportService.getPartnerLedger(filters)); // DUPLICATE REMOVED
  // ipcMain.handle('reports-get-item-movement', (event, filters) => ReportService.getItemMovement(filters)); // DUPLICATE REMOVED
  ipcMain.handle('reports-get-trial-balance', (event) => ReportService.getTrialBalance());
  // ipcMain.handle('reports-get-top-customers', () => ReportsService.getTopCustomers()); // Duplicate removed

  // 11. Budgeting Module
  ipcMain.handle('budget-get-all', () => BudgetService.getAllBudgets());
  ipcMain.handle('budget-get-by-id', (event, id) => BudgetService.getBudgetById(id));
  ipcMain.handle('budget-create', (event, data) => BudgetService.createBudget(data));
  ipcMain.handle('budget-update-status', (event, { id, status }) => BudgetService.updateBudgetStatus(id, status, 'Admin')); // TODO: userId
  ipcMain.handle('budget-get-report', (event, { id, period }) => BudgetService.getBudgetVsActual(id, period));

  // 12. P&L Report Handler
  // ipcMain.handle('get-report-pnl', (event, range) => ReportsService.getReportPnL(range)); // Duplicate removed

  // 13. Import Module Handlers (Managed via ImportService instance)


  // Save Purchase Invoice (Legacy removal)



  // 3. Invoice Items & Stock Update


  // --- Account Statement Handlers ---

  ipcMain.handle('get-account-statement', (event, { accountId, fromDate, toDate }) => {
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
  ipcMain.handle('save-bom', (event, { finishedProductId, name, items }) => {
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
  ipcMain.handle('get-boms', () => {
    return db.prepare(`
  SELECT b.id, b.name, p.name as product_name 
  FROM boms b
  JOIN products p ON b.finished_product_id = p.id
`).all();
  });

  // 3. Execute Production (The Industrial Engine)
  ipcMain.handle('execute-production', (event, { bomId, quantity, date, refNo }) => {
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
  // ipcMain.handle('get-dashboard-kpis', async () => {
  //   return SystemService.getDashboardKPIs();
  // });

  // 2. Get Charts Data
  // ipcMain.handle('get-dashboard-charts', async () => {
  //   return ReportService.getDashboardCharts(); 
  // });

  // --- Advanced Reports Handlers ---

  // 1. Profit & Loss (Income Statement) - MOVED TO SERVICE (See line 663)

  // 2. Balance Sheet
  ipcMain.handle('get-report-balance-sheet', () => ReportService.getBalanceSheet());

  // 3. Inventory Status
  // ipcMain.handle('reports-get-inventory-status', () => ReportService.getInventoryStatus()); // DUPLICATE REMOVED

  // 4. Sales Reports
  // ipcMain.handle('reports-get-sales-analytics', (event, range) => ReportService.getSalesAnalytics(range)); // DUPLICATE REMOVED
  // ipcMain.handle('reports-get-profitability', (event, range) => ReportService.getProfitabilityReport(range)); // DUPLICATE REMOVED

  // 5. Purchasing Reports
  // ipcMain.handle('reports-get-purchasing-analysis', (event, range) => ReportService.getPurchasingAnalysis(range)); // DUPLICATE REMOVED
  // ipcMain.handle('reports-get-import-reports', () => ReportService.getImportReports()); // DUPLICATE REMOVED

  // 6. Cheque Reports
  // ipcMain.handle('reports-get-cheques', (event, filters) => ReportService.getChequesReport(filters)); // DUPLICATE REMOVED

  // 7. General Financial Reports (Account Statement & Aging)
  // ipcMain.handle('reports-get-account-statement', (event, filters) => ReportService.getAccountStatement(filters)); // DUPLICATE REMOVED
  // ipcMain.handle('reports-get-aging', () => ReportService.getAgingReport()); // DUPLICATE REMOVED
  // ipcMain.handle('reports-get-tax', (event, range) => ReportService.getTaxReport(range)); // DUPLICATE REMOVED

  // 3. Debt Aging Report (The Collection List) - REMOVING OLD PLACEHOLDER IF EXISTS or INTEGRATING
  // (Assuming 'get-report-aging' was the old one, but we are standardizing on 'reports-*')
  ipcMain.handle('get-report-aging', () => {
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
  ipcMain.handle('get-machine-id', async () => {
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
  ipcMain.handle('validate-license', () => {
    const license = db.prepare("SELECT value FROM settings WHERE key = 'license_key'").get();
    if (!license) return { status: 'unlicensed' };

    // In a real app, verify the hash. Here we just check if it exists.
    return { status: 'active', key: license.value };
  });

  // 3. Activate Product
  ipcMain.handle('activate-product', (event, key) => {
    // Simple check: Key must start with "WAFI-"
    if (!key.startsWith("WAFI-")) throw new Error("مفتاح غير صالح");

    db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('license_key', ?)").run(key);
    return { success: true };
  });




  // --- Data Migration Handlers ---

  // 1. Bulk Import (The Bridge)
  ipcMain.handle('import-data', (event, { type, data }) => {
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



}; // End of registerIPCHandlers

const createWindow = () => {

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
};

app.on('ready', () => {
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


  // Register IPC handlers
  registerIPCHandlers(db);

  // Note: wafi:// protocol handler is registered in app.whenReady() above

  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
