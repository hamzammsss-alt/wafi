import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Save, ArrowLeft, Printer, ShieldCheck, Globe, FileText } from 'lucide-react';
import { Card, CardContent } from '../../components/ui/Card';
import { useTabs } from '../../src/contexts/TabsContext';

// Local UI Helpers
const Button = ({ children, variant, className, onClick, type, disabled }: any) => {
    const base = "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors h-9 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-slate-400";
    const variants: any = {
        default: "bg-blue-600 text-white hover:bg-blue-700 shadow",
        outline: "border border-slate-200 bg-transparent shadow-sm hover:bg-slate-100",
        secondary: "bg-slate-100 text-slate-900 hover:bg-slate-200",
    };
    return <button type={type} disabled={disabled} onClick={onClick} className={`${base} ${variants[variant || 'default']} ${className}`}>{children}</button>;
};

const Input = ({ className, ...props }: any) => <input className={`flex h-9 w-full rounded-md border border-slate-300 bg-white px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${className}`} {...props} />;
const Label = ({ children }: any) => <label className="text-sm font-medium text-slate-700 mb-1 block">{children}</label>;

const CertificateOfOriginForm = () => {
    const { id } = useParams(); // shipmentId or invoiceId
    const navigate = useNavigate();
    const { navigateInTab } = useTabs();

    const [loading, setLoading] = useState(false);
    const [data, setData] = useState<any>({
        exporter_name: 'WAFI ERP Systems Ltd.',
        exporter_address: '123 Tech Street, Ramallah, Palestine',
        consignee_name: '',
        consignee_address: '',
        transport_details: 'Trucking via Jordan',
        country_of_origin: 'Palestine',
        port_of_loading: 'Ashdod, Israel',
        destination_country: '',
        invoice_no: '',
        invoice_date: '',
        marks_and_numbers: 'N/M',
        description_of_goods: '',
        quantity_and_weight: '',
        remarks: ''
    });

    useEffect(() => {
        if (id) {
            loadData(id);
        }
    }, [id]);

    const loadData = async (targetId: string) => {
        try {
            setLoading(true);
            // Try to load as invoice first
            const invoice = await window.electronAPI.export.getInvoice(targetId);
            if (invoice) {
                setData((prev: any) => ({
                    ...prev,
                    consignee_name: invoice.customer_name || '',
                    destination_country: invoice.destination_country || '',
                    invoice_no: invoice.invoice_no,
                    invoice_date: invoice.invoice_date,
                    description_of_goods: invoice.lines?.map((l: any) => l.description).join(', ') || '',
                    quantity_and_weight: `${invoice.lines?.reduce((s: any, l: any) => s + l.quantity, 0)} Units, ${invoice.lines?.reduce((s: any, l: any) => s + (l.weight_kg || 0), 0)} KG`,
                }));
            }
        } catch (error) {
            console.error('Error loading COO data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="p-6 space-y-6 bg-slate-50 min-h-screen" dir="rtl">
            {/* Header / Actions */}
            <div className="flex items-center justify-between no-print">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-2 hover:bg-gray-100 rounded-full text-gray-600"
                    >
                        <ArrowLeft size={24} />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                            <ShieldCheck className="text-green-600" />
                            شهادة المنشأ (Certificate of Origin)
                        </h1>
                        <p className="text-slate-500 text-sm">إعداد وتدقيق بيانات شهادة المنشأ للصادرات</p>
                    </div>
                </div>
                <div className="flex gap-3">
                    <Button variant="outline" onClick={() => navigate(-1)}>إلغاء</Button>
                    <Button onClick={handlePrint} className="gap-2">
                        <Printer className="w-4 h-4" />
                        طباعة الشهادة
                    </Button>
                </div>
            </div>

            {/* COO Editor / Preview */}
            <div className="max-w-4xl mx-auto space-y-6">
                <Card className="print:shadow-none print:border print:border-slate-300">
                    <CardContent className="p-8 space-y-8">
                        {/* Header Section */}
                        <div className="flex justify-between items-start border-b-2 border-slate-800 pb-6">
                            <div className="space-y-1">
                                <h2 className="text-xl font-black text-slate-900 tracking-tight">CERTIFICATE OF ORIGIN</h2>
                                <p className="text-xs text-slate-500">GENERALIZED SYSTEM OF PREFERENCES</p>
                            </div>
                            <div className="text-left" dir="ltr">
                                <p className="text-xs font-bold">Reference No:</p>
                                <p className="text-sm border-b border-slate-400 w-32 pb-1">COO-{new Date().getFullYear()}-{id?.slice(-4)}</p>
                            </div>
                        </div>

                        {/* Content Grid */}
                        <div className="grid grid-cols-2 gap-px bg-slate-200 border border-slate-200">
                            {/* Exporter */}
                            <div className="bg-white p-4 space-y-2">
                                <Label className="text-[10px] text-slate-400 uppercase font-bold">1. Goods consigned from (Exporter's name, address, country)</Label>
                                <textarea
                                    className="w-full text-sm border-none focus:ring-0 p-0 resize-none h-20"
                                    value={data.exporter_name + '\n' + data.exporter_address}
                                    readOnly
                                />
                            </div>

                            {/* Consignee */}
                            <div className="bg-white p-4 space-y-2">
                                <Label className="text-[10px] text-slate-400 uppercase font-bold">2. Goods consigned to (Consignee's name, address, country)</Label>
                                <textarea
                                    className="w-full text-sm border-none focus:ring-0 p-0 resize-none h-20"
                                    value={data.consignee_name + '\n' + data.consignee_address}
                                    onChange={(e) => setData({ ...data, consignee_address: e.target.value })}
                                />
                            </div>

                            {/* Transport */}
                            <div className="bg-white p-4 space-y-2">
                                <Label className="text-[10px] text-slate-400 uppercase font-bold">3. Means of transport and route (as far as known)</Label>
                                <Input
                                    className="border-none shadow-none p-0 h-auto text-sm"
                                    value={data.transport_details}
                                    onChange={(e: any) => setData({ ...data, transport_details: e.target.value })}
                                />
                            </div>

                            {/* Official Use */}
                            <div className="bg-white p-4 space-y-2 bg-slate-50">
                                <Label className="text-[10px] text-slate-400 uppercase font-bold">4. For official use</Label>
                                <div className="h-10 border-2 border-dashed border-slate-200 rounded"></div>
                            </div>
                        </div>

                        {/* Items Section */}
                        <div className="border border-slate-200">
                            <table className="w-full text-[12px] border-collapse">
                                <thead className="bg-slate-50 border-b border-slate-200">
                                    <tr>
                                        <th className="p-2 text-right border-l border-slate-200 w-24">5. Item number</th>
                                        <th className="p-2 text-right border-l border-slate-200 w-32">6. Marks and numbers</th>
                                        <th className="p-2 text-right border-l border-slate-200">7. Number and kind of packages; description of goods</th>
                                        <th className="p-2 text-right w-40">8. Origin criterion</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td className="p-4 align-top border-l border-slate-200 text-center font-bold">1</td>
                                        <td className="p-4 align-top border-l border-slate-200">
                                            <Input
                                                className="border-none shadow-none p-0 h-auto"
                                                value={data.marks_and_numbers}
                                                onChange={(e: any) => setData({ ...data, marks_and_numbers: e.target.value })}
                                            />
                                        </td>
                                        <td className="p-4 align-top border-l border-slate-200 space-y-2">
                                            <div className="font-bold border-b pb-1 mb-2">Detailed Description:</div>
                                            <textarea
                                                className="w-full border-none focus:ring-0 p-0 resize-none h-32"
                                                value={data.description_of_goods}
                                                onChange={(e) => setData({ ...data, description_of_goods: e.target.value })}
                                            />
                                            <div className="mt-4 pt-2 border-t text-slate-500">
                                                <div className="font-bold text-slate-700">Weight/Quantity:</div>
                                                <Input
                                                    className="border-none shadow-none p-0 h-auto text-slate-800"
                                                    value={data.quantity_and_weight}
                                                    onChange={(e: any) => setData({ ...data, quantity_and_weight: e.target.value })}
                                                />
                                            </div>
                                        </td>
                                        <td className="p-4 align-top text-center italic text-slate-400">
                                            "P"
                                            <div className="text-[9px] mt-2 not-italic">Wholly produced in Palestine</div>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        {/* Footer Section */}
                        <div className="grid grid-cols-2 gap-px bg-slate-200 border border-slate-200 h-48">
                            <div className="bg-white p-6 space-y-4">
                                <Label className="text-[10px] text-slate-400 uppercase font-bold">11. Certification</Label>
                                <div className="text-[10px] text-slate-600 text-center pt-4">
                                    It is hereby certified, on the basis of control carried out, that the declaration by the exporter is correct.
                                </div>
                                <div className="mt-8 border-t border-slate-200 pt-2 text-center text-[10px]">
                                    Place and date, signature and stamp of certifying authority
                                </div>
                            </div>
                            <div className="bg-white p-6 space-y-4">
                                <Label className="text-[10px] text-slate-400 uppercase font-bold">12. Declaration by the exporter</Label>
                                <div className="text-[10px] text-slate-600 text-center pt-4">
                                    The undersigned hereby declares that the above details and statements are correct; that all the goods were produced in
                                </div>
                                <div className="font-black text-center py-2 border-b border-slate-200 uppercase tracking-widest text-sm">
                                    PALESTINE
                                </div>
                                <div className="mt-2 border-t border-slate-200 pt-2 text-center text-[10px]">
                                    Place and date, signature of authorised signatory
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg flex items-start gap-3 no-print">
                    <div className="p-2 bg-amber-100 rounded-lg">
                        <Globe size={20} className="text-amber-600" />
                    </div>
                    <div>
                        <h4 className="font-bold text-amber-800">إرشادات شهادة المنشأ</h4>
                        <p className="text-sm text-amber-700">
                            تأكد من أن البيانات تطابق الفاتورة التجارية وقائمة التعبئة تماماً لتجنب التأخير في الجمارك.
                            يستخدم المعيار "P" للبضائع المنتجة بالكامل محلياً.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CertificateOfOriginForm;
