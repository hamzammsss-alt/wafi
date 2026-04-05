import React, { useState } from 'react';
import { FileText, Plus, Calendar, User, DollarSign, Save } from 'lucide-react';

export const Quotation: React.FC = () => {
    const [quotation, setQuotation] = useState({
        ref_no: '',
        date: new Date().toISOString().split('T')[0],
        customer_id: null,
        valid_until: '',
        items: [],
        notes: ''
    });

    return (
        <div className="h-full bg-gray-50 p-6" dir="rtl">
            <div className="max-w-6xl mx-auto">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                                <FileText size={24} className="text-blue-600" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-gray-800">عرض أسعار</h1>
                                <p className="text-sm text-gray-500">إنشاء عرض سعر للعميل</p>
                            </div>
                        </div>
                        <button className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition flex items-center gap-2">
                            <Save size={18} />
                            حفظ وطباعة
                        </button>
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <div className="grid grid-cols-2 gap-4 mb-6">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                                <FileText size={16} />
                                رقم العرض
                            </label>
                            <input
                                type="text"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50"
                                placeholder="تلقائي"
                                readOnly
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                                <Calendar size={16} />
                                التاريخ
                            </label>
                            <input
                                type="date"
                                value={quotation.date}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                                <User size={16} />
                                العميل
                            </label>
                            <select className="w-full px-4 py-2 border border-gray-300 rounded-lg">
                                <option value="">اختر عميل...</option>
                                <option value="1">شركة التقنية المتقدمة</option>
                                <option value="2">مؤسسة النور التجارية</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">صالح حتى</label>
                            <input
                                type="date"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                            />
                        </div>
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center text-sm text-blue-700">
                        <p><strong>ملاحظة:</strong> عرض الأسعار لا يؤثر على المخزون أو الحسابات المالية</p>
                    </div>
                </div>
            </div>
        </div>
    );
};
