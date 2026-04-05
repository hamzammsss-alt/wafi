import React from 'react';
import { AnalysisCodesPage } from '../pages/definitions/AnalysisCodesPage';
import { CloseYear } from '@/pages/system/CloseYear';
import { BackupRestore } from '../pages/settings/BackupRestore';
import { SystemMaintenance } from '../pages/system/Maintenance';
import AuditLogs from '../pages/system/AuditLogs';
import { CompanyProfile } from '../pages/settings/CompanyProfile';
import { Branches } from '../pages/settings/Branches';
import { Settings } from '../pages/Settings';
import { HelpPages } from '../pages/help/HelpPages';
import Roles from '../pages/system/Roles';
import Users from '../pages/system/Users';
import { ChangePassword } from '@/pages/system/ChangePassword';
import { Logout } from '@/pages/system/Logout';
import Login from '../pages/system/Login';
import { Currencies } from '../pages/definitions/financial/Currencies';
import { Dashboard } from '../pages/Dashboard';
import { ExpenseTypes } from '../pages/definitions/financial/ExpenseTypes';
import { CostCenters } from '../pages/definitions/financial/CostCenters';
import { Taxes } from '../pages/definitions/financial/Taxes';
import { PaymentMethods } from '../pages/definitions/financial/PaymentMethods';
import { ReceiptVoucher } from '../pages/treasury/operations/ReceiptVoucher';
import { ReceiptVoucherList } from '../pages/treasury/operations/ReceiptVoucherList';
import { PaymentVoucher } from '../pages/treasury/operations/PaymentVoucher';
import { PaymentVoucherList } from '../pages/treasury/operations/PaymentVoucherList';
import { BanksPage } from '../pages/definitions/financial/BanksPage';



import { PayrollVoucher } from '../pages/treasury/operations/PayrollVoucher';
import { ChequesIn } from '../pages/treasury/cheques/ChequesIn';
import { ChequesOut } from '../pages/treasury/cheques/ChequesOut';
import { ChequeEndorsement } from '../pages/treasury/cheques/ChequeEndorsement';
import { MaturityCalculator } from '../pages/treasury/cheques/MaturityCalculator';
import { BankDeposit } from '../pages/banking/operations/BankDeposit';
import { BankTransfer } from '../pages/banking/operations/BankTransfer';
import { BankEntries } from '../pages/banking/operations/BankEntries';
import { BankReconciliation } from '../pages/banking/reconciliation/BankReconciliation';
import { BankReconciliationPage } from '../pages/treasury/operations/BankReconciliationPage';
import { AutoReconciliationPage } from '../pages/treasury/operations/AutoReconciliationPage';
import { OurAccountsPage } from '../pages/banking/OurAccountsPage';

import { BOM } from '../pages/manufacturing/settings/BOM';
import { Costs } from '../pages/manufacturing/settings/Costs';
import { ProductionOrder } from '../pages/manufacturing/operations/ProductionOrder';
import { MaterialIssue } from '../pages/manufacturing/operations/MaterialIssue';
import { ProductReceipt } from '../pages/manufacturing/operations/ProductReceipt';
import WorkCentersPage from '../pages/manufacturing/WorkCentersPage';
import RoutingPage from '../pages/manufacturing/engineering/RoutingPage';
import { CostCalculation } from '../pages/manufacturing/operations/CostCalculation';
import JobCardsPage from '../pages/manufacturing/operations/JobCardsPage';
import QualityPage from '../pages/manufacturing/quality/QualityPage';
import MaintenancePage from '../pages/manufacturing/quality/MaintenancePage';
import WIPDashboard from '../pages/manufacturing/reports/WIPDashboard';


import { UnitsPage } from '../pages/definitions/inventory/UnitsPage';
import { CategoriesPage } from '../pages/definitions/inventory/CategoriesPage';
import { BrandsPage } from '../pages/definitions/inventory/BrandsPage';
import { WarehousesPage } from '../pages/definitions/inventory/WarehousesPage';

import { CustomerTypesPage } from '../pages/definitions/partners/CustomerTypesPage';
import { VendorTypesPage } from '../pages/definitions/partners/VendorTypesPage';
import { RegionsPage } from '../pages/definitions/partners/RegionsPage';
import { SalesRepsPage } from '../pages/definitions/partners/SalesRepsPage';
import { CustomerCard } from '../pages/definitions/CustomerCard';
import { SupplierCard } from '../pages/definitions/SupplierCard';
import { PartnerForm } from '../pages/definitions/partners/PartnerForm'; // Unified
import { AssetCategories } from '../pages/definitions/assets/AssetCategories';
import { DriversPage } from '../pages/definitions/logistics/DriversPage';
import { VehiclesPage } from '../pages/definitions/logistics/VehiclesPage';



import ItemMaster from '../pages/inventory/ItemMaster';
import { BarcodeLabels } from '../pages/inventory/BarcodeLabels';
import { PriceUpdate } from '../pages/inventory/PriceUpdate';
import { Promotions } from '../pages/inventory/Promotions';
import { StockIn, StockOut, Transfer } from '../pages/inventory/StockMovements';
import { Assembly } from '../pages/inventory/Assembly';
import { StocktakeSheets } from '../pages/inventory/StocktakeSheets';
import { StockTake } from '../pages/inventory/StockTake';
import { ClosePeriod } from '../pages/inventory/ClosePeriod';
import { StockTransactions } from '../pages/inventory/StockTransactions';
import InternalOrderPage from '../pages/inventory/InternalOrderPage';
import DispatchPage from '../pages/inventory/DispatchPage';
import ReceiptPage from '../pages/inventory/ReceiptPage';
import SuppliesRequestPage from '../pages/inventory/SuppliesRequestPage';
import StockAdjustmentPage from '../pages/inventory/StockAdjustmentPage';

