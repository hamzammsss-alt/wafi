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

const unwrapIpcResult = (result: any) => {
    if (!result || typeof result !== 'object' || !('ok' in result)) {
        return result;
    }
    if (result.ok) {
        return result.data;
    }
    const err: any = new Error(
        result?.error?.message || result?.error?.messageKey || 'IPC wrapped error'
    );
    err.code = result?.error?.code;
    err.messageKey = result?.error?.messageKey;
    err.details = result?.error?.details;
    throw err;
};

const invokeStrict = async (channel: string, ...args: any[]) => {
    const result = await invoke(channel, ...args);
    return unwrapIpcResult(result);
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

    email: {
        sendEmail: (payload: any) => invoke('email:send', payload),
    },

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

    // 7.5 Budgets
    budgets: {
        list: () => invoke('budgets:list'),
        get: (id: string) => invoke('budgets:get', id),
        create: (data: any) => invoke('budgets:create', data),
        updateStatus: (id: string, status: string, userId: string) => invoke('budgets:updateStatus', id, status, userId),
        getVsActual: (id: string, period?: number) => invoke('budgets:getVsActual', id, period)
    },

    // 8. System & Settings
    auth: {
        login: (creds: any) => invoke('auth-login', creds),
        logout: () => invoke('auth-logout'),
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

    security: {
        getMyPermissions: () => invokeStrict('security:getMyPermissions'),
        getMySnapshot: () => invokeStrict('security:getMySnapshot'),
        getSnapshot: () => invokeStrict('permissions.getSnapshot'),
        refreshSnapshot: () => invokeStrict('security:refreshSnapshot'),
        refreshPermissions: () => invokeStrict('permissions.refreshSnapshot'),
        getAuthContext: () => invokeStrict('security:getAuthContext'),
        getCapabilityCatalog: () => invokeStrict('security:getCapabilityCatalog'),
        getRoleAssignments: (roleId: string, scope?: { companyId?: string; branchId?: string }) =>
            invokeStrict('security:getRoleAssignments', roleId, scope),
        saveRoleAssignments: (data: any) => invokeStrict('security:saveRoleAssignments', data),
    },

    permissions: {
        getSnapshot: () => invokeStrict('permissions.getSnapshot'),
        refreshSnapshot: () => invokeStrict('permissions.refreshSnapshot'),
    },

    audit: {
        list: (payload: any) => invokeStrict('audit.list', payload),
        record: (payload: any) => invokeStrict('audit.record', payload),
    },

    views: {
        list: (screenKey: string) => invokeStrict('views.list', screenKey),
        save: (payload: any) => invokeStrict('views.save', payload),
        apply: (payload: any) => invokeStrict('views.apply', payload),
        setDefault: (viewId: string) => invokeStrict('views.setDefault', viewId),
        delete: (viewId: string) => invokeStrict('views.delete', viewId),
    },

    financialPlatform: {
        startCloseCycle: (period: string) => invokeStrict('financialPlatform:startCloseCycle', period),
        startConsolidation: (data: any) => invokeStrict('financialPlatform:startConsolidation', data),
        upsertCashPosition: (data: any) => invokeStrict('financialPlatform:upsertCashPosition', data),
        createPaymentRun: (data: any) => invokeStrict('financialPlatform:createPaymentRun', data),
        submitRiskAssessment: (data: any) => invokeStrict('financialPlatform:submitRiskAssessment', data),
        createRevenueContract: (data: any) => invokeStrict('financialPlatform:createRevenueContract', data),
        runRevenueRecognition: (data: any) => invokeStrict('financialPlatform:runRevenueRecognition', data),
        postCarbonEntry: (data: any) => invokeStrict('financialPlatform:postCarbonEntry', data),
        runAnalyticsForecast: (data: any) => invokeStrict('financialPlatform:runAnalyticsForecast', data),
        getExecutiveSnapshot: () => invokeStrict('financialPlatform:getExecutiveSnapshot'),
    },

    runtimeLicense: {
        getStatus: (companyId?: string) => invokeStrict('runtimeLicense:getStatus', companyId),
        setExtraSeats: (extraSeats: number, companyId?: string) =>
            invokeStrict('runtimeLicense:setExtraSeats', { extraSeats, companyId }),
        heartbeat: () => invokeStrict('runtimeLicense:heartbeat'),
    },

    attachments: {
        startUpload: (data: any) => invokeStrict('attachments:startUpload', data),
        uploadChunk: (data: any) => invokeStrict('attachments:uploadChunk', data),
        completeUpload: (sessionId: string) => invokeStrict('attachments:completeUpload', { sessionId }),
        abortUpload: (sessionId: string) => invokeStrict('attachments:abortUpload', { sessionId }),
        getQuota: () => invokeStrict('attachments:getQuota'),
        updateTier: (tier: 'BASE_5GB' | 'EXT_10GB') => invokeStrict('attachments:updateTier', tier),
        addAddon: (addonGb: 10 | 15 | 25) => invokeStrict('attachments:addAddon', addonGb),
        listFiles: (entityName: string, entityId: string) =>
            invokeStrict('attachments:listFiles', { entityName, entityId }),
        deleteFile: (fileId: string) => invokeStrict('attachments:deleteFile', fileId),
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

    print: {
        preview: () => invoke('print:preview'),
        getPrinters: () => invoke('print:getPrinters'),
        toPDF: (filename: string) => invoke('print:toPDF', filename),
    },

    currency: {
        getCurrencies: () => invokeStrict('finance:listCurrencies'),
        saveCurrency: (data: any) => invokeStrict('finance:saveCurrency', data),
        deleteCurrency: (id: string) => invokeStrict('finance:deleteCurrency', id),
        updateRates: () => invoke('currency-scraper-trigger'),
        getCurrencyHistory: (code: string, days?: number) => invokeStrict('finance:getCurrencyHistory', code, days),
        getCurrencyTimeline: (code: string, limit?: number) => invokeStrict('finance:getCurrencyTimeline', code, limit),
    },

    costCenter: {
        getCostCenters: () => invokeStrict('finance:listCostCenters'),
        saveCostCenter: (data: any) => invokeStrict('finance:saveCostCenter', data),
        deleteCostCenter: (id: string) => invokeStrict('finance:deleteCostCenter', id),
    },

    taxGroup: {
        getTaxGroups: () => invokeStrict('finance:listTaxGroups'),
        saveTaxGroup: (data: any) => invokeStrict('finance:saveTaxGroup', data),
        deleteTaxGroup: (id: string) => invokeStrict('finance:deleteTaxGroup', id),
    },

    warehouse: {
        getWarehouses: (companyId: string) => invoke('get-warehouses', companyId),
        getWarehouse: (id: string, companyId: string) => invoke('get-warehouse', id, companyId),
        createWarehouse: (data: any) => invoke('create-warehouse', data),
        updateWarehouse: (id: string, companyId: string, updates: any) => invoke('update-warehouse', id, companyId, updates),
        deleteWarehouse: (id: string, companyId: string) => invoke('delete-warehouse', id, companyId),

        getBinLocations: (warehouseId: string) => invoke('get-bin-locations', warehouseId),
        getBinLocation: (id: string) => invoke('get-bin-location', id),
        createBinLocation: (data: any) => invoke('create-bin-location', data),
        updateBinLocation: (id: string, updates: any) => invoke('update-bin-location', id, updates),
        deleteBinLocation: (id: string) => invoke('delete-bin-location', id),
    },

    itemTracking: {
        // Batches
        getBatches: (itemId: string) => invoke('get-item-batches', itemId),
        getBatch: (id: string) => invoke('get-item-batch', id),
        createBatch: (data: any) => invoke('create-item-batch', data),
        updateBatch: (id: string, updates: any) => invoke('update-item-batch', id, updates),
        deleteBatch: (id: string) => invoke('delete-item-batch', id),

        // Serials
        getSerials: (itemId: string) => invoke('get-item-serials', itemId),
        getSerial: (id: string) => invoke('get-item-serial', id),
        createSerial: (data: any) => invoke('create-item-serial', data),
        updateSerialStatus: (id: string, status: string) => invoke('update-item-serial-status', id, status),
        deleteSerial: (id: string) => invoke('delete-item-serial', id),
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
        suggestItems: (q: string, limit?: number) => invoke('inventory:suggest-items', q, limit),
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
        seedDefaultUnits: () => invoke('inventory:seed-default-units'),

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
        getTransferRequests: (filters?: any) => invoke('inventory:get-transfer-requests', filters),
        getTransferRequest: (id: string) => invoke('inventory:get-transfer-request', id),

        getBins: (warehouseId: string) => invoke('get-warehouse-bins', warehouseId),
        createBin: (bin: any) => invoke('create-warehouse-bin', bin),
        deleteBin: (id: string) => invoke('delete-warehouse-bin', id),

        createStockDocument: (doc: any) => invoke('create-stock-document', doc), // Added
        updateStockDocument: (doc: any) => invoke('update-stock-document', doc),

        getValuation: (filters: any) => invoke('inventory:get-valuation', filters), // Added

        receiveTransfer: (data: any) => invoke('inventory:receive-transfer', data), // Added
        getGoodsReceipts: () => invoke('inventory-get-grns'),
        getDispatches: () => invoke('inventory-get-dispatches'),
        getStockDocument: (id: string) => invoke('inventory-get-stock-document', id),

        getKit: (itemId: string) => invoke('inventory:get-kit', itemId),
        createAssembly: (data: any) => invoke('inventory:create-assembly', data),
    },

    dispatch: {
        update: (id: string | null, payload: any) => invoke('dispatch:update', id, payload),
        postToPending: (id: string) => invoke('dispatch:post-to-pending', id),
        invoiceFromDispatch: (dispatchId: string) => invoke('dispatch:invoice-from-dispatch', dispatchId),
        getAll: () => invoke('dispatch:getAll'),
        getById: (id: string) => invoke('dispatch:getById', id),
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

        // Contact Types
        getContactTypes: () => invoke('partner:get-contact-types'),

        // Memberships & Sectors
        getMemberships: () => invoke('partner:get-memberships'),
        saveMembership: (data: any) => invoke('partner:save-membership', data),
        deleteMembership: (id: string) => invoke('partner:delete-membership', id),
        getSectors: () => invoke('partner:get-sectors'),
        saveSector: (data: any) => invoke('partner:save-sector', data),
        deleteSector: (id: string) => invoke('partner:delete-sector', id),

        // Credit Policies
        getCreditPolicies: () => invoke('partner:get-credit-policies'),
        saveCreditPolicy: (data: any) => invoke('partner:save-credit-policy', data),
        deleteCreditPolicy: (id: string) => invoke('partner:delete-credit-policy', id),

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

    ae: {
        listSubAccounts: (accountId?: string) => invoke('ae:list-sub-accounts', accountId),
        createSubAccount: (data: { account_id: string; name: string; code?: string | null }) =>
            invoke('ae:create-sub-account', data),
        listReferences: (refType?: string) => invoke('ae:list-references', refType),
        createReference: (data: { ref_type: string; ref_name: string; ref_code?: string | null }) =>
            invoke('ae:create-reference', data),
        saveDraftVoucher: (payload: any) => invoke('ae:save-draft-voucher', payload),
        postVoucher: (payload: any) => invoke('ae:post-voucher', payload),
        postDraftVoucher: (voucherId: string) => invoke('ae:post-draft-voucher', voucherId),
        getVoucher: (id: string) => invoke('ae:get-voucher', id),
        getVouchers: (filters?: any) => invoke('ae:get-vouchers', filters),
        getTrialBalance: (params?: any) => invoke('ae:get-trial-balance', params),
    },

    sales: {
        createInvoice: (invoice: any) => invoke('sales-create-invoice', invoice),
        getNextInvoiceNo: () => invoke('get-next-invoice-no'),
        getInvoice: (id: string) => invoke('sales-get-invoice', id),
        postInvoice: (id: string, userId?: string) => invoke('sales-post-invoice', id, userId),
        submitInvoiceForApproval: (id: string, userId?: string) => invoke('sales-submit-invoice-approval', id, userId),
        createQuotation: (data: any) => invoke('sales-create-quotation', data),
        getQuotations: () => invoke('sales-get-quotations'),
        getQuotation: (id: string) => invoke('sales-get-quotation', id),
        updateQuotationStatus: (id: string, status: string) => invoke('sales-update-quotation-status', { id, status }),
        createOrder: (data: any) => invoke('sales-create-order', data),
        getOrders: () => invoke('sales-get-orders'),
        getPendingOrders: () => invoke('sales-get-pending-orders'),
        getOrder: (id: string) => invoke('sales-get-order', id),
        updateOrderStatus: (id: string, status: string) => invoke('sales-update-order-status', { id, status }),
        deleteOrder: (id: string) => invoke('sales-delete-order', id),
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
        postOrder: (id: string, userId?: string) => invoke('purchase-post-order', id, userId),
        deleteOrder: (id: string) => invoke('purchase-delete-order', id),
        approveOrder: (id: string, userId: string) => invoke('purchase-approve-order', id, userId),
        rejectOrder: (id: string, userId: string, reason?: string) => invoke('purchase-reject-order', id, userId, reason),
        getInvoice: (id: string) => invoke('purchase-get-invoice', id),
        getInvoices: () => invoke('purchase-get-invoices'),

        purchaseGetOrders: (filters?: any) => invoke('purchase-get-orders', filters),
        purchaseGetOrder: (id: string) => invoke('purchase-get-order', id),
        purchaseCreateOrder: (data: any) => invoke('purchase-create-order', data),
        purchaseUpdateOrder: (data: any) => invoke('purchase-update-order', data),
        purchaseDeleteOrder: (id: string) => invoke('purchase-delete-order', id),
        purchasePostOrder: (id: string, userId: string) => invoke('purchase-post-order', id, userId),
        purchaseApproveOrder: (id: string, userId: string) => invoke('purchase-approve-order', id, userId),
        purchaseRejectOrder: (id: string, userId: string, reason?: string) => invoke('purchase-reject-order', id, userId, reason),

        createRequest: (data: any) => invoke('purchase-create-request', data),
        getRequests: () => invoke('purchase-get-requests'),
        getRequest: (id: string) => invoke('purchase-get-request', id),
        updateRequest: (data: any) => invoke('purchase-update-request', data),
        postRequest: (id: string, userId?: string) => invoke('purchase-post-request', id, userId),
        deleteRequest: (id: string) => invoke('purchase-delete-request', id),
        approveRequest: (id: string, userId: string) => invoke('purchase-approve-request', id, userId),
        rejectRequest: (id: string, userId: string, reason?: string) => invoke('purchase-reject-request', id, userId, reason),

        purchaseGetRequests: (filters?: any) => invoke('purchase-get-requests', filters),
        purchaseGetRequest: (id: string) => invoke('purchase-get-request', id),
        purchaseCreateRequest: (data: any) => invoke('purchase-create-request', data),
        purchaseUpdateRequest: (data: any) => invoke('purchase-update-request', data),
        purchaseDeleteRequest: (id: string) => invoke('purchase-delete-request', id),
        purchasePostRequest: (id: string, userId: string) => invoke('purchase-post-request', id, userId),
        purchaseApproveRequest: (id: string, userId: string) => invoke('purchase-approve-request', id, userId),
        purchaseRejectRequest: (id: string, userId: string, reason?: string) => invoke('purchase-reject-request', id, userId, reason),

        createRFQ: (data: any) => invoke('purchase-create-rfq', data),
        getRFQs: () => invoke('purchase-get-rfqs'),
        getRFQ: (id: string) => invoke('purchase-get-rfq', id),
        updateRFQ: (data: any) => invoke('purchase-update-rfq', data),

        createReturn: (data: any) => invoke('purchase-create-return', data),
        getReturns: () => invoke('purchase-get-returns'),
        getReturn: (id: string) => invoke('purchase-get-return', id),

        // GRN (Goods Receipt Notes) integrated under purchase namespace
        saveGRN: (data: any) => invoke('grn:save', data),
        postGRNToPending: (id: string) => invoke('grn:post-to-pending', id),
        invoiceFromGRN: (id: string) => invoke('grn:invoice', id),
        getGRN: (id: string) => invoke('grn:get', id),
        getGRNs: () => invoke('grn:list'),
    },

    grn: {
        save: (data: any) => invoke('grn:save', data),
        postToPending: (id: string) => invoke('grn:post-to-pending', id),
        invoice: (id: string) => invoke('grn:invoice', id),
        get: (id: string) => invoke('grn:get', id),
        list: () => invoke('grn:list'),
    },

    treasury: {
        createReceipt: (data: any) => invoke('treasury-create-receipt', data),
        createPayment: (data: any) => invoke('treasury-create-payment', data),
        deleteReceipt: (id: string) => invoke('treasury-delete-receipt', id),
        deletePayment: (id: string) => invoke('treasury-delete-payment', id),
        postReceipt: (id: string) => invoke('treasury-post-receipt', id),
        postPayment: (id: string) => invoke('treasury-post-payment', id),
        updateReceiptStatus: (id: string, status: 'DRAFT' | 'POSTED') => invoke('treasury-update-receipt-status', { id, status }),
        updatePaymentStatus: (id: string, status: 'DRAFT' | 'POSTED') => invoke('treasury-update-payment-status', { id, status }),
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

        // Cash Boxes
        getCashBoxes: () => invoke('md-get-cash-boxes'),
        saveCashBox: (data: any) => invoke('md-save-cash-box', data),
        deleteCashBox: (id: string) => invoke('md-delete-cash-box', id),

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


    workflow: {
        postDocument: (docType: string, docId: number | string, userId: string) => invoke('workflow:postDocument', docType, docId, userId),
        submitDocumentForApproval: (docType: string, docId: number | string, userId: string) => invoke('workflow:submitDocumentForApproval', docType, docId, userId),
        approveDocument: (docType: string, docId: number | string, userId: string) => invoke('workflow:approveDocument', docType, docId, userId),
        rejectDocument: (docType: string, docId: number | string, userId: string, reason: string) => invoke('workflow:rejectDocument', docType, docId, userId, reason),
        reopenRejected: (docType: string, docId: number | string, userId: string) => invoke('workflow:reopenRejected', docType, docId, userId),
        getPendingApprovals: () => invoke('workflow:getPendingApprovals')
    },

    approvalV2: {
        listPending: (params: any) => invoke('approval:listPendingV2', params),
        approve: (params: any) => invoke('approval:approveV2', params),
        reject: (params: any) => invoke('approval:rejectV2', params),

        rules: {
            list: (docType?: string) => invoke('approval:rules:list', docType),
            upsert: (rule: any) => invoke('approval:rules:upsert', rule),
            delete: (id: string) => invoke('approval:rules:delete', id)
        }
    },

    approvalV3: {
        listPending: (params: any) => invoke('approval:listPendingV3', params),
        bulkApprove: (params: any) => invoke('approval:bulkApprove', params),
        bulkReject: (params: any) => invoke('approval:bulkReject', params),
        runSlaSweepNow: () => invoke('approval:runSlaSweepNow'),

        slaRules: {
            list: () => invoke('approval:slaRules:list'),
            upsert: (rule: any) => invoke('approval:slaRules:upsert', rule),
            delete: (id: string) => invoke('approval:slaRules:delete', id)
        }
    },

    approvalV4: {
        listPendingKeyset: (params: any) => invoke('approval:listPendingKeyset', params),
        approve: (params: any) => invoke('approvalV4:approve', params),
        reject: (params: any) => invoke('approvalV4:reject', params),
        bulkApprove: (params: any) => invoke('approvalV4:bulkApprove', params),
        bulkReject: (params: any) => invoke('approvalV4:bulkReject', params),
        runSlaSweepNow: () => invoke('approvalV4:runSlaSweepNow'),

        rules: {
            list: (docType?: string) => invoke('approvalV4:rules:list', docType),
            upsert: (rule: any) => invoke('approvalV4:rules:upsert', rule),
            delete: (id: string) => invoke('approvalV4:rules:delete', id)
        },
        slaRules: {
            list: () => invoke('approvalV4:slaRules:list'),
            upsert: (rule: any) => invoke('approvalV4:slaRules:upsert', rule),
            delete: (id: string) => invoke('approvalV4:slaRules:delete', id)
        },
        schedulerLogs: {
            list: (limit: number) => invoke('approvalV4:schedulerLogs:list', limit)
        }
    },

    documentsRead: {
        getHeader: (docType: string, docId: string) => invoke('documents:getHeader', docType, docId),
        getAuditTrail: (docId: string) => invoke('documents:getAuditTrail', docId)
    },

    framework: {
        list: (docType: string, params: any) => invoke(`${docType}:list`, params),
        get: (docType: string, id: string) => invoke(`${docType}:get`, id),
        createDraft: (docType: string, userId?: string) => invoke(`${docType}:createDraft`, userId),
        save: (docType: string, params: any) => invoke(`${docType}:save`, params),
        validate: (docType: string, id: string) => invoke(`${docType}:validate`, id),
        postOrSubmit: (docType: string, params: any) => invoke(`${docType}:postOrSubmit`, params),
        reopenRejected: (docType: string, params: any) => invoke(`${docType}:reopenRejected`, params)
    },

    salesInvoices: {
        list: (params: any) => invoke('salesInvoices:list', params),
        get: (id: string) => invoke('salesInvoices:get', id),
        createDraft: (userId?: string) => invoke('salesInvoices:createDraft', userId),
        save: (params: any) => invoke('salesInvoices:save', params),
        validate: (id: string) => invoke('salesInvoices:validate', id),
        postOrSubmit: (params: any) => invoke('salesInvoices:postOrSubmit', params),
        void: (params: { id: string; userId?: string }) => invoke('salesInvoices:void', params),
        reopenRejected: (params: any) => invoke('salesInvoices:reopenRejected', params),
        searchCustomers: (search: string) => invoke('salesInvoices:searchCustomers', search),
        searchItems: (search: string) => invoke('salesInvoices:searchItems', search),
    },

    salesQuotation: {
        create: (payload: {
            docDate: string;
            customerId: string;
            warehouseId?: string | null;
            currencyCode?: string | null;
            currencyRate?: number | null;
            subtotal?: number | null;
            discountAmount?: number | null;
            taxableAmount?: number | null;
            vatAmount?: number | null;
            totalAmount?: number | null;
            referenceNo?: string | null;
            remarks?: string | null;
            sourceDocType?: 'SALES_QUOTATION' | 'SALES_ORDER' | 'DELIVERY_NOTE' | 'SALES_RETURN' | null;
            sourceDocId?: string | null;
            createdBy: string;
            approvedBy?: string | null;
            lines: Array<{
                id?: string;
                itemId: string;
                warehouseId?: string | null;
                qty: number;
                unitPrice: number;
                discountAmount?: number | null;
                lineSubtotal?: number | null;
                taxableAmount?: number | null;
                vatAmount?: number | null;
                lineTotal?: number | null;
                unitCost?: number | null;
                projectId?: string | null;
                costCenterId?: string | null;
                partnerId?: string | null;
                remarks?: string | null;
            }>;
        }) =>
            invokeStrict('salesQuotation.create', payload),
        update: (payload: any) =>
            invokeStrict('salesQuotation.update', payload),
        getById: (documentId: string) =>
            invokeStrict('salesQuotation.getById', documentId),
        confirm: (documentId: string) =>
            invokeStrict('salesQuotation.confirm', documentId),
        cancel: (documentId: string) =>
            invokeStrict('salesQuotation.cancel', documentId),
        convertToOrder: (payload: { quotationId: string }) =>
            invokeStrict('salesQuotation.convertToOrder', payload),
    },

    salesOrder: {
        create: (payload: any) =>
            invokeStrict('salesOrder.create', payload),
        update: (payload: any) =>
            invokeStrict('salesOrder.update', payload),
        getById: (documentId: string) =>
            invokeStrict('salesOrder.getById', documentId),
        confirm: (documentId: string) =>
            invokeStrict('salesOrder.confirm', documentId),
        cancel: (documentId: string) =>
            invokeStrict('salesOrder.cancel', documentId),
        convertToDelivery: (payload: {
            orderId: string;
            selectedLines?: Array<{ sourceLineId: string; qty: number }>;
        }) =>
            invokeStrict('salesOrder.convertToDelivery', payload),
        getFulfillmentStatus: (orderId: string) =>
            invokeStrict('salesOrder.getFulfillmentStatus', orderId),
        prepareInvoice: (orderId: string) =>
            invokeStrict('salesOrder.prepareInvoice', orderId),
    },

    deliveryNote: {
        create: (payload: any) =>
            invokeStrict('deliveryNote.create', payload),
        update: (payload: any) =>
            invokeStrict('deliveryNote.update', payload),
        getById: (documentId: string) =>
            invokeStrict('deliveryNote.getById', documentId),
        post: (documentId: string) =>
            invokeStrict('deliveryNote.post', { documentId }),
        cancel: (payload: {
            documentId: string;
            reverseDate: string;
            reason?: string | null;
        }) =>
            invokeStrict('deliveryNote.cancel', payload),
        prepareInvoice: (documentId: string) =>
            invokeStrict('deliveryNote.prepareInvoice', documentId),
    },

    salesReturn: {
        create: (payload: any) =>
            invokeStrict('salesReturn.create', payload),
        update: (payload: any) =>
            invokeStrict('salesReturn.update', payload),
        getById: (documentId: string) =>
            invokeStrict('salesReturn.getById', documentId),
        post: (documentId: string) =>
            invokeStrict('salesReturn.post', { documentId }),
        cancel: (payload: {
            documentId: string;
            reverseDate: string;
            reason?: string | null;
        }) =>
            invokeStrict('salesReturn.cancel', payload),
        getPostingStatus: (documentId: string) =>
            invokeStrict('salesReturn.getPostingStatus', documentId),
    },

    purchaseRequest: {
        create: (payload: any) =>
            invokeStrict('purchaseRequest.create', payload),
        update: (payload: any) =>
            invokeStrict('purchaseRequest.update', payload),
        getById: (documentId: string) =>
            invokeStrict('purchaseRequest.getById', documentId),
        confirm: (documentId: string) =>
            invokeStrict('purchaseRequest.confirm', documentId),
        cancel: (documentId: string) =>
            invokeStrict('purchaseRequest.cancel', documentId),
        convertToRfq: (payload: { requestId: string }) =>
            invokeStrict('purchaseRequest.convertToRfq', payload),
        convertToOrder: (payload: { requestId: string }) =>
            invokeStrict('purchaseRequest.convertToOrder', payload),
    },

    purchaseRfq: {
        create: (payload: any) =>
            invokeStrict('purchaseRfq.create', payload),
        update: (payload: any) =>
            invokeStrict('purchaseRfq.update', payload),
        getById: (documentId: string) =>
            invokeStrict('purchaseRfq.getById', documentId),
        confirm: (documentId: string) =>
            invokeStrict('purchaseRfq.confirm', documentId),
        cancel: (documentId: string) =>
            invokeStrict('purchaseRfq.cancel', documentId),
        convertToOrder: (payload: { rfqId: string }) =>
            invokeStrict('purchaseRfq.convertToOrder', payload),
    },

    purchaseOrder: {
        create: (payload: any) =>
            invokeStrict('purchaseOrder.create', payload),
        update: (payload: any) =>
            invokeStrict('purchaseOrder.update', payload),
        getById: (documentId: string) =>
            invokeStrict('purchaseOrder.getById', documentId),
        confirm: (documentId: string) =>
            invokeStrict('purchaseOrder.confirm', documentId),
        cancel: (documentId: string) =>
            invokeStrict('purchaseOrder.cancel', documentId),
        convertToReceipt: (payload: {
            orderId: string;
            selectedLines?: Array<{ sourceLineId: string; qty: number }>;
        }) =>
            invokeStrict('purchaseOrder.convertToReceipt', payload),
        getFulfillmentStatus: (orderId: string) =>
            invokeStrict('purchaseOrder.getFulfillmentStatus', orderId),
    },

    goodsReceiptNote: {
        create: (payload: any) =>
            invokeStrict('goodsReceiptNote.create', payload),
        update: (payload: any) =>
            invokeStrict('goodsReceiptNote.update', payload),
        getById: (documentId: string) =>
            invokeStrict('goodsReceiptNote.getById', documentId),
        post: (documentId: string) =>
            invokeStrict('goodsReceiptNote.post', { documentId }),
        cancel: (payload: {
            documentId: string;
            reverseDate: string;
            reason?: string | null;
        }) =>
            invokeStrict('goodsReceiptNote.cancel', payload),
        prepareInvoice: (documentId: string) =>
            invokeStrict('goodsReceiptNote.prepareInvoice', documentId),
    },

    purchaseReturn: {
        create: (payload: any) =>
            invokeStrict('purchaseReturn.create', payload),
        update: (payload: any) =>
            invokeStrict('purchaseReturn.update', payload),
        getById: (documentId: string) =>
            invokeStrict('purchaseReturn.getById', documentId),
        post: (documentId: string) =>
            invokeStrict('purchaseReturn.post', { documentId }),
        cancel: (payload: {
            documentId: string;
            reverseDate: string;
            reason?: string | null;
        }) =>
            invokeStrict('purchaseReturn.cancel', payload),
        getPostingStatus: (documentId: string) =>
            invokeStrict('purchaseReturn.getPostingStatus', documentId),
    },

    salesInvoice: {
        postAccounting: (invoiceId: string) =>
            invokeStrict('salesInvoice.postAccounting', invoiceId),
        reverseAccounting: (payload: {
            invoiceId: string;
            reverseDate: string;
            reason?: string | null;
        }) =>
            invokeStrict('salesInvoice.reverseAccounting', payload),
        getPostingStatus: (invoiceId: string) =>
            invokeStrict('salesInvoice.getPostingStatus', invoiceId),
    },

    purchaseInvoice: {
        postAccounting: (invoiceId: string) =>
            invokeStrict('purchaseInvoice.postAccounting', invoiceId),
        reverseAccounting: (payload: {
            invoiceId: string;
            reverseDate: string;
            reason?: string | null;
        }) =>
            invokeStrict('purchaseInvoice.reverseAccounting', payload),
        getPostingStatus: (invoiceId: string) =>
            invokeStrict('purchaseInvoice.getPostingStatus', invoiceId),
    },

    inventoryDocument: {
        create: (payload: {
            docType: 'GOODS_RECEIPT' | 'GOODS_ISSUE' | 'STOCK_TRANSFER' | 'STOCK_ADJUSTMENT';
            docDate: string;
            warehouseId?: string | null;
            toWarehouseId?: string | null;
            referenceNo?: string | null;
            remarks?: string | null;
            currencyCode?: string | null;
            currencyRate?: number | null;
            createdBy: string;
            approvedBy?: string | null;
            lines: Array<{
                itemId: string;
                fromWarehouseId?: string | null;
                toWarehouseId?: string | null;
                qty: number;
                unitCost: number;
                totalCost?: number | null;
                projectId?: string | null;
                costCenterId?: string | null;
                partnerId?: string | null;
                expenseTypeId?: string | null;
                vehicleId?: string | null;
                remarks?: string | null;
                adjustmentDirection?: 'IN' | 'OUT' | null;
            }>;
        }) =>
            invokeStrict('inventoryDocument.create', payload),
        update: (payload: {
            id: string;
            docDate: string;
            warehouseId?: string | null;
            toWarehouseId?: string | null;
            referenceNo?: string | null;
            remarks?: string | null;
            currencyCode?: string | null;
            currencyRate?: number | null;
            approvedBy?: string | null;
            lines: Array<{
                id?: string;
                itemId: string;
                fromWarehouseId?: string | null;
                toWarehouseId?: string | null;
                qty: number;
                unitCost: number;
                totalCost?: number | null;
                projectId?: string | null;
                costCenterId?: string | null;
                partnerId?: string | null;
                expenseTypeId?: string | null;
                vehicleId?: string | null;
                remarks?: string | null;
                adjustmentDirection?: 'IN' | 'OUT' | null;
            }>;
        }) =>
            invokeStrict('inventoryDocument.update', payload),
        getById: (documentId: string) =>
            invokeStrict('inventoryDocument.getById', documentId),
        post: (documentId: string) =>
            invokeStrict('inventoryDocument.post', documentId),
        reverse: (payload: {
            documentId: string;
            reverseDate: string;
            reason?: string | null;
        }) =>
            invokeStrict('inventoryDocument.reverse', payload),
        getPostingStatus: (documentId: string) =>
            invokeStrict('inventoryDocument.getPostingStatus', documentId),
    },

    treasuryDocument: {
        create: (payload: {
            docType: 'CASH_RECEIPT' | 'CASH_PAYMENT' | 'BANK_RECEIPT' | 'BANK_PAYMENT' | 'CHEQUE_RECEIPT' | 'CHEQUE_PAYMENT';
            docDate: string;
            partnerId?: string | null;
            cashAccountId?: string | null;
            bankAccountId?: string | null;
            currencyCode?: string | null;
            currencyRate?: number | null;
            referenceNo?: string | null;
            remarks?: string | null;
            createdBy: string;
            approvedBy?: string | null;
            lines: Array<{
                accountId: string;
                amount: number;
                description?: string | null;
                costCenterId?: string | null;
                projectId?: string | null;
                expenseTypeId?: string | null;
                vehicleId?: string | null;
                partnerId?: string | null;
                itemId?: string | null;
                warehouseId?: string | null;
            }>;
            cheque?: {
                id?: string;
                chequeNo: string;
                chequeDate: string;
                dueDate?: string | null;
                amount?: number | null;
                currencyCode?: string | null;
                currencyRate?: number | null;
                bankName?: string | null;
                drawerName?: string | null;
                payeeName?: string | null;
                partnerId?: string | null;
                notes?: string | null;
            } | null;
        }) =>
            invokeStrict('treasuryDocument.create', payload),
        update: (payload: {
            id: string;
            docDate: string;
            partnerId?: string | null;
            cashAccountId?: string | null;
            bankAccountId?: string | null;
            currencyCode?: string | null;
            currencyRate?: number | null;
            referenceNo?: string | null;
            remarks?: string | null;
            approvedBy?: string | null;
            lines: Array<{
                id?: string;
                accountId: string;
                amount: number;
                description?: string | null;
                costCenterId?: string | null;
                projectId?: string | null;
                expenseTypeId?: string | null;
                vehicleId?: string | null;
                partnerId?: string | null;
                itemId?: string | null;
                warehouseId?: string | null;
            }>;
            cheque?: {
                id?: string;
                chequeNo: string;
                chequeDate: string;
                dueDate?: string | null;
                amount?: number | null;
                currencyCode?: string | null;
                currencyRate?: number | null;
                bankName?: string | null;
                drawerName?: string | null;
                payeeName?: string | null;
                partnerId?: string | null;
                notes?: string | null;
            } | null;
        }) =>
            invokeStrict('treasuryDocument.update', payload),
        getById: (documentId: string) =>
            invokeStrict('treasuryDocument.getById', documentId),
        post: (documentId: string) =>
            invokeStrict('treasuryDocument.post', documentId),
        reverse: (payload: {
            documentId: string;
            reverseDate: string;
            reason?: string | null;
        }) =>
            invokeStrict('treasuryDocument.reverse', payload),
        getPostingStatus: (documentId: string) =>
            invokeStrict('treasuryDocument.getPostingStatus', documentId),
    },

    treasuryCheque: {
        deposit: (payload: {
            chequeId: string;
            bankAccountId: string;
            date: string;
            reason?: string | null;
        }) =>
            invokeStrict('treasuryCheque.deposit', payload),
        clearReceived: (payload: {
            chequeId: string;
            date: string;
            reason?: string | null;
        }) =>
            invokeStrict('treasuryCheque.clearReceived', payload),
        returnReceived: (payload: {
            chequeId: string;
            date: string;
            reason?: string | null;
        }) =>
            invokeStrict('treasuryCheque.returnReceived', payload),
        clearIssued: (payload: {
            chequeId: string;
            date: string;
            reason?: string | null;
        }) =>
            invokeStrict('treasuryCheque.clearIssued', payload),
        cancel: (payload: {
            chequeId: string;
            date: string;
            reason?: string | null;
        }) =>
            invokeStrict('treasuryCheque.cancel', payload),
    },

    purchaseInvoices: {
        list: (params: any) => invoke('purchaseInvoices:list', params),
        get: (id: string) => invoke('purchaseInvoices:get', id),
        createDraft: (userId?: string) => invoke('purchaseInvoices:createDraft', userId),
        save: (params: any) => invoke('purchaseInvoices:save', params),
        validate: (id: string) => invoke('purchaseInvoices:validate', id),
        postOrSubmit: (params: any) => invoke('purchaseInvoices:postOrSubmit', params),
        reopenRejected: (params: any) => invoke('purchaseInvoices:reopenRejected', params),
        void: (params: { id: string; userId?: string }) => invoke('purchaseInvoices:void', params),
        searchSuppliers: (search: string) => invoke('purchaseInvoices:searchSuppliers', search),
        searchCustomers: (search: string) => invoke('purchaseInvoices:searchCustomers', search),
        searchItems: (search: string) => invoke('purchaseInvoices:searchItems', search),
    },

    stockTransfers: {
        list: (params: any) => invoke('stockTransfers:list', params),
        get: (id: string) => invoke('stockTransfers:get', id),
        createDraft: (userId?: string) => invoke('stockTransfers:createDraft', userId),
        save: (params: any) => invoke('stockTransfers:save', params),
        validate: (id: string) => invoke('stockTransfers:validate', id),
        postOrSubmit: (params: any) => invoke('stockTransfers:postOrSubmit', params),
        reopenRejected: (params: any) => invoke('stockTransfers:reopenRejected', params),
        void: (params: { id: string; userId?: string }) => invoke('stockTransfers:void', params),
        searchItems: (search: string) => invoke('stockTransfers:searchItems', search),
    },

    journalVouchers: {
        list: (params: any) => invoke('journalVouchers:list', params),
        get: (id: string) => invoke('journalVouchers:get', id),
        createDraft: (userId?: string) => invoke('journalVouchers:createDraft', userId),
        save: (params: any) => invoke('journalVouchers:save', params),
        validate: (id: string) => invoke('journalVouchers:validate', id),
        postOrSubmit: (params: any) => invoke('journalVouchers:postOrSubmit', params),
        reopenRejected: (params: any) => invoke('journalVouchers:reopenRejected', params),
        void: (params: { id: string; userId?: string }) => invoke('journalVouchers:void', params),
        searchAccounts: (search: string) => invoke('journalVouchers:searchAccounts', search),
    },

    accounts: {
        create: (data: any) => invoke('accounts:create', data),
        list: () => invoke('accounts:list')
    },

    accountingFoundation: {
        listAccounts: (includeInactive?: boolean) =>
            invokeStrict('accountingFoundation:accounts:list', includeInactive),
        getAccountTree: (includeInactive?: boolean) =>
            invokeStrict('accountingFoundation:accounts:tree', includeInactive),
        getPostableAccounts: () =>
            invokeStrict('accountingFoundation:accounts:postable'),
        saveAccount: (payload: {
            id?: string;
            accountCode: string;
            name: string;
            parentId?: string | null;
            accountType: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';
            accountCategory: string;
            accountSubtype: string;
            postingAllowed: boolean;
            currencyBehavior: 'BASE_ONLY' | 'FIXED_CURRENCY' | 'MULTI_CURRENCY';
            currencyCode?: string | null;
            scopeType: 'COMPANY' | 'BRANCH';
            branchId?: string | null;
            status: 'ACTIVE' | 'INACTIVE';
            requiresCostCenter?: boolean;
            requiresAnalysisCode?: boolean;
        }) =>
            invokeStrict('accountingFoundation:accounts:save', payload),
        deleteAccount: (accountId: string) =>
            invokeStrict('accountingFoundation:accounts:delete', accountId),
        activateAccount: (accountId: string) =>
            invokeStrict('accountingFoundation:accounts:activate', accountId),
        deactivateAccount: (accountId: string) =>
            invokeStrict('accountingFoundation:accounts:deactivate', accountId),

        listFinancialDefinitions: (includeInactive?: boolean) =>
            invokeStrict('accountingFoundation:definitions:list', includeInactive),
        saveFinancialDefinition: (payload: {
            id?: string;
            scopeType: 'COMPANY' | 'BRANCH' | 'ITEM' | 'ITEM_GROUP' | 'WAREHOUSE' | 'PARTNER';
            scopeId: string;
            mappingKey: 'RECEIVABLE' | 'PAYABLE' | 'REVENUE' | 'EXPENSE' | 'INVENTORY' | 'COGS' | 'TAX_PAYABLE' | 'TAX_RECEIVABLE' | 'DISCOUNT' | 'ROUNDING';
            accountId: string;
            priority?: number;
            isActive?: boolean;
            validFrom?: string | null;
            validTo?: string | null;
            branchId?: string | null;
            documentType?: string | null;
            lineType?: string | null;
            taxProfileId?: string | null;
        }) =>
            invokeStrict('accountingFoundation:definitions:save', payload),
        deleteFinancialDefinition: (definitionId: string) =>
            invokeStrict('accountingFoundation:definitions:delete', definitionId),

        resolveAccounts: (payload: {
            documentType: string;
            postingDate: string;
            itemId?: string | null;
            itemGroupId?: string | null;
            warehouseId?: string | null;
            partnerId?: string | null;
            taxProfileId?: string | null;
            lineType?: string | null;
            mappingKeys: Array<'RECEIVABLE' | 'PAYABLE' | 'REVENUE' | 'EXPENSE' | 'INVENTORY' | 'COGS' | 'TAX_PAYABLE' | 'TAX_RECEIVABLE' | 'DISCOUNT' | 'ROUNDING'>;
        }) =>
            invokeStrict('accountingFoundation:resolution:resolve', payload),
        debugResolveAccounts: (payload: {
            documentType: string;
            postingDate: string;
            itemId?: string | null;
            itemGroupId?: string | null;
            warehouseId?: string | null;
            partnerId?: string | null;
            taxProfileId?: string | null;
            lineType?: string | null;
            mappingKeys: Array<'RECEIVABLE' | 'PAYABLE' | 'REVENUE' | 'EXPENSE' | 'INVENTORY' | 'COGS' | 'TAX_PAYABLE' | 'TAX_RECEIVABLE' | 'DISCOUNT' | 'ROUNDING'>;
        }) =>
            invokeStrict('accountingFoundation:resolution:debug', payload),
    },

    accounting: {
        accounts: {
            seedDefaultChart: (payload: { companyId: string; strategy?: 'skip' | 'fail' }) =>
                invokeStrict('accounting.accounts.seedDefaultChart', payload),
            listTree: (query?: {
                includeInactive?: boolean;
                search?: string;
                category?: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'COST_OF_SALES' | 'EXPENSE' | 'OTHER_INCOME' | 'OTHER_EXPENSE' | 'CONTROL' | 'ALL';
                posting?: 'ALL' | 'POSTING' | 'HEADER';
            }) =>
                invokeStrict('accounting.accounts.listTree', query),
            listFlat: (query?: {
                includeInactive?: boolean;
                search?: string;
                category?: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'COST_OF_SALES' | 'EXPENSE' | 'OTHER_INCOME' | 'OTHER_EXPENSE' | 'CONTROL' | 'ALL';
                posting?: 'ALL' | 'POSTING' | 'HEADER';
            }) =>
                invokeStrict('accounting.accounts.listFlat', query),
            create: (payload: {
                companyId: string;
                code: string;
                name: string;
                category: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'COST_OF_SALES' | 'EXPENSE' | 'OTHER_INCOME' | 'OTHER_EXPENSE' | 'CONTROL';
                subtype: string;
                parentCode?: string | null;
                isPosting: boolean;
                normalBalance: 'DEBIT' | 'CREDIT';
                systemTag?: string | null;
                allowManualEntry: boolean;
                isActive: boolean;
                notes?: string | null;
            }) =>
                invokeStrict('accounting.accounts.create', payload),
            update: (payload: {
                id: string;
                companyId: string;
                code: string;
                name: string;
                category: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'COST_OF_SALES' | 'EXPENSE' | 'OTHER_INCOME' | 'OTHER_EXPENSE' | 'CONTROL';
                subtype: string;
                parentCode?: string | null;
                isPosting: boolean;
                normalBalance: 'DEBIT' | 'CREDIT';
                systemTag?: string | null;
                allowManualEntry: boolean;
                isActive: boolean;
                notes?: string | null;
            }) =>
                invokeStrict('accounting.accounts.update', payload),
            findByCode: (code: string) =>
                invokeStrict('accounting.accounts.findByCode', code),
        },
        financialDefinitions: {
            listByOwner: (payload: {
                companyId: string;
                ownerType: 'COMPANY' | 'BRANCH' | 'ITEM' | 'ITEM_GROUP' | 'WAREHOUSE' | 'PARTNER' | 'TAX_PROFILE' | 'DOCUMENT_TYPE_DEFAULT';
                ownerId: string;
                includeInactive?: boolean;
            }) =>
                invokeStrict('accounting.financialDefinitions.listByOwner', payload),
            upsert: (payload: {
                id?: string;
                companyId: string;
                ownerType: 'COMPANY' | 'BRANCH' | 'ITEM' | 'ITEM_GROUP' | 'WAREHOUSE' | 'PARTNER' | 'TAX_PROFILE' | 'DOCUMENT_TYPE_DEFAULT';
                ownerId: string;
                accountRole:
                    | 'RECEIVABLE_ACCOUNT'
                    | 'PAYABLE_ACCOUNT'
                    | 'REVENUE_ACCOUNT'
                    | 'SERVICE_REVENUE_ACCOUNT'
                    | 'EXPENSE_ACCOUNT'
                    | 'INVENTORY_ACCOUNT'
                    | 'RAW_MATERIAL_INVENTORY_ACCOUNT'
                    | 'WIP_INVENTORY_ACCOUNT'
                    | 'FINISHED_GOODS_INVENTORY_ACCOUNT'
                    | 'MERCHANDISE_INVENTORY_ACCOUNT'
                    | 'COGS_ACCOUNT'
                    | 'PURCHASE_RETURN_ACCOUNT'
                    | 'SALES_RETURN_ACCOUNT'
                    | 'SALES_DISCOUNT_ACCOUNT'
                    | 'PURCHASE_DISCOUNT_ACCOUNT'
                    | 'VAT_INPUT_ACCOUNT'
                    | 'VAT_OUTPUT_ACCOUNT'
                    | 'WITHHOLDING_TAX_ACCOUNT'
                    | 'ROUNDING_ACCOUNT'
                    | 'FREIGHT_IN_ACCOUNT'
                    | 'INVENTORY_ADJUSTMENT_ACCOUNT'
                    | 'PRICE_DIFFERENCE_ACCOUNT'
                    | 'SUSPENSE_ACCOUNT'
                    | 'CASH_ACCOUNT'
                    | 'BANK_ACCOUNT'
                    | 'CHEQUE_IN_SAFE_ACCOUNT'
                    | 'CHEQUES_DEPOSITED_ACCOUNT'
                    | 'RETURNED_CHEQUE_ACCOUNT'
                    | 'ISSUED_CHEQUE_ACCOUNT'
                    | 'BANK_CLEARING_ACCOUNT';
                accountId: string;
                notes?: string | null;
                isActive?: boolean;
                allowInactiveAccount?: boolean;
            }) =>
                invokeStrict('accounting.financialDefinitions.upsert', payload),
            bulkSaveForOwner: (payload: {
                companyId: string;
                ownerType: 'COMPANY' | 'BRANCH' | 'ITEM' | 'ITEM_GROUP' | 'WAREHOUSE' | 'PARTNER' | 'TAX_PROFILE' | 'DOCUMENT_TYPE_DEFAULT';
                ownerId: string;
                definitions: Array<{
                    id?: string;
                    accountRole:
                        | 'RECEIVABLE_ACCOUNT'
                        | 'PAYABLE_ACCOUNT'
                        | 'REVENUE_ACCOUNT'
                        | 'SERVICE_REVENUE_ACCOUNT'
                        | 'EXPENSE_ACCOUNT'
                        | 'INVENTORY_ACCOUNT'
                        | 'RAW_MATERIAL_INVENTORY_ACCOUNT'
                        | 'WIP_INVENTORY_ACCOUNT'
                        | 'FINISHED_GOODS_INVENTORY_ACCOUNT'
                        | 'MERCHANDISE_INVENTORY_ACCOUNT'
                        | 'COGS_ACCOUNT'
                        | 'PURCHASE_RETURN_ACCOUNT'
                        | 'SALES_RETURN_ACCOUNT'
                        | 'SALES_DISCOUNT_ACCOUNT'
                        | 'PURCHASE_DISCOUNT_ACCOUNT'
                        | 'VAT_INPUT_ACCOUNT'
                        | 'VAT_OUTPUT_ACCOUNT'
                        | 'WITHHOLDING_TAX_ACCOUNT'
                        | 'ROUNDING_ACCOUNT'
                        | 'FREIGHT_IN_ACCOUNT'
                        | 'INVENTORY_ADJUSTMENT_ACCOUNT'
                        | 'PRICE_DIFFERENCE_ACCOUNT'
                        | 'SUSPENSE_ACCOUNT'
                        | 'CASH_ACCOUNT'
                        | 'BANK_ACCOUNT'
                        | 'CHEQUE_IN_SAFE_ACCOUNT'
                        | 'CHEQUES_DEPOSITED_ACCOUNT'
                        | 'RETURNED_CHEQUE_ACCOUNT'
                        | 'ISSUED_CHEQUE_ACCOUNT'
                        | 'BANK_CLEARING_ACCOUNT';
                    accountId: string;
                    notes?: string | null;
                    isActive?: boolean;
                    allowInactiveAccount?: boolean;
                }>;
                deactivateMissing?: boolean;
            }) =>
                invokeStrict('accounting.financialDefinitions.bulkSaveForOwner', payload),
            deactivate: (payload: { companyId: string; id: string }) =>
                invokeStrict('accounting.financialDefinitions.deactivate', payload),
        },
        accountResolution: {
            resolve: (payload: {
                companyId: string;
                branchId?: string | null;
                documentType: string;
                documentId?: string | null;
                lineType?: string | null;
                itemId?: string | null;
                itemGroupId?: string | null;
                warehouseId?: string | null;
                partnerId?: string | null;
                taxProfileId?: string | null;
                isService?: boolean;
                inventoryMode?: string | null;
                requiresInventory?: boolean;
                requiresTax?: boolean;
                currencyCode?: string | null;
                direction?: 'SALE' | 'PURCHASE' | 'ADJUSTMENT' | 'TRANSFER' | 'RETURN' | null;
                requiredRoles: Array<
                    | 'RECEIVABLE_ACCOUNT'
                    | 'PAYABLE_ACCOUNT'
                    | 'REVENUE_ACCOUNT'
                    | 'SERVICE_REVENUE_ACCOUNT'
                    | 'EXPENSE_ACCOUNT'
                    | 'INVENTORY_ACCOUNT'
                    | 'RAW_MATERIAL_INVENTORY_ACCOUNT'
                    | 'WIP_INVENTORY_ACCOUNT'
                    | 'FINISHED_GOODS_INVENTORY_ACCOUNT'
                    | 'MERCHANDISE_INVENTORY_ACCOUNT'
                    | 'COGS_ACCOUNT'
                    | 'PURCHASE_RETURN_ACCOUNT'
                    | 'SALES_RETURN_ACCOUNT'
                    | 'SALES_DISCOUNT_ACCOUNT'
                    | 'PURCHASE_DISCOUNT_ACCOUNT'
                    | 'VAT_INPUT_ACCOUNT'
                    | 'VAT_OUTPUT_ACCOUNT'
                    | 'WITHHOLDING_TAX_ACCOUNT'
                    | 'ROUNDING_ACCOUNT'
                    | 'FREIGHT_IN_ACCOUNT'
                    | 'INVENTORY_ADJUSTMENT_ACCOUNT'
                    | 'PRICE_DIFFERENCE_ACCOUNT'
                    | 'SUSPENSE_ACCOUNT'
                    | 'CASH_ACCOUNT'
                    | 'BANK_ACCOUNT'
                    | 'CHEQUE_IN_SAFE_ACCOUNT'
                    | 'CHEQUES_DEPOSITED_ACCOUNT'
                    | 'RETURNED_CHEQUE_ACCOUNT'
                    | 'ISSUED_CHEQUE_ACCOUNT'
                    | 'BANK_CLEARING_ACCOUNT'
                >;
                optionalRoles?: Array<
                    | 'RECEIVABLE_ACCOUNT'
                    | 'PAYABLE_ACCOUNT'
                    | 'REVENUE_ACCOUNT'
                    | 'SERVICE_REVENUE_ACCOUNT'
                    | 'EXPENSE_ACCOUNT'
                    | 'INVENTORY_ACCOUNT'
                    | 'RAW_MATERIAL_INVENTORY_ACCOUNT'
                    | 'WIP_INVENTORY_ACCOUNT'
                    | 'FINISHED_GOODS_INVENTORY_ACCOUNT'
                    | 'MERCHANDISE_INVENTORY_ACCOUNT'
                    | 'COGS_ACCOUNT'
                    | 'PURCHASE_RETURN_ACCOUNT'
                    | 'SALES_RETURN_ACCOUNT'
                    | 'SALES_DISCOUNT_ACCOUNT'
                    | 'PURCHASE_DISCOUNT_ACCOUNT'
                    | 'VAT_INPUT_ACCOUNT'
                    | 'VAT_OUTPUT_ACCOUNT'
                    | 'WITHHOLDING_TAX_ACCOUNT'
                    | 'ROUNDING_ACCOUNT'
                    | 'FREIGHT_IN_ACCOUNT'
                    | 'INVENTORY_ADJUSTMENT_ACCOUNT'
                    | 'PRICE_DIFFERENCE_ACCOUNT'
                    | 'SUSPENSE_ACCOUNT'
                    | 'CASH_ACCOUNT'
                    | 'BANK_ACCOUNT'
                    | 'CHEQUE_IN_SAFE_ACCOUNT'
                    | 'CHEQUES_DEPOSITED_ACCOUNT'
                    | 'RETURNED_CHEQUE_ACCOUNT'
                    | 'ISSUED_CHEQUE_ACCOUNT'
                    | 'BANK_CLEARING_ACCOUNT'
                >;
            }) =>
                invokeStrict('accounting.accountResolution.resolve', payload),
            previewSalesInvoice: (payload: {
                companyId: string;
                branchId?: string | null;
                documentType?: string;
                lineType?: string | null;
                itemId?: string | null;
                itemGroupId?: string | null;
                warehouseId?: string | null;
                partnerId?: string | null;
                taxProfileId?: string | null;
                isService?: boolean;
                requiresInventory?: boolean;
                requiresTax?: boolean;
                currencyCode?: string | null;
            }) =>
                invokeStrict('accounting.accountResolution.previewSalesInvoice', payload),
            previewPurchaseInvoice: (payload: {
                companyId: string;
                branchId?: string | null;
                documentType?: string;
                lineType?: string | null;
                itemId?: string | null;
                itemGroupId?: string | null;
                warehouseId?: string | null;
                partnerId?: string | null;
                taxProfileId?: string | null;
                isService?: boolean;
                requiresInventory?: boolean;
                requiresTax?: boolean;
                currencyCode?: string | null;
            }) =>
                invokeStrict('accounting.accountResolution.previewPurchaseInvoice', payload),
        },
        journals: {
            post: (payload: {
                companyId?: string;
                branchId?: string;
                journalDate: string;
                fiscalPeriodId?: string | null;
                sourceType: string;
                sourceId: string;
                sourceNo?: string | null;
                sourceVersion?: number;
                referenceNo?: string | null;
                description?: string | null;
                currencyCode?: string;
                exchangeRate?: number;
                totalDebit?: number | null;
                totalCredit?: number | null;
                postedBy?: string;
                lines: Array<{
                    lineNo?: number;
                    accountId: string;
                    description?: string | null;
                    debit: number;
                    credit: number;
                    currencyCode?: string | null;
                    exchangeRate?: number | null;
                    baseDebit?: number | null;
                    baseCredit?: number | null;
                    branchId?: string | null;
                    costCenterId?: string | null;
                    expenseTypeId?: string | null;
                    vehicleId?: string | null;
                    partnerId?: string | null;
                    projectId?: string | null;
                    itemId?: string | null;
                    warehouseId?: string | null;
                }>;
            }) =>
                invokeStrict('accounting.journals.post', payload),
            reverse: (payload: {
                companyId?: string;
                journalId: string;
                reverseDate: string;
                sourceType?: string | null;
                sourceId?: string | null;
                sourceNo?: string | null;
                sourceVersion?: number;
                referenceNo?: string | null;
                reason?: string | null;
                postedBy?: string;
            }) =>
                invokeStrict('accounting.journals.reverse', payload),
            getBySource: (payload: {
                companyId?: string;
                sourceType: string;
                sourceId: string;
                sourceVersion?: number | null;
            }) =>
                invokeStrict('accounting.journals.getBySource', payload),
            getById: (journalId: string) =>
                invokeStrict('accounting.journals.getById', journalId),
            previewValidation: (payload: {
                companyId?: string;
                branchId?: string;
                journalDate: string;
                fiscalPeriodId?: string | null;
                sourceType: string;
                sourceId: string;
                sourceNo?: string | null;
                sourceVersion?: number;
                referenceNo?: string | null;
                description?: string | null;
                currencyCode?: string;
                exchangeRate?: number;
                totalDebit?: number | null;
                totalCredit?: number | null;
                postedBy?: string;
                lines: Array<{
                    lineNo?: number;
                    accountId: string;
                    description?: string | null;
                    debit: number;
                    credit: number;
                    currencyCode?: string | null;
                    exchangeRate?: number | null;
                    baseDebit?: number | null;
                    baseCredit?: number | null;
                    branchId?: string | null;
                    costCenterId?: string | null;
                    expenseTypeId?: string | null;
                    vehicleId?: string | null;
                    partnerId?: string | null;
                    projectId?: string | null;
                    itemId?: string | null;
                    warehouseId?: string | null;
                }>;
            }) =>
                invokeStrict('accounting.journals.previewValidation', payload),
        },
        expenseTypes: {
            list: (query?: { includeInactive?: boolean; search?: string }) =>
                invokeStrict('accounting.expenseTypes.list', query || {}),
        },
        costCenters: {
            list: (query?: { includeInactive?: boolean; search?: string }) =>
                invokeStrict('accounting.costCenters.list', query || {}),
        },
        journalDimensions: {
            validate: (payload: {
                branchId?: string | null;
                costCenterId?: string | null;
                expenseTypeId?: string | null;
                vehicleId?: string | null;
                partnerId?: string | null;
                projectId?: string | null;
            }) =>
                invokeStrict('accounting.journalDimensions.validate', payload),
        },
        expenseReports: {
            vehicle: (payload?: { dateFrom?: string | null; dateTo?: string | null; branchId?: string | null }) =>
                invokeStrict('accounting.expenseReports.vehicle', payload || {}),
            expenseType: (payload?: { dateFrom?: string | null; dateTo?: string | null; branchId?: string | null }) =>
                invokeStrict('accounting.expenseReports.expenseType', payload || {}),
            costCenter: (payload?: { dateFrom?: string | null; dateTo?: string | null; branchId?: string | null }) =>
                invokeStrict('accounting.expenseReports.costCenter', payload || {}),
        },
    },

    fleet: {
        vehicles: {
            list: (query?: { includeInactive?: boolean; search?: string }) =>
                invokeStrict('fleet.vehicles.list', query || {}),
        },
    },

    journals: {
        createDraft: () => invoke('journals:createDraft'),
        save: (data: any) => invoke('journals:save', data),
        get: (id: string) => invoke('journals:get', id),
        list: (cursor?: any) => invoke('journals:list', cursor),
        post: (id: string) => invoke('journals:post', id)
    },

    fixedAssets: {
        list: () => invoke('fixedAssets:list'),
        get: (id: string) => invoke('fixedAssets:get', id),
        create: (data: any) => invoke('fixedAssets:create', data),
        update: (id: string, data: any) => invoke('fixedAssets:update', id, data),
        delete: (id: string) => invoke('fixedAssets:delete', id),
        calcDepreciation: (id: string) => invoke('fixedAssets:calcDepreciation', id),
        postDepreciation: (id: string, amount: number, date: string) =>
            invoke('fixedAssets:postDepreciation', id, amount, date),
        getSchedule: (id: string) => invoke('fixedAssets:getSchedule', id),
    },

    bom: {
        create: (payload: any) => invokeStrict('bom.create', payload),
        update: (payload: any) => invokeStrict('bom.update', payload),
        getById: (id: string) => invokeStrict('bom.getById', id),
        getDefaultForItem: (itemId: string, asOfDate?: string | null) =>
            invokeStrict('bom.getDefaultForItem', itemId, asOfDate || null),
        setDefault: (id: string) => invokeStrict('bom.setDefault', id),
        confirm: (id: string) => invokeStrict('bom.confirm', id),
        cancel: (id: string) => invokeStrict('bom.cancel', id),
    },

    routing: {
        create: (payload: any) => invokeStrict('routing.create', payload),
        update: (payload: any) => invokeStrict('routing.update', payload),
        getById: (id: string) => invokeStrict('routing.getById', id),
        getDefaultForItem: (itemId: string) => invokeStrict('routing.getDefaultForItem', itemId),
        setDefault: (id: string) => invokeStrict('routing.setDefault', id),
        confirm: (id: string) => invokeStrict('routing.confirm', id),
        cancel: (id: string) => invokeStrict('routing.cancel', id),
    },

    productionOrder: {
        create: (payload: any) => invokeStrict('productionOrder.create', payload),
        createFromBom: (payload: any) => invokeStrict('productionOrder.createFromBom', payload),
        update: (payload: any) => invokeStrict('productionOrder.update', payload),
        getById: (id: string) => invokeStrict('productionOrder.getById', id),
        release: (id: string) => invokeStrict('productionOrder.release', id),
        cancel: (id: string) => invokeStrict('productionOrder.cancel', id),
        getStatusSummary: (id: string) => invokeStrict('productionOrder.getStatusSummary', id),
        getCostSummary: (id: string) => invokeStrict('productionOrder.getCostSummary', id),
    },

    productionIssue: {
        create: (payload: any) => invokeStrict('productionIssue.create', payload),
        getById: (id: string) => invokeStrict('productionIssue.getById', id),
        post: (payload: { issueId: string; allowOverIssue?: boolean | null }) =>
            invokeStrict('productionIssue.post', payload),
        cancel: (payload: { issueId: string; reverseDate: string; reason?: string | null }) =>
            invokeStrict('productionIssue.cancel', payload),
    },

    productionReceipt: {
        create: (payload: any) => invokeStrict('productionReceipt.create', payload),
        getById: (id: string) => invokeStrict('productionReceipt.getById', id),
        post: (payload: { receiptId: string; allowOverReceipt?: boolean | null }) =>
            invokeStrict('productionReceipt.post', payload),
        cancel: (payload: { receiptId: string; reverseDate: string; reason?: string | null }) =>
            invokeStrict('productionReceipt.cancel', payload),
    },

    customer: {
        create: (payload: any) => invokeStrict('customer.create', payload),
        update: (payload: any) => invokeStrict('customer.update', payload),
        getById: (id: string) => invokeStrict('customer.getById', id),
        list: (payload?: any) => invokeStrict('customer.list', payload || {}),
        setActive: (payload: { id: string; isActive: boolean }) => invokeStrict('customer.setActive', payload),
        getContacts: (customerId: string) => invokeStrict('customer.getContacts', customerId),
        saveContact: (payload: any) => invokeStrict('customer.saveContact', payload),
        getAddresses: (customerId: string) => invokeStrict('customer.getAddresses', customerId),
        saveAddress: (payload: any) => invokeStrict('customer.saveAddress', payload),
        getCreditProfile: (customerId: string) => invokeStrict('customer.getCreditProfile', customerId),
        saveCreditProfile: (payload: any) => invokeStrict('customer.saveCreditProfile', payload),
        evaluateCredit: (payload: any) => invokeStrict('customer.evaluateCredit', payload),
        placeHold: (payload: any) => invokeStrict('customer.placeHold', payload),
        releaseHold: (payload: any) => invokeStrict('customer.releaseHold', payload),
        getExposure: (payload: any) => invokeStrict('customer.getExposure', payload),
        getStatement: (payload: any) => invokeStrict('customer.getStatement', payload),
        getAging: (payload: any) => invokeStrict('customer.getAging', payload),
        getTimeline: (payload: any) => invokeStrict('customer.getTimeline', payload),
    },

    customerFollowUp: {
        create: (payload: any) => invokeStrict('customerFollowUp.create', payload),
        update: (payload: any) => invokeStrict('customerFollowUp.update', payload),
        getByCustomer: (customerId: string, includeClosed?: boolean) =>
            invokeStrict('customerFollowUp.getByCustomer', customerId, includeClosed),
        markDone: (payload: any) => invokeStrict('customerFollowUp.markDone', payload),
        cancel: (payload: any) => invokeStrict('customerFollowUp.cancel', payload),
    },

    vendor: {
        create: (payload: any) => invokeStrict('vendor.create', payload),
        update: (payload: any) => invokeStrict('vendor.update', payload),
        getById: (id: string) => invokeStrict('vendor.getById', id),
        list: (payload?: any) => invokeStrict('vendor.list', payload || {}),
        setActive: (payload: { id: string; isActive: boolean }) => invokeStrict('vendor.setActive', payload),
        getContacts: (vendorId: string) => invokeStrict('vendor.getContacts', vendorId),
        saveContact: (payload: any) => invokeStrict('vendor.saveContact', payload),
        getAddresses: (vendorId: string) => invokeStrict('vendor.getAddresses', vendorId),
        saveAddress: (payload: any) => invokeStrict('vendor.saveAddress', payload),
        getPaymentProfile: (vendorId: string) => invokeStrict('vendor.getPaymentProfile', vendorId),
        savePaymentProfile: (payload: any) => invokeStrict('vendor.savePaymentProfile', payload),
        evaluatePaymentControl: (payload: any) => invokeStrict('vendor.evaluatePaymentControl', payload),
        placeHold: (payload: any) => invokeStrict('vendor.placeHold', payload),
        releaseHold: (payload: any) => invokeStrict('vendor.releaseHold', payload),
        getExposure: (payload: any) => invokeStrict('vendor.getExposure', payload),
        getStatement: (payload: any) => invokeStrict('vendor.getStatement', payload),
        getAging: (payload: any) => invokeStrict('vendor.getAging', payload),
        getTimeline: (payload: any) => invokeStrict('vendor.getTimeline', payload),
    },

    vendorFollowUp: {
        create: (payload: any) => invokeStrict('vendorFollowUp.create', payload),
        update: (payload: any) => invokeStrict('vendorFollowUp.update', payload),
        getByVendor: (vendorId: string, includeClosed?: boolean) =>
            invokeStrict('vendorFollowUp.getByVendor', vendorId, includeClosed),
        markDone: (payload: any) => invokeStrict('vendorFollowUp.markDone', payload),
        cancel: (payload: any) => invokeStrict('vendorFollowUp.cancel', payload),
    },

    // Compatibility wrapper for existing manufacturing pages.
    manufacturing: {
        getWorkCenters: () => invoke('mfg-get-work-centers'),
        saveWorkCenter: (data: any) => invoke('mfg-save-work-center', data),
        deleteWorkCenter: (id: string) => invoke('mfg-delete-work-center', id),
        getMachines: () => invoke('mfg-get-machines'),
        saveMachine: (data: any) => invoke('mfg-save-machine', data),
        deleteMachine: (id: string) => invoke('mfg-delete-machine', id),
        getBOMs: () => invoke('mfg-get-boms'),
        createBOM: (header: any, lines: any[]) =>
            invokeStrict('bom.create', { ...header, lines, itemId: header?.itemId || header?.productId, outputQty: header?.outputQty ?? header?.outputQuantity }),
        updateBOM: (id: string, header: any, lines: any[]) =>
            invokeStrict('bom.update', { ...header, id, lines, outputQty: header?.outputQty ?? header?.outputQuantity }),
        getBOM: (id: string) => invokeStrict('bom.getById', id),
        saveRouting: (header: any, ops: any[]) => invoke('mfg-save-routing', header, ops),
        getRoutings: (bomId: string) => invoke('mfg-get-routings', bomId),
        getOrders: () => invoke('mfg-get-orders'),
        createOrder: (payload: any) => invokeStrict('productionOrder.create', payload),
        getOrder: (id: string) => invokeStrict('productionOrder.getById', id),
        updateOrderStatus: (id: string, status: string) => invoke('mfg-update-order-status', { id, status }),
        executeOrder: (id: string, qty: number, date: string) => invoke('mfg-execute-order', id, qty, date),
        releaseOrder: (id: string) => invokeStrict('productionOrder.release', id),
        getOrderStatusSummary: (id: string) => invokeStrict('productionOrder.getStatusSummary', id),
        getJobCards: (filters?: any) => invoke('mfg-get-job-cards', filters),
        startJob: (data: any) => invoke('mfg-start-job', data),
        stopJob: (id: string, data: any) => invoke('mfg-stop-job', { id, data }),
        getQCTests: () => invoke('mfg-get-qc-tests'),
        saveQCTest: (data: any) => invoke('mfg-save-qc-test', data),
        getInspections: (filters?: any) => invoke('mfg-get-inspections', filters),
        saveInspection: (data: any) => invoke('mfg-save-inspection', data),
        getMaintenanceRequests: (filters?: any) => invoke('mfg-get-maintenance-requests', filters),
        saveMaintenanceRequest: (data: any) => invoke('mfg-save-maintenance-request', data),
        getWIPReport: () => invoke('mfg-get-wip-report'),
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
