import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FileText, Printer, ArrowRight, DollarSign, PieChart, TrendingUp, Package } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { useTabs } from '../../src/contexts/TabsContext';

const ShipmentCostReport = () => {
    const { id } = useParams();
    const { navigateInTab } = useTabs();
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (id) loadData();
    }, [id]);

    const loadData = async () => {
        try {
            setLoading(true);
            const reportData = await window.electronAPI.import.getShipmentCostBreakdown(id!);
            setData(reportData);
        } catch (error) {
            console.error('Failed to load shipment cost report:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="p-10 text-center">جاري تحميل البيانات...</div>;
    if (!data) return <div className="p-10 text-center text-red-500">حدث خطأ في تحميل التقرير</div>;

    const { shipment, commercial_invoices, clearance_expenses, total_goods_value, total_expenses, total_cost } = data;

    const expensePercentage = total_cost > 0 ? (total_expenses / total_cost) * 100 : 0;

    return (
        <div className="p-6 space-y-6 bg-slate-50 min-h-screen" dir="rtl">
            {/* Toolbar */}
            <div className="flex justify-between items-center print:hidden">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigateInTab(`/import/shipments/${id}`, 'تفاصيل الشحنة')} className="p-2 hover:bg-white rounded-lg transition-colors">
                        <ArrowRight className="w-5 h-5" />
                    </button>
                    <h1 className="text-2xl font-bold text-slate-900">تقرير تكاليف الشحنة: {shipment.shipment_no}</h1>
                </div>
                <button onClick={() => window.print()} className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold flex items-center gap-2 shadow-lg hover:bg-blue-700">
                    <Printer size={18} />
                    طباعة التقرير
                </button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="bg-gradient-to-br from-blue-600 to-blue-700 text-white">
                    <CardContent className="p-6">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-blue-100 text-sm font-medium">إجمالي قيمة البضاعة (FOB)</p>
                                <h3 className="text-3xl font-bold mt-1 tabular-nums">{total_goods_value.toLocaleString()}</h3>
                            </div>
                            <div className="p-2 bg-white/10 rounded-lg">
                                <Package className="w-6 h-6" />
                            </div>
                        </div>
                        <p className="text-blue-200 text-xs mt-4">بناءً على الفواتير التجارية المرفقة</p>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white">
                    <CardContent className="p-6">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-orange-100 text-sm font-medium">إجمالي مصاريف التخليص</p>
                                <h3 className="text-3xl font-bold mt-1 tabular-nums">{total_expenses.toLocaleString()}</h3>
                            </div>
                            <div className="p-2 bg-white/10 rounded-lg">
                                <DollarSign className="w-6 h-6" />
                            </div>
                        </div>
                        <div className="mt-4 flex items-center gap-2">
                            <div className="flex-1 h-1.5 bg-white/20 rounded-full overflow-hidden">
                                <div className="h-full bg-white" style={{ width: `${expensePercentage}%` }}></div>
                            </div>
                            <span className="text-xs font-bold">{expensePercentage.toFixed(1)}%</span>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-emerald-600 to-emerald-700 text-white">
                    <CardContent className="p-6">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-emerald-100 text-sm font-medium">التكلفة الإجمالية الواصلة</p>
                                <h3 className="text-3xl font-bold mt-1 tabular-nums">{total_cost.toLocaleString()}</h3>
                            </div>
                            <div className="p-2 bg-white/10 rounded-lg">
                                <TrendingUp className="w-6 h-6" />
                            </div>
                        </div>
                        <p className="text-emerald-200 text-xs mt-4">ILS (عملة التقرير الأساسية)</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Invoices Details */}
                <Card>
                    <CardHeader className="border-b">
                        <CardTitle className="text-lg flex items-center gap-2">
                            <FileText size={20} className="text-blue-600" />
                            الفواتير التجارية (Commercial Invoices)
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <table className="w-full text-right">
                            <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
                                <tr>
                                    <th className="p-4 font-bold text-slate-700">رقم الفاتورة</th>
                                    <th className="p-4 font-bold text-slate-700">المبلغ</th>
                                    <th className="p-4 font-bold text-slate-700">العملة</th>
                                    <th className="p-4 font-bold text-slate-700">القيمة بـ ILS</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y text-sm">
                                {commercial_invoices.map((inv: any) => (
                                    <tr key={inv.id} className="hover:bg-slate-50">
                                        <td className="p-4 font-bold">{inv.invoice_no}</td>
                                        <td className="p-4 tabular-nums">{inv.total_amount.toLocaleString()}</td>
                                        <td className="p-4 text-slate-500">{inv.currency_id}</td>
                                        <td className="p-4 font-bold tabular-nums">{(inv.total_amount * inv.exchange_rate).toLocaleString()}</td>
                                    </tr>
                                ))}
                                {commercial_invoices.length === 0 && (
                                    <tr><td colSpan={4} className="p-8 text-center text-slate-400 italic">لا توجد فواتير مرتبطة</td></tr>
                                )}
                            </tbody>
                        </table>
                    </CardContent>
                </Card>

                {/* Expenses Details */}
                <Card>
                    <CardHeader className="border-b">
                        <CardTitle className="text-lg flex items-center gap-2">
                            <PieChart size={20} className="text-orange-600" />
                            تفاصيل المصاريف
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <table className="w-full text-right">
                            <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
                                <tr>
                                    <th className="p-4 font-bold text-slate-700">نوع المصروف</th>
                                    <th className="p-4 font-bold text-slate-700">الوصف</th>
                                    <th className="p-4 font-bold text-slate-700 text-left">المبلغ (ILS)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y text-sm">
                                {clearance_expenses.map((exp: any) => (
                                    <tr key={exp.id} className="hover:bg-slate-50">
                                        <td className="p-4">
                                            <span className="bg-slate-100 px-2 py-1 rounded text-slate-600 font-medium">
                                                {exp.expense_type}
                                            </span>
                                        </td>
                                        <td className="p-4 text-slate-500">{exp.description}</td>
                                        <td className="p-4 font-bold tabular-nums text-left">{exp.amount_base_currency?.toLocaleString()}</td>
                                    </tr>
                                ))}
                                {clearance_expenses.length === 0 && (
                                    <tr><td colSpan={3} className="p-8 text-center text-slate-400 italic">لا توجد مصاريف تخليص مسجلة</td></tr>
                                )}
                            </tbody>
                            {clearance_expenses.length > 0 && (
                                <tfoot className="bg-slate-50 font-bold border-t">
                                    <tr>
                                        <td colSpan={2} className="p-4 text-right uppercase tracking-wider text-slate-500">الإجمالي</td>
                                        <td className="p-4 text-left tabular-nums">{total_expenses.toLocaleString()}</td>
                                    </tr>
                                </tfoot>
                            )}
                        </table>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default ShipmentCostReport;
