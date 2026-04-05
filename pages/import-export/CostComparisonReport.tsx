import React, { useState, useEffect } from 'react';
import { Search, TrendingUp, Filter, ArrowRight, Package } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useTabs } from '../../src/contexts/TabsContext';

const CostComparisonReport = () => {
    const { navigateInTab } = useTabs();
    const [items, setItems] = useState<any[]>([]);
    const [selectedItem, setSelectedItem] = useState('');
    const [history, setHistory] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');

    useEffect(() => {
        loadItems();
    }, []);

    // Safe Render Logic
    const chartRef = React.useRef<HTMLDivElement>(null);
    const [shouldRender, setShouldRender] = useState(false);

    useEffect(() => {
        if (!chartRef.current) return;
        const observer = new ResizeObserver(entries => {
            for (const entry of entries) {
                const { width, height } = entry.contentRect;
                setShouldRender(width > 0 && height > 0);
            }
        });
        observer.observe(chartRef.current);
        return () => observer.disconnect();
    }, []);

    const loadItems = async () => {
        try {
            const data = await window.electronAPI.inventory.getItems();
            setItems(data || []);
        } catch (error) {
            console.error(error);
        }
    };

    const handleItemSelect = async (itemId: string) => {
        setSelectedItem(itemId);
        try {
            setLoading(true);
            const data = await window.electronAPI.import.getItemCostComparison(itemId);
            setHistory(data || []);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const filteredItems = items.filter(i =>
        i.name_ar?.includes(search) || i.code?.includes(search)
    ).slice(0, 10);

    const chartData = [...history].reverse().map(h => ({
        date: h.allocation_date,
        'سعر الشراء (FOB)': h.fob_value / h.quantity,
        'التكلفة الواصلة (Landed)': h.new_cost,
        shipment: h.shipment_no
    }));

    const currentItem = items.find(i => i.id === selectedItem);

    return (
        <div className="p-6 space-y-6 bg-slate-50 min-h-screen" dir="rtl">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        <TrendingUp size={28} className="text-blue-600" />
                        مقارنة تكاليف الأصناف (Cost Trends)
                    </h1>
                    <p className="text-slate-500 text-sm">تتبع تذبذب تكلفة الأصناف المستوردة عبر الشحنات المختلفة</p>
                </div>
            </div>

            <div className="grid grid-cols-12 gap-6">
                {/* Item Selector */}
                <div className="col-span-12 lg:col-span-4">
                    <Card className="h-full">
                        <CardHeader className="border-b">
                            <CardTitle className="text-sm font-bold">اختر الصنف للمقارنة</CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 space-y-4">
                            <div className="relative">
                                <Search className="absolute right-3 top-2.5 w-4 h-4 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="بحث بالاسم أو الكود..."
                                    className="w-full pr-10 pl-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                />
                            </div>
                            <div className="space-y-1">
                                {filteredItems.map(item => (
                                    <button
                                        key={item.id}
                                        onClick={() => handleItemSelect(item.id)}
                                        className={`w-full text-right p-3 rounded-lg text-sm transition-all flex justify-between items-center ${selectedItem === item.id ? 'bg-blue-600 text-white shadow-md' : 'hover:bg-slate-100 text-slate-700'}`}
                                    >
                                        <div className="flex flex-col">
                                            <span className="font-bold">{item.name_ar}</span>
                                            <span className={`text-[10px] ${selectedItem === item.id ? 'text-blue-100' : 'text-slate-400'}`}>{item.code}</span>
                                        </div>
                                        <Package size={16} className={selectedItem === item.id ? 'opacity-50' : 'text-slate-300'} />
                                    </button>
                                ))}
                                {search && filteredItems.length === 0 && (
                                    <p className="text-center p-4 text-slate-400 italic text-sm">لا توجد نتائج</p>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Analysis Content */}
                <div className="col-span-12 lg:col-span-8 space-y-6">
                    {!selectedItem ? (
                        <Card className="h-full flex items-center justify-center p-20 border-dashed border-2 border-slate-200 bg-transparent">
                            <div className="text-center space-y-2">
                                <TrendingUp size={48} className="text-slate-200 mx-auto" />
                                <p className="text-slate-400 font-medium tracking-wide">الرجاء اختيار صنف من القائمة اليمنى لعرض التقرير</p>
                            </div>
                        </Card>
                    ) : (
                        <>
                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between border-b">
                                    <CardTitle className="text-lg font-bold">منحنى التكلفة: {currentItem?.name_ar}</CardTitle>
                                    <span className="text-xs bg-slate-100 px-2 py-1 rounded text-slate-500">{currentItem?.code}</span>
                                </CardHeader>
                                <CardContent className="pt-6">
                                    <div ref={chartRef} className="h-[350px] w-full" style={{ minWidth: 200, minHeight: 200, display: 'block' }}>
                                        {shouldRender && (
                                            <ResponsiveContainer width="100%" height="100%" minWidth={50} minHeight={50} debounce={300}>
                                                <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                                    <XAxis dataKey="date" />
                                                    <YAxis />
                                                    <Tooltip
                                                        contentStyle={{ direction: 'rtl', textAlign: 'right', borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                                        labelStyle={{ fontWeight: 'bold', marginBottom: '4px' }}
                                                    />
                                                    <Legend />
                                                    <Line type="monotone" dataKey="سعر الشراء (FOB)" stroke="#94a3b8" strokeWidth={2} dot={{ r: 4 }} />
                                                    <Line type="monotone" dataKey="التكلفة الواصلة (Landed)" stroke="#2563eb" strokeWidth={3} dot={{ r: 6 }} />
                                                </LineChart>
                                            </ResponsiveContainer>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader className="border-b">
                                    <CardTitle className="text-sm font-bold">تاريخ التكاليف</CardTitle>
                                </CardHeader>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-right text-sm">
                                        <thead>
                                            <tr className="bg-slate-50 border-b">
                                                <th className="p-3">تاريخ الاحتساب</th>
                                                <th className="p-3">رقم الشحنة</th>
                                                <th className="p-3">المورد</th>
                                                <th className="p-3"> الكمية</th>
                                                <th className="p-3">سعر FOB</th>
                                                <th className="p-3 font-bold text-blue-600">التكلفة الواصلة</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y">
                                            {history.map((h, i) => (
                                                <tr key={i} className="hover:bg-slate-50">
                                                    <td className="p-3">{h.allocation_date}</td>
                                                    <td className="p-3 font-medium">{h.shipment_no}</td>
                                                    <td className="p-3 text-slate-500">{h.supplier_name}</td>
                                                    <td className="p-3">{h.quantity}</td>
                                                    <td className="p-3 text-slate-400">{(h.fob_value / h.quantity).toFixed(2)}</td>
                                                    <td className="p-3 font-bold text-blue-600 tabular-nums">{h.new_cost.toFixed(2)}</td>
                                                </tr>
                                            ))}
                                            {history.length === 0 && (
                                                <tr><td colSpan={6} className="p-8 text-center text-slate-400 italic">لم يتم احتساب تكلفة landed لهذا الصنف في أي شحنة بعد</td></tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </Card>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CostComparisonReport;
