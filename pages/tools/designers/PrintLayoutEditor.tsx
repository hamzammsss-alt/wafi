import React, { useState } from 'react';
import { Printer, Save, Image as ImageIcon, Eye, Layout } from 'lucide-react';

export const PrintLayoutEditor = () => {
    // Mock Configuration
    const [config, setConfig] = useState({
        companyName: 'شركة وافي الرائدة',
        taxNumber: '3001234567',
        phone: '0599-000000',
        address: 'فلسطين - رام الله - المصيون',
        logoUrl: '', // In real app, this would be a URL
        footerText: 'شكراً لتعاملكم معنا. البضاعة المباعة لا ترد ولا تستبدل بعد 3 أيام.',
        showLogo: true,
        showTax: true,
        primaryColor: '#10b981'
    });

    const [loading, setLoading] = useState(false);

    const handleSave = () => {
        setLoading(true);
        setTimeout(() => {
            setLoading(false);
            alert("تم حفظ إعدادات الطباعة بنجاح");
        }, 800);
    };

    return (
        <div className="p-6 bg-gray-50/50 min-h-screen font-cairo flex gap-6" dir="rtl">

            {/* Settings Panel */}
            <div className="w-[400px] shrink-0 flex flex-col gap-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <Printer className="text-orange-600" /> تعديل شكل الطباعة
                    </h1>
                    <p className="text-gray-500 text-sm mt-1">تخصيص ترويسة وتذييل المستندات</p>
                </div>

                <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 space-y-4">
                    <h3 className="font-bold text-gray-800 border-b pb-2 flex items-center gap-2">
                        <Layout size={16} /> بيانات الترويسة
                    </h3>

                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1">اسم الشركة (للطباعة)</label>
                        <input
                            type="text"
                            className="w-full border p-2 rounded text-sm focus:ring-2 focus:ring-orange-500 outline-none"
                            value={config.companyName}
                            onChange={e => setConfig({ ...config, companyName: e.target.value })}
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1">العنوان</label>
                        <input
                            type="text"
                            className="w-full border p-2 rounded text-sm focus:ring-2 focus:ring-orange-500 outline-none"
                            value={config.address}
                            onChange={e => setConfig({ ...config, address: e.target.value })}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1">رقم الموبايل</label>
                            <input
                                type="text"
                                className="w-full border p-2 rounded text-sm focus:ring-2 focus:ring-orange-500 outline-none"
                                value={config.phone}
                                onChange={e => setConfig({ ...config, phone: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1">رقم المشتغل</label>
                            <input
                                type="text"
                                className="w-full border p-2 rounded text-sm focus:ring-2 focus:ring-orange-500 outline-none"
                                value={config.taxNumber}
                                onChange={e => setConfig({ ...config, taxNumber: e.target.value })}
                            />
                        </div>
                    </div>
                </div>

                <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 space-y-4">
                    <h3 className="font-bold text-gray-800 border-b pb-2 flex items-center gap-2">
                        <ImageIcon size={16} /> الشعار والألوان
                    </h3>

                    <div className="flex items-center gap-3">
                        <div className="w-16 h-16 bg-gray-100 rounded border border-dashed border-gray-300 flex items-center justify-center text-gray-400">
                            {config.logoUrl ? <img src={config.logoUrl} className="w-full h-full object-contain" /> : <ImageIcon />}
                        </div>
                        <button className="text-sm text-blue-600 hover:text-blue-700 font-bold bg-blue-50 px-3 py-1.5 rounded">
                            رفع شعار
                        </button>
                    </div>

                    <div className="flex items-center gap-2 pt-2">
                        <input
                            type="checkbox"
                            checked={config.showLogo}
                            onChange={e => setConfig({ ...config, showLogo: e.target.checked })}
                            className="w-4 h-4 text-orange-600 rounded"
                        />
                        <span className="text-sm text-gray-700">إظهار الشعار في الطباعة</span>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1">اللون الرئيسي</label>
                        <div className="flex gap-2">
                            {['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#1f2937'].map(color => (
                                <button
                                    key={color}
                                    className={`w-8 h-8 rounded-full border-2 ${config.primaryColor === color ? 'border-gray-500 scale-110' : 'border-transparent'}`}
                                    style={{ backgroundColor: color }}
                                    onClick={() => setConfig({ ...config, primaryColor: color })}
                                />
                            ))}
                        </div>
                    </div>
                </div>

                <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 space-y-4">
                    <h3 className="font-bold text-gray-800 border-b pb-2">تذييل المستند</h3>
                    <textarea
                        className="w-full border p-2 rounded text-sm focus:ring-2 focus:ring-orange-500 outline-none h-24"
                        value={config.footerText}
                        onChange={e => setConfig({ ...config, footerText: e.target.value })}
                    ></textarea>
                </div>

                <button
                    onClick={handleSave}
                    disabled={loading}
                    className="bg-orange-600 hover:bg-orange-700 text-white py-3 rounded-xl font-bold shadow hover:shadow-lg transition-all flex justify-center items-center gap-2"
                >
                    <Save size={18} /> {loading ? 'جاري الحفظ...' : 'حفظ التنسيق'}
                </button>
            </div>

            {/* Live Preview */}
            <div className="flex-1 bg-slate-200 rounded-xl p-8 overflow-y-auto flex justify-center">
                <div className="bg-white w-[210mm] min-h-[297mm] shadow-2xl p-[15mm] relative text-black" style={{ transform: 'scale(0.9)', transformOrigin: 'top center' }}>

                    {/* Header Preview */}
                    <div className="border-b-2 pb-4 mb-8 flex justify-between items-start" style={{ borderColor: config.primaryColor }}>
                        <div className="space-y-1">
                            <h1 className="text-2xl font-bold" style={{ color: config.primaryColor }}>{config.companyName}</h1>
                            <p className="text-sm text-gray-600">{config.address}</p>
                            <p className="text-sm text-gray-600" dir="ltr">{config.phone}</p>
                        </div>
                        {config.showLogo && (
                            <div className="w-24 h-24 bg-gray-50 flex items-center justify-center text-gray-300 font-bold border rounded">
                                LOGO
                            </div>
                        )}
                    </div>

                    {/* Body Simulator */}
                    <div className="space-y-6 opacity-50 pointer-events-none">
                        <div className="flex justify-between items-center">
                            <div>
                                <h2 className="text-xl font-bold text-gray-800">فاتورة ضريبية</h2>
                                <p className="text-sm">INV-2026-0001</p>
                            </div>
                            <div className="text-left">
                                <p>التاريخ: 2026/01/11</p>
                                <p>العميل: شركة القدس للتوريدات</p>
                            </div>
                        </div>

                        <table className="w-full text-right border-collapse">
                            <thead>
                                <tr style={{ backgroundColor: config.primaryColor + '20' }}>
                                    <th className="p-2 border">#</th>
                                    <th className="p-2 border">الصنف</th>
                                    <th className="p-2 border">الكمية</th>
                                    <th className="p-2 border">السعر</th>
                                    <th className="p-2 border">المجموع</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td className="p-2 border">1</td>
                                    <td className="p-2 border">لابتوب HP ProBook</td>
                                    <td className="p-2 border">2</td>
                                    <td className="p-2 border">2500</td>
                                    <td className="p-2 border">5000</td>
                                </tr>
                                <tr>
                                    <td className="p-2 border">2</td>
                                    <td className="p-2 border">ماوس لاسلكي</td>
                                    <td className="p-2 border">5</td>
                                    <td className="p-2 border">50</td>
                                    <td className="p-2 border">250</td>
                                </tr>
                                <tr>
                                    <td className="p-2 border">3</td>
                                    <td className="p-2 border">&nbsp;</td>
                                    <td className="p-2 border"></td>
                                    <td className="p-2 border"></td>
                                    <td className="p-2 border"></td>
                                </tr>
                            </tbody>
                        </table>

                        <div className="flex justify-end mt-4">
                            <div className="w-48 border p-3 rounded bg-gray-50">
                                <div className="flex justify-between font-bold text-lg">
                                    <span>المجموع:</span>
                                    <span>5,250 ILS</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Footer Preview */}
                    <div className="absolute bottom-[15mm] left-[15mm] right-[15mm] text-center border-t pt-4">
                        <p className="text-sm text-gray-600 whitespace-pre-line">{config.footerText}</p>
                        <div className="mt-2 text-xs text-gray-400">
                            {config.showTax && <span>م.ض: {config.taxNumber} | </span>}
                            Generated by WAFI ERP
                        </div>
                    </div>

                </div>
            </div>

        </div>
    );
};
