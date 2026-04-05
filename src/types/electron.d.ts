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

    // Partner
    partner: {
        getPartners: (type?: string) => Promise<any[]>;
        getPartner: (id: string) => Promise<any>;
    };

    // Journal
    journal: {
        getNextVoucherNo: (prefix: string) => Promise<string>;
    };

    // HR
    hr: {
        getEmployees: () => Promise<any[]>;
    };
}

declare global {
    interface Window {
        electronAPI: ElectronAPI;
    }
}
