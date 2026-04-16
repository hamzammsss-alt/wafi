
export enum AccountType {
  ASSET = 'Asset',
  LIABILITY = 'Liability',
  EQUITY = 'Equity',
  REVENUE = 'Revenue',
  EXPENSE = 'Expense'
}

export interface Tax {
  id: string;
  name_ar: string;
  name_en?: string;
  rate: number;
  amount?: number;
  is_fixed?: number;
  account_id?: string;
  is_active: number;
}

export interface AnalysisCode {
  id: string;
  code: string;
  name_ar: string;
  name_en?: string;
  parent_id?: string;
  is_active: number;
  children?: AnalysisCode[]; // For tree view
}

export interface Account {
  id: string; // UUID
  account_code: string;
  name_ar: string;
  name_en?: string;
  account_type: string; // Asset, Liability, etc.
  parent_id?: string;
  balance: number;
  is_active?: number;
  account_level?: number;
  is_transactional: number; // 0 or 1
  currency_id?: string;
  currency_code?: string;
  requires_cost_center?: number;
  system_type?: 'BANK' | 'CASH' | 'CUSTOMER' | 'SUPPLIER' | 'EMPLOYEE' | 'NONE';
  children?: Account[];

  // Backward compatibility helpers (optional, or just remove if we update all code)
  code?: string;
  name?: string;
}

export interface TransactionLine {
  id?: string;
  account_id: string;
  account_name?: string; // Helper for UI
  debit: number; // UI still uses number inputs usually, or string
  credit: number;
  description: string;
  cost_center?: string;
  reference_no?: string;
  notes?: string;
  foreign_currency?: string;
  foreign_amount?: number;
  project?: string;
  branch?: string;
  analysis_code?: string;
}

export interface Transaction {
  id?: string;
  type: string;
  voucher_type?: string; // Daily, Opening...
  ref_no: string;
  manual_ref?: string;
  date: string;
  description: string;
  currency?: string;
  exchange_rate?: number;
  status?: 'Posted' | 'Draft' | 'Void';
  lines: TransactionLine[];
  created_at?: string;
  created_by?: string;
  attachments?: string[];
  reverse_date?: string; // For auto-reversal
  total_amount?: number; // Helper
}

export interface AIChatMessage {
  role: 'user' | 'model';
  text: string;
}

// --- Inventory Types ---
export interface Unit {
  id: string; // UUID
  name_ar: string;
  name_en?: string;
  name_he?: string;
  code?: string;
  is_active?: number;
  is_used?: number;
  unit_type?: string;
  parent_unit_id?: string;
  level_no?: number;
  symbol?: string; // e.g. kg, m, pcs
  symbol_ar?: string;
  symbol_en?: string;
  symbol_he?: string;
  multiplier?: number;
  total_factor?: number;
  updated_at?: string;
  is_base?: number;
}

export interface ItemUnit {
  id: string; // UUID
  item_id: string;
  unit_id: string;
  factor: number; // Conversion factor relative to base unit (e.g. 1 Dozen = 12 Pcs)
  barcode?: string;
  sale_price?: number;
}

export interface Brand {
  id: string;
  name_ar: string;
  name_en?: string;
  code?: string; // Added
  description?: string; // Added
  origin_country?: string;
  is_active: number;
}

export interface ItemBatch {
  id: string;
  item_id: string;
  batch_number: string;
  expiry_date?: string;
  manufacturing_date?: string;
  quantity: number;
}

export interface ItemSerial {
  id: string;
  item_id: string;
  serial_number: string;
  status: string;
  current_warehouse_id?: string;
}

export interface ItemPrice {
  id: string;
  price_list_id: string;
  item_id: string;
  unit_id: string;
  price: number;
}


export interface Attribute {
  id: string;
  name_ar: string;
  name_en?: string;
  type?: string;
  values?: AttributeValue[];
}

export interface AttributeValue {
  id: string;
  attribute_id: string;
  value: string;
}

export interface ItemAttribute {
  attribute_id: string;
  value: string;
  attribute_name?: string;
  value_id?: string;
}

export interface Item {
  id: string; // UUID
  code: string;
  barcode?: string;

  // Names
  name_ar: string;
  name_en?: string;
  trade_name?: string;
  name_he?: string;

  // Classification
  category_id?: string;
  brand_id?: string;
  type: 'Goods' | 'Service' | 'Raw Material' | 'Finished Good' | 'Asset'; // Updated enums

  // Units
  base_unit_id: string;
  additional_units?: ItemUnit[];

  // Pricing
  cost_price: number;
  standard_cost?: number;
  costing_method?: 'WEIGHTED_AVG' | 'FIFO' | 'STANDARD';
  sale_price: number; // Base Price
  wholesale_price?: number;
  min_price?: number;
  floor_price?: number;
  prices?: ItemPrice[]; // For Price Lists

  // Stock Control
  min_stock?: number;
  max_stock?: number;
  reorder_point?: number;

  // Settings & Flags
  is_active: number;
  tax_included?: number;
  tax_type?: string;

  has_expiry?: number; // 0 or 1
  has_serial?: number; // 0 or 1
  shelf_life_days?: number;
  default_warehouse_id?: string;

  description?: string;
  image_url?: string;

  // New Fields
  production_line?: string;
  default_supplier_id?: string;
  warranty_info?: string;
  grade?: string;
  inventory_account_id?: string;
  sales_account_id?: string;
  cogs_account_id?: string;

  // Computed/Joined
  current_stock?: number;
  base_unit_name?: string;
  brand_name?: string;
  category_name?: string;
  default_supplier_name?: string;
  default_warehouse_name?: string;
  inventory_account_name?: string;
  sales_account_name?: string;
  cogs_account_name?: string;

