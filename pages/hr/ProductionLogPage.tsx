import React, { useState, useEffect } from 'react';
import { useTabs } from '../../src/contexts/TabsContext';
import { Calendar, Save, Trash2, Plus, Search, CheckCircle, RefreshCw, XCircle } from 'lucide-react';

const ProductionLogPage = () => {
    const [employees, setEmployees] = useState<any[]>([]);
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    // New Entry Form
    const [selectedEmp, setSelectedEmp] = useState('');
    const [item, setItem] = useState('');
    const [qty, setQty] = useState(0);
    const [rate, setRate] = useState(0);

    // Initial Load
    useEffect(() => {
        loadEmployees();
    }, []);

    // Load logs when date changes
    useEffect(() => {
        loadLogs();
    }, [selectedDate]);

    const loadEmployees = async () => {
        try {
            const emps = await window.electronAPI.getEmployees();
            setEmployees(emps || []);
        } catch (error) {
            console.error("Failed to load employees", error);
        }
    };

    const loadLogs = async () => {
        setLoading(true);
        try {
            const data = await window.electronAPI.production.getLogs(selectedDate);
            setLogs(data || []);
        } catch (error) {
            console.error("Failed to load logs", error);
        } finally {
            setLoading(false);
        }
    };

    const handleAdd = async () => {
        if (!selectedEmp || !item || qty <= 0) return alert('يرجى تعبئة كافة الحقول بشكل صحيح');

        setSaving(true);
        try {
            // Check if backend service is available
            if (!window.electronAPI.production?.saveLog) {
                alert("عذراً، خدمة حفظ الإنتاج غير متوفرة بعد في النسخة الحالية.");
                setSaving(false);
                return;
            }

            const logData = {
                employee_id: selectedEmp,
                production_date: selectedDate,
                item_name: item,
                quantity: qty,
                rate: rate,
                notes: ''
            };

            const result = await window.electronAPI.production.saveLog(logData);
            if (result && result.success) {
                // Reload logs to get the fresh list with ID and calculations
                await loadLogs();
                // Reset form fields except potentially the employee to allow rapid entry for same person
                setItem('');
                setQty(0);
                // setRate(0); // Keep rate if they are doing similar items? Maybe reset is safer.
            }
        } catch (error) {
            console.error("Failed to save log", error);
            alert("حدث خطأ أثناء الحفظ");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('هل أنت متأكد من حذف هذا السجل؟')) return;

        try {
            await window.electronAPI.production.deleteLog(id);
            // Optimistic update or reload
            setLogs(logs.filter(l => l.id !== id));
        } catch (error) {
            console.error("Failed to delete log", error);
            alert("حدث خطأ أثناء الحذف");
        }
    };

    // Auto-fill rate logic could be added here if we had item rate master data
    // For now purely manual entry based on user request "Production Log (Piece)"

    return (
        <div className="p-6 bg-slate-50 min-h-screen rtl" dir="rtl">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">سجل الإنتاج اليومي</h1>
                    <p className="text-slate-500">تسجيل ما أنجزه الموظفين (نظام القطعة)</p>
                </div>
                <div className="flex items-center gap-3 bg-white p-2 rounded-xl shadow-sm border border-slate-200">
                    <Calendar size={18} className="text-slate-400" />
                    <input
                        type="date"
                        value={selectedDate}
                        onChange={e => setSelectedDate(e.target.value)}
                        className="border-none outline-none text-slate-700 font-medium bg-transparent"
                    />
                    <button
                        onClick={loadLogs}
                        disabled={loading}
                        className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 transition-colors"
                    >
                        <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

            {/* Entry Form */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 mb-6 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500"></div>
                <h3 className="font-bold text-slate-800 mb-5 flex items-center gap-2">
                    <div className="p-1.5 bg-emerald-100 rounded-lg">
                        <Plus size={18} className="text-emerald-600" />
                    </div>
                    إضافة إنجاز جديد
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                    <div className="md:col-span-4">
                        <label className="block text-xs font-bold text-slate-500 mb-1.5">الموظف</label>
                        <select
                            value={selectedEmp}
                            onChange={e => setSelectedEmp(e.target.value)}
                            className="w-full p-2.5 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-100 focus:border-emerald-500 outline-none transition-all text-sm"
                        >
                            <option value="">- اختر الموظف -</option>
                            {employees.map(e => (
                                <option key={e.id} value={e.id}>{e.full_name} ({e.employee_code})</option>
                            ))}
                        </select>
                    </div>

                    <div className="md:col-span-3">
                        <label className="block text-xs font-bold text-slate-500 mb-1.5">العمل / القطعة</label>
                        <input
                            type="text"
                            placeholder="مثال: خياطة قميص"
                            value={item}
                            onChange={e => setItem(e.target.value)}
                            className="w-full p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-100 focus:border-emerald-500 outline-none transition-all text-sm"
                        />
                    </div>

                    <div className="md:col-span-2">
                        <label className="block text-xs font-bold text-slate-500 mb-1.5">العدد</label>
                        <input
                            type="number"
                            min="1"
                            value={qty || ''}
                            onChange={e => setQty(Number(e.target.value))}
                            className="w-full p-2.5 border border-slate-200 rounded-xl text-center font-bold focus:ring-2 focus:ring-emerald-100 focus:border-emerald-500 outline-none transition-all text-sm"
                        />
                    </div>

                    <div className="md:col-span-2">
                        <label className="block text-xs font-bold text-slate-500 mb-1.5">سعر الوحدة</label>
                        <input
                            type="number"
                            min="0"
                            step="0.1"
                            value={rate || ''}
                            onChange={e => setRate(Number(e.target.value))}
                            className="w-full p-2.5 border border-slate-200 rounded-xl text-center focus:ring-2 focus:ring-emerald-100 focus:border-emerald-500 outline-none transition-all text-sm"
                        />
                    </div>

                    <div className="md:col-span-1">
                        <button
                            onClick={handleAdd}
                            disabled={saving}
                            className="w-full bg-emerald-600 text-white p-2.5 rounded-xl hover:bg-emerald-700 active:scale-95 transition-all shadow-sm shadow-emerald-200 disabled:opacity-50 flex justify-center items-center h-[42px]"
                        >
                            {saving ? <RefreshCw size={18} className="animate-spin" /> : <Plus size={20} />}
                        </button>
                    </div>
                </div>
            </div>

            {/* Logs Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-right">
                        <thead className="bg-slate-50 border-b border-slate-100">
                            <tr>
                                <th className="p-4 text-xs font-bold text-slate-500 w-1/4">الموظف</th>
                                <th className="p-4 text-xs font-bold text-slate-500 w-1/4">العمل المنجز</th>
                                <th className="p-4 text-xs font-bold text-slate-500 text-center w-32">العدد</th>
                                <th className="p-4 text-xs font-bold text-slate-500 text-center w-32">السعر</th>
                                <th className="p-4 text-xs font-bold text-slate-500 text-center w-32">الإجمالي</th>
                                <th className="p-4 text-xs font-bold text-slate-500 w-20"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="p-12 text-center text-slate-400">
                                        <div className="flex flex-col items-center gap-2">
                                            <RefreshCw size={24} className="animate-spin text-emerald-500" />
                                            <span>جاري تحميل السجلات...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : logs.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="p-12 text-center text-slate-400">
                                        <div className="flex flex-col items-center gap-2 opacity-60">
                                            <div className="p-3 bg-slate-100 rounded-full">
                                                <Search size={24} />
                                            </div>
                                            <p>لا يوجد سجلات إنتاج لهذا اليوم</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                logs.map((log) => (
                                    <tr key={log.id} className="hover:bg-slate-50/80 transition-colors group">
                                        <td className="p-4">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-slate-700 text-sm">{log.employee_name}</span>
                                                <span className="text-[10px] text-slate-400 font-mono">{log.employee_code}</span>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <div className="text-sm text-slate-600 font-medium">{log.item_name}</div>
                                        </td>
                                        <td className="p-4 text-center">
                                            <span className="inline-block px-2 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-lg border border-emerald-100">
                                                {log.quantity}
                                            </span>
                                        </td>
                                        <td className="p-4 text-center text-sm text-slate-500 font-mono">
                                            {Number(log.rate).toFixed(2)}
                                        </td>
                                        <td className="p-4 text-center">
                                            <span className="font-bold text-slate-800 text-sm">
                                                {(log.quantity * log.rate).toFixed(2)}
                                            </span>
                                            <span className="text-[10px] text-slate-400 mr-1">شيكل</span>
                                        </td>
                                        <td className="p-4 text-center">
                                            <button
                                                onClick={() => handleDelete(log.id)}
                                                className="text-slate-300 hover:text-red-500 w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100"
                                                title="حذف السجل"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                        {logs.length > 0 && (
                            <tfoot className="bg-slate-50 border-t border-slate-200">
                                <tr>
                                    <td colSpan={4} className="p-4 text-left pl-8 text-sm font-bold text-slate-600">
                                        الإجمالي الكلي لليوم:
                                    </td>
                                    <td className="p-4 text-center">
                                        <span className="text-lg font-bold text-emerald-600 font-mono">
                                            {logs.reduce((sum, l) => sum + (l.quantity * l.rate), 0).toFixed(2)}
                                        </span>
                                    </td>
                                    <td></td>
                                </tr>
                            </tfoot>
                        )}
                    </table>
                </div>
            </div>
        </div>
    );
};

export { ProductionLogPage };
