import React, { useState, useEffect } from 'react';
import { Save, User, FileText, Truck, Calendar, ArrowRight, Printer, Search, Box, ShieldCheck, List, Edit, Plus } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { useTabs } from '../../src/contexts/TabsContext';

// Helper Components
const Button = ({ children, onClick, disabled, className, variant }: any) => {
    const base = "flex items-center gap-2 px-4 py-2 rounded-lg font-bold transition-all disabled:opacity-50 text-sm";
    const variants: any = {
        primary: "bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/20",
        secondary: "bg-slate-100 hover:bg-slate-200 text-slate-700",
        outline: "border border-slate-200 hover:bg-slate-50 text-slate-600",
        ghost: "hover:bg-slate-100 text-slate-600"
    };
    return (
        <button onClick={onClick} disabled={disabled} className={`${base} ${variants[variant || 'primary']} ${className}`}>
            {children}
        </button>
    );
};

const Input = ({ label, ...props }: any) => (
    <div>
        {label && <label className="block text-sm font-medium text-slate-700 mb-2">{label}</label>}
        <input className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm" {...props} />
    </div>
);

const ExportShipmentForm = () => {
    const navigate = useNavigate();
    const { navigateInTab } = useTabs();
    const { id } = useParams();
    const isNew = !id || id === 'new';

    const [activeTab, setActiveTab] = useState<'details' | 'invoices' | 'packing' | 'coo'>('details');
    const [loading, setLoading] = useState(false);
    const [header, setHeader] = useState<any>({
        shipment_no: 'NEW',
        customer_id: '',
        invoice_id: '',
        destination_country: '',
        port_of_loading: 'Ashdod',
        port_of_discharge: '',
        loading_date: new Date().toISOString().split('T')[0],
        driver_details: '',
        vehicle_no: '',
        notes: ''
    });

    const [customers, setCustomers] = useState<any[]>([]);
    const [linkedInvoices, setLinkedInvoices] = useState<any[]>([]);
    const [packingLists, setPackingLists] = useState<any[]>([]);

    useEffect(() => {
        loadMasterData();
        if (!isNew && id) {
            loadShipment(id);
        }
    }, [id]);

    const loadMasterData = async () => {
        try {
            const cust = await window.electronAPI.partner.getPartners('CUSTOMER');
            setCustomers(cust || []);
        } catch (error) {
            console.error("Failed to load master data", error);
        }
    };

    const loadShipment = async (shipmentId: string) => {
        try {
            const data = await window.electronAPI.export.getShipment(shipmentId);
            if (data) {
                setHeader(data);
                // Load linked documents
                loadLinkedDocuments(data.id, data.invoice_id);
            }
        } catch (error) {
            console.error(error);
        }
    };

    const loadLinkedDocuments = async (shipId: string, invId?: string) => {
        try {
            // Fetch export invoices for this shipment (assuming they are linked)
            const exportInvoices = await window.electronAPI.export.getInvoices({ shipment_id: shipId });
            setLinkedInvoices(exportInvoices || []);

            if (invId) {
                const pls = await window.electronAPI.export.getPackingLists(invId);
                setPackingLists(pls || []);
            }
        } catch (error) {
            console.error("Failed to load linked documents", error);
        }
    };

    const handleSave = async () => {
        if (!header.customer_id) return alert('الرجاء اختيار الزبون');

        setLoading(true);
        try {
            const result = await window.electronAPI.export.saveShipment({ ...header, id: isNew ? undefined : id });
            if (result.success) {
                alert('تم الحفظ بنجاح');
                navigateInTab('/export/shipments', 'ملفات التصدير');
            }
        } catch (error: any) {
            alert('خطأ: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6 space-y-6 bg-slate-50 min-h-screen font-sans" dir="rtl">
            {/* Header / Actions */}
            <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigateInTab('/export/shipments', 'ملفات التصدير')} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors">
                        <ArrowRight className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                            <Truck className="w-6 h-6 text-blue-600" />
                            {isNew ? 'ملف تصدير جديد' : `ملف تصدير #${header.shipment_no}`}
                        </h1>
                        {!isNew && <p className="text-xs text-slate-500">الحالة: {header.status || 'قيد المعالجة'}</p>}
                    </div>
                </div>
                <div className="flex gap-3">
                    <Button onClick={handleSave} disabled={loading} variant="primary">
                        <Save className="w-4 h-4" />
                        حفظ الملف
                    </Button>
                </div>
            </div>

            {/* Tabs Navigation */}
            <div className="flex gap-2 border-b border-slate-200">
                <button
                    onClick={() => setActiveTab('details')}
                    className={`px-6 py-3 text-sm font-bold transition-all border-b-2 ${activeTab === 'details' ? 'border-blue-600 text-blue-600 bg-blue-50' : 'border-transparent text-slate-500 hover:bg-slate-100'}`}
                >
                    <div className="flex items-center gap-2">
                        <Truck size={16} />
                        بيانات الشحن
                    </div>
                </button>
                {!isNew && (
                    <>
                        <button
                            onClick={() => setActiveTab('invoices')}
                            className={`px-6 py-3 text-sm font-bold transition-all border-b-2 ${activeTab === 'invoices' ? 'border-blue-600 text-blue-600 bg-blue-50' : 'border-transparent text-slate-500 hover:bg-slate-100'}`}
                        >
                            <div className="flex items-center gap-2">
                                <FileText size={16} />
                                فواتير التصدير
                            </div>
                        </button>
                        <button
                            onClick={() => setActiveTab('packing')}
                            className={`px-6 py-3 text-sm font-bold transition-all border-b-2 ${activeTab === 'packing' ? 'border-blue-600 text-blue-600 bg-blue-50' : 'border-transparent text-slate-500 hover:bg-slate-100'}`}
                        >
                            <div className="flex items-center gap-2">
                                <Box size={16} />
                                قوائم التعبئة
                            </div>
                        </button>
                        <button
                            onClick={() => setActiveTab('coo')}
                            className={`px-6 py-3 text-sm font-bold transition-all border-b-2 ${activeTab === 'coo' ? 'border-blue-600 text-blue-600 bg-blue-50' : 'border-transparent text-slate-500 hover:bg-slate-100'}`}
                        >
                            <div className="flex items-center gap-2">
                                <ShieldCheck size={16} />
                                شهادة المنشأ
                            </div>
                        </button>
                    </>
                )}
            </div>

            {/* Tab Content */}
            <div className="min-h-[600px]">
                {activeTab === 'details' && (
                    <div className="grid grid-cols-12 gap-6">
                        <div className="col-span-8 space-y-6">
                            <Card>
                                <CardHeader className="flex items-center gap-2 pb-2 border-b border-slate-100">
                                    <User className="w-5 h-5 text-blue-500" />
                                    <h3 className="font-bold text-slate-800">بيانات كشف التصدير</h3>
                                </CardHeader>
                                <CardContent className="grid grid-cols-2 gap-6 pt-6">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-2">الزبون (المستورد)</label>
                                        <select
                                            className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                            value={header.customer_id}
                                            onChange={(e) => setHeader({ ...header, customer_id: e.target.value })}
                                        >
                                            <option value="">-- اختر الزبون --</option>
                                            {customers.map(c => (
                                                <option key={c.id} value={c.id}>{c.name_ar} ({c.code})</option>
                                            ))}
                                        </select>
                                    </div>
                                    <Input
                                        label="الدولة المستوردة (Destination)"
                                        value={header.destination_country}
                                        onChange={(e: any) => setHeader({ ...header, destination_country: e.target.value })}
                                        placeholder="الأردن، الإمارات، إلخ..."
                                    />
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader className="flex items-center gap-2 pb-2 border-b border-slate-100">
                                    <Truck className="w-5 h-5 text-green-500" />
                                    <h3 className="font-bold text-slate-800">بيانات الشحن والنقل</h3>
                                </CardHeader>
                                <CardContent className="grid grid-cols-2 gap-6 pt-6">
                                    <Input
                                        label="ميناء التحميل (Port of Loading)"
                                        value={header.port_of_loading}
                                        onChange={(e: any) => setHeader({ ...header, port_of_loading: e.target.value })}
                                    />
                                    <Input
                                        label="ميناء الوصول (Port of Discharge)"
                                        value={header.port_of_discharge}
                                        onChange={(e: any) => setHeader({ ...header, port_of_discharge: e.target.value })}
                                    />
                                    <Input
                                        label="تاريخ التحميل"
                                        type="date"
                                        value={header.loading_date}
                                        onChange={(e: any) => setHeader({ ...header, loading_date: e.target.value })}
                                    />
                                    <Input
                                        label="رقم المركبة (Vehicle No)"
                                        value={header.vehicle_no}
                                        onChange={(e: any) => setHeader({ ...header, vehicle_no: e.target.value })}
                                    />
                                    <div className="col-span-2">
                                        <label className="block text-sm font-medium text-slate-700 mb-2">تفاصيل السائق / شركة النقل</label>
                                        <textarea
                                            className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none h-20 text-sm"
                                            value={header.driver_details}
                                            onChange={(e) => setHeader({ ...header, driver_details: e.target.value })}
                                            placeholder="اسم السائق، رقم الهوية، الهاتف..."
                                        />
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        <div className="col-span-4">
                            <Card className="h-full">
                                <CardHeader>
                                    <h3 className="font-bold text-slate-800">ملاحظات الملف</h3>
                                </CardHeader>
                                <CardContent>
                                    <textarea
                                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none h-[400px] text-sm"
                                        value={header.notes}
                                        onChange={(e) => setHeader({ ...header, notes: e.target.value })}
                                        placeholder="أي ملاحظات إضافية تتعلق بعملية التصدير..."
                                    />
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                )}

                {activeTab === 'invoices' && (
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between border-b">
                            <CardTitle className="text-lg font-bold">فواتير التصدير المرتبطة</CardTitle>
                            <Button onClick={() => navigateInTab(`/export/invoice/new?shipmentId=${id}&customerId=${header.customer_id}`, 'فاتورة تصدير جديدة')} variant="outline" className="gap-2">
                                <Plus size={16} />
                                إضافة فاتورة
                            </Button>
                        </CardHeader>
                        <CardContent className="p-0">
                            <table className="w-full text-sm">
                                <thead className="bg-slate-50 border-b">
                                    <tr>
                                        <th className="p-4 text-right">رقم الفاتورة</th>
                                        <th className="p-4 text-right">التاريخ</th>
                                        <th className="p-4 text-right">المبلغ</th>
                                        <th className="p-4 text-right">الحالة</th>
                                        <th className="p-4 text-left">إجراءات</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {linkedInvoices.map((inv) => (
                                        <tr key={inv.id} className="hover:bg-slate-50">
                                            <td className="p-4 font-bold">{inv.invoice_no}</td>
                                            <td className="p-4">{inv.invoice_date}</td>
                                            <td className="p-4 font-bold">{inv.total_amount?.toLocaleString()} {inv.currency_id}</td>
                                            <td className="p-4">
                                                <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase font-bold ${inv.status === 'POSTED' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                                                    }`}>
                                                    {inv.status}
                                                </span>
                                            </td>
                                            <td className="p-4 flex gap-2 justify-end">
                                                <Button variant="ghost" onClick={() => navigateInTab(`/export/invoice/${inv.id}`, `فاتورة ${inv.invoice_no}`)} className="h-8 w-8 p-0">
                                                    <Edit size={14} />
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                    {linkedInvoices.length === 0 && (
                                        <tr><td colSpan={5} className="p-8 text-center text-slate-400 italic">لا توجد فواتير مرتبطة حالياً</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </CardContent>
                    </Card>
                )}

                {activeTab === 'packing' && (
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between border-b">
                            <CardTitle className="text-lg font-bold">قوائم التعبئة (Packing Lists)</CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <table className="w-full text-sm">
                                <thead className="bg-slate-50 border-b">
                                    <tr>
                                        <th className="p-4 text-right">رقم القائمة</th>
                                        <th className="p-4 text-right">التاريخ</th>
                                        <th className="p-4 text-right">عدد الطرود</th>
                                        <th className="p-4 text-right">إجمالي الوزن (كجم)</th>
                                        <th className="p-4 text-left">إجراءات</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {packingLists.map((pl) => (
                                        <tr key={pl.id} className="hover:bg-slate-50">
                                            <td className="p-4 font-bold">{pl.packing_list_no}</td>
                                            <td className="p-4">{pl.packing_date}</td>
                                            <td className="p-4">{pl.total_packages}</td>
                                            <td className="p-4">{pl.total_gross_weight}</td>
                                            <td className="p-4 flex gap-2 justify-end">
                                                <Button variant="ghost" onClick={() => navigateInTab(`/export/packing-list/${pl.id}`, `قائمة ${pl.packing_list_no}`)} className="h-8 w-8 p-0">
                                                    <Edit size={14} />
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                    {packingLists.length === 0 && (
                                        <tr><td colSpan={5} className="p-8 text-center text-slate-400 italic">لا توجد قوائم تعبئة مرتبطة</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </CardContent>
                    </Card>
                )}

                {activeTab === 'coo' && (
                    <Card>
                        <CardHeader border-b>
                            <CardTitle className="text-lg font-bold">معاينة شهادة المنشأ</CardTitle>
                        </CardHeader>
                        <CardContent className="p-12 text-center space-y-4">
                            <ShieldCheck className="w-16 h-16 text-green-500 mx-auto" />
                            <h3 className="text-xl font-bold">إنشاء شهادة منشأ لهذا الملف</h3>
                            <p className="text-slate-500 max-w-md mx-auto">
                                سيتم استنباط بيانات شهادة المنشأ تلقائياً من فاتورة التصدير والبيانات اللوجستية لهذا الملف.
                            </p>
                            <Button
                                onClick={() => navigateInTab(`/export/certificate-origin/${header.invoice_id || id}`, 'شهادة المنشأ')}
                                disabled={!header.invoice_id && isNew}
                                className="mt-4"
                            >
                                فتح معالج الشهادة
                            </Button>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
};

export default ExportShipmentForm;
