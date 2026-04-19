import {
    FileText, ShoppingCart, Truck, Users, BarChart,
    Search, Database, Box, Layers, Archive, MapPin, UserCheck,
    Banknote, Bell, Calculator, Settings,
    Home, BrainCircuit, User, Star, Globe, Tag,
    Clipboard, Calendar, MessageSquare, Anchor, List,
    ArrowLeftRight, Printer, AlertCircle, FileQuestion,
    HelpCircle, Mail, MessageCircle, Smartphone, Sliders, CreditCard,
    Lock, Shield, HardDrive, Key, FileCog, Percent, PieChart, Coins,
    Briefcase, FileCheck, LayoutDashboard, Phone, FolderOpen,
    FileInput, FileOutput, RefreshCw, LogIn, LogOut, Save,
    CheckSquare, Filter, Grip, BookOpen, PenTool, Hash, Server,
    TrendingUp, TrendingDown, PlusCircle, Image, Table, Upload, Monitor,
    FileMinus, FilePlus, StickyNote, Activity, Scale, Receipt, BarChart3,
    Network, Package, AlertTriangle, Clock, Sparkles, GitMerge, Book, BadgeCheck, Building2, ShieldCheck, Wallet
} from 'lucide-react';

// --- TYPE DEFINITIONS ---

export interface MenuItem {
    label: string;
    path?: string; // If it's a link
    icon?: any;    // Lucide Icon
    action?: string; // If it triggers an action (like logout)
    capabilityKey?: string;
    shortcut?: string;
    divider?: boolean; // If it's a separator
    header?: boolean;  // If it's a section header
    subItems?: MenuItem[]; // For nested dropdowns (Strip 1)
}

export interface RibbonGroup {
    label: string; // The group label (e.g. "Accounts", "Receivables")
    items: MenuItem[]; // The buttons inside the group
}

export interface SideMenuSection {
    title: string;
    icon: any;
    capabilityKey?: string;
    items: MenuItem[];
}

// --- STRIP 1: TOP MENU (DROPDOWNS) ---
// This is now the MASTER source of truth. SIDE_MENU will mirror this.