  // Relations
  alternatives?: ItemAlternative[];
  kit_items?: {
    child_item_id: string;
    child_item_name?: string; // helpers
    quantity: number;
  }[];
  attributes?: ItemAttribute[];

}

export interface ItemAlternative {
  item_id: string; // The parent item (usually implicit in context)
  alternative_item_id: string;
  note?: string;
  // Computed for display
  item_name?: string;
  code?: string;
  current_stock?: number;
}

export interface BusinessPartner {
  id: string;
  code: string;
  name_ar: string;
  name_en?: string;
  name_he?: string;
  type: 'CUSTOMER' | 'SUPPLIER' | 'BOTH' | 'EMPLOYEE';
  phone?: string;
  mobile?: string;
  email?: string;
  address?: string;
  address_en?: string;
  address_he?: string;
  city?: string;
  street_ar?: string;
  street_en?: string;
  street_he?: string;
  country_code?: string;
  timezone?: string;
  po_box?: string;
  gps_location?: string;
  tax_number?: string;

  linked_account_id?: string;
  credit_limit?: number;
  payment_term_days?: number;

  // New Fields
  region_id?: string;
  group_id?: string;
  sales_rep_id?: string;
  website?: string;
  price_list_id?: string;
  parent_partner_id?: string;
  partner_language?: string;
  registration_date?: string;
  birth_date?: string;
  nationality?: string;
  is_company?: number | boolean;
  print_prices_on_docs?: number | boolean;
  print_balance_on_docs?: number | boolean;
  membership_id?: string;
  sector_id?: string;
  customer_type_id?: string | number;
  vendor_type_id?: string | number;
  notes?: string;
  contact_methods_json?: string | any[];
  bank_accounts_json?: string | any[];

  customer_enabled?: number | boolean;
  customer_name_ar?: string;
  customer_name_en?: string;
  customer_name_he?: string;
  customer_code?: string;
  customer_currency_id?: string;
  customer_account_id?: string;
  customer_discount_percent?: number;
  customer_previous_balance?: number;
  customer_tax_mode?: string;
  customer_end_deal_date?: string;
  customer_item_rules_json?: string | any[];

  credit_policy_id?: string;
  max_credit_limit?: number;
  max_checks_limit?: number;
  personal_check_limit?: number;
  facilitation_days?: number;
  facilitation_from_month_end?: number | boolean;
  allow_over_limit?: number | boolean;
  overdue_unpaid_days?: number;
  validation_type?: string;
  include_collection_checks?: number | boolean;
  include_sales_orders_posting?: number | boolean;
  allowed_check_due_days?: number;

  supplier_enabled?: number | boolean;
  supplier_name_ar?: string;
  supplier_name_en?: string;
  supplier_name_he?: string;
  supplier_price_list_id?: string;
  supplier_currency_id?: string;
  supplier_account_id?: string;
  supplier_tax_mode?: string;
  supplier_items_only?: number | boolean;
  supplier_item_rules_json?: string | any[];
  supplier_source_discount_percent?: number;
  supplier_source_discount_until?: string;

  employee_enabled?: number | boolean;
  employee_title_ar?: string;
  employee_title_en?: string;
  employee_title_he?: string;
  employee_gender?: string;
  employee_doc_type?: string;
  employee_id_number?: string;
  employee_is_resident?: number | boolean;
  employee_social_status?: string;
  employee_account_id?: string;
  employee_currency_id?: string;
  employee_children_count?: number;
  employee_students_count?: number;
  employee_dependents_count?: number;
  employee_education?: string;
  employee_group?: string;
  employee_number?: string;
  employee_hire_date?: string;
  employee_end_date?: string;

  // HR Specific (Unified Model)
  basic_salary?: number;
  job_title_id?: string;
  job_title_name?: string; // UI Helper
  department_id?: string;
  department_name?: string; // UI Helper

  is_active: number;
}

export interface SalesRep {
  id: string;
  name_ar: string;
  name_en?: string;
  phone?: string;
  commission_rate?: number;
  target_amount?: number;
  is_active: number;
}

export interface CustomerType {
  id: string | number;
  name_ar: string;
  name_en?: string;
  code?: string;
  discount?: number;
  description?: string;
  is_active?: number | boolean;
}

export interface VendorType {
  id: string | number;
  name_ar: string;
  name_en?: string;
  code?: string;
  description?: string;
  is_active?: number | boolean;
}

export interface Region {
  id: string;
  name_ar: string;
  name_en?: string;
  code?: string;
  parent_id?: string;
  is_active?: number | boolean;
}

export interface JournalHeader {
  id: string;
  voucher_no: string;
  voucher_type: string;
  date: string; // YYYY-MM-DD
  reference_no?: string;
  description?: string;
  status: 'DRAFT' | 'POSTED' | 'VOID';
  branch_id: string;
  currency_id: string;
  exchange_rate: number;
  created_by?: string;
}

export interface JournalLine {
  id?: string;
  transaction_id?: string;
  header_id?: string;
  account_id: string;
  debit: number;
  credit: number;
  line_description?: string;
  cost_center_id?: string;
  fc_amount?: number;
  fc_currency_id?: string;
  fc_exchange_rate?: number;
}

// Inventory
export interface Category {
  id: string;
  name: string;
  parent_id?: string;
  icon?: string;
}