// Purchases & Import
// Purchasing & Import
import { GoodsReceipt, PurchaseReturn } from '../pages/purchases/PurchasingCycle';
import GoodsReceiptList from '../pages/purchases/GoodsReceiptList';
import { PurchaseRequestList } from '../pages/purchases/requests/PurchaseRequestList';
import { PurchaseRequestForm } from '../pages/purchases/requests/PurchaseRequestForm';
import RFQList from '../pages/purchases/rfq/RFQList';
import RFQForm from '../pages/purchases/rfq/RFQForm';
import { PurchaseOrderList } from '../pages/purchases/orders/PurchaseOrderList';
import { PurchaseOrderForm } from '../pages/purchases/orders/PurchaseOrderForm';
import { PurchaseInvoice } from '../pages/purchases/PurchaseInvoice';
import PurchaseInvoiceList from '../pages/purchases/PurchaseInvoiceList';
import { PurchaseReturnList } from '../pages/purchases/returns/PurchaseReturnList';
import { PurchaseReturnForm } from '../pages/purchases/returns/PurchaseReturnForm';
import { LetterOfCredit } from '../pages/import-export/LetterOfCredit';
import ImportInvoice from '../pages/import-export/ImportInvoice';
import ImportInvoiceList from '../pages/import-export/ImportInvoiceList';
import { ClearanceExpenses } from '../pages/import-export/ClearanceExpenses';
import { CostAllocation } from '../pages/import-export/CostAllocation';
import { CloseImportFile } from '../pages/import-export/CloseImportFile';
import ShipmentList from '../pages/import-export/ShipmentList';
import ShipmentForm from '../pages/import-export/ShipmentForm';
import { ReturnInvoice } from '../pages/sales/operations/ReturnInvoice';
import SalesReturnList from '../pages/sales/returns/SalesReturnList';
import ExportShipmentList from '../pages/import-export/ExportShipmentList';
import ExportShipmentForm from '../pages/import-export/ExportShipmentForm';
import ExportInvoiceList from '../pages/import-export/ExportInvoiceList';
import ExportInvoiceForm from '../pages/import-export/ExportInvoiceForm';

import PackingListForm from '../pages/import-export/PackingListForm';
import CertificateOfOriginForm from '../pages/import-export/CertificateOfOriginForm';

import { CategoryHub } from '../pages/CategoryHub';
import { PlaceholderPage } from '../pages/PlaceholderPage';
// MasterDataPages imports removed as they are fully replaced by new pages.
// import { PlaceholderPage } from '../pages/PlaceholderPage'; // Duplicate removed
import { QuotationList } from '../pages/sales/quotations/QuotationList';
import { QuotationForm } from '../pages/sales/quotations/QuotationForm';
import { SalesOrderList } from '../pages/sales/orders/SalesOrderList';
import { SalesOrderForm } from '../pages/sales/orders/SalesOrderForm';

import { ImportDashboard } from '../pages/import-export/ImportDashboard';
import CommercialInvoiceForm from '../pages/import-export/CommercialInvoiceForm';
import ClearanceExpenseForm from '../pages/import-export/ClearanceExpenseForm';
import LandedCostWizard from '../pages/import-export/LandedCostWizard';
import ContainerTrackingDashboard from '../pages/import-export/ContainerTrackingDashboard';
import { ProformaInvoiceList } from '../pages/import-export/ProformaInvoiceList';
import { ProformaInvoiceForm } from '../pages/import-export/ProformaInvoiceForm';
import ShipmentCostReport from '../pages/import-export/ShipmentCostReport';
import CostComparisonReport from '../pages/import-export/CostComparisonReport';
import ContainerArrivalReport from '../pages/import-export/ContainerArrivalReport';
import { InvoiceList } from '../pages/sales/operations/InvoiceList';
import { SalesInvoice } from '../pages/sales/operations/SalesInvoice';
import { POSScreen } from '../pages/pos/POSScreen';
// import { SalesReturn } from '../pages/sales/operations/SalesReturn'; // TODO: Implement
// const SalesReturn = () => <PlaceholderPage title="مردودات مبيعات" category="Sales" />; // Placeholder for now
const SalesReturn = () => <PlaceholderPage title="مردودات مبيعات" category="Sales" />; // Placeholder for now
// Accounting
import { ChartOfAccounts } from '../pages/accounting/master/ChartOfAccounts';
import { OpeningBalances } from '../pages/accounting/master/OpeningBalances';
import { JournalVoucher } from '../pages/accounting/operations/JournalVoucher';
import JournalList from '../pages/accounting/operations/JournalList';
import { RecurringVoucher } from '../pages/accounting/operations/RecurringVoucher';
import { SettlementVoucher } from '../pages/accounting/operations/SettlementVoucher';
import { AssetsRegister } from '../pages/accounting/assets/AssetsRegister';
import { Depreciation } from '../pages/accounting/assets/Depreciation';
import { AssetDisposal } from '../pages/accounting/assets/AssetDisposal';
import { Budgets } from '../pages/accounting/budgets/Budgets';
import { EstimatedBudgets } from '../pages/accounting/budgets/EstimatedBudgets';
import BudgetList from '../pages/gl/BudgetList';
import BudgetForm from '../pages/gl/BudgetForm';
import BudgetReport from '../pages/gl/BudgetReport';

// HR
import OrganizationPage from '../pages/hr/OrganizationPage';
import EmployeeListPage from '../pages/hr/EmployeeListPage';
// import Employees from '../pages/hr/Employees';
// import Attendance from '../pages/hr/Attendance';
// import Payroll from '../pages/hr/Payroll';
import EmployeeProfile from '../pages/hr/EmployeeProfile';
import { lazy } from 'react';
const ProductionLogPage = lazy(() => import('../pages/hr/ProductionLogPage').then(module => ({ default: module.ProductionLogPage })));
const StockEntry = lazy(() => import('../pages/inventory/transactions/StockEntry'));
const StockIssue = lazy(() => import('../pages/inventory/transactions/StockIssue'));
const StockTransfer = lazy(() => import('../pages/inventory/transactions/StockTransfer'));
const AssemblyPage = lazy(() => import('../pages/inventory/transactions/AssemblyPage'));

