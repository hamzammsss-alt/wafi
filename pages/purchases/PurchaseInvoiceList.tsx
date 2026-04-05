import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, ArrowRight } from 'lucide-react';
import { Card } from '@/components/ui/Card';

// Inline UI Components since they don't exist in @/components/ui/
const Button = ({ children, variant, className, onClick, disabled }: any) => {
    const base = "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 h-9 px-4 py-2";
    const variants: any = {
        default: "bg-blue-600 text-white hover:bg-blue-700 shadow",
        ghost: "hover:bg-slate-100 hover:text-slate-900",
        outline: "border border-slate-200 bg-white hover:bg-slate-100 text-slate-900"
    };
    return <button onClick={onClick} disabled={disabled} className={`${base} ${variants[variant || 'default']} ${className}`}>{children}</button>;
};

const Input = ({ className, ...props }: any) => (
    <input className={`flex h-9 w-full rounded-md border border-slate-200 bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-950 disabled:cursor-not-allowed disabled:opacity-50 ${className}`} {...props} />
);

const Badge = ({ children, className }: any) => (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${className}`}>
        {children}
    </span>
);

const PurchaseInvoiceList = () => {
    const navigate = useNavigate();
    const [invoices, setInvoices] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            // Helper to safe access the new API method
            const api = window.electronAPI.purchase as any;
            if (api && api.getInvoices) {
                const data = await api.getInvoices();
                setInvoices(data || []);
            } else {
                console.error("getInvoices method not found on window.electronAPI.purchase");
                setInvoices([]);
            }
        } catch (error) {
            console.error("Failed to load purchase invoices", error);
        } finally {
            setLoading(false);
        }
    };

    const filteredInvoices = invoices.filter(inv =>
        (inv.invoice_no && inv.invoice_no.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (inv.supplier_name && inv.supplier_name.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
        <div className="p-6 space-y-6 bg-slate-50 min-h-screen font-sans" dir="rtl">
            <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">فواتير المشتريات</h1>
                    <p className="text-slate-500 text-sm mt-1">إدارة فواتير المشتريات المحلية</p>
                </div>
                <Button onClick={() => navigate('/trade/purchasing/invoice')} className="bg-blue-600 hover:bg-blue-700 gap-2">
                    <Plus className="w-4 h-4" />
                    فاتورة جديدة
                </Button>
            </div>

            <Card className="p-4 border-slate-100 shadow-sm">
                <div className="mb-6 relative max-w-md">
                    <Search className="absolute right-3 top-2.5 w-5 h-5 text-slate-400" />
                    <Input
                        placeholder="بحث برقم الفاتورة أو اسم المورد..."
                        className="pr-10 bg-slate-50 border-slate-200"
                        value={searchTerm}
                        onChange={(e: any) => setSearchTerm(e.target.value)}
                    />
                </div>

                {loading ? (
                    <div className="text-center py-10 text-slate-500">جاري التحميل...</div>
                ) : filteredInvoices.length === 0 ? (
                    <div className="text-center py-10 text-slate-500 bg-slate-50 rounded-lg border border-dashed border-slate-300">
                        لا توجد فواتير مشتريات
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-right">
                            <thead className="bg-slate-50 text-slate-700 font-bold text-sm border-b border-slate-200">
                                <tr>
                                    <th className="px-4 py-3">رقم الفاتورة</th>
                                    <th className="px-4 py-3">تاريخ الفاتورة</th>
                                    <th className="px-4 py-3">المورد</th>
                                    <th className="px-4 py-3 text-center">المبلغ الإجمالي</th>
                                    <th className="px-4 py-3 text-center">الحالة</th>
                                    <th className="px-4 py-3 w-10"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredInvoices.map((inv) => (
                                    <tr key={inv.id} className="hover:bg-blue-50/50 transition-colors group cursor-pointer" onClick={() => navigate(`/trade/purchasing/invoice/${inv.id}`)}>
                                        <td className="px-4 py-3 font-mono font-bold text-blue-600">{inv.invoice_no}</td>
                                        <td className="px-4 py-3 text-slate-600">{new Date(inv.date).toLocaleDateString('en-GB')}</td>
                                        <td className="px-4 py-3 font-medium">{inv.supplier_name || '-'}</td>
                                        <td className="px-4 py-3 text-center font-bold font-mono">
                                            {Number(inv.grand_total).toLocaleString()} {inv.currency_id}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <Badge className={inv.status === 'POSTED' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-700'}>
                                                {inv.status === 'POSTED' ? 'مرحل' : inv.status}
                                            </Badge>
                                        </td>
                                        <td className="px-4 py-3">
                                            <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100">
                                                <ArrowRight className="w-4 h-4 text-slate-400" />
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>
        </div>
    );
};

export default PurchaseInvoiceList;
