import React, { useState } from 'react';
import { Save, Users, Plus, Trash2, DollarSign } from 'lucide-react';

export const PayrollVoucher = () => {
    const [month, setMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
    const [employees, setEmployees] = useState([
        { id: 1, name: 'أحمد سلطان', salary: 5000, deduction: 0, net: 5000, status: 'Unpaid' },
        { id: 2, name: 'محمد علي', salary: 4500, deduction: 200, net: 4300, status: 'Unpaid' },
    ]);

    const handlePay = (id: number) => {
        setEmployees(prev => prev.map(emp => emp.id === id ? { ...emp, status: 'Paid' } : emp));
    };

    const totalPaid = employees.filter(e => e.status === 'Paid').reduce((sum, e) => sum + e.net, 0);

    return (
        <div className="flex flex-col h-full bg-[#f8f9fa] p-4 gap-6" dir="rtl">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2"><Users className="text-indigo-600" /> صرف الرواتب</h1>
                    <p className="text-gray-500 text-sm">إدارة دفعات الرواتب الشهرية للموظفين</p>
                </div>
                <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg shadow-sm border">
                    <span className="text-gray-600 font-bold">شهر:</span>
                    <input type="month" value={month} onChange={e => setMonth(e.target.value)} className="border-none bg-transparent font-mono font-bold outline-none" />
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <table className="w-full text-right">
                    <thead className="bg-gray-50 border-b text-sm font-bold text-gray-600">
                        <tr>
                            <th className="p-4">الموظف</th>
                            <th className="p-4">الراتب الأساسي</th>
                            <th className="p-4 text-red-600">الخصومات</th>
                            <th className="p-4 text-green-600">صافي الراتب</th>
                            <th className="p-4">الحالة</th>
                            <th className="p-4">إجراء</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {employees.map(emp => (
                            <tr key={emp.id} className="hover:bg-gray-50">
                                <td className="p-4 font-medium">{emp.name}</td>
                                <td className="p-4">{emp.salary.toLocaleString()}</td>
                                <td className="p-4 text-red-500">-{emp.deduction}</td>
                                <td className="p-4 font-bold text-green-700">{emp.net.toLocaleString()}</td>
                                <td className="p-4">
                                    <span className={`px-2 py-1 rounded text-xs font-bold ${emp.status === 'Paid' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                        {emp.status === 'Paid' ? 'تم الصرف' : 'معلق'}
                                    </span>
                                </td>
                                <td className="p-4">
                                    {emp.status === 'Unpaid' && (
                                        <button onClick={() => handlePay(emp.id)} className="bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-sm font-bold hover:bg-indigo-700 flex items-center gap-1">
                                            <DollarSign size={14} /> صرف
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {totalPaid > 0 && (
                <div className="bg-green-50 p-4 rounded-xl border border-green-200 flex justify-between items-center">
                    <span className="font-bold text-green-800">إجمالي الرواتب المصروفة لهذا الشهر</span>
                    <span className="text-2xl font-mono font-bold text-green-700">{totalPaid.toLocaleString()} ₪</span>
                </div>
            )}
        </div>
    );
};