export const TOP_MENU_ITEMS: Record<string, MenuItem[]> = {
    'ملف وإدارة النظام': [
        { header: true, label: 'الدخول والخروج' },
        { label: 'تسجيل الدخول / تبديل المستخدم', icon: UserCheck, path: '/system/login' },
        { label: 'إغلاق السنة المالية', icon: Archive, path: '/system/close-year' },
        { label: 'الخروج من النظام', icon: LogOut, path: '/logout' },
        { divider: true, label: '' },
        { header: true, label: 'قواعد البيانات والأمان' },
        { label: 'التخزين الاحتياطي', icon: Database, path: '/system/backup' },
        { label: 'استرجاع نسخة احتياطية', icon: RefreshCw, path: '/system/restore' },
        { label: 'صيانة وفحص البيانات', icon: Shield, path: '/system/integrity' },
        { label: 'سجل الرقابة', icon: FileText, path: '/system/logs' },
        { divider: true, label: '' },
        { header: true, label: 'إعدادات الشركة والفروع' },
        { label: 'معلومات الشركة', icon: Settings, path: '/settings/company' },
        { label: 'إدارة الفروع والمستودعات', icon: MapPin, path: '/settings/branches' },
        { label: 'خيارات عامة للنظام', icon: Sliders, path: '/settings/preferences' },
        { label: 'إدارة النسخ المتخصصة', icon: ShieldCheck, path: '/settings/edition' },
        { divider: true, label: '' },
        { header: true, label: 'المستخدمين والصلاحيات' },
        { label: 'دليل المستخدمين', icon: Users, path: '/system/users-guide' },
        { label: 'مجموعات الصلاحيات', icon: Key, path: '/system/roles' },
        { label: 'تخصيص صلاحيات دقيقة', icon: Lock, path: '/system/permissions' },
        { label: 'تغيير كلمة المرور', icon: Key, path: '/system/password' },
    ],
    'التعاريف والبطاقات': [
        { header: true, label: 'التعاريف المالية' },
        { label: 'عملات وأسعار الصرف', icon: Banknote, path: '/master/currencies' },
        { label: 'أنواع المصاريف والإيرادات', icon: List, path: '/master/expense-types' },
        { label: 'مراكز التكلفة', icon: Layers, path: '/master/cost-centers' },
        { label: 'الضرائب', icon: Percent, path: '/master/taxes' },
        { label: 'طرق الدفع', icon: CreditCard, path: '/master/payment-methods' },
        { label: 'الصناديق', icon: Wallet, path: '/master/cash-boxes' },
        { divider: true, label: '' },
        { header: true, label: 'تعاريف المخزون' },
        { label: 'الوحدات', icon: Box, path: '/master/units' },
        { label: 'فئات الأصناف', icon: Layers, path: '/master/item-categories' },
        { label: 'العلامات التجارية', icon: Tag, path: '/master/brands' },
        { label: 'قائمة الأصناف', icon: Package, path: '/items' },
        { label: 'مواقع التخزين', icon: MapPin, path: '/master/warehouses' },
        { divider: true, label: '' },
        { header: true, label: 'تعاريف العلاقات' },
        { label: 'تصنيف الزبائن', icon: Users, path: '/master/customer-class' },
        { label: 'تصنيف الموردين', icon: Truck, path: '/master/vendor-class' },
        { label: 'المناطق الجغرافية', icon: MapPin, path: '/master/regions' },
        { label: 'العضويات', icon: BadgeCheck, path: '/master/memberships' },
        { label: 'القطاعات', icon: Building2, path: '/master/sectors' },
        { label: 'سياسات الائتمان', icon: ShieldCheck, path: '/master/credit-policies' },
        { label: 'قوائم الأسعار', icon: Tag, path: '/master/price-lists' },
        { label: 'دليل', icon: Users, path: '/master/partners' }, // Unified
        { label: 'المندوبين وعمولاتهم', icon: Briefcase, path: '/master/salesmen' },
        { divider: true, label: '' },
        { header: true, label: 'الأصول الثابتة' },
        { label: 'الأصول الثابتة', icon: Archive, path: '/assets/register' },
        { label: 'مجموعات الأصول الثابتة', icon: Server, path: '/master/asset-categories' },
        { divider: true, label: '' },
        { header: true, label: 'اللوجستيات' },
        { label: 'السيارات', icon: Truck, path: '/master/vehicles' },
        { label: 'السائقين', icon: User, path: '/master/drivers' },
    ],
    'المخزون والأصناف': [
        { header: true, label: 'إدارة الأصناف' },
        { label: 'بطاقات الأصناف', icon: Package, path: '/items' },
        { label: 'فئات الأصناف', icon: Layers, path: '/master/item-categories' },
        { label: 'الضريبة والرسوم', icon: Percent, path: '/master/taxes' },
        { label: 'رموز التحليل', icon: Network, path: '/definitions/analysis-codes' },
        { label: 'تعاريف السمات', icon: Tag, path: '/definitions/attributes' },
        { label: 'أصناف خدمية', icon: Settings, path: '/items/services' },
        { label: 'طباعة ملصقات الباركود', icon: Printer, path: '/items/labels' },
        { label: 'تعديل أسعار جماعي', icon: Tag, path: '/items/price-update' },
        { divider: true, label: '' },
        { header: true, label: 'حركات المخزون الداخلية' },
        { label: 'سند إدخال مخزني', icon: ArrowLeftRight, path: '/inventory/stock-in' },
        { label: 'سند إخراج مخزني', icon: ArrowLeftRight, path: '/inventory/stock-out' },
        { label: 'نقل بين المستودعات', icon: Truck, path: '/inventory/stock-transfers', capabilityKey: 'inventory.stock_transfer.read' },
        { label: 'سند تجميع/تفكيك', icon: Layers, path: '/inventory/assembly' },
        { label: 'إغلاق الفترة المخزنية', icon: Lock, path: '/inventory/close-period' },
        { divider: true, label: '' },
        { header: true, label: 'الجرد والتسويات' },
        { label: 'أوراق الجرد', icon: FileText, path: '/inventory/stock-take-sheets' },
        { label: 'إدخال الجرد الفعلي', icon: Clipboard, path: '/inventory/stock-take' },
        { label: 'حركات المخزون', icon: Sliders, path: '/inventory/transactions' },
    ],
    'المستودعات': [
        { header: true, label: 'إدارة المستودعات' },
        { label: 'طلبية مستودع داخلية', icon: FileText, path: '/inventory/internal-order' },
        { label: 'سند إرسال', icon: Truck, path: '/inventory/dispatch' },
        { label: 'سند استلام', icon: Truck, path: '/inventory/receipt' },
        { label: 'طلب لوازم', icon: FileQuestion, path: '/inventory/supplies-request' },
        { label: 'تعديل مخزون', icon: Sliders, path: '/inventory/adjustment' },
        { label: 'جرد الاصناف', icon: Clipboard, path: '/inventory/stock-take' },
    ],
    'الاستيراد والتصدير': [
        { header: true, label: 'إدارة الاستيراد' },
        { label: 'لوحة الاستيراد', icon: LayoutDashboard, path: '/import/dashboard' },
        { label: 'ملف الاعتماد / الشحنة', icon: Globe, path: '/import/shipments' },
        { label: 'تتبع الحاويات', icon: Box, path: '/import/containers' },
        { label: 'الفاتورة المبدئية (Proforma)', icon: FileQuestion, path: '/import/proformas' },
        { divider: true, label: '' },
        { header: true, label: 'التخليص والتكاليف' },
        { label: 'فاتورة شراء خارجية', icon: FileInput, path: '/import/invoice' },
        { label: 'سند مصاريف تخليص', icon: Coins, path: '/import/customs' },
        { label: 'معالج توزيع التكاليف', icon: Calculator, path: '/import/landed-cost' },
        { divider: true, label: '' },
        { header: true, label: 'مستندات التصدير' },
        { label: 'فاتورة تصدير', icon: FileOutput, path: '/export/invoices' },
        { label: 'قائمة التعبئة', icon: List, path: '/export/packing-list' },
        { label: 'شهادة المنشأ', icon: FileText, path: '/export/certificate-origin' },
    ],
    'المشتريات': [
        { header: true, label: 'المشتريات المحلية' },
        { label: 'طلب احتياج مواد (PR)', icon: FileQuestion, path: '/trade/purchasing/pr' },
        { label: 'طلب عرض سعر (RFQ)', icon: MessageSquare, path: '/trade/purchasing/rfq' },
        { label: 'طلبية مشتريات', icon: FileText, path: '/trade/purchasing/lpo' },
        { label: 'استلام بضاعة (GRN)', icon: Truck, path: '/trade/purchasing/receipts' },
        { label: 'فاتورة مشتريات', icon: ShoppingCart, path: '/trade/purchasing/invoices', capabilityKey: 'purchase.invoice.read' },
        { label: 'مرتجع مشتريات', icon: ArrowLeftRight, path: '/trade/purchasing/return' },
    ],
    'المبيعات': [
        { header: true, label: 'إدارة المبيعات' },
        { label: 'عرض أسعار', icon: FileText, path: '/trade/sales/quotation' },
        { label: 'طلبية مبيعات', icon: ShoppingCart, path: '/trade/sales/order' },
        { label: 'إرسالية مبيعات', icon: Truck, path: '/trade/sales/delivery' },
        { label: 'فاتورة مبيعات', icon: ShoppingCart, path: '/sales/invoices', capabilityKey: 'sales.invoice.read' },
        { label: 'نقطة بيع (POS)', icon: Monitor, path: '/trade/sales/pos' },
        { label: 'مرتجع مبيعات', icon: ArrowLeftRight, path: '/trade/sales/return' },
        { label: 'إشعار دائن/مدين', icon: FileMinus, path: '/trade/sales/credit-note' },
        { divider: true, label: '' },
        { header: true, label: 'التوزيع والعقود' },
        { label: 'تخطيط المسارات', icon: MapPin, path: '/trade/distribution/routes' },
        { label: 'تحميل/جرد سيارة المندوب', icon: Truck, path: '/trade/distribution/van-stock' },
        { label: 'تصفية المندوب', icon: Banknote, path: '/trade/distribution/settlement' },
        { label: 'قوائم الأسعار والعروض', icon: Star, path: '/trade/agreements/promotions' },
    ],
    'السندات': [
        { header: true, label: 'شجرة الحسابات' },
        { label: 'دليل الحسابات', icon: Layers, path: '/gl/chart-of-accounts' },
        { label: 'التعاريف المالية', icon: Database, path: '/gl/financial-definitions' },
        { label: 'الأرصدة الافتتاحية', icon: FileText, path: '/gl/opening-balances' },
        { divider: true, label: '' },
        { header: true, label: 'العمليات اليومية' },
        { label: 'سند قبض', icon: Banknote, path: '/treasury/receipt' },
        { label: 'سند صرف', icon: Banknote, path: '/treasury/payment' },

        { label: 'سند قيد يومي', icon: FileText, path: '/gl/journal-vouchers', capabilityKey: 'accounting.journal_voucher.read' },
        { label: 'سند موحد AE', icon: FilePlus, path: '/gl/ae-voucher' },
        { label: 'سند قيد متكرر', icon: RefreshCw, path: '/gl/recurring' },
        { label: 'قيود التسوية', icon: Sliders, path: '/gl/settlement' },
        { divider: true, label: '' },
        { header: true, label: 'الأصول الثابتة' },
        { label: 'سجل الأصول', icon: Archive, path: '/assets/register' },
        { label: 'احتساب الإهلاك', icon: Calculator, path: '/assets/depreciation' },
        { label: 'استبعاد/بيع أصل', icon: AlertCircle, path: '/assets/disposal' },
        { divider: true, label: '' },
        { header: true, label: 'الموازنات' },
        { label: 'الموازنات التقديرية', icon: BarChart, path: '/gl/budgets' },
    ],
    'البنوك': [
        { header: true, label: 'إدارة البنوك' },
        { label: 'حساباتنا في البنوك', icon: Banknote, path: '/banking/our-accounts' },
        { label: 'البنوك و الفروع', icon: MapPin, path: '/banking/branches' },
        { divider: true, label: '' },
        { header: true, label: 'المطابقات والكشوفات' },
        { label: 'مطابقة كشف البنك يدوي', icon: FileCheck, path: '/treasury/reconciliation' },
        { label: 'مطابقة كشف البنك آلي', icon: Sparkles, path: '/treasury/auto-reconciliation' },
        { label: 'كشوفات واردة من البنك', icon: FileText, path: '/banking/statements' },
        { divider: true, label: '' },
        { header: true, label: 'حالة الشيكات' },
        { label: 'حالة العالق', icon: AlertCircle, path: '/banking/pending-status' },
        { label: 'قائمة الاتمان الضعيف', icon: AlertTriangle, path: '/banking/weak-credit' },
        { divider: true, label: '' },
        { header: true, label: 'إدارة الشيكات' },
        { label: 'حافظة الشيكات الواردة', icon: CreditCard, path: '/treasury/checks-in' },
        { label: 'حافظة الشيكات الصادرة', icon: CreditCard, path: '/treasury/checks-out' },
        { label: 'تجيير الشيكات', icon: ArrowLeftRight, path: '/treasury/endorsement' },
        { label: 'حاسبة تواريخ الاستحقاق', icon: Calculator, path: '/treasury/check-calculator' },
    ],
    'التصنيع': [
        { header: true, label: 'الإعدادات' },
        { label: 'إعدادات المصنع (المراكز والآلات)', icon: Settings, path: '/manufacturing/work-centers' },
        { label: 'تعريف وجبات الإنتاج BOM', icon: Layers, path: '/manufacturing/bom' },
        { label: 'مسارات العمل (Routing)', icon: GitMerge, path: '/manufacturing/routings' },
        { label: 'تعريف التكاليف', icon: Coins, path: '/manufacturing/costs' },
        { divider: true, label: '' },
        { header: true, label: 'العمليات' },
        { label: 'أمر تصنيع', icon: FileText, path: '/manufacturing/order' },
        { label: 'صرف مواد خام', icon: Box, path: '/manufacturing/issue' },
        { label: 'استلام منتج جاهز', icon: Box, path: '/manufacturing/receipt' },
        { label: 'بطاقات العمل (Shop Floor)', icon: Clock, path: '/manufacturing/job-cards' },
        { label: 'مراقبة الجودة', icon: Clipboard, path: '/manufacturing/quality' },
        { label: 'الصيانة', icon: AlertTriangle, path: '/manufacturing/maintenance' },
        { label: 'احتساب تكلفة المنتج', icon: Calculator, path: '/manufacturing/costing' },
        { label: 'انتاج تحت التشغيل', icon: Activity, path: '/manufacturing/wip' }, // From Side Menu
    ],
    'الموارد البشرية': [
        { header: true, label: 'التنظيم والموظفين' },
        { label: 'الهيكل التنظيمي', icon: Layers, path: '/hr/org' },
        { label: 'إدارة الموظفين', icon: User, path: '/hr/employees' },
        { label: 'إدارة الإجازات والمغادرات', icon: Calendar, path: '/hr/leaves' },
        { divider: true, label: '' },
        { header: true, label: 'الدوام' },
        { label: 'إدارة الورديات', icon: Clock, path: '/hr/shifts' },
        { label: 'استيراد بيانات الدوام', icon: HardDrive, path: '/hr/attendance-import' },
        { label: 'سجل الإنتاج (القطعة)', icon: Clipboard, path: '/hr/production-log' },
        { label: 'سجل الدوام اليومي', icon: FileText, path: '/hr/attendance' },
        { divider: true, label: '' },
        { header: true, label: 'الرواتب' },
        { label: 'السلف والقروض', icon: Banknote, path: '/hr/loans' },
        { label: 'مسير الرواتب', icon: Calculator, path: '/hr/payroll' },
        { label: 'إصدار قسائم الراتب', icon: FileText, path: '/hr/payslips' },
        { label: 'توليد قيد الرواتب', icon: FileText, path: '/hr/salary-entry' },
    ],
    'التقارير والتحليلات': [
        {
            label: 'التقارير المالية',
            icon: PieChart,
            subItems: [
                { label: 'ميزان المراجعة العام', icon: BarChart, path: '/reports/financial/tb-general' },
                { label: 'ميزان المراجعة بالمستويات', icon: Layers, path: '/reports/financial/tb-levels' },
                { label: 'ميزان المراجعة فترات', icon: Calendar, path: '/reports/financial/tb-periods' },
                { divider: true, label: '' },
                { label: 'قائمة الدخل (P&L)', icon: PieChart, path: '/reports/financial/pl' },
                { label: 'الميزانية العمومية', icon: BarChart, path: '/reports/financial/bs' },
                { divider: true, label: '' },
                { label: 'كشف حساب تفصيلي', icon: FileText, path: '/reports/financial/soa-detailed' },
                { label: 'كشف حساب ذمم', icon: Users, path: '/reports/financial/soa-receivables' },
                { label: 'كشف حساب تفاعلي', icon: Activity, path: '/reports/financial/soa-interactive' },
                { divider: true, label: '' },
                { label: 'أعمار الذمم', icon: Calendar, path: '/reports/financial/aging' },
                { label: 'التدفق النقدي', icon: Banknote, path: '/reports/financial/cashflow' },
                { divider: true, label: '' },
                { label: 'كشف ضريبة القيمة المضافة', icon: Percent, path: '/reports/financial/vat' },
                { label: 'تقرير خصم المصدر', icon: Coins, path: '/reports/financial/withholding-tax' },
            ]
        },
        {
            label: 'تقارير المبيعات',
            icon: ShoppingCart,
            subItems: [
                { label: 'مبيعات حسب الصنف', icon: Box, path: '/reports/sales/by-item' },
                { label: 'مبيعات حسب الزبون', icon: Users, path: '/reports/sales/by-customer' },
                { label: 'مبيعات حسب المندوب', icon: Briefcase, path: '/reports/sales/by-salesman' },
                { label: 'مبيعات حسب المنطقة', icon: MapPin, path: '/reports/sales/by-region' },
                { divider: true, label: '' },
                { label: 'ربحية الفواتير', icon: PieChart, path: '/reports/sales/invoice-profit' },
                { label: 'الأصناف الأكثر ربحية', icon: Star, path: '/reports/sales/top-profit-items' },
                { divider: true, label: '' },
                { label: 'المبيعات الشهرية/السنوية', icon: BarChart, path: '/reports/sales/monthly-yearly' },
                { label: 'الزبائن المنقطعون', icon: AlertCircle, path: '/reports/sales/inactive-customers' },
            ]
        },
        {
            label: 'تقارير المشتريات',
            icon: Truck,
            subItems: [
                { label: 'مشتريات حسب المورد', icon: Truck, path: '/reports/purchases/by-vendor' },
                { label: 'مشتريات حسب الصنف', icon: Box, path: '/reports/purchases/by-item' },
                { divider: true, label: '' },
                { label: 'كشف الاعتمادات المستندية', icon: Globe, path: '/reports/purchases/lc-status' },
                { label: 'تحليل تكلفة الاستيراد', icon: Calculator, path: '/reports/purchases/import-costing' },
                { divider: true, label: '' },
                { label: 'استحقاق دفعات الموردين', icon: Calendar, path: '/reports/purchases/vendor-payments' },
            ]
        },
        {
            label: 'تقارير المخزون',
            icon: Box,
            subItems: [
                { label: 'كشف حركة صنف', icon: Activity, path: '/reports/inventory/movement' },
                { label: 'كمية الأصناف حسب المستودع', icon: Building2, path: '/reports/inventory/quantity-by-warehouse' },
                { label: 'تقرير جرد المخزون', icon: Clipboard, path: '/reports/inventory/stock-count' },
                { label: 'تقييم المخزون', icon: Coins, path: '/reports/inventory/valuation' },
                { divider: true, label: '' },
                { label: 'حد الطلب', icon: Bell, path: '/reports/inventory/reorder' },
                { label: 'الأصناف الراكدة', icon: Archive, path: '/reports/inventory/dead-stock' },
                { label: 'تواريخ الصلاحية', icon: Calendar, path: '/reports/inventory/expiry' },
            ]
        },
        {
            label: 'تقارير الشيكات',
            icon: CreditCard,
            subItems: [
                { label: 'شيكات في الصندوق', icon: CreditCard, path: '/reports/checks/in-hand' },
                { label: 'شيكات برسم التحصيل', icon: Clock, path: '/reports/checks/under-collection' },
                { label: 'شيكات راجعة', icon: AlertCircle, path: '/reports/checks/bounced' },
                { divider: true, label: '' },
                { label: 'شيكات مؤجلة', icon: Calendar, path: '/reports/checks/postdated' },
                { label: 'شيكات مستحقة الدفع', icon: Banknote, path: '/reports/checks/payable' },
            ]
        },
        { divider: true, label: '' },
        { label: 'لوحة المعلومات', icon: LayoutDashboard, path: '/reports/dashboard' },
    ],
    'أدوات ومساعدة': [
        {
            label: 'أدوات مكتبية',
            icon: Calculator,
            subItems: [
                { label: 'الرزنامة', icon: Calendar, path: '/tools/calendar' },
                { label: 'الآلة الحاسبة', icon: Calculator, path: '/tools/calculator' },
                { label: 'محول العملات', icon: Banknote, path: '/tools/converter' },
                { label: 'المفكرة', icon: Clipboard, path: '/tools/notepad' },
                { label: 'WAFI AI', icon: Sparkles, path: '/wafi-ai' },
            ]
        },
        {
            label: 'الإصدارات القطاعية',
            icon: Globe,
            subItems: [
                { label: 'مركز التطبيقات القطاعية', icon: Sparkles, path: '/vertical/apps' },
                { label: 'لوحة NGO', icon: Users, path: '/editions/ngo' },
                { label: 'لوحة Government', icon: Shield, path: '/editions/government' },
            ]
        },
        {
            label: 'التواصل',
            icon: MessageCircle,
            subItems: [
                { label: 'البريد الداخلي', icon: Mail, path: '/tools/mail' },
                { label: 'البريد الإلكتروني', icon: Mail, path: '/tools/email' },
                { label: 'WhatsApp', icon: Smartphone, path: '/tools/whatsapp' },
                { label: 'المحادثة', icon: MessageCircle, path: '/tools/chat' },
                { label: 'رسائل SMS', icon: Smartphone, path: '/tools/sms' },
            ]
        },
        {
            label: 'أرشفة المستندات',
            icon: FolderOpen,
            subItems: [
                { label: 'الأرشفة الذكية', icon: Archive, path: '/tools/archive' },
            ]
        },
        {
            label: 'تكامل الأجهزة',
            icon: HardDrive,
            subItems: [
                { label: 'RFID', icon: HardDrive, path: '/tools/rfid' },
            ]
        },
        {
            label: 'مصمم النماذج',
            icon: FileCog,
            subItems: [
                { label: 'مصمم النماذج', icon: FileCog, path: '/tools/designer' },
                { label: 'تعديل شكل الطباعة', icon: Printer, path: '/tools/print-layout' },
                { label: 'محاكاة الدورة المستندية', icon: Activity, path: '/tools/workflow-simulation' },
            ]
        },
        { divider: true, label: '' },
        {
            label: 'المساعدة',
            icon: HelpCircle,
            subItems: [
                { label: 'دليل المستخدم', icon: BookOpen, path: '/help/guide' },
                { label: 'حول البرنامج', icon: AlertCircle, path: '/help/about' },
                { divider: true, label: '' },
                { label: 'المساعدة عن بعد', icon: Phone, path: '/help/remote-support' },
                { label: 'فتح تذكرة دعم', icon: MessageSquare, path: '/help/support-ticket' },
            ]
        },
    ],
};

