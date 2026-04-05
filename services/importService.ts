import apiClient from './apiClient';

export interface LCItem {
    id: string;
    name: string;
    qty: number;
    fob_price_fx: number;
    total_fob_fx: number;
    old_cost: number;
}

export interface LCExpense {
    id: string;
    type: string;
    amount: number;
    currency: string;
}

export interface LCFile {
    id: string;
    lc_number: string;
    bank_name: string;
    total_amount_fx: number;
    currency: string;
}

export const ImportService = {
    // Get list of open Letter of Credits (LCs)
    getOpenLCs: async (): Promise<LCFile[]> => {
        try {
            // Refactored to use IPC (Standalone Mode)
            // @ts-ignore
            const lcs = await window.electronAPI.import.getLCs('OPEN');
            return lcs || [];
        } catch (error) {
            console.error('Failed to fetch LCs', error);
            return [];
        }
    },

    // Get items for a specific LC
    getLCItems: async (lcId: string): Promise<LCItem[]> => {
        try {
            // @ts-ignore
            return await window.electronAPI.import.getLCItems(lcId);
        } catch (e) {
            console.error(e);
            return [];
        }
    },

    // Allocate Costs
    allocateCosts: async (lcId: string, expenses: LCExpense[], allocationMethod: string) => {
        // @ts-ignore
        return await window.electronAPI.import.allocateCosts(lcId, expenses, allocationMethod);
    }
};
