import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, FileText, ArrowRight } from 'lucide-react';
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

const GoodsReceiptList = () => {
    const navigate = useNavigate();
    const [receipts, setReceipts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            // @ts-ignore
            const data = await window.electronAPI.inventory.getGoodsReceipts();
            setReceipts(data || []);
        } catch (error) {
            console.error("Failed to load goods receipts", error);
        } finally {
            setLoading(false);
        }
    };

    const filteredReceipts = receipts.filter(doc =>
        (doc.code && doc.code.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (doc.warehouse_name && doc.warehouse_name.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
        <div className="p-6 space-y-6 bg-slate-50 min-h-screen font-sans" dir="rtl">
            <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">سندات استلام بضائع</h1>
                    <p className="text-slate-500 text-sm mt-1">إدارة سندات استلام البضائع (GRN)</p>
                </div>
                <Button onClick={() => navigate('/trade/purchasing/receipt/new')} className="bg-blue-600 hover:bg-blue-700 gap-2">
                    <Plus className="w-4 h-4" />
                    سند جديد
                </Button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4">
                <div className="mb-6 relative max-w-md">
                    <Search className="absolute right-3 top-2.5 w-5 h-5 text-slate-400" />
                    <Input
                        placeholder="بحث برقم السند أو المستودع..."
                        className="pr-10"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-slate-100">
                                <th className="text-right p-3 text-slate-500 font-medium">رقم السند</th>
                                <th className="text-right p-3 text-slate-500 font-medium">التاريخ</th>
                                <th className="text-right p-3 text-slate-500 font-medium">المستودع</th>
                                <th className="text-right p-3 text-slate-500 font-medium">الحالة</th>
                                <th className="p-3"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="text-center p-8 text-slate-500">جاري التحميل...</td>
                                </tr>
                            ) : filteredReceipts.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="text-center p-8 text-slate-500">لا توجد سندات</td>
                                </tr>
                            ) : (
                                filteredReceipts.map((doc) => (
                                    <tr
                                        key={doc.id}
                                        className="hover:bg-slate-50 cursor-pointer transition-colors"
                                        onClick={() => navigate(`/trade/purchasing/receipt/${doc.id}`)}
                                    >
                                        <td className="p-3 font-medium text-slate-700 flex items-center gap-2">
                                            <FileText className="w-4 h-4 text-blue-500" />
                                            {doc.code}
                                        </td>
                                        <td className="p-3 text-slate-600">{doc.date}</td>
                                        <td className="p-3 text-slate-600">{doc.warehouse_name || '-'}</td>
                                        <td className="p-3">
                                            <Badge variant="secondary" className={doc.status === 'POSTED' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}>
                                                {doc.status === 'POSTED' ? 'مرحل' : 'مسودة'}
                                            </Badge>
                                        </td>
                                        <td className="p-3 text-left">
                                            <Button variant="ghost" size="sm">
                                                <ArrowRight className="w-4 h-4" />
                                            </Button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default GoodsReceiptList;
