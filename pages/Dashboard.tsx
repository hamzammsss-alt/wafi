import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { RefreshCw, Settings, Bell, Search, Layout, Calendar, Sparkles } from 'lucide-react';
import { authService } from '../services/authService';
import { dashboardService } from '../services/dashboardService';
import {
  AdminDashboard,
  SalesDashboard,
  FinancialDashboard,
  InventoryDashboard
} from '../components/dashboard/RoleDashboards';
import { useTabs } from '../src/contexts/TabsContext';

// --- BENTO HEADER ---
const DashboardHeader: React.FC<{ user: any; onRefresh: () => void; loading: boolean }> = ({ user, onRefresh, loading }) => {
  const roleName = authService.getRoleDisplayName();
  const navigate = useNavigate();
  const { openTab } = useTabs();
  const [searchQuery, setSearchQuery] = React.useState('');
  const [showSearchResults, setShowSearchResults] = React.useState(false);

  const handleSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      // يمكن توسيع هذا لاحقاً للبحث في صفحات محددة
      navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
      setSearchQuery('');
      setShowSearchResults(false);
    }
  };

  return (
    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8 px-2">
      <div>
        <div className="flex items-center gap-2 mb-3">
          <span className="px-3 py-1 bg-white border border-slate-200 rounded-full text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 shadow-sm">
            <Layout size={12} />
            {roleName}
          </span>
          <span className="px-3 py-1 bg-white border border-slate-200 rounded-full text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 shadow-sm">
            <Calendar size={12} />
            {new Date().toLocaleDateString('ar-EG', { day: 'numeric', month: 'long' })}
          </span>
        </div>
        <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight leading-tight">
          صباح الخير، <span className="text-indigo-600">{user?.username}</span>
        </h1>
      </div>

      <div className="flex items-center gap-3">
        {/* WAFI AI Button */}
        <button
          onClick={() => openTab({ id: '/wafi-ai', path: '/wafi-ai', title: 'مساعد WAFI', isClosable: true })}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-2xl shadow-lg shadow-indigo-200 hover:shadow-indigo-300 transition-all hover:-translate-y-0.5"
        >
          <Sparkles size={18} className="text-indigo-100" />
          <span className="text-sm font-bold">مساعد WAFI</span>
        </button>

        <div className="relative group">
          <Search size={18} className="absolute top-1/2 right-3 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
          <input
            type="text"
            placeholder="بحث سريع..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleSearch}
            onFocus={() => setShowSearchResults(true)}
            onBlur={() => setTimeout(() => setShowSearchResults(false), 200)}
            className="pl-4 pr-10 py-2.5 bg-white border border-slate-200 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 w-64 shadow-sm transition-all"
          />
          {showSearchResults && searchQuery && (
            <div className="absolute top-full mt-2 right-0 w-full bg-white border border-slate-200 rounded-xl shadow-lg z-50 p-2">
              <div className="text-xs text-slate-400 px-3 py-2">
                اضغط Enter للبحث عن "{searchQuery}"
              </div>
            </div>
          )}
        </div>

        <button
          onClick={onRefresh}
          disabled={loading}
          className="p-2.5 bg-white text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 border border-slate-200 rounded-2xl transition-all shadow-sm active:scale-95 disabled:opacity-50"
        >
          <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>
    </div>
  );
};

// Main Dashboard Component
export const Dashboard = () => {
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleWafiAiClick = () => {
    navigate('/wafi-ai');
  };

  const user = authService.getCurrentUser();
  const dashboardType = authService.getDashboardType();

  useEffect(() => {
    loadDashboardData();
  }, [dashboardType]);

  const loadDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      let data;
      switch (dashboardType) {
        case 'admin': data = await dashboardService.getAdminDashboardData(); break;
        case 'sales': case 'sales-rep': data = await dashboardService.getSalesDashboardData(); break;
        case 'financial': case 'treasury': case 'accounting': data = await dashboardService.getFinancialDashboardData(); break;
        case 'inventory': data = await dashboardService.getInventoryDashboardData(); break;
        default: data = await dashboardService.getAdminDashboardData();
      }
      setDashboardData(data);
    } catch (err) {
      console.error('Error loading dashboard:', err);
      setError('فشل تحميل بيانات الداشبورد');
    } finally {
      setLoading(false);
    }
  };

  const renderDashboard = () => {
    if (loading) {
      return (
        <div className="h-96 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-10 h-10 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
          </div>
        </div>
      );
    }

    if (error || !dashboardData) {
      return (
        <div className="h-96 flex flex-col items-center justify-center bg-white rounded-3xl border border-dashed border-slate-200 mx-2">
          <p className="text-slate-500 mb-4 font-medium">{error || 'لا توجد بيانات'}</p>
          <button onClick={loadDashboardData} className="px-6 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-slate-800 transition-all">إعادة المحاولة</button>
        </div>
      );
    }

    const commonProps = { data: dashboardData, navigate };

    switch (dashboardType) {
      case 'admin': return <AdminDashboard {...commonProps} />;
      case 'sales': case 'sales-rep': return <SalesDashboard {...commonProps} />;
      case 'financial': case 'treasury': case 'accounting': return <FinancialDashboard {...commonProps} />;
      case 'inventory': return <InventoryDashboard {...commonProps} />;
      default: return <AdminDashboard {...commonProps} />;
    }
  };

  return (
    <div className="min-h-full w-full bg-[#f1f5f9] font-sans" dir="rtl">
      <div className="max-w-[1600px] mx-auto p-6 md:p-10">
        <DashboardHeader user={user} onRefresh={loadDashboardData} loading={loading} />
        {renderDashboard()}
      </div>
    </div>
  );
};
