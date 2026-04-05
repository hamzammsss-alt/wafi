
import React from 'react';
import { GenericMasterData } from '../components/GenericMasterData';
import { ShieldCheck, Calendar, Lock } from 'lucide-react';

export const Users = () => (
    <GenericMasterData
        title="إدارة المستخدمين والصلاحيات"
        icon={<ShieldCheck className="text-blue-600" />}
        columns={[
            { key: 'username', label: 'اسم المستخدم' },
            { key: 'role', label: 'الدور (Role)' },
            { key: 'status', label: 'الحالة' }
        ]}
        initialData={[
            { id: 1, username: 'admin', role: 'مدير النظام', status: 'نشط' },
            { id: 2, username: 'user1', role: 'محاسب', status: 'نشط' }
        ]}
    />
);

export const YearEnd = () => {
    return (
        <div className="p-6 bg-[#f0f2f5] min-h-screen flex items-center justify-center">
            <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full text-center border-t-4 border-red-600">
                <div className="flex justify-center mb-4 text-red-600">
                    <Calendar size={48} />
                </div>
                <h1 className="text-2xl font-bold text-gray-800 mb-4">إغلاق السنة المالية</h1>
                <p className="text-gray-600 mb-6 text-sm">
                    تنبيه: سيقوم النظام بتدوير الأرصدة الختامية إلى السنة الجديدة وإغلاق الحسابات المؤقتة.
                    يرجى التأكد من ترحيل جميع السندات قبل المتابعة.
                </p>
                <button className="bg-red-600 text-white px-6 py-3 rounded hover:bg-red-700 font-bold w-full flex items-center justify-center gap-2">
                    <Lock size={18} /> تأكيد الإغلاق
                </button>
            </div>
        </div>
    );
};
