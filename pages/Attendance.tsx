import React, { useState, useEffect } from 'react';
import { Calendar, Save, Clock } from 'lucide-react';

export const Attendance = () => {
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [rows, setRows] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        loadAttendance();
    }, [date]);

    const loadAttendance = async () => {
        // @ts-ignore
        if (window.electronAPI) {
            setLoading(true);
            try {
                // @ts-ignore
                const data = await window.electronAPI.getAttendance(date);
                // Map data to ensure default fields
                setRows(data.map((r: any) => ({
                    ...r,
                    status: r.status || 'Present',
                    check_in: r.check_in || '09:00',
                    check_out: r.check_out || '17:00'
                })));
            } catch (err) { console.error(err); }
            finally { setLoading(false); }
        }
    };

    const handleSave = async () => {
        try {
            setLoading(true);
            const dataToSave = rows.map(r => ({
                employee_id: r.employee_id || r.id, // Depending on if it came from employee join or attendance table
                date,
                status: r.status,
                check_in: r.check_in,
                check_out: r.check_out,
                overtime_hours: r.overtime_hours || 0,
                notes: r.notes || ''
            }));

            // @ts-ignore
            await window.electronAPI.saveAttendance(dataToSave);
            alert("تم حفظ سجل الدوام بنجاح");
        } catch (err: any) {
            alert("خطأ: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    const updateRow = (id: string, field: string, value: any) => {
        setRows(prev => prev.map(r => r.id === id || r.employee_id === id ? { ...r, [field]: value } : r));
    };

    return (
        <div className="flex flex-col h-full bg-slate-50 font-sans" dir="rtl">
            <div className="bg-white border-b p-4 flex justify-between items-center shadow-sm">
                <h1 className="text-xl font-bold flex items-center gap-2 text-slate-800">
                    <Clock className="text-orange-600" /> سجل الدوام اليومي
                </h1>

                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 bg-gray-100 p-1.5 rounded-lg border">
                        <Calendar size={16} className="text-gray-500" />
                        <input type="date" value={date} onChange={e => setDate(e.target.value)} className="bg-transparent font-bold text-gray-700 outline-none" />
                    </div>

                    <button
                        onClick={handleSave}
                        className="bg-orange-600 text-white px-6 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-orange-700 transition"
                    >
                        <Save size={18} /> حفظ التغييرات
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-auto p-6">
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-100 text-slate-600 font-bold border-b">
                            <tr>
                                <th className="p-4 text-right">الموظف</th>
                                <th className="p-4 text-center">الحالة</th>
                                <th className="p-4 text-center">وقت الدخول</th>
                                <th className="p-4 text-center">وقت الخروج</th>
                                <th className="p-4 text-center">ساعات إضافي</th>
                                <th className="p-4 text-right">ملاحظات</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {rows.map(row => (
                                <tr key={row.id || row.employee_id} className="hover:bg-slate-50">
                                    <td className="p-4">
                                        <div className="font-bold text-slate-800">{row.employee_name || row.name}</div>
                                        <div className="text-xs text-slate-500">{row.position}</div>
                                    </td>
                                    <td className="p-4 text-center">
                                        <select
                                            value={row.status}
                                            onChange={e => updateRow(row.id || row.employee_id, 'status', e.target.value)}
                                            className={`border rounded p-1.5 font-bold ${row.status === 'Present' ? 'text-green-600 bg-green-50 border-green-200' :
                                                    row.status === 'Absent' ? 'text-red-600 bg-red-50 border-red-200' :
                                                        'text-blue-600 bg-blue-50 border-blue-200'
                                                }`}
                                        >
                                            <option value="Present">حاضر</option>
                                            <option value="Absent">غائب</option>
                                            <option value="Leave">إجازة</option>
                                        </select>
                                    </td>
                                    <td className="p-4 text-center">
                                        <input type="time" value={row.check_in} onChange={e => updateRow(row.id || row.employee_id, 'check_in', e.target.value)} className="border rounded p-1 text-center w-24" />
                                    </td>
                                    <td className="p-4 text-center">
                                        <input type="time" value={row.check_out} onChange={e => updateRow(row.id || row.employee_id, 'check_out', e.target.value)} className="border rounded p-1 text-center w-24" />
                                    </td>
                                    <td className="p-4 text-center">
                                        <input type="number" step="0.5" value={row.overtime_hours} onChange={e => updateRow(row.id || row.employee_id, 'overtime_hours', Number(e.target.value))} className="border rounded p-1 text-center w-20 font-mono" />
                                    </td>
                                    <td className="p-4">
                                        <input type="text" value={row.notes} onChange={e => updateRow(row.id || row.employee_id, 'notes', e.target.value)} className="border rounded p-1 w-full" placeholder="ملاحظات..." />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {rows.length === 0 && !loading && <div className="p-8 text-center text-gray-400">لا يوجد موظفين نشطين</div>}
                </div>
            </div>
        </div>
    );
};
