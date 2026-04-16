import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Save, ArrowLeft, Plus, Trash2 } from 'lucide-react';
import { PartnerPicker } from '../../components/PartnerPicker';
import { Card, CardContent } from '../../components/ui/Card';
import { useTabs } from '../../src/contexts/TabsContext';
import { findItemByCode } from '../../utils/itemLookup';
import { ItemCodeInput } from '../../components/items/ItemCodeInput';

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
const Select = ({ className, children, ...props }: any) => <select className={`flex h-9 w-full rounded-md border border-slate-300 bg-white px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${className}`} {...props}>{children}</select>;

const CommercialInvoiceForm = () => {
    const { shipmentId, id } = useParams();
    const navigate = useNavigate();
    const { navigateInTab } = useTabs();
    const isEdit = id && id !== 'new';

    const [loading, setLoading] = useState(false);
    const [isSupplierPickerOpen, setIsSupplierPickerOpen] = useState(false);
    const [formData, setFormData] = useState({
        invoice_no: '',
        shipment_id: shipmentId || '',
        supplier_id: '',
        supplier_name: '',
        invoice_date: new Date().toISOString().split('T')[0],
        currency_id: 'USD',
        exchange_rate: 1,
        payment_terms: '',
        incoterms: 'FOB',
        status: 'DRAFT',
        notes: ''
    });

    const [lines, setLines] = useState<any[]>([]);
    const [items, setItems] = useState<any[]>([]);

    useEffect(() => {
        loadItems();
        if (isEdit) {
            loadInvoice();
        } else {
            generateInvoiceNo();
            addLine();
        }
    }, [id]);

    const loadItems = async () => {
        try {
            const data = await window.electronAPI.inventory.getItems();
            setItems(data || []);
        } catch (error) {
            console.error('Error loading items:', error);
        }
    };

    const generateInvoiceNo = () => {
        const timestamp = Date.now().toString().slice(-6);
        setFormData(prev => ({ ...prev, invoice_no: `CI-${timestamp}` }));
    };

    const loadInvoice = async () => {
        try {
            setLoading(true);
            const data = await window.electronAPI.import.getCommercialInvoiceById(id);
            if (data) {
                setFormData({
                    invoice_no: data.invoice_no,
                    shipment_id: data.shipment_id,
                    supplier_id: data.supplier_id,
                    supplier_name: data.supplier_name || '',
                    invoice_date: data.invoice_date,
                    currency_id: data.currency_id,
                    exchange_rate: data.exchange_rate,
                    payment_terms: data.payment_terms || '',
                    incoterms: data.incoterms || 'FOB',
                    status: data.status,
                    notes: data.notes || ''
                });
                setLines((data.lines || []).map((l: any) => ({
                    ...l,
                    item_code: l.item_code || items.find(i => i.id === l.item_id)?.code || ''
                })));
            }
        } catch (error) {
            console.error('Error loading invoice:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!formData.supplier_id) {
            alert('الرجاء اختيار المورد');
            return;
        }

        if (lines.length === 0) {
            alert('الرجاء إضافة صنف واحد على الأقل');
            return;
        }

        try {
            setLoading(true);
            const result = await window.electronAPI.import.saveCommercialInvoice({
                header: formData,
                lines: lines
            });

            if (result.success) {
                alert('تم الحفظ بنجاح');
                navigateInTab(`/import/shipments/${shipmentId}`, `ملف ${shipmentId}`);
            }
        } catch (error) {
            console.error('Error saving invoice:', error);
            alert('حدث خطأ أثناء الحفظ');
        } finally {
            setLoading(false);
        }
    };

    const addLine = () => {
        setLines([...lines, {
            item_id: '',
            item_code: '',
            description: '',
            quantity: 0,
            unit_price: 0,
            total_price: 0,
            weight_kg: 0,
            volume_cbm: 0,
            hs_code: ''
        }]);
    };

    const removeLine = (index: number) => {
        setLines(lines.filter((_, i) => i !== index));
    };

    const updateLine = (index: number, field: string, value: any) => {
        const newLines = [...lines];
        const line = { ...newLines[index], [field]: value };

        if (field === 'item_code') {
            const itemByCode = findItemByCode(items, String(value));
            if (itemByCode) {
                line.item_id = itemByCode.id;
                line.item_code = itemByCode.code || '';
                line.description = itemByCode.name_ar;
                line.unit_price = itemByCode.cost_price || 0;
                line.weight_kg = itemByCode.weight_kg || 0;
            } else {
                line.item_id = '';
            }
        }

        // Auto-calculate total
        if (field === 'quantity' || field === 'unit_price') {
            line.total_price = line.quantity * line.unit_price;
        }

        // Auto-fill from item
        if (field === 'item_id') {
            const item = items.find(i => i.id === value);
            if (item) {
                line.item_code = item.code || '';
                line.description = item.name_ar;
                line.unit_price = item.cost_price || 0;
                line.weight_kg = item.weight_kg || 0;
            } else {
                line.item_code = '';
            }
        }

        if (field === 'item_id' || field === 'item_code' || field === 'quantity' || field === 'unit_price') {
            line.total_price = line.quantity * line.unit_price;
        }

        newLines[index] = line;
        setLines(newLines);
    };

    const totalAmount = lines.reduce((sum, line) => sum + (line.total_price || 0), 0);

    return (
        <div className="p-6 space-y-6 bg-slate-50 min-h-screen" dir="rtl">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigateInTab(`/import/shipments/${shipmentId}`, `ملف ${shipmentId}`)}
                        className="p-2 hover:bg-gray-100 rounded-full text-gray-600 hover:text-blue-600 transition-colors"
                    >
                        <ArrowLeft size={24} />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">
                            {isEdit ? `تعديل فاتورة تجارية #${formData.invoice_no}` : 'فاتورة تجارية جديدة'}
                        </h1>
                        <p className="text-slate-500 text-sm">الفاتورة الخارجية من المورد</p>
                    </div>
                </div>
                <Button onClick={handleSave} disabled={loading} className="gap-2">
                    <Save className="w-4 h-4" />
                    {loading ? 'جاري الحفظ...' : 'حفظ الفاتورة'}
                </Button>
            </div>

            {/* Main Form */}
            <Card>
                <CardContent className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Invoice Number */}
                        <div>
                            <Label>رقم الفاتورة</Label>
                            <Input
                                value={formData.invoice_no}
                                onChange={(e) => setFormData({ ...formData, invoice_no: e.target.value })}
                                placeholder="CI-XXXXXX"
                            />
                        </div>

                        {/* Supplier */}
                        <div>
                            <Label>المورد *</Label>
                            <div className="flex gap-2">
                                <Input
                                    value={formData.supplier_name}
                                    readOnly
                                    placeholder="اختر المورد"
                                    className="flex-1"
                                />
                                <Button
                                    variant="outline"
                                    onClick={() => setIsSupplierPickerOpen(true)}
                                >
                                    اختيار
                                </Button>
                            </div>
                        </div>

                        {/* Invoice Date */}
                        <div>
                            <Label>تاريخ الفاتورة</Label>
                            <Input
                                type="date"
                                value={formData.invoice_date}
                                onChange={(e) => setFormData({ ...formData, invoice_date: e.target.value })}
                            />
                        </div>

                        {/* Currency */}
                        <div>
                            <Label>العملة</Label>
                            <Select
                                value={formData.currency_id}
                                onChange={(e) => setFormData({ ...formData, currency_id: e.target.value })}
                            >
                                <option value="USD">دولار أمريكي (USD)</option>
                                <option value="EUR">يورو (EUR)</option>
                                <option value="ILS">شيكل (ILS)</option>
                                <option value="JOD">دينار أردني (JOD)</option>
                            </Select>
                        </div>

                        {/* Exchange Rate */}
                        <div>
                            <Label>سعر الصرف</Label>
                            <Input
                                type="number"
                                step="0.01"
                                value={formData.exchange_rate}
                                onChange={(e) => setFormData({ ...formData, exchange_rate: parseFloat(e.target.value) })}
                            />
                        </div>

                        {/* Incoterms */}
                        <div>
                            <Label>شروط التسليم (Incoterms)</Label>
                            <Select
                                value={formData.incoterms}
                                onChange={(e) => setFormData({ ...formData, incoterms: e.target.value })}
                            >
                                <option value="FOB">FOB - Free On Board</option>
                                <option value="CIF">CIF - Cost, Insurance & Freight</option>
                                <option value="EXW">EXW - Ex Works</option>
                                <option value="FCA">FCA - Free Carrier</option>
                                <option value="CFR">CFR - Cost and Freight</option>
                            </Select>
                        </div>

                        {/* Payment Terms */}
                        <div className="md:col-span-2">
                            <Label>شروط الدفع</Label>
                            <Input
                                value={formData.payment_terms}
                                onChange={(e) => setFormData({ ...formData, payment_terms: e.target.value })}
                                placeholder="مثال: 30% مقدم، 70% عند الشحن"
                            />
                        </div>

                        {/* Status */}
                        <div>
                            <Label>الحالة</Label>
                            <Select
                                value={formData.status}
                                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                            >
                                <option value="DRAFT">مسودة</option>
                                <option value="POSTED">منشور</option>
                                <option value="PAID">مدفوع</option>
                            </Select>
                        </div>

                        {/* Notes */}
                        <div className="md:col-span-3">
                            <Label>ملاحظات</Label>
                            <textarea
                                className="flex w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                rows={2}
                                value={formData.notes}
                                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                placeholder="ملاحظات إضافية..."
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Items Grid */}
            <Card>
                <CardContent className="p-6">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-semibold">الأصناف</h3>
                        <Button onClick={addLine} variant="outline" className="gap-2">
                            <Plus className="w-4 h-4" />
                            إضافة صنف
                        </Button>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="dense-table w-full">
                            <thead>
                                <tr className="bg-slate-100 border-b">
                                    <th className="p-2 text-right text-sm font-medium w-32">Item Code</th>
                                    <th className="p-2 text-right text-sm font-medium">الصنف</th>
                                    <th className="p-2 text-right text-sm font-medium">الوصف</th>
                                    <th className="p-2 text-right text-sm font-medium w-24">الكمية</th>
                                    <th className="p-2 text-right text-sm font-medium w-28">السعر</th>
                                    <th className="p-2 text-right text-sm font-medium w-28">الإجمالي</th>
                                    <th className="p-2 text-right text-sm font-medium w-24">الوزن (كجم)</th>
                                    <th className="p-2 text-right text-sm font-medium w-24">الحجم (م³)</th>
                                    <th className="p-2 text-right text-sm font-medium w-28">رمز HS</th>
                                    <th className="p-2 w-12"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {lines.map((line, index) => (
                                    <tr key={index} className="border-b hover:bg-slate-50">
                                        <td className="p-2">
                                            <ItemCodeInput
                                                items={items}
                                                value={line.item_code || ''}
                                                onChange={(nextCode) => updateLine(index, 'item_code', nextCode)}
                                                placeholder="Item code"
                                                className="flex h-9 w-full rounded-md border border-slate-300 bg-white px-3 py-1 text-sm font-mono shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                autoSelectUnique={false}
                                                showOnEmpty={true}
                                                maxResults={20}
                                            />
                                        </td>
                                        <td className="p-2">
                                            <Select
                                                value={line.item_id}
                                                onChange={(e) => updateLine(index, 'item_id', e.target.value)}
                                                className="text-sm"
                                            >
                                                <option value="">اختر صنف</option>
                                                {items.map(item => (
                                                    <option key={item.id} value={item.id}>
                                                        {item.code} - {item.name_ar}
                                                    </option>
                                                ))}
                                            </Select>
                                        </td>
                                        <td className="p-2">
                                            <Input
                                                value={line.description}
                                                onChange={(e) => updateLine(index, 'description', e.target.value)}
                                                placeholder="الوصف"
                                                className="text-sm"
                                            />
                                        </td>
                                        <td className="p-2">
                                            <Input
                                                type="number"
                                                value={line.quantity}
                                                onChange={(e) => updateLine(index, 'quantity', parseFloat(e.target.value) || 0)}
                                                className="text-sm"
                                            />
                                        </td>
                                        <td className="p-2">
                                            <Input
                                                type="number"
                                                step="0.01"
                                                value={line.unit_price}
                                                onChange={(e) => updateLine(index, 'unit_price', parseFloat(e.target.value) || 0)}
                                                className="text-sm"
                                            />
                                        </td>
                                        <td className="p-2">
                                            <Input
                                                type="number"
                                                value={line.total_price}
                                                readOnly
                                                className="text-sm bg-slate-50"
                                            />
                                        </td>
                                        <td className="p-2">
                                            <Input
                                                type="number"
                                                step="0.01"
                                                value={line.weight_kg}
                                                onChange={(e) => updateLine(index, 'weight_kg', parseFloat(e.target.value) || 0)}
                                                className="text-sm"
                                            />
                                        </td>
                                        <td className="p-2">
                                            <Input
                                                type="number"
                                                step="0.001"
                                                value={line.volume_cbm}
                                                onChange={(e) => updateLine(index, 'volume_cbm', parseFloat(e.target.value) || 0)}
                                                className="text-sm"
                                            />
                                        </td>
                                        <td className="p-2">
                                            <Input
                                                value={line.hs_code}
                                                onChange={(e) => updateLine(index, 'hs_code', e.target.value)}
                                                placeholder="HS Code"
                                                className="text-sm"
                                            />
                                        </td>
                                        <td className="p-2">
                                            <Button
                                                variant="ghost"
                                                onClick={() => removeLine(index)}
                                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Total */}
                    <div className="mt-4 flex justify-end">
                        <div className="bg-slate-100 p-4 rounded-lg">
                            <div className="text-sm text-slate-600">الإجمالي ({formData.currency_id})</div>
                            <div className="text-2xl font-bold text-slate-900">
                                {totalAmount.toLocaleString('ar-EG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                            <div className="text-xs text-slate-500 mt-1">
                                بالشيكل: {(totalAmount * formData.exchange_rate).toLocaleString('ar-EG', { minimumFractionDigits: 2 })}
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Supplier Picker Modal */}
            {isSupplierPickerOpen && (
                <PartnerPicker
                    isOpen={isSupplierPickerOpen}
                    onSelect={(partner) => {
                        setFormData({
                            ...formData,
                            supplier_id: partner.id,
                            supplier_name: partner.name_ar
                        });
                        setIsSupplierPickerOpen(false);
                    }}
                    onClose={() => setIsSupplierPickerOpen(false)}
                    type="SUPPLIER"
                />
            )}
        </div>
    );
};

export default CommercialInvoiceForm;
