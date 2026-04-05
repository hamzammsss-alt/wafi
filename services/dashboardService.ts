/**
 * Dashboard Service
 * Handles fetching and processing dashboard data for different user roles
 */

export interface DashboardKPIs {
    sales: number;
    cash: number;
    checks: number;
    lowStock: number;
    profit?: number;
    revenue?: number;
    expenses?: number;
    inventoryValue?: number;
}

export interface ChartData {
    cashFlow: Array<{ date: string; in_flow: number; out_flow: number }>;
    topProducts: Array<{ name: string; qty: number; value?: number }>;
    salesTrend?: Array<{ date: string; value: number }>;
    expensesRevenue?: Array<{ category: string; expenses: number; revenue: number }>;
}

export interface AdminDashboardData {
    kpis: {
        totalSales: number;
        netProfit: number;
        cashBalance: number;
        inventoryValue: number;
    };
    charts: {
        salesTrend: Array<{ date: string; value: number }>;
        revenueBreakdown: Array<{ name: string; value: number }>;
        cashFlow: Array<{ date: string; in_flow: number; out_flow: number }>;
    };
    topCustomers: Array<{ id: string; name: string; total: number; orders: number }>;
    activities: Array<any>;
}

export interface SalesDashboardData {
    kpis: {
        teamSales: number;
        monthlyTarget: number;
        newCustomers: number;
        pendingQuotes: number;
    };
    charts: {
        salesPerformance: Array<{ date: string; value: number }>;
        topProducts: Array<{ name: string; qty: number; value: number }>;
    };
    targets: Array<{ label: string; achieved: number; goal: number; percentage: number }>;
    topSalesReps?: Array<{ name: string; sales: number; target: number }>;
}

export interface FinancialDashboardData {
    kpis: {
        cashBalance: number;
        bankBalance: number;
        receivables: number;
        payables: number;
    };
    charts: {
        cashFlow: Array<{ date: string; in_flow: number; out_flow: number }>;
        expensesRevenue: Array<{ category: string; expenses: number; revenue: number }>;
    };
    pendingCheques: Array<{ id: string; number: string; amount: number; dueDate: string; customer: string }>;
    recentTransactions: Array<{ type: 'in' | 'out'; description: string; amount: number; date: string; status: string }>;
}

export interface InventoryDashboardData {
    kpis: {
        totalItems: number;
        inventoryValue: number;
        lowStockCount: number;
        pendingOrders: number;
    };
    charts: {
        stockMovement: Array<{ date: string; in: number; out: number }>;
        topItems: Array<{ name: string; qty: number; value: number }>;
    };
    stockAlerts: Array<{ id: string; item: string; current: number; min: number; status: 'critical' | 'warning' }>;
    recentMovements: Array<{ item: string; type: 'in' | 'out'; qty: number; unit: string; reason: string; time: string }>;
}

class DashboardService {
    /**
     * Get Admin Dashboard Data
     */
    async getAdminDashboardData(): Promise<AdminDashboardData> {
        try {
            const [kpis, charts] = await Promise.all([
                this.getAdminKPIs(),
                this.getAdminCharts()
            ]);

            const topCustomers = await this.getTopCustomers();
            const activities = await this.getRecentActivities();

            return {
                kpis,
                charts,
                topCustomers,
                activities
            };
        } catch (error) {
            console.error('Error loading admin dashboard:', error);
            return this.getAdminDashboardFallback();
        }
    }

    /**
     * Get Sales Dashboard Data
     */
    async getSalesDashboardData(): Promise<SalesDashboardData> {
        try {
            const kpis = await this.getSalesKPIs();
            const charts = await this.getSalesCharts();
            const targets = await this.getSalesTargets();

            return {
                kpis,
                charts,
                targets
            };
        } catch (error) {
            console.error('Error loading sales dashboard:', error);
            return this.getSalesDashboardFallback();
        }
    }

    /**
     * Get Financial Dashboard Data
     */
    async getFinancialDashboardData(): Promise<FinancialDashboardData> {
        try {
            const kpis = await this.getFinancialKPIs();
            const charts = await this.getFinancialCharts();
            const pendingCheques = await this.getPendingCheques();
            const recentTransactions = await this.getRecentTransactions();

            return {
                kpis,
                charts,
                pendingCheques,
                recentTransactions
            };
        } catch (error) {
            console.error('Error loading financial dashboard:', error);
            return this.getFinancialDashboardFallback();
        }
    }

