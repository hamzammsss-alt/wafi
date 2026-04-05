import React, { useState } from 'react';
import { FileText, PieChart, Users, Calendar, Download, Printer } from 'lucide-react';

export const Reports = () => {
    const [activeTab, setActiveTab] = useState('PNL');
    const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 8) + '01'); // 1st of month
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
    const [reportData, setReportData] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    const runReport = async () => {
        setLoading(true);
        try {
            // @ts-ignore
            if (window.electronAPI) {
                let data;
                if (activeTab === 'PNL') {
                    // @ts-ignore
                    data = await window.electronAPI.getReportPnL({ startDate, endDate });
                } else if (activeTab === 'BALANCE') {
                    // @ts-ignore
                    data = await window.electronAPI.getReportBalanceSheet();
                } else if (activeTab === 'AGING') {
                    // @ts-ignore
                    data = await window.electronAPI.getReportAging();
                }
                setReportData(data);
            }
        } catch (err: any) {
            alert("Error: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-[#f0f2f5] p-4">
            <h1 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                <PieChart className="text-purple-600" /> مركز التقارير المتقدمة (Intelligence Center)
            </h1>

            {/* Tabs */}
            <div className="flex gap-2 mb-6 border-b pb-2">
                <TabButton id="PNL" label="الأرباح والخسائر (P&L)" icon={<FileText size={18} />} active={activeTab} onClick={setActiveTab} />
                <TabButton id="BALANCE" label="الميزانية العمومية" icon={<PieChart size={18} />} active={activeTab} onClick={setActiveTab} />
                <TabButton id="AGING" label="أعمار الديون (Aging)" icon={<Users size={18} />} active={activeTab} onClick={setActiveTab} />
            </div>

            {/* Controls */}
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-4 flex gap-4 items-end">
                {activeTab === 'PNL' && (
                    <>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1">من تاريخ</label>
                            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="border rounded p-2" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1">إلى تاريخ</label>
                            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="border rounded p-2" />
                        </div>
                    </>
                )}
                <button onClick={runReport} className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded font-bold transition flex items-center gap-2">
                    <PieChart size={18} /> عرض التقرير
                </button>
                <button onClick={() => window.print()} className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded font-bold transition">
                    <Printer size={18} />
                </button>
            </div>

            {/* Report Viewer */}
            <div className="flex-1 bg-white rounded-lg shadow-sm border border-gray-200 overflow-auto p-8 printable">
                {!reportData ? (
                    <div className="text-center text-gray-400 mt-20">اختر نوع التقرير واضغط عرض</div>
                ) : loading ? (
                    <div className="text-center text-purple-600 mt-20">جاري الحساب...</div>
                ) : (
                    <>
                        {activeTab === 'PNL' && <PnLView data={reportData} range={{ startDate, endDate }} />}
                        {activeTab === 'BALANCE' && <BalanceSheetView data={reportData} />}
                        {activeTab === 'AGING' && <AgingView data={reportData} />}
                    </>
                )}
            </div>
        </div>
    );
};

// --- Sub-Components ---

const PnLView = ({ data, range }: any) => (
    <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8 border-b pb-4">
            <h2 className="text-2xl font-bold text-gray-800">بيان الأرباح والخسائر</h2>
            <p className="text-gray-500">للفترة من {range.startDate} إلى {range.endDate}</p>
        </div>

        <div className="space-y-4 text-lg">
            <Row label="إجمالي الإيرادات (المبيعات)" value={data.revenue} color="text-green-600" bold />
            <Row label="تكلفة البضاعة المباعة (COGS)" value={-data.cogs} color="text-red-500" />
            <div className="border-t border-gray-300 my-2"></div>
            <Row label="مجمل الربح (Gross Profit)" value={data.grossProfit} size="text-xl" bold />

            <div className="py-4"></div>
            <Row label="إجمالي المصاريف التشغيلية" value={-data.expenses} color="text-red-500" />
            <div className="border-t-2 border-black my-4"></div>

            <Row label="صافي الربح / الخسارة (Net Income)" value={data.netProfit} size="text-3xl" color={data.netProfit >= 0 ? "text-green-700" : "text-red-700"} bold bg="bg-yellow-50 p-4 rounded" />
        </div>
    </div>
);

const BalanceSheetView = ({ data }: any) => (
    <div className="grid grid-cols-2 gap-8">
        <div>
            <h3 className="text-xl font-bold border-b-2 border-green-500 pb-2 mb-4">الأصول (Assets)</h3>
            <table className="w-full">
                <tbody>
                    {data.assets.map((a: any) => (
                        <tr key={a.id} className="border-b border-gray-100">
                            <td className="py-2">{a.name}</td>
                            <td className="py-2 text-left font-mono">{a.balance.toFixed(2)}</td>
                        </tr>
                    ))}
                    <tr className="font-bold text-lg bg-green-50">
                        <td className="p-2">مجموع الأصول</td>
                        <td className="p-2 text-left">{data.totalAssets.toFixed(2)}</td>
                    </tr>
                </tbody>
            </table>
        </div>

        <div>
            <h3 className="text-xl font-bold border-b-2 border-red-500 pb-2 mb-4">الخصوم وحقوق الملكية</h3>
            <div className="mb-6">
                <h4 className="font-bold text-gray-500 mb-2">الخصوم (Liabilities)</h4>
                <table className="w-full">
                    <tbody>
                        {data.liabilities.map((l: any) => (
                            <tr key={l.id} className="border-b border-gray-100">
                                <td className="py-2">{l.name}</td>
                                <td className="py-2 text-left font-mono">{l.balance.toFixed(2)}</td>
                            </tr>
                        ))}
                        <tr className="font-bold bg-gray-50">
                            <td className="p-2">مجموع الخصوم</td>
                            <td className="p-2 text-left">{data.totalLiabilities.toFixed(2)}</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <div>
                <h4 className="font-bold text-gray-500 mb-2">حقوق الملكية (Equity)</h4>
                <table className="w-full">
                    <tbody>
                        {data.equity.map((e: any) => (
                            <tr key={e.id} className="border-b border-gray-100">
                                <td className="py-2">{e.name}</td>
                                <td className="py-2 text-left font-mono">{e.balance.toFixed(2)}</td>
                            </tr>
                        ))}
                        <tr className="font-bold bg-gray-50">
                            <td className="p-2">مجموع الملكية</td>
                            <td className="p-2 text-left">{data.totalEquity.toFixed(2)}</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <div className="mt-4 p-2 bg-red-50 border border-red-200 rounded font-bold flex justify-between">
                <span>إجمالي الخصوم والملكية</span>
                <span>{(data.totalLiabilities + data.totalEquity).toFixed(2)}</span>
            </div>
        </div>
    </div>
);

const AgingView = ({ data }: any) => (
    <div>
        <h2 className="text-xl font-bold text-gray-800 mb-4">تقرير أعمار الديون (Aging Analysis)</h2>
        <table className="w-full text-right border-collapse">
            <thead className="bg-gray-100 font-bold text-gray-600">
                <tr>
                    <th className="p-3 border">العميل</th>
                    <th className="p-3 border">الرصيد الكلي</th>
                    <th className="p-3 border bg-green-50 text-green-700">0 - 30 يوم</th>
                    <th className="p-3 border bg-yellow-50 text-yellow-700">31 - 60 يوم</th>
                    <th className="p-3 border bg-orange-50 text-orange-700">61 - 90 يوم</th>
                    <th className="p-3 border bg-red-50 text-red-700">90+ يوم</th>
                    <th className="p-3 border">تذكير</th>
                </tr>
            </thead>
            <tbody>
                {data.map((row: any) => (
                    <tr key={row.id} className="border-b hover:bg-gray-50">
                        <td className="p-3 border font-bold">{row.name}</td>
                        <td className="p-3 border font-mono font-bold">{row.balance.toFixed(2)}</td>
                        <td className="p-3 border font-mono text-green-600">{row.buckets['0-30'].toFixed(2)}</td>
                        <td className="p-3 border font-mono text-yellow-600">{row.buckets['31-60'].toFixed(2)}</td>
                        <td className="p-3 border font-mono text-orange-600">{row.buckets['61-90'].toFixed(2)}</td>
                        <td className="p-3 border font-mono text-red-600 font-bold bg-red-50">{row.buckets['90+'].toFixed(2)}</td>
                        <td className="p-3 border text-center">
                            {row.balance > 0 && (
                                <a
                                    href={`https://wa.me/?text=عزيزي ${row.name}، نود تذكيركم بسداد الرصيد المستحق ${row.balance} شيكل.`}
                                    target="_blank"
                                    className="bg-green-500 text-white px-2 py-1 rounded text-xs hover:bg-green-600"
                                >
                                    WhatsApp
                                </a>
                            )}
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    </div>
);

const TabButton = ({ id, label, icon, active, onClick }: any) => (
    <button
        onClick={() => onClick(id)}
        className={`px-4 py-2 rounded-lg flex items-center gap-2 font-bold transition ${active === id ? 'bg-purple-100 text-purple-700' : 'text-gray-500 hover:bg-gray-100'}`}
    >
        {icon} {label}
    </button>
);

const Row = ({ label, value, color = "text-gray-800", bold, size = "text-base", bg }: any) => (
    <div className={`flex justify-between items-center ${bg}`}>
        <span className={`${bold ? 'font-bold' : ''} ${color}`}>{label}</span>
        <span className={`font-mono ${bold ? 'font-bold' : ''} ${size} ${color}`}>
            {Number(value).toLocaleString(undefined, { minimumFractionDigits: 2 })}
        </span>
    </div>
);