const SECTION_CAPABILITY_MAP: Record<string, string> = {
    'ملف وإدارة النظام': 'core.security.permissions.manage',
    'التعاريف والبطاقات': 'ti.master.partner.manage',
    'المخزون والأصناف': 'ti.master.item.manage',
    'المستودعات': 'ti.master.item.manage',
    'الاستيراد والتصدير': 'ti.purchase.invoice.create',
    'المشتريات': 'ti.purchase.invoice.create',
    'المبيعات': 'sales.invoice.read',
    'السندات': 'ti.gl.journal.post',
    'البنوك': 'ti.gl.journal.post',
    'التصنيع': 'sector.manufacturing.production.plan',
    'الموارد البشرية': 'prtax.master.employee.manage',
    'التقارير والتحليلات': 'core.reporting.view',
    'أدوات ومساعدة': 'core.reporting.view',
};

function inferCapabilityKeyFromPath(path?: string): string | undefined {
    const p = String(path || '').trim();
    if (!p) return undefined;

    if (p.startsWith('/system') || p.startsWith('/settings')) return 'core.security.permissions.manage';
    if (p.startsWith('/approval')) return 'core.workflow.approve';
    if (p.startsWith('/reports')) return 'core.reporting.view';

    if (p.startsWith('/trade/sales') || p.startsWith('/sales') || p.startsWith('/pos')) return 'sales.invoice.read';
    if (p.startsWith('/trade/purchasing') || p.startsWith('/purchasing') || p.startsWith('/import') || p.startsWith('/export')) return 'ti.purchase.invoice.create';
    if (p.startsWith('/inventory') || p.startsWith('/items') || p.startsWith('/master/warehouses') || p.startsWith('/master/units') || p.startsWith('/master/item-categories') || p.startsWith('/master/brands')) return 'ti.master.item.manage';
    if (p.startsWith('/hr')) return 'prtax.master.employee.manage';
    if (p.startsWith('/manufacturing')) return 'sector.manufacturing.production.plan';
    if (p.startsWith('/gl') || p.startsWith('/treasury') || p.startsWith('/banking')) return 'ti.gl.journal.post';
    if (p.startsWith('/master/partners') || p.startsWith('/master/customer') || p.startsWith('/master/vendor') || p.startsWith('/master/regions') || p.startsWith('/master/credit-policies') || p.startsWith('/master/memberships') || p.startsWith('/master/sectors')) return 'ti.master.partner.manage';

    return undefined;
}

