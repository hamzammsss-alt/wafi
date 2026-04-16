
import React, { useState, useEffect } from 'react';
import { BadgeDollarSign, Save, Clock, CheckCircle } from 'lucide-react';

const AdvanceRequest = () => {
    const [employees, setEmployees] = useState<any[]>([]);
    const [advances, setAdvances] = useState<any[]>([]);
    const [form, setForm] = useState({
        employee_id: '',
        amount: '',
        currency: 'ILS',
        repayment_start_date: '',
        installments_count: 1,
        reason: ''
    });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const emps = await window.electronAPI.hr.getEmployees();
            setEmployees(emps || []);
            // TODO: Fetch existing advances (using saveAdvance with blank ID or specific get method)
            // For now, listing is not strictly implemented in service for "getAllAdvances", 
            // only "ActiveAdvances" for payroll. We might skip the list or implement a getter.
            // window.electronAPI.hr.getAdvances() 
        } catch (err) { console.error(err); }
    };

    const handleSubmit = async () => {
        if (!form.employee_id || !form.amount || !form.repayment_start_date) {
            alert('يرجى تعبئة الحقول المطلوبة');
            return;
        }
        try {
            await window.electronAPI.hr.saveAdvance({
                ...form,
                amount: parseFloat(form.amount)
            });
            alert('تم تسجيل السلفة بنجاح');
            setForm({ ...form, amount: '', reason: '' });
        } catch (err: any) { alert('خطأ: ' + err.message); }
    };

    return (
        <div className="app-page" dir="rtl">
            <h1 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                <BadgeDollarSign className="text-orange-600" />
                طلب سلفة مالية
            </h1>

            <div className="max-w-2xl mx-auto bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">الموظف</label>
                        <select
                            className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-100"
                            value={form.employee_id}
                            onChange={e => setForm({ ...form, employee_id: e.target.value })}
                        >
                            <option value="">اختر الموظف...</option>
                            {employees.map(e => <option key={e.id} value={e.id}>{e.first_name} {e.last_name}</option>)}
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">المبلغ المطلوب</label>
                            <input
                                type="number"
                                className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-100"
                                value={form.amount}
                                onChange={e => setForm({ ...form, amount: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">العملة</label>
                            <select
                                className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-100"
                                value={form.currency}
                                onChange={e => setForm({ ...form, currency: e.target.value })}
                            >
                                <option value="ILS">شيقل</option>
                                <option value="USD">دولار</option>
                                <option value="JOD">دينار</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">تاريخ بدء الخصم</label>
                            <input
                                type="date"
                                className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-100"
                                value={form.repayment_start_date}
                                onChange={e => setForm({ ...form, repayment_start_date: e.target.value })}
                            />
                            <p className="text-xs text-gray-500 mt-1">يحدد الشهر الذي سيبدأ فيه الخصم من الراتب</p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">عدد الأقساط (أشهر)</label>
                            <input
                                type="number"
                                min="1"
                                className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-100"
                                value={form.installments_count}
                                onChange={e => setForm({ ...form, installments_count: parseInt(e.target.value) })}
                            />
                        </div>
                    </div>

                    <div className="p-3 bg-orange-50 text-orange-800 rounded-lg text-sm border border-orange-100">
                        سيتم خصم: <span className="font-bold">{(parseFloat(form.amount || '0') / form.installments_count).toFixed(2)} {form.currency}</span> شهرياً.
                    </div>

                    <button onClick={handleSubmit} className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex justify-center items-center gap-2">
                        <Save size={18} />
                        <span>حفظ السلفة</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AdvanceRequest;