export interface ExportShipment {
  id: string;
  shipment_no: string;
  customer_id: string;
  invoice_id?: string;
  destination_country?: string;
  port_of_loading?: string;
  port_of_discharge?: string;
  loading_date?: string;
  driver_details?: string;
  vehicle_no?: string;
  notes?: string;
  items?: any[]; // Joined from invoice
}

export interface ProformaInvoice {
  id: string;
  proforma_no: string;
  supplier_id: string;
  supplier_name?: string; // Helper
  date: string;
  expiry_date?: string;
  currency_id: string;
  exchange_rate?: number;
  payment_terms?: string;
  delivery_terms?: string;
  status: 'DRAFT' | 'APPROVED' | 'CONVERTED' | 'CANCELLED';
  notes?: string;

  lines?: ProformaInvoiceLine[];
}

export interface ProformaInvoiceLine {
  id: string;
  proforma_id: string;
  item_id?: string;
  item_name: string;
  description?: string;
  quantity: number;
  unit_id?: string;
  unit_price: number;
  total_price: number;
  expected_weight_kg?: number;
}

// ============================================================================
// COMMERCIAL INVOICES (فواتير الشراء الخارجية)
// ============================================================================

export interface CommercialInvoice {
  id: string;
  invoice_no: string;
  shipment_id: string;
  supplier_id: string;
  supplier_name?: string; // Helper
  invoice_date: string;
  currency_id: string;
  exchange_rate: number;
  total_amount: number;
  payment_terms?: string;
  incoterms?: string; // FOB, CIF, EXW, etc.
  status: 'DRAFT' | 'POSTED' | 'PAID';
  notes?: string;
  created_at?: string;
  updated_at?: string;
  created_by?: string;

  lines?: CommercialInvoiceLine[];
}

export interface CommercialInvoiceLine {
  id: string;
  invoice_id: string;
  item_id?: string;
  item_name?: string; // Helper
  description: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  weight_kg?: number;
  volume_cbm?: number;
  hs_code?: string; // Harmonized System Code
}

// ============================================================================
// CLEARANCE EXPENSES (مصاريف التخليص)
// ============================================================================

export type ExpenseType =
  | 'CUSTOMS'
  | 'TAX'
  | 'TRANSPORT'
  | 'INSURANCE'
  | 'BROKER_FEE'
  | 'PORT_FEES'
  | 'STORAGE'
  | 'INSPECTION'
  | 'OTHER';

export type AllocationMethod = 'VALUE' | 'WEIGHT' | 'VOLUME' | 'MANUAL';

export interface ClearanceExpense {
  id: string;
  expense_no: string;
  shipment_id: string;
  expense_date: string;
  expense_type: ExpenseType;
  description?: string;
  amount: number;
  currency_id: string;
  exchange_rate: number;
  amount_base_currency?: number;
  allocation_method: AllocationMethod;
  is_allocated: boolean;
  payment_method?: string;
  paid_to?: string;
  payment_reference?: string;
  journal_entry_id?: string;
  created_at?: string;
  updated_at?: string;
  created_by?: string;
}

// ============================================================================
// SHIPMENT DOCUMENTS (المستندات المرفقة)
// ============================================================================

export type DocumentType =
  | 'BILL_OF_LADING'
  | 'COMMERCIAL_INVOICE'
  | 'CERTIFICATE_OF_ORIGIN'
  | 'PACKING_LIST'
  | 'INSURANCE_CERTIFICATE'
  | 'CUSTOMS_DECLARATION'
  | 'OTHER';

export interface ShipmentDocument {
  id: string;
  shipment_id: string;
  document_type: DocumentType;
  file_name: string;
  file_path: string;
  file_size?: number;
  mime_type?: string;
  upload_date?: string;
  uploaded_by?: string;
  notes?: string;
}

// ============================================================================
// LANDED COST ALLOCATION (توزيع التكاليف)
// ============================================================================

export interface LandedCostAllocation {
  id: string;
  shipment_id: string;
  allocation_date: string;
  allocation_method: AllocationMethod;
  total_goods_value: number;
  total_expenses: number;
  total_landed_cost: number;
  journal_entry_id?: string;
  performed_by?: string;
  notes?: string;

  details?: LandedCostAllocationDetail[];
}

export interface LandedCostAllocationDetail {
  id: string;
  allocation_id: string;
  item_id: string;
  item_name?: string; // Helper
  quantity: number;
  fob_value: number;
  weight_kg?: number;
  volume_cbm?: number;
  allocation_percentage: number;
  allocated_expense: number;
  old_cost: number;
  new_cost: number;
}

// Helper interface for the wizard
export interface LandedCostPreview {
  shipment_id: string;
  total_goods_value: number;
  total_expenses: number;
  total_landed_cost: number;
  items: Array<{
    item_id: string;
    item_name: string;
    quantity: number;
    fob_value: number;
    weight_kg?: number;
    volume_cbm?: number;
    allocation_percentage: number;
    allocated_expense: number;
    old_cost: number;
    new_cost: number;
  }>;
}

// ============================================================================
// EXPORT FUNCTIONALITY (التصدير)
// ============================================================================

export interface ExportInvoice {
  id: string;
  invoice_no: string;
  customer_id: string;
  customer_name?: string; // Helper
  invoice_date: string;
  currency_id: string;
  exchange_rate: number;
  total_amount: number;
  payment_terms?: string;
  incoterms?: string;
  destination_country?: string;
  destination_port?: string;
  shipment_id?: string;
  status: 'DRAFT' | 'POSTED' | 'CANCELLED';
  is_zero_rated: number; // 1 or 0
  notes?: string;
  created_at?: string;
  updated_at?: string;
  created_by?: string;

  lines?: ExportInvoiceLine[];
}

