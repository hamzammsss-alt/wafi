import React, { useState } from 'react';
import { LayoutTemplate, Eye, EyeOff, Check, Save } from 'lucide-react';

export const FormDesigner = () => {
    const [selectedForm, setSelectedForm] = useState('customer');
    const [loading, setLoading] = useState(false);

    // Mock Schema for forms
    const [schemas, setSchemas] = useState<any>({
        customer: {
            title: 'بطاقة الزبون',
            fields: [
                { id: 'code', label: 'كود الزبون', required: true, visible: true },
                { id: 'name_ar', label: 'الاسم العربي', required: true, visible: true },
                { id: 'name_en', label: 'الاسم الإنجليزي', required: false, visible: true },
                { id: 'phone', label: 'رقم الهاتف', required: true, visible: true },
                { id: 'mobile', label: 'رقم الموبايل', required: false, visible: true },
                { id: 'email', label: 'البريد الإلكتروني', required: false, visible: false },
                { id: 'credit_limit', label: 'سقف الدين', required: false, visible: true },
                { id: 'tax_no', label: 'رقم المشتغل', required: false, visible: true },
                { id: 'region', label: 'المنطقة/المدينة', required: false, visible: true },
                { id: 'coords', label: 'إحداثيات الموقع (GPS)', required: false, visible: false },
            ]
        },
        item: {
            title: 'بطاقة الصنف',
            fields: [
                { id: 'sku', label: 'رمز الصنف (SKU)', required: true, visible: true },
                { id: 'barcode', label: 'الباركود', required: false, visible: true },
                { id: 'name', label: 'اسم الصنف', required: true, visible: true },
                { id: 'category', label: 'التصنيف', required: true, visible: true },
                { id: 'brand', label: 'الماركة', required: false, visible: true },
                { id: 'origin', label: 'بلد المنشأ', required: false, visible: false },
                { id: 'weight', label: 'الوزن', required: false, visible: false },
                { id: 'min_qty', label: 'حد الطلب', required: false, visible: true },
                { id: 'shelf_life', label: 'تاريخ الصلاحية', required: false, visible: false },
            ]
        },
        invoice: {
            title: 'فاتورة المبيعات',
            fields: [
                { id: 'ref_no', label: 'الرقم المرجعي', required: false, visible: true },
                { id: 'salesman', label: 'مندوب المبيعات', required: false, visible: true },
                { id: 'cost_center', label: 'مركز التكلفة', required: false, visible: false },
                { id: 'warehouse', label: 'المستودع', required: true, visible: true },
                { id: 'notes', label: 'ملاحظات', required: false, visible: true },
                { id: 'driver', label: 'اسم السائق', required: false, visible: false },
                { id: 'payment_terms', label: 'شروط الدفع', required: false, visible: true },
            ]
        }
    });

    const toggleField = (formKey: string, fieldId: string) => {
        const form = schemas[formKey];
        const field = form.fields.find((f: any) => f.id === fieldId);
        if (field.required) return; // Cannot hide required fields

        const updatedFields = form.fields.map((f: any) =>
            f.id === fieldId ? { ...f, visible: !f.visible } : f
        );

        setSchemas({
            ...schemas,
            [formKey]: { ...form, fields: updatedFields }
        });
    };

    const handleSave = () => {
        setLoading(true);
        // Simulate save
        setTimeout(() => {
            setLoading(false);
            alert("تم تحديث تصميم النماذج");
        }, 800);
    };

    return (
        <div className="app-page flex gap-6" dir="rtl">

            {/* Sidebar Form Selector */}
            <div className="w-64 card p-4 shrink-0 h-fit">
                <h2 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <LayoutTemplate className="text-indigo-600" /> النماذج
                </h2>
                <div className="space-y-1">
                    {Object.keys(schemas).map(key => (
                        <button
                            key={key}
                            onClick={() => setSelectedForm(key)}
                            className={`w-full text-right px-4 py-3 rounded-lg text-sm font-medium transition-colors ${selectedForm === key
                                    ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                                    : 'text-gray-600 hover:bg-gray-50'
                                }`}
                        >
                            {schemas[key].title}
                        </button>
                    ))}
                </div>
            </div>

            {/* Editor Area */}
            <div className="flex-1 card flex flex-col">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                    <div>
                        <h1 className="text-xl font-bold text-gray-800">{schemas[selectedForm].title}</h1>
                        <p className="text-sm text-gray-500 mt-1">تفعيل أو تعطيل الحقول في النموذج</p>
                    </div>
                    <button
                        onClick={handleSave}
                        disabled={loading}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg font-bold shadow hover:shadow-lg transition-all flex items-center gap-2"
                    >
                        <Save size={18} /> {loading ? 'جاري الحفظ...' : 'حفظ التعديلات'}
                    </button>
                </div>

                <div className="p-6 grid grid-cols-2 lg:grid-cols-3 gap-4">
                    {schemas[selectedForm].fields.map((field: any) => (
                        <div
                            key={field.id}
                            onClick={() => !field.required && toggleField(selectedForm, field.id)}
                            className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex items-center justify-between group ${field.visible
                                    ? 'border-indigo-100 bg-indigo-50/30 hover:border-indigo-300'
                                    : 'border-gray-100 bg-gray-50 opacity-60 hover:opacity-100'
                                }`}
                        >
                            <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${field.visible ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-200 text-gray-500'
                                    }`}>
                                    {field.visible ? <Eye size={16} /> : <EyeOff size={16} />}
                                </div>
                                <div>
                                    <h4 className={`font-bold text-sm ${field.visible ? 'text-gray-800' : 'text-gray-500'}`}>{field.label}</h4>
                                    <p className="text-[10px] text-gray-400 font-mono">{field.id}</p>
                                </div>
                            </div>

                            {field.required ? (
                                <span className="text-[10px] bg-red-100 text-red-600 px-2 py-0.5 rounded font-bold">إجبار</span>
                            ) : (
                                <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${field.visible ? 'bg-indigo-600 border-indigo-600' : 'border-gray-300'
                                    }`}>
                                    {field.visible && <Check size={12} className="text-white" />}
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                <div className="p-6 bg-gray-50 border-t border-gray-100 mt-auto">
                    <div className="flex gap-2 text-sm text-gray-500 items-center">
                        <span className="w-3 h-3 bg-red-100 rounded-sm inline-block"></span>
                        <span>الحقول الإجبارية لا يمكن إخفاؤها</span>
                    </div>
                </div>
            </div>

        </div>
    );
};
