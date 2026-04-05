import React, { useState, useEffect } from 'react';
import { Plus, Banknote, FileText, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTabs } from '../../../src/contexts/TabsContext';

export const PaymentVoucherList = () => {
    const [vouchers, setVouchers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const navigate = useNavigate();
    const { navigateInTab } = useTabs();
    const api = (window as any).electronAPI?.treasury;

    useEffect(() => {
        loadVouchers();
    }, []);

    const loadVouchers = async () => {
        if (!api) return;
        setLoading(true);
        try {
            const data = await api.getPayments();
            setVouchers(data || []);
        } catch (error) {
            console.error("Failed to load payment vouchers", error);
        } finally {
            setLoading(false);
        }
    };

    const filteredVouchers = vouchers.filter(v =>
        (v.voucher_no && v.voucher_no.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (v.payee_name && v.payee_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (v.description && v.description.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
        <div className="p-6 bg-[#f8fafc] h-full flex flex-col gap-6" dir="rtl">
            {/* Header */}
            <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-rose-50 text-rose-600 rounded-lg">
                        <Banknote size={24} />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-slate-800">سندات الصرف</h1>
                        <p className="text-xs text-slate-500">إدارة المدفوعات والمصاريف</p>
                    </div>
                </div>
                <button
                    onClick={() => navigateInTab('/treasury/payment/new', 'سند صرف جديد')}
                    className="bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 shadow-sm transition-colors"
                >
                    <Plus size={18} /> سند صرف جديد
                </button>
            </div>

            {/* Filters & Search */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex gap-4">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute right-3 top-2.5 text-slate-400" size={20} />
                    <input
                        type="text"
                        placeholder="بحث برقم السند، الاسم، أو البيان..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pr-10 pl-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
                    />
                </div>
            </div>

            {/* List */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 flex-1 overflow-hidden flex flex-col">
                <div className="overflow-auto flex-1 custom-scrollbar">
                    <table className="w-full text-right">
                        <thead className="bg-slate-50 text-slate-600 font-bold text-xs sticky top-0 z-10">
                            <tr>
                                <th className="p-3 border-b border-slate-100">رقم السند</th>
                                <th className="p-3 border-b border-slate-100">الحالة</th>
                                <th className="p-3 border-b border-slate-100">المستفيد</th>
                                <th className="p-3 border-b border-slate-100">التاريخ</th>
                                <th className="p-3 border-b border-slate-100">البيان</th>
                                <th className="p-3 border-b border-slate-100">المبلغ</th>
                                <th className="p-3 border-b border-slate-100 text-center">العملة</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {loading ? (
                                <tr>
                                    <td colSpan={7} className="text-center p-8 text-slate-500">جاري التحميل...</td>
                                </tr>
                            ) : filteredVouchers.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="text-center p-12 text-slate-400 flex flex-col items-center justify-center">
                                        <FileText size={48} className="mb-2 opacity-20" />
                                        <p>لا توجد سندات صرف</p>
                                    </td>
                                </tr>
                            ) : (
                                filteredVouchers.map(v => (
                                    <tr
                                        key={v.id}
                                        className="hover:bg-slate-50 cursor-pointer transition-colors group"
                                        onClick={() => navigateInTab(`/treasury/payment/${v.id}`, `سند صرف ${v.voucher_no}`)}
                                    >
                                        <td className="p-3 font-mono text-rose-600 font-bold group-hover:text-rose-700">
                                            {v.voucher_no}
                                        </td>
                                        <td className="p-3">
                                            <span className={`px-2 py-1 rounded text-[10px] font-bold 
                                                ${v.status === 'POSTED' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}
                                            `}>
                                                {v.status === 'POSTED' ? 'مرحل' : v.status}
                                            </span>
                                        </td>
                                        <td className="p-3 font-medium text-slate-700">{v.payee_name || '-'}</td>
                                        <td className="p-3 text-slate-500 font-mono text-xs">{v.date}</td>
                                        <td className="p-3 text-slate-500 text-sm max-w-[300px] truncate" title={v.description}>
                                            {v.description}
                                        </td>
                                        <td className="p-3 font-bold text-slate-800 font-mono">
                                            {Number(v.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </td>
                                        <td className="p-3 text-center text-xs text-slate-500">{v.currency_id}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