export interface ExportInvoiceLine {
  id: string;
  invoice_id: string;
  item_id?: string;
  item_name?: string; // Helper
  description: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  weight_kg?: number;
  volume_cbm?: number;
  hs_code?: string;
}

export interface PackingList {
  id: string;
  packing_list_no: string;
  export_invoice_id: string;
  packing_date: string;
  total_packages: number;
  total_gross_weight: number;
  total_net_weight: number;
  total_volume: number;
  notes?: string;
  created_at?: string;

  items?: PackingListItem[];
}

export interface PackingListItem {
  id: string;
  packing_list_id: string;
  package_no: string;
  item_id?: string;
  item_name?: string; // Helper
  description?: string;
  quantity: number;
  gross_weight: number;
  net_weight: number;
  dimensions?: string; // e.g., "100x50x30 cm"
}

// ============================================================================
// UPDATED IMPORT SHIPMENT (with new fields)
// ============================================================================

export interface ImportShipment {
  id: string;
  shipment_no: string;
  proforma_id?: string;
  proforma_no?: string; // Helper
  supplier_id: string;
  supplier_name?: string; // Helper
  reference_number?: string;
  origin_country?: string;
  port_of_arrival?: string;
  port_of_loading?: string;
  status: 'Open' | 'Shipped' | 'Arrived' | 'Cleared' | 'Closed';
  currency_id: string;
  exchange_rate: number;
  opening_date: string;
  arrival_date_est?: string;
  actual_arrival_date?: string;
  notes?: string;

  // LC Information
  lc_number?: string;
  lc_bank?: string;
  lc_opening_date?: string;

  // Shipping Details
  shipping_line?: string;
  bl_number?: string; // Bill of Lading

  // Demurrage
  demurrage_free_days?: number;

  // Cost Allocation
  is_cost_allocated: boolean;
  cost_allocation_date?: string;

  // Relations
  containers?: Container[];
  commercial_invoices?: CommercialInvoice[];
  clearance_expenses?: ClearanceExpense[];
  documents?: ShipmentDocument[];
}

export interface Container {
  id: string;
  shipment_id: string;
  shipment_no?: string; // Helper
  container_no: string;
  size: '20ft' | '40ft' | '40hc' | 'lcl';
  seal_no?: string;
  bill_of_lading?: string;
  gross_weight?: number;
  cbm?: number;

  // Tracking
  eta?: string; // Expected Time of Arrival
  ata?: string; // Actual Time of Arrival
  demurrage_alert_date?: string;
  container_status: 'IN_TRANSIT' | 'ARRIVED' | 'CLEARED' | 'DELIVERED';
  tracking_url?: string;
  notes?: string;
}

export interface Warehouse {
  id: string; // UUID
  code: string;
  name_ar: string;
  name_en?: string;
  name?: string; // Helper or legacy
  address?: string;
  location?: string;
  phone?: string;
  manager_id?: string;
  is_active: number;
}

export interface Bin {
  id: string;
  warehouse_id: string;
  code: string;
  name?: string;
  type?: string;
  max_weight?: number;
  is_active: number;
}

