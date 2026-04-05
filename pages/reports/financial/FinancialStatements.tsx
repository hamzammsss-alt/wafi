import React, { useState, useEffect } from 'react';
import { FileText, Calendar, RefreshCcw } from 'lucide-react';

export const FinancialStatements = () => {
    const [reportType, setReportType] = useState('PL'); // PL, BS, CF
    // State
    const [fromDate, setFromDate] = useState(`${new Date().getFullYear()}-01-01`);
    const [toDate, setToDate] = useState(new Date().toISOString().split('T')[0]);
    const [loading, setLoading] = useState(false);
    const [plData, setPlData] = useState<any>({ sales: 0, cogs: 0, grossProfit: 0, expenses: 0, netProfit: 0, expenseBreakdown: [] });
    const [bsData, setBsData] = useState<any>({ assets: [], liabilities: [], equity: [], totalAssets: 0, totalLiabilities: 0, totalEquity: 0 });

    useEffect(() => {
        loadReport();
    }, [reportType, fromDate, toDate]);

    const loadReport = async () => {
        // @ts-ignore
        if (!window.electronAPI) return;
        setLoading(true);
        try {
            if (reportType === 'PL') {
                // @ts-ignore
                const data = await window.electronAPI.getReportPnL({ from: fromDate, to: toDate });
                // Ensure data structure matches
                setPlData(data || { sales: 0, cogs: 0, grossProfit: 0, expenses: 0, netProfit: 0 });
            } else if (reportType === 'BS') {
                // @ts-ignore
                const data = await window.electronAPI.getReportBalanceSheet();
                setBsData(data || { assets: [], liabilities: [], equity: [], totalAssets: 0, totalLiabilities: 0, totalEquity: 0 });
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (amount: number) => {
        return (amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    return (
        <div className="p-6 bg-gray-50 h-full flex flex-col gap-6" dir="rtl">
            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                <FileText className="text-blue-600" /> القوائم المالية الختامية
            </h1>

            {/* Date Filters */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-end gap-4">
                <div>
                    <label className="block text-sm font-bold text-gray-600 mb-1">من تاريخ</label>
                    <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="p-2 border rounded-lg" />
                </div>
                <div>
                    <label className="block text-sm font-bold text-gray-600 mb-1">إلى تاريخ</label>
                    <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="p-2 border rounded-lg" />
                </div>
                <button onClick={loadReport} className="p-2.5 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition">
                    <RefreshCcw size={20} className={loading ? 'animate-spin' : ''} />
                </button>
            </div>

            <div className="flex justify-center bg-white p-2 rounded-xl border shadow-sm w-fit mx-auto">
                <button
                    onClick={() => setReportType('PL')}
                    className={`px-6 py-2 rounded-lg font-bold transition ${reportType === 'PL' ? 'bg-blue-600 text-white shadow' : 'text-gray-500 hover:bg-gray-50'}`}
                >
                    قائمة الدخل (P&L)
                </button>
                <button
                    onClick={() => setReportType('BS')}
                    className={`px-6 py-2 rounded-lg font-bold transition ${reportType === 'BS' ? 'bg-blue-600 text-white shadow' : 'text-gray-500 hover:bg-gray-50'}`}
                >
                    الميزانية العمومية
                </button>
                <button
                    onClick={() => setReportType('CF')}
                    className={`px-6 py-2 rounded-lg font-bold transition ${reportType === 'CF' ? 'bg-blue-600 text-white shadow' : 'text-gray-500 hover:bg-gray-50'}`}
                >
                    التدفقات النقدية
                </button>
            </div>

            <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden flex-1 p-8 max-w-5xl mx-auto w-full overflow-y-auto">
                {reportType === 'PL' && (
                    <div className="space-y-4">
                        <h2 className="text-xl font-bold text-center border-b pb-4 mb-6">
                            قائمة الدخل (Profit & Loss)
                            <div className="text-sm font-normal text-gray-500 mt-1">عن الفترة من {fromDate} إلى {toDate}</div>
                        </h2>

                        {loading ? <div className="text-center p-10">جاري تحميل البيانات...</div> : (
                            <>
                                <div className="flex justify-between items-center p-3 bg-gray-50 font-bold border rounded-t-lg">
                                    <span>الإيرادات (المبيعات)</span>
                                    <span>{formatCurrency(plData.sales)}</span>
                                </div>
                                <div className="flex justify-between items-center p-3 text-red-600 border-x border-b">
                                    <span>(-) تكلفة البضاعة المباعة (COGS)</span>
                                    <span>({formatCurrency(plData.cogs)})</span>
                                </div>
                                <div className="flex justify-between items-center p-3 bg-blue-50 font-bold text-lg text-blue-800 border my-2 rounded-lg shadow-sm">
                                    <span>مجمل الربح (Gross Profit)</span>
                                    <span>{formatCurrency(plData.grossProfit)}</span>
                                </div>

                                <div className="flex justify-between items-center p-3 text-gray-600 border rounded-t-lg mt-4">
                                    <span>(-) المصاريف التشغيلية (Expenses)</span>
                                    <span>({formatCurrency(plData.expenses)})</span>
                                </div>
                                {/* Detailed Expenses Drill-down could go here */}
                                {plData.expenseBreakdown?.map((exp: any, idx: number) => (
                                    <div key={idx} className="flex justify-between items-center px-6 py-1 text-sm text-gray-400 border-x last:border-b bg-gray-50">
                                        <span>{exp.name}</span>
                                        <span>{formatCurrency(exp.amount)}</span>
                                    </div>
                                ))}

                                <div className={`flex justify-between items-center p-4 font-bold text-xl border rounded-lg mt-6 shadow-md ${plData.netProfit >= 0 ? 'bg-green-100 text-green-800 border-green-200' : 'bg-red-100 text-red-800 border-red-200'}`}>
                                    <span>صافي الربح (Net Profit)</span>
                                    <span>{formatCurrency(plData.netProfit)}</span>
                                </div>
                            </>
                        )}
                    </div>
                )}

                {reportType === 'BS' && (
                    <div className="space-y-6">
                        <h2 className="text-xl font-bold text-center border-b pb-4 mb-2">
                            الميزانية العمومية (Balance Sheet)
                            <div className="text-sm font-normal text-gray-500 mt-1">كما هي في {toDate}</div>
                        </h2>

                        {loading ? <div className="text-center p-10">جاري تحميل البيانات...</div> : (
                            <div className="grid grid-cols-2 gap-8">
                                {/* Assets Column */}
                                <div className="space-y-4">
                                    <h3 className="font-bold text-lg text-green-700 border-b-2 border-green-100 pb-2">الأصول (Assets)</h3>
                                    <div className="space-y-2">
                                        {bsData.assets.map((acc: any) => (
                                            <div key={acc.id} className="flex justify-between text-sm py-1 border-b border-dashed border-gray-100 items-center">
                                                <span>{acc.name}</span>
                                                <span className="font-mono text-gray-600">{formatCurrency(parseFloat(acc.balance))}</span>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="flex justify-between font-bold text-lg border-t-2 border-green-500 pt-2 bg-green-50 p-2 rounded">
                                        <span>مجموع الأصول</span>
                                        <span>{formatCurrency(bsData.totalAssets)}</span>
                                    </div>
                                </div>

                                {/* Liabilities & Equity Column */}
                                <div className="space-y-8">
                                    {/* Liabilities */}
                                    <div className="space-y-4">
                                        <h3 className="font-bold text-lg text-red-700 border-b-2 border-red-100 pb-2">الخصوم (Liabilities)</h3>
                                        <div className="space-y-2">
                                            {bsData.liabilities.map((acc: any) => (
                                                <div key={acc.id} className="flex justify-between text-sm py-1 border-b border-dashed border-gray-100 items-center">
                                                    <span>{acc.name}</span>
                                                    <span className="font-mono text-gray-600">{formatCurrency(Math.abs(parseFloat(acc.balance)))}</span>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="flex justify-between font-bold border-t border-gray-300 pt-1">
                                            <span>مجموع الخصوم</span>
                                            <span>{formatCurrency(Math.abs(bsData.totalLiabilities))}</span>
                                        </div>
                                    </div>

                                    {/* Equity */}
                                    <div className="space-y-4">
                                        <h3 className="font-bold text-lg text-blue-700 border-b-2 border-blue-100 pb-2">حقوق الملكية (Equity)</h3>
                                        <div className="space-y-2">
                                            {bsData.equity.map((acc: any) => (
                                                <div key={acc.id} className="flex justify-between text-sm py-1 border-b border-dashed border-gray-100 items-center">
                                                    <span>{acc.name}</span>
                                                    <span className="font-mono text-gray-600">{formatCurrency(Math.abs(parseFloat(acc.balance)))}</span>
                                                </div>
                                            ))}
                                            {/* Retained Earnings (Calculated via P&L) */}
                                            {/* Note: In real system, Net Profit should be equity. Here we might need to add it manually if not closed yet */}
                                        </div>
                                        <div className="flex justify-between font-bold border-t border-gray-300 pt-1">
                                            <span>مجموع حقوق الملكية</span>
                                            <span>{formatCurrency(Math.abs(bsData.totalEquity))}</span>
                                        </div>
                                    </div>

                                    {/* Total Liabilities + Equity */}
                                    <div className="flex justify-between font-bold text-lg border-t-2 border-purple-500 pt-2 bg-purple-50 p-2 rounded">
                                        <span>الخصوم + حقوق الملكية</span>
                                        <span>{formatCurrency(Math.abs(bsData.totalLiabilities) + Math.abs(bsData.totalEquity))}</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {!loading && Math.abs(Math.abs(bsData.totalAssets) - (Math.abs(bsData.totalLiabilities) + Math.abs(bsData.totalEquity))) > 0.01 && (
                            <div className="mx-auto w-fit px-4 py-2 bg-red-100 text-red-800 rounded-full text-sm font-bold flex items-center gap-2 mt-4">
                                ⚠️ الميزانية غير متزنة! الفرق: {formatCurrency(Math.abs(bsData.totalAssets) - (Math.abs(bsData.totalLiabilities) + Math.abs(bsData.totalEquity)))}
                            </div>
                        )}
                    </div>
                )}

                {reportType === 'CF' && (
                    <div className="text-center py-20 text-gray-500">
                        <RefreshCcw className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p className="text-lg">تقرير التدفقات النقدية قيد التطوير</p>
                    </div>
                )}
            </div>
        </div>
    );
};