// --- Tools ---
const LabelPrinting = lazy(() => import('../pages/inventory/tools/LabelPrinting'));
const BulkPricing = lazy(() => import('../pages/inventory/tools/BulkPricing'));

// --- Assets ---
import CommissionCalculation from '../pages/hr/payroll/CommissionCalculation';
import LeaveRequest from '../pages/hr/leaves/LeaveRequest';
import AdvanceRequest from '../pages/hr/payroll/AdvanceRequest';
import EndOfService from '../pages/hr/payroll/EndOfService';



import { LeaveManagement } from '../pages/hr/employees/LeaveManagement';
import AttendanceImport from '../pages/hr/attendance/AttendanceImport';
import ManualAttendance from '../pages/hr/attendance/ManualAttendance';
import ShiftManagementPage from '../pages/hr/attendance/ShiftManagementPage';
import AdvancesLoans from '../pages/hr/payroll/AdvancesLoans';
import SalaryCalculation from '../pages/hr/payroll/SalaryCalculation';
import { Payslips } from '../pages/hr/payroll/Payslips';
import { SalaryEntry } from '../pages/hr/payroll/SalaryEntry';

// import { TrialBalance } from '../pages/reports/financial/TrialBalance';
import { FinancialStatements } from '../pages/reports/financial/FinancialStatements';
import { AccountStatements } from '../pages/reports/financial/AccountStatements';
import { TaxReports } from '../pages/reports/financial/TaxReports';
import AgingReport from '../pages/reports/financial/AgingReport';
import { SalesAnalytics } from '../pages/reports/sales/SalesAnalytics';
import { ProfitabilityReport } from '../pages/reports/sales/ProfitabilityReport';
import { PurchasingAnalysis } from '../pages/reports/purchases/PurchasingAnalysis';
import { ImportReports } from '../pages/reports/purchases/ImportReports';
import { InventoryStatus } from '../pages/reports/inventory/InventoryStatus';
import { InventoryValuationReport } from '../pages/reports/inventory/InventoryValuationReport';
import { ChequeReports } from '../pages/reports/cheques/ChequeReports';
import { Dashboard as ReportsDashboard } from '../pages/reports/Dashboard';
import { PartnerLedger } from '../pages/reports/PartnerLedger';
import { ItemMovement } from '../pages/reports/ItemMovement';
import { TrialBalance as TrialBalanceReport } from '../pages/reports/TrialBalance';
import { SalesInvoicesReport } from '../pages/reports/sales/SalesInvoicesReport';
import PurchasesByVendorReport from '../pages/reports/purchases/PurchasesByVendorReport';


import { CalendarApp } from '../pages/tools/office/CalendarApp';
import { CalculatorApp } from '../pages/tools/office/CalculatorApp';
import { CurrencyConverter } from '../pages/tools/office/CurrencyConverter';
import { NotepadApp } from '../pages/tools/office/NotepadApp';
import { InternalMail } from '../pages/tools/communication/InternalMail';
import { TeamChat } from '../pages/tools/communication/TeamChat';
import { SMSService } from '../pages/tools/communication/SMSService';
import { FormDesigner } from '../pages/tools/designers/FormDesigner';
import { PrintLayoutEditor } from '../pages/tools/designers/PrintLayoutEditor';

import { UserGuide } from '../pages/help/UserGuide';
import { AboutSystem } from '../pages/help/AboutSystem';
import { RemoteSupport } from '../pages/help/RemoteSupport';
import { SupportTicket } from '../pages/help/SupportTicket';

import { AppQuotation } from '../pages/sales/operations/AppQuotation';
import { AppSalesOrder } from '../pages/sales/operations/AppSalesOrder';
import { DeliveryNote } from '../pages/sales/operations/DeliveryNote';
import { TaxInvoice } from '../pages/sales/operations/TaxInvoice';
import { POSInterface } from '../pages/sales/pos/POSInterface';
import { SalesReps } from '../pages/sales/tools/SalesReps';
import { CreditLimitControl } from '../pages/sales/tools/CreditLimitControl';
import { PriceListsPage } from '../pages/definitions/PriceListsPage';
import { TaxesPage } from '../pages/definitions/TaxesPage';

import { AttributesPage } from '../pages/inventory/AttributesPage';
import { RoutePlan } from '../pages/sales/tools/RoutePlan';
import { ToolsDashboard } from '../pages/tools/ToolsDashboard';
import { WorkflowSimulation } from '../pages/tools/WorkflowSimulation';
import PrintPreview from '@/pages/common/PrintPreview';
import { WafiAi } from '../pages/WafiAi';


export interface RouteConfig {
    path: string;
    description: string;
    component: React.ReactNode;
}