function attachCapabilityKeys(items: MenuItem[]): MenuItem[] {
    return items.map((item) => ({
        ...item,
        capabilityKey: item.capabilityKey || inferCapabilityKeyFromPath(item.path),
        subItems: item.subItems ? attachCapabilityKeys(item.subItems) : undefined,
    }));
}

for (const category of Object.keys(TOP_MENU_ITEMS)) {
    TOP_MENU_ITEMS[category] = attachCapabilityKeys(TOP_MENU_ITEMS[category]);
}


// --- STRIP 2: SIDE MENU (AUTOMATICALLY SYNCED) ---
// Now we simply map the TOP_MENU_ITEMS keys to SideMenuSections.
// This ensures they are ALWAYS identical.

const CATEGORY_ICONS: Record<string, any> = {
    'ملف وإدارة النظام': Shield,
    'التعاريف والبطاقات': Database,
    'المخزون والأصناف': Package,
    'المستودعات': Box,
    'الاستيراد والتصدير': Globe,
    'المشتريات': ShoppingCart,
    'المبيعات': Briefcase,
    'السندات': BookOpen,
    'البنوك': Coins,
    'التصنيع': PenTool,
    'الموارد البشرية': Users,
    'التقارير والتحليلات': BarChart,
    'أدوات ومساعدة': HelpCircle,
};

