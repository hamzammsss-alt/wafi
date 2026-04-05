import React, { useState, useEffect } from 'react';
import { Filter, Search, CreditCard, ArrowRight, CheckCircle, XCircle, ArrowUpRight, Building } from 'lucide-react';

// Terminology from SRS:
// Received: وارد (في الصندوق)
// Under Collection: برسم التحصيل (في البنك)
// Cleared: محصل (نزل في الحساب)
// Bounced: راجع (مرفوض)
// Endorsed: مجير (مدفوع لمورد)

const MOCK_CHEQUES = [
    { id: 1, number: '1001', bank: 'البنك العربي', amount: 5000, due_date: '2024-02-15', customer: 'شركة الهدى', status: 'RECEIVED' },
    { id: 2, number: '1002', bank: 'بنك فلسطين', amount: 2500, due_date: '2024-01-20', customer: 'مؤسسة النور', status: 'UNDER_COLLECTION' },
    { id: 3, number: '1003', bank: 'بنك القاهرة عمان', amount: 12000, due_date: '2023-12-30', customer: 'سوبر ماركت القدس', status: 'BOUNCED' },
    { id: 4, number: '1004', bank: 'البنك الإسلامي', amount: 750, due_date: '2024-01-15', customer: 'بقالة الأمانة', status: 'CLEARED' },
    { id: 5, number: '1005', bank: 'القدس', amount: 3200, due_date: '2024-03-01', customer: 'شركة المقاولات', status: 'ENDORSED', endorsed_to: 'شركة الحديد الصلب' },
];

