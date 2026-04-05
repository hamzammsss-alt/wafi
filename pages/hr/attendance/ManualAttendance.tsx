
import React, { useState, useEffect } from 'react';
import { Calendar, Save, CheckCircle, XCircle, Clock } from 'lucide-react';

const ManualAttendance = () => {
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [employees, setEmployees] = useState<any[]>([]);
    const [attendance, setAttendance] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [shifts, setShifts] = useState<any[]>([]);

    useEffect(() => {
        loadData();
    }, [date]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [emps, daily, shiftData] = await Promise.all([
                window.electronAPI.hr.getEmployees(),
                window.electronAPI.hr.getDailyAttendance(date),
                window.electronAPI.hr.getShifts()
            ]);

            setEmployees(emps || []);
            setShifts(shiftData || []);

            // Merge employees with existing attendance or default
            const merged = (emps || []).map((emp: any) => {
                const existing = (daily || []).find((d: any) => d.employee_id === emp.id);
                return existing || {
                    employee_id: emp.id,
                    employee_name: `${emp.first_name} ${emp.last_name}`,
                    date: date,
                    check_in: '',
                    check_out: '',
                    status: 'PRESENT', // Default
                    shift_id: emp.contract?.default_shift_id || (shiftData?.[0]?.id)
                };
            });
            setAttendance(merged);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setLoading(true);
        try {
            // Convert to array of records expected by importAttendanceRaw
            // This effectively acts as "importing" manual data
            const records = attendance.map(a => ({
                EmployeeCode: employees.find(e => e.id === a.employee_id)?.employee_code,
                Date: date,
                CheckIn: a.check_in,
                CheckOut: a.check_out
            })).filter(a => a.CheckIn || a.CheckOut); // Only save meaningful records

            if (records.length === 0) {
                // Or we might want to save statuses directly? 
                // For now, let's use the processDayAttendance logic which relies on logs.
                // Ideally we should have a `saveDailyAttendance` bulk method.
                // But `processDayAttendance` re-calculates based on raw logs.
                // So we need to insert raw logs.
                await window.electronAPI.hr.importAttendance(records);
            }

            // Trigger processing
            await window.electronAPI.hr.processAttendance(date);

            alert('تم حفظ البيانات ومعالجة الحضور بنجاح');
            loadData(); // Reload to see calculated results (late, overtime)
        } catch (err: any) {
            alert('فشل الحفظ: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const updateRecord = (index: number, field: string, value: any) => {
        const newAtt = [...attendance];
        newAtt[index] = { ...newAtt[index], [field]: value };
        setAttendance(newAtt);
    };

    return (
        <div className="p-6 bg-gray-50 min-h-screen rtl" dir="rtl">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">تسجيل الحضور اليدوي</h1>
                    <p className="text-gray-500">تسجيل الدخول والخروج للموظفين لليوم المحدد</p>
                </div>
                <div className="flex gap-4 items-center">
                    <div className="flex items-center bg-white border rounded-lg px-3 py-2">
                        <Calendar className="w-5 h-5 text-gray-400 ml-2" />
                        <input
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className="outline-none text-gray-700"
                        />
                    </div>
                    <button
                        onClick={handleSave}
                        disabled={loading}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg flex items-center gap-2 shadow-sm"
                    >
                        <Save className="w-4 h-4" />
                        <span>حفظ ومعالجة</span>
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <table className="w-full text-right">
                    <thead className="bg-gray-50 border-b">
                        <tr>
                            <th className="px-6 py-4 font-semibold text-gray-700">الموظف</th>
                            <th className="px-6 py-4 font-semibold text-gray-700">الوردية</th>
                            <th className="px-6 py-4 font-semibold text-gray-700">الحالة</th>
                            <th className="px-6 py-4 font-semibold text-gray-700 w-32">دخول</th>
                            <th className="px-6 py-4 font-semibold text-gray-700 w-32">خروج</th>
                            <th className="px-6 py-4 font-semibold text-gray-700">التأخير/الإضافي</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {loading ? (
                            <tr><td colSpan={6} className="text-center py-10">جاري التحميل...</td></tr>
                        ) : attendance.map((record, idx) => (
                            <tr key={record.employee_id} className="hover:bg-gray-50">
                                <td className="px-6 py-4 font-medium text-gray-800">
                                    {record.employee_name || employees.find(e => e.id === record.employee_id)?.first_name}
                                </td>
                                <td className="px-6 py-4 text-gray-600">
                                    <select
                                        className="bg-transparent border-none outline-none w-full"
                                        value={record.shift_id}
                                        onChange={e => updateRecord(idx, 'shift_id', e.target.value)}
                                    >
                                        {shifts.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                    </select>
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`px-2 py-1 rounded text-xs font-bold ${record.status === 'PRESENT' ? 'bg-green-100 text-green-700' :
                                            record.status === 'ABSENT' ? 'bg-red-100 text-red-700' :
                                                record.status === 'LATE' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-700'
                                        }`}>
                                        {record.status === 'PRESENT' ? 'حاضر' :
                                            record.status === 'ABSENT' ? 'غائب' :
                                                record.status === 'LATE' ? 'تأخير' : record.status}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    <input
                                        type="time"
                                        className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:border-blue-500 outline-none"
                                        value={record.check_in || ''}
                                        onChange={e => updateRecord(idx, 'check_in', e.target.value)}
                                    />
                                </td>
                                <td className="px-6 py-4">
                                    <input
                                        type="time"
                                        className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:border-blue-500 outline-none"
                                        value={record.check_out || ''}
                                        onChange={e => updateRecord(idx, 'check_out', e.target.value)}
                                    />
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-500">
                                    {record.late_minutes > 0 && <span className="text-red-500 ml-2">تأخير: {record.late_minutes}د</span>}
                                    {record.overtime_hours > 0 && <span className="text-green-500">إضافي: {record.overtime_hours}س</span>}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default ManualAttendance;
