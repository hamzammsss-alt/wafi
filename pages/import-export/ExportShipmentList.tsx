import React, { useState, useEffect } from 'react';
import { Plus, Search, Filter, Anchor, FileText, Truck, ArrowRight, Printer } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const ExportShipmentList = () => {
    const navigate = useNavigate();
    const [shipments, setShipments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        loadShipments();
    }, []);

    const loadShipments = async () => {
        try {
            const data = await window.electronAPI.export.getShipments({});
            setShipments(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const StatusBadge = ({ status }: { status: string }) => {
        const colors: any = {
            'OPEN': 'bg-blue-100 text-blue-800',
            'shipped': 'bg-green-100 text-green-800',
            'closed': 'bg-slate-100 text-slate-800'
        };
        return (
            <span className={`px-2 py-1 rounded-full text-xs font-bold ${colors[status] || 'bg-gray-100 text-gray-800'}`}>
                {status || 'OPEN'}
            </span>
        );
    };

    const filtered = shipments.filter(s =>
        s.shipment_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.customer_name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="p-6 space-y-6 bg-slate-50 min-h-screen font-sans" dir="rtl">
            <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <Anchor className="w-6 h-6 text-blue-600" />
                        ملفات التصدير
                    </h1>
                    <p className="text-slate-500 text-sm mt-1">إدارة الشحنات الصادرة والوثائق</p>
                </div>
                <button
                    onClick={() => navigate('/export/shipments/new')}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold shadow-lg shadow-blue-600/20 transition-all"
                >
                    <Plus className="w-5 h-5" />
                    ملف تصدير جديد
                </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-4 border-b border-slate-200 flex gap-4">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute right-3 top-2.5 w-5 h-5 text-slate-400" />
                        <input
                            type="text"
                            placeholder="بحث برقم الملف أو الزبون..."
                            className="w-full pr-10 pl-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-right">
                        <thead className="bg-slate-50 text-slate-600 font-bold text-sm">
                            <tr>
                                <th className="px-6 py-4">رقم الملف</th>
                                <th className="px-6 py-4">الزبون</th>
                                <th className="px-6 py-4">الوجهة</th>
                                <th className="px-6 py-4">تاريخ التحميل</th>
                                <th className="px-6 py-4">رقم الفاتورة</th>
                                <th className="px-6 py-4">الحالة</th>
                                <th className="px-6 py-4 text-center">الإجراءات</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filtered.map((shipment) => (
                                <tr key={shipment.id} className="hover:bg-blue-50/50 transition-colors group">
                                    <td className="px-6 py-4 font-mono font-bold text-blue-600">
                                        {shipment.shipment_no}
                                    </td>
                                    <td className="px-6 py-4 font-medium text-slate-800">
                                        {shipment.customer_name}
                                    </td>
                                    <td className="px-6 py-4 text-slate-600 flex items-center gap-2">
                                        <Truck className="w-4 h-4 text-slate-400" />
                                        {shipment.destination_country} - {shipment.port_of_discharge}
                                    </td>
                                    <td className="px-6 py-4 text-slate-600">
                                        {shipment.loading_date || '-'}
                                    </td>
                                    <td className="px-6 py-4 font-mono text-slate-500">
                                        {shipment.invoice_no || '-'}
                                    </td>
                                    <td className="px-6 py-4">
                                        <StatusBadge status={shipment.status} />
                                    </td>
                                    <td className="px-6 py-4 flex justify-center gap-2">
                                        <button
                                            onClick={() => navigate(`/export/shipments/${shipment.id}`)}
                                            className="p-1.5 text-blue-600 hover:bg-blue-100 rounded-lg tooltip"
                                            title="عرض التفاصيل"
                                        >
                                            <FileText className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => navigate(`/export/packing-list/${shipment.id}`)}
                                            className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg tooltip"
                                            title="قائمة التعبئة"
                                        >
                                            <FileText className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => navigate(`/export/certificate-origin/${shipment.id}`)}
                                            className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg tooltip"
                                            title="شهادة المنشأ"
                                        >
                                            <FileText className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {filtered.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                                        لا توجد ملفات تصدير مطابقة
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default ExportShipmentList;
