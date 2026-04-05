import React, { useState, useEffect } from 'react';
import { RefreshCw, ArrowRightCircle, CheckCircle, XCircle, Building, Filter, LayoutGrid, List } from 'lucide-react';
import { format } from 'date-fns';

export const CheckPortfolio = () => {
    const [activeTab, setActiveTab] = useState('Holding'); // Holding, Deposited, Collected, Bounced
    const [checks, setChecks] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

    // Stats for tabs
    const [stats, setStats] = useState({ holding: 0, deposited: 0, cleared: 0, bounced: 0 });

    useEffect(() => {
        loadChecks();
    }, [activeTab]);

    const loadChecks = async () => {
        // @ts-ignore
        if (window.electronAPI) {
            setLoading(true);
            try {
                // @ts-ignore
                const data = await window.electronAPI.getChecks(activeTab);
                setChecks(data || []);

                // Ideally stats should come from a summary API, but for now we trust the tabs load
                // Or we mock them
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        }
    };

    const handleAction = async (checkId: number | string, action: string) => {
        const check = checks.find(c => c.id === checkId);
        if (!check) return;

        let confirmMsg = "هل أنت متأكد من تنفيذ العملية؟";
        let targetStatus = action;

        if (action === 'Deposited') confirmMsg = `إيداع الشيك رقم ${check.check_number} في البنك؟`;
        if (action === 'Cleared') confirmMsg = `تحصيل الشيك رقم ${check.check_number}؟`;
        if (action === 'Bounced') confirmMsg = `إرجاع الشيك رقم ${check.check_number}؟`;

        if (!confirm(confirmMsg)) return;

        // In reality, pop up a modal to select the specific Bank Account
        // Here we default to a "Main Bank" ID if not provided. logic in Service handles it or needs it.
        // We will send a default Bank ID '1112' (Arab Bank) for demo.
        const bankId = 'transactional-bank-id';

        try {
            // @ts-ignore
            await window.electronAPI.updateCheckStatus({
                checkId,
                newStatus: targetStatus,
                bankAccountId: bankId,
                date: new Date().toISOString().split('T')[0]
            });
            alert("تمت العملية بنجاح!");
            loadChecks(); // Refresh
        } catch (err: any) {
            alert("خطأ: " + err.message);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Holding': return 'bg-blue-100 text-blue-800';
            case 'Deposited': return 'bg-yellow-100 text-yellow-800';
            case 'Collected': return 'bg-green-100 text-green-800';
            case 'Bounced': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    return (
        <div className="flex flex-col h-full bg-[#f0f2f5] p-4 font-sans" dir="rtl">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                    <Building className="text-blue-600" /> إدارة حافظة الشيكات
                </h1>
                <div className="flex gap-2">
                    <button onClick={() => setViewMode('grid')} className={`p-2 rounded ${viewMode === 'grid' ? 'bg-white shadow text-blue-600' : 'text-gray-400'}`}><LayoutGrid size={20} /></button>
                    <button onClick={() => setViewMode('list')} className={`p-2 rounded ${viewMode === 'list' ? 'bg-white shadow text-blue-600' : 'text-gray-400'}`}><List size={20} /></button>
                </div>
            </div>

            {/* 1. Tabs */}
            <div className="flex bg-white p-1 rounded-xl border border-gray-200 w-fit mb-6 shadow-sm mx-auto">
                <TabButton label="شيكات في الصندوق" count={stats.holding} active={activeTab === 'Holding'} onClick={() => setActiveTab('Holding')} />
                <TabButton label="برسم التحصيل" count={stats.deposited} active={activeTab === 'Deposited'} onClick={() => setActiveTab('Deposited')} />
                <TabButton label="شيكات محصلة" count={stats.cleared} active={activeTab === 'Collected'} onClick={() => setActiveTab('Collected')} />
                <TabButton label="شيكات راجعة" count={stats.bounced} active={activeTab === 'Bounced'} onClick={() => setActiveTab('Bounced')} color="text-red-600" />
            </div>

            {/* 2. Content */}
            <div className="flex-1 overflow-auto">
                {loading ? (
                    <div className="flex justify-center items-center h-64 text-gray-400">جاري التحميل...</div>
                ) : checks.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-gray-400 bg-white rounded-xl border border-dashed border-gray-300">
                        <Filter size={48} className="mb-2 opacity-50" />
                        <p>لا توجد شيكات في هذه القائمة</p>
                    </div>
                ) : (
                    <div className={viewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" : "flex flex-col gap-2"}>
                        {checks.map((check) => (
                            <div key={check.id} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm hover:shadow-md transition group relative overflow-hidden">
                                <div className={`absolute top-0 right-0 w-1 h-full ${getStatusColor(check.status).split(' ')[0].replace('bg-', 'bg-')}`}></div>

                                <div className="flex justify-between items-start mb-3">
                                    <div>
                                        <div className="text-xs text-gray-500 mb-1">رقم الشيك</div>
                                        <div className="font-mono font-bold text-lg text-gray-800">{check.check_number}</div>
                                    </div>
                                    <div className={`px-2 py-1 rounded text-xs font-bold ${getStatusColor(check.status)}`}>
                                        {check.status === 'Holding' ? 'في الصندوق' :
                                            check.status === 'Deposited' ? 'برسم التحصيل' :
                                                check.status === 'Collected' ? 'محصل' : 'راجع'}
                                    </div>
                                </div>

                                <div className="flex justify-between items-center mb-4">
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 font-bold">
                                            {check.bank_name ? check.bank_name.substring(0, 2) : 'BK'}
                                        </div>
                                        <div>
                                            <div className="text-xs text-gray-500">البنك</div>
                                            <div className="text-sm font-bold text-gray-700">{check.bank_name}</div>
                                        </div>
                                    </div>
                                    <div className="text-left">
                                        <div className="text-xs text-gray-500">تاريخ الاستحقاق</div>
                                        <div className="font-mono text-sm font-bold text-red-600">{check.due_date}</div>
                                    </div>
                                </div>

                                <div className="border-t border-gray-100 pt-3 flex justify-between items-center">
                                    <div>
                                        <div className="text-xs text-gray-500">المبلغ</div>
                                        <div className="font-mono font-black text-xl text-gray-800">{Number(check.amount).toFixed(2)} <span className="text-xs text-gray-400">ILS</span></div>
                                    </div>
                                </div>
                                <div className="mt-2 text-xs text-gray-500 truncate">
                                    من: {check.customer_name || 'غير محدد'}
                                </div>

                                {/* Actions Base on Status */}
                                <div className="mt-4 flex gap-2 pt-2 border-t border-gray-50 opacity-100">
                                    {/* Always visible for ease users don't like hidden actions usually */}
                                    {activeTab === 'Holding' && (
                                        <button onClick={() => handleAction(check.id, 'Deposited')} className="flex-1 bg-blue-50 text-blue-700 hover:bg-blue-100 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition">
                                            <ArrowRightCircle size={16} /> إيداع
                                        </button>
                                    )}
                                    {activeTab === 'Deposited' && (
                                        <>
                                            <button onClick={() => handleAction(check.id, 'Cleared')} className="flex-1 bg-green-50 text-green-700 hover:bg-green-100 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition">
                                                <CheckCircle size={16} /> تحصيل
                                            </button>
                                            <button onClick={() => handleAction(check.id, 'Bounced')} className="flex-1 bg-red-50 text-red-700 hover:bg-red-100 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition">
                                                <XCircle size={16} /> إرجاع
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

const TabButton = ({ label, count, active, onClick, color = 'text-gray-600' }: any) => (
    <button
        onClick={onClick}
        className={`px-6 py-2 text-sm font-bold rounded-lg transition-all flex flex-col items-center gap-1 ${active ? 'bg-blue-50 text-blue-700 shadow-inner' : `hover:bg-gray-50 ${color}`}`}
    >
        <span>{label}</span>
        {/* <span className={`text-xs px-2 py-0.5 rounded-full ${active ? 'bg-blue-200 text-blue-800' : 'bg-gray-100 text-gray-500'}`}>{count || 0}</span> */}
    </button>
);