// Maps paths to their components
export const APP_ROUTES: RouteConfig[] = [
    { path: '/definitions/attributes', description: 'تعاريف السمات', component: <AttributesPage /> },
    { path: '/definitions/analysis-codes', description: 'رموز التحليل', component: <AnalysisCodesPage /> },
    { path: '/', description: 'الرئيسية', component: <Dashboard /> },
    { path: '/hub/:categorySlug', description: 'القسم الرئيسي', component: <CategoryHub /> },

    // System - Entry/Exit
    { path: '/system/login', description: 'تسجيل الدخول', component: <Login /> }, // Note: Handled specially in App.tsx but good to have ref
    { path: '/system/close-year', description: 'إغلاق السنة المالية', component: <CloseYear /> },
    { path: '/logout', description: 'تسجيل الخروج', component: <Logout /> },

    // System - Database & Security
    { path: '/system/backup', description: 'النسخ الاحتياطي', component: <BackupRestore /> },
    { path: '/system/restore', description: 'استرجاع نسخة', component: <BackupRestore /> }, // Reusing component
    { path: '/system/integrity', description: 'صيانة النظام', component: <SystemMaintenance /> },
    { path: '/system/logs', description: 'سجل الرقابة', component: <AuditLogs /> },

    // System - Settings
    { path: '/settings/company', description: 'ملف الشركة', component: <CompanyProfile /> },
    { path: '/settings/branches', description: 'الفروع', component: <Branches /> },
    { path: '/settings/preferences', description: 'خيارات النظام', component: <Settings /> },

    // System - Users & Permissions
    { path: '/system/users-guide', description: 'دليل المستخدمين', component: <Users /> },
    { path: '/system/roles', description: 'مجموعات الصلاحيات', component: <Roles /> },
    { path: '/system/permissions', description: 'صلاحيات دقيقة', component: <Roles /> }, // Reusing component or specific mode
    { path: '/system/password', description: 'تغيير كلمة المرور', component: <ChangePassword /> },

    // Master Data - Financial
    { path: '/master/currencies', description: 'العملات', component: <Currencies /> },
    { path: '/master/expense-types', description: 'أنواع المصاريف', component: <ExpenseTypes /> },
    { path: '/master/cost-centers', description: 'مراكز التكلفة', component: <CostCenters /> },
    { path: '/master/taxes', description: 'الضرائب', component: <Taxes /> },
    { path: '/master/payment-methods', description: 'طرق الدفع', component: <PaymentMethods /> },
    { path: '/master/banks', description: 'البنوك والحسابات', component: <BanksPage /> },

    // Master Data - Inventory
    { path: '/master/units', description: 'الوحدات', component: <UnitsPage /> },
    { path: '/master/item-categories', description: 'مجموعات الأصناف', component: <CategoriesPage /> },
    { path: '/master/brands', description: 'الماركات', component: <BrandsPage /> },
    { path: '/master/stock-entry', description: 'إدخال مخزني', component: <StockEntry /> },
    { path: '/master/stock-issue', description: 'إخراج مخزني', component: <StockIssue /> },
    { path: '/master/stock-transfer', description: 'نقل مخزني', component: <StockTransfer /> },
    { path: '/master/assembly', description: 'تجميع / تفكيك', component: <AssemblyPage /> },
    { path: '/master/warehouses', description: 'المستودعات', component: <WarehousesPage /> },

    // Tools
    { path: '/inventory/tools/labels', description: 'طباعة الباركود', component: <LabelPrinting /> },
    { path: '/inventory/tools/bulk-pricing', description: 'تعديل الأسعار الجماعي', component: <BulkPricing /> },

    // Master Data - Relationships
    // Master Data - Strategies & Classifications
    { path: '/master/salesmen', description: 'مندوبي المبيعات', component: <SalesRepsPage /> }, // Using new page
    { path: '/master/regions', description: 'المناطق الجغرافية', component: <RegionsPage /> },
    { path: '/master/customer-types', description: 'تصنيف الزبائن', component: <CustomerTypesPage /> },
    { path: '/master/vendor-types', description: 'تصنيف الموردين', component: <VendorTypesPage /> },
    { path: '/master/customer-card', description: 'بطاقة عميل', component: <CustomerCard /> },
    { path: '/master/supplier-card', description: 'بطاقة مورد', component: <SupplierCard /> },
    { path: '/master/partners', description: 'العملاء', component: <PartnerForm /> }, // Unified Route
    { path: '/master/customer-class', description: 'مجموعات الزبائن', component: <CustomerTypesPage /> }, // Legacy alias
    { path: '/master/vendor-class', description: 'مجموعات الموردين', component: <VendorTypesPage /> }, // Legacy alias
    { path: '/master/asset-categories', description: 'مجموعات الأصول الثابتة', component: <AssetCategories /> },
    { path: '/master/vehicles', description: 'السيارات', component: <VehiclesPage /> },
    { path: '/master/drivers', description: 'السائقين', component: <DriversPage /> },

    // Inventory
    { path: '/items', description: 'بطاقة صنف', component: <ItemMaster /> }, // Updated component
    { path: '/items/services', description: 'أصناف خدمية', component: <ItemMaster defaultType="Service" /> },
    { path: '/items/labels', description: 'طباعة الباركود', component: <BarcodeLabels /> },
    { path: '/items/price-update', description: 'تعديل أسعار', component: <PriceUpdate /> },
    { path: '/items/promotions', description: 'العروض', component: <Promotions /> },

    { path: '/inventory/stock-in', description: 'سند إدخال', component: <StockIn /> },
    { path: '/inventory/stock-out', description: 'سند إخراج', component: <StockOut /> },
    { path: '/inventory/transfer', description: 'نقل مخزني', component: <Transfer /> },
    { path: '/inventory/assembly', description: 'تجميع/تفكيك', component: <Assembly /> },
    { path: '/inventory/stock-take-sheets', description: 'أوراق الجرد', component: <StocktakeSheets /> },
    { path: '/inventory/stock-take', description: 'الجرد المخزني', component: <StockTake /> },
    { path: '/inventory/stock-transactions', description: 'حركات المخزون', component: <StockTransactions /> }, // This is "Stock Transactions" / تسوية
    { path: '/inventory/close-period', description: 'إغلاق الفترة', component: <ClosePeriod /> },
    { path: '/inventory/internal-order', description: 'طلبية مستودع داخلية', component: <InternalOrderPage /> },
    { path: '/inventory/dispatch', description: 'سند إرسال', component: <DispatchPage /> },
    { path: '/inventory/receipt', description: 'سند استلام مخزني', component: <ReceiptPage /> },
    { path: '/inventory/supplies-request', description: 'طلب لوازم', component: <SuppliesRequestPage /> },
    { path: '/inventory/adjustment', description: 'تعديل مخزون', component: <StockAdjustmentPage /> },

    // Purchasing
    { path: '/purchasing/requests', description: 'طلبات الشراء', component: <PurchaseRequestList /> },
    { path: '/purchasing/requests/new', description: 'طلب شراء جديد', component: <PurchaseRequestForm /> },
    { path: '/purchasing/requests/:id', description: 'طلب شراء', component: <PurchaseRequestForm /> },
    { path: '/purchasing/request', description: 'طلبات الشراء', component: <PurchaseRequestList /> }, // Legacy alias

    { path: '/purchasing/orders', description: 'طلبيات الشراء', component: <PurchaseOrderList /> },
    { path: '/purchasing/orders/:id', description: 'طلبية شراء', component: <PurchaseOrderForm /> },
    { path: '/purchasing/orders/new', description: 'طلبية شراء جديدة', component: <PurchaseOrderForm /> },
    { path: '/purchasing/order', description: 'طلبيات الشراء', component: <PurchaseOrderList /> }, // Legacy alias

    { path: '/purchasing/grn', description: 'سند استلام', component: <GoodsReceipt /> },
    { path: '/purchasing/invoice', description: 'فاتورة مشتريات', component: <PurchaseInvoice /> },
    { path: '/purchasing/invoice/new', description: 'فاتورة جديدة', component: <PurchaseInvoice /> },

    { path: '/purchasing/returns', description: 'مردودات المشتريات', component: <PurchaseReturnList /> },
    { path: '/purchasing/returns/:id', description: 'مردود مشتريات', component: <PurchaseReturnForm /> },
    { path: '/purchasing/returns/new', description: 'مردود جديد', component: <PurchaseReturnForm /> },
    { path: '/purchasing/return', description: 'مردودات مشتريات', component: <PurchaseReturnList /> }, // Legacy alias

    // TRADE - PURCHASING (New Paths)
    { path: '/trade/purchasing/pr', description: 'طلب احتياج مواد', component: <PurchaseRequestList /> },
    // RFQ Routes
    { path: '/trade/purchasing/rfq', description: 'طلب عرض سعر', component: <RFQList /> },
    { path: '/purchasing/rfq/new', description: 'طلب تسعير جديد', component: <RFQForm /> },
    { path: '/purchasing/rfq/:id', description: 'تفاصيل طلب التسعير', component: <RFQForm /> },
    { path: '/trade/purchasing/lpo', description: 'أمر شراء محلي', component: <PurchaseOrderList /> },
    { path: '/trade/purchasing/receipts', description: 'سندات استلام بضائع', component: <GoodsReceiptList /> },
    { path: '/trade/purchasing/receipt/new', description: 'سند استلام جديد', component: <GoodsReceipt /> },
    { path: '/trade/purchasing/receipt/:id', description: 'تفاصيل سند استلام', component: <GoodsReceipt /> },
    { path: '/trade/purchasing/invoices', description: 'فواتير مشتريات محلية', component: <PurchaseInvoiceList /> },
    { path: '/trade/purchasing/invoice', description: 'فاتورة مشتريات محلية', component: <PurchaseInvoice /> },
    { path: '/trade/purchasing/invoice/:id', description: 'تعديل فاتورة مشتريات', component: <PurchaseInvoice /> },
    { path: '/trade/purchasing/return', description: 'مرتجع مشتريات', component: <PurchaseReturnList /> },

    // TRADE - SALES (New Paths)
    { path: '/trade/sales/quotation', description: 'عرض أسعار', component: <QuotationList /> },
    { path: '/sales/quotations', description: 'عروض أسعار', component: <QuotationList /> },
    { path: '/sales/quotations/new', description: 'عرض سعر جديد', component: <QuotationForm /> },
    { path: '/sales/quotations/:id', description: 'تفاصيل عرض السعر', component: <QuotationForm /> },

    { path: '/sales/orders', description: 'طلبيات المبيعات', component: <SalesOrderList /> },
    { path: '/sales/orders/new', description: 'طلبية مبيعات جديدة', component: <SalesOrderForm /> },
    { path: '/sales/orders/:id', description: 'تفاصيل الطلبية', component: <SalesOrderForm /> },

    { path: '/trade/sales/order', description: 'طلبية مبيعات', component: <SalesOrderList /> },
    { path: '/trade/sales/delivery', description: 'إرسالية مبيعات', component: <DeliveryNote /> },
    { path: '/trade/sales/invoice', description: 'فاتورة مبيعات', component: <InvoiceList /> },
    { path: '/trade/sales/pos', description: 'نقطة بيع', component: <POSScreen /> },

    // Explicit New/Edit Routes (Systematic Fix)
    { path: '/sales/invoices/new', description: 'فاتورة مبيعات جديدة', component: <SalesInvoice /> },
    { path: '/sales/invoices/:id', description: 'تفاصيل الفاتورة', component: <SalesInvoice /> },

    { path: '/trade/sales/return', description: 'مرتجعات المبيعات', component: <SalesReturnList /> },
    { path: '/sales/returns/new', description: 'مرتجع مبيعات جديد', component: <ReturnInvoice /> },
    { path: '/sales/returns/:id', description: 'تفاصيل المرتجع', component: <ReturnInvoice /> },
    { path: '/trade/sales/credit-note', description: 'إشعار دائن/مدين', component: <PlaceholderPage title="إشعار دائن / مدين" category="Sales" /> },

    // TRADE - DISTRIBUTION (New Paths)
    { path: '/trade/distribution/routes', description: 'تخطيط المسارات', component: <RoutePlan /> },
    { path: '/trade/distribution/van-stock', description: 'جرد سيارة المندوب', component: <PlaceholderPage title="جرد سيارة المندوب" category="Distribution" /> },
    { path: '/trade/distribution/settlement', description: 'تصفية المندوب', component: <PlaceholderPage title="تصفية المندوب" category="Distribution" /> },

    // TRADE - AGREEMENTS
    { path: '/trade/agreements/promotions', description: 'قوائم الأسعار والعروض', component: <Promotions /> },


    // Import & Export (New Paths)
    { path: '/import/dashboard', description: 'لوحة استيراد', component: <ImportDashboard /> },

    // Proformas
    { path: '/import/proformas', description: 'الفواتير المبدئية', component: <ProformaInvoiceList /> },
    { path: '/import/proformas/new', description: 'فاتورة مبدئية جديدة', component: <ProformaInvoiceForm /> },
    { path: '/import/proformas/:id', description: 'تفاصيل الفاتورة المبدئية', component: <ProformaInvoiceForm /> },

    { path: '/import/shipments', description: 'ملفات الاستيراد', component: <ShipmentList /> },
    { path: '/import/shipments/new', description: 'ملف استيراد جديد', component: <ShipmentForm /> },
    { path: '/import/shipments/:id', description: 'تفاصيل ملف الاستيراد', component: <ShipmentForm /> },
    { path: '/import/commercial-invoice/:shipmentId/:id', description: 'فاتورة تجارية', component: <CommercialInvoiceForm /> },
    { path: '/import/clearance-expense/:shipmentId/:id', description: 'مصروف تخليص', component: <ClearanceExpenseForm /> },
    { path: '/import/landed-cost/:id', description: 'معالج تكلفة الاستيراد', component: <LandedCostWizard /> },
    { path: '/import/containers-tracking', description: 'تتبع الحاويات', component: <ContainerTrackingDashboard /> },
    { path: '/import/report/shipment-cost/:id', description: 'تحليل تكاليف الشحنة', component: <ShipmentCostReport /> },
    { path: '/import/report/cost-comparison', description: 'مقارنة تكاليف الأصناف', component: <CostComparisonReport /> },
    { path: '/import/report/containers', description: 'تقرير الحاويات والأرضيات', component: <ContainerArrivalReport /> },
    { path: '/import/containers', description: 'تتبع الحاويات (قديم)', component: <PlaceholderPage title="تتبع الحاويات" category="Import" /> },

    { path: '/import/landed-cost', description: 'معالج الكلفة', component: <CostAllocation /> }, // Reuse or create new

    { path: '/import/lc', description: 'ملف الاعتماد', component: <LetterOfCredit /> },
    { path: '/import/invoice', description: 'فواتير الاستيراد', component: <ImportInvoiceList /> },
    { path: '/import/invoice/new', description: 'فاتورة استيراد جديدة', component: <ImportInvoice /> },
    { path: '/import/invoice/:id', description: 'تعديل فاتورة استيراد', component: <ImportInvoice /> },
    { path: '/import/customs', description: 'مصاريف تخليص', component: <ClearanceExpenses /> },
    { path: '/import/allocation', description: 'توزيع المصاريف', component: <CostAllocation /> }, // Legacy
    { path: '/import/close', description: 'إغلاق الملف', component: <CloseImportFile /> },

    // Export Paths
    { path: '/export/shipments', description: 'ملفات التصدير', component: <ExportShipmentList /> },
    { path: '/export/shipments/new', description: 'ملف تصدير جديد', component: <ExportShipmentForm /> },
    { path: '/export/shipments/:id', description: 'تفاصيل ملف التصدير', component: <ExportShipmentForm /> },

    { path: '/export/invoices', description: 'فواتير التصدير', component: <ExportInvoiceList /> },
    { path: '/export/invoice/new', description: 'فاتورة تصدير جديدة', component: <ExportInvoiceForm /> },
    { path: '/export/invoice/:id', description: 'تعديل فاتورة التصدير', component: <ExportInvoiceForm /> },

    { path: '/export/packing-list/:id', description: 'قائمة التعبئة', component: <PackingListForm /> },
    { path: '/export/certificate-origin/:id', description: 'شهادة المنشأ', component: <CertificateOfOriginForm /> },


    // GL
    { path: '/gl/chart-of-accounts', description: 'دليل الحسابات', component: <ChartOfAccounts /> },
    { path: '/gl/opening-balances', description: 'الأرصدة الافتتاحية', component: <OpeningBalances /> },
    { path: '/gl/journal-entries', description: 'سجل القيود اليومية', component: <JournalList /> },
    { path: '/gl/journal-voucher', description: 'سند قيد', component: <JournalVoucher /> },
    { path: '/gl/recurring', description: 'سند تكرار', component: <RecurringVoucher /> },
    { path: '/gl/settlement', description: 'قيود التسوية', component: <SettlementVoucher /> },
    { path: '/gl/budgets', description: 'الموازنات', component: <BudgetList /> },
    { path: '/gl/budgets/new', description: 'موازنة جديدة', component: <BudgetForm /> },
    { path: '/gl/budgets/:id', description: 'تفاصيل الموازنة', component: <BudgetForm /> },
    { path: '/reports/financial/budget-variance', description: 'تقرير انحراف الموازنة', component: <BudgetReport /> },
    { path: '/gl/estimated-budgets', description: 'الموازنات التقديرية', component: <EstimatedBudgets /> },

    // Assets
    { path: '/assets/register', description: 'سجل الأصول', component: <AssetsRegister /> },
    { path: '/assets/depreciation', description: 'الإهلاك', component: <Depreciation /> },
    { path: '/assets/disposal', description: 'استبعاد أصل', component: <AssetDisposal /> },

    // Treasury
    { path: '/treasury/receipt', description: 'سندات القبض', component: <ReceiptVoucherList /> },
    { path: '/treasury/receipt/new', description: 'سند قبض جديد', component: <ReceiptVoucher /> },
    { path: '/treasury/receipt/:id', description: 'تفاصيل سند قبض', component: <ReceiptVoucher /> },
    { path: '/treasury/payment', description: 'سندات الصرف', component: <PaymentVoucherList /> },
    { path: '/treasury/payment/new', description: 'سند صرف جديد', component: <PaymentVoucher /> },
    { path: '/treasury/payment/:id', description: 'تفاصيل سند صرف', component: <PaymentVoucher /> },
    { path: '/treasury/payroll', description: 'صرف رواتب', component: <PayrollVoucher /> }, // Keep as alias or removing if only using strict menu path? Menu uses /treasury/salary-payment
    { path: '/treasury/salary-payment', description: 'صرف رواتب', component: <PayrollVoucher /> },
    { path: '/treasury/checks-in', description: 'الشيكات الواردة', component: <ChequesIn /> },
    { path: '/treasury/checks-out', description: 'الشيكات الصادرة', component: <ChequesOut /> },
    { path: '/treasury/endorsement', description: 'تجيير شيكات', component: <ChequeEndorsement /> },
    { path: '/treasury/check-calculator', description: 'حاسبة استحقاق', component: <MaturityCalculator /> },

    // Banking
    { path: '/banking/our-accounts', description: 'حساباتنا في البنوك', component: <OurAccountsPage /> },
    { path: '/banking/branches', description: 'البنوك والفروع', component: <BanksPage /> },
    { path: '/banking/deposit', description: 'إيداع بنكي', component: <BankDeposit /> },
    { path: '/banking/transfer', description: 'تحويل', component: <BankTransfer /> },
    { path: '/banking/entries', description: 'قيود بنكية', component: <BankEntries /> },
    // { path: '/banking/reconciliation', description: 'مطابقة', component: <BankReconciliation /> }, // Legacy

    // Treasury - Reconciliation
    { path: '/treasury/reconciliation', description: 'تسوية بنكية يدوية', component: <BankReconciliationPage /> },
    { path: '/treasury/auto-reconciliation', description: 'تسوية بنكية آلية', component: <AutoReconciliationPage /> },

    // Manufacturing
    { path: '/manufacturing/work-centers', description: 'مراكز العمل', component: <WorkCentersPage /> },
    { path: '/manufacturing/bom', description: 'وجبات الإنتاج', component: <BOM /> },
    { path: '/manufacturing/routings', description: 'مسارات العمل', component: <RoutingPage /> },
    { path: '/manufacturing/costs', description: 'تعريف التكاليف', component: <Costs /> },
    { path: '/manufacturing/order', description: 'أمر تصنيع', component: <ProductionOrder /> },
    { path: '/manufacturing/issue', description: 'صرف مواد', component: <MaterialIssue /> },
    { path: '/manufacturing/receipt', description: 'استلام منتج', component: <ProductReceipt /> },
    { path: '/manufacturing/job-cards', description: 'بطاقات العمل', component: <JobCardsPage /> },
    { path: '/manufacturing/costing', description: 'احتساب التكلفة', component: <CostCalculation /> },
    { path: '/manufacturing/quality', description: 'مراقبة الجودة', component: <QualityPage /> },
    { path: '/manufacturing/maintenance', description: 'الصيانة', component: <MaintenancePage /> },
    { path: '/manufacturing/wip', description: 'إنتاج تحت التشغيل', component: <WIPDashboard /> },

    // HR
    { path: '/hr/org', description: 'الهيكل التنظيمي', component: <OrganizationPage /> },
    { path: '/hr/employees', description: 'الموظفين', component: <EmployeeListPage /> },
    { path: '/hr/employees/new', description: 'موظف جديد', component: <EmployeeProfile /> },
    { path: '/hr/employees/:id', description: 'ملف الموظف', component: <EmployeeProfile /> },
    { path: '/hr/production-log', description: 'سجل الإنتاج اليومي', component: <ProductionLogPage /> },
    { path: '/hr/commissions', description: 'عمولات المبيعات', component: <CommissionCalculation /> },
    { path: '/hr/requests/leaves', description: 'طلبات الإجازة', component: <LeaveRequest /> },
    { path: '/hr/requests/advances', description: 'طلبات السلف', component: <AdvanceRequest /> },
    { path: '/hr/payroll/eos', description: 'احتساب نهاية الخدمة', component: <EndOfService /> },

    { path: '/hr/shifts', description: 'ادارة الورديات', component: <ShiftManagementPage /> },
    { path: '/hr/attendance', description: 'الحضور والانصراف', component: <ManualAttendance /> },
    { path: '/hr/payroll', description: 'مسير الرواتب', component: <SalaryCalculation /> },
    { path: '/hr/leaves', description: 'ادارة الاجازات', component: <LeaveManagement /> },
    { path: '/hr/attendance-import', description: 'استيراد الدوام', component: <AttendanceImport /> },
    { path: '/hr/loans', description: 'السلف والقروض', component: <AdvancesLoans /> },
    { path: '/hr/payroll-calc', description: 'احتساب الرواتب', component: <SalaryCalculation /> },
    { path: '/hr/payslips', description: 'قسائم الراتب', component: <Payslips /> },
    { path: '/hr/salary-entry', description: 'قيد الرواتب', component: <SalaryEntry /> },

    // Reports - Financial
    { path: '/reports/financial/partner-ledger', description: 'كشف حساب', component: <PartnerLedger /> },
    { path: '/reports/financial/tb-general', description: 'ميزان المراجعة', component: <TrialBalanceReport /> },
    { path: '/reports/financial/tb-levels', description: 'ميزان مستويات', component: <TrialBalanceReport /> }, // Reusing component with different default tab
    { path: '/reports/financial/tb-periods', description: 'ميزان فترات', component: <TrialBalanceReport /> },
    { path: '/reports/financial/pl', description: 'الأرباح والخسائر', component: <FinancialStatements /> },
    { path: '/reports/financial/bs', description: 'الميزانية العمومية', component: <FinancialStatements /> },
    { path: '/reports/financial/soa-detailed', description: 'كشف حساب', component: <AccountStatements /> },
    { path: '/reports/financial/soa-receivables', description: 'كشف ذمم', component: <AccountStatements /> },
    { path: '/reports/financial/soa-interactive', description: 'كشف تفاعلي', component: <AccountStatements /> },
    { path: '/reports/financial/aging', description: 'أعمار الذمم', component: <AgingReport /> },
    { path: '/reports/financial/cashflow', description: 'التدفق النقدي', component: <FinancialStatements /> },
    { path: '/reports/financial/vat', description: 'ضريبة القيمة المضافة', component: <TaxReports /> },
    { path: '/reports/financial/withholding-tax', description: 'خصم المصدر', component: <TaxReports /> },

    // Reports - Sales
    { path: '/reports/sales/analytics', description: 'تحليل المبيعات', component: <SalesAnalytics /> },
    { path: '/reports/sales/profitability', description: 'ربحية الأصناف', component: <ProfitabilityReport /> },
    { path: '/reports/sales/summary', description: 'الملخص التنفيذي', component: <Dashboard /> },
    { path: '/reports/sales/invoices', description: 'فواتير المبيعات', component: <SalesInvoicesReport /> },
    // Reports - Purchasing
    { path: '/reports/purchases/analysis', description: 'تحليل المشتريات', component: <PurchasingAnalysis /> },
    { path: '/reports/purchases/import', description: 'تقارير الاستيراد', component: <ImportReports /> },
    { path: '/reports/purchases/by-vendor', description: 'مشتريات حسب المورد', component: <PurchasesByVendorReport /> },
    { path: '/reports/purchases/by-item', description: 'مشتريات حسب الصنف', component: <PlaceholderPage title="مشتريات حسب الصنف" category="Reports" /> },
    { path: '/reports/purchases/total', description: 'إجمالي المشتريات', component: <PlaceholderPage title="إجمالي المشتريات" category="Reports" /> },
    { path: '/reports/purchases/returns', description: 'مردود المشتريات', component: <PlaceholderPage title="مردود المشتريات" category="Reports" /> },
    { path: '/reports/purchases/invoices', description: 'فواتير المشتريات', component: <PlaceholderPage title="فواتير المشتريات" category="Reports" /> },

    // Reports - Inventory
    { path: '/reports/inventory/movement', description: 'حركة صنف', component: <ItemMovement /> },
    { path: '/reports/inventory/status', description: 'حالة المخزون', component: <InventoryStatus /> },
    { path: '/reports/inventory/items-list', description: 'قائمة الأصناف', component: <PlaceholderPage title="قائمة الأصناف" category="Reports" /> },
    { path: '/reports/inventory/sales-prices', description: 'أسعار البيع', component: <PlaceholderPage title="أسعار البيع" category="Reports" /> },
    { path: '/reports/inventory/cost-prices', description: 'أسعار التكلفة', component: <PlaceholderPage title="أسعار التكلفة" category="Reports" /> },
    { path: '/reports/inventory/balances', description: 'أرصدة الأصناف', component: <PlaceholderPage title="أرصدة الأصناف" category="Reports" /> },


    { path: '/reports/inventory/valuation', description: 'قيمة المخزون', component: <InventoryValuationReport /> },
    { path: '/reports/inventory/shortages', description: 'النواقص', component: <PlaceholderPage title="النواقص" category="Reports" /> },


    // Reports - Cheques
    { path: '/reports/cheques/status', description: 'تقارير الشيكات', component: <ChequeReports /> },
    { path: '/reports/checks/issued', description: 'الشيكات الصادرة', component: <PlaceholderPage title="الشيكات الصادرة" category="Reports" /> },
    { path: '/reports/checks/received', description: 'الشيكات الواردة', component: <PlaceholderPage title="الشيكات الواردة" category="Reports" /> },
    { path: '/reports/checks/history', description: 'حركة شيك', component: <PlaceholderPage title="حركة شيك" category="Reports" /> },

    // Reports - Vendors/Customers
    { path: '/reports/vendors/balances', description: 'أرصدة الموردين', component: <PlaceholderPage title="أرصدة الموردين" category="Reports" /> },
    { path: '/reports/customers/balances', description: 'أرصدة الزبائن', component: <PlaceholderPage title="أرصدة الزبائن" category="Reports" /> },

    // Dashboard
    { path: '/dashboard/analytics', description: 'لوحة التحليلات', component: <Dashboard /> },

    // Tools
    { path: '/tools/dashboard', description: 'الأدوات والمساعدة', component: <ToolsDashboard /> },
    { path: '/tools/calendar', description: 'الرزنامة', component: <CalendarApp /> },
    { path: '/tools/calculator', description: 'الآلة الحاسبة', component: <CalculatorApp /> },
    { path: '/tools/converter', description: 'محول العملات', component: <CurrencyConverter /> },
    { path: '/tools/notepad', description: 'المفكرة', component: <NotepadApp /> },
    { path: '/tools/mail', description: 'البريد', component: <InternalMail /> },
    { path: '/tools/chat', description: 'المحادثة', component: <TeamChat /> },
    { path: '/tools/sms', description: 'SMS', component: <SMSService /> },
    { path: '/tools/designer', description: 'مصمم النماذج', component: <FormDesigner /> },
    { path: '/tools/print-layout', description: 'تعديل الطباعة', component: <PrintLayoutEditor /> },
    { path: '/tools/workflow-simulation', description: 'محاكاة الدورة المستندية', component: <WorkflowSimulation /> },

    // Help
    { path: '/help/guide', description: 'المساعدة', component: <UserGuide /> },
    { path: '/help/about', description: 'حول النظام', component: <AboutSystem /> },
    { path: '/help/remote-support', description: 'المساعدة عن بعد', component: <RemoteSupport /> },
    { path: '/help/support-ticket', description: 'تذكرة دعم', component: <SupportTicket /> },

    // Dashboard
    { path: '/reports/dashboard', description: 'لوحة التحكم', component: <Dashboard /> },
    { path: '/reports/dashboard', description: 'لوحة التحكم', component: <Dashboard /> },

    // WAFI AI
    { path: '/wafi-ai', description: 'المساعد الذكي', component: <WafiAi /> },

    // Print Previews
    { path: '/treasury/print/:type/:id', description: 'معاينة الطباعة', component: <PrintPreview /> },
];

import { matchPath } from 'react-router-dom';

export const getRouteByPath = (path: string) => {
    return APP_ROUTES.find(r => r.path === path || matchPath({ path: r.path, end: true }, path));
};
