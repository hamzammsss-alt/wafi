import React, { useState, useEffect } from 'react';
import {
    FileText, ArrowRight, Filter, Search, Calendar, Download
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const PartnerLedger = () => {
    const navigate = useNavigate();
    const [partners, setPartners] = useState<any[]>([]);
    const [selectedPartnerId, setSelectedPartnerId] = useState('');
    const [dateRange, setDateRange] = useState({
        startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0]
    });

    const [ledgerData, setLedgerData] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        loadPartners();
    }, []);

    const loadPartners = async () => {
        // Load both customers and suppliers
        const customers = await window.electronAPI.partner.getPartners('CUSTOMER');
        const suppliers = await window.electronAPI.partner.getPartners('SUPPLIER');
        setPartners([...customers, ...suppliers]);
    };

    const runReport = async () => {
        if (!selectedPartnerId) { alert("الرجاء اختيار العميل/المورد"); return; }

        setLoading(true);
        try {
            const data = await window.electronAPI.reports.getPartnerLedger({
                partnerId: selectedPartnerId,
                startDate: dateRange.startDate,
                endDate: dateRange.endDate
            });
            setLedgerData(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    let runningBalance = 0;

    return (
        <div className="p-6 space-y-6 bg-gray-50/50 min-h-screen font-sans" dir="rtl">

            <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500">
                        <ArrowRight className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                            <FileText className="w-6 h-6 text-blue-600" />
                            كشف حساب تفصيلي
                        </h1>
                        <span className="text-sm text-gray-500">متابعة حركات العملاء والموردين</span>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                <div className="col-span-1 md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">العميل / المورد</label>
                    <select
                        className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                        value={selectedPartnerId}
                        onChange={(e) => setSelectedPartnerId(e.target.value)}
                    >
                        <option value="">اختر الحساب...</option>
                        {partners.map(p => (
                            <option key={p.id} value={p.id}>{p.name_ar} ({p.type === 'CUSTOMER' ? 'عميل' : 'مورد'})</option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">من تاريخ</label>
                    <input
                        type="date"
                        className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                        value={dateRange.startDate}
                        onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
                    />
                </div>

                <div className="flex gap-2">
                    <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700 mb-1">إلى تاريخ</label>
                        <input
                            type="date"
                            className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                            value={dateRange.endDate}
                            onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
                        />
                    </div>
                    <button
                        onClick={runReport}
                        className="mb-0.5 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold shadow-lg shadow-blue-600/20 h-10 self-end"
                    >
                        <Search className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Report Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <table className="w-full text-right">
                    <thead className="bg-gray-50 text-xs text-gray-500 uppercase border-b border-gray-200">
                        <tr>
                            <th className="px-6 py-3">التاريخ</th>
                            <th className="px-6 py-3">نوع الحركة</th>
                            <th className="px-6 py-3">رقم المستند</th>
                            <th className="px-6 py-3">البيان</th>
                            <th className="px-6 py-3">مدين</th>
                            <th className="px-6 py-3">دائن</th>
                            <th className="px-6 py-3">الرصيد</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {ledgerData.map((row, index) => {
                            runningBalance += (row.debit - row.credit);
                            return (
                                <tr key={index} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{row.transaction_date}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-800">{row.voucher_type}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-mono">{row.voucher_no}</td>
                                    <td className="px-6 py-4 text-sm text-gray-600">{row.description}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-800">{row.debit > 0 ? row.debit.toLocaleString() : '-'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-800">{row.credit > 0 ? row.credit.toLocaleString() : '-'}</td>
                                    <td className={`px-6 py-4 whitespace-nowrap text-sm font-bold ${runningBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                        {Math.abs(runningBalance).toLocaleString()} {runningBalance < 0 ? 'دائن' : 'مدين'}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                    <tfoot className="bg-gray-50 font-bold border-t border-gray-200">
                        <tr>
                            <td colSpan={4} className="px-6 py-4 text-center">الإجمالي</td>
                            <td className="px-6 py-4 text-gray-900">
                                {ledgerData.reduce((acc, curr) => acc + curr.debit, 0).toLocaleString()}
                            </td>
                            <td className="px-6 py-4 text-gray-900">
                                {ledgerData.reduce((acc, curr) => acc + curr.credit, 0).toLocaleString()}
                            </td>
                            <td className={`px-6 py-4 ${runningBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {Math.abs(runningBalance).toLocaleString()}
                            </td>
                        </tr>
                    </tfoot>
                </table>
                {ledgerData.length === 0 && !loading && (
                    <div className="p-12 text-center text-gray-400">
                        <FileText className="w-12 h-12 mx-auto mb-4 opacity-20" />
                        <p>لا توجد بيانات للعرض</p>
                    </div>
                )}
            </div>

        </div>
    );
};

export { PartnerLedger };
