
import React from 'react';
import { GenericMasterData } from '../components/GenericMasterData';
import { Clock, Users, Banknote } from 'lucide-react';

export const Employees = () => (
    <GenericMasterData
        title="بطاقة موظف (Employees)"
        icon={<Users className="text-purple-600" />}
        columns={[
            { key: 'empid', label: 'رقم الموظف' },
            { key: 'name', label: 'الاسم رباعي' },
            { key: 'department', label: 'القسم' },
            { key: 'job_title', label: 'المسمى الوظيفي' },
            { key: 'basic_salary', label: 'الراتب الأساسي', type: 'number' }
        ]}
        initialData={[
            { id: 1, empid: '101', name: 'أحمد محمد', department: 'الأرشيف', job_title: 'مدخل بيانات', basic_salary: 3000 }
        ]}
    />
);

export const Attendance = () => {
    return (
        <div className="p-6 bg-[#f0f2f5] min-h-screen">
            <h1 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                <Clock className="text-purple-600" /> حركات الدوام (Attendance)
            </h1>
            <div className="bg-white p-8 rounded shadow text-center text-gray-500">
                <p>تسجيل الحضور والانصراف، أو استيراد البيانات من جهاز البصمة.</p>
            </div>
        </div>
    );
};

export const Payroll = () => {
    return (
        <div className="p-6 bg-[#f0f2f5] min-h-screen">
            <h1 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                <Banknote className="text-green-600" /> الرواتب والأجور (Payroll)
            </h1>
            <div className="bg-white p-8 rounded shadow text-center text-gray-500">
                <p>احتساب مسير الرواتب الشهري بناءً على الدوام والراتب الأساسي والإضافات والخصومات.</p>
            </div>
        </div>
    );
};
