import React, { useState, useEffect } from 'react';
import { Clock, Plus, Save, Trash, Edit, X, Check } from 'lucide-react';

const ShiftManagementPage = () => {
    const [shifts, setShifts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState<any>(null); // null, 'new', or object

    useEffect(() => {
        loadShifts();
    }, []);

    const loadShifts = async () => {
        setLoading(true);
        try {
            const data = await window.electronAPI.hr.getShifts();
            // Parse weekend_days from JSON string if generic
            const parsed = data.map((s: any) => ({
                ...s,
                weekend_days: typeof s.weekend_days === 'string' ? JSON.parse(s.weekend_days) : (s.weekend_days || [])
            }));
            setShifts(parsed);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (shift: any) => {
        try {
            await window.electronAPI.hr.saveShift(shift);
            setEditing(null);
            loadShifts();
        } catch (error) {
            alert('Error saving shift: ' + error);
        }
    };

    return (
        <div className="p-6 bg-gray-50 min-h-screen rtl font-sans" dir="rtl">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">إدارة الورديات</h1>
                    <p className="text-gray-500">تعريف أوقات الدوام وقواعد التأخير</p>
                </div>
                <button
                    onClick={() => setEditing({
                        name: '', start_time: '08:00', end_time: '16:00',
                        late_grace_minutes: 15, overtime_multiplier: 1.5,
                        is_default: 0, weekend_days: ['FRIDAY', 'SATURDAY']
                    })}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center shadow-sm"
                >
                    <Plus className="ml-2 w-4 h-4" />
                    وردية جديدة
                </button>
            </div>

            {editing && (
                <div className="mb-6">
                    <ShiftForm shift={editing} onSave={handleSave} onCancel={() => setEditing(null)} />
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {shifts.map(shift => (
                    <ShiftCard key={shift.id} shift={shift} onEdit={() => setEditing(shift)} />
                ))}
            </div>
        </div>
    );
};

const ShiftCard = ({ shift, onEdit }: any) => {
    return (
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all relative group">
            <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-2">
                    <div className={`p-2 rounded-lg ${shift.is_default ? 'bg-green-100 text-green-600' : 'bg-blue-50 text-blue-600'}`}>
                        <Clock className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-800">{shift.name}</h3>
                        {shift.is_default === 1 && <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full">الافتراضي</span>}
                    </div>
                </div>
                <button onClick={onEdit} className="text-gray-400 hover:text-blue-600 p-1">
                    <Edit className="w-4 h-4" />
                </button>
            </div>

            <div className="space-y-2 text-sm text-gray-600">
                <div className="flex justify-between border-b border-gray-50 pb-2">
                    <span>الوقت:</span>
                    <span className="font-mono text-gray-800" dir="ltr">{shift.start_time} - {shift.end_time}</span>
                </div>
                <div className="flex justify-between border-b border-gray-50 pb-2">
                    <span>سماح التأخير:</span>
                    <span className="font-bold text-orange-600">{shift.late_grace_minutes} دقيقة</span>
                </div>
                <div className="flex justify-between pt-1">
                    <span>العطلة الأسبوعية:</span>
                    <div className="flex gap-1 flex-wrap justify-end">
                        {shift.weekend_days.map((d: string) => (
                            <span key={d} className="bg-gray-100 text-gray-500 text-xs px-1.5 py-0.5 rounded">{d.slice(0, 3)}</span>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

const ShiftForm = ({ shift, onSave, onCancel }: any) => {
    const [data, setData] = useState(shift);

    const toggleDay = (day: string) => {
        const current = data.weekend_days || [];
        if (current.includes(day)) {
            setData({ ...data, weekend_days: current.filter((d: string) => d !== day) });
        } else {
            setData({ ...data, weekend_days: [...current, day] });
        }
    };

    const days = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];

    return (
        <div className="bg-white p-6 rounded-xl border border-blue-100 shadow-lg animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center mb-4 border-b pb-2">
                <h3 className="font-bold text-gray-800">{data.id ? 'تعديل وردية' : 'إضافة وردية جديدة'}</h3>
                <button onClick={onCancel}><X className="w-5 h-5 text-gray-400 hover:text-red-500" /></button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">اسم الوردية</label>
                    <input className="w-full border p-2 rounded-lg" value={data.name} onChange={e => setData({ ...data, name: e.target.value })} placeholder="مثال: الدوام الصباحي" />
                </div>
                <div className="flex items-center pt-6">
                    <label className="flex items-center cursor-pointer gap-2">
                        <input type="checkbox" className="w-4 h-4" checked={data.is_default === 1} onChange={e => setData({ ...data, is_default: e.target.checked ? 1 : 0 })} />
                        <span className="text-sm text-gray-700">اعتبارها الوردية الافتراضية</span>
                    </label>
                </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">وقت البدء</label>
                    <input type="time" className="w-full border p-2 rounded-lg" value={data.start_time} onChange={e => setData({ ...data, start_time: e.target.value })} />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">وقت الانتهاء</label>
                    <input type="time" className="w-full border p-2 rounded-lg" value={data.end_time} onChange={e => setData({ ...data, end_time: e.target.value })} />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">سماح التأخير (دقيقة)</label>
                    <input type="number" className="w-full border p-2 rounded-lg" value={data.late_grace_minutes} onChange={e => setData({ ...data, late_grace_minutes: parseInt(e.target.value) })} />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">معامل الإضافي</label>
                    <input type="number" step="0.1" className="w-full border p-2 rounded-lg" value={data.overtime_multiplier} onChange={e => setData({ ...data, overtime_multiplier: parseFloat(e.target.value) })} />
                </div>
            </div>

            <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">أيام العطلة الأسبوعية</label>
                <div className="flex flex-wrap gap-2">
                    {days.map(day => (
                        <button
                            key={day}
                            onClick={() => toggleDay(day)}
                            className={`px-3 py-1 rounded-full text-xs border transition-colors ${data.weekend_days.includes(day) ? 'bg-blue-600 text-white border-blue-600' : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'}`}
                        >
                            {day}
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex justify-end gap-2">
                <button onClick={onCancel} className="bg-gray-100 text-gray-600 px-4 py-2 rounded-lg hover:bg-gray-200">إلغاء</button>
                <button onClick={() => onSave(data)} className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 shadow-md flex items-center">
                    <Save className="w-4 h-4 ml-2" />
                    حفظ التغييرات
                </button>
            </div>
        </div>
    )
}

export default ShiftManagementPage;
