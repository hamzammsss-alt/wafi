import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Save, ArrowLeft, Plus, Trash2, FileText, Search, Package, Receipt, Truck, File, Calculator, AlertCircle } from 'lucide-react';
import { PartnerPicker } from '../../components/PartnerPicker';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { useTabs } from '../../src/contexts/TabsContext';
import DocumentUploadComponent from '../../components/import-export/DocumentUploadComponent';

// Local UI Helpers
const Button = ({ children, variant, className, onClick, type, disabled, size }: any) => {
    const base = "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors h-9 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2";
    const variants: any = {
        default: "bg-blue-600 text-white hover:bg-blue-700 shadow",
        outline: "border border-slate-200 bg-transparent shadow-sm hover:bg-slate-100",
        destructive: "bg-red-500 text-white hover:bg-red-600 shadow-sm",
        ghost: "hover:bg-slate-100",
    };
    const sizes: any = {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        icon: "h-9 w-9",
    };
    return <button type={type} disabled={disabled} onClick={onClick} className={`${base} ${variants[variant || 'default']} ${sizes[size || 'default']} ${className}`}>{children}</button>;
};

const Input = ({ className, ...props }: any) => <input className={`flex h-9 w-full rounded-md border border-slate-300 bg-white px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${className}`} {...props} />;
const Label = ({ children }: any) => <label className="text-sm font-medium text-slate-700 mb-1 block">{children}</label>;
const Badge = ({ children, variant }: any) => {
    const variants: any = {
        default: "bg-slate-100 text-slate-800",
        success: "bg-green-100 text-green-800",
        warning: "bg-yellow-100 text-yellow-800",
        danger: "bg-red-100 text-red-800",
    };
    return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${variants[variant || 'default']}`}>{children}</span>;
}

const ShipmentForm = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { navigateInTab } = useTabs();
    const isEdit = id && id !== 'new';

    const [activeTab, setActiveTab] = useState('basic');
    const [loading, setLoading] = useState(false);
    const [isSupplierPickerOpen, setIsSupplierPickerOpen] = useState(false);

    const [formData, setFormData] = useState({
        id: id || '',
        shipment_no: '',
        reference_number: '',
        supplier_id: '',
        supplier_name: '',
        origin_country: '',
        port_of_arrival: '',
        status: 'Open',
        currency_id: 'USD',
        exchange_rate: 1,
        opening_date: new Date().toISOString().split('T')[0],
        arrival_date_est: '',
        notes: '',
        proforma_id: '',
        proforma_no: '',
        is_cost_allocated: 0
    });

    const [containers, setContainers] = useState<any[]>([]);
    const [invoices, setInvoices] = useState<any[]>([]);
    const [expenses, setExpenses] = useState<any[]>([]);

    useEffect(() => {
        if (isEdit) {
            loadShipment(id);
            loadSubData(id);
        } else {
            generateShipmentNo();
        }
    }, [id]);

    const generateShipmentNo = () => {
        const timestamp = Date.now().toString().slice(-6);
        setFormData(prev => ({ ...prev, shipment_no: `IMP-${timestamp}` }));
    };

    const loadShipment = async (shipmentId: string) => {
        try {
            setLoading(true);
            const data = await window.electronAPI.import.getShipmentById(shipmentId);
            if (data) {
                setFormData({
                    ...data,
                    supplier_name: data.supplier_name || ''
                });
            }
        } catch (error) {
            console.error('Error loading shipment:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadSubData = async (shipmentId: string) => {
        try {
            const [cData, iData, eData] = await Promise.all([
                window.electronAPI.import.getContainers(shipmentId),
                window.electronAPI.import.getCommercialInvoices(shipmentId),
                window.electronAPI.import.getClearanceExpenses(shipmentId)
            ]);
            setContainers(cData || []);
            setInvoices(iData || []);
            setExpenses(eData || []);
        } catch (error) {
            console.error('Error loading sub-data:', error);
        }
    };

    const handleSave = async () => {
        try {
            setLoading(true);
            const result = await window.electronAPI.import.saveShipment(formData);
            if (result.success) {
                if (!isEdit) {
                    navigateInTab(`/import/shipments/${result.id}`, `ملف ${formData.shipment_no}`);
                } else {
                    alert('تم حفظ البيانات بنجاح');
                }
            }
        } catch (error) {
            console.error('Error saving:', error);
        } finally {
            setLoading(false);
        }
    };

    const updateContainer = async (idx: number, field: string, value: any) => {
        const newC = [...containers];
        newC[idx] = { ...newC[idx], [field]: value };
        setContainers(newC);

        if (isEdit) {
            await window.electronAPI.import.saveContainer({
                ...newC[idx],
                shipment_id: id
            });
        }
    };

    const addContainer = async () => {
        const newC = {
            id: crypto.randomUUID(),
            container_no: '',
            size: '20ft',
            seal_no: '',
            container_status: 'IN_TRANSIT'
        };
        setContainers([...containers, newC]);
        if (isEdit) {
            await window.electronAPI.import.saveContainer({
                ...newC,
                shipment_id: id
            });
        }
    };

    const deleteContainer = async (cId: string) => {
        if (!window.confirm('هل أنت متأكد من حذف الحاوية؟')) return;
        // Backend currently doesn't have deleteContainer, 
        // but it will be updated by saving the collection if we wanted.
        // For now, just refresh or filter if not in DB.
        setContainers(containers.filter(c => c.id !== cId));
    };

    const renderTabs = () => {
        const tabs = [
            { id: 'basic', label: 'البيانات الأساسية', icon: FileText },
            { id: 'containers', label: 'الحاويات', icon: Package, count: containers.length },
            { id: 'invoices', label: 'الفواتير التجارية', icon: Receipt, count: invoices.length },
            { id: 'expenses', label: 'مصاريف التخليص', icon: Truck, count: expenses.length },
            { id: 'documents', label: 'المستندات', icon: File },
            { id: 'landed_cost', label: 'التكلفة النهائية', icon: Calculator }
        ];

        return (
            <div className="flex border-b overflow-x-auto bg-white rounded-t-lg">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 px-6 py-4 text-sm font-medium transition-colors whitespace-nowrap border-b-2 ${activeTab === tab.id
                            ? 'border-blue-600 text-blue-600 bg-blue-50/50'
                            : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                            }`}
                    >
                        <tab.icon size={18} />
                        {tab.label}
                        {tab.count !== undefined && (
                            <span className={`px-2 py-0.5 rounded-full text-xs ${activeTab === tab.id ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
                                }`}>
                                {tab.count}
                            </span>
                        )}
                    </button>
                ))}
            </div>
        );
    };

    const renderTabContent = () => {
        switch (activeTab) {
            case 'basic':
                return (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2 space-y-6">
                            <Card className="p-6 space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <Label>رقم الملف</Label>
                                        <Input value={formData.shipment_no} readOnly className="bg-slate-50 font-mono" />
                                    </div>
                                    <div className="space-y-1">
                                        <Label>رقم المرجع (الخارجي)</Label>
                                        <Input
                                            value={formData.reference_number}
                                            onChange={(e: any) => setFormData({ ...formData, reference_number: e.target.value })}
                                            placeholder="مثال: REF-2024-001"
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <Label>المورد</Label>
                                        <div className="flex gap-2 text-right">
                                            <Input
                                                value={formData.supplier_name}
                                                readOnly
                                                onClick={() => setIsSupplierPickerOpen(true)}
                                            />
                                            <Button variant="outline" size="icon" onClick={() => setIsSupplierPickerOpen(true)}>
                                                <Search size={16} />
                                            </Button>
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <Label>بلد المنشأ</Label>
                                        <Input
                                            value={formData.origin_country}
                                            onChange={(e: any) => setFormData({ ...formData, origin_country: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <Label>ميناء الوصول</Label>
                                        <Input
                                            value={formData.port_of_arrival}
                                            onChange={(e: any) => setFormData({ ...formData, port_of_arrival: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label>تاريخ فتح الملف</Label>
                                        <Input
                                            type="date"
                                            value={formData.opening_date}
                                            onChange={(e: any) => setFormData({ ...formData, opening_date: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <Label>ملاحظات</Label>
                                    <textarea
                                        className="w-full min-h-[100px] rounded-md border border-slate-300 p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                        value={formData.notes}
                                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                    />
                                </div>
                            </Card>
                        </div>
                        <div className="space-y-6">
                            <Card className="p-6 space-y-4">
                                <h3 className="font-semibold text-slate-900 border-b pb-2">الحالة واللوجستيات</h3>
                                <div className="space-y-3">
                                    <div className="space-y-1">
                                        <Label>الحالة</Label>
                                        <select
                                            className="w-full h-9 rounded-md border border-slate-300 bg-white px-3 text-sm"
                                            value={formData.status}
                                            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                        >
                                            <option value="Open">مفتوح</option>
                                            <option value="Shipped">في الطريق (Shipped)</option>
                                            <option value="Arrived">واصل الميناء (Arrived)</option>
                                            <option value="Cleared">تم التخليص (Cleared)</option>
                                            <option value="Closed">مغلق (Closed)</option>
                                        </select>
                                    </div>
                                    <div className="space-y-1">
                                        <Label>تاريخ الوصول المتوقع</Label>
                                        <Input
                                            type="date"
                                            value={formData.arrival_date_est}
                                            onChange={(e: any) => setFormData({ ...formData, arrival_date_est: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </Card>
                            <Card className="p-6 space-y-4 border-blue-100 bg-blue-50/30">
                                <h3 className="font-semibold text-blue-900 border-b border-blue-200 pb-2">المالية (FOB)</h3>
                                <div className="space-y-3">
                                    <div className="space-y-1">
                                        <Label>العملة</Label>
                                        <select
                                            className="w-full h-9 rounded-md border border-slate-300 bg-white px-3 text-sm"
                                            value={formData.currency_id}
                                            onChange={(e) => setFormData({ ...formData, currency_id: e.target.value })}
                                        >
                                            <option value="USD">دولار (USD)</option>
                                            <option value="EUR">يورو (EUR)</option>
                                            <option value="ILS">شيكل (ILS)</option>
                                            <option value="CNY">يوان (CNY)</option>
                                        </select>
                                    </div>
                                    <div className="space-y-1">
                                        <Label>سعر الصرف</Label>
                                        <Input
                                            type="number"
                                            step="0.01"
                                            value={formData.exchange_rate}
                                            onChange={(e: any) => setFormData({ ...formData, exchange_rate: parseFloat(e.target.value) || 1 })}
                                        />
                                    </div>
                                </div>
                            </Card>
                        </div>
                    </div>
                );
            case 'containers':
                return (
                    <Card className="p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-semibold">تتبع الحاويات</h3>
                            <Button onClick={addContainer} className="gap-2">
                                <Plus size={16} />
                                إضافة حاوية جديدة
                            </Button>
                        </div>
                        {containers.length === 0 ? (
                            <div className="text-center py-12 border-2 border-dashed rounded-lg text-slate-500">
                                لا توجد حاويات بعد
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {containers.map((c, idx) => (
                                    <div key={c.id} className="p-4 border rounded-lg bg-white hover:shadow-sm transition-shadow">
                                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                            <div>
                                                <Label>رقم الحاوية</Label>
                                                <Input
                                                    value={c.container_no}
                                                    onChange={(e: any) => updateContainer(idx, 'container_no', e.target.value)}
                                                    placeholder="ABCD1234567"
                                                />
                                            </div>
                                            <div>
                                                <Label>الحجم</Label>
                                                <select
                                                    className="w-full h-9 rounded-md border border-slate-300 bg-white px-3 text-sm"
                                                    value={c.size}
                                                    onChange={(e) => updateContainer(idx, 'size', e.target.value)}
                                                >
                                                    <option value="20ft">20 قدم</option>
                                                    <option value="40ft">40 قدم</option>
                                                    <option value="40hc">40 HQ</option>
                                                </select>
                                            </div>
                                            <div>
                                                <Label>الحالة</Label>
                                                <select
                                                    className="w-full h-9 rounded-md border border-slate-300 bg-white px-3 text-sm"
                                                    value={c.container_status}
                                                    onChange={(e) => updateContainer(idx, 'container_status', e.target.value)}
                                                >
                                                    <option value="IN_TRANSIT">في الطريق</option>
                                                    <option value="ARRIVED">واصل الميناء</option>
                                                    <option value="CLEARED">مخلص</option>
                                                    <option value="DELIVERED">تم التسليم</option>
                                                </select>
                                            </div>
                                            <div className="flex items-end justify-end gap-2">
                                                <Button
                                                    variant="ghost"
                                                    onClick={() => deleteContainer(c.id)}
                                                    className="text-red-600 hover:bg-red-50"
                                                >
                                                    <Trash2 size={18} />
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </Card>
                );
            case 'invoices':
                return (
                    <Card className="p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-semibold">الفواتير التجارية للمورد</h3>
                            <Button onClick={() => navigateInTab(`/import/commercial-invoice/${id}/new`, 'فاتورة جديدة')} className="gap-2">
                                <Plus size={16} />
                                إضافة فاتورة تجارية
                            </Button>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-slate-50 border-b">
                                    <tr>
                                        <th className="p-3 text-right">رقم الفاتورة</th>
                                        <th className="p-3 text-right">التاريخ</th>
                                        <th className="p-3 text-right">المبلغ (FOB)</th>
                                        <th className="p-3 text-right">العملة</th>
                                        <th className="p-3 text-center">الإجراءات</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {invoices.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="p-8 text-center text-slate-500">لا توجد فواتير مضافة</td>
                                        </tr>
                                    ) : (
                                        invoices.map((inv) => (
                                            <tr key={inv.id} className="border-b hover:bg-slate-50/50">
                                                <td className="p-3 font-medium text-blue-600 cursor-pointer" onClick={() => navigateInTab(`/import/commercial-invoice/${id}/${inv.id}`, `فاتورة ${inv.invoice_no}`)}>
                                                    {inv.invoice_no}
                                                </td>
                                                <td className="p-3">{new Date(inv.invoice_date).toLocaleDateString('ar-EG')}</td>
                                                <td className="p-3 font-bold">{inv.total_amount?.toLocaleString()}</td>
                                                <td className="p-3">{inv.currency_id}</td>
                                                <td className="p-3 text-center">
                                                    <Button variant="ghost" onClick={() => navigateInTab(`/import/commercial-invoice/${id}/${inv.id}`, `فاتورة ${inv.invoice_no}`)}>تعديل</Button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                );
            case 'expenses':
                return (
                    <Card className="p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-semibold">مصاريف التخليص والنقل</h3>
                            <Button onClick={() => navigateInTab(`/import/clearance-expense/${id}/new`, 'مصروف جديد')} className="gap-2">
                                <Plus size={16} />
                                إضافة مصروف
                            </Button>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-slate-50 border-b">
                                    <tr>
                                        <th className="p-3 text-right">رقم المرجع</th>
                                        <th className="p-3 text-right">النوع</th>
                                        <th className="p-3 text-right">المبلغ</th>
                                        <th className="p-3 text-right">الحالة</th>
                                        <th className="p-3 text-center">الإجراءات</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {expenses.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="p-8 text-center text-slate-500">لا توجد مصاريف مضافة</td>
                                        </tr>
                                    ) : (
                                        expenses.map((exp) => (
                                            <tr key={exp.id} className="border-b hover:bg-slate-50/50">
                                                <td className="p-3 font-medium text-blue-600 cursor-pointer" onClick={() => navigateInTab(`/import/clearance-expense/${id}/${exp.id}`, `مصروف ${exp.expense_no}`)}>
                                                    {exp.expense_no}
                                                </td>
                                                <td className="p-3">{exp.expense_type}</td>
                                                <td className="p-3 font-bold">₪{exp.amount_base_currency?.toLocaleString()}</td>
                                                <td className="p-3">
                                                    {exp.is_allocated ? <Badge variant="success">موزع</Badge> : <Badge variant="warning">قيد التوزيع</Badge>}
                                                </td>
                                                <td className="p-3 text-center">
                                                    <Button variant="ghost" onClick={() => navigateInTab(`/import/clearance-expense/${id}/${exp.id}`, `مصروف ${exp.expense_no}`)}>تعديل</Button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                );
            case 'documents':
                return (
                    <Card className="p-6">
                        <DocumentUploadComponent shipmentId={id as string} />
                    </Card>
                );
            case 'landed_cost':
                return (
                    <Card className="p-12 text-center space-y-4">
                        <Calculator size={64} className="mx-auto text-slate-300" />
                        <h3 className="text-xl font-bold">التكلفة النهائية (Landed Cost)</h3>
                        <p className="text-slate-500 max-w-md mx-auto">
                            يسمح لك هذا المعالج بتوزيع كافة نفقات الشحن والتخليص على تكلفة الأصناف المستوردة بناءً على القيمة أو الوزن.
                        </p>
                        <div className="pt-4">
                            {formData.is_cost_allocated ? (
                                <div className="space-y-4">
                                    <Badge variant="success">تم توزيع التكلفة لهذا الملف</Badge>
                                    <Button variant="outline" onClick={() => navigateInTab(`/import/landed-cost/${id}`, 'التكلفة النهائية')}>عرض تفاصيل التوزيع</Button>
                                </div>
                            ) : (
                                <Button onClick={() => navigateInTab(`/import/landed-cost/${id}`, 'التكلفة النهائية')} className="gap-2 px-8">
                                    بدء معالج توزيع التكلفة
                                    <Calculator size={16} />
                                </Button>
                            )}
                        </div>
                    </Card>
                );
            default:
                return null;
        }
    };

    return (
        <div className="p-6 space-y-6 bg-slate-50 min-h-screen" dir="rtl">
            {/* Main Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigateInTab('/import/dashboard', 'لوحة الاستيراد')}
                        className="p-2 hover:bg-gray-100 rounded-full text-gray-600 hover:text-blue-600 transition-colors"
                    >
                        <ArrowLeft size={24} />
                    </button>
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <h1 className="text-2xl font-bold text-slate-900">
                                {isEdit ? `ملف استيراد #${formData.shipment_no}` : 'ملف استيراد جديد'}
                            </h1>
                            {isEdit && (
                                <Badge variant={formData.status === 'Closed' ? 'default' : 'success'}>
                                    {formData.status}
                                </Badge>
                            )}
                        </div>
                        <p className="text-slate-500 text-sm">إدارة الشحنة والجمارك والتكلفة النهائية</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button onClick={handleSave} disabled={loading} className="gap-2 px-6">
                        <Save size={18} />
                        {loading ? 'جاري الحفظ...' : 'حفظ التغييرات'}
                    </Button>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex flex-col gap-6">
                {renderTabs()}
                <div className="min-h-[500px]">
                    {renderTabContent()}
                </div>
            </div>

            {/* Side-bars / Modals */}
            {isSupplierPickerOpen && (
                <PartnerPicker
                    isOpen={isSupplierPickerOpen}
                    onSelect={(p: any) => {
                        setFormData({ ...formData, supplier_id: p.id, supplier_name: p.name_ar });
                        setIsSupplierPickerOpen(false);
                    }}
                    onClose={() => setIsSupplierPickerOpen(false)}
                    type="SUPPLIER"
                />
            )}
        </div>
    );
};

export default ShipmentForm;