    /**
     * Get Inventory Dashboard Data
     */
    async getInventoryDashboardData(): Promise<InventoryDashboardData> {
        try {
            const kpis = await this.getInventoryKPIs();
            const charts = await this.getInventoryCharts();
            const stockAlerts = await this.getStockAlerts();
            const recentMovements = await this.getRecentStockMovements();

            return {
                kpis,
                charts,
                stockAlerts,
                recentMovements
            };
        } catch (error) {
            console.error('Error loading inventory dashboard:', error);
            return this.getInventoryDashboardFallback();
        }
    }

    // ==================== Helper Methods ====================

    private async getAdminKPIs() {
        if (window.electronAPI?.system?.getDashboardKPIs) {
            const data = await window.electronAPI.system.getDashboardKPIs();
            return {
                totalSales: data.sales || 0,
                netProfit: data.sales * 0.15 || 0, // Estimate 15% profit margin
                cashBalance: data.cash || 0,
                inventoryValue: data.sales * 0.3 || 0 // Estimate
            };
        }
        return { totalSales: 0, netProfit: 0, cashBalance: 0, inventoryValue: 0 };
    }

    private async getAdminCharts() {
        if (window.electronAPI?.system?.getDashboardCharts) {
            try {
                const data = await window.electronAPI.system.getDashboardCharts();
                // Ensure we have valid data, otherwise use fallback
                if (data && data.cashFlow && data.cashFlow.length > 0) {
                    return {
                        salesTrend: data.cashFlow.map((d: any) => ({ date: d.date, value: d.in_flow })),
                        revenueBreakdown: [
                            { name: 'مبيعات', value: 45000 },
                            { name: 'خدمات', value: 25000 },
                            { name: 'أخرى', value: 10000 }
                        ],
                        cashFlow: data.cashFlow
                    };
                }
            } catch (error) {
                console.error('Error fetching dashboard charts:', error);
            }
        }
        // Always return mock data as fallback
        return this.generateMockCharts();
    }

    private async getSalesKPIs() {
        if (window.electronAPI?.system?.getDashboardKPIs) {
            const data = await window.electronAPI.system.getDashboardKPIs();
            return {
                teamSales: data.sales || 0,
                monthlyTarget: 100000,
                newCustomers: 5,
                pendingQuotes: 8
            };
        }
        return { teamSales: 0, monthlyTarget: 100000, newCustomers: 0, pendingQuotes: 0 };
    }

    private async getSalesCharts() {
        if (window.electronAPI?.system?.getDashboardCharts) {
            const data = await window.electronAPI.system.getDashboardCharts();
            return {
                salesPerformance: data.cashFlow.map((d: any) => ({ date: d.date, value: d.in_flow })),
                topProducts: data.topProducts.map((p: any) => ({ name: p.name, qty: p.qty, value: p.qty * 100 }))
            };
        }
        return {
            salesPerformance: this.generateMockSalesTrend(),
            topProducts: this.generateMockTopProducts()
        };
    }

    private async getSalesTargets() {
        return [
            { label: 'مبيعات نقدية', achieved: 45000, goal: 60000, percentage: 75 },
            { label: 'مبيعات آجلة', achieved: 30000, goal: 50000, percentage: 60 },
            { label: 'تحصيل ديون', achieved: 15000, goal: 15000, percentage: 100 },
        ];
    }

    private async getFinancialKPIs() {
        if (window.electronAPI?.system?.getDashboardKPIs) {
            const data = await window.electronAPI.system.getDashboardKPIs();
            return {
                cashBalance: data.cash || 0,
                bankBalance: data.cash * 3 || 0, // Estimate
                receivables: data.sales * 0.4 || 0, // Estimate
                payables: data.sales * 0.25 || 0 // Estimate
            };
        }
        return { cashBalance: 0, bankBalance: 0, receivables: 0, payables: 0 };
    }

    private async getFinancialCharts() {
        if (window.electronAPI?.system?.getDashboardCharts) {
            const data = await window.electronAPI.system.getDashboardCharts();
            return {
                cashFlow: data.cashFlow,
                expensesRevenue: [
                    { category: 'رواتب', expenses: 25000, revenue: 0 },
                    { category: 'إيجارات', expenses: 10000, revenue: 0 },
                    { category: 'مبيعات', expenses: 0, revenue: 80000 },
                    { category: 'خدمات', expenses: 0, revenue: 30000 }
                ]
            };
        }
        return {
            cashFlow: this.generateMockCashFlow(),
            expensesRevenue: []
        };
    }