export const SIDE_MENU_ITEMS: SideMenuSection[] = Object.keys(TOP_MENU_ITEMS).map(key => ({
    title: key,
    icon: CATEGORY_ICONS[key] || FolderOpen,
    capabilityKey: SECTION_CAPABILITY_MAP[key],
    items: TOP_MENU_ITEMS[key]
}));

// --- STRIP 2: ICON TABS (UNCHANGED) ---

export const RIBBON_TABS = [
    { id: 'favorites', label: 'المفضلة', icon: Star },
    { id: 'accounts', label: 'الحسابات', icon: User },
    { id: 'warehouse', label: 'المستودع', icon: Box },
    { id: 'sales_purchases', label: 'المبيعات/المشتريات', icon: ShoppingCart },
    { id: 'documents', label: 'المستندات', icon: FileText },
    { id: 'accounting_reports', label: 'تقارير المحاسبة', icon: PieChart },
    { id: 'inventory_reports', label: 'تقارير المخزون', icon: Clipboard },
    { id: 'tools', label: 'الادوات', icon: Sliders },
    { id: 'queries', label: 'الاستعلامات', icon: Search },
];

export const RIBBON_CONTENT: Record<string, RibbonGroup[]> = {
    favorites: [
        {
            label: 'تنظيم',
            items: [
                { label: 'تنظيم المفضلة', icon: Star, path: '/favorites/manage' },
            ]
        }
    ],
    accounts: [
        {
            label: 'الحسابات',
            items: [
                { label: 'ادارة الحسابات', icon: Settings, path: '/gl/chart-of-accounts' },
                { label: 'الصناديق', icon: Wallet, path: '/master/cash-boxes' },
                { label: 'الحسابات الرئيسية', icon: Layers, path: '/gl/main-accounts' },
                { label: 'مجموعات الحسابات', icon: FolderOpen, path: '/gl/account-groups' },
                { label: 'جميع الحسابات', icon: List, path: '/gl/all-accounts' },
                { label: 'فهرس الحسابات', icon: BookOpen, path: '/gl/index' },
            ]
        },
        {
            label: 'الذمم',
            items: [
                { label: 'الموظفين', icon: User, path: '/hr/employees' },
                { label: 'المساهمين', icon: Users, path: '/gl/shareholders' },
                { label: 'المندوبين', icon: Briefcase, path: '/sales/salesmen-mgmt' },
                { label: 'الموردين', icon: Truck, path: '/master/vendor-class' },
                { label: 'الزبائن', icon: Users, path: '/master/customer-class' },
            ]
        },
        {
            label: 'مصاريف/ايرادات',
            items: [
                { label: 'الايرادات', icon: TrendingUp, path: '/gl/revenues' },
                { label: 'المصاريف', icon: TrendingDown, path: '/gl/expenses' },
            ]
        },
        {
            label: 'الاصول الثابتة',
            items: [
                { label: 'الاصل الثابت', icon: Archive, path: '/assets/register' },
            ]
        },
        {
            label: 'حسابات اخرى',
            items: [
                { label: 'الحسابات الاضافية', icon: PlusCircle, path: '/gl/extra-accounts' },
                { label: 'حساب الاعتماد', icon: Globe, path: '/import/lc' },
            ]
        }
    ],
    warehouse: [
        {
            label: 'الاصناف',
            items: [
                { label: 'ملف الاصناف', icon: Box, path: '/items' },
                { label: 'مجوعات الاصناف', icon: Layers, path: '/master/item-categories' },
                { label: 'صور الاصناف', icon: Image, path: '/items/images' },
                { label: 'ملف الاصناف-جداول', icon: Table, path: '/items/table-view' },
            ]
        },
        {
            label: 'الاسعار',
            items: [
                { label: 'اسعار البيع', icon: Tag, path: '/items/sales-prices' },
                { label: 'اسعار التكلفة والشراء', icon: Coins, path: '/items/cost-prices' },
                { label: 'اتفاقيات/عروض اسعار', icon: Star, path: '/items/promotions' },
            ]
        },
        {
            label: 'الادخال والاخراج',
            items: [
                { label: 'نقل داخلي', icon: ArrowLeftRight, path: '/inventory/stock-transfers', capabilityKey: 'inventory.stock_transfer.read' },
                { label: 'ارسالية مشتريات', icon: Truck, path: '/purchasing/grn' },
                { label: 'ارسالية مبيعات', icon: Truck, path: '/sales/delivery-note' },
            ]
        },
        {
            label: 'مستندات اخرى',
            items: [
                { label: 'مستند التحميل', icon: Upload, path: '/inventory/loading' },
                { label: 'مستند انتاج', icon: Settings, path: '/manufacturing/order' },
            ]
        },
        {
            label: 'معادلات التجميع/الانتاج',
            items: [
                { label: 'معادلات الانتاج', icon: Calculator, path: '/manufacturing/bom' },
                { label: 'معادلات التجميع', icon: Layers, path: '/inventory/assembly' },
            ]
        },
        {
            label: 'ملصقات',
            items: [
                { label: 'ملصقات باركود', icon: Printer, path: '/items/labels' },
            ]
        }
    ],
    sales_purchases: [
        {
            label: 'المبيعات',
            items: [
                { label: 'عرض اسعار', icon: FileText, path: '/sales/quotations' }, // Updated
                { label: 'طلبية مبيعات', icon: ShoppingCart, path: '/sales/orders' }, // Updated
                { label: 'فاتورة مبيعات', icon: ShoppingCart, path: '/sales/invoices', capabilityKey: 'sales.invoice.read' },
                { label: 'فاتورة مردودات', icon: ArrowLeftRight, path: '/sales/return' },
            ]
        },
        {
            label: 'المشتريات',
            items: [
                { label: 'طلبية مشتريات', icon: FileText, path: '/purchasing/order' },
                { label: 'فاتورة مشتريات', icon: ShoppingCart, path: '/purchases/invoices', capabilityKey: 'purchase.invoice.read' },
                { label: 'فاتورة مردودات', icon: ArrowLeftRight, path: '/purchasing/return' },
            ]
        },
        {
            label: 'الاستيراد',
            items: [
                { label: 'مستند الاستيراد', icon: Globe, path: '/import/lc' },
                { label: 'فاتورة استيراد', icon: FileInput, path: '/import/invoice' },
            ]
        },
        {
            label: 'نقاط بيع',
            items: [
                { label: 'نقطة بيع', icon: Monitor, path: '/sales/pos' },
            ]
        }
    ],
    documents: [
        {
            label: 'سندات',
            items: [
                { label: 'قبض', icon: Banknote, path: '/treasury/receipt' },
                { label: 'صرف', icon: Banknote, path: '/treasury/payment' },
                { label: 'قيد', icon: FileText, path: '/gl/journal-vouchers', capabilityKey: 'accounting.journal_voucher.read' },
                { label: 'قيد بنكي', icon: FileText, path: '/banking/entries' },
                { label: 'اشعار دائن', icon: FileMinus, path: '/gl/credit-note' },
                { label: 'اشعار مدين', icon: FilePlus, path: '/gl/debit-note' },
                { label: 'مستند ملاحظات', icon: StickyNote, path: '/tools/notes' },
                { label: 'قيد افتتاحي', icon: FileText, path: '/gl/opening-balances' },
            ]
        }
    ],
    accounting_reports: [
        {
            label: 'كشف حساب',
            items: [
                { label: 'كشف حساب عام', icon: FileText, path: '/reports/financial/soa-general' },
                { label: 'كشف حساب ذمم', icon: Users, path: '/reports/financial/soa-customers' },
                { label: 'كشف حساب تفاعلي', icon: Activity, path: '/reports/financial/soa-interactive' },
            ]
        },
        {
            label: 'المبيعات',
            items: [
                { label: 'فواتير المبيعات', icon: FileText, path: '/reports/sales/invoices' },
                { label: 'فواتير المردودات', icon: ArrowLeftRight, path: '/reports/sales/returns' },
                { label: 'اجمالي المبيعات', icon: BarChart, path: '/reports/sales/total' },
            ]
        },
        {
            label: 'ارصدة الذمم',
            items: [
                { label: 'ارصدة الموردين', icon: Truck, path: '/reports/vendors/balances' },
                { label: 'ارصدة الزبائن', icon: Users, path: '/reports/customers/balances' },
            ]
        },
        {
            label: 'قوائم مالية',
            items: [
                { label: 'ميزان مراجعة', icon: Scale, path: '/reports/financial/tb' },
            ]
        },
        {
            label: 'شيكات',
            items: [
                { label: 'الشيكات الصادرة', icon: FileOutput, path: '/reports/checks/issued' },
                { label: 'الشيكات الواردة', icon: FileInput, path: '/reports/checks/received' },
                { label: 'حركة شيك', icon: Activity, path: '/reports/checks/history' },
            ]
        },
        {
            label: 'المشتريات',
            items: [
                { label: 'اجمالي المشتريات', icon: BarChart, path: '/reports/purchases/total' },
                { label: 'مردود المشتريات', icon: ArrowLeftRight, path: '/reports/purchases/returns' },
                { label: 'فواتير المشتريات', icon: FileText, path: '/reports/purchases/invoices' },
            ]
        }
    ],
    inventory_reports: [
        {
            label: 'كشف حركة صنف',
            items: [
                { label: 'كشف حركة صنف', icon: Activity, path: '/reports/inventory/movement' },
                { label: 'حركة صنف منفصل', icon: FileText, path: '/reports/inventory/movement-detailed' },
            ]
        },
        {
            label: 'الاصناف',
            items: [
                { label: 'قائمة الاصناف', icon: List, path: '/reports/inventory/items-list' },
                { label: 'اسعار المبيع', icon: Tag, path: '/reports/inventory/sales-prices' },
                { label: 'اسعار الشراء/التكلفة', icon: Coins, path: '/reports/inventory/cost-prices' },
            ]
        },
        {
            label: 'الارصدة',
            items: [
                { label: 'ارصدة الاصناف', icon: Box, path: '/reports/inventory/balances' },
                { label: 'قيمة المخزون', icon: Coins, path: '/reports/inventory/valuation' },
                { label: 'النواقص', icon: AlertTriangle, path: '/reports/inventory/shortages' },
                { label: 'النواقص في مخزن', icon: MapPin, path: '/reports/inventory/shortages-warehouse' },
            ]
        },
        {
            label: 'المستندات',
            items: [
                { label: 'مستندات الاخراج', icon: LogOut, path: '/reports/inventory/out-docs' },
                { label: 'مستندات الادخال', icon: LogIn, path: '/reports/inventory/in-docs' },
                { label: 'نقل داخلي', icon: ArrowLeftRight, path: '/reports/inventory/transfers' },
                { label: 'مستندات الانتاج', icon: Settings, path: '/reports/inventory/production-docs' },
            ]
        }
    ],
    tools: [
        {
            label: 'الادوات',
            items: [
                { label: 'الة حاسبة', icon: Calculator, path: '/tools/calculator' },
                { label: 'دفتر العناوين', icon: Book, path: '/tools/address-book' },
                { label: 'الرزمانة', icon: Calendar, path: '/tools/calendar' },
                { label: 'الحافظة', icon: Clipboard, path: '/tools/clipboard' },
                { label: 'التخزين الاحتياطي', icon: Database, path: '/system/backup' },
                { label: 'الفترات المفتوحة', icon: Calendar, path: '/system/periods' },
                { label: 'رسائل SMS', icon: MessageSquare, path: '/tools/sms' },
            ]
        },
        {
            label: 'العملات',
            items: [
                { label: 'العملات', icon: Banknote, path: '/master/currencies' },
                { label: 'تحويل العملات', icon: RefreshCw, path: '/tools/converter' },
            ]
        },
        {
            label: 'المراسلات الداخلية',
            items: [
                { label: 'البريد الداخلي', icon: Mail, path: '/tools/mail' },
                { label: 'المحادثة', icon: MessageCircle, path: '/tools/chat' },
            ]
        },
        {
            label: 'العرض',
            items: [
                { label: 'اسلوب العرض', icon: Monitor, path: '/settings/display' },
            ]
        },
        {
            label: 'ادوات ادارية',
            items: [
                { label: 'اصدار كتاب', icon: PenTool, path: '/admin/issue-letter' },
            ]
        }
    ],
    queries: [
        {
            label: 'الحسابات',
            items: [
                { label: 'الاستعلام عن حساب', icon: Search, path: '/queries/account' },
            ]
        },
        {
            label: 'الاصناف',
            items: [
                { label: 'الاستعلام عن صنف', icon: Search, path: '/queries/item' },
                { label: 'ملخص الاصناف', icon: List, path: '/queries/items-summary' },
            ]
        },
        {
            label: 'الشيكات',
            items: [
                { label: 'الاستعلام عن شيك', icon: Search, path: '/queries/check' },
                { label: 'ملخص الشيكات', icon: List, path: '/queries/checks-summary' },
            ]
        },
        {
            label: 'الفواتير',
            items: [
                { label: 'الاستعلام عن الفواتير', icon: FileText, path: '/queries/invoices' },
            ]
        },
        {
            label: 'المتسلسلات والرزم',
            items: [
                { label: 'الرزم', icon: Package, path: '/queries/packages' },
                { label: 'المتسلسلات', icon: Hash, path: '/queries/serials' },
            ]
        },
        {
            label: 'البحث',
            items: [
                { label: 'البحث الموسع', icon: Search, path: '/search/advanced' },
            ]
        }
    ]
};
