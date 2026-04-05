import React, { useState, useEffect } from 'react';
import { Calendar, CheckCircle, XCircle, Clock, Plus, Settings, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const LeaveManagement = () => {
    const [activeTab, setActiveTab] = useState('requests'); // requests, balances, settings
    const [requests, setRequests] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (activeTab === 'requests') loadRequests();
    }, [activeTab]);

    const loadRequests = async () => {
        setLoading(true);
        try {
            const data = await window.electronAPI.hr.getLeaveRequests({});
            setRequests(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6 bg-gray-50 h-full flex flex-col gap-6 rtl" dir="rtl">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold flex items-center gap-2 text-gray-800"><Calendar className="text-orange-600" /> إدارة الإجازات والمغادرات</h1>
                {activeTab === 'requests' && (
                    <button onClick={() => window.dispatchEvent(new CustomEvent('open-leave-modal'))} className="bg-orange-600 text-white px-4 py-2 rounded-lg font-bold shadow-sm hover:bg-orange-700 flex items-center gap-2">
                        <Plus size={18} /> طلب إجازة جديد
                    </button>
                )}
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-200 mb-4">
                <button
                    onClick={() => setActiveTab('requests')}
                    className={`px-6 py-3 font-medium transition-colors border-b-2 ${activeTab === 'requests' ? 'border-orange-600 text-orange-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                >
                    طلبات الإجازة
                </button>
                <button
                    onClick={() => setActiveTab('balances')}
                    className={`px-6 py-3 font-medium transition-colors border-b-2 ${activeTab === 'balances' ? 'border-orange-600 text-orange-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                >
                    أرصدة الموظفين
                </button>
                <button
                    onClick={() => setActiveTab('settings')}
                    className={`px-6 py-3 font-medium transition-colors border-b-2 ${activeTab === 'settings' ? 'border-orange-600 text-orange-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                >
                    إعدادات الإجازات
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto">
                {activeTab === 'requests' && <RequestsList requests={requests} loading={loading} onRefresh={loadRequests} />}
                {activeTab === 'balances' && <BalancesView />}
                {activeTab === 'settings' && <LeaveSettings />}
            </div>

            <NewLeaveModal onSuccess={loadRequests} />
        </div>
    );
};

const RequestsList = ({ requests, loading, onRefresh }: any) => {
    const handleAction = async (id: string, status: string) => {
        if (!confirm('هل أنت متأكد من تغيير حالة الطلب؟')) return;
        try {
            await window.electronAPI.hr.updateLeaveStatus(id, status);
            onRefresh();
        } catch (error) {
            alert('Error: ' + error);
        }
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <table className="w-full text-right">
                <thead className="bg-gray-100 text-sm font-bold text-gray-600">
                    <tr>
                        <th className="p-4">الموظف</th>
                        <th className="p-4">نوع الطلب</th>
                        <th className="p-4">من تاريخ</th>
                        <th className="p-4">إلى تاريخ</th>
                        <th className="p-4">المدة</th>
                        <th className="p-4">السبب</th>
                        <th className="p-4">الحالة</th>
                        <th className="p-4">إجراء</th>
                    </tr>
                </thead>
                <tbody className="divide-y">
                    {loading ? (
                        <tr><td colSpan={8} className="p-8 text-center text-gray-400">جاري التحميل...</td></tr>
                    ) : requests.length === 0 ? (
                        <tr><td colSpan={8} className="p-8 text-center text-gray-400">لا توجد طلبات إجازة</td></tr>
                    ) : requests.map((req: any) => (
                        <tr key={req.id} className="hover:bg-gray-50">
                            <td className="p-4">
                                <div className="font-bold text-gray-800">{req.employee_name}</div>
                                <div className="text-xs text-gray-400">{req.employee_code}</div>
                            </td>
                            <td className="p-4">{req.leave_type_name}</td>
                            <td className="p-4 font-mono text-gray-600">{req.start_date}</td>
                            <td className="p-4 font-mono text-gray-600">{req.end_date}</td>
                            <td className="p-4 font-bold">{req.days_count} يوم</td>
                            <td className="p-4 text-sm text-gray-500 max-w-xs truncate">{req.reason}</td>
                            <td className="p-4">
                                <StatusBadge status={req.status} />
                            </td>
                            <td className="p-4 flex gap-2">
                                {req.status === 'PENDING' && (
                                    <>
                                        <button onClick={() => handleAction(req.id, 'APPROVED')} className="text-green-600 hover:bg-green-50 p-1 rounded transition-colors" title="قبول"><CheckCircle size={20} /></button>
                                        <button onClick={() => handleAction(req.id, 'REJECTED')} className="text-red-500 hover:bg-red-50 p-1 rounded transition-colors" title="رفض"><XCircle size={20} /></button>
                                    </>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

const BalancesView = () => {
    const [employees, setEmployees] = useState<any[]>([]);
    const [balances, setBalances] = useState<any[]>([]);
    const [selectedEmp, setSelectedEmp] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        loadEmployees();
    }, []);

    useEffect(() => {
        if (selectedEmp) loadBalances(selectedEmp);
    }, [selectedEmp]);

    const loadEmployees = async () => {
        const data = await window.electronAPI.hr.getEmployees();
        setEmployees(data);
        if (data.length > 0) setSelectedEmp(data[0].id);
    };

    const loadBalances = async (empId: string) => {
        setLoading(true);
        try {
            const data = await window.electronAPI.hr.getLeaveBalances(empId, new Date().getFullYear());
            setBalances(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col md:flex-row gap-6 h-full">
            <div className="w-full md:w-1/4 bg-white p-4 rounded-xl border h-full overflow-y-auto">
                <h3 className="font-bold text-gray-700 mb-4 border-b pb-2">الموظفين</h3>
                <div className="space-y-2">
                    {employees.map(emp => (
                        <button
                            key={emp.id}
                            onClick={() => setSelectedEmp(emp.id)}
                            className={`w-full text-right p-3 rounded-lg flex items-center gap-3 transition-colors ${selectedEmp === emp.id ? 'bg-orange-50 border border-orange-200' : 'hover:bg-gray-50 border border-transparent'}`}
                        >
                            <div className="bg-gray-200 rounded-full w-8 h-8 flex items-center justify-center text-gray-500"><User size={16} /></div>
                            <div>
                                <div className="font-bold text-gray-800 text-sm">{emp.first_name} {emp.last_name}</div>
                                <div className="text-xs text-gray-400">{emp.employee_code}</div>
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex-1 bg-white p-6 rounded-xl border">
                <h3 className="font-bold text-gray-800 mb-6 flex items-center gap-2">
                    <CheckCircle className="text-green-600" size={20} /> أرصدة الإجازات {new Date().getFullYear()}
                </h3>

                {loading ? <div className="text-center py-10">جاري التحميل...</div> : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {balances.map((bal: any) => (
                            <div key={bal.type_id} className="p-4 border rounded-xl shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
                                <div className="absolute top-0 right-0 w-1 h-full bg-blue-500"></div>
                                <h4 className="font-bold text-gray-600 mb-2">{bal.type_name}</h4>
                                <div className="flex justify-between items-end">
                                    <div className="text-3xl font-bold text-gray-800">{bal.remaining}</div>
                                    <div className="text-xs text-gray-400 mb-1">المتبقي من {bal.total_allowed}</div>
                                </div>
                                <div className="mt-3 w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                                    <div className="bg-blue-500 h-full rounded-full" style={{ width: `${(bal.used / bal.total_allowed) * 100}%` }}></div>
                                </div>
                                <div className="text-[10px] text-gray-400 mt-1 text-left">تم استخدام {bal.used} يوم</div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

const LeaveSettings = () => {
    const [types, setTypes] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [editing, setEditing] = useState<any>(null);

    useEffect(() => {
        loadTypes();
    }, []);

    const loadTypes = async () => {
        setLoading(true);
        const data = await window.electronAPI.hr.getLeaveTypes();
        setTypes(data);
        setLoading(false);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await window.electronAPI.hr.saveLeaveType(editing);
            setEditing(null);
            loadTypes();
        } catch (error) {
            alert('Error: ' + error);
        }
    };

    return (
        <div className="bg-white p-6 rounded-xl border h-full overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-gray-800">أنواع الإجازات والقواعد</h3>
                <button onClick={() => setEditing({ name: '', days_per_year: 14, is_paid: 1, carry_forward: 0 })} className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm flex items-center hover:bg-blue-700">
                    <Plus size={16} className="ml-1" /> إضافة نوع جديد
                </button>
            </div>

            {editing && (
                <form onSubmit={handleSave} className="bg-gray-50 p-4 rounded-lg border mb-6 animate-in fade-in">
                    <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">اسم الإجازة</label>
                            <input required className="w-full border p-2 rounded" value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} placeholder="إجازة سنوية" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">الرصيد السنوي (يوم)</label>
                            <input required type="number" className="w-full border p-2 rounded" value={editing.days_per_year} onChange={e => setEditing({ ...editing, days_per_year: +e.target.value })} />
                        </div>
                    </div>
                    <div className="flex gap-4 mb-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" checked={editing.is_paid === 1} onChange={e => setEditing({ ...editing, is_paid: e.target.checked ? 1 : 0 })} />
                            <span className="text-sm">مدفوعة الأجر</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" checked={editing.carry_forward === 1} onChange={e => setEditing({ ...editing, carry_forward: e.target.checked ? 1 : 0 })} />
                            <span className="text-sm">ترحيل الرصيد</span>
                        </label>
                    </div>
                    <div className="flex justify-end gap-2">
                        <button type="button" onClick={() => setEditing(null)} className="px-3 py-1.5 text-gray-600">إلغاء</button>
                        <button type="submit" className="bg-blue-600 text-white px-4 py-1.5 rounded hover:bg-blue-700">حفظ</button>
                    </div>
                </form>
            )}

            <div className="space-y-2">
                {types.map(t => (
                    <div key={t.id} className="flex justify-between items-center p-3 border rounded-lg hover:bg-gray-50">
                        <div>
                            <div className="font-bold text-gray-800">{t.name}</div>
                            <div className="text-xs text-gray-500">
                                {t.days_per_year} يوم {t.is_paid ? '(مدفوعة)' : '(غير مدفوعة)'}
                            </div>
                        </div>
                        <button onClick={() => setEditing(t)} className="text-blue-600 text-sm hover:underline">تعديل</button>
                    </div>
                ))}
            </div>
        </div>
    );
};

const NewLeaveModal = ({ onSuccess }: any) => {
    const [open, setOpen] = useState(false);
    const [employees, setEmployees] = useState<any[]>([]);
    const [types, setTypes] = useState<any[]>([]);
    const [form, setForm] = useState<any>({
        employee_id: '',
        leave_type_id: '',
        start_date: new Date().toISOString().split('T')[0],
        end_date: new Date().toISOString().split('T')[0],
        reason: ''
    });

    useEffect(() => {
        const handler = () => setOpen(true);
        window.addEventListener('open-leave-modal', handler);
        return () => window.removeEventListener('open-leave-modal', handler);
    }, []);

    useEffect(() => {
        if (open) loadData();
    }, [open]);

    const loadData = async () => {
        const emps = await window.electronAPI.hr.getEmployees();
        const typs = await window.electronAPI.hr.getLeaveTypes();
        setEmployees(emps);
        setTypes(typs);
        if (emps.length > 0) setForm((prev: any) => ({ ...prev, employee_id: emps[0].id }));
        if (typs.length > 0) setForm((prev: any) => ({ ...prev, leave_type_id: typs[0].id }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await window.electronAPI.hr.saveLeaveRequest(form);
            setOpen(false);
            onSuccess();
        } catch (error) {
            alert('Error: ' + error);
        }
    };

    if (!open) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-lg w-full max-w-lg p-6">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-gray-800">طلب إجازة جديد</h3>
                    <button onClick={() => setOpen(false)}><XCircle className="text-gray-400 hover:text-red-500" /></button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">الموظف</label>
                        <select className="w-full border p-2 rounded-lg" value={form.employee_id} onChange={e => setForm({ ...form, employee_id: e.target.value })}>
                            {employees.map(e => (
                                <option key={e.id} value={e.id}>{e.first_name} {e.last_name}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">نوع الإجازة</label>
                        <select className="w-full border p-2 rounded-lg" value={form.leave_type_id} onChange={e => setForm({ ...form, leave_type_id: e.target.value })}>
                            {types.map(t => (
                                <option key={t.id} value={t.id}>{t.name} ({t.days_per_year} يوم)</option>
                            ))}
                        </select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">من تاريخ</label>
                            <input type="date" required className="w-full border p-2 rounded-lg" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">إلى تاريخ</label>
                            <input type="date" required className="w-full border p-2 rounded-lg" value={form.end_date} onChange={e => setForm({ ...form, end_date: e.target.value })} />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">سبب الإجازة / ملاحظات</label>
                        <textarea className="w-full border p-2 rounded-lg" rows={3} value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })}></textarea>
                    </div>

                    <div className="flex justify-end gap-2 pt-4 border-t">
                        <button type="button" onClick={() => setOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">إلغاء</button>
                        <button type="submit" className="bg-orange-600 text-white px-6 py-2 rounded-lg hover:bg-orange-700 shadow flex items-center">
                            <Plus size={18} className="ml-2" /> إرسال الطلب
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const StatusBadge = ({ status }: { status: string }) => {
    const styles: any = {
        'APPROVED': 'bg-green-100 text-green-700',
        'REJECTED': 'bg-red-100 text-red-700',
        'PENDING': 'bg-yellow-100 text-yellow-700',
    };
    const labels: any = {
        'APPROVED': 'مقبول',
        'REJECTED': 'مرفوض',
        'PENDING': 'قيد الانتظار',
    };
    return (
        <span className={`px-2 py-1 rounded text-xs font-bold ${styles[status]}`}>
            {labels[status] || status}
        </span>
    );
};

