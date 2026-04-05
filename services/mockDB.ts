
import { Account, Transaction } from '../types';

interface AccountNode extends Account {
  children?: AccountNode[];
}

const INITIAL_ACCOUNTS: Account[] = [
  { id: '1', account_code: '1', name_ar: 'الأصول', account_type: 'Asset', balance: 50000, is_active: 1, account_level: 1, is_transactional: 0 },
  { id: '2', account_code: '11', name_ar: 'الأصول المتداولة', account_type: 'Asset', parent_id: '1', balance: 25000, is_active: 1, account_level: 2, is_transactional: 0 },
  { id: '3', account_code: '111', name_ar: 'الصندوق', account_type: 'Asset', parent_id: '2', balance: 10000, is_active: 1, account_level: 3, is_transactional: 1 },
  { id: '4', account_code: '112', name_ar: 'البنك', account_type: 'Asset', parent_id: '2', balance: 15000, is_active: 1, account_level: 3, is_transactional: 1 },
  { id: '5', account_code: '2', name_ar: 'الخصوم', account_type: 'Liability', balance: 20000, is_active: 1, account_level: 1, is_transactional: 0 },
  { id: '6', account_code: '3', name_ar: 'حقوق الملكية', account_type: 'Equity', balance: 30000, is_active: 1, account_level: 1, is_transactional: 0 },
];

const INITIAL_TRANSACTIONS: Transaction[] = [
  {
    id: '1',
    type: 'JV',
    ref_no: 'JV-2024-001',
    date: '2024-01-15',
    description: 'قيد افتتاحي',
    lines: [
      { account_id: '3', debit: 10000, credit: 0, description: 'رصيد أول المدة' },
      { account_id: '6', debit: 0, credit: 10000, description: 'رأس مال' }
    ]
  }
];

// Inventory Data
const INITIAL_ITEMS = [
  { id: '1', code: 'ITM001', name_ar: 'لابتوب HP', barcode: '123456789', unit: 'حبة', cost: 2000, price: 2500, warehouse_id: '1', quantity: 10, min_stock: 5, base_unit_id: '1', cost_price: 2000, sale_price: 2500, type: 'Goods', is_active: 1 },
  { id: '2', code: 'ITM002', name_ar: 'ماوس لاسلكي', barcode: '987654321', unit: 'حبة', cost: 50, price: 75, warehouse_id: '1', quantity: 50, min_stock: 10, base_unit_id: '1', cost_price: 50, sale_price: 75, type: 'Goods', is_active: 1 },
];

let accounts = [...INITIAL_ACCOUNTS];
let transactions = [...INITIAL_TRANSACTIONS];
let items: any[] = [...INITIAL_ITEMS];