    private async getPendingCheques() {
        if (window.electronAPI?.cheques?.getCheques) {
            const cheques = await window.electronAPI.cheques.getCheques({ status: 'PENDING' });
            return cheques.slice(0, 5).map((c: any) => ({
                id: c.id,
                number: c.cheque_number,
                amount: c.amount,
                dueDate: c.due_date,
                customer: c.customer_name || 'غير محدد'
            }));
        }
        return [];
    }

    private async getRecentTransactions() {
        return [
            { type: 'in' as const, description: 'دفع فاتورة - شركة الأمل', amount: 5000, date: '10:30 AM', status: 'مودع' },
            { type: 'out' as const, description: 'فاتورة كهرباء', amount: 450, date: '09:15 AM', status: 'مدفوع' },
            { type: 'in' as const, description: 'مبيعات نقدية صباحية', amount: 1200, date: '11:00 AM', status: 'في الخزنة' },
            { type: 'out' as const, description: 'سداد مورد - مصنع الحديد', amount: 15000, date: 'أمس', status: 'شيك' },
        ];
    }

    private async getInventoryKPIs() {
        if (window.electronAPI?.system?.getDashboardKPIs) {
            const data = await window.electronAPI.system.getDashboardKPIs();
            return {
                totalItems: 1450,
                inventoryValue: data.sales * 0.3 || 450000,
                lowStockCount: data.lowStock || 0,
                pendingOrders: 5
            };
        }
        return { totalItems: 0, inventoryValue: 0, lowStockCount: 0, pendingOrders: 0 };
    }

    private async getInventoryCharts() {
        if (window.electronAPI?.system?.getDashboardCharts) {
            const data = await window.electronAPI.system.getDashboardCharts();
            return {
                stockMovement: data.cashFlow.map((d: any) => ({ date: d.date, in: d.in_flow / 100, out: d.out_flow / 100 })),
                topItems: data.topProducts.map((p: any) => ({ name: p.name, qty: p.qty, value: p.qty * 50 }))
            };
        }
        return {
            stockMovement: this.generateMockStockMovement(),
            topItems: this.generateMockTopProducts()
        };
    }

    private async getStockAlerts() {
        return [
            { id: '1', item: 'اسمنت بورتلاندي', current: 10, min: 50, status: 'critical' as const },
            { id: '2', item: 'حديد تسليح 12مم', current: 25, min: 30, status: 'warning' as const },
            { id: '3', item: 'رمل ناعم', current: 15, min: 20, status: 'warning' as const },
        ];
    }

    private async getRecentStockMovements() {
        return [
            { item: 'اسمنت بورتلاندي', type: 'out' as const, qty: 50, unit: 'كيس', reason: 'مبيعات #1023', time: 'منذ 10 د' },
            { item: 'حديد تسليح 12مم', type: 'in' as const, qty: 2, unit: 'طن', reason: 'شراء #PUR-501', time: 'منذ 1 س' },
            { item: 'رمل ناعم', type: 'out' as const, qty: 10, unit: 'متر', reason: 'صرف داخلي', time: 'منذ 3 س' },
        ];
    }

    public async getTopCustomers() {
        if (window.electronAPI?.reports?.getTopCustomers) {
            try {
                const data = await window.electronAPI.reports.getTopCustomers();
                if (data && data.length > 0) return data;
            } catch (error) {
                console.error('Error fetching top customers from backend:', error);
            }
        }

        // Fallback Mock Data
        return [
            { id: '1', name: 'شركة الأمل للتجارة', total: 125000, orders: 15, lastPurchase: '2026-01-14', avgValue: 8333 },
            { id: '2', name: 'مؤسسة البناء الحديث', total: 98000, orders: 12, lastPurchase: '2026-01-10', avgValue: 8166 },
            { id: '3', name: 'شركة المقاولات الكبرى', total: 87000, orders: 10, lastPurchase: '2025-12-28', avgValue: 8700 },
            { id: '4', name: 'مصنع الحديد والصلب', total: 76000, orders: 8, lastPurchase: '2026-01-05', avgValue: 9500 },
            { id: '5', name: 'شركة التوريدات العامة', total: 65000, orders: 9, lastPurchase: '2026-01-12', avgValue: 7222 },
            { id: '6', name: 'سوبرماركت المدينة', total: 54000, orders: 20, lastPurchase: '2026-01-15', avgValue: 2700 },
            { id: '7', name: 'مطاعم السعادة', total: 42000, orders: 18, lastPurchase: '2026-01-13', avgValue: 2333 },
            { id: '8', name: 'فندق الشاطئ', total: 38000, orders: 5, lastPurchase: '2025-12-30', avgValue: 7600 },
        ];
    }

