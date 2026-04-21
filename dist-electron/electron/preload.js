"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// @ts-ignore
const electron_1 = require("electron");
// --- Global Null Sanitizer ---
// Converts all null/undefined values from backend to valid empty strings
// to prevent "Main Process -> React State -> Uncontrolled Input" issues.
const sanitize = (data) => {
    if (data === null || data === undefined)
        return '';
    if (Array.isArray(data))
        return data.map(sanitize);
    if (typeof data === 'object') {
        const copy = {};
        for (const key in data) {
            copy[key] = sanitize(data[key]);
        }
        return copy;
    }
    return data;
};
// Wrapper for IPC calls
const invoke = async (channel, ...args) => {
    try {
        const result = await electron_1.ipcRenderer.invoke(channel, ...args);
        return sanitize(result);
    }
    catch (error) {
        console.error(`IPC Error [${channel}]:`, error);
        throw error;
    }
};
const unwrapIpcResult = (result) => {
    if (!result || typeof result !== 'object' || !('ok' in result)) {
        return result;
    }
    if (result.ok) {
        return result.data;
    }
    const err = new Error(result?.error?.message || result?.error?.messageKey || 'IPC wrapped error');
    err.code = result?.error?.code;
    err.messageKey = result?.error?.messageKey;
    err.details = result?.error?.details;
    throw err;
};
const invokeStrict = async (channel, ...args) => {
    const result = await invoke(channel, ...args);
    return unwrapIpcResult(result);
};
electron_1.contextBridge.exposeInMainWorld('electronAPI', {
    // 0. Financial Definitions (New)
    finance: {
        getTaxes: () => invoke('finance:getTaxes'),
        saveTax: (data) => invoke('finance:saveTax', data),
        deleteTax: (id) => invoke('finance:deleteTax', id),
        getAnalysisCodes: () => invoke('finance:getAnalysisCodes'),
        getAnalysisCodesFlat: () => invoke('finance:getAnalysisCodesFlat'),
        saveAnalysisCode: (data) => invoke('finance:saveAnalysisCode', data),
        deleteAnalysisCode: (id) => invoke('finance:deleteAnalysisCode', id),
    },
    // 1. Accounts & Transactions
    getAccounts: () => invoke('get-accounts'),
    getTransactionalAccounts: () => invoke('get-transactional-accounts'),
    reseedAccounts: () => invoke('reseed-accounts'),
    getAccountTree: () => invoke('get-account-tree'),
    getAccountChildren: (parentId) => invoke('get-account-children', parentId),
    getAccountPath: (accountId) => invoke('get-account-path', accountId),
    addAccount: (account) => invoke('add-account', account),
    updateAccount: (account) => invoke('update-account', account),
    getNextVoucherNo: (type) => invoke('get-next-voucher-no', type),
    saveTransaction: (data) => invoke('save-transaction', data),
    // 2. Products & Inventory
    getProducts: (search) => invoke('get-products', search),
    saveInvoice: (data) => invoke('save-invoice', data),
    savePurchase: (data) => invoke('save-purchase', data),
    getNextInvoiceNo: () => invoke('get-next-invoice-no'),
    getUnits: () => invoke('get-units'),
    createUnit: (unit) => invoke('create-unit', unit),
    getItems: () => invoke('get-items'),
    createItem: (item) => invoke('create-item', item),
    getWarehouses: () => invoke('get-warehouses'),
    createWarehouse: (warehouse) => invoke('create-warehouse', warehouse),
    updateWarehouse: (warehouse) => invoke('update-warehouse', warehouse),
    getStock: (ids) => invoke('get-stock', ids),
    addStockTransaction: (trx) => invoke('add-stock-transaction', trx),
    transferStock: (transfer) => invoke('transfer-stock', transfer),
    getStockTakes: () => invoke('get-stock-takes'),
    getStockTake: (id) => invoke('get-stock-take', id),
    initiateStockTake: (data) => invoke('initiate-stock-take', data),
    updateStockTakeItem: (id, qty) => invoke('update-stock-take-item', { id, qty }),
    postStockTake: (id) => invoke('post-stock-take', id),
    // 3. Checks
    getChecks: (status) => invoke('get-checks', status),
    updateCheckStatus: (data) => invoke('update-check-status', data),
    getAccountStatement: (data) => invoke('get-account-statement', data),
    saveReceiptVoucher: (data) => invoke('save-receipt-voucher', data),
    // 4. Manufacturing
    saveBom: (data) => invoke('save-bom', data),
    getBoms: () => invoke('get-boms'),
    executeProduction: (data) => invoke('execute-production', data),
    // 5. Reporting
    getDashboardKPIs: () => invoke('get-dashboard-kpis'),
    getDashboardCharts: () => invoke('get-dashboard-charts'),
    getReportPnL: (range) => invoke('get-report-pnl', range),
    getReportBalanceSheet: () => invoke('get-report-balance-sheet'),
    getReportAging: () => invoke('get-report-aging'),
    email: {
        sendEmail: (payload) => invoke('email:send', payload),
    },
    // 6. HR & Payroll
    // 6. HR & Payroll
    getEmployees: () => invoke('hr-get-employees'),
    getEmployee: (id) => invoke('hr-get-employee', id),
    saveEmployee: (data) => invoke('hr-save-employee', data),
    getAttendance: (date) => invoke('hr-get-daily-attendance', date), // Fixed: was get-attendance
    saveAttendance: (data) => invoke('hr-save-shift', data), // Note: Check main.ts for save-attendance, it maps to hr-save-shift or similar? 
    // Wait, main.ts says: ipcMain.handle('hr-get-shifts', ...); and ipcMain.handle('hr-save-shift', ...);
    // AND ipcMain.handle('hr-process-daily-attendance', ...); 
    // Let's stick to strict main.ts names:
    getShifts: () => invoke('hr-get-shifts'),
    saveShift: (data) => invoke('hr-save-shift', data),
    getDailyAttendance: (date) => invoke('hr-get-daily-attendance', date),
    // Payroll
    calculatePayroll: (data) => invoke('hr-get-payroll-preview', data), // data = {month, year}
    savePayrollRun: (data) => invoke('hr-post-payroll', data),
    generateSalaryEntry: (data) => invoke('hr-generate-salary-entry', data),
    getSlips: (data) => invoke('hr-get-slips', data),
    // Organization
    getDepartments: () => invoke('hr-get-departments'),
    saveDepartment: (data) => invoke('hr-save-department', data),
    deleteDepartment: (id) => invoke('hr-delete-department', id),
    getJobTitles: () => invoke('hr-get-job-titles'),
    saveJobTitle: (data) => invoke('hr-save-job-title', data),
    deleteJobTitle: (id) => invoke('hr-delete-job-title', id),
    // 7. Fixed Assets
    getAssets: () => invoke('get-assets'),
    saveAsset: (data) => invoke('save-asset', data),
    calcDepreciation: (assetId) => invoke('calc-depreciation', assetId),
    postDepreciation: (data) => invoke('post-depreciation', data),
    getAssetCategories: () => invoke('get-asset-categories'),
    saveAssetCategory: (data) => invoke('save-asset-category', data),
    getNextAssetCode: () => invoke('get-next-asset-code'),
    // 7.5 Budgets
    budgets: {
        list: () => invoke('budgets:list'),
        get: (id) => invoke('budgets:get', id),
        create: (data) => invoke('budgets:create', data),
        updateStatus: (id, status, userId) => invoke('budgets:updateStatus', id, status, userId),
        getVsActual: (id, period) => invoke('budgets:getVsActual', id, period)
    },
    // 8. System & Settings
    auth: {
        login: (creds) => invoke('auth-login', creds),
        logout: () => invoke('auth-logout'),
        changePassword: (data) => invoke('auth-change-password', data),
        getUsers: () => invoke('get-users'),
        saveUser: (user) => invoke('save-user', user),
        deleteUser: (id) => invoke('delete-user', id),
        getRoles: () => invoke('get-roles'),
        saveRole: (role) => invoke('save-role', role),
        deleteRole: (id) => invoke('delete-role', id),
        getPermissions: (roleId) => invoke('get-permissions', roleId),
        savePermissions: (data) => invoke('save-permissions', data),
        getBranches: () => invoke('get-branches'),
        saveBranch: (branch) => invoke('save-branch', branch),
        deleteBranch: (id) => invoke('delete-branch', id),
    },
    security: {
        getMyPermissions: () => invokeStrict('security:getMyPermissions'),
        getMySnapshot: () => invokeStrict('security:getMySnapshot'),
        getSnapshot: () => invokeStrict('permissions.getSnapshot'),
        refreshSnapshot: () => invokeStrict('security:refreshSnapshot'),
        refreshPermissions: () => invokeStrict('permissions.refreshSnapshot'),
        getAuthContext: () => invokeStrict('security:getAuthContext'),
        getCapabilityCatalog: () => invokeStrict('security:getCapabilityCatalog'),
        getRoleAssignments: (roleId, scope) => invokeStrict('security:getRoleAssignments', roleId, scope),
        saveRoleAssignments: (data) => invokeStrict('security:saveRoleAssignments', data),
    },
    permissions: {
        getSnapshot: () => invokeStrict('permissions.getSnapshot'),
        refreshSnapshot: () => invokeStrict('permissions.refreshSnapshot'),
    },
    audit: {
        list: (payload) => invokeStrict('audit.list', payload),
        record: (payload) => invokeStrict('audit.record', payload),
    },
    views: {
        list: (screenKey) => invokeStrict('views.list', screenKey),
        save: (payload) => invokeStrict('views.save', payload),
        apply: (payload) => invokeStrict('views.apply', payload),
        setDefault: (viewId) => invokeStrict('views.setDefault', viewId),
        delete: (viewId) => invokeStrict('views.delete', viewId),
    },
    financialPlatform: {
        startCloseCycle: (period) => invokeStrict('financialPlatform:startCloseCycle', period),
        startConsolidation: (data) => invokeStrict('financialPlatform:startConsolidation', data),
        upsertCashPosition: (data) => invokeStrict('financialPlatform:upsertCashPosition', data),
        createPaymentRun: (data) => invokeStrict('financialPlatform:createPaymentRun', data),
        submitRiskAssessment: (data) => invokeStrict('financialPlatform:submitRiskAssessment', data),
        createRevenueContract: (data) => invokeStrict('financialPlatform:createRevenueContract', data),
        runRevenueRecognition: (data) => invokeStrict('financialPlatform:runRevenueRecognition', data),
        postCarbonEntry: (data) => invokeStrict('financialPlatform:postCarbonEntry', data),
        runAnalyticsForecast: (data) => invokeStrict('financialPlatform:runAnalyticsForecast', data),
        getExecutiveSnapshot: () => invokeStrict('financialPlatform:getExecutiveSnapshot'),
    },
    runtimeLicense: {
        getStatus: (companyId) => invokeStrict('runtimeLicense:getStatus', companyId),
        setExtraSeats: (extraSeats, companyId) => invokeStrict('runtimeLicense:setExtraSeats', { extraSeats, companyId }),
        heartbeat: () => invokeStrict('runtimeLicense:heartbeat'),
    },
    attachments: {
        startUpload: (data) => invokeStrict('attachments:startUpload', data),
        uploadChunk: (data) => invokeStrict('attachments:uploadChunk', data),
        completeUpload: (sessionId) => invokeStrict('attachments:completeUpload', { sessionId }),
        abortUpload: (sessionId) => invokeStrict('attachments:abortUpload', { sessionId }),
        getQuota: () => invokeStrict('attachments:getQuota'),
        updateTier: (tier) => invokeStrict('attachments:updateTier', tier),
        addAddon: (addonGb) => invokeStrict('attachments:addAddon', addonGb),
        listFiles: (entityName, entityId) => invokeStrict('attachments:listFiles', { entityName, entityId }),
        deleteFile: (fileId) => invokeStrict('attachments:deleteFile', fileId),
    },
    system: {
        backupDatabase: () => invoke('backup-database'),
        restoreDatabase: () => invoke('restore-database'),
        checkIntegrity: () => invoke('check-integrity'),
        getAuditLogs: (filters) => invoke('get-audit-logs', filters),
        getSettings: () => invoke('get-settings'),
        saveSettings: (data) => invoke('save-settings', data),
        getTrialBalance: (params) => invoke('get-trial-balance', params),
        getDashboardKPIs: () => invoke('get-dashboard-kpis'),
        getDashboardCharts: () => invoke('get-dashboard-charts'),
        saveLogo: (buffer, name) => invoke('save-logo', { buffer, name }),
        saveImage: (buffer, name) => invoke('system:save-image', { buffer, name }),
    },
    dialog: {
        showOpenDialog: (options) => invoke('dialog:open-file', options)
    },
    print: {
        preview: () => invoke('print:preview'),
        getPrinters: () => invoke('print:getPrinters'),
        toPDF: (filename) => invoke('print:toPDF', filename),
    },
    currency: {
        getCurrencies: () => invokeStrict('finance:listCurrencies'),
        saveCurrency: (data) => invokeStrict('finance:saveCurrency', data),
        deleteCurrency: (id) => invokeStrict('finance:deleteCurrency', id),
        updateRates: () => invoke('currency-scraper-trigger'),
        getCurrencyHistory: (code, days) => invokeStrict('finance:getCurrencyHistory', code, days),
        getCurrencyTimeline: (code, limit) => invokeStrict('finance:getCurrencyTimeline', code, limit),
    },
    costCenter: {
        getCostCenters: () => invokeStrict('finance:listCostCenters'),
        saveCostCenter: (data) => invokeStrict('finance:saveCostCenter', data),
        deleteCostCenter: (id) => invokeStrict('finance:deleteCostCenter', id),
    },
    taxGroup: {
        getTaxGroups: () => invokeStrict('finance:listTaxGroups'),
        saveTaxGroup: (data) => invokeStrict('finance:saveTaxGroup', data),
        deleteTaxGroup: (id) => invokeStrict('finance:deleteTaxGroup', id),
    },
    warehouse: {
        getWarehouses: (companyId) => invoke('get-warehouses', companyId),
        getWarehouse: (id, companyId) => invoke('get-warehouse', id, companyId),
        createWarehouse: (data) => invoke('create-warehouse', data),
        updateWarehouse: (id, companyId, updates) => invoke('update-warehouse', id, companyId, updates),
        deleteWarehouse: (id, companyId) => invoke('delete-warehouse', id, companyId),
        getBinLocations: (warehouseId) => invoke('get-bin-locations', warehouseId),
        getBinLocation: (id) => invoke('get-bin-location', id),
        createBinLocation: (data) => invoke('create-bin-location', data),
        updateBinLocation: (id, updates) => invoke('update-bin-location', id, updates),
        deleteBinLocation: (id) => invoke('delete-bin-location', id),
    },
    itemTracking: {
        // Batches
        getBatches: (itemId) => invoke('get-item-batches', itemId),
        getBatch: (id) => invoke('get-item-batch', id),
        createBatch: (data) => invoke('create-item-batch', data),
        updateBatch: (id, updates) => invoke('update-item-batch', id, updates),
        deleteBatch: (id) => invoke('delete-item-batch', id),
        // Serials
        getSerials: (itemId) => invoke('get-item-serials', itemId),
        getSerial: (id) => invoke('get-item-serial', id),
        createSerial: (data) => invoke('create-item-serial', data),
        updateSerialStatus: (id, status) => invoke('update-item-serial-status', id, status),
        deleteSerial: (id) => invoke('delete-item-serial', id),
    },
    branch: {
        getBranches: () => invoke('get-branches'),
        saveBranch: (branch) => invoke('save-branch', branch),
        deleteBranch: (id) => invoke('delete-branch', id),
    },
    account: {
        getAccounts: () => invoke('get-accounts'),
        getAccount: (id) => invoke('get-account', id), // Added
        getTree: () => invoke('get-account-tree'),
        saveAccount: (account) => invoke('save-account', account),
        deleteAccount: (id) => invoke('delete-account', id),
    },
    inventory: {
        getItems: () => invoke('inventory:get-items-v2'), // Use V2
        suggestItems: (q, limit) => invoke('inventory:suggest-items', q, limit),
        getItemDetails: (id) => invoke('inventory:get-item-details', id),
        saveItem: (item) => invoke('inventory:update-item', item), // Mapped to new update logic
        updateItem: (item) => invoke('inventory:update-item', item), // Explicit new method
        bulkUpdateItems: (updates) => invoke('inventory:bulk-update-items', updates),
        createItem: (item) => invoke('inventory:create-item', item),
        deleteItem: (id) => invoke('delete-item', id),
        getStockTakes: () => invoke('inventory:get-stock-takes'),
        getStockTake: (id) => invoke('inventory:get-stock-take', id),
        createStockTake: (data) => invoke('inventory:create-stock-take', data),
        updateStockTakeItem: (id, qty) => invoke('inventory:update-stock-take-item', id, qty),
        approveStockTake: (id) => invoke('inventory:approve-stock-take', id),
        getLastClosingDate: () => invoke('inventory:get-last-closing-date'),
        closePeriod: (date) => invoke('inventory:close-period', date),
        getUnits: () => invoke('inventory:get-units'),
        createUnit: (unit) => invoke('create-unit', unit),
        deleteUnit: (id) => invoke('inventory:delete-unit', id),
        seedDefaultUnits: () => invoke('inventory:seed-default-units'),
        getBrands: () => invoke('inventory:get-brands'),
        createBrand: (brand) => invoke('inventory:create-brand', brand),
        updateBrand: (brand) => invoke('inventory:update-brand', brand),
        deleteBrand: (id) => invoke('inventory:delete-brand', id),
        // Attributes
        getAttributes: () => invoke('inventory:get-attributes'),
        saveAttribute: (attr) => invoke('inventory:save-attribute', attr),
        deleteAttribute: (id) => invoke('inventory:delete-attribute', id),
        getAttributeValues: (attrId) => invoke('inventory:get-attribute-values', attrId),
        saveAttributeValue: (data) => invoke('inventory:save-attribute-value', data),
        deleteAttributeValue: (id) => invoke('inventory:delete-attribute-value', id),
        getCategories: () => invoke('get-categories'),
        createCategory: (cat) => invoke('create-category', cat),
        updateCategory: (cat) => invoke('update-category', cat),
        deleteCategory: (id) => invoke('delete-category', id),
        getWarehouses: () => invoke('get-warehouses'),
        createWarehouse: (wh) => invoke('create-warehouse', wh),
        updateWarehouse: (wh) => invoke('update-warehouse', wh),
        deleteWarehouse: (id) => invoke('inventory:delete-warehouse', id),
        updateStock: (data) => invoke('inventory-update-stock', data),
        getBatches: (itemId) => invoke('inventory:get-batches', itemId),
        createBatch: (batch) => invoke('inventory:create-batch', batch),
        transferRequest: (data) => invoke('inventory:transfer-request', data),
        getTransferRequests: (filters) => invoke('inventory:get-transfer-requests', filters),
        getTransferRequest: (id) => invoke('inventory:get-transfer-request', id),
        getBins: (warehouseId) => invoke('get-warehouse-bins', warehouseId),
        createBin: (bin) => invoke('create-warehouse-bin', bin),
        deleteBin: (id) => invoke('delete-warehouse-bin', id),
        createStockDocument: (doc) => invoke('create-stock-document', doc), // Added
        updateStockDocument: (doc) => invoke('update-stock-document', doc),
        getValuation: (filters) => invoke('inventory:get-valuation', filters), // Added
        receiveTransfer: (data) => invoke('inventory:receive-transfer', data), // Added
        getGoodsReceipts: () => invoke('inventory-get-grns'),
        getDispatches: () => invoke('inventory-get-dispatches'),
        getStockDocument: (id) => invoke('inventory-get-stock-document', id),
        getKit: (itemId) => invoke('inventory:get-kit', itemId),
        createAssembly: (data) => invoke('inventory:create-assembly', data),
    },
    dispatch: {
        update: (id, payload) => invoke('dispatch:update', id, payload),
        postToPending: (id) => invoke('dispatch:post-to-pending', id),
        invoiceFromDispatch: (dispatchId) => invoke('dispatch:invoice-from-dispatch', dispatchId),
        getAll: () => invoke('dispatch:getAll'),
        getById: (id) => invoke('dispatch:getById', id),
    },
    hr: {
        // Departments
        getDepartments: () => invoke('hr-get-departments'),
        saveDepartment: (data) => invoke('hr-save-department', data),
        deleteDepartment: (id) => invoke('hr-delete-department', id),
        getTitles: () => invoke('hr-get-titles'),
        saveTitle: (data) => invoke('hr-save-title', data),
        deleteTitle: (id) => invoke('hr-delete-title', id),
        // Employees
        getEmployees: () => invoke('hr-get-employees'),
        getEmployee: (id) => invoke('hr-get-employee', id),
        saveEmployee: (data) => invoke('hr-save-employee', data),
        getNextCode: () => invoke('hr-get-next-code'),
        savePhoto: (buffer, name) => invoke('hr-save-photo', { buffer, name }),
        // Attendance
        getShifts: () => invoke('hr-get-shifts'),
        saveShift: (data) => invoke('hr-save-shift', data),
        importAttendance: (records) => invoke('hr-import-attendance', records),
        processAttendance: (date) => invoke('hr-process-attendance', date),
        getDailyAttendance: (date) => invoke('hr-get-daily-attendance', date),
        // Leaves
        getLeaveTypes: () => invoke('hr-get-leave-types'),
        saveLeaveType: (data) => invoke('hr-save-leave-type', data),
        getLeaveRequests: (filter) => invoke('hr-get-leave-requests', filter),
        saveLeaveRequest: (data) => invoke('hr-save-leave-request', data),
        updateLeaveStatus: (id, status, reason) => invoke('hr-update-leave-status', { id, status, reason }),
        getLeaveBalances: (id, year) => invoke('hr-get-employee-balances', { employeeId: id, year }),
        // Payroll
        saveAdvance: (data) => invoke('hr-save-advance', data),
        getAdvances: (id) => invoke('hr-get-advances', id),
        generatePayroll: (month, year) => invoke('hr-generate-payroll', { month, year }),
        postPayroll: (month, year, slips) => invoke('hr-post-payroll', { month, year, slips }),
        getSlips: (month, year) => invoke('hr-get-slips', { month, year }),
    },
    partner: {
        getPartners: (type) => invoke('get-partners', type),
        getPartner: (id) => invoke('get-partner', id),
        savePartner: (partner) => invoke('save-partner', partner),
        deletePartner: (id) => invoke('delete-partner', id),
        // Customer Types
        getCustomerTypes: () => invoke('partner:get-customer-types'),
        saveCustomerType: (data) => invoke('partner:save-customer-type', data),
        deleteCustomerType: (id) => invoke('partner:delete-customer-type', id),
        // Vendor Types
        getVendorTypes: () => invoke('partner:get-vendor-types'),
        saveVendorType: (data) => invoke('partner:save-vendor-type', data),
        deleteVendorType: (id) => invoke('partner:delete-vendor-type', id),
        // Contact Types
        getContactTypes: () => invoke('partner:get-contact-types'),
        // Memberships & Sectors
        getMemberships: () => invoke('partner:get-memberships'),
        saveMembership: (data) => invoke('partner:save-membership', data),
        deleteMembership: (id) => invoke('partner:delete-membership', id),
        getSectors: () => invoke('partner:get-sectors'),
        saveSector: (data) => invoke('partner:save-sector', data),
        deleteSector: (id) => invoke('partner:delete-sector', id),
        // Credit Policies
        getCreditPolicies: () => invoke('partner:get-credit-policies'),
        saveCreditPolicy: (data) => invoke('partner:save-credit-policy', data),
        deleteCreditPolicy: (id) => invoke('partner:delete-credit-policy', id),
        // Regions & Groups
        getRegions: () => invoke('partner:get-regions'),
        saveRegion: (data) => invoke('partner:save-region', data),
        createRegion: (data) => invoke('partner:create-region', data),
        updateRegion: (data) => invoke('partner:update-region', data),
        deleteRegion: (id) => invoke('partner:delete-region', id),
        getGroups: () => invoke('partner:get-groups'),
        saveGroup: (data) => invoke('partner:save-group', data),
        deleteGroup: (id) => invoke('partner:delete-group', id),
        getSalesReps: () => invoke('partner:get-sales-reps'),
        saveSalesRep: (data) => invoke('partner:save-sales-rep', data),
        deleteSalesRep: (id) => invoke('partner:delete-sales-rep', id),
        // Price Lists
        getPriceLists: () => invoke('partner:getPriceLists'),
        savePriceList: (data) => invoke('partner:savePriceList', data),
        deletePriceList: (id) => invoke('partner:deletePriceList', id),
        getPriceListItems: (listId) => invoke('partner:getPriceListItems', listId),
        savePriceListItem: (data) => invoke('partner:savePriceListItem', data),
        deletePriceListItem: (id) => invoke('partner:deletePriceListItem', id),
    },
    journal: {
        getNextVoucherNo: (prefix) => invoke('get-next-voucher-no', prefix),
        createEntry: (header, lines) => invoke('create-journal-entry', { header, lines }),
        getEntry: (id) => invoke('get-journal-entry', id),
        getEntries: (filters) => invoke('get-journal-entries', filters),
    },
    ae: {
        listSubAccounts: (accountId) => invoke('ae:list-sub-accounts', accountId),
        createSubAccount: (data) => invoke('ae:create-sub-account', data),
        listReferences: (refType) => invoke('ae:list-references', refType),
        createReference: (data) => invoke('ae:create-reference', data),
        saveDraftVoucher: (payload) => invoke('ae:save-draft-voucher', payload),
        postVoucher: (payload) => invoke('ae:post-voucher', payload),
        postDraftVoucher: (voucherId) => invoke('ae:post-draft-voucher', voucherId),
        getVoucher: (id) => invoke('ae:get-voucher', id),
        getVouchers: (filters) => invoke('ae:get-vouchers', filters),
        getTrialBalance: (params) => invoke('ae:get-trial-balance', params),
    },
    sales: {
        createInvoice: (invoice) => invoke('sales-create-invoice', invoice),
        getNextInvoiceNo: () => invoke('get-next-invoice-no'),
        getInvoice: (id) => invoke('sales-get-invoice', id),
        postInvoice: (id, userId) => invoke('sales-post-invoice', id, userId),
        submitInvoiceForApproval: (id, userId) => invoke('sales-submit-invoice-approval', id, userId),
        createQuotation: (data) => invoke('sales-create-quotation', data),
        getQuotations: () => invoke('sales-get-quotations'),
        getQuotation: (id) => invoke('sales-get-quotation', id),
        updateQuotationStatus: (id, status) => invoke('sales-update-quotation-status', { id, status }),
        createOrder: (data) => invoke('sales-create-order', data),
        getOrders: () => invoke('sales-get-orders'),
        getPendingOrders: () => invoke('sales-get-pending-orders'),
        getOrder: (id) => invoke('sales-get-order', id),
        updateOrderStatus: (id, status) => invoke('sales-update-order-status', { id, status }),
        deleteOrder: (id) => invoke('sales-delete-order', id),
        createReturn: (data) => invoke('sales-create-return', data),
        getReturns: () => invoke('sales-get-returns'),
        getReturn: (id) => invoke('sales-get-return', id),
        getInvoices: () => invoke('sales-get-invoices'),
    },
    purchase: {
        createInvoice: (invoice) => invoke('purchase-create-invoice', invoice),
        getNextInvoiceNo: () => invoke('purchase-get-next-no'),
        createOrder: (data) => invoke('purchase-create-order', data),
        getOrders: () => invoke('purchase-get-orders'),
        getOrder: (id) => invoke('purchase-get-order', id),
        updateOrder: (data) => invoke('purchase-update-order', data),
        postOrder: (id, userId) => invoke('purchase-post-order', id, userId),
        deleteOrder: (id) => invoke('purchase-delete-order', id),
        approveOrder: (id, userId) => invoke('purchase-approve-order', id, userId),
        rejectOrder: (id, userId, reason) => invoke('purchase-reject-order', id, userId, reason),
        getInvoice: (id) => invoke('purchase-get-invoice', id),
        getInvoices: () => invoke('purchase-get-invoices'),
        purchaseGetOrders: (filters) => invoke('purchase-get-orders', filters),
        purchaseGetOrder: (id) => invoke('purchase-get-order', id),
        purchaseCreateOrder: (data) => invoke('purchase-create-order', data),
        purchaseUpdateOrder: (data) => invoke('purchase-update-order', data),
        purchaseDeleteOrder: (id) => invoke('purchase-delete-order', id),
        purchasePostOrder: (id, userId) => invoke('purchase-post-order', id, userId),
        purchaseApproveOrder: (id, userId) => invoke('purchase-approve-order', id, userId),
        purchaseRejectOrder: (id, userId, reason) => invoke('purchase-reject-order', id, userId, reason),
        createRequest: (data) => invoke('purchase-create-request', data),
        getRequests: () => invoke('purchase-get-requests'),
        getRequest: (id) => invoke('purchase-get-request', id),
        updateRequest: (data) => invoke('purchase-update-request', data),
        postRequest: (id, userId) => invoke('purchase-post-request', id, userId),
        deleteRequest: (id) => invoke('purchase-delete-request', id),
        approveRequest: (id, userId) => invoke('purchase-approve-request', id, userId),
        rejectRequest: (id, userId, reason) => invoke('purchase-reject-request', id, userId, reason),
        purchaseGetRequests: (filters) => invoke('purchase-get-requests', filters),
        purchaseGetRequest: (id) => invoke('purchase-get-request', id),
        purchaseCreateRequest: (data) => invoke('purchase-create-request', data),
        purchaseUpdateRequest: (data) => invoke('purchase-update-request', data),
        purchaseDeleteRequest: (id) => invoke('purchase-delete-request', id),
        purchasePostRequest: (id, userId) => invoke('purchase-post-request', id, userId),
        purchaseApproveRequest: (id, userId) => invoke('purchase-approve-request', id, userId),
        purchaseRejectRequest: (id, userId, reason) => invoke('purchase-reject-request', id, userId, reason),
        createRFQ: (data) => invoke('purchase-create-rfq', data),
        getRFQs: () => invoke('purchase-get-rfqs'),
        getRFQ: (id) => invoke('purchase-get-rfq', id),
        updateRFQ: (data) => invoke('purchase-update-rfq', data),
        createReturn: (data) => invoke('purchase-create-return', data),
        getReturns: () => invoke('purchase-get-returns'),
        getReturn: (id) => invoke('purchase-get-return', id),
        // GRN (Goods Receipt Notes) integrated under purchase namespace
        saveGRN: (data) => invoke('grn:save', data),
        postGRNToPending: (id) => invoke('grn:post-to-pending', id),
        invoiceFromGRN: (id) => invoke('grn:invoice', id),
        getGRN: (id) => invoke('grn:get', id),
        getGRNs: () => invoke('grn:list'),
    },
    grn: {
        save: (data) => invoke('grn:save', data),
        postToPending: (id) => invoke('grn:post-to-pending', id),
        invoice: (id) => invoke('grn:invoice', id),
        get: (id) => invoke('grn:get', id),
        list: () => invoke('grn:list'),
    },
    treasury: {
        createReceipt: (data) => invoke('treasury-create-receipt', data),
        createPayment: (data) => invoke('treasury-create-payment', data),
        deleteReceipt: (id) => invoke('treasury-delete-receipt', id),
        deletePayment: (id) => invoke('treasury-delete-payment', id),
        postReceipt: (id) => invoke('treasury-post-receipt', id),
        postPayment: (id) => invoke('treasury-post-payment', id),
        updateReceiptStatus: (id, status) => invoke('treasury-update-receipt-status', { id, status }),
        updatePaymentStatus: (id, status) => invoke('treasury-update-payment-status', { id, status }),
        getReceipt: (id) => invoke('treasury-get-receipt', id),
        getPayment: (id) => invoke('treasury-get-payment', id),
        getPayments: (filters) => invoke('treasury-get-payments', filters),
        getReceipts: (filters) => invoke('treasury-get-receipts', filters),
        getBookBalance: (accountId, date) => invoke('treasury-get-book-balance', { accountId, date }),
    },
    cheques: {
        getCheques: (filters) => electron_1.ipcRenderer.invoke('cheques-get', filters), // Keep old for compat if needed, or remove
        get: (filters) => electron_1.ipcRenderer.invoke('cheques-get', filters),
        updateStatus: (data) => electron_1.ipcRenderer.invoke('cheques-update-status', data)
    },
    reports: {
        getPartnerLedger: (filters) => invoke('reports-get-partner-ledger', filters),
        getItemMovement: (filters) => invoke('reports-get-item-movement', filters),
        getTrialBalance: () => invoke('reports-get-trial-balance'),
        getInventoryStatus: () => invoke('reports-get-inventory-status'),
        getSalesAnalytics: (range) => invoke('reports-get-sales-analytics', range),
        getProfitability: (range) => invoke('reports-get-profitability', range),
        getPurchasingAnalysis: (range) => invoke('reports-get-purchasing-analysis', range),
        getPurchasesByVendor: (range) => invoke('reports-get-purchases-by-vendor', range),
        getImportReports: () => invoke('reports-get-import-reports'),
        getChequesReport: (filters) => invoke('reports-get-cheques', filters),
        getAccountStatement: (filters) => invoke('reports-get-account-statement', filters),
        getAgingReport: () => invoke('reports-get-aging'),
        getTaxReport: (range) => invoke('reports-get-tax', range),
        getTopCustomers: () => invoke('reports-get-top-customers'),
        getSlowMovingItems: (days) => invoke('reports-get-slow-moving', days),
        getExpiryReport: (days) => invoke('reports-get-expiry', days),
    },
    masterData: {
        // Banks
        getBanks: () => invoke('md-get-banks'),
        saveBank: (data) => invoke('md-save-bank', data),
        deleteBank: (id) => invoke('md-delete-bank', id),
        importBanksHtml: (path) => invoke('md-import-banks-html', path),
        // Accounts
        getBankAccounts: () => invoke('md-get-bank-accounts'),
        saveBankAccount: (data) => invoke('md-save-bank-account', data),
        deleteBankAccount: (id) => invoke('md-delete-bank-account', id),
        // Cash Boxes
        getCashBoxes: () => invoke('md-get-cash-boxes'),
        saveCashBox: (data) => invoke('md-save-cash-box', data),
        deleteCashBox: (id) => invoke('md-delete-cash-box', id),
        // Cost Centers
        getCostCenters: () => invoke('md-get-cost-centers'),
        saveCostCenter: (data) => invoke('md-save-cost-center', data),
        deleteCostCenter: (id) => invoke('md-delete-cost-center', id),
        // Payment Methods
        getPaymentMethods: () => invoke('md-get-payment-methods'),
        savePaymentMethod: (data) => invoke('md-save-payment-method', data),
        // Branches
        getBranches: () => invoke('md-get-branches'),
        saveBranch: (data) => invoke('md-save-branch', data),
        deleteBranch: (id) => invoke('md-delete-branch', id),
    },
    logistics: {
        getDrivers: () => invoke('logistics-get-drivers'),
        saveDriver: (data) => invoke('logistics-save-driver', data),
        deleteDriver: (id) => invoke('logistics-delete-driver', id),
        getVehicles: () => invoke('logistics-get-vehicles'),
        saveVehicle: (data) => invoke('logistics-save-vehicle', data),
        deleteVehicle: (id) => invoke('logistics-delete-vehicle', id),
    },
    production: {
        getLogs: (date) => invoke('hr-get-production-logs', date),
        saveLog: (data) => invoke('hr-save-production-log', data),
        deleteLog: (id) => invoke('hr-delete-production-log', id),
    },
    commission: {
        get: (month, year) => invoke('hr-get-commissions', { month, year }),
        save: (data) => invoke('hr-save-commissions', data),
    },
    budget: {
        getAll: () => invoke('budget-get-all'),
        getById: (id) => invoke('budget-get-by-id', id),
        create: (data) => invoke('budget-create', data),
        updateStatus: (id, status) => invoke('budget-update-status', { id, status }),
        getReport: (id, period) => invoke('budget-get-report', { id, period }),
    },
    import: {
        // Shipments
        getShipments: (filters) => invoke('import-get-shipments', filters),
        getShipmentById: (id) => invoke('import-get-shipment-by-id', id),
        saveShipment: (data) => invoke('import-save-shipment', data),
        deleteShipment: (id) => invoke('import-delete-shipment', id),
        // Containers
        getContainers: (shipmentId) => invoke('import-get-containers', shipmentId),
        saveContainer: (data) => invoke('import-save-container', data),
        deleteContainer: (id) => invoke('import-delete-container', id),
        // Expenses
        getExpenses: (shipmentId) => invoke('import-get-expenses', shipmentId),
        saveExpense: (data) => invoke('import-save-expense', data),
        getShipmentItems: (shipmentId) => invoke('import-get-shipment-items', shipmentId),
        // Legacy / Other
        getLCs: (status) => invoke('import-get-lcs', status),
        getLCItems: (lcId) => invoke('import-get-items', lcId),
        allocateCosts: (lcId, expenses, method) => invoke('import-allocate-costs', { lcId, expenses, method }),
        getDashboardStats: () => invoke('import-get-dashboard-stats'),
        // Proforma
        getProformas: (filters) => invoke('import-get-proformas', filters),
        getProforma: (id) => invoke('import-get-proforma', id),
        saveProforma: (data) => invoke('import-save-proforma', data),
        // Commercial Invoices
        getCommercialInvoices: (shipmentId) => invoke('import-get-commercial-invoices', shipmentId),
        getCommercialInvoice: (id) => invoke('import-get-commercial-invoice', id),
        saveCommercialInvoice: (data) => invoke('import-save-commercial-invoice', data),
        deleteCommercialInvoice: (id) => invoke('import-delete-commercial-invoice', id),
        getAllCommercialInvoices: () => invoke('import-get-all-commercial-invoices'),
        // Clearance Expenses
        getClearanceExpenses: (shipmentId) => invoke('import-get-clearance-expenses', shipmentId),
        getClearanceExpense: (id) => invoke('import-get-clearance-expense', id),
        saveClearanceExpense: (data) => invoke('import-save-clearance-expense', data),
        deleteClearanceExpense: (id) => invoke('import-delete-clearance-expense', id),
        // Document Management
        getShipmentDocuments: (shipmentId) => invoke('import-get-shipment-documents', shipmentId),
        saveShipmentDocument: (data) => invoke('import-save-shipment-document', data),
        deleteShipmentDocument: (id) => invoke('import-delete-shipment-document', id),
        // Enhanced Landed Cost
        calculateLandedCost: (shipmentId, method) => invoke('import-calculate-landed-cost', shipmentId, method),
        applyLandedCost: (shipmentId, allocations) => invoke('import-apply-landed-cost', shipmentId, allocations),
        getLandedCostHistory: (shipmentId) => invoke('import-get-landed-cost-history', shipmentId),
        // Reporting
        getShipmentCostBreakdown: (shipmentId) => invoke('import-get-shipment-cost-breakdown', shipmentId),
        getContainersNearDemurrage: (days) => invoke('import-get-containers-near-demurrage', days),
        getItemCostComparison: (itemId) => invoke('import-get-item-cost-comparison', itemId),
    },
    export: {
        // Shipments (Legacy)
        getShipments: (filters) => invoke('export:get-shipments', filters),
        getShipment: (id) => invoke('export:get-shipment', id),
        saveShipment: (data) => invoke('export:save-shipment', data),
        deleteShipment: (id) => invoke('export:delete-shipment', id),
        // Invoices
        getInvoices: (filters) => invoke('export-get-invoices', filters),
        getInvoice: (id) => invoke('export-get-invoice', id),
        saveInvoice: (data) => invoke('export-save-invoice', data),
        deleteInvoice: (id) => invoke('export-delete-invoice', id),
        // Packing Lists
        getPackingLists: (invoiceId) => invoke('export-get-packing-lists', invoiceId),
        getPackingList: (id) => invoke('export-get-packing-list', id),
        savePackingList: (data) => invoke('export-save-packing-list', data),
        deletePackingList: (id) => invoke('export-delete-packing-list', id),
        // Certificate of Origin
        generateCOO: (invoiceId) => invoke('export-generate-coo', invoiceId),
    },
    workflow: {
        postDocument: (docType, docId, userId) => invoke('workflow:postDocument', docType, docId, userId),
        submitDocumentForApproval: (docType, docId, userId) => invoke('workflow:submitDocumentForApproval', docType, docId, userId),
        approveDocument: (docType, docId, userId) => invoke('workflow:approveDocument', docType, docId, userId),
        rejectDocument: (docType, docId, userId, reason) => invoke('workflow:rejectDocument', docType, docId, userId, reason),
        reopenRejected: (docType, docId, userId) => invoke('workflow:reopenRejected', docType, docId, userId),
        getPendingApprovals: () => invoke('workflow:getPendingApprovals')
    },
    approvalV2: {
        listPending: (params) => invoke('approval:listPendingV2', params),
        approve: (params) => invoke('approval:approveV2', params),
        reject: (params) => invoke('approval:rejectV2', params),
        rules: {
            list: (docType) => invoke('approval:rules:list', docType),
            upsert: (rule) => invoke('approval:rules:upsert', rule),
            delete: (id) => invoke('approval:rules:delete', id)
        }
    },
    approvalV3: {
        listPending: (params) => invoke('approval:listPendingV3', params),
        bulkApprove: (params) => invoke('approval:bulkApprove', params),
        bulkReject: (params) => invoke('approval:bulkReject', params),
        runSlaSweepNow: () => invoke('approval:runSlaSweepNow'),
        slaRules: {
            list: () => invoke('approval:slaRules:list'),
            upsert: (rule) => invoke('approval:slaRules:upsert', rule),
            delete: (id) => invoke('approval:slaRules:delete', id)
        }
    },
    approvalV4: {
        listPendingKeyset: (params) => invoke('approval:listPendingKeyset', params),
        approve: (params) => invoke('approvalV4:approve', params),
        reject: (params) => invoke('approvalV4:reject', params),
        bulkApprove: (params) => invoke('approvalV4:bulkApprove', params),
        bulkReject: (params) => invoke('approvalV4:bulkReject', params),
        runSlaSweepNow: () => invoke('approvalV4:runSlaSweepNow'),
        rules: {
            list: (docType) => invoke('approvalV4:rules:list', docType),
            upsert: (rule) => invoke('approvalV4:rules:upsert', rule),
            delete: (id) => invoke('approvalV4:rules:delete', id)
        },
        slaRules: {
            list: () => invoke('approvalV4:slaRules:list'),
            upsert: (rule) => invoke('approvalV4:slaRules:upsert', rule),
            delete: (id) => invoke('approvalV4:slaRules:delete', id)
        },
        schedulerLogs: {
            list: (limit) => invoke('approvalV4:schedulerLogs:list', limit)
        }
    },
    documentsRead: {
        getHeader: (docType, docId) => invoke('documents:getHeader', docType, docId),
        getAuditTrail: (docId) => invoke('documents:getAuditTrail', docId)
    },
    framework: {
        list: (docType, params) => invoke(`${docType}:list`, params),
        get: (docType, id) => invoke(`${docType}:get`, id),
        createDraft: (docType, userId) => invoke(`${docType}:createDraft`, userId),
        save: (docType, params) => invoke(`${docType}:save`, params),
        validate: (docType, id) => invoke(`${docType}:validate`, id),
        postOrSubmit: (docType, params) => invoke(`${docType}:postOrSubmit`, params),
        reopenRejected: (docType, params) => invoke(`${docType}:reopenRejected`, params)
    },
    salesInvoices: {
        list: (params) => invoke('salesInvoices:list', params),
        get: (id) => invoke('salesInvoices:get', id),
        createDraft: (userId) => invoke('salesInvoices:createDraft', userId),
        save: (params) => invoke('salesInvoices:save', params),
        validate: (id) => invoke('salesInvoices:validate', id),
        postOrSubmit: (params) => invoke('salesInvoices:postOrSubmit', params),
        void: (params) => invoke('salesInvoices:void', params),
        reopenRejected: (params) => invoke('salesInvoices:reopenRejected', params),
        searchCustomers: (search) => invoke('salesInvoices:searchCustomers', search),
        searchItems: (search) => invoke('salesInvoices:searchItems', search),
    },
    salesQuotation: {
        create: (payload) => invokeStrict('salesQuotation.create', payload),
        update: (payload) => invokeStrict('salesQuotation.update', payload),
        getById: (documentId) => invokeStrict('salesQuotation.getById', documentId),
        confirm: (documentId) => invokeStrict('salesQuotation.confirm', documentId),
        cancel: (documentId) => invokeStrict('salesQuotation.cancel', documentId),
        convertToOrder: (payload) => invokeStrict('salesQuotation.convertToOrder', payload),
    },
    salesOrder: {
        create: (payload) => invokeStrict('salesOrder.create', payload),
        update: (payload) => invokeStrict('salesOrder.update', payload),
        getById: (documentId) => invokeStrict('salesOrder.getById', documentId),
        confirm: (documentId) => invokeStrict('salesOrder.confirm', documentId),
        cancel: (documentId) => invokeStrict('salesOrder.cancel', documentId),
        convertToDelivery: (payload) => invokeStrict('salesOrder.convertToDelivery', payload),
        getFulfillmentStatus: (orderId) => invokeStrict('salesOrder.getFulfillmentStatus', orderId),
        prepareInvoice: (orderId) => invokeStrict('salesOrder.prepareInvoice', orderId),
    },
    deliveryNote: {
        create: (payload) => invokeStrict('deliveryNote.create', payload),
        update: (payload) => invokeStrict('deliveryNote.update', payload),
        getById: (documentId) => invokeStrict('deliveryNote.getById', documentId),
        post: (documentId) => invokeStrict('deliveryNote.post', { documentId }),
        cancel: (payload) => invokeStrict('deliveryNote.cancel', payload),
        prepareInvoice: (documentId) => invokeStrict('deliveryNote.prepareInvoice', documentId),
    },
    salesReturn: {
        create: (payload) => invokeStrict('salesReturn.create', payload),
        update: (payload) => invokeStrict('salesReturn.update', payload),
        getById: (documentId) => invokeStrict('salesReturn.getById', documentId),
        post: (documentId) => invokeStrict('salesReturn.post', { documentId }),
        cancel: (payload) => invokeStrict('salesReturn.cancel', payload),
        getPostingStatus: (documentId) => invokeStrict('salesReturn.getPostingStatus', documentId),
    },
    purchaseRequest: {
        create: (payload) => invokeStrict('purchaseRequest.create', payload),
        update: (payload) => invokeStrict('purchaseRequest.update', payload),
        getById: (documentId) => invokeStrict('purchaseRequest.getById', documentId),
        confirm: (documentId) => invokeStrict('purchaseRequest.confirm', documentId),
        cancel: (documentId) => invokeStrict('purchaseRequest.cancel', documentId),
        convertToRfq: (payload) => invokeStrict('purchaseRequest.convertToRfq', payload),
        convertToOrder: (payload) => invokeStrict('purchaseRequest.convertToOrder', payload),
    },
    purchaseRfq: {
        create: (payload) => invokeStrict('purchaseRfq.create', payload),
        update: (payload) => invokeStrict('purchaseRfq.update', payload),
        getById: (documentId) => invokeStrict('purchaseRfq.getById', documentId),
        confirm: (documentId) => invokeStrict('purchaseRfq.confirm', documentId),
        cancel: (documentId) => invokeStrict('purchaseRfq.cancel', documentId),
        convertToOrder: (payload) => invokeStrict('purchaseRfq.convertToOrder', payload),
    },
    purchaseOrder: {
        create: (payload) => invokeStrict('purchaseOrder.create', payload),
        update: (payload) => invokeStrict('purchaseOrder.update', payload),
        getById: (documentId) => invokeStrict('purchaseOrder.getById', documentId),
        confirm: (documentId) => invokeStrict('purchaseOrder.confirm', documentId),
        cancel: (documentId) => invokeStrict('purchaseOrder.cancel', documentId),
        convertToReceipt: (payload) => invokeStrict('purchaseOrder.convertToReceipt', payload),
        getFulfillmentStatus: (orderId) => invokeStrict('purchaseOrder.getFulfillmentStatus', orderId),
    },
    goodsReceiptNote: {
        create: (payload) => invokeStrict('goodsReceiptNote.create', payload),
        update: (payload) => invokeStrict('goodsReceiptNote.update', payload),
        getById: (documentId) => invokeStrict('goodsReceiptNote.getById', documentId),
        post: (documentId) => invokeStrict('goodsReceiptNote.post', { documentId }),
        cancel: (payload) => invokeStrict('goodsReceiptNote.cancel', payload),
        prepareInvoice: (documentId) => invokeStrict('goodsReceiptNote.prepareInvoice', documentId),
    },
    purchaseReturn: {
        create: (payload) => invokeStrict('purchaseReturn.create', payload),
        update: (payload) => invokeStrict('purchaseReturn.update', payload),
        getById: (documentId) => invokeStrict('purchaseReturn.getById', documentId),
        post: (documentId) => invokeStrict('purchaseReturn.post', { documentId }),
        cancel: (payload) => invokeStrict('purchaseReturn.cancel', payload),
        getPostingStatus: (documentId) => invokeStrict('purchaseReturn.getPostingStatus', documentId),
    },
    salesInvoice: {
        postAccounting: (invoiceId) => invokeStrict('salesInvoice.postAccounting', invoiceId),
        reverseAccounting: (payload) => invokeStrict('salesInvoice.reverseAccounting', payload),
        getPostingStatus: (invoiceId) => invokeStrict('salesInvoice.getPostingStatus', invoiceId),
    },
    purchaseInvoice: {
        postAccounting: (invoiceId) => invokeStrict('purchaseInvoice.postAccounting', invoiceId),
        reverseAccounting: (payload) => invokeStrict('purchaseInvoice.reverseAccounting', payload),
        getPostingStatus: (invoiceId) => invokeStrict('purchaseInvoice.getPostingStatus', invoiceId),
    },
    inventoryDocument: {
        create: (payload) => invokeStrict('inventoryDocument.create', payload),
        update: (payload) => invokeStrict('inventoryDocument.update', payload),
        getById: (documentId) => invokeStrict('inventoryDocument.getById', documentId),
        post: (documentId) => invokeStrict('inventoryDocument.post', documentId),
        reverse: (payload) => invokeStrict('inventoryDocument.reverse', payload),
        getPostingStatus: (documentId) => invokeStrict('inventoryDocument.getPostingStatus', documentId),
    },
    treasuryDocument: {
        create: (payload) => invokeStrict('treasuryDocument.create', payload),
        update: (payload) => invokeStrict('treasuryDocument.update', payload),
        getById: (documentId) => invokeStrict('treasuryDocument.getById', documentId),
        post: (documentId) => invokeStrict('treasuryDocument.post', documentId),
        reverse: (payload) => invokeStrict('treasuryDocument.reverse', payload),
        getPostingStatus: (documentId) => invokeStrict('treasuryDocument.getPostingStatus', documentId),
    },
    treasuryCheque: {
        deposit: (payload) => invokeStrict('treasuryCheque.deposit', payload),
        clearReceived: (payload) => invokeStrict('treasuryCheque.clearReceived', payload),
        returnReceived: (payload) => invokeStrict('treasuryCheque.returnReceived', payload),
        clearIssued: (payload) => invokeStrict('treasuryCheque.clearIssued', payload),
        cancel: (payload) => invokeStrict('treasuryCheque.cancel', payload),
    },
    purchaseInvoices: {
        list: (params) => invoke('purchaseInvoices:list', params),
        get: (id) => invoke('purchaseInvoices:get', id),
        createDraft: (userId) => invoke('purchaseInvoices:createDraft', userId),
        save: (params) => invoke('purchaseInvoices:save', params),
        validate: (id) => invoke('purchaseInvoices:validate', id),
        postOrSubmit: (params) => invoke('purchaseInvoices:postOrSubmit', params),
        reopenRejected: (params) => invoke('purchaseInvoices:reopenRejected', params),
        void: (params) => invoke('purchaseInvoices:void', params),
        searchSuppliers: (search) => invoke('purchaseInvoices:searchSuppliers', search),
        searchCustomers: (search) => invoke('purchaseInvoices:searchCustomers', search),
        searchItems: (search) => invoke('purchaseInvoices:searchItems', search),
    },
    stockTransfers: {
        list: (params) => invoke('stockTransfers:list', params),
        get: (id) => invoke('stockTransfers:get', id),
        createDraft: (userId) => invoke('stockTransfers:createDraft', userId),
        save: (params) => invoke('stockTransfers:save', params),
        validate: (id) => invoke('stockTransfers:validate', id),
        postOrSubmit: (params) => invoke('stockTransfers:postOrSubmit', params),
        reopenRejected: (params) => invoke('stockTransfers:reopenRejected', params),
        void: (params) => invoke('stockTransfers:void', params),
        searchItems: (search) => invoke('stockTransfers:searchItems', search),
    },
    journalVouchers: {
        list: (params) => invoke('journalVouchers:list', params),
        get: (id) => invoke('journalVouchers:get', id),
        createDraft: (userId) => invoke('journalVouchers:createDraft', userId),
        save: (params) => invoke('journalVouchers:save', params),
        validate: (id) => invoke('journalVouchers:validate', id),
        postOrSubmit: (params) => invoke('journalVouchers:postOrSubmit', params),
        reopenRejected: (params) => invoke('journalVouchers:reopenRejected', params),
        void: (params) => invoke('journalVouchers:void', params),
        searchAccounts: (search) => invoke('journalVouchers:searchAccounts', search),
    },
    accounts: {
        create: (data) => invoke('accounts:create', data),
        list: () => invoke('accounts:list')
    },
    accountingFoundation: {
        listAccounts: (includeInactive) => invokeStrict('accountingFoundation:accounts:list', includeInactive),
        getAccountTree: (includeInactive) => invokeStrict('accountingFoundation:accounts:tree', includeInactive),
        getPostableAccounts: () => invokeStrict('accountingFoundation:accounts:postable'),
        saveAccount: (payload) => invokeStrict('accountingFoundation:accounts:save', payload),
        deleteAccount: (accountId) => invokeStrict('accountingFoundation:accounts:delete', accountId),
        activateAccount: (accountId) => invokeStrict('accountingFoundation:accounts:activate', accountId),
        deactivateAccount: (accountId) => invokeStrict('accountingFoundation:accounts:deactivate', accountId),
        listFinancialDefinitions: (includeInactive) => invokeStrict('accountingFoundation:definitions:list', includeInactive),
        saveFinancialDefinition: (payload) => invokeStrict('accountingFoundation:definitions:save', payload),
        deleteFinancialDefinition: (definitionId) => invokeStrict('accountingFoundation:definitions:delete', definitionId),
        resolveAccounts: (payload) => invokeStrict('accountingFoundation:resolution:resolve', payload),
        debugResolveAccounts: (payload) => invokeStrict('accountingFoundation:resolution:debug', payload),
    },
    accounting: {
        accounts: {
            seedDefaultChart: (payload) => invokeStrict('accounting.accounts.seedDefaultChart', payload),
            listTree: (query) => invokeStrict('accounting.accounts.listTree', query),
            listFlat: (query) => invokeStrict('accounting.accounts.listFlat', query),
            create: (payload) => invokeStrict('accounting.accounts.create', payload),
            update: (payload) => invokeStrict('accounting.accounts.update', payload),
            findByCode: (code) => invokeStrict('accounting.accounts.findByCode', code),
        },
        financialDefinitions: {
            listByOwner: (payload) => invokeStrict('accounting.financialDefinitions.listByOwner', payload),
            upsert: (payload) => invokeStrict('accounting.financialDefinitions.upsert', payload),
            bulkSaveForOwner: (payload) => invokeStrict('accounting.financialDefinitions.bulkSaveForOwner', payload),
            deactivate: (payload) => invokeStrict('accounting.financialDefinitions.deactivate', payload),
        },
        accountResolution: {
            resolve: (payload) => invokeStrict('accounting.accountResolution.resolve', payload),
            previewSalesInvoice: (payload) => invokeStrict('accounting.accountResolution.previewSalesInvoice', payload),
            previewPurchaseInvoice: (payload) => invokeStrict('accounting.accountResolution.previewPurchaseInvoice', payload),
        },
        journals: {
            post: (payload) => invokeStrict('accounting.journals.post', payload),
            reverse: (payload) => invokeStrict('accounting.journals.reverse', payload),
            getBySource: (payload) => invokeStrict('accounting.journals.getBySource', payload),
            getById: (journalId) => invokeStrict('accounting.journals.getById', journalId),
            previewValidation: (payload) => invokeStrict('accounting.journals.previewValidation', payload),
        },
        expenseTypes: {
            list: (query) => invokeStrict('accounting.expenseTypes.list', query || {}),
        },
        costCenters: {
            list: (query) => invokeStrict('accounting.costCenters.list', query || {}),
        },
        journalDimensions: {
            validate: (payload) => invokeStrict('accounting.journalDimensions.validate', payload),
        },
        expenseReports: {
            vehicle: (payload) => invokeStrict('accounting.expenseReports.vehicle', payload || {}),
            expenseType: (payload) => invokeStrict('accounting.expenseReports.expenseType', payload || {}),
            costCenter: (payload) => invokeStrict('accounting.expenseReports.costCenter', payload || {}),
        },
    },
    fleet: {
        vehicles: {
            list: (query) => invokeStrict('fleet.vehicles.list', query || {}),
        },
    },
    journals: {
        createDraft: () => invoke('journals:createDraft'),
        save: (data) => invoke('journals:save', data),
        get: (id) => invoke('journals:get', id),
        list: (cursor) => invoke('journals:list', cursor),
        post: (id) => invoke('journals:post', id)
    },
    fixedAssets: {
        list: () => invoke('fixedAssets:list'),
        get: (id) => invoke('fixedAssets:get', id),
        create: (data) => invoke('fixedAssets:create', data),
        update: (id, data) => invoke('fixedAssets:update', id, data),
        delete: (id) => invoke('fixedAssets:delete', id),
        calcDepreciation: (id) => invoke('fixedAssets:calcDepreciation', id),
        postDepreciation: (id, amount, date) => invoke('fixedAssets:postDepreciation', id, amount, date),
        getSchedule: (id) => invoke('fixedAssets:getSchedule', id),
    },
    bom: {
        create: (payload) => invokeStrict('bom.create', payload),
        update: (payload) => invokeStrict('bom.update', payload),
        getById: (id) => invokeStrict('bom.getById', id),
        getDefaultForItem: (itemId, asOfDate) => invokeStrict('bom.getDefaultForItem', itemId, asOfDate || null),
        setDefault: (id) => invokeStrict('bom.setDefault', id),
        confirm: (id) => invokeStrict('bom.confirm', id),
        cancel: (id) => invokeStrict('bom.cancel', id),
    },
    routing: {
        create: (payload) => invokeStrict('routing.create', payload),
        update: (payload) => invokeStrict('routing.update', payload),
        getById: (id) => invokeStrict('routing.getById', id),
        getDefaultForItem: (itemId) => invokeStrict('routing.getDefaultForItem', itemId),
        setDefault: (id) => invokeStrict('routing.setDefault', id),
        confirm: (id) => invokeStrict('routing.confirm', id),
        cancel: (id) => invokeStrict('routing.cancel', id),
    },
    productionOrder: {
        create: (payload) => invokeStrict('productionOrder.create', payload),
        createFromBom: (payload) => invokeStrict('productionOrder.createFromBom', payload),
        update: (payload) => invokeStrict('productionOrder.update', payload),
        getById: (id) => invokeStrict('productionOrder.getById', id),
        release: (id) => invokeStrict('productionOrder.release', id),
        cancel: (id) => invokeStrict('productionOrder.cancel', id),
        getStatusSummary: (id) => invokeStrict('productionOrder.getStatusSummary', id),
        getCostSummary: (id) => invokeStrict('productionOrder.getCostSummary', id),
    },
    productionIssue: {
        create: (payload) => invokeStrict('productionIssue.create', payload),
        getById: (id) => invokeStrict('productionIssue.getById', id),
        post: (payload) => invokeStrict('productionIssue.post', payload),
        cancel: (payload) => invokeStrict('productionIssue.cancel', payload),
    },
    productionReceipt: {
        create: (payload) => invokeStrict('productionReceipt.create', payload),
        getById: (id) => invokeStrict('productionReceipt.getById', id),
        post: (payload) => invokeStrict('productionReceipt.post', payload),
        cancel: (payload) => invokeStrict('productionReceipt.cancel', payload),
    },
    customer: {
        create: (payload) => invokeStrict('customer.create', payload),
        update: (payload) => invokeStrict('customer.update', payload),
        getById: (id) => invokeStrict('customer.getById', id),
        list: (payload) => invokeStrict('customer.list', payload || {}),
        setActive: (payload) => invokeStrict('customer.setActive', payload),
        getContacts: (customerId) => invokeStrict('customer.getContacts', customerId),
        saveContact: (payload) => invokeStrict('customer.saveContact', payload),
        getAddresses: (customerId) => invokeStrict('customer.getAddresses', customerId),
        saveAddress: (payload) => invokeStrict('customer.saveAddress', payload),
        getCreditProfile: (customerId) => invokeStrict('customer.getCreditProfile', customerId),
        saveCreditProfile: (payload) => invokeStrict('customer.saveCreditProfile', payload),
        evaluateCredit: (payload) => invokeStrict('customer.evaluateCredit', payload),
        placeHold: (payload) => invokeStrict('customer.placeHold', payload),
        releaseHold: (payload) => invokeStrict('customer.releaseHold', payload),
        getExposure: (payload) => invokeStrict('customer.getExposure', payload),
        getStatement: (payload) => invokeStrict('customer.getStatement', payload),
        getAging: (payload) => invokeStrict('customer.getAging', payload),
        getTimeline: (payload) => invokeStrict('customer.getTimeline', payload),
    },
    customerFollowUp: {
        create: (payload) => invokeStrict('customerFollowUp.create', payload),
        update: (payload) => invokeStrict('customerFollowUp.update', payload),
        getByCustomer: (customerId, includeClosed) => invokeStrict('customerFollowUp.getByCustomer', customerId, includeClosed),
        markDone: (payload) => invokeStrict('customerFollowUp.markDone', payload),
        cancel: (payload) => invokeStrict('customerFollowUp.cancel', payload),
    },
    vendor: {
        create: (payload) => invokeStrict('vendor.create', payload),
        update: (payload) => invokeStrict('vendor.update', payload),
        getById: (id) => invokeStrict('vendor.getById', id),
        list: (payload) => invokeStrict('vendor.list', payload || {}),
        setActive: (payload) => invokeStrict('vendor.setActive', payload),
        getContacts: (vendorId) => invokeStrict('vendor.getContacts', vendorId),
        saveContact: (payload) => invokeStrict('vendor.saveContact', payload),
        getAddresses: (vendorId) => invokeStrict('vendor.getAddresses', vendorId),
        saveAddress: (payload) => invokeStrict('vendor.saveAddress', payload),
        getPaymentProfile: (vendorId) => invokeStrict('vendor.getPaymentProfile', vendorId),
        savePaymentProfile: (payload) => invokeStrict('vendor.savePaymentProfile', payload),
        evaluatePaymentControl: (payload) => invokeStrict('vendor.evaluatePaymentControl', payload),
        placeHold: (payload) => invokeStrict('vendor.placeHold', payload),
        releaseHold: (payload) => invokeStrict('vendor.releaseHold', payload),
        getExposure: (payload) => invokeStrict('vendor.getExposure', payload),
        getStatement: (payload) => invokeStrict('vendor.getStatement', payload),
        getAging: (payload) => invokeStrict('vendor.getAging', payload),
        getTimeline: (payload) => invokeStrict('vendor.getTimeline', payload),
    },
    vendorFollowUp: {
        create: (payload) => invokeStrict('vendorFollowUp.create', payload),
        update: (payload) => invokeStrict('vendorFollowUp.update', payload),
        getByVendor: (vendorId, includeClosed) => invokeStrict('vendorFollowUp.getByVendor', vendorId, includeClosed),
        markDone: (payload) => invokeStrict('vendorFollowUp.markDone', payload),
        cancel: (payload) => invokeStrict('vendorFollowUp.cancel', payload),
    },
    // Compatibility wrapper for existing manufacturing pages.
    manufacturing: {
        getWorkCenters: () => invoke('mfg-get-work-centers'),
        saveWorkCenter: (data) => invoke('mfg-save-work-center', data),
        deleteWorkCenter: (id) => invoke('mfg-delete-work-center', id),
        getMachines: () => invoke('mfg-get-machines'),
        saveMachine: (data) => invoke('mfg-save-machine', data),
        deleteMachine: (id) => invoke('mfg-delete-machine', id),
        getBOMs: () => invoke('mfg-get-boms'),
        createBOM: (header, lines) => invokeStrict('bom.create', { ...header, lines, itemId: header?.itemId || header?.productId, outputQty: header?.outputQty ?? header?.outputQuantity }),
        updateBOM: (id, header, lines) => invokeStrict('bom.update', { ...header, id, lines, outputQty: header?.outputQty ?? header?.outputQuantity }),
        getBOM: (id) => invokeStrict('bom.getById', id),
        saveRouting: (header, ops) => invoke('mfg-save-routing', header, ops),
        getRoutings: (bomId) => invoke('mfg-get-routings', bomId),
        getOrders: () => invoke('mfg-get-orders'),
        createOrder: (payload) => invokeStrict('productionOrder.create', payload),
        getOrder: (id) => invokeStrict('productionOrder.getById', id),
        updateOrderStatus: (id, status) => invoke('mfg-update-order-status', { id, status }),
        executeOrder: (id, qty, date) => invoke('mfg-execute-order', id, qty, date),
        releaseOrder: (id) => invokeStrict('productionOrder.release', id),
        getOrderStatusSummary: (id) => invokeStrict('productionOrder.getStatusSummary', id),
        getJobCards: (filters) => invoke('mfg-get-job-cards', filters),
        startJob: (data) => invoke('mfg-start-job', data),
        stopJob: (id, data) => invoke('mfg-stop-job', { id, data }),
        getQCTests: () => invoke('mfg-get-qc-tests'),
        saveQCTest: (data) => invoke('mfg-save-qc-test', data),
        getInspections: (filters) => invoke('mfg-get-inspections', filters),
        saveInspection: (data) => invoke('mfg-save-inspection', data),
        getMaintenanceRequests: (filters) => invoke('mfg-get-maintenance-requests', filters),
        saveMaintenanceRequest: (data) => invoke('mfg-save-maintenance-request', data),
        getWIPReport: () => invoke('mfg-get-wip-report'),
    },
    getMachineId: () => invoke('get-machine-id'),
    validateLicense: () => invoke('validate-license'),
    activateProduct: (key) => invoke('activate-product', key),
    importData: (type, data) => invoke('import-data', { type, data }),
    crudOperation: (op) => invoke('crud-operation', op),
    test: {
        runFullWorkflow: () => invoke('test:run-full-workflow'),
    }
});
