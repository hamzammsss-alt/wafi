import apiClient from './apiClient';

interface LoginResponse {
    token: string;
    user: {
        username: string;
        email: string;
        role: string;
        tenantId: string;
    }
}

class AuthService {
    // Permission Mapping (Frontend Mirror of Backend)
    // In a real app, this should come from the DB on login.
    private permissions: Record<string, string[]> = {
        'المدير العام': ['ALL'],
        'مسؤول النظام': ['ALL'],
        'المدير المالي': ['Financials', 'Banks', 'Budgets', 'Reports', 'Treasury'],
        'مدير المبيعات': ['Sales', 'Customers', 'Reports'],
        'مدير المشتريات': ['Purchasing', 'Suppliers', 'Reports', 'PURCHASE_PR_APPROVE', 'PURCHASE_PO_APPROVE'],
        'أمين المستودع': ['Inventory', 'Stock Count'],
        'أمين الصندوق': ['Treasury', 'Cash', 'Financials'],
        'محاسب رئيسي': ['Financials', 'Entries', 'Reports'],
        'مدير التدقيق': ['Financials', 'Reports', 'Auditing'],
        'مندوب مبيعات': ['Sales', 'Sales (Own)', 'Customers (Own)'],
        'مدير الموارد البشرية': ['HR', 'Salaries'],
        'مدير الإنتاج': ['Manufacturing', 'Inventory'],
    };

    // Widget-level permissions for each role
    private roleWidgets: Record<string, string[]> = {
        'المدير العام': ['all'],
        'مسؤول النظام': ['all'],
        'المدير المالي': [
            'cash-balance', 'bank-accounts', 'receivables', 'payables',
            'cash-flow', 'expenses-revenue', 'pending-cheques', 'recent-transactions',
            'budget-alerts', 'financial-kpis', 'treasury-summary'
        ],
        'مدير المبيعات': [
            'team-sales', 'monthly-target', 'new-customers', 'pending-quotes',
            'sales-performance', 'sales-targets', 'top-products', 'customer-list',
            'sales-pipeline', 'team-performance'
        ],
        'مندوب مبيعات': [
            'my-sales', 'my-commission', 'my-customers', 'my-visits',
            'my-targets', 'my-quotes', 'my-performance'
        ],
        'أمين المستودع': [
            'total-items', 'inventory-value', 'low-stock', 'pending-orders',
            'stock-movement', 'top-items', 'stock-alerts', 'recent-movements',
            'warehouse-summary'
        ],
        'أمين الصندوق': [
            'cash-balance', 'daily-receipts', 'daily-payments', 'pending-cheques',
            'cash-transactions', 'cash-summary'
        ],
        'محاسب رئيسي': [
            'recent-entries', 'trial-balance', 'financial-reports', 'pending-documents',
            'bank-reconciliation', 'account-balances'
        ],
        'مدير المشتريات': [
            'purchase-orders', 'supplier-payments', 'pending-invoices', 'top-suppliers',
            'purchase-analysis', 'supplier-performance'
        ],
        'مدير الموارد البشرية': [
            'employee-count', 'attendance-summary', 'payroll-pending', 'leave-requests',
            'performance-reviews', 'hr-analytics'
        ],
        'مدير الإنتاج': [
            'production-orders', 'material-consumption', 'production-efficiency',
            'work-in-progress', 'quality-metrics'
        ],
    };

    async login(username: string, password: string): Promise<LoginResponse> {
        // Hybrid Logic: Check for Electron IPC first
        if (window.electronAPI && window.electronAPI.auth) {
            try {
                const user = await window.electronAPI.auth.login({ username, password });
                const token = 'mock-jwt-token-' + Date.now();

                // Store session in sessionStorage (Auto-logout on close)
                sessionStorage.setItem('token', token);
                sessionStorage.setItem('user', JSON.stringify(user));

                return {
                    token,
                    user: {
                        username: user.username,
                        email: user.email || '',
                        role: user.role_name || 'User',
                        tenantId: '1'
                    }
                };
            } catch (error) {
                console.error("Electron Login Failed:", error);
                throw error;
            }
        }

        // Fallback to API (Web Mode)
        try {
            const response = await apiClient.post<LoginResponse>('/auth/login', { username, password });
            if (response.data && response.data.token) {
                sessionStorage.setItem('token', response.data.token);
                sessionStorage.setItem('user', JSON.stringify(response.data.user));
            }
            return response.data;
        } catch (error) {
            console.error("API Login Failed:", error);
            throw error;
        }
    }

    logout() {
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('user');
        sessionStorage.clear();
        // window.location.reload(); // Handled by caller usually
    }

    getCurrentUser() {
        const userStr = sessionStorage.getItem('user');
        return userStr ? JSON.parse(userStr) : null;
    }

    isAuthenticated(): boolean {
        return !!sessionStorage.getItem('token');
    }

    hasPermission(requiredPermission: string): boolean {
        const user = this.getCurrentUser();
        if (!user || !user.role_name) return false;

        const roleName = user.role_name;
        // Admins have all permissions
        if (roleName === 'المدير العام' || roleName === 'مسؤول النظام' || roleName === 'Admin') return true;

        // Check explicit permissions
        const userPermissions = this.permissions[roleName] || [];
        if (userPermissions.includes('ALL')) return true;

        return userPermissions.includes(requiredPermission);
    }

    /**
     * Get available widgets for a specific role
     */
    getAvailableWidgets(roleName?: string): string[] {
        const role = roleName || this.getCurrentUser()?.role_name;
        if (!role) return [];

        // Admins can see all widgets
        if (role === 'المدير العام' || role === 'مسؤول النظام' || role === 'Admin') {
            return ['all'];
        }

        return this.roleWidgets[role] || [];
    }

    /**
     * Check if current user can view a specific widget
     */
    canViewWidget(widgetId: string): boolean {
        const widgets = this.getAvailableWidgets();
        return widgets.includes('all') || widgets.includes(widgetId);
    }

    /**
     * Get dashboard type for current user
     */
    getDashboardType(): 'admin' | 'sales' | 'sales-rep' | 'financial' | 'inventory' | 'treasury' | 'accounting' | 'purchasing' | 'hr' | 'manufacturing' | 'default' {
        const user = this.getCurrentUser();
        if (!user || !user.role_name) return 'default';

        const roleName = user.role_name;

        // Admin dashboard
        if (roleName === 'المدير العام' || roleName === 'مسؤول النظام' || roleName === 'Admin') {
            return 'admin';
        }

        // Sales dashboards
        if (roleName === 'مدير المبيعات') return 'sales';
        if (roleName === 'مندوب مبيعات') return 'sales-rep';

        // Financial dashboards
        if (roleName === 'المدير المالي') return 'financial';
        if (roleName === 'أمين الصندوق') return 'treasury';
        if (roleName === 'محاسب رئيسي') return 'accounting';

        // Inventory dashboard
        if (roleName === 'أمين المستودع') return 'inventory';

        // Other dashboards
        if (roleName === 'مدير المشتريات') return 'purchasing';
        if (roleName === 'مدير الموارد البشرية') return 'hr';
        if (roleName === 'مدير الإنتاج') return 'manufacturing';

        return 'default';
    }

    /**
     * Get user's role display name
     */
    getRoleDisplayName(): string {
        const user = this.getCurrentUser();
        return user?.role_name || 'ضيف';
    }
}

export const authService = new AuthService();
