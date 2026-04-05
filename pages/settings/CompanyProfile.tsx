import React, { useEffect, useState, useRef } from 'react';
import { Building, Save, Upload, MapPin, Phone, Mail, Globe, Hash } from 'lucide-react';


export const CompanyProfile = () => {
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [isElectron, setIsElectron] = useState(true);
    const [formData, setFormData] = useState({
        company_name_ar: '',
        company_name_en: '',
        tax_id: '',
        address: '',
        phone: '',
        email: '',
        website: '',
        currency_symbol: 'ILS',
        logo_url: ''
    });

    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        // Initial detection
        if (!window.electronAPI?.system) {
            console.warn("Electron API not found (running in browser?)");
            setIsElectron(false);
        }
        loadSettings();
    }, []);

    const loadSettings = async () => {
        setLoading(true);
        try {
            // Defensive check
            if (!window.electronAPI?.system) {
                return;
            }
            const data = await window.electronAPI.system.getSettings();
            // Ensure no null values to avoid uncontrolled inputs
            const cleanData = Object.keys(data).reduce((acc: any, key) => {
                acc[key] = data[key] === null || data[key] === undefined ? '' : data[key];
                return acc;
            }, {});

            setFormData(prev => ({ ...prev, ...cleanData }));
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleLogoClick = () => {
        if (!isElectron) {
            alert("يرجى فتح البرنامج من تطبيق سطح المكتب لرفع الشعار");
            return;
        }
        fileInputRef.current?.click();
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Verify API availability
        if (!window.electronAPI?.system?.saveLogo) {
            alert("خطأ: يرجى التأكد من تشغيل التطبيق عبر Electron");
            return;
        }

        try {
            // Read file as ArrayBuffer
            const buffer = await file.arrayBuffer();

            // Send to backend
            const result = await window.electronAPI.system.saveLogo(buffer, file.name);

            if (result.success) {
                setFormData(prev => ({ ...prev, logo_url: result.path }));
            }
        } catch (err: any) {
            console.error("Logo Upload Error:", err);
            alert("فشل رفع الشعار: " + err.message);
        }
    };

    const handleSave = async () => {
        if (!isElectron) {
            alert("لا يمكن حفظ التغييرات من المتصفح. يرجى استخدام تطبيق سطح المكتب.");
            return;
        }
        setSaving(true);
        try {
            await window.electronAPI.system.saveSettings(formData);
            alert('تم حفظ البيانات بنجاح');
            // Notify user or refresh context if needed
        } catch (err: any) {
            alert('فشل الحفظ: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="p-8 text-center text-slate-500">جاري التحميل...</div>;

    return (
        <div className="p-6 bg-[#f8f9fa] min-h-screen font-cairo">
            {!isElectron && (
                <div className="bg-red-50 border-r-4 border-red-500 p-4 mb-6 rounded shadow-sm">
                    <div className="flex">
                        <div className="flex-shrink-0">
                            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <div className="mr-3">
                            <h3 className="text-sm font-medium text-red-800">تنبيه بيئة التشغيل</h3>
                            <div className="mt-2 text-sm text-red-700">
                                <p>أنت تقوم بتشغيل النظام عبر المتصفح. بعض الخصائص (مثل الحفظ ورفع الصور) تتطلب تشغيل البرنامج كـ تطبيق سطح مكتب.</p>
                                <p className="mt-1 font-bold">الرجاء تشغيل الأمر: npm run dev والانتظار حتى تفتح نافذة البرنامج المستقلة.</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                    <Building className="text-blue-600" /> ملف الشركة
                </h1>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded shadow-sm text-sm font-medium flex items-center gap-2 transition-transform active:scale-95 disabled:opacity-50"
                >
                    <Save size={18} /> {saving ? 'جاري الحفظ...' : 'حفظ التغييرات'}
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Left Column: Logo & Basic Info */}
                <div className="md:col-span-1 space-y-6">
                    <div className="border-slate-200 shadow-sm bg-white rounded-xl border">
                        <div className="bg-slate-50 border-b border-slate-100 pb-3 p-4">
                            <h3 className="text-base font-bold text-slate-700">شعار الشركة</h3>
                        </div>
                        <div className="p-6 flex flex-col items-center">
                            <input
                                type="file"
                                ref={fileInputRef}
                                className="hidden"
                                accept="image/png, image/jpeg"
                                onChange={handleFileChange}
                            />

                            <div
                                onClick={handleLogoClick}
                                className="w-32 h-32 bg-slate-100 rounded-full border-2 border-dashed border-slate-300 flex items-center justify-center mb-4 overflow-hidden relative group cursor-pointer hover:border-blue-400 transition-colors"
                            >
                                {formData.logo_url ? (
                                    <img
                                        src={formData.logo_url.startsWith('wafi://') || formData.logo_url.startsWith('http')
                                            ? formData.logo_url
                                            : `wafi://${formData.logo_url.startsWith('/') ? formData.logo_url.substring(1) : formData.logo_url}`}
                                        alt="Logo"
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <Upload className="text-slate-400" size={32} />
                                )}
                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity font-bold text-xs">
                                    تغيير الشعار
                                </div>
                            </div>
                            <p className="text-xs text-slate-500 text-center">انقر لرفع صورة الشعار (PNG, JPG)</p>
                        </div>
                    </div>

                    <div className="border-slate-200 shadow-sm bg-white rounded-xl border">
                        <div className="bg-slate-50 border-b border-slate-100 pb-3 p-4">
                            <h3 className="text-base font-bold text-slate-700">إعدادات عامة</h3>
                        </div>
                        <div className="p-4 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">العملة الأساسية</label>
                                <select
                                    name="currency_symbol"
                                    value={formData.currency_symbol}
                                    onChange={handleChange}
                                    className="w-full border p-2 rounded text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                                >
                                    <option value="ILS">شيكل (ILS)</option>
                                    <option value="USD">دولار (USD)</option>
                                    <option value="JOD">دينار (JOD)</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column: Details Form */}
                <div className="md:col-span-2">
                    <div className="border-slate-200 shadow-sm bg-white rounded-xl border">
                        <div className="bg-slate-50 border-b border-slate-100 pb-3 p-4">
                            <h3 className="text-base font-bold text-slate-700">بيانات المؤسسة</h3>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">اسم الشركة (عربي)</label>
                                    <input
                                        type="text"
                                        name="company_name_ar"
                                        value={formData.company_name_ar}
                                        onChange={handleChange}
                                        className="w-full border p-2 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                        placeholder="مثال: شركة القدس للتجارة"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">اسم الشركة (إنجليزي)</label>
                                    <input
                                        type="text"
                                        name="company_name_en"
                                        value={formData.company_name_en}
                                        onChange={handleChange}
                                        className="w-full border p-2 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none text-left dir-ltr"
                                        placeholder="Ex: Jerusalem Trading Co."
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-2">
                                    <Hash size={14} className="text-slate-400" /> الرقم الضريبي (M.O.F)
                                </label>
                                <input
                                    type="text"
                                    name="tax_id"
                                    value={formData.tax_id}
                                    onChange={handleChange}
                                    className="w-full border p-2 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="562XXXXXX"
                                />
                            </div>

                            <hr className="my-4 border-slate-100" />

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-2">
                                    <MapPin size={14} className="text-slate-400" /> العنوان
                                </label>
                                <input
                                    type="text"
                                    name="address"
                                    value={formData.address}
                                    onChange={handleChange}
                                    className="w-full border p-2 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="المدينة، الشارع، المبنى"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-2">
                                        <Phone size={14} className="text-slate-400" /> الهاتف
                                    </label>
                                    <input
                                        type="text"
                                        name="phone"
                                        value={formData.phone}
                                        onChange={handleChange}
                                        className="w-full border p-2 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none dir-ltr text-right"
                                        placeholder="02-2XXXXXX"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-2">
                                        <Mail size={14} className="text-slate-400" /> البريد الإلكتروني
                                    </label>
                                    <input
                                        type="email"
                                        name="email"
                                        value={formData.email}
                                        onChange={handleChange}
                                        className="w-full border p-2 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none dir-ltr text-right"
                                        placeholder="info@company.com"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-2">
                                    <Globe size={14} className="text-slate-400" /> الموقع الإلكتروني
                                </label>
                                <input
                                    type="text"
                                    name="website"
                                    value={formData.website}
                                    onChange={handleChange}
                                    className="w-full border p-2 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none dir-ltr text-right"
                                    placeholder="www.company.com"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