export const ChequesIn = () => {
    const [cheques, setCheques] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('ALL');
    const [selectedIds, setSelectedIds] = useState<number[]>([]);

    useEffect(() => {
        loadCheques();
    }, []);

    const loadCheques = async () => {
        try {
            setLoading(true);
            const result = await window.electronAPI.cheques.get({ type: 'INCOMING' });
            setCheques(result || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const filtered = activeTab === 'ALL' ? cheques : cheques.filter(c => c.status === activeTab);

    // Stats
    const totalAmount = filtered.reduce((sum, c) => sum + (c.amount || 0), 0);
    const count = filtered.length;

    // Actions
    const handleStatusChange = async (id: number, newStatus: string) => {
        if (!confirm('هل أنت متأكد من تغيير حالة الشيك؟')) return;

        // For Endorse/Deposit/Clear we might need more info (Bank Account, Vendor). 
        // For now we implement basic switching.
        // A real app would show a modal here.
        let options: any = {};

        if (newStatus === 'CLEARED' || newStatus === 'UNDER_COLLECTION') {
            // Ideally prompt for Bank Account
            // options.bankAccountId = ...
        }

        try {
            await window.electronAPI.cheques.updateStatus({
                id: id.toString(),
                status: newStatus,
                date: new Date().toISOString().split('T')[0],
                options
            });
            loadCheques(); // Refresh
        } catch (err: any) {
            alert("خطأ: " + err.message);
        }
    };

    const handleBulkAction = async (actionLabel: string) => {
        if (!confirm(`هل أنت متأكد من تنفيذ "${actionLabel}" على ${selectedIds.length} شيكات؟`)) return;

        let newStatus = '';
        if (actionLabel === 'إيداع في البنك') newStatus = 'UNDER_COLLECTION';
        if (actionLabel === 'تجيير لمورد') newStatus = 'ENDORSED';
        if (actionLabel === 'تحصيل نهائي') newStatus = 'CLEARED';
        if (actionLabel === 'إرجاع (شيك راجع)') newStatus = 'BOUNCED';

        if (!newStatus) return;

        setLoading(true);
        try {
            // Execute sequentially or in parallel
            for (const id of selectedIds) {
                await window.electronAPI.cheques.updateStatus({
                    id: id.toString(),
                    status: newStatus,
                    date: new Date().toISOString().split('T')[0]
                });
            }
            alert('تم العملية بنجاح');
            setSelectedIds([]);
            loadCheques();
        } catch (err: any) {
            alert("حدث خطأ: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    const toggleSelect = (id: number) => {
        if (selectedIds.includes(id)) setSelectedIds(selectedIds.filter(i => i !== id));
        else setSelectedIds([...selectedIds, id]);
    };

    const StatusBadge = ({ status }: { status: string }) => {
        const styles: any = {
            RECEIVED: 'bg-blue-100 text-blue-800 border-blue-200',
            UNDER_COLLECTION: 'bg-yellow-100 text-yellow-800 border-yellow-200',
            CLEARED: 'bg-emerald-100 text-emerald-800 border-emerald-200',
            BOUNCED: 'bg-red-100 text-red-800 border-red-200',
            ENDORSED: 'bg-purple-100 text-purple-800 border-purple-200'
        };
        const labels: any = {
            RECEIVED: 'وارد (بالصندوق)',
            UNDER_COLLECTION: 'برسم التحصيل',
            CLEARED: 'محصل (في البنك)',
            BOUNCED: 'راجع (مرفوض)',
            ENDORSED: 'مجيّر (Endorsed)'
        };
        return <span className={`px-2 py-1 rounded-full text-xs font-bold border ${styles[status] || 'bg-gray-100'}`}>{labels[status] || status}</span>;
    };

    return (
        <div className="p-6 bg-[#f8fafc] h-full flex flex-col font-cairo" dir="rtl">

            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold flex items-center gap-2 text-gray-800">
                    <CreditCard className="text-indigo-600" /> حافظة الشيكات الواردة
                </h1>
                <div className="flex gap-4">
                    <div className="bg-white px-4 py-2 rounded-lg border shadow-sm flex flex-col items-center">
                        <span className="text-xs text-gray-400 font-bold">عدد الشيكات</span>
                        <span className="font-bold text-lg">{count}</span>
                    </div>
                    <div className="bg-white px-4 py-2 rounded-lg border shadow-sm flex flex-col items-center min-w-[150px]">
                        <span className="text-xs text-gray-400 font-bold">المجموع</span>
                        <span className="font-bold text-lg text-emerald-600">{totalAmount.toLocaleString()}</span>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 border-b border-gray-200 mb-4 overflow-x-auto pb-1">
                {[
                    { id: 'ALL', label: 'الكل' },
                    { id: 'RECEIVED', label: 'وارد (Wait)' },
                    { id: 'UNDER_COLLECTION', label: 'برسم التحصيل' },
                    { id: 'CLEARED', label: 'محصل (Done)' },
                    { id: 'BOUNCED', label: 'راجع (Bounced)' },
                    { id: 'ENDORSED', label: 'مجيّر (Endorsed)' },
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`px-5 py-2 whitespace-nowrap font-bold text-sm transition-all rounded-t-lg
                        ${activeTab === tab.id
                                ? 'bg-white text-indigo-700 border-b-2 border-indigo-600 shadow-sm'
                                : 'text-gray-500 hover:bg-gray-100'}`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Bulk Actions (Contextual) */}
            {selectedIds.length > 0 && (
                <div className="bg-indigo-50 p-3 rounded-lg border border-indigo-100 flex items-center justify-between mb-4 animate-fade-in-down">
                    <span className="text-indigo-800 font-bold text-sm">تم تحديد {selectedIds.length} شيك</span>
                    <div className="flex gap-2">
                        {activeTab === 'RECEIVED' && (
                            <>
                                <button onClick={() => handleBulkAction('إيداع في البنك')} className="bg-white text-indigo-700 px-3 py-1 rounded border shadow-sm text-sm font-bold hover:bg-yellow-50">إيداع (Deposit)</button>
                                <button onClick={() => handleBulkAction('تجيير لمورد')} className="bg-white text-purple-700 px-3 py-1 rounded border shadow-sm text-sm font-bold hover:bg-purple-50">تجيير (Endorse)</button>
                            </>
                        )}
                        {activeTab === 'UNDER_COLLECTION' && (
                            <>
                                <button onClick={() => handleBulkAction('تحصيل نهائي')} className="bg-emerald-600 text-white px-3 py-1 rounded shadow-sm text-sm font-bold hover:bg-emerald-700">تحصيل (Clear)</button>
                                <button onClick={() => handleBulkAction('إرجاع (شيك راجع)')} className="bg-red-600 text-white px-3 py-1 rounded shadow-sm text-sm font-bold hover:bg-red-700">تحويل لراجع (Bounce)</button>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex-1 overflow-auto">
                <table className="w-full text-right">
                    <thead className="bg-gray-50 text-xs font-bold text-gray-600 uppercase">
                        <tr>
                            <th className="p-4 w-10">
                                <input type="checkbox" />
                            </th>
                            <th className="p-4">رقم الشيك</th>
                            <th className="p-4">البنك المسحوب عليه</th>
                            <th className="p-4">المبلغ</th>
                            <th className="p-4">تاريخ الاستحقاق</th>
                            <th className="p-4">العميل (المصدر)</th>
                            <th className="p-4">الحالة</th>
                            <th className="p-4">إجراءات سريعة</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {loading ? <tr><td colSpan={8} className="p-8 text-center bg-gray-50">جاري التحميل...</td></tr> :
                            filtered.map(c => (
                                <tr key={c.id} className={`hover:bg-gray-50 group transition ${selectedIds.includes(c.id) ? 'bg-indigo-50/40' : ''}`}>
                                    <td className="p-4">
                                        <input
                                            type="checkbox"
                                            checked={selectedIds.includes(c.id)}
                                            onChange={() => toggleSelect(c.id)}
                                        />
                                    </td>
                                    <td className="p-4 font-mono font-bold text-gray-800">{c.cheque_no}</td>
                                    <td className="p-4 text-sm">{c.bank_name || c.bank}</td>
                                    <td className="p-4 font-bold text-emerald-700">{Number(c.amount).toLocaleString()}</td>
                                    <td className="p-4 font-mono text-sm">{c.cheque_date || c.due_date}</td>
                                    <td className="p-4 font-bold text-gray-700 text-sm">{c.partner_name || c.payee_name || '-'}</td>
                                    <td className="p-4">
                                        <StatusBadge status={c.status} />
                                        {c.status === 'ENDORSED' && (
                                            <div className="text-[10px] text-purple-600 mt-1">إلى: {c.endorsed_to}</div>
                                        )}
                                    </td>
                                    <td className="p-4">
                                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            {c.status === 'RECEIVED' && (
                                                <>
                                                    <button onClick={() => handleStatusChange(c.id, 'UNDER_COLLECTION')} title="إيداع في البنك" className="p-1.5 bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200"><Building size={16} /></button>
                                                    <button onClick={() => handleStatusChange(c.id, 'ENDORSED')} title="تجيير لمورد" className="p-1.5 bg-purple-100 text-purple-700 rounded hover:bg-purple-200"><ArrowRight size={16} /></button>
                                                </>
                                            )}
                                            {c.status === 'UNDER_COLLECTION' && (
                                                <>
                                                    <button onClick={() => handleStatusChange(c.id, 'CLEARED')} title="تم التحصيل" className="p-1.5 bg-green-100 text-green-700 rounded hover:bg-green-200"><CheckCircle size={16} /></button>
                                                    <button onClick={() => handleStatusChange(c.id, 'BOUNCED')} title="شيك راجع" className="p-1.5 bg-red-100 text-red-700 rounded hover:bg-red-200"><XCircle size={16} /></button>
                                                </>
                                            )}
                                            {c.status === 'BOUNCED' && (
                                                <button onClick={() => handleStatusChange(c.id, 'RECEIVED')} title="إعادة جدولة / استلام" className="p-1.5 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"><ArrowUpRight size={16} /></button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                    </tbody>
                </table>
                {filtered.length === 0 && (
                    <div className="p-12 text-center text-gray-400">
                        <CreditCard className="w-12 h-12 mx-auto mb-4 opacity-20" />
                        <p>لا توجد شيكات في هذه القائمة</p>
                    </div>
                )}
            </div>
        </div>
    );
};