    private async getRecentActivities() {
        return [
            { id: '1', type: 'invoice', title: 'تم إنشاء فاتورة مبيعات #INV-10023', description: 'العميل: شركة السلام للتجارة', time: 'منذ 5 دقائق', user: 'أحمد سلطان' },
            { id: '2', type: 'payment', title: 'استلام دفعة نقدية', description: 'دفعة من حساب عميل نقدي', time: 'منذ 15 دقيقة', user: 'سارة محمد' },
            { id: '3', type: 'system', title: 'اكتمال النسخ الاحتياطي', description: 'تم حفظ نسخة احتياطية بنجاح', time: 'منذ 1 ساعة', user: 'النظام' },
            { id: '4', type: 'login', title: 'تسجيل دخول', description: 'المدير العام', time: 'منذ 2 ساعة', user: 'Admin' },
        ];
    }

    // ==================== Mock Data Generators ====================

    private generateMockCharts() {
        return {
            salesTrend: this.generateMockSalesTrend(),
            revenueBreakdown: [
                { name: 'مبيعات', value: 45000 },
                { name: 'خدمات', value: 25000 },
                { name: 'أخرى', value: 10000 }
            ],
            cashFlow: this.generateMockCashFlow()
        };
    }

    private generateMockSalesTrend() {
        return Array.from({ length: 7 }, (_, i) => ({
            date: new Date(Date.now() - (6 - i) * 24 * 60 * 60 * 1000).toLocaleDateString('ar-EG', { weekday: 'short' }),
            value: Math.floor(Math.random() * 5000) + 3000
        }));
    }

    private generateMockCashFlow() {
        return Array.from({ length: 7 }, (_, i) => ({
            date: new Date(Date.now() - (6 - i) * 24 * 60 * 60 * 1000).toLocaleDateString('ar-EG', { weekday: 'short' }),
            in_flow: Math.floor(Math.random() * 5000) + 1000,
            out_flow: Math.floor(Math.random() * 3000) + 500
        }));
    }

    private generateMockTopProducts() {
        return [
            { name: 'منتج أ', qty: 400, value: 40000 },
            { name: 'منتج ب', qty: 300, value: 30000 },
            { name: 'منتج ج', qty: 250, value: 25000 },
            { name: 'منتج د', qty: 200, value: 20000 },
        ];
    }

    private generateMockStockMovement() {
        return Array.from({ length: 7 }, (_, i) => ({
            date: new Date(Date.now() - (6 - i) * 24 * 60 * 60 * 1000).toLocaleDateString('ar-EG', { weekday: 'short' }),
            in: Math.floor(Math.random() * 50) + 10,
            out: Math.floor(Math.random() * 40) + 5
        }));
    }

    // ==================== Fallback Data ====================

    private getAdminDashboardFallback(): AdminDashboardData {
        return {
            kpis: { totalSales: 125000, netProfit: 18750, cashBalance: 45000, inventoryValue: 37500 },
            charts: this.generateMockCharts(),
            topCustomers: [],
            activities: []
        };
    }

    private getSalesDashboardFallback(): SalesDashboardData {
        return {
            kpis: { teamSales: 85000, monthlyTarget: 100000, newCustomers: 5, pendingQuotes: 8 },
            charts: {
                salesPerformance: this.generateMockSalesTrend(),
                topProducts: this.generateMockTopProducts()
            },
            targets: this.getSalesTargets() as any
        };
    }

    private getFinancialDashboardFallback(): FinancialDashboardData {
        return {
            kpis: { cashBalance: 45000, bankBalance: 135000, receivables: 50000, payables: 31250 },
            charts: {
                cashFlow: this.generateMockCashFlow(),
                expensesRevenue: []
            },
            pendingCheques: [],
            recentTransactions: []
        };
    }

    private getInventoryDashboardFallback(): InventoryDashboardData {
        return {
            kpis: { totalItems: 1450, inventoryValue: 450000, lowStockCount: 5, pendingOrders: 3 },
            charts: {
                stockMovement: this.generateMockStockMovement(),
                topItems: this.generateMockTopProducts()
            },
            stockAlerts: [],
            recentMovements: []
        };
    }
}

export const dashboardService = new DashboardService();
