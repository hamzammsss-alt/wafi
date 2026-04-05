import React, { useState, useEffect } from 'react';
import { ArrowLeftRight, Clock, TrendingUp, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    AreaChart,
    Area
} from 'recharts';

interface Currency {
    id: string;
    code: string;
    name_ar: string;
    exchange_rate: number;
    is_base: number;
    symbol: string;
    last_update?: string;
}

interface HistoryPoint {
    date: string;
    rate: number;
}

export const CurrencyConverter = () => {
    const [currencies, setCurrencies] = useState<Currency[]>([]);
    const [amount, setAmount] = useState<number>(100);
    const [fromCurrency, setFromCurrency] = useState<string>('');
    const [toCurrency, setToCurrency] = useState<string>('');
    const [baseCurrency, setBaseCurrency] = useState<Currency | null>(null);
    const [loading, setLoading] = useState(true);
    const [history, setHistory] = useState<HistoryPoint[]>([]);
    const [historyLoading, setHistoryLoading] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    // Safe Chart Rendering
    const chartContainerRef = React.useRef<HTMLDivElement>(null);
    const [shouldRenderChart, setShouldRenderChart] = useState(false);

    useEffect(() => {
        if (!chartContainerRef.current) return;
        const observer = new ResizeObserver(entries => {
            for (const entry of entries) {
                const { width, height } = entry.contentRect;
                setShouldRenderChart(width > 0 && height > 0);
            }
        });
        observer.observe(chartContainerRef.current);
        return () => observer.disconnect();
    }, []);

    const loadData = async () => {
        try {
            const list = await window.electronAPI.currency.getCurrencies();
            const base = list.find((c: Currency) => c.is_base);
            setCurrencies(list);
            setBaseCurrency(base || null);

            // Defaults
            if (list.length > 0) {
                const usd = list.find((c: Currency) => c.code === 'USD');
                const ils = list.find((c: Currency) => c.code === 'ILS'); // Or Base

                setFromCurrency(usd ? usd.code : list[0].code);
                setToCurrency(base ? base.code : (ils ? ils.code : list[1]?.code));
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    // Fetch history when currency changes
    useEffect(() => {
        if (fromCurrency) {
            fetchHistory();
        }
    }, [fromCurrency]); // Simplify: Show history of Source Currency vs Base

    const fetchHistory = async () => {
        setHistoryLoading(true);
        try {
            // We fetch history for the "From" currency
            const data = await window.electronAPI.currency.getCurrencyHistory(fromCurrency, 30);
            setHistory(data);
        } catch (err) {
            console.error(err);
        } finally {
            setHistoryLoading(false);
        }
    };

    const getRate = (code: string) => {
        const c = currencies.find(x => x.code === code);
        return c ? c.exchange_rate : 1;
    };

    // Conversion Logic
    // Logic: (Amount * FromRate) / ToRate
    // Example: 100 USD (3.5) -> JOD (5.0)
    // Value in Base (ILS) = 100 * 3.5 = 350 ILS
    // Value in JOD = 350 / 5.0 = 70 JOD
    const fromRate = getRate(fromCurrency);
    const toRate = getRate(toCurrency);
    const result = (amount * fromRate) / toRate;

    // One Unit Price
    const oneUnitPrice = (1 * fromRate) / toRate;

    const swapCurrencies = () => {
        setFromCurrency(toCurrency);
        setToCurrency(fromCurrency);
    };

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white p-3 border border-gray-100 shadow-xl rounded-lg text-sm">
                    <p className="font-bold text-gray-700 mb-1">{label}</p>
                    <p className="text-blue-600 font-mono">
                        {payload[0].value.toFixed(4)} {baseCurrency?.symbol}
                    </p>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="min-h-screen bg-gray-50/50 p-6 md:p-12 font-sans" dir="rtl">
            <div className="max-w-4xl mx-auto space-y-6">

                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
                            <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                                <RefreshCw size={24} />
                            </div>
                            محول العملات الذكي
                        </h1>
                        <p className="text-gray-500 mt-2 mr-14">تحويل لحظي مع أسعار صرف حقيقية من السوق</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Converter Card */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 lg:col-span-1 h-fit"
                    >
                        <div className="space-y-6">

                            {/* Amount */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-600 mb-2">المبلغ</label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        value={amount}
                                        onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xl font-bold text-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                                    />
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium text-sm">
                                        {fromCurrency}
                                    </span>
                                </div>
                            </div>

                            {/* From / To */}
                            <div className="relative">
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-medium text-gray-400 mb-1">من</label>
                                        <select
                                            value={fromCurrency}
                                            onChange={(e) => setFromCurrency(e.target.value)}
                                            className="w-full p-3 bg-white border border-gray-200 rounded-xl font-bold text-gray-700 shadow-sm focus:border-blue-500 outline-none cursor-pointer"
                                        >
                                            {currencies.map(c => (
                                                <option key={c.code} value={c.code}>{c.code} - {c.name_ar}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="flex justify-center -my-3 relative z-10">
                                        <button
                                            onClick={swapCurrencies}
                                            className="p-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-full border border-blue-200 shadow-sm transition-colors"
                                        >
                                            <ArrowLeftRight size={18} />
                                        </button>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-medium text-gray-400 mb-1">إلى</label>
                                        <select
                                            value={toCurrency}
                                            onChange={(e) => setToCurrency(e.target.value)}
                                            className="w-full p-3 bg-white border border-gray-200 rounded-xl font-bold text-gray-700 shadow-sm focus:border-blue-500 outline-none cursor-pointer"
                                        >
                                            {currencies.map(c => (
                                                <option key={c.code} value={c.code}>{c.code} - {c.name_ar}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* Result */}
                            <div className="pt-4 border-t border-gray-100">
                                <div className="text-sm text-gray-500 mb-1 flex justify-between">
                                    <span>النتيجة المقدرة</span>
                                    <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full">
                                        1 {fromCurrency} = {oneUnitPrice.toFixed(4)} {toCurrency}
                                    </span>
                                </div>
                                <div className="text-3xl font-bold text-gray-900 font-mono tracking-tight flex items-baseline gap-2">
                                    {result.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                    <span className="text-lg text-gray-400 font-sans">{toCurrency}</span>
                                </div>
                            </div>
                        </div>
                    </motion.div>

                    {/* Chart Card */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 lg:col-span-2 flex flex-col"
                    >
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                                    <TrendingUp size={20} className="text-blue-500" />
                                    مؤشر الأداء
                                </h2>
                                <p className="text-sm text-gray-500">
                                    تطور سعر صرف <span className="font-bold text-gray-700">{fromCurrency}</span> مقابل العملة الأساسية ({baseCurrency?.code}) آخر 30 يوم
                                </p>
                            </div>
                            {historyLoading && <div className="animate-spin text-blue-500"><RefreshCw size={20} /></div>}
                        </div>

                        <div ref={chartContainerRef} className="flex-1 w-full min-h-[300px]" style={{ minWidth: 200, display: 'block' }}>
                            {history.length > 0 && shouldRenderChart ? (
                                <ResponsiveContainer width="100%" height="100%" minWidth={50} minHeight={50} debounce={300}>
                                    <AreaChart data={history}>
                                        <defs>
                                            <linearGradient id="colorRate" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                                        <XAxis
                                            dataKey="date"
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fill: '#9ca3af', fontSize: 12 }}
                                            tickFormatter={(value) => new Date(value).toLocaleDateString('ar-EG', { day: 'numeric', month: 'short' })}
                                        />
                                        <YAxis
                                            domain={['auto', 'auto']}
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fill: '#9ca3af', fontSize: 12 }}
                                            width={40}
                                        />
                                        <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#3b82f6', strokeWidth: 1, strokeDasharray: '4 4' }} />
                                        <Area
                                            type="monotone"
                                            dataKey="rate"
                                            stroke="#3b82f6"
                                            strokeWidth={3}
                                            fillOpacity={1}
                                            fill="url(#colorRate)"
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-gray-400 bg-gray-50/50 rounded-xl border border-dashed border-gray-200">
                                    <Clock size={40} className="mb-3 opacity-50" />
                                    <p>لا توجد بيانات تاريخية كافية لهذه العملة بعد</p>
                                    <p className="text-xs mt-1">سيتم تجميع البيانات عند التحديث اليومي</p>
                                </div>
                            )}
                        </div>
                    </motion.div>
                </div>

                {/* Info Footer */}
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-start gap-3">
                    <div className="bg-blue-100 p-2 rounded-full text-blue-600 shrink-0">
                        <Clock size={18} />
                    </div>
                    <div>
                        <h4 className="font-bold text-blue-900 text-sm">تنويه هام</h4>
                        <p className="text-xs text-blue-700 mt-1 leading-relaxed">
                            الأسعار المعروضة هي أسعار صرف رسمية من سلطة النقد (أو المصدر المعتمد). قد تختلف الأسعار الفعلية في الصرافات والبنوك حسب العمولات وحالة السوق.
                        </p>
                    </div>
                </div>

            </div>
        </div>
    );
};
