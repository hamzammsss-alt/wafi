import React, { useState, useEffect } from 'react';
import { CreditCard } from 'lucide-react';

export const ChequeReports = () => {
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    // Filters
    const [filter, setFilter] = useState('All');
    // Statuses in DB: ON_HAND, UNDER_COLLECTION, COLLECTED, BOUNCED, ISSUED, CLEARED, RETURNED

    useEffect(() => {
        loadData();
    }, [filter]);

    const loadData = async () => {
        setLoading(true);
        try {
            const filters: any = {};
            if (filter !== 'All') {
                if (filter === 'InFund') filters.status = 'ON_HAND';
                else if (filter === 'Due') filters.status = 'UNDER_COLLECTION'; // Approx mapping
                else if (filter === 'Returned') filters.status = 'RETURNED'; // Or BOUNCED
                else if (filter === 'PostDated') {
                    // Custom logic for post dated? Or just use status.
                    // Let's stick to DB statuses for now, or map UI filters to DB statuses.
                }
            }

            // Simplified mapping for now, assuming user wants to see all checks
            // Or we can fetch all and filter in UI if dataset small

            // Let's use specific status query if possible.
            // For now, let's fetch ALL and just show them to ensure connectivity first.

            // @ts-ignore
            const result = await window.electronAPI.reports.getChequesReport({
                status: filter === 'All' ? undefined : filter // This requires backend to handle 'InFund' etc or we send exact DB status
            });
            // If backend expects exact DB status, we need to map types.
            // Let's fetch all and filter client side for better UX for now? No, better server side.

            // Let's assume Filter 'All' sends no status.
            setData(result || []);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (val: number) => val?.toLocaleString(undefined, { minimumFractionDigits: 2 });

    // Mapping for tabs
    const tabs = [
        { id: 'All', label: 'الكل' },
        { id: 'ON_HAND', label: 'بالصندوق' },
        { id: 'UNDER_COLLECTION', label: 'برسم التحصيل' },
        { id: 'COLLECTED', label: 'محصل' },
        { id: 'BOUNCED', label: 'راجع' },
        { id: 'ISSUED', label: 'صادر' }
    ];

    return (
        <div className="app-page h-full border-l" dir="rtl">
            <h1 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                <CreditCard className="text-purple-600" /> تقارير الشيكات
            </h1>

            <div className="card p-6">
                <div className="flex gap-2 border-b pb-4 mb-4 overflow-x-auto">
                    {tabs.map(t => (
                        <button
                            key={t.id}
                            onClick={() => { setFilter(t.id); }}
                            className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap ${filter === t.id ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                        >
                            {t.label}
                        </button>
                    ))}
                    <button onClick={loadData} className="mr-auto text-sm text-purple-600 hover:underline px-4">تحديث</button>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-right text-sm">
                        <thead className="bg-gray-50 text-gray-600 font-bold">
                            <tr>
                                <th className="p-3">رقم الشيك</th>
                                <th className="p-3">تاريخ الاستحقاق</th>
                                <th className="p-3">البنك</th>
                                <th className="p-3">المستفيد / الساحب</th>
                                <th className="p-3">المبلغ</th>
                                <th className="p-3">النوع</th>
                                <th className="p-3">الحالة</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {data.map((row: any, idx) => (
                                <tr key={idx} className="hover:bg-gray-50">
                                    <td className="p-3 font-mono text-gray-700 font-bold">{row.cheque_no}</td>
                                    <td className="p-3 text-gray-600 font-mono">{row.due_date}</td>
                                    <td className="p-3 text-gray-600">{row.bank_name}</td>
                                    <td className="p-3 font-bold text-gray-800">{row.partner_name || row.drawer_name || '-'}</td>
                                    <td className="p-3 font-bold text-gray-900">{formatCurrency(row.amount)}</td>
                                    <td className="p-3">
                                        <span className={`px-2 py-1 rounded text-xs ${row.type === 'INCOMING' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                                            {row.type === 'INCOMING' ? 'وارد' : 'صادر'}
                                        </span>
                                    </td>
                                    <td className="p-3">
                                        <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs font-bold border border-gray-200">{row.status}</span>
                                    </td>
                                </tr>
                            ))}
                            {data.length === 0 && !loading && (
                                <tr>
                                    <td colSpan={7} className="p-8 text-center text-gray-400">لا توجد شيكات</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                {loading && <div className="text-center p-4">جاري التحميل...</div>}
            </div>
        </div>
    );
};

