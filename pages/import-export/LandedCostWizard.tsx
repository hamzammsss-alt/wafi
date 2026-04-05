import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, Calculator, FileText, AlertCircle } from 'lucide-react';
import { Card, CardContent } from '../../components/ui/Card';
import { useTabs } from '../../src/contexts/TabsContext';

// UI Helpers
const Button = ({ children, variant, className, onClick, type, disabled }: any) => {
    const base = "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors h-9 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-slate-400";
    const variants: any = {
        default: "bg-blue-600 text-white hover:bg-blue-700 shadow",
        outline: "border border-slate-200 bg-transparent shadow-sm hover:bg-slate-100",
        success: "bg-green-600 text-white hover:bg-green-700 shadow",
    };
    return <button type={type} disabled={disabled} onClick={onClick} className={`${base} ${variants[variant || 'default']} ${className}`}>{children}</button>;
};

const Input = ({ className, ...props }: any) => <input className={`flex h-9 w-full rounded-md border border-slate-300 bg-white px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${className}`} {...props} />;
const Label = ({ children }: any) => <label className="text-sm font-medium text-slate-700 mb-1 block">{children}</label>;

const LandedCostWizard = () => {
    const { shipmentId } = useParams();
    const { navigateInTab } = useTabs();

    const [currentStep, setCurrentStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [shipmentData, setShipmentData] = useState<any>(null);
    const [selectedMethod, setSelectedMethod] = useState('VALUE');
    const [preview, setPreview] = useState<any>(null);
    const [editableItems, setEditableItems] = useState<any[]>([]);

    const steps = [
        { id: 1, name: 'مراجعة البيانات', icon: FileText },
        { id: 2, name: 'اختيار طريقة التوزيع', icon: Calculator },
        { id: 3, name: 'معاينة التوزيع', icon: Check },
        { id: 4, name: 'التأكيد والنشر', icon: Check }
    ];

    useEffect(() => {
        loadShipmentData();
    }, [shipmentId]);

    const loadShipmentData = async () => {
        try {
            setLoading(true);
            const data = await window.electronAPI.import.getShipmentCostBreakdown(shipmentId);
            setShipmentData(data);
        } catch (error) {
            console.error('Error loading shipment:', error);
        } finally {
            setLoading(false);
        }
    };

    const calculatePreview = async () => {
        try {
            setLoading(true);
            const result = await window.electronAPI.import.calculateLandedCost(shipmentId, selectedMethod);
            setPreview(result);
            setEditableItems(result.items || []);
        } catch (error) {
            console.error('Error calculating:', error);
            alert('حدث خطأ في الحساب');
        } finally {
            setLoading(false);
        }
    };

    const applyLandedCost = async () => {
        try {
            setLoading(true);
            const result = await window.electronAPI.import.applyLandedCost(shipmentId, editableItems);

            if (result.success) {
                alert('تم تطبيق التكلفة النهائية بنجاح!');
                navigateInTab(`/import/shipments/${shipmentId}`, `ملف ${shipmentId}`);
            }
        } catch (error) {
            console.error('Error applying:', error);
            alert('حدث خطأ أثناء التطبيق');
        } finally {
            setLoading(false);
        }
    };

    const nextStep = async () => {
        if (currentStep === 2) {
            await calculatePreview();
        }
        if (currentStep < 4) {
            setCurrentStep(currentStep + 1);
        }
    };

    const prevStep = () => {
        if (currentStep > 1) {
            setCurrentStep(currentStep - 1);
        }
    };

    const updateItemCost = (index: number, newCost: number) => {
        const newItems = [...editableItems];
        newItems[index].new_cost = newCost;
        setEditableItems(newItems);
    };

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
                        <h1 className="text-2xl font-bold text-slate-900">معالج التكلفة النهائية</h1>
                        <p className="text-slate-500 text-sm">توزيع تكاليف الشحن والتخليص على الأصناف</p>
                    </div>
                </div>
            </div>

            {/* Steps Progress */}
            <Card>
                <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                        {steps.map((step, index) => (
                            <React.Fragment key={step.id}>
                                <div className="flex flex-col items-center flex-1">
                                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${currentStep > step.id ? 'bg-green-500 text-white' :
                                            currentStep === step.id ? 'bg-blue-600 text-white' :
                                                'bg-slate-200 text-slate-500'
                                        }`}>
                                        {currentStep > step.id ? <Check className="w-6 h-6" /> : <step.icon className="w-6 h-6" />}
                                    </div>
                                    <span className={`mt-2 text-sm font-medium ${currentStep >= step.id ? 'text-slate-900' : 'text-slate-500'
                                        }`}>
                                        {step.name}
                                    </span>
                                </div>
                                {index < steps.length - 1 && (
                                    <div className={`flex-1 h-1 mx-4 ${currentStep > step.id ? 'bg-green-500' : 'bg-slate-200'
                                        }`} />
                                )}
                            </React.Fragment>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Step Content */}
            {currentStep === 1 && shipmentData && (
                <Card>
                    <CardContent className="p-6 space-y-6">
                        <h2 className="text-xl font-bold">مراجعة بيانات الشحنة</h2>

                        {/* Summary Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                                <div className="text-sm text-blue-600 font-medium">قيمة البضاعة</div>
                                <div className="text-2xl font-bold text-blue-900 mt-1">
                                    ₪{shipmentData.total_goods_value?.toLocaleString('ar-EG', { minimumFractionDigits: 2 })}
                                </div>
                                <div className="text-xs text-blue-600 mt-1">
                                    {shipmentData.commercial_invoices?.length || 0} فاتورة تجارية
                                </div>
                            </div>

                            <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                                <div className="text-sm text-orange-600 font-medium">المصاريف</div>
                                <div className="text-2xl font-bold text-orange-900 mt-1">
                                    ₪{shipmentData.total_expenses?.toLocaleString('ar-EG', { minimumFractionDigits: 2 })}
                                </div>
                                <div className="text-xs text-orange-600 mt-1">
                                    {shipmentData.clearance_expenses?.length || 0} مصروف
                                </div>
                            </div>

                            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                                <div className="text-sm text-green-600 font-medium">التكلفة الإجمالية</div>
                                <div className="text-2xl font-bold text-green-900 mt-1">
                                    ₪{shipmentData.total_cost?.toLocaleString('ar-EG', { minimumFractionDigits: 2 })}
                                </div>
                                <div className="text-xs text-green-600 mt-1">
                                    بضاعة + مصاريف
                                </div>
                            </div>
                        </div>

                        {/* Validation Checks */}
                        <div className="space-y-2">
                            <h3 className="font-semibold text-slate-700">التحقق من الاكتمال:</h3>

                            {shipmentData.commercial_invoices?.length > 0 ? (
                                <div className="flex items-center gap-2 text-green-600">
                                    <Check className="w-5 h-5" />
                                    <span>تم إضافة الفواتير التجارية</span>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2 text-red-600">
                                    <AlertCircle className="w-5 h-5" />
                                    <span>لم يتم إضافة فواتير تجارية</span>
                                </div>
                            )}

                            {shipmentData.clearance_expenses?.length > 0 ? (
                                <div className="flex items-center gap-2 text-green-600">
                                    <Check className="w-5 h-5" />
                                    <span>تم إضافة مصاريف التخليص</span>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2 text-orange-600">
                                    <AlertCircle className="w-5 h-5" />
                                    <span>لا توجد مصاريف تخليص (اختياري)</span>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            )}

            {currentStep === 2 && (
                <Card>
                    <CardContent className="p-6 space-y-6">
                        <h2 className="text-xl font-bold">اختيار طريقة التوزيع</h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {[
                                { value: 'VALUE', label: 'حسب القيمة', desc: 'توزيع المصاريف بناءً على قيمة كل صنف' },
                                { value: 'WEIGHT', label: 'حسب الوزن', desc: 'توزيع المصاريف بناءً على وزن كل صنف' },
                                { value: 'VOLUME', label: 'حسب الحجم', desc: 'توزيع المصاريف بناءً على حجم كل صنف' },
                                { value: 'MANUAL', label: 'يدوي', desc: 'إدخال نسب التوزيع يدوياً' }
                            ].map(method => (
                                <div
                                    key={method.value}
                                    onClick={() => setSelectedMethod(method.value)}
                                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${selectedMethod === method.value
                                            ? 'border-blue-500 bg-blue-50'
                                            : 'border-slate-200 hover:border-blue-300'
                                        }`}
                                >
                                    <div className="flex items-start gap-3">
                                        <div className={`w-5 h-5 rounded-full border-2 mt-0.5 flex items-center justify-center ${selectedMethod === method.value
                                                ? 'border-blue-500 bg-blue-500'
                                                : 'border-slate-300'
                                            }`}>
                                            {selectedMethod === method.value && (
                                                <div className="w-2 h-2 bg-white rounded-full" />
                                            )}
                                        </div>
                                        <div className="flex-1">
                                            <div className="font-semibold text-slate-900">{method.label}</div>
                                            <div className="text-sm text-slate-600 mt-1">{method.desc}</div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {currentStep === 3 && preview && (
                <Card>
                    <CardContent className="p-6 space-y-6">
                        <h2 className="text-xl font-bold">معاينة التوزيع</h2>

                        {/* Summary */}
                        <div className="bg-slate-100 p-4 rounded-lg">
                            <div className="grid grid-cols-3 gap-4 text-center">
                                <div>
                                    <div className="text-sm text-slate-600">قيمة البضاعة</div>
                                    <div className="text-lg font-bold">₪{preview.total_goods_value?.toLocaleString('ar-EG')}</div>
                                </div>
                                <div>
                                    <div className="text-sm text-slate-600">المصاريف</div>
                                    <div className="text-lg font-bold">₪{preview.total_expenses?.toLocaleString('ar-EG')}</div>
                                </div>
                                <div>
                                    <div className="text-sm text-slate-600">الإجمالي</div>
                                    <div className="text-lg font-bold text-green-600">₪{preview.total_landed_cost?.toLocaleString('ar-EG')}</div>
                                </div>
                            </div>
                        </div>

                        {/* Items Table */}
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse">
                                <thead>
                                    <tr className="bg-slate-100 border-b">
                                        <th className="p-2 text-right text-sm font-medium">الصنف</th>
                                        <th className="p-2 text-right text-sm font-medium">الكمية</th>
                                        <th className="p-2 text-right text-sm font-medium">قيمة FOB</th>
                                        <th className="p-2 text-right text-sm font-medium">النسبة %</th>
                                        <th className="p-2 text-right text-sm font-medium">المصروف المخصص</th>
                                        <th className="p-2 text-right text-sm font-medium">التكلفة القديمة</th>
                                        <th className="p-2 text-right text-sm font-medium">التكلفة الجديدة</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {editableItems.map((item, index) => (
                                        <tr key={index} className="border-b hover:bg-slate-50">
                                            <td className="p-2 text-sm">{item.item_name}</td>
                                            <td className="p-2 text-sm">{item.quantity}</td>
                                            <td className="p-2 text-sm">₪{item.fob_value?.toLocaleString('ar-EG', { minimumFractionDigits: 2 })}</td>
                                            <td className="p-2 text-sm">{item.allocation_percentage?.toFixed(2)}%</td>
                                            <td className="p-2 text-sm">₪{item.allocated_expense?.toLocaleString('ar-EG', { minimumFractionDigits: 2 })}</td>
                                            <td className="p-2 text-sm">₪{item.old_cost?.toLocaleString('ar-EG', { minimumFractionDigits: 2 })}</td>
                                            <td className="p-2">
                                                <Input
                                                    type="number"
                                                    step="0.01"
                                                    value={item.new_cost}
                                                    onChange={(e) => updateItemCost(index, parseFloat(e.target.value) || 0)}
                                                    className="text-sm w-32 font-semibold"
                                                />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            )}

            {currentStep === 4 && (
                <Card>
                    <CardContent className="p-6 space-y-6">
                        <h2 className="text-xl font-bold">التأكيد والنشر</h2>

                        <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
                            <div className="flex items-start gap-3">
                                <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                                <div className="flex-1">
                                    <h4 className="font-semibold text-yellow-900">تحذير مهم</h4>
                                    <p className="text-sm text-yellow-800 mt-1">
                                        عند الضغط على "تطبيق التكلفة النهائية"، سيتم:
                                    </p>
                                    <ul className="list-disc list-inside text-sm text-yellow-800 mt-2 space-y-1">
                                        <li>تحديث تكلفة جميع الأصناف في المخزون</li>
                                        <li>وضع علامة على جميع المصاريف كـ "موزعة"</li>
                                        <li>إغلاق ملف الشحنة من التعديل</li>
                                        <li>إنشاء سجل توزيع تاريخي</li>
                                    </ul>
                                    <p className="text-sm text-yellow-800 mt-2 font-semibold">
                                        هذه العملية لا يمكن التراجع عنها!
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
                            <h4 className="font-semibold text-green-900 mb-2">ملخص العملية:</h4>
                            <div className="space-y-2 text-sm text-green-800">
                                <div className="flex justify-between">
                                    <span>عدد الأصناف:</span>
                                    <span className="font-semibold">{editableItems.length}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>إجمالي قيمة البضاعة:</span>
                                    <span className="font-semibold">₪{preview?.total_goods_value?.toLocaleString('ar-EG')}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>إجمالي المصاريف:</span>
                                    <span className="font-semibold">₪{preview?.total_expenses?.toLocaleString('ar-EG')}</span>
                                </div>
                                <div className="flex justify-between border-t border-green-300 pt-2 mt-2">
                                    <span className="font-bold">التكلفة النهائية:</span>
                                    <span className="font-bold text-lg">₪{preview?.total_landed_cost?.toLocaleString('ar-EG')}</span>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between">
                <Button
                    variant="outline"
                    onClick={prevStep}
                    disabled={currentStep === 1 || loading}
                    className="gap-2"
                >
                    <ArrowRight className="w-4 h-4" />
                    السابق
                </Button>

                {currentStep < 4 ? (
                    <Button
                        onClick={nextStep}
                        disabled={loading || (currentStep === 1 && !shipmentData?.commercial_invoices?.length)}
                        className="gap-2"
                    >
                        {loading ? 'جاري المعالجة...' : 'التالي'}
                        <ArrowLeft className="w-4 h-4" />
                    </Button>
                ) : (
                    <Button
                        variant="success"
                        onClick={applyLandedCost}
                        disabled={loading}
                        className="gap-2"
                    >
                        {loading ? 'جاري التطبيق...' : 'تطبيق التكلفة النهائية'}
                        <Check className="w-4 h-4" />
                    </Button>
                )}
            </div>
        </div>
    );
};

export default LandedCostWizard;