export const initMockAPI = () => {
  const mockInventory = {
    getItems: async () => items,
    getItemDetails: async (id: string) => items.find(i => i.id === id),
    saveItem: async (item: any) => { items.push({ ...item, id: Date.now().toString() }); return { success: true }; },
    updateItem: async (item: any) => { return { success: true }; },
    createItem: async (item: any) => { items.push({ ...item, id: Date.now().toString() }); return { success: true }; },
    deleteItem: async (id: string) => { return { success: true }; },
    getWarehouses: async () => [],
    createWarehouse: async () => ({ success: true }),
    getUnits: async () => [],
    getBrands: async () => [],
    getCategories: async () => [],
    // Stubs
    getBatches: async () => [],
    getAttributes: async () => [],
    getBins: async () => [],
    inventory: {} // recursion? No.
  };

  const mockPartner = {
    getPartners: async () => [],
    getPartner: async () => ({}),
    savePartner: async () => ({ success: true }),
    deletePartner: async () => ({ success: true }),
    createPartner: async () => "1",
    updatePartner: async () => ({ success: true }),
    getGroups: async () => [],
    getSalesReps: async () => [],
  };

  const mockHR = {
    getEmployees: async () => [],
    saveEmployee: async () => ({ success: true }),
    getDepartments: async () => [],
    getTitles: async () => [],
    // Stubs
  };

  const mockSales = {
    createInvoice: async () => ({ success: true }),
    getInvoices: async () => [],
    getNextInvoiceNo: async () => "INV-001",
  };

  const mockPurchases = {
    createInvoice: async () => ({ success: true }),
    getInvoices: async () => [],
  };

  const mockImport = {
    getShipments: async () => [],
    getShipmentById: async () => ({}),
    getShipmentItems: async () => [],
    getExpenses: async () => [],
    allocateCosts: async () => ({ success: true }),
  };

  // Define the flat API as "any" to avoid strict TS interface checks against the complex electronAPI type
  // This allows us to implement what we need for the mock without 500 lines of placeholders
  const api: any = {
    getAccounts: async () => new Promise(resolve => setTimeout(() => resolve(accounts), 300)),

    saveAccount: async (account: Partial<Account>) => {
      const newAcc = {
        ...account,
        id: account.id || Date.now().toString(),
        balance: 0,
        is_active: 1
      } as Account;
      // Replace if exists
      const existingIdx = accounts.findIndex(a => a.id === newAcc.id);
      if (existingIdx >= 0) accounts[existingIdx] = newAcc;
      else accounts.push(newAcc);
      return { success: true };
    },

    deleteAccount: async (id: string) => {
      accounts = accounts.filter(a => a.id !== id);
      return { success: true };
    },

    getTransactions: async () => new Promise(resolve => setTimeout(() => resolve(transactions), 300)),

    saveTransaction: async (tx: any) => {
      // Validate balance
      const totalDebit = tx.lines.reduce((sum: number, line: any) => sum + Number(line.debit || 0), 0);
      const totalCredit = tx.lines.reduce((sum: number, line: any) => sum + Number(line.credit || 0), 0);

      if (Math.abs(totalDebit - totalCredit) > 0.01) {
        throw new Error('القيد غير متوازن');
      }

      // Generate ref_no
      if (!tx.ref_no) { // Fixed property access
        const count = transactions.filter(t => t.type === tx.type).length;
        tx.ref_no = `${tx.type}-${new Date().getFullYear()}-${String(count + 1).padStart(3, '0')}`;
      }

      const newTx: Transaction = {
        id: Date.now().toString(),
        type: tx.type,
        ref_no: tx.ref_no,
        date: tx.date,
        description: tx.description,
        status: tx.status,
        lines: tx.lines.map((l: any) => ({
          account_id: l.account_id,
          debit: Number(l.debit || 0),
          credit: Number(l.credit || 0),
          description: l.description
        }))
      };

      transactions.push(newTx);
      return { success: true, ref_no: newTx.ref_no };
    },

    getAccountTree: async () => {
      return new Promise(resolve => setTimeout(() => {
        const buildTree = (accounts: Account[], parentId: string | null = null): AccountNode[] => {
          return accounts
            .filter(acc => acc.parent_id === (parentId || undefined) || (parentId === null && !acc.parent_id))
            .map(acc => ({
              ...acc,
              children: buildTree(accounts, acc.id)
            }));
        };
        const tree = buildTree(accounts);
        resolve(tree);
      }, 300));
    },

    getTransactionalAccounts: async () => {
      return new Promise(resolve => setTimeout(() => {
        const transactional = accounts.filter(a => a.is_transactional);
        resolve(transactional);
      }, 200));
    },

    getNextVoucherNo: async (type: string) => {
      return new Promise(resolve => setTimeout(() => {
        const count = transactions.filter(t => t.type === type).length;
        resolve(`${type}-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`);
      }, 200));
    },

    // Namespaced Modules
    inventory: mockInventory,
    partner: mockPartner,
    hr: mockHR,
    sales: mockSales,
    purchase: mockPurchases,
    import: mockImport,

    // Legacy / Flat Accessors (for backward compatibility if needed)
    getItems: mockInventory.getItems,
    addItem: mockInventory.createItem,
    updateItem: mockInventory.updateItem,
    getWarehouses: mockInventory.getWarehouses,

    reseedAccounts: async () => ({ success: true }),
    getDashboardKPIs: async () => ({ cash: 1000, sales: 5000, expenses: 200, lowStock: 1 }),

    // Mocking other APIs minimally
    getCustomers: mockPartner.getPartners,
    addCustomer: mockPartner.savePartner,
    getSuppliers: async () => [],
    saveSalesInvoice: async (inv: any) => ({ success: true, ref_no: 'INV-MOCK' }),
    saveReceiptVoucher: async () => ({ success: true }),
    savePaymentVoucher: async () => ({ success: true }),
    getChecks: async () => [],
    addCheck: async () => ({ success: true }),
    updateCheckStatus: async () => ({ success: true }),
    getBankAccounts: async () => [],
    saveBankDeposit: async () => ({ success: true }),
    saveBankWithdrawal: async () => ({ success: true }),
    getEmployees: mockHR.getEmployees,
    addEmployee: mockHR.saveEmployee,
    saveAttendance: async () => ({ success: true }),
    generatePayroll: async () => ({ success: true }),
    getTrialBalance: async () => ({}),
    getProfitLoss: async () => ({}),
    getBalanceSheet: async () => ({}),
    getInventoryReport: async () => ({}),
    getSalesReport: async () => ({}),

    // System
    system: {
      getSettings: async () => ({}),
      saveSettings: async () => ({}),
    },
    auth: {
      login: async () => ({ success: true }),
      getUsers: async () => [],
    }
  };

  // Safe Assignment
  (window as any).electronAPI = api;
};
