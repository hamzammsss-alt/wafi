import React from 'react';
import { Item } from '../../../types';
import { Archive, QrCode, AlertTriangle, Calendar, Info } from 'lucide-react';

interface Props {
    data: Partial<Item>;
    onChange: (data: Partial<Item>) => void;
}

const ItemBatchSerialTab: React.FC<Props> = ({ data, onChange }) => {
    return (
        <div className="p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
                <Archive className="text-blue-600" size={24} />
                إعدادات التتبع والصلاحية
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                {/* Batch & Expiry Card */}
                <div
                    className={`border-2 rounded-xl p-5 cursor-pointer transition-all duration-200 relative overflow-hidden group
                    ${data.has_expiry
                            ? 'border-emerald-500 bg-emerald-50 ring-2 ring-emerald-100'
                            : 'border-gray-200 hover:border-emerald-300 hover:bg-gray-50'}`}
                    onClick={() => onChange({ ...data, has_expiry: data.has_expiry ? 0 : 1 })}
                >
                    <div className="flex items-start gap-4">
                        <div className={`p-3 rounded-full ${data.has_expiry ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-400 group-hover:bg-emerald-50 group-hover:text-emerald-500'}`}>
                            <Calendar size={28} />
                        </div>
                        <div className="flex-1">
                            <div className="flex items-center justify-between">
                                <h4 className={`font-bold text-lg mb-1 ${data.has_expiry ? 'text-emerald-800' : 'text-gray-700'}`}>
                                    تاريخ الصلاحية (Batch & Expiry)
                                </h4>
                                <div className={`w-6 h-6 rounded border flex items-center justify-center transition-colors
                                    ${data.has_expiry ? 'bg-emerald-500 border-emerald-500' : 'border-gray-300 bg-white'}`}>
                                    {data.has_expiry && <span className="text-white text-sm">✓</span>}
                                </div>
                            </div>
                            <p className="text-sm text-gray-500 leading-relaxed">
                                تفعيل هذا الخيار يتطلب إدخال رقم الدفعة (Batch No) وتاريخ الانتهاء عند كل حركة استلام أو شراء.
                                مثالي للأدوية، المواد الغذائية، والمواد الكيميائية.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Serial Number Card */}
                <div
                    className={`border-2 rounded-xl p-5 cursor-pointer transition-all duration-200 relative overflow-hidden group
                    ${data.has_serial
                            ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-100'
                            : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'}`}
                    onClick={() => onChange({ ...data, has_serial: data.has_serial ? 0 : 1 })}
                >
                    <div className="flex items-start gap-4">
                        <div className={`p-3 rounded-full ${data.has_serial ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400 group-hover:bg-blue-50 group-hover:text-blue-500'}`}>
                            <QrCode size={28} />
                        </div>
                        <div className="flex-1">
                            <div className="flex items-center justify-between">
                                <h4 className={`font-bold text-lg mb-1 ${data.has_serial ? 'text-blue-800' : 'text-gray-700'}`}>
                                    الرقم التسلسلي (Serial Number)
                                </h4>
                                <div className={`w-6 h-6 rounded border flex items-center justify-center transition-colors
                                    ${data.has_serial ? 'bg-blue-500 border-blue-500' : 'border-gray-300 bg-white'}`}>
                                    {data.has_serial && <span className="text-white text-sm">✓</span>}
                                </div>
                            </div>
                            <p className="text-sm text-gray-500 leading-relaxed">
                                تفعيل هذا الخيار يتطلب إدخال رقم تسلسلي فريد لكل قطعة.
                                مثالي للأجهزة الإلكترونية، الهواتف، والمعدات التي لها ضمان.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Shelf Life Input */}
            {!!data.has_expiry && (
                <div className="mt-6 p-6 border rounded-xl bg-white shadow-sm animate-fadeIn">
                    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                        <Calendar size={16} /> فترة الصلاحية الافتراضية (بالأيام)
                    </label>
                    <div className="flex items-center gap-3">
                        <input
                            type="number"
                            min="0"
                            value={data.shelf_life_days || ''}
                            onChange={e => onChange({ ...data, shelf_life_days: parseInt(e.target.value) || 0 })}
                            className="w-full md:w-1/4 border-2 border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-emerald-200 focus:border-emerald-500 outline-none transition-colors"
                            placeholder="مثال: 365"
                        />
                        <span className="text-gray-400 text-sm">يوم</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                        <Info size={14} />
                        سيقوم النظام بحساب تاريخ الانتهاء تلقائياً بناءً على تاريخ الإنتاج + هذه المدة.
                    </p>
                </div>
            )}

            {/* Conflict Warning */}
            {(!!data.has_expiry && !!data.has_serial) && (
                <div className="mt-6 flex items-start gap-3 bg-orange-50 p-4 rounded-xl border border-orange-200 text-orange-800">
                    <AlertTriangle className="flex-shrink-0 mt-1" size={20} />
                    <div>
                        <h5 className="font-bold text-sm">إنتباه: تفعيل النظامين معاً</h5>
                        <p className="text-sm mt-1 opacity-90">
                            لقد قمت بتفعيل تتبع الصلاحية والرقم التسلسلي معاً. هذا يعني أن كل عملية إدخال ستتطلب:
                            رقم الدفعة + تاريخ الانتهاء + الرقم التسلسلي لكل قطعة على حدة.
                            تأكد أن هذا يطابق طبيعة الصنف (مثل الأدوية باهظة الثمن التي لها سيريال).
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ItemBatchSerialTab;
