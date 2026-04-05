import React, { useState, useEffect } from 'react';
import { Plus, Search, FileText, Filter } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const PurchaseReturnList: React.FC = () => {
    const navigate = useNavigate();
    const [returns, setReturns] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const data = await window.electronAPI.purchase.getReturns();
            setReturns(data || []);
        } catch (error) {
            console.error("Failed to load returns", error);
        } finally {
            setLoading(false);
        }
    };

    const filteredReturns = returns.filter(r =>
        r.return_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.supplier_name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="p-6 space-y-6 animate-in fade-in duration-500">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-gray-900">مردودات المشتريات</h1>
                    <p className="text-gray-500 mt-1">إدارة مردودات المشتريات (إشعار مدين)</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => navigate('/purchasing/returns/new')}
                        className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
                    >
                        <Plus className="h-4 w-4" />
                        مردود جديد
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-lg shadow border border-gray-200">
                <div className="p-4 border-b border-gray-200 flex justify-between items-center">
                    <div className="relative w-64">
                        <Search className="absolute right-3 top-2.5 h-4 w-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="بحث برقم المردود أو المورد..."
                            className="w-full pr-9 pl-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <button className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50 text-gray-700">
                        <Filter className="h-4 w-4" />
                        تصفية
                    </button>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-right">
                        <thead className="bg-gray-50 text-gray-700 font-medium">
                            <tr>
                                <th className="px-4 py-3">رقم المردود</th>
                                <th className="px-4 py-3">التاريخ</th>
                                <th className="px-4 py-3">المورد</th>
                                <th className="px-4 py-3">إجمالي القيمة</th>
                                <th className="px-4 py-3">الحالة</th>
                                <th className="px-4 py-3">بواسطة</th>
                                <th className="px-4 py-3 w-[50px]"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {loading ? (
                                <tr>
                                    <td colSpan={7} className="text-center py-8 text-gray-500">
                                        جاري التحميل...
                                    </td>
                                </tr>
                            ) : filteredReturns.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="text-center py-8 text-gray-500">
                                        لا توجد مردودات مطابقة
                                    </td>
                                </tr>
                            ) : (
                                filteredReturns.map((ret) => (
                                    <tr
                                        key={ret.id}
                                        className="hover:bg-gray-50 cursor-pointer transition-colors"
                                        onClick={() => navigate(`/purchasing/returns/${ret.id}`)}
                                    >
                                        <td className="px-4 py-3 font-medium text-gray-900">{ret.return_no}</td>
                                        <td className="px-4 py-3 text-gray-600">{ret.date}</td>
                                        <td className="px-4 py-3 text-gray-600">{ret.supplier_name}</td>
                                        <td className="px-4 py-3 text-gray-900 font-medium">
                                            {Number(ret.grand_total).toLocaleString('en-US', { style: 'currency', currency: ret.currency_id || 'ILS' })}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${ret.status === 'POSTED'
                                                    ? 'bg-green-100 text-green-800'
                                                    : 'bg-gray-100 text-gray-800'
                                                }`}>
                                                {ret.status === 'POSTED' ? 'مرحل' : ret.status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-gray-500">{ret.created_by}</td>
                                        <td className="px-4 py-3">
                                            <button className="text-gray-400 hover:text-blue-600">
                                                <FileText className="h-4 w-4" />
                                            </button>
                                        </td>
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
