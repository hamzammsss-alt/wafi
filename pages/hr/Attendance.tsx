import React, { useState, useEffect } from 'react';
import { Save } from 'lucide-react';

const Attendance = () => {
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [records, setRecords] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        loadAttendance();
    }, [date]);

    const loadAttendance = async () => {
        setLoading(true);
        try {
            const data = await window.electronAPI.hr.getDailyAttendance(date);
            setRecords(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateRecord = (index: number, field: string, value: any) => {
        const updated = [...records];
        updated[index] = { ...updated[index], [field]: value };
        setRecords(updated);
    };

    const handleSave = async () => {
        try {
            await window.electronAPI.hr.saveDailyAttendance({ date, records });
            // Show success toast?
            console.log('Saved');
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <div className="p-6 space-y-6 bg-gray-50/50 min-h-screen" dir="rtl">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">سجل الدوام</h1>
                    <p className="text-gray-500">تسجيل الحضور والانصراف اليومي</p>
                </div>
                <div className="flex items-center gap-2">
                    <input
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="p-2 border rounded-md bg-white border-gray-300"
                    />
                    <button onClick={handleSave} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-md flex items-center gap-2 font-medium">
                        <Save className="h-4 w-4" />
                        حفظ التغييرات
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
                <table className="w-full text-right text-sm">
                    <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                            <th className="p-4 font-medium text-gray-600 w-[200px]">الموظف</th>
                            <th className="p-4 font-medium text-gray-600 w-[140px]">الحالة</th>
                            <th className="p-4 font-medium text-gray-600 w-[150px]">دخول</th>
                            <th className="p-4 font-medium text-gray-600 w-[150px]">خروج</th>
                            <th className="p-4 font-medium text-gray-600 w-[150px]">ساعات إضافي</th>
                            <th className="p-4 font-medium text-gray-600">ملاحظات</th>
                        </tr>
                    </thead>
                    <tbody>
                        {records.map((record, index) => (
                            <tr key={record.employee_id} className={`border-b border-gray-100 hover:bg-gray-50/50 ${record.status === 'ABSENT' ? 'bg-red-50/50' : ''}`}>
                                <td className="p-4">
                                    <div className="font-medium text-gray-900">{record.first_name} {record.last_name}</div>
                                    <div className="text-xs text-gray-400 font-mono">{record.employee_code}</div>
                                </td>
                                <td className="p-4">
                                    <select
                                        value={record.status}
                                        onChange={(e) => handleUpdateRecord(index, 'status', e.target.value)}
                                        className={`w-full p-1.5 rounded text-sm font-medium border-none ring-1 ring-inset ${record.status === 'PRESENT' ? 'bg-green-50 text-green-700 ring-green-600/20' :
                                            record.status === 'ABSENT' ? 'bg-red-50 text-red-700 ring-red-600/20' :
                                                'bg-gray-50 text-gray-600 ring-gray-500/10'
                                            }`}
                                    >
                                        <option value="PRESENT">حاضر</option>
                                        <option value="ABSENT">غائب</option>
                                        <option value="LEAVE">إجازة</option>
                                        <option value="HOLIDAY">عطلة</option>
                                    </select>
                                </td>
                                <td className="p-4">
                                    <input
                                        type="time"
                                        value={record.check_in || ''}
                                        onChange={(e) => handleUpdateRecord(index, 'check_in', e.target.value)}
                                        disabled={record.status === 'ABSENT'}
                                        className="w-full p-1.5 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:bg-gray-100"
                                    />
                                </td>
                                <td className="p-4">
                                    <input
                                        type="time"
                                        value={record.check_out || ''}
                                        onChange={(e) => handleUpdateRecord(index, 'check_out', e.target.value)}
                                        disabled={record.status === 'ABSENT'}
                                        className="w-full p-1.5 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:bg-gray-100"
                                    />
                                </td>
                                <td className="p-4">
                                    <input
                                        type="number"
                                        value={record.overtime_hours || 0}
                                        onChange={(e) => handleUpdateRecord(index, 'overtime_hours', parseFloat(e.target.value))}
                                        disabled={record.status === 'ABSENT'}
                                        className="w-24 p-1.5 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:bg-gray-100"
                                    />
                                </td>
                                <td className="p-4">
                                    <input
                                        value={record.notes || ''}
                                        onChange={(e) => handleUpdateRecord(index, 'notes', e.target.value)}
                                        placeholder="ملاحظات..."
                                        className="w-full p-1.5 border-b border-gray-300 bg-transparent focus:border-blue-500 outline-none text-sm placeholder:text-gray-400"
                                    />
                                </td>
                            </tr>
                        ))}
                        {records.length === 0 && !loading && (
                            <tr>
                                <td colSpan={6} className="text-center py-12 text-gray-500">
                                    لا يوجد موظفين نشطين
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default Attendance;
