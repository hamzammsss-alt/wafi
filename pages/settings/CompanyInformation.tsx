import React, { useState, useEffect } from 'react';
import { Building2, Save, Upload, Globe, Phone, Mail, MapPin, FileText, DollarSign } from 'lucide-react';

export const CompanyInformation: React.FC = () => {
    const [companyData, setCompanyData] = useState({
        nameAr: 'شركة التقنية المتقدمة',
        nameEn: 'Advanced Technology Company',
        address: 'رام الله - فلسطين',
        phone1: '022951234',
        phone2: '0599123456',
        email: 'info@company.ps',
        website: 'www.company.ps',
        vatNo: 'PS123456789',
        licenseNo: 'LIC-2024-001',
        baseCurrency: 'ILS',
        headerLogo: null as File | null,
        footerLogo: null as File | null
    });

    const [headerPreview, setHeaderPreview] = useState<string>('');
    const [footerPreview, setFooterPreview] = useState<string>('');

    const handleSave = async () => {
        // @ts-ignore
        if (window.electronAPI) {
            // @ts-ignore
            await window.electronAPI.saveCompanyInfo(companyData);
            alert('تم حفظ معلومات الشركة بنجاح');
        }
    };

    const handleLogoUpload = (type: 'header' | 'footer', file: File) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            if (type === 'header') {
                setHeaderPreview(reader.result as string);
                setCompanyData({ ...companyData, headerLogo: file });
            } else {
                setFooterPreview(reader.result as string);
                setCompanyData({ ...companyData, footerLogo: file });
            }
        };
        reader.readAsDataURL(file);
    };

    return (
        <div className="h-full bg-gray-50 p-6 overflow-auto" dir="rtl">
            <div className="max-w-5xl mx-auto">
                {/* Header */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center">
                                <Building2 size={24} className="text-indigo-600" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-gray-800">معلومات الشركة</h1>
                                <p className="text-sm text-gray-500">إدارة البيانات الأساسية والمالية للشركة</p>
                            </div>
                        </div>
                        <button
                            onClick={handleSave}
                            className="bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition flex items-center gap-2 shadow-sm"
                        >
                            <Save size={18} />
                            حفظ التغييرات
                        </button>
                    </div>
                </div>

                {/* Basic Information */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
                    <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <FileText size={20} className="text-indigo-600" />
                        البيانات الأساسية
                    </h2>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">اسم الشركة (عربي)</label>
                            <input
                                type="text"
                                value={companyData.nameAr}
                                onChange={(e) => setCompanyData({ ...companyData, nameAr: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Company Name (English)</label>
                            <input
                                type="text"
                                value={companyData.nameEn}
                                onChange={(e) => setCompanyData({ ...companyData, nameEn: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none"
                                dir="ltr"
                            />
                        </div>
                        <div className="col-span-2">
                            <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                                <MapPin size={16} />
                                العنوان
                            </label>
                            <input
                                type="text"
                                value={companyData.address}
                                onChange={(e) => setCompanyData({ ...companyData, address: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                                <Phone size={16} />
                                هاتف 1
                            </label>
                            <input
                                type="tel"
                                value={companyData.phone1}
                                onChange={(e) => setCompanyData({ ...companyData, phone1: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                                <Phone size={16} />
                                هاتف 2
                            </label>
                            <input
                                type="tel"
                                value={companyData.phone2}
                                onChange={(e) => setCompanyData({ ...companyData, phone2: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                                <Mail size={16} />
                                البريد الإلكتروني
                            </label>
                            <input
                                type="email"
                                value={companyData.email}
                                onChange={(e) => setCompanyData({ ...companyData, email: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none"
                                dir="ltr"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                                <Globe size={16} />
                                الموقع الإلكتروني
                            </label>
                            <input
                                type="url"
                                value={companyData.website}
                                onChange={(e) => setCompanyData({ ...companyData, website: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none"
                                dir="ltr"
                            />
                        </div>
                    </div>
                </div>

                {/* Financial Information */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
                    <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <DollarSign size={20} className="text-green-600" />
                        البيانات المالية
                    </h2>
                    <div className="grid grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">الرقم الضريبي (VAT)</label>
                            <input
                                type="text"
                                value={companyData.vatNo}
                                onChange={(e) => setCompanyData({ ...companyData, vatNo: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">رقم الترخيص</label>
                            <input
                                type="text"
                                value={companyData.licenseNo}
                                onChange={(e) => setCompanyData({ ...companyData, licenseNo: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">العملة الأساسية</label>
                            <select
                                value={companyData.baseCurrency}
                                onChange={(e) => setCompanyData({ ...companyData, baseCurrency: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none"
                            >
                                <option value="ILS">شيكل (ILS)</option>
                                <option value="USD">دولار (USD)</option>
                                <option value="JOD">دينار (JOD)</option>
                                <option value="EUR">يورو (EUR)</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Logos */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <Upload size={20} className="text-purple-600" />
                        الشعارات
                    </h2>
                    <div className="grid grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-3">شعار الترويسة (Header)</label>
                            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-indigo-500 transition">
                                {headerPreview ? (
                                    <img src={headerPreview} alt="Header Logo" className="max-h-32 mx-auto mb-3" />
                                ) : (
                                    <Upload size={48} className="mx-auto text-gray-400 mb-3" />
                                )}
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => e.target.files?.[0] && handleLogoUpload('header', e.target.files[0])}
                                    className="hidden"
                                    id="header-logo"
                                />
                                <label
                                    htmlFor="header-logo"
                                    className="inline-block bg-indigo-100 text-indigo-700 px-4 py-2 rounded-lg cursor-pointer hover:bg-indigo-200 transition text-sm font-medium"
                                >
                                    اختر صورة
                                </label>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-3">شعار التذييل (Footer)</label>
                            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-indigo-500 transition">
                                {footerPreview ? (
                                    <img src={footerPreview} alt="Footer Logo" className="max-h-32 mx-auto mb-3" />
                                ) : (
                                    <Upload size={48} className="mx-auto text-gray-400 mb-3" />
                                )}
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => e.target.files?.[0] && handleLogoUpload('footer', e.target.files[0])}
                                    className="hidden"
                                    id="footer-logo"
                                />
                                <label
                                    htmlFor="footer-logo"
                                    className="inline-block bg-indigo-100 text-indigo-700 px-4 py-2 rounded-lg cursor-pointer hover:bg-indigo-200 transition text-sm font-medium"
                                >
                                    اختر صورة
                                </label>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
