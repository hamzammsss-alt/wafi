
import React, { useState, useEffect } from 'react';
import { Calendar, Save, Clock, CheckCircle, XCircle } from 'lucide-react';

const LeaveRequest = () => {
    const [employees, setEmployees] = useState<any[]>([]);
    const [leaveTypes, setLeaveTypes] = useState<any[]>([]);
    const [requests, setRequests] = useState<any[]>([]);
    const [balances, setBalances] = useState<any[]>([]);
    const [form, setForm] = useState({
        employee_id: '',
        leave_type_id: '',
        start_date: '',
        end_date: '',
        reason: ''
    });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [emps, types] = await Promise.all([
                window.electronAPI.hr.getEmployees(),
                window.electronAPI.hr.getLeaveTypes()
            ]);
            setEmployees(emps || []);
            setLeaveTypes(types || []);
            loadRequests();
        } catch (err) { console.error(err); }
    };

    const loadRequests = async (empId: string = '') => {
        try {
            const data = await window.electronAPI.hr.getLeaveRequests(empId ? { employee_id: empId } : {});
            setRequests(data || []);
        } catch (err) { console.error(err); }
    };

    const loadBalances = async (empId: string) => {
        if (!empId) return;
        try {
            const year = new Date().getFullYear();
            const data = await window.electronAPI.hr.getEmployeeBalances(empId, year);
            setBalances(data || []);
        } catch (err) { console.error(err); }
    };

    const handleEmployeeChange = (id: string) => {
        setForm({ ...form, employee_id: id });
        loadBalances(id);
    };

    const handleSubmit = async () => {
        if (!form.employee_id || !form.leave_type_id || !form.start_date || !form.end_date) {
            alert('يرجى تعبئة جميع الحقول المطلوبة');
            return;
        }
        try {
            await window.electronAPI.hr.saveLeaveRequest(form);
            alert('تم تقديم الطلب بنجاح');
            setForm({ ...form, start_date: '', end_date: '', reason: '' });
            loadRequests();
            loadBalances(form.employee_id);
        } catch (err: any) { alert('خطأ: ' + err.message); }
    };

    const handleStatusUpdate = async (id: string, status: string) => {
        if (!confirm('هل أنت متأكد؟')) return;
        try {
            await window.electronAPI.hr.updateLeaveStatus(id, status, '');
            loadRequests(form.employee_id); // Reload filtered or all
            if (form.employee_id) loadBalances(form.employee_id);
        } catch (err: any) { alert('خطأ: ' + err.message); }
    };

    return (
        <div className="p-6 bg-gray-50 min-h-screen rtl text-right" dir="rtl">
            <h1 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                <Calendar className="text-blue-600" />
                إدارة الإجازات والطلبات
            </h1>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Form & Balances */}
                <div className="space-y-6">
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                        <h3 className="font-bold text-lg mb-4 text-gray-800">تقديم طلب إجازة</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">الموظف</label>
                                <select
                                    className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-100"
                                    value={form.employee_id}
                                    onChange={e => handleEmployeeChange(e.target.value)}
                                >
                                    <option value="">اختر الموظف...</option>
                                    {employees.map(e => <option key={e.id} value={e.id}>{e.first_name} {e.last_name}</option>)}
                                </select>
                            </div>

                            {form.employee_id && balances.length > 0 && (
                                <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 text-sm">
                                    <h4 className="font-bold text-blue-800 mb-2">رصيد الإجازات (أيام):</h4>
                                    <div className="space-y-1">
                                        {balances.map(b => (
                                            <div key={b.type_id} className="flex justify-between">
                                                <span>{b.type_name}</span>
                                                <span className={b.remaining < 0 ? 'text-red-600 font-bold' : 'text-green-700 font-bold'}>
                                                    {b.remaining} / {b.total_allowed}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">نوع الإجازة</label>
                                <select
                                    className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-100"
                                    value={form.leave_type_id}
                                    onChange={e => setForm({ ...form, leave_type_id: e.target.value })}
                                >
                                    <option value="">اختر النوع...</option>
                                    {leaveTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">من تاريخ</label>
                                    <input
                                        type="date"
                                        className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-100"
                                        value={form.start_date}
                                        onChange={e => setForm({ ...form, start_date: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">إلى تاريخ</label>
                                    <input
                                        type="date"
                                        className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-100"
                                        value={form.end_date}
                                        onChange={e => setForm({ ...form, end_date: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">السبب</label>
                                <textarea
                                    className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-100"
                                    rows={3}
                                    value={form.reason}
                                    onChange={e => setForm({ ...form, reason: e.target.value })}
                                />
                            </div>

                            <button onClick={handleSubmit} className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex justify-center items-center gap-2">
                                <Save size={18} />
                                <span>حفظ الطلب</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* History List */}
                <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
                        <h3 className="font-bold text-gray-800">سجل الطلبات</h3>
                        <button onClick={() => loadRequests()} className="text-sm text-blue-600 hover:underline">عرض الكل ({requests.length})</button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-right">
                            <thead className="bg-gray-50 text-gray-600 font-medium">
                                <tr>
                                    <th className="p-4">الموظف</th>
                                    <th className="p-4">النوع</th>
                                    <th className="p-4">الفترة</th>
                                    <th className="p-4">الأيام</th>
                                    <th className="p-4">الحالة</th>
                                    <th className="p-4 text-center">إجراء</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {requests.map(req => (
                                    <tr key={req.id} className="hover:bg-gray-50">
                                        <td className="p-4 font-medium text-gray-800">
                                            {req.employee_name}
                                            <div className="text-xs text-gray-500">{req.submission_date}</div>
                                        </td>
                                        <td className="p-4">{req.leave_type_name}</td>
                                        <td className="p-4 text-gray-600 text-xs">
                                            {req.start_date} <br /> {req.end_date}
                                        </td>
                                        <td className="p-4 font-bold">{req.days_count}</td>
                                        <td className="p-4">
                                            <span className={`px-2 py-1 rounded text-xs inline-flex items-center gap-1
                                                ${req.status === 'APPROVED' ? 'bg-green-100 text-green-700' :
                                                    req.status === 'REJECTED' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                                {req.status === 'APPROVED' && <CheckCircle size={12} />}
                                                {req.status === 'REJECTED' && <XCircle size={12} />}
                                                {req.status === 'PENDING' && <Clock size={12} />}
                                                {req.status}
                                            </span>
                                        </td>
                                        <td className="p-4 text-center">
                                            {req.status === 'PENDING' && (
                                                <div className="flex justify-center gap-2">
                                                    <button onClick={() => handleStatusUpdate(req.id, 'APPROVED')} className="p-1 text-green-600 hover:bg-green-50 rounded" title="قبول">
                                                        <CheckCircle size={18} />
                                                    </button>
                                                    <button onClick={() => handleStatusUpdate(req.id, 'REJECTED')} className="p-1 text-red-600 hover:bg-red-50 rounded" title="رفض">
                                                        <XCircle size={18} />
                                                    </button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                                {requests.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-gray-400">لا توجد طلبات</td></tr>}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LeaveRequest;
