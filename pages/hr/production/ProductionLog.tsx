
import React, { useState, useEffect } from 'react';
import { Save, Plus, Trash2, Calendar, ClipboardList } from 'lucide-react';

const ProductionLog = () => {
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [employees, setEmployees] = useState<any[]>([]);
    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    const [form, setForm] = useState({
        id: '',
        employee_id: '',
        production_date: date,
        item_name: '',
        quantity: 0,
        rate: 0,
        notes: ''
    });

    useEffect(() => {
        loadEmployees();
        loadLogs();
    }, [date]);

    const loadEmployees = async () => {
        const data = await window.electronAPI.hr.getEmployees();
        setEmployees(data || []);
    };

    const loadLogs = async () => {
        setLoading(true);
        try {
            const data = await window.electronAPI.production.getLogs(date);
            setLogs(data || []);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    const handleEmployeeChange = (empId: string) => {
        const emp = employees.find(e => e.id === empId);
        let defaultRate = 0;
        if (emp && emp.contract?.piece_rate_default) {
            defaultRate = emp.contract.piece_rate_default;
        }
        setForm({ ...form, employee_id: empId, rate: defaultRate });
    };

    const handleSave = async () => {
        if (!form.employee_id || !form.item_name || form.quantity <= 0) {
            alert('يرجى تعبئة الحقول المطلوبة (الموظف، الصنف، الكمية)');
            return;
        }

        try {
            await window.electronAPI.production.saveLog({
                ...form,
                production_date: date
            });
            resetForm();
            loadLogs();
        } catch (err: any) {
            alert('حدث خطأ: ' + err.message);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('هل أنت متأكد من الحذف؟')) return;
        await window.electronAPI.production.deleteLog(id);
        loadLogs();
    };

    const resetForm = () => {
        setForm({
            id: '',
            employee_id: '',
            production_date: date,
            item_name: '',
            quantity: 0,
            rate: 0,
            notes: ''
        });
    };

    return (
        <div className="p-6 bg-gray-50 min-h-screen rtl text-right" dir="rtl">
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg text-blue-600"><ClipboardList size={24} /></div>
                    <h1 className="text-2xl font-bold text-gray-800">سجل الإنتاج اليومي</h1>
                </div>

                <div className="flex items-center gap-2 bg-white p-2 rounded-lg border shadow-sm">
                    <Calendar size={18} className="text-gray-500" />
                    <input
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="bg-transparent outline-none font-medium"
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Input Form */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-fit sticky top-6">
                    <h3 className="font-bold text-lg mb-4 text-gray-800">إضافة بند إنتاج</h3>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">الموظف</label>
                            <select
                                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-100 outline-none"
                                value={form.employee_id}
                                onChange={(e) => handleEmployeeChange(e.target.value)}
                            >
                                <option value="">اختر الموظف...</option>
                                {employees.map(e => <option key={e.id} value={e.id}>{e.first_name} {e.last_name} ({e.employee_code})</option>)}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">نوع العمل / القطعة</label>
                            <input
                                type="text"
                                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-100 outline-none"
                                placeholder="مثال: خياطة بنطلون، قص..."
                                value={form.item_name}
                                onChange={e => setForm({ ...form, item_name: e.target.value })}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">العدد المنجز</label>
                                <input
                                    type="number"
                                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-100 outline-none"
                                    value={form.quantity}
                                    onChange={e => setForm({ ...form, quantity: parseFloat(e.target.value) })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">سعر الوحدة</label>
                                <input
                                    type="number"
                                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-100 outline-none"
                                    value={form.rate}
                                    onChange={e => setForm({ ...form, rate: parseFloat(e.target.value) })}
                                />
                            </div>
                        </div>

                        <div className="p-3 bg-blue-50 rounded-lg flex justify-between items-center text-blue-800 font-bold border border-blue-100">
                            <span>الإجمالي المستحق:</span>
                            <span>{(form.quantity * form.rate).toLocaleString()}</span>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">ملاحظات</label>
                            <textarea
                                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-100 outline-none"
                                rows={2}
                                value={form.notes}
                                onChange={e => setForm({ ...form, notes: e.target.value })}
                            />
                        </div>

                        <button
                            onClick={handleSave}
                            className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex justify-center items-center gap-2 font-medium"
                        >
                            <Plus size={18} />
                            <span>تسجيل العملية</span>
                        </button>
                    </div>
                </div>

                {/* Table */}
                <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-right">
                            <thead className="bg-gray-50 text-gray-600 font-medium">
                                <tr>
                                    <th className="p-4">الموظف</th>
                                    <th className="p-4">العمل / القطعة</th>
                                    <th className="p-4">العدد</th>
                                    <th className="p-4">السعر</th>
                                    <th className="p-4">الإجمالي</th>
                                    <th className="p-4">ملاحظات</th>
                                    <th className="p-4 text-center">إجراء</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {logs.length === 0 ? (
                                    <tr><td colSpan={7} className="p-8 text-center text-gray-400">لا توجد سجلات لهذا اليوم</td></tr>
                                ) : (
                                    logs.map(log => (
                                        <tr key={log.id} className="hover:bg-gray-50">
                                            <td className="p-4 font-medium text-gray-800">{log.employee_name}</td>
                                            <td className="p-4 text-gray-600">{log.item_name}</td>
                                            <td className="p-4 text-gray-800 font-bold">{log.quantity}</td>
                                            <td className="p-4 text-gray-600">{log.rate}</td>
                                            <td className="p-4 text-green-600 font-bold">{(log.quantity * log.rate).toLocaleString()}</td>
                                            <td className="p-4 text-gray-500 text-xs truncate max-w-[150px]">{log.notes || '-'}</td>
                                            <td className="p-4 text-center">
                                                <button
                                                    onClick={() => handleDelete(log.id)}
                                                    className="p-1 text-red-500 hover:bg-red-50 rounded-full"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                            {logs.length > 0 && (
                                <tfoot className="bg-gray-50 font-bold text-gray-800">
                                    <tr>
                                        <td colSpan={4} className="p-4 text-left pl-10">المجموع الكلي:</td>
                                        <td className="p-4 text-green-700">{logs.reduce((sum, l) => sum + (l.quantity * l.rate), 0).toLocaleString()}</td>
                                        <td colSpan={2}></td>
                                    </tr>
                                </tfoot>
                            )}
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProductionLog;
