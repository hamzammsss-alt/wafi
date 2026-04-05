import React, { useState, useEffect } from 'react';
import { Landmark, ArrowUpRight, ArrowDownRight, Printer } from 'lucide-react';

export const TaxReports = () => {
    const [data, setData] = useState<any>({ outputTax: 0, inputTax: 0, netTax: 0 });
    const [loading, setLoading] = useState(false);
    const [dateRange, setDateRange] = useState({
        startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0]
    });

    useEffect(() => {
        loadData();
    }, [dateRange]);

    const loadData = async () => {
        setLoading(true);
        try {
            // @ts-ignore
            const result = await window.electronAPI.reports.getTaxReport(dateRange);
            setData(result || { outputTax: 0, inputTax: 0, netTax: 0 });
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (val: number) => val?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    return (
        <div className="p-6 bg-gray-50 h-full" dir="rtl">
            <h1 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                <Landmark className="text-blue-700" /> التقارير الضريبية
            </h1>

            <div className="bg-white p-4 rounded-xl shadow-sm border mb-6 flex gap-4 items-end">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">من تاريخ</label>
                    <input type="date" value={dateRange.startDate} onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })} className="border rounded-lg p-2" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">إلى تاريخ</label>
                    <input type="date" value={dateRange.endDate} onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })} className="border rounded-lg p-2" />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                {/* Output Tax */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-red-100 hover:border-red-300 transition">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <p className="text-gray-500 font-bold text-sm mb-1">ضريبة المخرجات (مبيعات)</p>
                            <h2 className="text-3xl font-bold text-gray-900">{formatCurrency(data.outputTax)}</h2>
                        </div>
                        <div className="p-2 bg-red-50 rounded-lg text-red-600">
                            <ArrowUpRight />
                        </div>
                    </div>
                    <div className="text-sm text-gray-400">مستحقة للدفع</div>
                </div>

                {/* Input Tax */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-green-100 hover:border-green-300 transition">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <p className="text-gray-500 font-bold text-sm mb-1">ضريبة المدخلات (مشتريات)</p>
                            <h2 className="text-3xl font-bold text-gray-900">{formatCurrency(data.inputTax)}</h2>
                        </div>
                        <div className="p-2 bg-green-50 rounded-lg text-green-600">
                            <ArrowDownRight />
                        </div>
                    </div>
                    <div className="text-sm text-gray-400">قابلة للخصم</div>
                </div>

                {/* Net Tax */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-blue-100 hover:border-blue-300 transition">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <p className="text-gray-500 font-bold text-sm mb-1">صافي الضريبة المستحقة</p>
                            <h2 className={`text-3xl font-bold ${data.netTax >= 0 ? 'text-red-700' : 'text-green-700'}`}>
                                {formatCurrency(Math.abs(data.netTax))}
                            </h2>
                        </div>
                        <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                            <Landmark />
                        </div>
                    </div>
                    <div className="text-sm font-bold text-gray-500">
                        {data.netTax >= 0 ? 'مبلغ واجب الدفع' : 'رصيد دائن (رديات)'}
                    </div>
                </div>

            </div>
        </div>
    );
};
