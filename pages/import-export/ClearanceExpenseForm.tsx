import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Save, ArrowLeft } from 'lucide-react';
import { Card, CardContent } from '../../components/ui/Card';
import { useTabs } from '../../src/contexts/TabsContext';

// Local UI Helpers
const Button = ({ children, variant, className, onClick, type, disabled }: any) => {
    const base = "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors h-9 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-slate-400";
    const variants: any = {
        default: "bg-blue-600 text-white hover:bg-blue-700 shadow",
        outline: "border border-slate-200 bg-transparent shadow-sm hover:bg-slate-100",
        ghost: "hover:bg-slate-100",
    };
    return <button type={type} disabled={disabled} onClick={onClick} className={`${base} ${variants[variant || 'default']} ${className}`}>{children}</button>;
};

const Input = ({ className, ...props }: any) => <input className={`flex h-9 w-full rounded-md border border-slate-300 bg-white px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${className}`} {...props} />;
const Label = ({ children }: any) => <label className="text-sm font-medium text-slate-700 mb-1 block">{children}</label>;
const Select = ({ className, children, ...props }: any) => <select className={`flex h-9 w-full rounded-md border border-slate-300 bg-white px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${className}`} {...props}>{children}</select>;

const ClearanceExpenseForm = () => {
    const { shipmentId, id } = useParams();
    const navigate = useNavigate();
    const { navigateInTab } = useTabs();
    const isEdit = id && id !== 'new';

    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        expense_no: '',
        shipment_id: shipmentId || '',
        expense_date: new Date().toISOString().split('T')[0],
        expense_type: 'CUSTOMS',
        description: '',
        amount: 0,
        currency_id: 'ILS',
        exchange_rate: 1,
        allocation_method: 'VALUE',
        payment_method: '',
        paid_to: '',
        payment_reference: ''
    });

    useEffect(() => {
        if (isEdit) {
            loadExpense();
        } else {
            generateExpenseNo();
        }
    }, [id]);

    const generateExpenseNo = () => {
        const timestamp = Date.now().toString().slice(-6);
        setFormData(prev => ({ ...prev, expense_no: `EXP-${timestamp}` }));
    };

    const loadExpense = async () => {
        try {
            setLoading(true);
            const data = await window.electronAPI.import.getClearanceExpenseById(id);
            if (data) {
                setFormData({
                    ...formData,
                    ...data,
                    description: data.description || '',
                    paid_to: data.paid_to || '',
                    payment_reference: data.payment_reference || ''
                });
            }
        } catch (error) {
            console.error('Error loading expense:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!formData.expense_type) {
            alert('الرجاء اختيار نوع المصروف');
            return;
        }

        if (formData.amount <= 0) {
            alert('الرجاء إدخال مبلغ صحيح');
            return;
        }

        try {
            setLoading(true);
            const result = await window.electronAPI.import.saveClearanceExpense(formData);

            if (result.success) {
                alert('تم الحفظ بنجاح');
                navigateInTab(`/import/shipments/${shipmentId}`, `ملف ${shipmentId}`);
            }
        } catch (error) {
            console.error('Error saving expense:', error);
            alert('حدث خطأ أثناء الحفظ');
        } finally {
            setLoading(false);
        }
    };

    const expenseTypes = [
        { value: 'CUSTOMS', label: 'رسوم جمركية' },
        { value: 'TAX', label: 'ضرائب' },
        { value: 'TRANSPORT', label: 'نقل' },
        { value: 'INSURANCE', label: 'تأمين' },
        { value: 'BROKER_FEE', label: 'عمولة مخلص' },
        { value: 'PORT_FEES', label: 'رسوم ميناء' },
        { value: 'STORAGE', label: 'تخزين' },
        { value: 'INSPECTION', label: 'فحص' },
        { value: 'OTHER', label: 'أخرى' }
    ];

    const allocationMethods = [
        { value: 'VALUE', label: 'حسب القيمة' },
        { value: 'WEIGHT', label: 'حسب الوزن' },
        { value: 'VOLUME', label: 'حسب الحجم' },
        { value: 'MANUAL', label: 'يدوي' }
    ];

    const amountInBaseCurrency = formData.amount * formData.exchange_rate;

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
                            {isEdit ? `تعديل مصروف #${formData.expense_no}` : 'مصروف تخليص جديد'}
                        </h1>
                        <p className="text-slate-500 text-sm">مصاريف الجمارك والتخليص</p>
                    </div>
                </div>
                <Button onClick={handleSave} disabled={loading} className="gap-2">
                    <Save className="w-4 h-4" />
                    {loading ? 'جاري الحفظ...' : 'حفظ المصروف'}
                </Button>
            </div>

            {/* Main Form */}
            <Card>
                <CardContent className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Expense Number */}
                        <div>
                            <Label>رقم المصروف</Label>
                            <Input
                                value={formData.expense_no}
                                onChange={(e) => setFormData({ ...formData, expense_no: e.target.value })}
                                placeholder="EXP-XXXXXX"
                            />
                        </div>

                        {/* Expense Date */}
                        <div>
                            <Label>تاريخ المصروف</Label>
                            <Input
                                type="date"
                                value={formData.expense_date}
                                onChange={(e) => setFormData({ ...formData, expense_date: e.target.value })}
                            />
                        </div>

                        {/* Expense Type */}
                        <div>
                            <Label>نوع المصروف *</Label>
                            <Select
                                value={formData.expense_type}
                                onChange={(e) => setFormData({ ...formData, expense_type: e.target.value })}
                            >
                                {expenseTypes.map(type => (
                                    <option key={type.value} value={type.value}>
                                        {type.label}
                                    </option>
                                ))}
                            </Select>
                        </div>

                        {/* Amount */}
                        <div>
                            <Label>المبلغ *</Label>
                            <Input
                                type="number"
                                step="0.01"
                                value={formData.amount}
                                onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                                placeholder="0.00"
                            />
                        </div>

                        {/* Currency */}
                        <div>
                            <Label>العملة</Label>
                            <Select
                                value={formData.currency_id}
                                onChange={(e) => setFormData({ ...formData, currency_id: e.target.value })}
                            >
                                <option value="ILS">شيكل (ILS)</option>
                                <option value="USD">دولار أمريكي (USD)</option>
                                <option value="EUR">يورو (EUR)</option>
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
                                onChange={(e) => setFormData({ ...formData, exchange_rate: parseFloat(e.target.value) || 1 })}
                            />
                        </div>

                        {/* Amount in Base Currency (Display Only) */}
                        <div>
                            <Label>المبلغ بالشيكل</Label>
                            <Input
                                value={amountInBaseCurrency.toLocaleString('ar-EG', { minimumFractionDigits: 2 })}
                                readOnly
                                className="bg-slate-100 font-semibold"
                            />
                        </div>

                        {/* Allocation Method */}
                        <div>
                            <Label>طريقة التوزيع</Label>
                            <Select
                                value={formData.allocation_method}
                                onChange={(e) => setFormData({ ...formData, allocation_method: e.target.value })}
                            >
                                {allocationMethods.map(method => (
                                    <option key={method.value} value={method.value}>
                                        {method.label}
                                    </option>
                                ))}
                            </Select>
                        </div>

                        {/* Payment Method */}
                        <div>
                            <Label>طريقة الدفع</Label>
                            <Select
                                value={formData.payment_method}
                                onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                            >
                                <option value="">اختر...</option>
                                <option value="CASH">نقدي</option>
                                <option value="BANK">بنك</option>
                                <option value="CHECK">شيك</option>
                            </Select>
                        </div>

                        {/* Paid To */}
                        <div className="md:col-span-2">
                            <Label>الدفع لـ</Label>
                            <Input
                                value={formData.paid_to}
                                onChange={(e) => setFormData({ ...formData, paid_to: e.target.value })}
                                placeholder="مثال: مخلص جمركي، شركة شحن، الجمارك..."
                            />
                        </div>

                        {/* Payment Reference */}
                        <div>
                            <Label>مرجع الدفع</Label>
                            <Input
                                value={formData.payment_reference}
                                onChange={(e) => setFormData({ ...formData, payment_reference: e.target.value })}
                                placeholder="رقم الإيصال / الشيك"
                            />
                        </div>

                        {/* Description */}
                        <div className="md:col-span-3">
                            <Label>الوصف / الملاحظات</Label>
                            <textarea
                                className="flex w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                rows={3}
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                placeholder="تفاصيل إضافية عن المصروف..."
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Info Box */}
            <Card className="bg-blue-50 border-blue-200">
                <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                        <div className="text-blue-600 mt-0.5">
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <div className="flex-1">
                            <h4 className="font-semibold text-blue-900 text-sm">ملاحظة</h4>
                            <p className="text-blue-800 text-sm mt-1">
                                سيتم توزيع هذا المصروف على الأصناف في ملف الشحنة عند تطبيق التكلفة النهائية (Landed Cost) حسب طريقة التوزيع المختارة.
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default ClearanceExpenseForm;
