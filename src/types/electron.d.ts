export interface ElectronAPI {
    // Master Data
    masterData: {
        getBanks: () => Promise<any[]>;
        saveBank: (data: any) => Promise<any>;
        deleteBank: (id: string) => Promise<any>;

        getBankAccounts: () => Promise<any[]>;
        saveBankAccount: (data: any) => Promise<any>;
        deleteBankAccount: (id: string) => Promise<any>;

        getCostCenters: () => Promise<any[]>;
        getPaymentMethods: () => Promise<any[]>;
    };

    // Treasury
    treasury: {
        createReceipt: (data: any) => Promise<any>;
        createPayment: (data: any) => Promise<any>;
        getReceipt: (id: string) => Promise<any>;
        getPayment: (id: string) => Promise<any>;
        getBookBalance: (accountId: string, date: string) => Promise<number>;
    };

    // Currency
    currency: {
        getCurrencies: () => Promise<any[]>;
        getBaseCurrency: () => Promise<any>;
        createCurrency: (currency: any) => Promise<any>;
        updateCurrency: (currency: any) => Promise<any>;
        deleteCurrency: (id: string) => Promise<any>;
        updateRates: () => Promise<any>;
        getCurrencyHistory: (code: string, days?: number) => Promise<any>;
    };

    // Accounting
    account: {
        getAccount: (id: string) => Promise<any>;
        getAccounts: () => Promise<any[]>;
        getTree: () => Promise<any[]>;
    };

    accountingFoundation: {
        listAccounts: (includeInactive?: boolean) => Promise<Array<{
            id: string;
            companyId: string;
            branchId: string | null;
            accountCode: string;
            name: string;
            parentId: string | null;
            level: number;
            accountType: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';
            accountCategory: string;
            accountSubtype: string;
            postingAllowed: boolean;
            currencyBehavior: 'BASE_ONLY' | 'FIXED_CURRENCY' | 'MULTI_CURRENCY';
            currencyCode: string | null;
            scopeType: 'COMPANY' | 'BRANCH';
            status: 'ACTIVE' | 'INACTIVE';
            requiresCostCenter: boolean;
            requiresAnalysisCode: boolean;
        }>>;
        getAccountTree: (includeInactive?: boolean) => Promise<Array<{
            id: string;
            companyId: string;
            branchId: string | null;
            accountCode: string;
            name: string;
            parentId: string | null;
            level: number;
            accountType: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';
            accountCategory: string;
            accountSubtype: string;
            postingAllowed: boolean;
            currencyBehavior: 'BASE_ONLY' | 'FIXED_CURRENCY' | 'MULTI_CURRENCY';
            currencyCode: string | null;
            scopeType: 'COMPANY' | 'BRANCH';
            status: 'ACTIVE' | 'INACTIVE';
            requiresCostCenter: boolean;
            requiresAnalysisCode: boolean;
            children: Array<any>;
        }>>;
        getPostableAccounts: () => Promise<Array<{
            id: string;
            companyId: string;
            branchId: string | null;
            accountCode: string;
            name: string;
            parentId: string | null;
            level: number;
            accountType: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';
            accountCategory: string;
            accountSubtype: string;
            postingAllowed: boolean;
            currencyBehavior: 'BASE_ONLY' | 'FIXED_CURRENCY' | 'MULTI_CURRENCY';
            currencyCode: string | null;
            scopeType: 'COMPANY' | 'BRANCH';
            status: 'ACTIVE' | 'INACTIVE';
            requiresCostCenter: boolean;
            requiresAnalysisCode: boolean;
        }>>;
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
        }) => Promise<{
            id: string;
            companyId: string;
            branchId: string | null;
            accountCode: string;
            name: string;
            parentId: string | null;
            level: number;
            accountType: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';
            accountCategory: string;
            accountSubtype: string;
            postingAllowed: boolean;
            currencyBehavior: 'BASE_ONLY' | 'FIXED_CURRENCY' | 'MULTI_CURRENCY';
            currencyCode: string | null;
            scopeType: 'COMPANY' | 'BRANCH';
            status: 'ACTIVE' | 'INACTIVE';
            requiresCostCenter: boolean;
            requiresAnalysisCode: boolean;
        }>;
        deleteAccount: (accountId: string) => Promise<{ success: boolean }>;
        activateAccount: (accountId: string) => Promise<{
            id: string;
            companyId: string;
            branchId: string | null;
            accountCode: string;
            name: string;
            parentId: string | null;
            level: number;
            accountType: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';
            accountCategory: string;
            accountSubtype: string;
            postingAllowed: boolean;
            currencyBehavior: 'BASE_ONLY' | 'FIXED_CURRENCY' | 'MULTI_CURRENCY';
            currencyCode: string | null;
            scopeType: 'COMPANY' | 'BRANCH';
            status: 'ACTIVE' | 'INACTIVE';
            requiresCostCenter: boolean;
            requiresAnalysisCode: boolean;
        }>;
        deactivateAccount: (accountId: string) => Promise<{
            id: string;
            companyId: string;
            branchId: string | null;
            accountCode: string;
            name: string;
            parentId: string | null;
            level: number;
            accountType: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';
            accountCategory: string;
            accountSubtype: string;
            postingAllowed: boolean;
            currencyBehavior: 'BASE_ONLY' | 'FIXED_CURRENCY' | 'MULTI_CURRENCY';
            currencyCode: string | null;
            scopeType: 'COMPANY' | 'BRANCH';
            status: 'ACTIVE' | 'INACTIVE';
            requiresCostCenter: boolean;
            requiresAnalysisCode: boolean;
        }>;

        listFinancialDefinitions: (includeInactive?: boolean) => Promise<Array<{
            id: string;
            companyId: string;
            branchId: string | null;
            scopeType: 'COMPANY' | 'BRANCH' | 'ITEM' | 'ITEM_GROUP' | 'WAREHOUSE' | 'PARTNER';
            scopeId: string;
            mappingKey: 'RECEIVABLE' | 'PAYABLE' | 'REVENUE' | 'EXPENSE' | 'INVENTORY' | 'COGS' | 'TAX_PAYABLE' | 'TAX_RECEIVABLE' | 'DISCOUNT' | 'ROUNDING';
            accountId: string;
            priority: number;
            isActive: boolean;
            validFrom: string | null;
            validTo: string | null;
            documentType: string | null;
            lineType: string | null;
            taxProfileId: string | null;
            updatedAt: string | null;
        }>>;
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
        }) => Promise<any>;
        deleteFinancialDefinition: (definitionId: string) => Promise<{ success: boolean }>;
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
        }) => Promise<{
            isSuccessful: boolean;
            entries: Array<{
                mappingKey: 'RECEIVABLE' | 'PAYABLE' | 'REVENUE' | 'EXPENSE' | 'INVENTORY' | 'COGS' | 'TAX_PAYABLE' | 'TAX_RECEIVABLE' | 'DISCOUNT' | 'ROUNDING';
                accountId: string;
                accountCode: string;
                accountName: string;
                definitionId: string;
                sourceScopeType: 'COMPANY' | 'BRANCH' | 'ITEM' | 'ITEM_GROUP' | 'WAREHOUSE' | 'PARTNER';
                sourceScopeId: string;
                sourceBranchId: string | null;
                qualifierScore: number;
                trace: string[];
            }>;
            failures: Array<{
                mappingKey: 'RECEIVABLE' | 'PAYABLE' | 'REVENUE' | 'EXPENSE' | 'INVENTORY' | 'COGS' | 'TAX_PAYABLE' | 'TAX_RECEIVABLE' | 'DISCOUNT' | 'ROUNDING';
                errorCode: string;
                messageKey: string;
                trace: string[];
            }>;
        }>;
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
        }) => Promise<{
            isSuccessful: boolean;
            entries: Array<{
                mappingKey: 'RECEIVABLE' | 'PAYABLE' | 'REVENUE' | 'EXPENSE' | 'INVENTORY' | 'COGS' | 'TAX_PAYABLE' | 'TAX_RECEIVABLE' | 'DISCOUNT' | 'ROUNDING';
                accountId: string;
                accountCode: string;
                accountName: string;
                definitionId: string;
                sourceScopeType: 'COMPANY' | 'BRANCH' | 'ITEM' | 'ITEM_GROUP' | 'WAREHOUSE' | 'PARTNER';
                sourceScopeId: string;
                sourceBranchId: string | null;
                qualifierScore: number;
                trace: string[];
            }>;
            failures: Array<{
                mappingKey: 'RECEIVABLE' | 'PAYABLE' | 'REVENUE' | 'EXPENSE' | 'INVENTORY' | 'COGS' | 'TAX_PAYABLE' | 'TAX_RECEIVABLE' | 'DISCOUNT' | 'ROUNDING';
                errorCode: string;
                messageKey: string;
                trace: string[];
            }>;
        }>;
    };

    accounting: {
        accounts: {
            seedDefaultChart: (payload: {
                companyId: string;
                strategy?: 'skip' | 'fail';
            }) => Promise<{
                companyId: string;
                strategy: 'skip' | 'fail';
                inserted: number;
                skipped: number;
                total: number;
            }>;
            listTree: (query?: {
                includeInactive?: boolean;
                search?: string;
                category?: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'COST_OF_SALES' | 'EXPENSE' | 'OTHER_INCOME' | 'OTHER_EXPENSE' | 'CONTROL' | 'ALL';
                posting?: 'ALL' | 'POSTING' | 'HEADER';
            }) => Promise<Array<{
                id: string;
                companyId: string;
                code: string;
                name: string;
                category: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'COST_OF_SALES' | 'EXPENSE' | 'OTHER_INCOME' | 'OTHER_EXPENSE' | 'CONTROL';
                subtype: string;
                parentId: string | null;
                parentCode: string | null;
                isPosting: boolean;
                normalBalance: 'DEBIT' | 'CREDIT';
                systemTag: string | null;
                allowManualEntry: boolean;
                isActive: boolean;
                level: number;
                path: string;
                createdAt: string;
                updatedAt: string;
                children: any[];
            }>>;
            listFlat: (query?: {
                includeInactive?: boolean;
                search?: string;
                category?: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'COST_OF_SALES' | 'EXPENSE' | 'OTHER_INCOME' | 'OTHER_EXPENSE' | 'CONTROL' | 'ALL';
                posting?: 'ALL' | 'POSTING' | 'HEADER';
            }) => Promise<Array<{
                id: string;
                companyId: string;
                code: string;
                name: string;
                category: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'COST_OF_SALES' | 'EXPENSE' | 'OTHER_INCOME' | 'OTHER_EXPENSE' | 'CONTROL';
                subtype: string;
                parentId: string | null;
                parentCode: string | null;
                isPosting: boolean;
                normalBalance: 'DEBIT' | 'CREDIT';
                systemTag: string | null;
                allowManualEntry: boolean;
                isActive: boolean;
                level: number;
                path: string;
                createdAt: string;
                updatedAt: string;
            }>>;
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
            }) => Promise<{
                id: string;
                companyId: string;
                code: string;
                name: string;
                category: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'COST_OF_SALES' | 'EXPENSE' | 'OTHER_INCOME' | 'OTHER_EXPENSE' | 'CONTROL';
                subtype: string;
                parentId: string | null;
                parentCode: string | null;
                isPosting: boolean;
                normalBalance: 'DEBIT' | 'CREDIT';
                systemTag: string | null;
                allowManualEntry: boolean;
                isActive: boolean;
                level: number;
                path: string;
                createdAt: string;
                updatedAt: string;
            }>;
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
            }) => Promise<{
                id: string;
                companyId: string;
                code: string;
                name: string;
                category: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'COST_OF_SALES' | 'EXPENSE' | 'OTHER_INCOME' | 'OTHER_EXPENSE' | 'CONTROL';
                subtype: string;
                parentId: string | null;
                parentCode: string | null;
                isPosting: boolean;
                normalBalance: 'DEBIT' | 'CREDIT';
                systemTag: string | null;
                allowManualEntry: boolean;
                isActive: boolean;
                level: number;
                path: string;
                createdAt: string;
                updatedAt: string;
            }>;
            findByCode: (code: string) => Promise<{
                id: string;
                companyId: string;
                code: string;
                name: string;
                category: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'COST_OF_SALES' | 'EXPENSE' | 'OTHER_INCOME' | 'OTHER_EXPENSE' | 'CONTROL';
                subtype: string;
                parentId: string | null;
                parentCode: string | null;
                isPosting: boolean;
                normalBalance: 'DEBIT' | 'CREDIT';
                systemTag: string | null;
                allowManualEntry: boolean;
                isActive: boolean;
                level: number;
                path: string;
                createdAt: string;
                updatedAt: string;
            } | null>;
        };
        financialDefinitions: {
            listByOwner: (payload: {
                companyId: string;
                ownerType: 'COMPANY' | 'BRANCH' | 'ITEM' | 'ITEM_GROUP' | 'WAREHOUSE' | 'PARTNER' | 'TAX_PROFILE' | 'DOCUMENT_TYPE_DEFAULT';
                ownerId: string;
                includeInactive?: boolean;
            }) => Promise<any[]>;
            upsert: (payload: {
                id?: string;
                companyId: string;
                ownerType: 'COMPANY' | 'BRANCH' | 'ITEM' | 'ITEM_GROUP' | 'WAREHOUSE' | 'PARTNER' | 'TAX_PROFILE' | 'DOCUMENT_TYPE_DEFAULT';
                ownerId: string;
                accountRole: string;
                accountId: string;
                notes?: string | null;
                isActive?: boolean;
                allowInactiveAccount?: boolean;
            }) => Promise<any>;
            bulkSaveForOwner: (payload: {
                companyId: string;
                ownerType: 'COMPANY' | 'BRANCH' | 'ITEM' | 'ITEM_GROUP' | 'WAREHOUSE' | 'PARTNER' | 'TAX_PROFILE' | 'DOCUMENT_TYPE_DEFAULT';
                ownerId: string;
                definitions: Array<{
                    id?: string;
                    accountRole: string;
                    accountId: string;
                    notes?: string | null;
                    isActive?: boolean;
                    allowInactiveAccount?: boolean;
                }>;
                deactivateMissing?: boolean;
            }) => Promise<{
                ownerType: string;
                ownerId: string;
                saved: any[];
                deactivatedCount: number;
            }>;
            deactivate: (payload: { companyId: string; id: string }) => Promise<{ success: boolean }>;
        };
        accountResolution: {
            resolve: (payload: any) => Promise<any>;
            previewSalesInvoice: (payload: any) => Promise<any>;
            previewPurchaseInvoice: (payload: any) => Promise<any>;
        };
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
            }) => Promise<{
                journalId: string;
                journalNo: string;
                status: 'POSTED' | 'REVERSED' | 'DRAFT';
                fiscalPeriodId: string;
                totals: {
                    totalDebit: number;
                    totalCredit: number;
                };
                postingRegistryId: string;
            }>;
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
            }) => Promise<{
                originalJournalId: string;
                reversalJournalId: string;
                reversalJournalNo: string;
                status: 'REVERSED' | 'POSTED' | 'DRAFT';
            }>;
            getBySource: (payload: {
                companyId?: string;
                sourceType: string;
                sourceId: string;
                sourceVersion?: number | null;
            }) => Promise<{
                id: string;
                companyId: string;
                branchId: string;
                journalNo: string;
                journalDate: string;
                fiscalPeriodId: string;
                sourceType: string;
                sourceId: string;
                sourceNo: string | null;
                sourceVersion: number;
                referenceNo: string | null;
                description: string | null;
                status: 'DRAFT' | 'POSTED' | 'REVERSED';
                currencyCode: string;
                exchangeRate: number;
                totalDebit: number;
                totalCredit: number;
                postedBy: string;
                postedAt: string;
                reversedJournalId: string | null;
                createdAt: string;
                updatedAt: string;
                lines: Array<{
                    id: string;
                    journalId: string;
                    lineNo: number;
                    accountId: string;
                    description: string | null;
                    debit: number;
                    credit: number;
                    currencyCode: string;
                    exchangeRate: number;
                    baseDebit: number;
                    baseCredit: number;
                    branchId: string | null;
                    costCenterId: string | null;
                    expenseTypeId: string | null;
                    vehicleId: string | null;
                    partnerId: string | null;
                    projectId: string | null;
                    itemId: string | null;
                    warehouseId: string | null;
                    createdAt: string;
                    updatedAt: string;
                }>;
            } | null>;
            getById: (journalId: string) => Promise<{
                id: string;
                companyId: string;
                branchId: string;
                journalNo: string;
                journalDate: string;
                fiscalPeriodId: string;
                sourceType: string;
                sourceId: string;
                sourceNo: string | null;
                sourceVersion: number;
                referenceNo: string | null;
                description: string | null;
                status: 'DRAFT' | 'POSTED' | 'REVERSED';
                currencyCode: string;
                exchangeRate: number;
                totalDebit: number;
                totalCredit: number;
                postedBy: string;
                postedAt: string;
                reversedJournalId: string | null;
                createdAt: string;
                updatedAt: string;
                lines: Array<{
                    id: string;
                    journalId: string;
                    lineNo: number;
                    accountId: string;
                    description: string | null;
                    debit: number;
                    credit: number;
                    currencyCode: string;
                    exchangeRate: number;
                    baseDebit: number;
                    baseCredit: number;
                    branchId: string | null;
                    costCenterId: string | null;
                    expenseTypeId: string | null;
                    vehicleId: string | null;
                    partnerId: string | null;
                    projectId: string | null;
                    itemId: string | null;
                    warehouseId: string | null;
                    createdAt: string;
                    updatedAt: string;
                }>;
            } | null>;
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
            }) => Promise<{
                isValid: boolean;
                fiscalPeriodId: string | null;
                totals: {
                    lineCount: number;
                    totalDebit: number;
                    totalCredit: number;
                };
                issues: Array<{
                    code: string;
                    message: string;
                    lineNo?: number;
                    accountId?: string;
                    details?: Record<string, unknown>;
                }>;
            }>;
        };
        expenseTypes: {
            list: (query?: {
                includeInactive?: boolean;
                search?: string;
            }) => Promise<Array<{
                id: string;
                code: string;
                name: string;
                isActive: boolean;
                createdAt: string;
            }>>;
        };
        costCenters: {
            list: (query?: {
                includeInactive?: boolean;
                search?: string;
            }) => Promise<Array<{
                id: string;
                code: string;
                name: string;
                parentId: string | null;
                isActive: boolean;
            }>>;
        };
        journalDimensions: {
            validate: (payload: {
                branchId?: string | null;
                costCenterId?: string | null;
                expenseTypeId?: string | null;
                vehicleId?: string | null;
                partnerId?: string | null;
                projectId?: string | null;
            }) => Promise<{ valid: true }>;
        };
        expenseReports: {
            vehicle: (payload?: {
                dateFrom?: string | null;
                dateTo?: string | null;
                branchId?: string | null;
            }) => Promise<Array<{
                vehicleId: string;
                vehicleName: string;
                plateNo: string;
                department: string | null;
                totalDebit: number;
                totalCredit: number;
                netAmount: number;
            }>>;
            expenseType: (payload?: {
                dateFrom?: string | null;
                dateTo?: string | null;
                branchId?: string | null;
            }) => Promise<Array<{
                expenseTypeId: string;
                expenseTypeCode: string;
                expenseTypeName: string;
                totalDebit: number;
                totalCredit: number;
                netAmount: number;
            }>>;
            costCenter: (payload?: {
                dateFrom?: string | null;
                dateTo?: string | null;
                branchId?: string | null;
            }) => Promise<Array<{
                costCenterId: string;
                costCenterCode: string;
                costCenterName: string;
                parentId: string | null;
                totalDebit: number;
                totalCredit: number;
                netAmount: number;
            }>>;
        };
    };

    fleet: {
        vehicles: {
            list: (query?: {
                includeInactive?: boolean;
                search?: string;
            }) => Promise<Array<{
                id: string;
                name: string;
                plateNo: string;
                model: string | null;
                department: string | null;
                isActive: boolean;
            }>>;
        };
    };

    // Partner
    partner: {
        getPartners: (type?: string) => Promise<any[]>;
        getPartner: (id: string) => Promise<any>;
        savePartner: (partner: any) => Promise<any>;
        deletePartner: (id: string) => Promise<any>;
        getCustomerTypes: () => Promise<any[]>;
        saveCustomerType: (data: any) => Promise<any>;
        deleteCustomerType: (id: string | number) => Promise<any>;
        getVendorTypes: () => Promise<any[]>;
        saveVendorType: (data: any) => Promise<any>;
        deleteVendorType: (id: string | number) => Promise<any>;
        getContactTypes: () => Promise<any[]>;
        getMemberships: () => Promise<any[]>;
        saveMembership: (data: any) => Promise<any>;
        deleteMembership: (id: string) => Promise<any>;
        getSectors: () => Promise<any[]>;
        saveSector: (data: any) => Promise<any>;
        deleteSector: (id: string) => Promise<any>;
        getCreditPolicies: () => Promise<any[]>;
        saveCreditPolicy: (data: any) => Promise<any>;
        deleteCreditPolicy: (id: string) => Promise<any>;
        getRegions: () => Promise<any[]>;
        saveRegion: (data: any) => Promise<any>;
        createRegion: (data: any) => Promise<any>;
        updateRegion: (data: any) => Promise<any>;
        deleteRegion: (id: string) => Promise<any>;
        getGroups: () => Promise<any[]>;
        saveGroup: (data: any) => Promise<any>;
        deleteGroup: (id: string) => Promise<any>;
        getSalesReps: () => Promise<any[]>;
        saveSalesRep: (data: any) => Promise<any>;
        deleteSalesRep: (id: string) => Promise<any>;
        getPriceLists: () => Promise<any[]>;
        savePriceList: (data: any) => Promise<any>;
        deletePriceList: (id: string) => Promise<any>;
        getPriceListItems: (listId: string) => Promise<any[]>;
        savePriceListItem: (data: any) => Promise<any>;
        deletePriceListItem: (id: string) => Promise<any>;
    };

    // Journal
    journal: {
        getNextVoucherNo: (prefix: string) => Promise<string>;
        createEntry?: (header: any, lines: any[]) => Promise<any>;
        getEntry?: (id: string) => Promise<any>;
        getEntries?: (filters: any) => Promise<any[]>;
    };

    ae: {
        listSubAccounts: (accountId?: string) => Promise<any[]>;
        createSubAccount: (data: { account_id: string; name: string; code?: string | null }) => Promise<any>;
        listReferences: (refType?: string) => Promise<any[]>;
        createReference: (data: { ref_type: string; ref_name: string; ref_code?: string | null }) => Promise<any>;
        saveDraftVoucher: (payload: any) => Promise<any>;
        postVoucher: (payload: any) => Promise<any>;
        postDraftVoucher: (voucherId: string) => Promise<any>;
        getVoucher: (id: string) => Promise<any>;
        getVouchers: (filters?: any) => Promise<any[]>;
        getTrialBalance: (params?: { fromDate?: string; toDate?: string }) => Promise<any[]>;
    };

    hr: {
        getEmployees: () => Promise<any[]>;
    };

    inventory: {
        getItems: () => Promise<any[]>;
        getWarehouses: () => Promise<any[]>;
        transferRequest: (data: any) => Promise<any>;
        getTransferRequests: (filters?: any) => Promise<any[]>;
        getTransferRequest: (id: string) => Promise<any>;
        getStockDocument: (id: string) => Promise<any>;
        getDispatches: () => Promise<any[]>;
        getGoodsReceipts: () => Promise<any[]>;
    };

    sales: {
        getOrders: () => Promise<any[]>;
        getPendingOrders: () => Promise<any[]>;
    };

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
        }) => Promise<{
            header: any;
            lines: any[];
        }>;
        update: (payload: any) => Promise<{
            header: any;
            lines: any[];
        }>;
        getById: (documentId: string) => Promise<{
            header: any;
            lines: any[];
        }>;
        confirm: (documentId: string) => Promise<{
            header: any;
            lines: any[];
        }>;
        cancel: (documentId: string) => Promise<{
            header: any;
            lines: any[];
        }>;
        convertToOrder: (payload: { quotationId: string }) => Promise<{
            sourceDocumentId: string;
            targetDocumentId: string;
            targetDocType: 'SALES_ORDER';
            targetDocNo: string;
        }>;
    };

    salesOrder: {
        create: (payload: any) => Promise<{
            header: any;
            lines: any[];
        }>;
        update: (payload: any) => Promise<{
            header: any;
            lines: any[];
        }>;
        getById: (documentId: string) => Promise<{
            header: any;
            lines: any[];
        }>;
        confirm: (documentId: string) => Promise<{
            header: any;
            lines: any[];
        }>;
        cancel: (documentId: string) => Promise<{
            header: any;
            lines: any[];
        }>;
        convertToDelivery: (payload: {
            orderId: string;
            selectedLines?: Array<{ sourceLineId: string; qty: number }>;
        }) => Promise<{
            sourceDocumentId: string;
            targetDocumentId: string;
            targetDocType: 'DELIVERY_NOTE';
            targetDocNo: string;
        }>;
        getFulfillmentStatus: (orderId: string) => Promise<{
            orderId: string;
            orderNo: string;
            status: 'OPEN' | 'PARTIAL' | 'COMPLETED' | 'CANCELLED';
            totalQty: number;
            deliveredQty: number;
            returnedQty: number;
            invoicedQty: number;
            reservedQty: number;
            remainingQty: number;
            lines: Array<{
                lineId: string;
                itemId: string;
                qty: number;
                reservedQty: number;
                deliveredQty: number;
                returnedQty: number;
                invoicedQty: number;
                remainingQty: number;
                lineStatus: 'OPEN' | 'PARTIAL' | 'COMPLETED' | 'CANCELLED';
            }>;
        }>;
        prepareInvoice: (orderId: string) => Promise<{
            sourceDocType: 'SALES_ORDER';
            sourceDocId: string;
            sourceDocNo: string;
            customerId: string;
            currencyCode: string;
            currencyRate: number;
            warehouseId: string | null;
            lines: any[];
        }>;
    };

    deliveryNote: {
        create: (payload: any) => Promise<{
            header: any;
            lines: any[];
        }>;
        update: (payload: any) => Promise<{
            header: any;
            lines: any[];
        }>;
        getById: (documentId: string) => Promise<{
            header: any;
            lines: any[];
        }>;
        post: (documentId: string) => Promise<{
            documentId: string;
            docType: 'DELIVERY_NOTE';
            docNo: string;
            status: 'POSTED' | 'ALREADY_POSTED';
            sourceVersion: number;
            isStockPosted: boolean;
            isFinancialPosted: boolean;
            journalId: string | null;
            journalNo: string | null;
        }>;
        cancel: (payload: {
            documentId: string;
            reverseDate: string;
            reason?: string | null;
        }) => Promise<{
            documentId: string;
            docType: 'DELIVERY_NOTE';
            docNo: string;
            status: 'CANCELLED' | 'ALREADY_CANCELLED';
            isStockReversed: boolean;
            isFinancialReversed: boolean;
            reversalJournalId: string | null;
            reversalJournalNo: string | null;
        }>;
        prepareInvoice: (documentId: string) => Promise<{
            sourceDocType: 'DELIVERY_NOTE';
            sourceDocId: string;
            sourceDocNo: string;
            customerId: string;
            currencyCode: string;
            currencyRate: number;
            warehouseId: string | null;
            lines: any[];
        }>;
    };

    salesReturn: {
        create: (payload: any) => Promise<{
            header: any;
            lines: any[];
        }>;
        update: (payload: any) => Promise<{
            header: any;
            lines: any[];
        }>;
        getById: (documentId: string) => Promise<{
            header: any;
            lines: any[];
        }>;
        post: (documentId: string) => Promise<{
            documentId: string;
            docType: 'SALES_RETURN';
            docNo: string;
            status: 'POSTED' | 'ALREADY_POSTED';
            sourceVersion: number;
            isStockPosted: boolean;
            isFinancialPosted: boolean;
            journalId: string | null;
            journalNo: string | null;
        }>;
        cancel: (payload: {
            documentId: string;
            reverseDate: string;
            reason?: string | null;
        }) => Promise<{
            documentId: string;
            docType: 'SALES_RETURN';
            docNo: string;
            status: 'CANCELLED' | 'ALREADY_CANCELLED';
            isStockReversed: boolean;
            isFinancialReversed: boolean;
            reversalJournalId: string | null;
            reversalJournalNo: string | null;
        }>;
        getPostingStatus: (documentId: string) => Promise<{
            documentId: string;
            docType: 'SALES_RETURN';
            docNo: string;
            documentStatus: 'DRAFT' | 'CONFIRMED' | 'POSTED' | 'PARTIAL' | 'COMPLETED' | 'CANCELLED';
            sourceVersion: number;
            isStockPosted: boolean;
            isStockReversed: boolean;
            isFinancialPosted: boolean;
            isFinancialReversed: boolean;
            journalId: string | null;
            journalNo: string | null;
            reversalJournalId: string | null;
            reversalJournalNo: string | null;
            postedAt: string | null;
            reversedAt: string | null;
        }>;
    };

    purchaseRequest: {
        create: (payload: any) => Promise<{ header: any; lines: any[] }>;
        update: (payload: any) => Promise<{ header: any; lines: any[] }>;
        getById: (documentId: string) => Promise<{ header: any; lines: any[] }>;
        confirm: (documentId: string) => Promise<{ header: any; lines: any[] }>;
        cancel: (documentId: string) => Promise<{ header: any; lines: any[] }>;
        convertToRfq: (payload: { requestId: string }) => Promise<{
            sourceDocumentId: string;
            targetDocumentId: string;
            targetDocType: 'PURCHASE_RFQ';
            targetDocNo: string;
        }>;
        convertToOrder: (payload: { requestId: string }) => Promise<{
            sourceDocumentId: string;
            targetDocumentId: string;
            targetDocType: 'PURCHASE_ORDER';
            targetDocNo: string;
        }>;
    };

    purchaseRfq: {
        create: (payload: any) => Promise<{ header: any; lines: any[] }>;
        update: (payload: any) => Promise<{ header: any; lines: any[] }>;
        getById: (documentId: string) => Promise<{ header: any; lines: any[] }>;
        confirm: (documentId: string) => Promise<{ header: any; lines: any[] }>;
        cancel: (documentId: string) => Promise<{ header: any; lines: any[] }>;
        convertToOrder: (payload: { rfqId: string }) => Promise<{
            sourceDocumentId: string;
            targetDocumentId: string;
            targetDocType: 'PURCHASE_ORDER';
            targetDocNo: string;
        }>;
    };

    purchaseOrder: {
        create: (payload: any) => Promise<{ header: any; lines: any[] }>;
        update: (payload: any) => Promise<{ header: any; lines: any[] }>;
        getById: (documentId: string) => Promise<{ header: any; lines: any[] }>;
        confirm: (documentId: string) => Promise<{ header: any; lines: any[] }>;
        cancel: (documentId: string) => Promise<{ header: any; lines: any[] }>;
        convertToReceipt: (payload: {
            orderId: string;
            selectedLines?: Array<{ sourceLineId: string; qty: number }>;
        }) => Promise<{
            sourceDocumentId: string;
            targetDocumentId: string;
            targetDocType: 'GOODS_RECEIPT_NOTE';
            targetDocNo: string;
        }>;
        getFulfillmentStatus: (orderId: string) => Promise<any>;
    };

    goodsReceiptNote: {
        create: (payload: any) => Promise<{ header: any; lines: any[] }>;
        update: (payload: any) => Promise<{ header: any; lines: any[] }>;
        getById: (documentId: string) => Promise<{ header: any; lines: any[] }>;
        post: (documentId: string) => Promise<any>;
        cancel: (payload: { documentId: string; reverseDate: string; reason?: string | null }) => Promise<any>;
        prepareInvoice: (documentId: string) => Promise<any>;
    };

    purchaseReturn: {
        create: (payload: any) => Promise<{ header: any; lines: any[] }>;
        update: (payload: any) => Promise<{ header: any; lines: any[] }>;
        getById: (documentId: string) => Promise<{ header: any; lines: any[] }>;
        post: (documentId: string) => Promise<any>;
        cancel: (payload: { documentId: string; reverseDate: string; reason?: string | null }) => Promise<any>;
        getPostingStatus: (documentId: string) => Promise<any>;
    };

    salesInvoice: {
        postAccounting: (invoiceId: string) => Promise<{
            invoiceId: string;
            sourceModule: string;
            sourceType: string;
            sourceId: string;
            documentNo: string;
            status: 'POSTED' | 'ALREADY_POSTED';
            journalId: string;
            journalNo: string;
            sourceVersion: number;
        }>;
        reverseAccounting: (payload: {
            invoiceId: string;
            reverseDate: string;
            reason?: string | null;
        }) => Promise<{
            invoiceId: string;
            sourceModule: string;
            sourceType: string;
            sourceId: string;
            documentNo: string;
            status: 'REVERSED' | 'ALREADY_REVERSED';
            originalJournalId: string;
            reversalJournalId: string;
            reversalJournalNo: string;
        }>;
        getPostingStatus: (invoiceId: string) => Promise<{
            invoiceId: string;
            sourceModule: string;
            sourceType: string;
            sourceId: string;
            documentNo: string | null;
            invoiceStatus: string;
            sourceVersion: number;
            isPosted: boolean;
            isReversed: boolean;
            journalId: string | null;
            journalNo: string | null;
            journalStatus: string | null;
            reversalJournalId: string | null;
            reversalJournalNo: string | null;
        }>;
    };

    purchaseInvoice: {
        postAccounting: (invoiceId: string) => Promise<{
            invoiceId: string;
            sourceModule: string;
            sourceType: string;
            sourceId: string;
            documentNo: string;
            status: 'POSTED' | 'ALREADY_POSTED';
            journalId: string;
            journalNo: string;
            sourceVersion: number;
        }>;
        reverseAccounting: (payload: {
            invoiceId: string;
            reverseDate: string;
            reason?: string | null;
        }) => Promise<{
            invoiceId: string;
            sourceModule: string;
            sourceType: string;
            sourceId: string;
            documentNo: string;
            status: 'REVERSED' | 'ALREADY_REVERSED';
            originalJournalId: string;
            reversalJournalId: string;
            reversalJournalNo: string;
        }>;
        getPostingStatus: (invoiceId: string) => Promise<{
            invoiceId: string;
            sourceModule: string;
            sourceType: string;
            sourceId: string;
            documentNo: string | null;
            invoiceStatus: string;
            sourceVersion: number;
            isPosted: boolean;
            isReversed: boolean;
            journalId: string | null;
            journalNo: string | null;
            journalStatus: string | null;
            reversalJournalId: string | null;
            reversalJournalNo: string | null;
        }>;
    };

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
        }) => Promise<{
            header: {
                id: string;
                companyId: string;
                branchId: string;
                docType: 'GOODS_RECEIPT' | 'GOODS_ISSUE' | 'STOCK_TRANSFER' | 'STOCK_ADJUSTMENT';
                docNo: string;
                docDate: string;
                status: 'DRAFT' | 'POSTED' | 'CANCELLED';
                warehouseId: string | null;
                toWarehouseId: string | null;
                referenceNo: string | null;
                remarks: string | null;
                currencyCode: string;
                currencyRate: number;
                createdBy: string;
                approvedBy: string | null;
                version: number;
                journalId: string | null;
                reversalJournalId: string | null;
                postedAt: string | null;
                postedBy: string | null;
                reversedAt: string | null;
                reversedBy: string | null;
                stockPostedAt: string | null;
                stockReversedAt: string | null;
                createdAt: string;
                updatedAt: string;
            };
            lines: Array<{
                id: string;
                documentId: string;
                lineNo: number;
                itemId: string;
                fromWarehouseId: string | null;
                toWarehouseId: string | null;
                qty: number;
                unitCost: number;
                totalCost: number;
                projectId: string | null;
                costCenterId: string | null;
                partnerId: string | null;
                expenseTypeId: string | null;
                vehicleId: string | null;
                remarks: string | null;
                adjustmentDirection: 'IN' | 'OUT' | null;
                createdAt: string;
                updatedAt: string;
            }>;
        }>;
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
        }) => Promise<{
            header: any;
            lines: any[];
        }>;
        getById: (documentId: string) => Promise<{
            header: any;
            lines: any[];
        }>;
        post: (documentId: string) => Promise<{
            documentId: string;
            sourceModule: string;
            sourceType: 'GOODS_RECEIPT' | 'GOODS_ISSUE' | 'STOCK_TRANSFER' | 'STOCK_ADJUSTMENT';
            sourceId: string;
            documentNo: string;
            status: 'POSTED' | 'ALREADY_POSTED';
            sourceVersion: number;
            journalId: string | null;
            journalNo: string | null;
            financialPosted: boolean;
            stockPosted: boolean;
        }>;
        reverse: (payload: {
            documentId: string;
            reverseDate: string;
            reason?: string | null;
        }) => Promise<{
            documentId: string;
            sourceModule: string;
            sourceType: 'GOODS_RECEIPT' | 'GOODS_ISSUE' | 'STOCK_TRANSFER' | 'STOCK_ADJUSTMENT';
            sourceId: string;
            documentNo: string;
            status: 'REVERSED' | 'ALREADY_REVERSED';
            originalJournalId: string | null;
            reversalJournalId: string | null;
            reversalJournalNo: string | null;
            stockReversed: boolean;
        }>;
        getPostingStatus: (documentId: string) => Promise<{
            documentId: string;
            docType: 'GOODS_RECEIPT' | 'GOODS_ISSUE' | 'STOCK_TRANSFER' | 'STOCK_ADJUSTMENT';
            docNo: string | null;
            documentStatus: 'DRAFT' | 'POSTED' | 'CANCELLED';
            sourceVersion: number;
            isStockPosted: boolean;
            isStockReversed: boolean;
            isFinancialPosted: boolean;
            isFinancialReversed: boolean;
            journalId: string | null;
            journalNo: string | null;
            reversalJournalId: string | null;
            reversalJournalNo: string | null;
            postedAt: string | null;
            reversedAt: string | null;
        }>;
    };

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
        }) => Promise<{
            header: any;
            lines: any[];
            cheque: any;
        }>;
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
        }) => Promise<{
            header: any;
            lines: any[];
            cheque: any;
        }>;
        getById: (documentId: string) => Promise<{
            header: any;
            lines: any[];
            cheque: any;
        }>;
        post: (documentId: string) => Promise<{
            documentId: string;
            sourceModule: string;
            sourceType: 'CASH_RECEIPT' | 'CASH_PAYMENT' | 'BANK_RECEIPT' | 'BANK_PAYMENT' | 'CHEQUE_RECEIPT' | 'CHEQUE_PAYMENT';
            sourceId: string;
            documentNo: string;
            status: 'POSTED' | 'ALREADY_POSTED';
            sourceVersion: number;
            journalId: string;
            journalNo: string;
            chequeId: string | null;
        }>;
        reverse: (payload: {
            documentId: string;
            reverseDate: string;
            reason?: string | null;
        }) => Promise<{
            documentId: string;
            sourceModule: string;
            sourceType: 'CASH_RECEIPT' | 'CASH_PAYMENT' | 'BANK_RECEIPT' | 'BANK_PAYMENT' | 'CHEQUE_RECEIPT' | 'CHEQUE_PAYMENT';
            sourceId: string;
            documentNo: string;
            status: 'REVERSED' | 'ALREADY_REVERSED';
            originalJournalId: string;
            reversalJournalId: string;
            reversalJournalNo: string;
            chequeId: string | null;
        }>;
        getPostingStatus: (documentId: string) => Promise<{
            documentId: string;
            docType: 'CASH_RECEIPT' | 'CASH_PAYMENT' | 'BANK_RECEIPT' | 'BANK_PAYMENT' | 'CHEQUE_RECEIPT' | 'CHEQUE_PAYMENT';
            docNo: string | null;
            documentStatus: 'DRAFT' | 'POSTED' | 'CANCELLED';
            sourceVersion: number;
            isFinancialPosted: boolean;
            isFinancialReversed: boolean;
            journalId: string | null;
            journalNo: string | null;
            reversalJournalId: string | null;
            reversalJournalNo: string | null;
            postedAt: string | null;
            reversedAt: string | null;
            chequeId: string | null;
            chequeNo: string | null;
            chequeStatus: 'IN_SAFE' | 'DEPOSITED' | 'CLEARED' | 'RETURNED' | 'CANCELLED' | 'ISSUED_PENDING' | 'ISSUED_CLEARED' | null;
        }>;
    };

    treasuryCheque: {
        deposit: (payload: {
            chequeId: string;
            bankAccountId: string;
            date: string;
            reason?: string | null;
        }) => Promise<any>;
        clearReceived: (payload: {
            chequeId: string;
            date: string;
            reason?: string | null;
        }) => Promise<any>;
        returnReceived: (payload: {
            chequeId: string;
            date: string;
            reason?: string | null;
        }) => Promise<any>;
        clearIssued: (payload: {
            chequeId: string;
            date: string;
            reason?: string | null;
        }) => Promise<any>;
        cancel: (payload: {
            chequeId: string;
            date: string;
            reason?: string | null;
        }) => Promise<any>;
    };

    purchaseInvoices: {
        list: (params: any) => Promise<any>;
        get: (id: string) => Promise<any>;
        createDraft: (userId?: string) => Promise<any>;
        save: (params: any) => Promise<any>;
        validate: (id: string) => Promise<any>;
        postOrSubmit: (params: any) => Promise<any>;
        reopenRejected: (params: any) => Promise<any>;
        void: (params: { id: string; userId?: string }) => Promise<any>;
        searchSuppliers: (search: string) => Promise<any[]>;
        searchCustomers: (search: string) => Promise<any[]>;
        searchItems: (search: string) => Promise<any[]>;
    };

    stockTransfers: {
        list: (params: any) => Promise<any>;
        get: (id: string) => Promise<any>;
        createDraft: (userId?: string) => Promise<any>;
        save: (params: any) => Promise<any>;
        validate: (id: string) => Promise<any>;
        postOrSubmit: (params: any) => Promise<any>;
        reopenRejected: (params: any) => Promise<any>;
        void: (params: { id: string; userId?: string }) => Promise<any>;
        searchItems: (search: string) => Promise<any[]>;
    };

    journalVouchers: {
        list: (params: any) => Promise<any>;
        get: (id: string) => Promise<any>;
        createDraft: (userId?: string) => Promise<any>;
        save: (params: any) => Promise<any>;
        validate: (id: string) => Promise<any>;
        postOrSubmit: (params: any) => Promise<any>;
        reopenRejected: (params: any) => Promise<any>;
        void: (params: { id: string; userId?: string }) => Promise<any>;
        searchAccounts: (search: string) => Promise<any[]>;
    };

    journals: {
        createDraft: () => Promise<any>;
        save: (data: any) => Promise<any>;
        get: (id: string) => Promise<any>;
        list: (cursor?: any) => Promise<any>;
        post: (id: string) => Promise<any>;
    };

    dispatch: {
        update: (id: string | null, payload: any) => Promise<any>;
        postToPending: (id: string) => Promise<any>;
        invoiceFromDispatch: (id: string) => Promise<any>;
    };

    purchasing: {
        getPurchaseRequests: (filters?: any) => Promise<any[]>;
        getPurchaseRequest: (id: string) => Promise<any>;
        createRequest: (data: any) => Promise<any>;
        updateRequest: (data: any) => Promise<any>;
        postPurchaseRequest: (id: string) => Promise<any>;
        postRequest: (id: string, userId: string) => Promise<any>;
        approvePurchaseRequest: (id: string) => Promise<any>;
        rejectPurchaseRequest: (id: string, reason?: string) => Promise<any>;
        approveRequest: (id: string, userId: string) => Promise<{ success: boolean, status: string }>;
        rejectRequest: (id: string, userId: string, reason?: string) => Promise<{ success: boolean, status: string }>;

        getPurchaseOrders: (filters?: any) => Promise<any[]>;
        getPurchaseOrder: (id: string) => Promise<any>;
        createOrder: (data: any) => Promise<any>;
        updateOrder: (data: any) => Promise<any>;
        postPurchaseOrder: (id: string) => Promise<any>;
        postOrder: (id: string) => Promise<any>;
        approvePurchaseOrder: (id: string) => Promise<any>;
        rejectPurchaseOrder: (id: string, reason?: string) => Promise<any>;
    };

    fixedAssets: {
        list: () => Promise<any[]>;
        get: (id: string) => Promise<any>;
        create: (data: any) => Promise<any>;
        update: (id: string, data: any) => Promise<any>;
        delete: (id: string) => Promise<any>;
        calcDepreciation: (id: string) => Promise<{ yearly: string; monthly: string }>;
        postDepreciation: (id: string, amount: number, date: string) => Promise<any>;
        getSchedule: (id: string) => Promise<any[]>;
    };

    bom: {
        create: (payload: any) => Promise<any>;
        update: (payload: any) => Promise<any>;
        getById: (id: string) => Promise<any>;
        getDefaultForItem: (itemId: string, asOfDate?: string | null) => Promise<any>;
        setDefault: (id: string) => Promise<any>;
        confirm: (id: string) => Promise<any>;
        cancel: (id: string) => Promise<any>;
    };

    routing: {
        create: (payload: any) => Promise<any>;
        update: (payload: any) => Promise<any>;
        getById: (id: string) => Promise<any>;
        getDefaultForItem: (itemId: string) => Promise<any>;
        setDefault: (id: string) => Promise<any>;
        confirm: (id: string) => Promise<any>;
        cancel: (id: string) => Promise<any>;
    };

    productionOrder: {
        create: (payload: any) => Promise<any>;
        createFromBom: (payload: any) => Promise<any>;
        update: (payload: any) => Promise<any>;
        getById: (id: string) => Promise<any>;
        release: (id: string) => Promise<any>;
        cancel: (id: string) => Promise<any>;
        getStatusSummary: (id: string) => Promise<any>;
        getCostSummary: (id: string) => Promise<any>;
    };

    productionIssue: {
        create: (payload: any) => Promise<any>;
        getById: (id: string) => Promise<any>;
        post: (payload: { issueId: string; allowOverIssue?: boolean | null }) => Promise<any>;
        cancel: (payload: { issueId: string; reverseDate: string; reason?: string | null }) => Promise<any>;
    };

    productionReceipt: {
        create: (payload: any) => Promise<any>;
        getById: (id: string) => Promise<any>;
        post: (payload: { receiptId: string; allowOverReceipt?: boolean | null }) => Promise<any>;
        cancel: (payload: { receiptId: string; reverseDate: string; reason?: string | null }) => Promise<any>;
    };

    customer: {
        create: (payload: any) => Promise<any>;
        update: (payload: any) => Promise<any>;
        getById: (id: string) => Promise<any>;
        list: (payload?: any) => Promise<any>;
        setActive: (payload: { id: string; isActive: boolean }) => Promise<any>;
        getContacts: (customerId: string) => Promise<any>;
        saveContact: (payload: any) => Promise<any>;
        getAddresses: (customerId: string) => Promise<any>;
        saveAddress: (payload: any) => Promise<any>;
        getCreditProfile: (customerId: string) => Promise<any>;
        saveCreditProfile: (payload: any) => Promise<any>;
        evaluateCredit: (payload: any) => Promise<any>;
        placeHold: (payload: any) => Promise<any>;
        releaseHold: (payload: any) => Promise<any>;
        getExposure: (payload: any) => Promise<any>;
        getStatement: (payload: any) => Promise<any>;
        getAging: (payload: any) => Promise<any>;
        getTimeline: (payload: any) => Promise<any>;
    };

    customerFollowUp: {
        create: (payload: any) => Promise<any>;
        update: (payload: any) => Promise<any>;
        getByCustomer: (customerId: string, includeClosed?: boolean) => Promise<any>;
        markDone: (payload: any) => Promise<any>;
        cancel: (payload: any) => Promise<any>;
    };

    vendor: {
        create: (payload: any) => Promise<any>;
        update: (payload: any) => Promise<any>;
        getById: (id: string) => Promise<any>;
        list: (payload?: any) => Promise<any>;
        setActive: (payload: { id: string; isActive: boolean }) => Promise<any>;
        getContacts: (vendorId: string) => Promise<any>;
        saveContact: (payload: any) => Promise<any>;
        getAddresses: (vendorId: string) => Promise<any>;
        saveAddress: (payload: any) => Promise<any>;
        getPaymentProfile: (vendorId: string) => Promise<any>;
        savePaymentProfile: (payload: any) => Promise<any>;
        evaluatePaymentControl: (payload: any) => Promise<any>;
        placeHold: (payload: any) => Promise<any>;
        releaseHold: (payload: any) => Promise<any>;
        getExposure: (payload: any) => Promise<any>;
        getStatement: (payload: any) => Promise<any>;
        getAging: (payload: any) => Promise<any>;
        getTimeline: (payload: any) => Promise<any>;
    };

    vendorFollowUp: {
        create: (payload: any) => Promise<any>;
        update: (payload: any) => Promise<any>;
        getByVendor: (vendorId: string, includeClosed?: boolean) => Promise<any>;
        markDone: (payload: any) => Promise<any>;
        cancel: (payload: any) => Promise<any>;
    };

    manufacturing: {
        getWorkCenters: () => Promise<any>;
        saveWorkCenter: (data: any) => Promise<any>;
        deleteWorkCenter: (id: string) => Promise<any>;
        getMachines: () => Promise<any>;
        saveMachine: (data: any) => Promise<any>;
        deleteMachine: (id: string) => Promise<any>;
        getBOMs: () => Promise<any>;
        createBOM: (header: any, lines: any[]) => Promise<any>;
        updateBOM: (id: string, header: any, lines: any[]) => Promise<any>;
        getBOM: (id: string) => Promise<any>;
        saveRouting: (header: any, ops: any[]) => Promise<any>;
        getRoutings: (bomId: string) => Promise<any>;
        getOrders: () => Promise<any>;
        createOrder: (payload: any) => Promise<any>;
        getOrder: (id: string) => Promise<any>;
        updateOrderStatus: (id: string, status: string) => Promise<any>;
        executeOrder: (id: string, qty: number, date: string) => Promise<any>;
        releaseOrder: (id: string) => Promise<any>;
        getOrderStatusSummary: (id: string) => Promise<any>;
        getJobCards: (filters?: any) => Promise<any>;
        startJob: (data: any) => Promise<any>;
        stopJob: (id: string, data: any) => Promise<any>;
        getQCTests: () => Promise<any>;
        saveQCTest: (data: any) => Promise<any>;
        getInspections: (filters?: any) => Promise<any>;
        saveInspection: (data: any) => Promise<any>;
        getMaintenanceRequests: (filters?: any) => Promise<any>;
        saveMaintenanceRequest: (data: any) => Promise<any>;
        getWIPReport: () => Promise<any>;
    };

    security: {
        getMyPermissions: () => Promise<string[]>;
        getMySnapshot: () => Promise<any>;
        getSnapshot: () => Promise<any>;
        refreshSnapshot: () => Promise<any>;
        refreshPermissions: () => Promise<any>;
        getAuthContext: () => Promise<{
            userId: string;
            companyId: string;
            branchId: string;
            companyAclVersion: number;
            branchAclVersion: number;
        }>;
        getCapabilityCatalog: () => Promise<any>;
        getRoleAssignments: (roleId: string, scope?: { companyId?: string; branchId?: string }) => Promise<any>;
        saveRoleAssignments: (data: any) => Promise<{ success: boolean; version: number }>;
    };

    permissions: {
        getSnapshot: () => Promise<any>;
        refreshSnapshot: () => Promise<any>;
    };

    audit: {
        list: (payload: {
            branchId?: string;
            userId?: string;
            entityType?: string;
            entityId?: string;
            docType?: string;
            docId?: string;
            eventType?: string;
            limit?: number;
            cursor?: { createdAt: string; id: string } | null;
        }) => Promise<{
            rows: Array<{
                id: string;
                companyId: string;
                branchId: string | null;
                userId: string;
                sessionId: string | null;
                entityType: string;
                entityId: string;
                docType: string | null;
                docId: string | null;
                eventType: string;
                correlationId: string | null;
                ipcid: string | null;
                summaryI18nKey: string | null;
                meta: Record<string, unknown> | null;
                createdAt: string;
                fieldChanges: Array<{
                    id: string;
                    fieldPath: string;
                    oldValue: unknown;
                    newValue: unknown;
                }>;
            }>;
            nextCursor: { createdAt: string; id: string } | null;
        }>;
        record: (payload: any) => Promise<{ id: string; duplicate: boolean }>;
    };

    views: {
        list: (screenKey: string) => Promise<any[]>;
        save: (payload: any) => Promise<any>;
        apply: (payload: any) => Promise<{
            screenKey: string;
            rows: any[];
            total: number;
            pageSize: number;
            offset: number;
            applied: {
                filters: any[];
                columns: any[];
                sort: any[];
            };
            summary?: Record<string, any>;
        }>;
        setDefault: (viewId: string) => Promise<any>;
        delete: (viewId: string) => Promise<{ success: boolean; viewId: string }>;
    };

    financialPlatform: {
        startCloseCycle: (period: string) => Promise<any>;
        startConsolidation: (data: any) => Promise<any>;
        upsertCashPosition: (data: any) => Promise<any>;
        createPaymentRun: (data: any) => Promise<any>;
        submitRiskAssessment: (data: any) => Promise<any>;
        createRevenueContract: (data: any) => Promise<any>;
        runRevenueRecognition: (data: any) => Promise<any>;
        postCarbonEntry: (data: any) => Promise<any>;
        runAnalyticsForecast: (data: any) => Promise<any>;
        getExecutiveSnapshot: () => Promise<any>;
    };

    runtimeLicense: {
        getStatus: (companyId?: string) => Promise<any>;
        setExtraSeats: (extraSeats: number, companyId?: string) => Promise<any>;
        heartbeat: () => Promise<{ success: boolean }>;
    };

    attachments: {
        startUpload: (data: any) => Promise<any>;
        uploadChunk: (data: any) => Promise<any>;
        completeUpload: (sessionId: string) => Promise<any>;
        abortUpload: (sessionId: string) => Promise<{ success: boolean }>;
        getQuota: () => Promise<any>;
        updateTier: (tier: 'BASE_5GB' | 'EXT_10GB') => Promise<any>;
        addAddon: (addonGb: 10 | 15 | 25) => Promise<any>;
        listFiles: (entityName: string, entityId: string) => Promise<any[]>;
        deleteFile: (fileId: string) => Promise<{ success: boolean }>;
    };

    print: {
        preview: () => Promise<{ success: boolean }>;
        getPrinters: () => Promise<any[]>;
        toPDF: (filename: string) => Promise<Buffer>;
    };
}

declare global {
    interface Window {
        electronAPI: ElectronAPI;
    }
}
