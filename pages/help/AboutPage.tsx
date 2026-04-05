import React from 'react';
import { Info, Mail, Phone, Globe } from 'lucide-react';

export const AboutPage: React.FC = () => {
    return (
        <div className="h-full bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center p-6" dir="rtl">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-8">
                <div className="text-center mb-8">
                    <div className="w-24 h-24 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-full mx-auto mb-4 flex items-center justify-center shadow-lg">
                        <Info size={48} className="text-white" />
                    </div>
                    <h1 className="text-4xl font-bold text-gray-800 mb-2">WAFI ERP</h1>
                    <p className="text-lg text-gray-600">The Comprehensive Accounting System</p>
                </div>

                <div className="space-y-4 mb-8">
                    <div className="bg-gray-50 rounded-lg p-4">
                        <p className="text-sm text-gray-600 mb-1">الإصدار</p>
                        <p className="text-lg font-bold text-gray-800">1.0.0</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                        <p className="text-sm text-gray-600 mb-1">تاريخ الإصدار</p>
                        <p className="text-lg font-bold text-gray-800">يناير 2026</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                        <p className="text-sm text-gray-600 mb-1">الترخيص</p>
                        <p className="text-lg font-bold text-gray-800">نسخة تجارية مرخصة</p>
                    </div>
                </div>

                <div className="border-t border-gray-200 pt-6">
                    <h2 className="text-lg font-bold text-gray-800 mb-4">معلومات الاتصال</h2>
                    <div className="space-y-3">
                        <div className="flex items-center gap-3 text-gray-600">
                            <Mail size={20} className="text-indigo-600" />
                            <span>support@wafi.erp</span>
                        </div>
                        <div className="flex items-center gap-3 text-gray-600">
                            <Phone size={20} className="text-indigo-600" />
                            <span>+970-599-123456</span>
                        </div>
                        <div className="flex items-center gap-3 text-gray-600">
                            <Globe size={20} className="text-indigo-600" />
                            <span>www.wafi.erp</span>
                        </div>
                    </div>
                </div>

                <div className="mt-8 text-center text-sm text-gray-500">
                    <p>© 2026 WAFI ERP System - جميع الحقوق محفوظة</p>
                </div>
            </div>
        </div>
    );
};
