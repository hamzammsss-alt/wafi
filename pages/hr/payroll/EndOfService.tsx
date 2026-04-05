
import React, { useState, useEffect } from 'react';
import { Calculator, User } from 'lucide-react';

const EndOfService = () => {
    const [employees, setEmployees] = useState<any[]>([]);
    const [employeeId, setEmployeeId] = useState('');
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
    const [result, setResult] = useState<any>(null);

    useEffect(() => {
        loadEmployees();
    }, []);

    const loadEmployees = async () => {
        const data = await window.electronAPI.hr.getEmployees();
        setEmployees(data || []);
    };

    const handleCalculate = async () => {
        if (!employeeId) return;
        try {
            const res = await window.electronAPI.hr.calculateEOS(employeeId, endDate);
            setResult(res);
        } catch (err: any) { alert('خطأ: ' + err.message); }
    };

    return (
        <div className="p-6 bg-gray-50 min-h-screen rtl text-right" dir="rtl">
            <h1 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                <Calculator className="text-purple-600" />
                احتساب نهاية الخدمة
            </h1>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-fit">
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">الموظف</label>
                            <select
                                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-purple-100 outline-none"
                                value={employeeId}
                                onChange={e => setEmployeeId(e.target.value)}
                            >
                                <option value="">اختر الموظف...</option>
                                {employees.map(e => <option key={e.id} value={e.id}>{e.first_name} {e.last_name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">تاريخ نهاية العمل</label>
                            <input
                                type="date"
                                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-purple-100 outline-none"
                                value={endDate}
                                onChange={e => setEndDate(e.target.value)}
                            />
                        </div>
                        <button
                            onClick={handleCalculate}
                            className="w-full py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium"
                        >
                            احتساب المستحقات
                        </button>
                    </div>
                </div>

                {result && (
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 animate-in fade-in slide-in-from-top-4">
                        <h3 className="font-bold text-lg mb-4 text-gray-800 border-b pb-2">نتيجة الاحتساب</h3>
                        <div className="space-y-3 text-sm">
                            <div className="flex justify-between">
                                <span className="text-gray-500">الاسم:</span>
                                <span className="font-bold">{result.employee_name}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500">تاريخ البدء:</span>
                                <span className="font-mono">{result.join_date}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500">تاريخ النهاية:</span>
                                <span className="font-mono">{result.end_date}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500">مدة الخدمة (سنوات):</span>
                                <span className="font-bold">{result.years_of_service}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500">آخر راتب إجمالي:</span>
                                <span className="font-bold">{parseFloat(result.last_gross_salary).toLocaleString()}</span>
                            </div>
                            <div className="border-t pt-3 mt-2">
                                <div className="flex justify-between items-center bg-purple-50 p-3 rounded-lg">
                                    <span className="text-purple-800 font-bold">مكافأة نهاية الخدمة:</span>
                                    <span className="text-xl font-bold text-purple-700">{parseFloat(result.amount).toLocaleString()}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default EndOfService;