// Global Electron API mock interface
declare global {
  interface Window {
    electronAPI: {
      getAccounts: () => Promise<Account[]>;
      saveAccount: (account: Partial<Account>) => Promise<any>;
      deleteAccount: (id: string) => Promise<any>;
      getTree: () => Promise<Account[]>;
      getAccountTree: () => Promise<any[]>;
      getAccountById: (id: string) => Promise<Account>;
      getTransactionalAccounts: () => Promise<Account[]>;
      accountingFoundation: {
        listAccounts: (includeInactive?: boolean) => Promise<any[]>;
        getAccountTree: (includeInactive?: boolean) => Promise<any[]>;
        getPostableAccounts: () => Promise<any[]>;
        saveAccount: (payload: any) => Promise<any>;
        deleteAccount: (accountId: string) => Promise<any>;
        activateAccount: (accountId: string) => Promise<any>;
        deactivateAccount: (accountId: string) => Promise<any>;
        listFinancialDefinitions: (includeInactive?: boolean) => Promise<any[]>;
        saveFinancialDefinition: (payload: any) => Promise<any>;
        deleteFinancialDefinition: (definitionId: string) => Promise<any>;
        resolveAccounts: (payload: any) => Promise<any>;
        debugResolveAccounts: (payload: any) => Promise<any>;
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
          }) => Promise<any[]>;
          listFlat: (query?: {
            includeInactive?: boolean;
            search?: string;
            category?: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'COST_OF_SALES' | 'EXPENSE' | 'OTHER_INCOME' | 'OTHER_EXPENSE' | 'CONTROL' | 'ALL';
            posting?: 'ALL' | 'POSTING' | 'HEADER';
          }) => Promise<any[]>;
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
          }) => Promise<any>;
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
          }) => Promise<any>;
          findByCode: (code: string) => Promise<any | null>;
        };
        financialDefinitions: {
          listByOwner: (payload: {
            companyId: string;
            ownerType: 'COMPANY' | 'BRANCH' | 'ITEM' | 'ITEM_GROUP' | 'WAREHOUSE' | 'PARTNER' | 'TAX_PROFILE' | 'DOCUMENT_TYPE_DEFAULT';
            ownerId: string;
            includeInactive?: boolean;
          }) => Promise<any[]>;
          upsert: (payload: any) => Promise<any>;
          bulkSaveForOwner: (payload: any) => Promise<any>;
          deactivate: (payload: { companyId: string; id: string }) => Promise<{ success: boolean }>;
        };
        accountResolution: {
          resolve: (payload: any) => Promise<any>;
          previewSalesInvoice: (payload: any) => Promise<any>;
          previewPurchaseInvoice: (payload: any) => Promise<any>;
        };
      };
      reseedAccounts: () => Promise<{ success: boolean }>;
      getDashboardKPIs: () => Promise<any>;
      getNextVoucherNo: (type: string) => Promise<string>;
      getTransactions: () => Promise<Transaction[]>;
      saveTransaction: (transaction: any) => Promise<any>;


      // Fixed Assets
      getAssets: () => Promise<any[]>;
      saveAsset: (asset: any) => Promise<any>;
      calcDepreciation: (id: string) => Promise<any>;
      postDepreciation: (data: any) => Promise<any>;
      getAssetCategories: () => Promise<any[]>;
      saveAssetCategory: (data: any) => Promise<any>;

      import: {
        // Shipments
        getShipments: (filters: any) => Promise<any[]>;
        getShipmentById: (id: string) => Promise<any>;
        saveShipment: (data: any) => Promise<any>;
        deleteShipment: (id: string) => Promise<any>;

        // Proforma
        getProformas: (filters: any) => Promise<ProformaInvoice[]>;
        getProforma: (id: string) => Promise<ProformaInvoice>;
        saveProforma: (data: any) => Promise<any>;
        deleteProforma: (id: string) => Promise<any>;
        convertProforma: (id: string) => Promise<any>;

        // Containers
        getContainers: (shipmentId: string) => Promise<any[]>;
        saveContainer: (data: any) => Promise<any>;
        deleteContainer: (id: string) => Promise<any>;

        // Invoices
        getAllCommercialInvoices: () => Promise<CommercialInvoice[]>;
        getCommercialInvoices: (shipmentId: string) => Promise<CommercialInvoice[]>;
        getCommercialInvoiceById: (id: string) => Promise<CommercialInvoice>;
        saveCommercialInvoice: (data: any) => Promise<any>;
        deleteCommercialInvoice: (id: string) => Promise<any>;

        // Expenses
        getClearanceExpenses: (shipmentId: string) => Promise<ClearanceExpense[]>;
        getClearanceExpenseById: (id: string) => Promise<ClearanceExpense>;
        saveClearanceExpense: (data: any) => Promise<any>;
        deleteClearanceExpense: (id: string) => Promise<any>;

        // Documents
        getShipmentDocuments: (shipmentId: string) => Promise<ShipmentDocument[]>;

        // Cost Allocation Helpers
        getShipmentItems: (id: string) => Promise<any[]>;
        getExpenses: (id: string) => Promise<any[]>;
        allocateCosts: (id: string, data: any[], method: string) => Promise<{ success: boolean }>;
        saveShipmentDocument: (data: any) => Promise<any>;
        deleteShipmentDocument: (id: string) => Promise<any>;

        // Landed Cost
        calculateLandedCost: (shipmentId: string, method: string) => Promise<LandedCostPreview>;
        applyLandedCost: (shipmentId: string, allocations: any[]) => Promise<any>;
        getLandedCostHistory: (shipmentId: string) => Promise<LandedCostAllocation[]>;
        getShipmentCostBreakdown: (shipmentId: string) => Promise<any>;

        // Dashboard/Tracking
        getContainersNearDemurrage: (days?: number) => Promise<Container[]>;
        getDashboardStats: () => Promise<any>;
        getItemCostComparison: (itemId: string) => Promise<any[]>;
      };

      export: {
        // Shipments (Legacy)
        getShipments: (filters: any) => Promise<ExportShipment[]>;
        getShipment: (id: string) => Promise<ExportShipment>;
        saveShipment: (data: any) => Promise<any>;
        deleteShipment: (id: string) => Promise<any>;

        // Invoices
        getInvoices: (filters: any) => Promise<ExportInvoice[]>;
        getInvoice: (id: string) => Promise<ExportInvoice>;
        saveInvoice: (data: any) => Promise<any>;
        deleteInvoice: (id: string) => Promise<any>;

        // Packing Lists
        getPackingLists: (invoiceId: string) => Promise<PackingList[]>;
        getPackingList: (id: string) => Promise<PackingList>;
        savePackingList: (data: any) => Promise<any>;
        deletePackingList: (id: string) => Promise<any>;

        // Certificate of Origin
        generateCOO: (invoiceId: string) => Promise<any>;
      };


      // Inventory
      inventory: {
        getItems: () => Promise<Item[]>;
        getItemDetails: (id: string) => Promise<Item>; // Added
        saveItem: (item: any) => Promise<any>;
        updateItem: (item: any) => Promise<any>; // Added
        bulkUpdateItems: (updates: any[]) => Promise<any>;
        createItem: (item: any) => Promise<any>; // Added
        deleteItem: (id: string) => Promise<any>;

        getStockTakes: () => Promise<any[]>;
        getStockTake: (id: string) => Promise<any>;
        createStockTake: (data: any) => Promise<any>;
        updateStockTakeItem: (id: string, qty: number) => Promise<any>;
        approveStockTake: (id: string) => Promise<any>;

        getLastClosingDate: () => Promise<string | null>;
        closePeriod: (date: string) => Promise<any>;

        getUnits: () => Promise<Unit[]>;
        createUnit: (unit: Partial<Unit>) => Promise<any>;
        deleteUnit: (id: string) => Promise<any>;
        seedDefaultUnits: () => Promise<{ inserted: number; skipped: number; total: number }>;

        getBrands: () => Promise<Brand[]>;
        createBrand: (brand: Partial<Brand>) => Promise<any>;
        updateBrand: (brand: Partial<Brand>) => Promise<any>; // Added
        deleteBrand: (id: string) => Promise<any>; // Added

        getCategories: () => Promise<any[]>;
        createCategory: (cat: any) => Promise<any>;
        updateCategory: (cat: any) => Promise<any>;
        deleteCategory: (id: string) => Promise<any>;

        getBatches: (itemId: string) => Promise<ItemBatch[]>;
        createBatch: (batch: Partial<ItemBatch>) => Promise<any>;

        // Attributes
        getAttributes: () => Promise<Attribute[]>;
        createAttribute: (attr: Partial<Attribute>) => Promise<Attribute>;
        getAttributeValues: (attrId: string) => Promise<AttributeValue[]>;
        createAttributeValue: (attrId: string, value: string) => Promise<AttributeValue>;

        // Warehouse
        getWarehouses: () => Promise<Warehouse[]>;
        createWarehouse: (wh: Partial<Warehouse>) => Promise<any>;
        updateWarehouse: (wh: any) => Promise<any>;
        deleteWarehouse: (id: string) => Promise<any>;

        updateStock: (data: any) => Promise<any>;


        transferRequest: (data: any) => Promise<any>; // Added
        getTransferRequests: (filters?: any) => Promise<any[]>;
        getTransferRequest: (id: string) => Promise<any>;

        getBins: (warehouseId: string) => Promise<Bin[]>;
        createBin: (bin: any) => Promise<any>;
        deleteBin: (id: string) => Promise<any>;

        createStockDocument: (doc: any) => Promise<any>; // Added
        receiveTransfer: (data: any) => Promise<any>; // Added
        getGoodsReceipts: () => Promise<any[]>;
        getDispatches: () => Promise<any[]>;
        getStockDocument: (id: string) => Promise<any>;
        getKit: (itemId: string) => Promise<any[]>;
        createAssembly: (data: any) => Promise<any>;
      };


      // Partners
      partner: {
        getPartners: (type?: string) => Promise<BusinessPartner[]>;
        getPartner: (id: string) => Promise<BusinessPartner>;
        savePartner: (partner: Partial<BusinessPartner>) => Promise<any>;
        deletePartner: (id: string) => Promise<any>;
        createPartner: (data: any) => Promise<string>;
        updatePartner: (data: any) => Promise<{ success: boolean }>;

        // New Master Data Methods
        getCustomerTypes: () => Promise<CustomerType[]>;
        saveCustomerType: (data: any) => Promise<{ success: boolean }>;
        deleteCustomerType: (id: string | number) => Promise<{ success: boolean }>;

        getVendorTypes: () => Promise<VendorType[]>;
        saveVendorType: (data: any) => Promise<{ success: boolean }>;
        deleteVendorType: (id: string | number) => Promise<{ success: boolean }>;

        getContactTypes: () => Promise<any[]>;

        getMemberships: () => Promise<any[]>;
        saveMembership: (data: any) => Promise<{ success: boolean }>;
        deleteMembership: (id: string) => Promise<{ success: boolean }>;

        getSectors: () => Promise<any[]>;
        saveSector: (data: any) => Promise<{ success: boolean }>;
        deleteSector: (id: string) => Promise<{ success: boolean }>;

        getCreditPolicies: () => Promise<any[]>;
        saveCreditPolicy: (data: any) => Promise<{ success: boolean }>;
        deleteCreditPolicy: (id: string) => Promise<{ success: boolean }>;

        getRegions: () => Promise<Region[]>;
        saveRegion: (data: any) => Promise<{ success: boolean }>;
        createRegion: (data: any) => Promise<{ success: boolean }>;
        updateRegion: (data: any) => Promise<{ success: boolean }>;
        deleteRegion: (id: string) => Promise<{ success: boolean }>;

        getGroups: () => Promise<any[]>;
        getSalesReps: () => Promise<SalesRep[]>;
        saveSalesRep: (data: Partial<SalesRep>) => Promise<any>;
        deleteSalesRep: (id: string) => Promise<any>;
      };

      currency: {
        getCurrencies: () => Promise<any[]>;
        getBaseCurrency: () => Promise<any>;
        createCurrency: (currency: any) => Promise<any>;
        updateCurrency: (currency: any) => Promise<any>;
        deleteCurrency: (id: string) => Promise<any>;
        updateRates: () => Promise<boolean>;
        getCurrencyHistory: (code: string, days?: number) => Promise<{ date: string; rate: number }[]>;
      };

      branch: {
        getBranches: () => Promise<any[]>;
        saveBranch: (branch: any) => Promise<any>;
        deleteBranch: (id: string) => Promise<any>;
      };

      sales: {
        createInvoice: (invoice: any) => Promise<any>;
        getNextInvoiceNo: () => Promise<string>;
        createQuotation: (data: any) => Promise<any>;
        getQuotations: () => Promise<any[]>;
        getQuotation: (id: string) => Promise<any>;
        createOrder: (data: any) => Promise<any>;
        getOrders: () => Promise<any[]>;
        getOrder: (id: string) => Promise<any>;
        updateQuotationStatus: (id: string, status: string) => Promise<any>;
        deleteQuotation: (id: string) => Promise<any>;
        updateOrderStatus: (id: string, status: string) => Promise<any>;
        deleteOrder: (id: string) => Promise<any>;
        getInvoices: () => Promise<any[]>;
        createReturn: (data: any) => Promise<any>;
        getReturns: () => Promise<any[]>;
        getReturn: (id: string) => Promise<any>;
      };

      production: {
        getLogs: (date: string) => Promise<any[]>;
        saveLog: (data: any) => Promise<any>;
        deleteLog: (id: string) => Promise<any>;
      };
      commission: {
        get: (month: number, year: number) => Promise<any[]>;
        save: (data: any[]) => Promise<any>;
      };
      budget: {
        getAll: () => Promise<any[]>;
        getById: (id: string) => Promise<any>;
        create: (data: any) => Promise<any>;
        updateStatus: (id: string, status: string) => Promise<any>;
        getReport: (id: string, period?: number) => Promise<any[]>;
      };

      budgets: {
        list: () => Promise<any[]>;
        get: (id: string) => Promise<any>;
        create: (data: any) => Promise<any>;
        updateStatus: (id: string, status: string, userId: string) => Promise<any>;
        getVsActual: (id: string, period?: number) => Promise<any>;
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

      getWarehouses: () => Promise<any[]>;

      saveSalesInvoice: (invoice: any) => Promise<any>; // Legacy/Flat backup

      purchase: {
        createInvoice: (invoice: any) => Promise<any>;
        getNextInvoiceNo: () => Promise<string>;
        createOrder: (data: any) => Promise<any>;
        getOrders: () => Promise<any[]>;
        getOrder: (id: string) => Promise<any>;
        updateOrder: (data: any) => Promise<any>;
        deleteOrder: (id: string) => Promise<any>; // Added
        postOrder: (id: string, userId?: string) => Promise<any>;
        approveOrder: (id: string, userId: string) => Promise<any>;
        rejectOrder: (id: string, userId: string, reason?: string) => Promise<any>;
        getInvoice: (id: string) => Promise<any>;
        getInvoices: () => Promise<any[]>;

        createRequest: (data: any) => Promise<any>;
        getRequests: () => Promise<any[]>;
        getRequest: (id: string) => Promise<any>;
        updateRequest: (data: any) => Promise<any>; // Added
        deleteRequest: (id: string) => Promise<any>;
        postRequest: (id: string, userId?: string) => Promise<any>;
        approveRequest: (id: string, userId: string) => Promise<any>;
        rejectRequest: (id: string, userId: string, reason?: string) => Promise<any>;

        createReturn: (data: any) => Promise<any>;
        getReturns: () => Promise<any[]>;
        getReturn: (id: string) => Promise<any>;

        // RFQ
        createRFQ: (data: any) => Promise<any>;
        getRFQs: () => Promise<any[]>;
        getRFQ: (id: string) => Promise<any>;
        updateRFQ: (data: any) => Promise<any>;
      };

      treasury: {
        createReceipt: (data: any) => Promise<any>;
        createPayment: (data: any) => Promise<any>;
        getReceipt: (id: string) => Promise<any>;
        getPayment: (id: string) => Promise<any>;
        getPayments: (filters?: any) => Promise<any[]>;
        getReceipts: (filters?: any) => Promise<any[]>;
      };
      cheques: {
        getCheques: (filters: any) => Promise<any[]>;
        get: (filters: any) => Promise<any[]>;
        updateStatus: (data: { id: string; status: string; date: string; options?: any }) => Promise<any>;
      };

      reports: {
        getPartnerLedger: (filters: { partnerId: string, startDate?: string, endDate?: string }) => Promise<any[]>;
        getItemMovement: (filters: { itemId: string, startDate?: string, endDate?: string }) => Promise<any[]>;
        getTrialBalance: () => Promise<any[]>;
        getInventoryStatus: () => Promise<any>;
        getSalesAnalytics: (range: any) => Promise<any>;
        getProfitability: (range: any) => Promise<any>;
        getPurchasingAnalysis: (range: any) => Promise<any>;
        getPurchasesByVendor: (range: any) => Promise<any>;
        getImportReports: () => Promise<any>;
        getChequesReport: (filters: any) => Promise<any>;
        getAccountStatement: (filters: any) => Promise<any>;
        getAgingReport: () => Promise<any>;
        getTaxReport: (range: any) => Promise<any>;
        getTopCustomers: () => Promise<any[]>;
        getSlowMovingItems: (days: number) => Promise<any[]>;
        getExpiryReport: (days: number) => Promise<any[]>;
      };

      manufacturing: {
        // Work Centers
        getWorkCenters: () => Promise<any[]>;
        saveWorkCenter: (data: any) => Promise<any>;
        deleteWorkCenter: (id: string) => Promise<any>;

        // Machines
        getMachines: () => Promise<any[]>;
        saveMachine: (data: any) => Promise<any>;
        deleteMachine: (id: string) => Promise<any>;

        createBOM: (header: any, lines: any[]) => Promise<any>;
        getBOMs: () => Promise<any[]>;
        getBOM: (id: string) => Promise<any>;

        saveRouting: (header: any, ops: any[]) => Promise<any>;
        getRoutings: (bomId: string) => Promise<any[]>;

        createOrder: (order: any) => Promise<any>;
        getOrders: () => Promise<any[]>;
        updateOrderStatus: (id: string, status: string) => Promise<any>;
        executeOrder: (id: string, qty: number, date: string) => Promise<any>;

        getJobCards: (filters: any) => Promise<any[]>;
        startJob: (data: any) => Promise<any>;
        stopJob: (id: string, data: any) => Promise<any>;
      };

      // Journal
      journal: {
        getNextVoucherNo: (prefix: string) => Promise<string>;
        createEntry: (header: any, lines: any[]) => Promise<{ success: boolean; id: string; voucher_no: string }>;
        getEntry: (id: string) => Promise<any>;
        getEntries: (filters: any) => Promise<any[]>;
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

      // Vouchers & Banking
      saveReceiptVoucher: (voucher: any) => Promise<any>;
      savePaymentVoucher: (voucher: any) => Promise<any>;
      getChecks: () => Promise<any[]>;
      addCheck: (check: any) => Promise<any>;
      updateCheckStatus: (checkId: number, status: string) => Promise<any>;
      getBankAccounts: () => Promise<any[]>;
      saveBankDeposit: (deposit: any) => Promise<any>;
      saveBankWithdrawal: (withdrawal: any) => Promise<any>;
      // HR
      // HR
      getEmployees: () => Promise<any[]>;
      getEmployee: (id: string) => Promise<any>;
      saveEmployee: (employee: any) => Promise<any>;

      getShifts: () => Promise<any[]>;
      saveShift: (shift: any) => Promise<any>;
      getDailyAttendance: (date: string) => Promise<any[]>;

      calculatePayroll: (data: { month: number, year: number }) => Promise<any[]>;
      savePayrollRun: (data: { month: number, year: number, slips: any[] }) => Promise<any>;
      generateSalaryEntry: (data: { month: number, year: number }) => Promise<any>;
      getSlips: (data: { month: number, year: number }) => Promise<any[]>;

      getDepartments: () => Promise<any[]>;
      saveDepartment: (data: any) => Promise<any>;
      deleteDepartment: (id: string) => Promise<any>;

      getJobTitles: () => Promise<any[]>;
      saveJobTitle: (data: any) => Promise<any>;
      deleteJobTitle: (id: string) => Promise<any>;
      // Reports
      getTrialBalance: (fromDate: string, toDate: string) => Promise<any>;
      getProfitLoss: (fromDate: string, toDate: string) => Promise<any>;
      getBalanceSheet: (asOfDate: string) => Promise<any>;
      getInventoryReport: () => Promise<any>;
      getSalesReport: (fromDate: string, toDate: string) => Promise<any>;



      hr: {
        getDepartments: () => Promise<any[]>;
        saveDepartment: (data: any) => Promise<any>;
        deleteDepartment: (id: string) => Promise<any>;
        getTitles: () => Promise<any[]>;
        saveTitle: (data: any) => Promise<any>;
        deleteTitle: (id: string) => Promise<any>;

        getEmployees: () => Promise<any[]>;
        getEmployee: (id: string) => Promise<any>;
        saveEmployee: (data: any) => Promise<any>;
        getNextCode: () => Promise<string>;
        savePhoto: (buffer: ArrayBuffer, name: string) => Promise<{ success: boolean, path: string }>;

        getShifts: () => Promise<any[]>;
        saveShift: (data: any) => Promise<any>;
        importAttendance: (records: any[]) => Promise<any>;
        processAttendance: (date: string) => Promise<any>;
        getDailyAttendance: (date: string) => Promise<any[]>;
        saveDailyAttendance: (data: any) => Promise<any>;

        getLeaveTypes: () => Promise<any[]>;
        saveLeaveType: (data: any) => Promise<any>;
        deleteLeaveType: (id: string) => Promise<any>;
        getLeaveRequests: (filter: any) => Promise<any[]>;
        saveLeaveRequest: (data: any) => Promise<any>;
        updateLeaveStatus: (id: string, status: string, reason?: string) => Promise<any>;
        getEmployeeBalances: (employeeId: string, year: number) => Promise<any[]>;
        getLeaveBalances: (id: string, year: number) => Promise<any[]>;

        saveAdvance: (data: any) => Promise<any>;
        getAdvances: (id: string) => Promise<any[]>;
        generatePayroll: (month: number, year: number) => Promise<any[]>;
        postPayroll: (month: number, year: number, slips: any[]) => Promise<any>;
        getSlips: (month: number, year: number) => Promise<any[]>;
        calculateEOS: (employeeId: string, endDate: string) => Promise<any>;
      };



      // System & Auth
      auth: {
        login: (creds: { username: string, password: string }) => Promise<any>;
        changePassword: (data: any) => Promise<any>;
        getUsers: () => Promise<any[]>;
        saveUser: (user: any) => Promise<any>;
        deleteUser: (id: string) => Promise<any>;
        getRoles: () => Promise<any[]>;
        saveRole: (role: any) => Promise<any>;
        deleteRole: (id: string) => Promise<any>;
        getPermissions: (roleId: string) => Promise<string[]>;
        savePermissions: (data: { roleId: string, permissions: string[] }) => Promise<any>;
        getBranches: () => Promise<any[]>;
        saveBranch: (branch: any) => Promise<any>;
        deleteBranch: (id: string) => Promise<any>;
      };
      system: {
        backupDatabase: () => Promise<any>;
        restoreDatabase: () => Promise<any>;
        checkIntegrity: () => Promise<any>;
        getSettings: () => Promise<any>;
        saveSettings: (settings: any) => Promise<any>;
        getTrialBalance: (params?: any) => Promise<any[]>;
        getDashboardKPIs: () => Promise<{ sales: number, cash: number, checks: number, lowStock: number }>;
        getDashboardCharts: () => Promise<{ cashFlow: any[], topProducts: any[] }>;
        saveLogo: (buffer: ArrayBuffer, name: string) => Promise<{ success: boolean, path: string }>;
        saveImage: (buffer: ArrayBuffer, name: string) => Promise<{ success: boolean, path: string }>;
        getAuditLogs: (filters?: any) => Promise<any[]>;
      };

      dialog: {
        showOpenDialog: (options: any) => Promise<{ canceled: boolean, filePaths: string[] }>;
      };


    }
  }
}
