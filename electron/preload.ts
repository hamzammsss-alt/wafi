// @ts-ignore
import { contextBridge, ipcRenderer } from 'electron';

// --- Global Null Sanitizer ---
// Converts all null/undefined values from backend to valid empty strings
// to prevent "Main Process -> React State -> Uncontrolled Input" issues.
const sanitize = (data: any): any => {
    if (data === null || data === undefined) return '';
    if (Array.isArray(data)) return data.map(sanitize);
    if (typeof data === 'object') {
        const copy: any = {};
        for (const key in data) {
            copy[key] = sanitize(data[key]);
        }
        return copy;
    }
    return data;
};

// Wrapper for IPC calls
const invoke = async (channel: string, ...args: any[]) => {
    try {
        const result = await ipcRenderer.invoke(channel, ...args);
        return sanitize(result);
    } catch (error) {
        console.error(`IPC Error [${channel}]:`, error);
        throw error;
    }
};

contextBridge.exposeInMainWorld('electronAPI', {
    // 0. Financial Definitions (New)
    finance: {
        getTaxes: () => invoke('finance:getTaxes'),
        saveTax: (data: any) => invoke('finance:saveTax', data),
        deleteTax: (id: string) => invoke('finance:deleteTax', id),

        getAnalysisCodes: () => invoke('finance:getAnalysisCodes'),
        getAnalysisCodesFlat: () => invoke('finance:getAnalysisCodesFlat'),
        saveAnalysisCode: (data: any) => invoke('finance:saveAnalysisCode', data),
        deleteAnalysisCode: (id: string) => invoke('finance:deleteAnalysisCode', id),
    },
    // 1. Accounts & Transactions
    getAccounts: () => invoke('get-accounts'),
    getTransactionalAccounts: () => invoke('get-transactional-accounts'),
    reseedAccounts: () => invoke('reseed-accounts'),
    getAccountTree: () => invoke('get-account-tree'),
    getAccountChildren: (parentId: number) => invoke('get-account-children', parentId),
    getAccountPath: (accountId: number) => invoke('get-account-path', accountId),
    addAccount: (account: any) => invoke('add-account', account),
    updateAccount: (account: any) => invoke('update-account', account),
    getNextVoucherNo: (type: string) => invoke('get-next-voucher-no', type),
    saveTransaction: (data: any) => invoke('save-transaction', data),

    // 2. Products & Inventory
    getProducts: (search: string) => invoke('get-products', search),
    saveInvoice: (data: any) => invoke('save-invoice', data),
    savePurchase: (data: any) => invoke('save-purchase', data),
    getNextInvoiceNo: () => invoke('get-next-invoice-no'),

    getUnits: () => invoke('get-units'),
    createUnit: (unit: any) => invoke('create-unit', unit),
    getItems: () => invoke('get-items'),
    createItem: (item: any) => invoke('create-item', item),
    getWarehouses: () => invoke('get-warehouses'),
    createWarehouse: (warehouse: any) => invoke('create-warehouse', warehouse),
    updateWarehouse: (warehouse: any) => invoke('update-warehouse', warehouse),
    getStock: (ids: any) => invoke('get-stock', ids),
    addStockTransaction: (trx: any) => invoke('add-stock-transaction', trx),
    transferStock: (transfer: any) => invoke('transfer-stock', transfer),

    getStockTakes: () => invoke('get-stock-takes'),
    getStockTake: (id: string) => invoke('get-stock-take', id),
    initiateStockTake: (data: any) => invoke('initiate-stock-take', data),
    updateStockTakeItem: (id: string, qty: number) => invoke('update-stock-take-item', { id, qty }),
    postStockTake: (id: string) => invoke('post-stock-take', id),

    // 3. Checks
    getChecks: (status: string) => invoke('get-checks', status),
    updateCheckStatus: (data: any) => invoke('update-check-status', data),
    getAccountStatement: (data: any) => invoke('get-account-statement', data),
    saveReceiptVoucher: (data: any) => invoke('save-receipt-voucher', data),

    // 4. Manufacturing
    saveBom: (data: any) => invoke('save-bom', data),
    getBoms: () => invoke('get-boms'),
    executeProduction: (data: any) => invoke('execute-production', data),

    // 5. Reporting
    getDashboardKPIs: () => invoke('get-dashboard-kpis'),
    getDashboardCharts: () => invoke('get-dashboard-charts'),
    getReportPnL: (range: any) => invoke('get-report-pnl', range),
    getReportBalanceSheet: () => invoke('get-report-balance-sheet'),
    getReportAging: () => invoke('get-report-aging'),

    // 6. HR & Payroll
    // 6. HR & Payroll
    getEmployees: () => invoke('hr-get-employees'),
    getEmployee: (id: string) => invoke('hr-get-employee', id),
    saveEmployee: (data: any) => invoke('hr-save-employee', data),
    getAttendance: (date: string) => invoke('hr-get-daily-attendance', date), // Fixed: was get-attendance
    saveAttendance: (data: any) => invoke('hr-save-shift', data), // Note: Check main.ts for save-attendance, it maps to hr-save-shift or similar? 
    // Wait, main.ts says: ipcMain.handle('hr-get-shifts', ...); and ipcMain.handle('hr-save-shift', ...);
    // AND ipcMain.handle('hr-process-daily-attendance', ...); 
    // Let's stick to strict main.ts names:

    getShifts: () => invoke('hr-get-shifts'),
    saveShift: (data: any) => invoke('hr-save-shift', data),

    getDailyAttendance: (date: string) => invoke('hr-get-daily-attendance', date),

    // Payroll
    calculatePayroll: (data: any) => invoke('hr-get-payroll-preview', data), // data = {month, year}
    savePayrollRun: (data: any) => invoke('hr-post-payroll', data),
    generateSalaryEntry: (data: any) => invoke('hr-generate-salary-entry', data),
    getSlips: (data: any) => invoke('hr-get-slips', data),

    // Organization
    getDepartments: () => invoke('hr-get-departments'),
    saveDepartment: (data: any) => invoke('hr-save-department', data),
    deleteDepartment: (id: string) => invoke('hr-delete-department', id),

    getJobTitles: () => invoke('hr-get-job-titles'),
    saveJobTitle: (data: any) => invoke('hr-save-job-title', data),
    deleteJobTitle: (id: string) => invoke('hr-delete-job-title', id),

    // 7. Fixed Assets
    getAssets: () => invoke('get-assets'),
    saveAsset: (data: any) => invoke('save-asset', data),
    calcDepreciation: (assetId: string) => invoke('calc-depreciation', assetId),
    postDepreciation: (data: any) => invoke('post-depreciation', data),
    getAssetCategories: () => invoke('get-asset-categories'),
    saveAssetCategory: (data: any) => invoke('save-asset-category', data),
    getNextAssetCode: () => invoke('get-next-asset-code'),

    // 8. System & Settings
    auth: {
        login: (creds: any) => invoke('auth-login', creds),
        changePassword: (data: any) => invoke('auth-change-password', data),
        getUsers: () => invoke('get-users'),
        saveUser: (user: any) => invoke('save-user', user),
        deleteUser: (id: string) => invoke('delete-user', id),
        getRoles: () => invoke('get-roles'),
        saveRole: (role: any) => invoke('save-role', role),
        deleteRole: (id: string) => invoke('delete-role', id),
        getPermissions: (roleId: string) => invoke('get-permissions', roleId),
        savePermissions: (data: any) => invoke('save-permissions', data),
        getBranches: () => invoke('get-branches'),
        saveBranch: (branch: any) => invoke('save-branch', branch),
        deleteBranch: (id: string) => invoke('delete-branch', id),
    },

    system: {
        backupDatabase: () => invoke('backup-database'),
        restoreDatabase: () => invoke('restore-database'),
        checkIntegrity: () => invoke('check-integrity'),
        getAuditLogs: (filters: any) => invoke('get-audit-logs', filters),
        getSettings: () => invoke('get-settings'),
        saveSettings: (data: any) => invoke('save-settings', data),
        getTrialBalance: (params: any) => invoke('get-trial-balance', params),
        getDashboardKPIs: () => invoke('get-dashboard-kpis'),
        getDashboardCharts: () => invoke('get-dashboard-charts'),
        saveLogo: (buffer: ArrayBuffer, name: string) => invoke('save-logo', { buffer, name }),
        saveImage: (buffer: ArrayBuffer, name: string) => invoke('system:save-image', { buffer, name }),
    },

    dialog: {
        showOpenDialog: (options: any) => invoke('dialog:open-file', options)
    },

    currency: {
        getCurrencies: () => invoke('get-currencies'),
        getBaseCurrency: () => invoke('get-base-currency'),
        createCurrency: (currency: any) => invoke('create-currency', currency),
        updateCurrency: (currency: any) => invoke('update-currency', currency),
        deleteCurrency: (id: string) => invoke('delete-currency', id),
        updateRates: () => invoke('currency-scraper-trigger'),
        getCurrencyHistory: (code: string, days?: number) => invoke('currency-get-history', { code, days }),
    },

    branch: {
        getBranches: () => invoke('get-branches'),
        saveBranch: (branch: any) => invoke('save-branch', branch),
        deleteBranch: (id: string) => invoke('delete-branch', id),
    },

    account: {
        getAccounts: () => invoke('get-accounts'),
        getAccount: (id: string) => invoke('get-account', id), // Added
        getTree: () => invoke('get-account-tree'),
        saveAccount: (account: any) => invoke('save-account', account),
        deleteAccount: (id: string) => invoke('delete-account', id),
    },

    inventory: {
        getItems: () => invoke('inventory:get-items-v2'), // Use V2
        getItemDetails: (id: string) => invoke('inventory:get-item-details', id),
        saveItem: (item: any) => invoke('inventory:update-item', item), // Mapped to new update logic
        updateItem: (item: any) => invoke('inventory:update-item', item), // Explicit new method
        bulkUpdateItems: (updates: any[]) => invoke('inventory:bulk-update-items', updates),
        createItem: (item: any) => invoke('inventory:create-item', item),
        deleteItem: (id: string) => invoke('delete-item', id),

        getStockTakes: () => invoke('inventory:get-stock-takes'),
        getStockTake: (id: string) => invoke('inventory:get-stock-take', id),
        createStockTake: (data: any) => invoke('inventory:create-stock-take', data),
        updateStockTakeItem: (id: string, qty: number) => invoke('inventory:update-stock-take-item', id, qty),
        approveStockTake: (id: string) => invoke('inventory:approve-stock-take', id),

        getLastClosingDate: () => invoke('inventory:get-last-closing-date'),
        closePeriod: (date: string) => invoke('inventory:close-period', date),

        getUnits: () => invoke('inventory:get-units'),
        createUnit: (unit: any) => invoke('create-unit', unit),
        deleteUnit: (id: string) => invoke('inventory:delete-unit', id),

        getBrands: () => invoke('inventory:get-brands'),
        createBrand: (brand: any) => invoke('inventory:create-brand', brand),
        updateBrand: (brand: any) => invoke('inventory:update-brand', brand),
        deleteBrand: (id: string) => invoke('inventory:delete-brand', id),

        // Attributes
        getAttributes: () => invoke('inventory:get-attributes'),
        saveAttribute: (attr: any) => invoke('inventory:save-attribute', attr),
        deleteAttribute: (id: string) => invoke('inventory:delete-attribute', id),

        getAttributeValues: (attrId: string) => invoke('inventory:get-attribute-values', attrId),
        saveAttributeValue: (data: any) => invoke('inventory:save-attribute-value', data),
        deleteAttributeValue: (id: string) => invoke('inventory:delete-attribute-value', id),

        getCategories: () => invoke('get-categories'),
        createCategory: (cat: any) => invoke('create-category', cat),
        updateCategory: (cat: any) => invoke('update-category', cat),
        deleteCategory: (id: string) => invoke('delete-category', id),

        getWarehouses: () => invoke('get-warehouses'),
        createWarehouse: (wh: any) => invoke('create-warehouse', wh),
        updateWarehouse: (wh: any) => invoke('update-warehouse', wh),
        deleteWarehouse: (id: string) => invoke('inventory:delete-warehouse', id),


        updateStock: (data: any) => invoke('inventory-update-stock', data),

        getBatches: (itemId: string) => invoke('inventory:get-batches', itemId),
        createBatch: (batch: any) => invoke('inventory:create-batch', batch),
        transferRequest: (data: any) => invoke('inventory:transfer-request', data),

        getBins: (warehouseId: string) => invoke('get-warehouse-bins', warehouseId),
        createBin: (bin: any) => invoke('create-warehouse-bin', bin),
        deleteBin: (id: string) => invoke('delete-warehouse-bin', id),

        createStockDocument: (doc: any) => invoke('create-stock-document', doc), // Added

        getValuation: (filters: any) => invoke('inventory:get-valuation', filters), // Added

        receiveTransfer: (data: any) => invoke('inventory:receive-transfer', data), // Added
        getGoodsReceipts: () => invoke('inventory-get-grns'),
        getDispatches: () => invoke('inventory-get-dispatches'),

        getKit: (itemId: string) => invoke('inventory:get-kit', itemId),
        createAssembly: (data: any) => invoke('inventory:create-assembly', data),



    },

    hr: {
        // Departments
        getDepartments: () => invoke('hr-get-departments'),
        saveDepartment: (data: any) => invoke('hr-save-department', data),
        deleteDepartment: (id: string) => invoke('hr-delete-department', id),
        getTitles: () => invoke('hr-get-titles'),
        saveTitle: (data: any) => invoke('hr-save-title', data),
        deleteTitle: (id: string) => invoke('hr-delete-title', id),

        // Employees
        getEmployees: () => invoke('hr-get-employees'),
        getEmployee: (id: string) => invoke('hr-get-employee', id),
        saveEmployee: (data: any) => invoke('hr-save-employee', data),
        getNextCode: () => invoke('hr-get-next-code'),
        savePhoto: (buffer: ArrayBuffer, name: string) => invoke('hr-save-photo', { buffer, name }),

        // Attendance
        getShifts: () => invoke('hr-get-shifts'),
        saveShift: (data: any) => invoke('hr-save-shift', data),
        importAttendance: (records: any[]) => invoke('hr-import-attendance', records),
        processAttendance: (date: string) => invoke('hr-process-attendance', date),
        getDailyAttendance: (date: string) => invoke('hr-get-daily-attendance', date),

        // Leaves
        getLeaveTypes: () => invoke('hr-get-leave-types'),
        saveLeaveType: (data: any) => invoke('hr-save-leave-type', data),
        getLeaveRequests: (filter: any) => invoke('hr-get-leave-requests', filter),
        saveLeaveRequest: (data: any) => invoke('hr-save-leave-request', data),
        updateLeaveStatus: (id: string, status: string, reason?: string) => invoke('hr-update-leave-status', { id, status, reason }),
        getLeaveBalances: (id: string, year: number) => invoke('hr-get-employee-balances', { employeeId: id, year }),

        // Payroll
        saveAdvance: (data: any) => invoke('hr-save-advance', data),
        getAdvances: (id: string) => invoke('hr-get-advances', id),
        generatePayroll: (month: number, year: number) => invoke('hr-generate-payroll', { month, year }),
        postPayroll: (month: number, year: number, slips: any[]) => invoke('hr-post-payroll', { month, year, slips }),
        getSlips: (month: number, year: number) => invoke('hr-get-slips', { month, year }),
    },

    partner: {
        getPartners: (type?: string) => invoke('get-partners', type),
        getPartner: (id: string) => invoke('get-partner', id),
        savePartner: (partner: any) => invoke('save-partner', partner),
        deletePartner: (id: string) => invoke('delete-partner', id),

        // Customer Types
        getCustomerTypes: () => invoke('partner:get-customer-types'),
        saveCustomerType: (data: any) => invoke('partner:save-customer-type', data),
        deleteCustomerType: (id: string) => invoke('partner:delete-customer-type', id),

        // Vendor Types
        getVendorTypes: () => invoke('partner:get-vendor-types'),
        saveVendorType: (data: any) => invoke('partner:save-vendor-type', data),
        deleteVendorType: (id: string) => invoke('partner:delete-vendor-type', id),

        // Regions & Groups
        getRegions: () => invoke('partner:get-regions'),
        saveRegion: (data: any) => invoke('partner:save-region', data),
        createRegion: (data: any) => invoke('partner:create-region', data),
        updateRegion: (data: any) => invoke('partner:update-region', data),
        deleteRegion: (id: string) => invoke('partner:delete-region', id),

        getGroups: () => invoke('partner:get-groups'),
        saveGroup: (data: any) => invoke('partner:save-group', data),
        deleteGroup: (id: string) => invoke('partner:delete-group', id),

        getSalesReps: () => invoke('partner:get-sales-reps'),
        saveSalesRep: (data: any) => invoke('partner:save-sales-rep', data),
        deleteSalesRep: (id: string) => invoke('partner:delete-sales-rep', id),

        // Price Lists
        getPriceLists: () => invoke('partner:getPriceLists'),
        savePriceList: (data: any) => invoke('partner:savePriceList', data),
        deletePriceList: (id: string) => invoke('partner:deletePriceList', id),
        getPriceListItems: (listId: string) => invoke('partner:getPriceListItems', listId),
        savePriceListItem: (data: any) => invoke('partner:savePriceListItem', data),
        deletePriceListItem: (id: string) => invoke('partner:deletePriceListItem', id),
    },

    journal: {
        getNextVoucherNo: (prefix: string) => invoke('get-next-voucher-no', prefix),
        createEntry: (header: any, lines: any[]) => invoke('create-journal-entry', { header, lines }),
        getEntry: (id: string) => invoke('get-journal-entry', id),
        getEntries: (filters: any) => invoke('get-journal-entries', filters),
    },

    sales: {
        createInvoice: (invoice: any) => invoke('sales-create-invoice', invoice),
        getNextInvoiceNo: () => invoke('get-next-invoice-no'),
        getInvoice: (id: string) => invoke('sales-get-invoice', id),
        createQuotation: (data: any) => invoke('sales-create-quotation', data),
        getQuotations: () => invoke('sales-get-quotations'),
        getQuotation: (id: string) => invoke('sales-get-quotation', id),
        updateQuotationStatus: (id: string, status: string) => invoke('sales-update-quotation-status', { id, status }),
        createOrder: (data: any) => invoke('sales-create-order', data),
        getOrders: () => invoke('sales-get-orders'),
        getOrder: (id: string) => invoke('sales-get-order', id),
        updateOrderStatus: (id: string, status: string) => invoke('sales-update-order-status', { id, status }),
        createReturn: (data: any) => invoke('sales-create-return', data),
        getReturns: () => invoke('sales-get-returns'),
        getReturn: (id: string) => invoke('sales-get-return', id),
        getInvoices: () => invoke('sales-get-invoices'),
    },

    purchase: {
        createInvoice: (invoice: any) => invoke('purchase-create-invoice', invoice),
        getNextInvoiceNo: () => invoke('purchase-get-next-no'),
        createOrder: (data: any) => invoke('purchase-create-order', data),
        getOrders: () => invoke('purchase-get-orders'),
        getOrder: (id: string) => invoke('purchase-get-order', id),
        updateOrder: (data: any) => invoke('purchase-update-order', data),
        deleteOrder: (id: string) => invoke('purchase-delete-order', id),
        getInvoice: (id: string) => invoke('purchase-get-invoice', id),
        getInvoices: () => invoke('purchase-get-invoices'),

        createRequest: (data: any) => invoke('purchase-create-request', data),
        getRequests: () => invoke('purchase-get-requests'),
        getRequest: (id: string) => invoke('purchase-get-request', id),
        updateRequest: (data: any) => invoke('purchase-update-request', data),
        deleteRequest: (id: string) => invoke('purchase-delete-request', id),

        createRFQ: (data: any) => invoke('purchase-create-rfq', data),
        getRFQs: () => invoke('purchase-get-rfqs'),
        getRFQ: (id: string) => invoke('purchase-get-rfq', id),
        updateRFQ: (data: any) => invoke('purchase-update-rfq', data),

        createReturn: (data: any) => invoke('purchase-create-return', data),
        getReturns: () => invoke('purchase-get-returns'),
        getReturn: (id: string) => invoke('purchase-get-return', id),
    },

    treasury: {
        createReceipt: (data: any) => invoke('treasury-create-receipt', data),
        createPayment: (data: any) => invoke('treasury-create-payment', data),
        getReceipt: (id: string) => invoke('treasury-get-receipt', id),
        getPayment: (id: string) => invoke('treasury-get-payment', id),
        getPayments: (filters: any) => invoke('treasury-get-payments', filters),
        getReceipts: (filters: any) => invoke('treasury-get-receipts', filters),
        getBookBalance: (accountId: string, date: string) => invoke('treasury-get-book-balance', { accountId, date }),
    },

    cheques: {
        getCheques: (filters: any) => ipcRenderer.invoke('cheques-get', filters), // Keep old for compat if needed, or remove
        get: (filters: any) => ipcRenderer.invoke('cheques-get', filters),
        updateStatus: (data: any) => ipcRenderer.invoke('cheques-update-status', data)
    },

    reports: {
        getPartnerLedger: (filters: any) => invoke('reports-get-partner-ledger', filters),
        getItemMovement: (filters: any) => invoke('reports-get-item-movement', filters),
        getTrialBalance: () => invoke('reports-get-trial-balance'),
        getInventoryStatus: () => invoke('reports-get-inventory-status'),
        getSalesAnalytics: (range: any) => invoke('reports-get-sales-analytics', range),
        getProfitability: (range: any) => invoke('reports-get-profitability', range),
        getPurchasingAnalysis: (range: any) => invoke('reports-get-purchasing-analysis', range),
        getPurchasesByVendor: (range: any) => invoke('reports-get-purchases-by-vendor', range),
        getImportReports: () => invoke('reports-get-import-reports'),
        getChequesReport: (filters: any) => invoke('reports-get-cheques', filters),
        getAccountStatement: (filters: any) => invoke('reports-get-account-statement', filters),
        getAgingReport: () => invoke('reports-get-aging'),
        getTaxReport: (range: any) => invoke('reports-get-tax', range),
        getTopCustomers: () => invoke('reports-get-top-customers'),
        getSlowMovingItems: (days: number) => invoke('reports-get-slow-moving', days),
        getExpiryReport: (days: number) => invoke('reports-get-expiry', days),
    },
    manufacturing: {
        // Work Centers
        // Work Centers (Production Lines)
        getWorkCenters: () => invoke('mfg-get-work-centers'),
        saveWorkCenter: (data: any) => invoke('mfg-save-work-center', data),
        deleteWorkCenter: (id: string) => invoke('mfg-delete-work-center', id),

        // Machines
        getMachines: () => invoke('mfg-get-machines'),
        saveMachine: (data: any) => invoke('mfg-save-machine', data),
        deleteMachine: (id: string) => invoke('mfg-delete-machine', id),

        // BOM & Routing
        createBOM: (header: any, lines: any[]) => invoke('mfg-create-bom', header, lines),
        getBOMs: () => invoke('mfg-get-boms'),
        getBOM: (id: string) => invoke('mfg-get-bom', id),

        saveRouting: (header: any, ops: any[]) => invoke('mfg-save-routing', header, ops),
        getRoutings: (bomId: string) => invoke('mfg-get-routings', bomId),




        // Partners
        createOrder: (order: any) => invoke('mfg-create-order', order),
        getOrders: () => invoke('mfg-get-orders'),
        updateOrderStatus: (id: string, status: string) => invoke('mfg-update-order-status', { id, status }),
        executeOrder: (id: string, qty: number, date: string) => invoke('mfg-execute-order', id, qty, date),

        // Job Cards
        getJobCards: (filters: any) => invoke('mfg-get-job-cards', filters),
        startJob: (data: any) => invoke('mfg-start-job', data),
        stopJob: (id: string, data: any) => invoke('mfg-stop-job', { id, data }),

        // Quality Control
        getQCTests: () => invoke('mfg-get-qc-tests'),
        saveQCTest: (data: any) => invoke('mfg-save-qc-test', data),
        getInspections: (filters: any) => invoke('mfg-get-inspections', filters),
        saveInspection: (data: any) => invoke('mfg-save-inspection', data),

        // Maintenance
        getMaintenanceRequests: (filters: any) => invoke('mfg-get-maintenance-requests', filters),
        saveMaintenanceRequest: (data: any) => invoke('mfg-save-maintenance-request', data),

        // Reports
        getWIPReport: () => invoke('mfg-get-wip-report'),
    },

    masterData: {
        // Banks
        getBanks: () => invoke('md-get-banks'),
        saveBank: (data: any) => invoke('md-save-bank', data),
        deleteBank: (id: string) => invoke('md-delete-bank', id),
        importBanksHtml: (path: string) => invoke('md-import-banks-html', path),

        // Accounts
        getBankAccounts: () => invoke('md-get-bank-accounts'),
        saveBankAccount: (data: any) => invoke('md-save-bank-account', data),
        deleteBankAccount: (id: string) => invoke('md-delete-bank-account', id),

        // Cost Centers
        getCostCenters: () => invoke('md-get-cost-centers'),
        saveCostCenter: (data: any) => invoke('md-save-cost-center', data),
        deleteCostCenter: (id: string) => invoke('md-delete-cost-center', id),

        // Payment Methods
        getPaymentMethods: () => invoke('md-get-payment-methods'),
        savePaymentMethod: (data: any) => invoke('md-save-payment-method', data),

        // Branches
        getBranches: () => invoke('md-get-branches'),
        saveBranch: (data: any) => invoke('md-save-branch', data),
        deleteBranch: (id: string) => invoke('md-delete-branch', id),
    },

    logistics: {
        getDrivers: () => invoke('logistics-get-drivers'),
        saveDriver: (data: any) => invoke('logistics-save-driver', data),
        deleteDriver: (id: string) => invoke('logistics-delete-driver', id),

        getVehicles: () => invoke('logistics-get-vehicles'),
        saveVehicle: (data: any) => invoke('logistics-save-vehicle', data),
        deleteVehicle: (id: string) => invoke('logistics-delete-vehicle', id),
    },

    production: {
        getLogs: (date: string) => invoke('hr-get-production-logs', date),
        saveLog: (data: any) => invoke('hr-save-production-log', data),
        deleteLog: (id: string) => invoke('hr-delete-production-log', id),
    },

    commission: {
        get: (month: number, year: number) => invoke('hr-get-commissions', { month, year }),
        save: (data: any[]) => invoke('hr-save-commissions', data),
    },

    budget: {
        getAll: () => invoke('budget-get-all'),
        getById: (id: string) => invoke('budget-get-by-id', id),
        create: (data: any) => invoke('budget-create', data),
        updateStatus: (id: string, status: string) => invoke('budget-update-status', { id, status }),
        getReport: (id: string, period?: number) => invoke('budget-get-report', { id, period }),
    },

    import: {
        // Shipments
        getShipments: (filters: any) => invoke('import-get-shipments', filters),
        getShipmentById: (id: string) => invoke('import-get-shipment-by-id', id),
        saveShipment: (data: any) => invoke('import-save-shipment', data),
        deleteShipment: (id: string) => invoke('import-delete-shipment', id),

        // Containers
        getContainers: (shipmentId: string) => invoke('import-get-containers', shipmentId),
        saveContainer: (data: any) => invoke('import-save-container', data),
        deleteContainer: (id: string) => invoke('import-delete-container', id),

        // Expenses
        getExpenses: (shipmentId: string) => invoke('import-get-expenses', shipmentId),
        saveExpense: (data: any) => invoke('import-save-expense', data),
        getShipmentItems: (shipmentId: string) => invoke('import-get-shipment-items', shipmentId),

        // Legacy / Other
        getLCs: (status?: string) => invoke('import-get-lcs', status),
        getLCItems: (lcId: string) => invoke('import-get-items', lcId),
        allocateCosts: (lcId: string, expenses: any[], method: string) => invoke('import-allocate-costs', { lcId, expenses, method }),
        getDashboardStats: () => invoke('import-get-dashboard-stats'),

        // Proforma
        getProformas: (filters: any) => invoke('import-get-proformas', filters),
        getProforma: (id: string) => invoke('import-get-proforma', id),
        saveProforma: (data: any) => invoke('import-save-proforma', data),

        // Commercial Invoices
        getCommercialInvoices: (shipmentId: string) => invoke('import-get-commercial-invoices', shipmentId),
        getCommercialInvoice: (id: string) => invoke('import-get-commercial-invoice', id),
        saveCommercialInvoice: (data: any) => invoke('import-save-commercial-invoice', data),
        deleteCommercialInvoice: (id: string) => invoke('import-delete-commercial-invoice', id),
        getAllCommercialInvoices: () => invoke('import-get-all-commercial-invoices'),

        // Clearance Expenses
        getClearanceExpenses: (shipmentId: string) => invoke('import-get-clearance-expenses', shipmentId),
        getClearanceExpense: (id: string) => invoke('import-get-clearance-expense', id),
        saveClearanceExpense: (data: any) => invoke('import-save-clearance-expense', data),
        deleteClearanceExpense: (id: string) => invoke('import-delete-clearance-expense', id),

        // Document Management
        getShipmentDocuments: (shipmentId: string) => invoke('import-get-shipment-documents', shipmentId),
        saveShipmentDocument: (data: any) => invoke('import-save-shipment-document', data),
        deleteShipmentDocument: (id: string) => invoke('import-delete-shipment-document', id),

        // Enhanced Landed Cost
        calculateLandedCost: (shipmentId: string, method: string) => invoke('import-calculate-landed-cost', shipmentId, method),
        applyLandedCost: (shipmentId: string, allocations: any[]) => invoke('import-apply-landed-cost', shipmentId, allocations),
        getLandedCostHistory: (shipmentId: string) => invoke('import-get-landed-cost-history', shipmentId),

        // Reporting
        getShipmentCostBreakdown: (shipmentId: string) => invoke('import-get-shipment-cost-breakdown', shipmentId),
        getContainersNearDemurrage: (days: number) => invoke('import-get-containers-near-demurrage', days),
        getItemCostComparison: (itemId: string) => invoke('import-get-item-cost-comparison', itemId),
    },

    export: {
        // Shipments (Legacy)
        getShipments: (filters: any) => invoke('export:get-shipments', filters),
        getShipment: (id: string) => invoke('export:get-shipment', id),
        saveShipment: (data: any) => invoke('export:save-shipment', data),
        deleteShipment: (id: string) => invoke('export:delete-shipment', id),

        // Invoices
        getInvoices: (filters: any) => invoke('export-get-invoices', filters),
        getInvoice: (id: string) => invoke('export-get-invoice', id),
        saveInvoice: (data: any) => invoke('export-save-invoice', data),
        deleteInvoice: (id: string) => invoke('export-delete-invoice', id),

        // Packing Lists
        getPackingLists: (invoiceId: string) => invoke('export-get-packing-lists', invoiceId),
        getPackingList: (id: string) => invoke('export-get-packing-list', id),
        savePackingList: (data: any) => invoke('export-save-packing-list', data),
        deletePackingList: (id: string) => invoke('export-delete-packing-list', id),

        // Certificate of Origin
        generateCOO: (invoiceId: string) => invoke('export-generate-coo', invoiceId),
    },


    getMachineId: () => invoke('get-machine-id'),
    validateLicense: () => invoke('validate-license'),
    activateProduct: (key: string) => invoke('activate-product', key),
    importData: (type: string, data: any[]) => invoke('import-data', { type, data }),
    crudOperation: (op: any) => invoke('crud-operation', op),

    test: {
        runFullWorkflow: () => invoke('test:run-full-workflow'),
    }
});
