import React, { useState, useEffect } from 'react';
import { Plus, Search, Filter, Eye, FileText, ArrowUpDown, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const JournalList = () => {
    const navigate = useNavigate();
    const [entries, setEntries] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({
        fromDate: '',
        toDate: '',
        type: '',
        status: ''
    });

    useEffect(() => {
        loadEntries();
    }, [filters]);

    const loadEntries = async () => {
        setLoading(true);
        try {
            if (window.electronAPI && window.electronAPI.journal && window.electronAPI.journal.getEntries) {
                const data = await window.electronAPI.journal.getEntries(filters);
                setEntries(data);
            }
        } catch (error) {
            console.error("Failed to load journal entries:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleFilterChange = (key: string, value: string) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    };

    return (
        <div className="p-6 space-y-6 bg-gray-50/50 min-h-screen font-sans" dir="rtl">
            {/* Header */}
            <div className="flex justify-between items-center bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="bg-blue-100 p-2 rounded-lg">
                        <FileText className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-gray-900">سجل القيود اليومية</h1>
                        <p className="text-sm text-gray-500">عرض وإدارة الحركات المالية والقيود المرحلة</p>
                    </div>
                </div>
                <button
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold transition-colors"
                    onClick={() => navigate('/gl/journal-voucher')}
                >
                    <Plus className="w-4 h-4" />
                    قيد جديد
                </button>
            </div>

            {/* Filters */}
            <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                <div className="flex flex-wrap gap-4 items-center">
                    <div className="flex items-center gap-2 flex-1 min-w-[200px] border border-gray-300 rounded-lg px-3 py-2 bg-gray-50 focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-500 transition-all">
                        <Search className="w-4 h-4 text-gray-400" />
                        <input
                            placeholder="بحث برقم السند أو البيان..."
                            className="bg-transparent border-none outline-none w-full text-sm"
                        />
                    </div>

                    <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-600 flex items-center gap-1">
                            <Calendar className="w-4 h-4" /> من:
                        </span>
                        <input
                            type="date"
                            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                            value={filters.fromDate}
                            onChange={(e) => handleFilterChange('fromDate', e.target.value)}
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-600 flex items-center gap-1">
                            <Calendar className="w-4 h-4" /> إلى:
                        </span>
                        <input
                            type="date"
                            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                            value={filters.toDate}
                            onChange={(e) => handleFilterChange('toDate', e.target.value)}
                        />
                    </div>
                    <button
                        className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-600 transition-colors"
                        onClick={loadEntries}
                        title="تحديث البيانات"
                    >
                        <Filter className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-right">
                        <thead className="bg-gray-50 text-gray-700 font-bold border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-3 whitespace-nowrap">رقم السند</th>
                                <th className="px-6 py-3 whitespace-nowrap">التاريخ</th>
                                <th className="px-6 py-3 whitespace-nowrap">النوع</th>
                                <th className="px-6 py-3 w-1/3">البيان</th>
                                <th className="px-6 py-3 whitespace-nowrap">القيمة</th>
                                <th className="px-6 py-3 text-center whitespace-nowrap">الحالة</th>
                                <th className="px-6 py-3 text-center whitespace-nowrap w-[100px]">إجراءات</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {loading ? (
                                <tr>
                                    <td colSpan={7} className="text-center py-12 text-gray-500">
                                        <div className="flex flex-col items-center gap-2">
                                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                                            جاري التحميل...
                                        </div>
                                    </td>
                                </tr>
                            ) : entries.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="text-center py-12 text-gray-500">
                                        لا توجد قيود مسجلة
                                    </td>
                                </tr>
                            ) : (
                                entries.map((entry) => (
                                    <tr key={entry.id} className="hover:bg-blue-50/30 transition-colors group">
                                        <td className="px-6 py-4 font-mono font-medium text-blue-600">
                                            {entry.voucher_no}
                                        </td>
                                        <td className="px-6 py-4 text-gray-600">
                                            {entry.date}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 border border-gray-200">
                                                {entry.voucher_type}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-gray-600 font-medium truncate max-w-[300px]" title={entry.description}>
                                            {entry.description}
                                        </td>
                                        <td className="px-6 py-4 font-bold text-gray-900 font-mono">
                                            {Number(entry.total_amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                            <span className="text-xs text-gray-500 mr-1">{entry.currency_id || 'ILS'}</span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${entry.status === 'POSTED' ? 'bg-green-50 text-green-700 border-green-200' :
                                                entry.status === 'DRAFT' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                                                    'bg-red-50 text-red-700 border-red-200'
                                                }`}>
                                                {entry.status === 'POSTED' ? 'مرحل' : entry.status === 'DRAFT' ? 'مسودة' : 'ملغى'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <button
                                                className="p-1.5 rounded-md hover:bg-blue-50 text-blue-600 transition-colors opacity-0 group-hover:opacity-100"
                                                onClick={() => navigate(`/gl/journal-voucher?id=${entry.id}`)}
                                                title="عرض التفاصيل"
                                            >
                                                <Eye className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination (Placeholder) */}
                <div className="bg-gray-50 px-4 py-3 border-t border-gray-200 flex items-center justify-between sm:px-6">
                    <div className="text-xs text-gray-500">
                        عرض {entries.length} سجل
                    </div>
                    <div className="flex gap-2">
                        <button className="px-3 py-1 border border-gray-300 rounded-md text-xs bg-white hover:bg-gray-50 disabled:opacity-50" disabled>السابق</button>
                        <button className="px-3 py-1 border border-gray-300 rounded-md text-xs bg-white hover:bg-gray-50 disabled:opacity-50" disabled>التالي</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default JournalList;
