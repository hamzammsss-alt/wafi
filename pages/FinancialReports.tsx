import React, { useState, useEffect } from 'react';
import { Download, Printer, Filter, Calendar, TrendingUp, TrendingDown, Scale, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

// --- Shared Types ---
interface ReportProps {
    title: string;
}

// --- 1. Profit & Loss (Income Statement) ---
export const ProfitAndLoss = () => {
    const [data, setData] = useState({ revenue: 0, cogs: 0, grossProfit: 0, expenses: 0, netProfit: 0 });
    const [loading, setLoading] = useState(false);
    const [range, setRange] = useState({
        startDate: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0]
    });

    const loadData = async () => {
        // @ts-ignore
        if (window.electronAPI) {
            setLoading(true);
            try {
                // @ts-ignore
                const result = await window.electronAPI.getReportPnL(range);
                setData(result);
            } catch (err) { console.error(err); }
            finally { setLoading(false); }
        }
    };

    useEffect(() => { loadData(); }, [range]);

    return (
        <ReportLayout title="قائمة الدخل (الأرباح والخسائر)" icon={<TrendingUp className="text-green-600" />} range={range} setRange={setRange} onRefresh={loadData}>
            <div className="space-y-4 max-w-3xl mx-auto">
                {/* Revenue */}
                <ReportSection title="الإيرادات" color="emerald">
                    <ReportRow label="إجمالي المبيعات" value={data.revenue} />
                    <ReportRow label="تكلفة البضاعة المباعة (COGS)" value={data.cogs} isNegative />
                    <div className="border-t border-emerald-200 mt-2 pt-2">
                        <ReportRow label="مجمل الربح (Gross Profit)" value={data.grossProfit} isBold />
                    </div>
                </ReportSection>

                {/* Expenses */}
                <ReportSection title="المصاريف التشغيلية" color="red">
                    <ReportRow label="إجمالي المصاريف" value={data.expenses} />
                </ReportSection>

                {/* Net Profit */}
                <div className="bg-blue-900 text-white p-6 rounded-xl shadow-lg flex justify-between items-center transform scale-105">
                    <div className="text-lg opacity-80">صافي الربح / الخسارة</div>
                    <div className={`text-3xl font-black font-mono ${data.netProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {data.netProfit.toFixed(2)}
                    </div>
                </div>
            </div>
        </ReportLayout>
    );
};

// --- 2. Balance Sheet ---
export const BalanceSheet = () => {
    const [data, setData] = useState<any>({ assets: [], liabilities: [], equity: [], totalAssets: 0, totalLiabilities: 0, totalEquity: 0 });
    const [loading, setLoading] = useState(false);

    const loadData = async () => {
        // @ts-ignore
        if (window.electronAPI) {
            setLoading(true);
            try {
                // @ts-ignore
                const result = await window.electronAPI.getReportBalanceSheet();
                setData(result);
            } catch (err) { console.error(err); }
            finally { setLoading(false); }
        }
    };

    useEffect(() => { loadData(); }, []);

    return (
        <ReportLayout title="الميزانية العمومية" icon={<Scale className="text-blue-600" />} onRefresh={loadData} hideRange>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-6xl mx-auto">
                {/* Assets */}
                <ReportSection title="الأصول (Assets)" color="blue">
                    {data.assets.length === 0 && <div className="text-gray-400 text-center py-4">لا توجد سجلات</div>}
                    {/* @ts-ignore */}
                    {data.assets.map(a => <ReportRow key={a.id} label={a.name} value={a.balance} />)}
                    <div className="border-t-2 border-blue-200 mt-4 pt-2">
                        <ReportRow label="مجموع الأصول" value={data.totalAssets} isBold size="lg" />
                    </div>
                </ReportSection>

                <div className="space-y-6">
                    {/* Liabilities */}
                    <ReportSection title="الخصوم (Liabilities)" color="orange">
                        {/* @ts-ignore */}
                        {data.liabilities.map(a => <ReportRow key={a.id} label={a.name} value={Math.abs(a.balance)} />)}
                        <div className="border-t border-orange-200 mt-2 pt-2">
                            <ReportRow label="مجموع الخصوم" value={Math.abs(data.totalLiabilities)} isBold />
                        </div>
                    </ReportSection>

                    {/* Equity */}
                    <ReportSection title="حقوق الملكية (Equity)" color="purple">
                        {/* @ts-ignore */}
                        {data.equity.map(a => <ReportRow key={a.id} label={a.name} value={Math.abs(a.balance)} />)}
                        {/* Calculated Retained Earnings or Net Profit usually goes here too */}
                        <div className="border-t border-purple-200 mt-2 pt-2">
                            <ReportRow label="مجموع حقوق الملكية" value={Math.abs(data.totalEquity)} isBold />
                        </div>
                    </ReportSection>

                    <div className="bg-gray-100 p-4 rounded-lg flex justify-between items-center border border-gray-300">
                        <div className="font-bold text-gray-600">اجمالي الخصوم وحقوق الملكية</div>
                        <div className="font-mono font-bold text-xl">{Math.abs(data.totalLiabilities + data.totalEquity).toFixed(2)}</div>
                    </div>
                </div>
            </div>
        </ReportLayout>
    );
};

// --- 3. Aging Report ---
export const AgingReport = () => {
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    const loadData = async () => {
        // @ts-ignore
        if (window.electronAPI) {
            setLoading(true);
            try {
                // @ts-ignore
                const result = await window.electronAPI.getReportAging();
                setData(result || []);
            } catch (err) { console.error(err); }
            finally { setLoading(false); }
        }
    };

    useEffect(() => { loadData(); }, []);

    return (
        <ReportLayout title="أعمار الذمم (Aging Analysis)" icon={<AlertCircle className="text-red-600" />} onRefresh={loadData} hideRange>
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-right bg-white rounded-lg overflow-hidden border border-gray-200 shadow-sm">
                    <thead className="bg-gray-100 text-gray-700 font-bold">
                        <tr>
                            <th className="p-4">العميل</th>
                            <th className="p-4 text-center text-green-700">0-30 يوم</th>
                            <th className="p-4 text-center text-yellow-700">31-60 يوم</th>
                            <th className="p-4 text-center text-orange-700">61-90 يوم</th>
                            <th className="p-4 text-center text-red-700">90+ يوم</th>
                            <th className="p-4 text-center bg-gray-200">الرصيد الكلي</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {data.length === 0 ? (
                            <tr><td colSpan={6} className="p-8 text-center text-gray-400">لا توجد ذمم مدينة</td></tr>
                        ) : (
                            data.map((row: any) => (
                                <tr key={row.id} className="hover:bg-blue-50">
                                    <td className="p-4 font-bold text-gray-800">{row.name}</td>
                                    <td className="p-4 text-center font-mono">{row.buckets['0-30'].toFixed(2)}</td>
                                    <td className="p-4 text-center font-mono">{row.buckets['31-60'].toFixed(2)}</td>
                                    <td className="p-4 text-center font-mono">{row.buckets['61-90'].toFixed(2)}</td>
                                    <td className="p-4 text-center font-mono font-bold text-red-600">{row.buckets['90+'].toFixed(2)}</td>
                                    <td className="p-4 text-center font-mono font-black bg-gray-50">{row.balance.toFixed(2)}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </ReportLayout>
    );
};

// --- Reusable Components ---

const ReportLayout = ({ title, icon, children, range, setRange, onRefresh, hideRange }: any) => (
    <div className="flex flex-col h-full bg-slate-50 font-sans" dir="rtl">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 p-4 sticky top-0 z-10 flex justify-between items-center shadow-sm">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-gray-100 rounded-lg">{icon}</div>
                <h1 className="text-xl font-bold text-gray-800">{title}</h1>
            </div>
            <div className="flex items-center gap-3 no-print">
                {!hideRange && (
                    <div className="flex items-center gap-2 bg-gray-50 p-1 rounded-lg border border-gray-200">
                        <Calendar size={16} className="text-gray-400 ml-1" />
                        <input type="date" value={range.startDate} onChange={e => setRange({ ...range, startDate: e.target.value })} className="bg-transparent text-sm font-bold w-28" />
                        <span className="text-gray-400">-</span>
                        <input type="date" value={range.endDate} onChange={e => setRange({ ...range, endDate: e.target.value })} className="bg-transparent text-sm font-bold w-28" />
                    </div>
                )}
                <button onClick={onRefresh} className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"><Filter size={20} /></button>
                <button onClick={() => window.print()} className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"><Printer size={20} /></button>
                <button className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"><Download size={20} /></button>
            </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
            {children}
        </div>
    </div>
);

const ReportSection = ({ title, color, children }: any) => (
    <div className={`bg-white rounded-xl border border-${color}-100 shadow-sm overflow-hidden mb-6`}>
        <div className={`bg-${color}-50 px-6 py-3 border-b border-${color}-100 font-bold text-${color}-800 flex items-center gap-2`}>
            <div className={`w-2 h-2 rounded-full bg-${color}-500`}></div>
            {title}
        </div>
        <div className="p-6">
            {children}
        </div>
    </div>
);

const ReportRow = ({ label, value, isBold, isNegative, size }: any) => (
    <div className={`flex justify-between items-center py-1 ${isBold ? 'font-black text-gray-800' : 'text-gray-600'}`}>
        <div className={`${size === 'lg' ? 'text-lg' : 'text-base'}`}>{label}</div>
        <div className={`font-mono ${size === 'lg' ? 'text-2xl' : 'text-lg'} ${isNegative ? 'text-red-500' : ''}`}>
            {isNegative ? '-' : ''}{Math.abs(value).toFixed(2)}
        </div>
    </div>
);
