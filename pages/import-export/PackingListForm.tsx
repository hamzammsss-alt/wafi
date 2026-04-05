import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Save, ArrowLeft, Plus, Trash2, Box, FileText, Weight, Maximize } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { useTabs } from '../../src/contexts/TabsContext';

// Local UI Helpers
const Button = ({ children, variant, className, onClick, type, disabled }: any) => {
    const base = "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors h-9 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-slate-400";
    const variants: any = {
        default: "bg-blue-600 text-white hover:bg-blue-700 shadow",
        outline: "border border-slate-200 bg-transparent shadow-sm hover:bg-slate-100",
        destructive: "bg-red-500 text-white hover:bg-red-600",
        ghost: "hover:bg-slate-100",
    };
    return <button type={type} disabled={disabled} onClick={onClick} className={`${base} ${variants[variant || 'default']} ${className}`}>{children}</button>;
};

const Input = ({ className, ...props }: any) => <input className={`flex h-9 w-full rounded-md border border-slate-300 bg-white px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${className}`} {...props} />;
const Label = ({ children }: any) => <label className="text-sm font-medium text-slate-700 mb-1 block">{children}</label>;

const PackingListForm = () => {
    const { id } = useParams();
    const [searchParams] = useSearchParams();
    const invoiceId = searchParams.get('invoiceId');

    const navigate = useNavigate();
    const { navigateInTab } = useTabs();
    const isEdit = id && id !== 'new';

    const [loading, setLoading] = useState(false);
    const [invoice, setInvoice] = useState<any>(null);
    const [header, setHeader] = useState({
        packing_list_no: '',
        export_invoice_id: invoiceId || '',
        packing_date: new Date().toISOString().split('T')[0],
        total_packages: 0,
        total_gross_weight: 0,
        total_net_weight: 0,
        total_volume: 0,
        notes: ''
    });

    const [items, setItems] = useState<any[]>([]);

    useEffect(() => {
        if (isEdit) {
            loadPackingList();
        } else {
            generateNo();
            if (invoiceId) {
                loadInvoice(invoiceId);
            }
        }
    }, [id, invoiceId]);

    const generateNo = () => {
        const timestamp = Date.now().toString().slice(-6);
        setHeader(prev => ({ ...prev, packing_list_no: `PL-${timestamp}` }));
    };

    const loadInvoice = async (invId: string) => {
        try {
            const data = await window.electronAPI.export.getInvoice(invId);
            if (data) {
                setInvoice(data);
                // Pre-fill items from invoice if new
                if (!isEdit) {
                    const plItems = data.lines.map((line: any, idx: number) => ({
                        package_no: (idx + 1).toString(),
                        item_id: line.item_id,
                        item_name: line.item_name,
                        description: line.description,
                        quantity: line.quantity,
                        gross_weight: line.weight_kg || 0,
                        net_weight: (line.weight_kg || 0) * 0.9,
                        dimensions: ''
                    }));
                    setItems(plItems);
                }
            }
        } catch (error) {
            console.error('Error loading invoice:', error);
        }
    };

    const loadPackingList = async () => {
        try {
            setLoading(true);
            const data = await window.electronAPI.export.getPackingList(id as string);
            if (data) {
                setHeader({
                    packing_list_no: data.packing_list_no,
                    export_invoice_id: data.export_invoice_id,
                    packing_date: data.packing_date,
                    total_packages: data.total_packages,
                    total_gross_weight: data.total_gross_weight,
                    total_net_weight: data.total_net_weight,
                    total_volume: data.total_volume,
                    notes: data.notes || ''
                });
                setItems(data.items || []);
                if (data.export_invoice_id) {
                    loadInvoice(data.export_invoice_id);
                }
            }
        } catch (error) {
            console.error('Error loading packing list:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!header.export_invoice_id) {
            alert('الرجاء اختيار الفاتورة المرتبطة');
            return;
        }

        try {
            setLoading(true);
            const totals = {
                total_packages: items.length,
                total_gross_weight: items.reduce((sum, item) => sum + (parseFloat(item.gross_weight) || 0), 0),
                total_net_weight: items.reduce((sum, item) => sum + (parseFloat(item.net_weight) || 0), 0),
                total_volume: items.reduce((sum, item) => sum + (parseFloat(item.volume) || 0), 0),
            };

            const result = await window.electronAPI.export.savePackingList({
                header: { ...header, ...totals },
                items: items
            });

            if (result.success) {
                alert('تم الحفظ بنجاح');
                navigateInTab(`/export/shipments`, `ملفات التصدير`);
            }
        } catch (error) {
            console.error('Error saving packing list:', error);
            alert('حدث خطأ أثناء الحفظ');
        } finally {
            setLoading(false);
        }
    };

    const addItem = () => {
        setItems([...items, {
            package_no: (items.length + 1).toString(),
            item_id: '',
            description: '',
            quantity: 0,
            gross_weight: 0,
            net_weight: 0,
            dimensions: ''
        }]);
    };

    const updateItem = (index: number, field: string, value: any) => {
        const newItems = [...items];
        newItems[index][field] = value;
        setItems(newItems);
    };

    const removeItem = (index: number) => {
        setItems(items.filter((_, i) => i !== index));
    };

    return (
        <div className="p-6 space-y-6 bg-slate-50 min-h-screen" dir="rtl">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-2 hover:bg-gray-100 rounded-full text-gray-600 hover:text-blue-600 transition-colors"
                    >
                        <ArrowLeft size={24} />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                            <Box className="text-blue-600" />
                            {isEdit ? `تعديل قائمة التعبئة #${header.packing_list_no}` : 'قائمة تعبئة جديدة'}
                        </h1>
                        <p className="text-slate-500 text-sm">تفاصيل الطرود والأوزان والأبعاد للشحنة</p>
                    </div>
                </div>
                <Button onClick={handleSave} disabled={loading} className="gap-2">
                    <Save className="w-4 h-4" />
                    {loading ? 'جاري الحفظ...' : 'حفظ القائمة'}
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Header Info */}
                <Card className="md:col-span-2">
                    <CardHeader className="pb-3 border-b">
                        <CardTitle className="text-base font-bold flex items-center gap-2">
                            <FileText className="w-4 h-4 text-slate-400" />
                            المعلومات الأساسية
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <Label>رقم القائمة</Label>
                                <Input
                                    value={header.packing_list_no}
                                    onChange={(e) => setHeader({ ...header, packing_list_no: e.target.value })}
                                />
                            </div>
                            <div>
                                <Label>تاريخ التعبئة</Label>
                                <Input
                                    type="date"
                                    value={header.packing_date}
                                    onChange={(e) => setHeader({ ...header, packing_date: e.target.value })}
                                />
                            </div>
                            <div className="md:col-span-2">
                                <Label>الفاتورة المرتبطة</Label>
                                <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg text-blue-800 text-sm">
                                    {invoice ? (
                                        <div className="flex justify-between items-center">
                                            <span>رقم الفاتورة: {invoice.invoice_no} | التاريخ: {invoice.invoice_date}</span>
                                            <span className="font-bold">{invoice.customer_name}</span>
                                        </div>
                                    ) : (
                                        <span className="text-slate-400 italic">لا توجد فاتورة مرتبطة حالياً</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Summary Card */}
                <Card>
                    <CardHeader className="pb-3 border-b">
                        <CardTitle className="text-base font-bold flex items-center gap-2">
                            <Weight className="w-4 h-4 text-blue-500" />
                            ملخص الشحنة
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6">
                        <div className="space-y-4">
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-slate-500">عدد الطرود:</span>
                                <span className="font-bold">{items.length} طرد</span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-slate-500">إجمالي الوزن القائم (Gross):</span>
                                <span className="font-bold text-orange-600">
                                    {items.reduce((sum, item) => sum + (parseFloat(item.gross_weight) || 0), 0).toFixed(2)} كجم
                                </span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-slate-500">إجمالي الوزن الصافي (Net):</span>
                                <span className="font-bold text-green-600">
                                    {items.reduce((sum, item) => sum + (parseFloat(item.net_weight) || 0), 0).toFixed(2)} كجم
                                </span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Items Grid */}
                <Card className="md:col-span-3">
                    <div className="p-4 border-b flex justify-between items-center bg-slate-50/50">
                        <h3 className="font-bold text-slate-800">تفاصيل الطرود (Packing Details)</h3>
                        <Button onClick={addItem} variant="outline" className="gap-2 bg-white">
                            <Plus className="w-4 h-4" />
                            إضافة طرد
                        </Button>
                    </div>
                    <CardContent className="p-0 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-slate-50 border-b">
                                    <tr>
                                        <th className="p-3 text-right">رقم الطرد</th>
                                        <th className="p-3 text-right">الصنف / الوصف</th>
                                        <th className="p-3 text-right w-24">الكمية</th>
                                        <th className="p-3 text-right w-28 text-orange-700">الوزن القائم (كجم)</th>
                                        <th className="p-3 text-right w-28 text-green-700">الوزن الصافي (كجم)</th>
                                        <th className="p-3 text-right w-40">الأبعاد (سم)</th>
                                        <th className="p-3 w-10"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {items.map((item, index) => (
                                        <tr key={index} className="hover:bg-slate-50">
                                            <td className="p-3">
                                                <Input
                                                    value={item.package_no}
                                                    onChange={(e) => updateItem(index, 'package_no', e.target.value)}
                                                    className="w-20 text-center"
                                                />
                                            </td>
                                            <td className="p-3">
                                                <Input
                                                    value={item.description}
                                                    onChange={(e) => updateItem(index, 'description', e.target.value)}
                                                    placeholder="وصف المحتويات"
                                                />
                                            </td>
                                            <td className="p-3">
                                                <Input
                                                    type="number"
                                                    value={item.quantity}
                                                    onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                                                    className="text-center"
                                                />
                                            </td>
                                            <td className="p-3">
                                                <Input
                                                    type="number"
                                                    step="0.01"
                                                    value={item.gross_weight}
                                                    onChange={(e) => updateItem(index, 'gross_weight', parseFloat(e.target.value) || 0)}
                                                    className="text-center font-medium text-orange-700"
                                                />
                                            </td>
                                            <td className="p-3">
                                                <Input
                                                    type="number"
                                                    step="0.01"
                                                    value={item.net_weight}
                                                    onChange={(e) => updateItem(index, 'net_weight', parseFloat(e.target.value) || 0)}
                                                    className="text-center font-medium text-green-700"
                                                />
                                            </td>
                                            <td className="p-3">
                                                <Input
                                                    value={item.dimensions}
                                                    onChange={(e) => updateItem(index, 'dimensions', e.target.value)}
                                                    placeholder="LxWxH"
                                                />
                                            </td>
                                            <td className="p-3">
                                                <Button
                                                    variant="ghost"
                                                    onClick={() => removeItem(index)}
                                                    className="text-red-500 hover:bg-red-50 p-1 h-8 w-8"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                    {items.length === 0 && (
                                        <tr>
                                            <td colSpan={7} className="p-8 text-center text-slate-400 italic">
                                                لا توجد طرود حالياً. اضغط "إضافة طرد" للبدء.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>

                {/* Notes */}
                <Card className="md:col-span-3">
                    <CardHeader className="py-3 border-b border-slate-100">
                        <Label>ملاحظات إضافية على قائمة التعبئة</Label>
                    </CardHeader>
                    <CardContent className="pt-4">
                        <textarea
                            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 h-24"
                            value={header.notes}
                            onChange={(e) => setHeader({ ...header, notes: e.target.value })}
                            placeholder="أي تفاصيل أخرى تتعلق بالتعبئة أو الشحن..."
                        />
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default PackingListForm;
