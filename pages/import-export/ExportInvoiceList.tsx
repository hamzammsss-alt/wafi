import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Plus, Search, Filter, ArrowRight, Eye, Edit, Trash2, Box } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { useTabs } from '../../src/contexts/TabsContext';

const Button = ({ children, variant, className, onClick, disabled }: any) => {
    const base = "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors h-9 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-slate-400";
    const variants: any = {
        default: "bg-blue-600 text-white hover:bg-blue-700 shadow",
        outline: "border border-slate-200 bg-transparent shadow-sm hover:bg-slate-100",
        destructive: "bg-red-500 text-white hover:bg-red-600",
        ghost: "hover:bg-slate-100",
    };
    return <button disabled={disabled} onClick={onClick} className={`${base} ${variants[variant || 'default']} ${className}`}>{children}</button>;
};

const ExportInvoiceList = () => {
    const navigate = useNavigate();
    const { navigateInTab } = useTabs();
    const [invoices, setInvoices] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [filters, setFilters] = useState({
        search: '',
        status: ''
    });

    useEffect(() => {
        loadInvoices();
    }, [filters.status]);

    const loadInvoices = async () => {
        try {
            setLoading(true);
            const data = await window.electronAPI.export.getInvoices(filters);
            setInvoices(data || []);
        } catch (error) {
            console.error('Error loading export invoices:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('هل أنت متأكد من حذف هذه الفاتورة؟')) return;
        try {
            const result = await window.electronAPI.export.deleteInvoice(id);
            if (result.success) {
                loadInvoices();
            }
        } catch (error) {
            alert('حدث خطأ أثناء الحذف');
        }
    };

    return (
        <div className="p-6 space-y-6 bg-slate-50 min-h-screen" dir="rtl">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        <FileText className="text-blue-600" />
                        فواتير التصدير (Export Invoices)
                    </h1>
                    <p className="text-slate-500 text-sm">إدارة كافة فواتير المبيعات الخارجية</p>
                </div>
                <Button onClick={() => navigateInTab('/export/invoice/new', 'فاتورة تصدير جديدة')} className="gap-2">
                    <Plus className="w-4 h-4" />
                    فاتورة تصدير جديدة
                </Button>
            </div>

            {/* Filters */}
            <Card>
                <CardContent className="p-4">
                    <div className="flex gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute right-3 top-2.5 w-4 h-4 text-slate-400" />
                            <input
                                type="text"
                                className="w-full pr-10 pl-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm"
                                placeholder="بحث برقم الفاتورة أو الزبون..."
                                value={filters.search}
                                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                            />
                        </div>
                        <select
                            className="bg-slate-50 border border-slate-200 rounded-lg text-sm px-4 py-2"
                            value={filters.status}
                            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                        >
                            <option value="">كل الحالات</option>
                            <option value="DRAFT">مسودة</option>
                            <option value="POSTED">معتمد</option>
                            <option value="CANCELLED">ملغى</option>
                        </select>
                        <Button variant="outline" onClick={loadInvoices}>تحديث</Button>
                    </div>
                </CardContent>
            </Card>

            {/* Invoices Table */}
            <Card>
                <div className="overflow-x-auto">
                    <table className="w-full text-right border-collapse">
                        <thead>
                            <tr className="bg-slate-100 border-b">
                                <th className="p-3 text-sm font-bold">رقم الفاتورة</th>
                                <th className="p-3 text-sm font-bold">التاريخ</th>
                                <th className="p-3 text-sm font-bold">المستورد (الزبون)</th>
                                <th className="p-3 text-sm font-bold">الوجهة</th>
                                <th className="p-3 text-sm font-bold">المبلغ</th>
                                <th className="p-3 text-sm font-bold">العملة</th>
                                <th className="p-3 text-sm font-bold">الحالة</th>
                                <th className="p-3 text-sm font-bold w-40 text-left">إجراءات</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {loading ? (
                                <tr><td colSpan={8} className="p-8 text-center text-slate-400">جاري التحميل...</td></tr>
                            ) : invoices.length === 0 ? (
                                <tr><td colSpan={8} className="p-8 text-center text-slate-400 italic">لا توجد فواتير تصدير حالياً</td></tr>
                            ) : (
                                invoices.map((inv) => (
                                    <tr key={inv.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="p-3 font-bold text-slate-700">{inv.invoice_no}</td>
                                        <td className="p-3 text-slate-600">{inv.invoice_date}</td>
                                        <td className="p-3 font-medium text-slate-900">{inv.customer_name}</td>
                                        <td className="p-3">
                                            <span className="text-xs bg-slate-100 px-2 py-1 rounded text-slate-600">
                                                {inv.destination_country || '-'} / {inv.destination_port || '-'}
                                            </span>
                                        </td>
                                        <td className="p-3 font-bold tabular-nums">{(inv.total_amount || 0).toLocaleString()}</td>
                                        <td className="p-3 text-slate-500">{inv.currency_id}</td>
                                        <td className="p-3">
                                            <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${inv.status === 'POSTED' ? 'bg-green-100 text-green-700' :
                                                    inv.status === 'CANCELLED' ? 'bg-red-100 text-red-700' :
                                                        'bg-amber-100 text-amber-700'
                                                }`}>
                                                {inv.status === 'POSTED' ? 'معتمد' : inv.status === 'CANCELLED' ? 'ملغى' : 'مسودة'}
                                            </span>
                                        </td>
                                        <td className="p-3">
                                            <div className="flex gap-1 justify-end">
                                                <Button
                                                    variant="ghost"
                                                    onClick={() => navigateInTab(`/export/invoice/${inv.id}`, `فاتورة ${inv.invoice_no}`)}
                                                    className="h-8 w-8 p-0"
                                                    title="تعديل"
                                                >
                                                    <Edit size={16} className="text-blue-600" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    onClick={() => navigateInTab(`/export/packing-list/new?invoiceId=${inv.id}`, 'قائمة تعبئة جديدة')}
                                                    className="h-8 w-8 p-0"
                                                    title="إنشاء قائمة تعبئة"
                                                >
                                                    <Box size={16} className="text-orange-600" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    onClick={() => navigateInTab(`/export/certificate-origin/${inv.id}`, 'شهادة منشأ')}
                                                    className="h-8 w-8 p-0"
                                                    title="شهادة المنشأ"
                                                >
                                                    <ShieldCheck size={16} className="text-green-600" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    onClick={() => handleDelete(inv.id)}
                                                    className="h-8 w-8 p-0"
                                                    title="حذف"
                                                >
                                                    <Trash2 size={16} className="text-red-600" />
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
};

// Internal Import for ShieldCheck which I forgot to add in lucide-react imports above
import { ShieldCheck } from 'lucide-react';

export default ExportInvoiceList;
