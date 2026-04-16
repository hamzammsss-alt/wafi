import React from 'react';
import { Calendar, Lock } from 'lucide-react';

export const ClosePeriod = () => {
    const [lastDate, setLastDate] = React.useState<string | null>(null);
    const [newDate, setNewDate] = React.useState('');
    const [loading, setLoading] = React.useState(false);

    React.useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            // @ts-ignore
            const date = await window.electronAPI.getLastClosingDate();
            setLastDate(date);
        } catch (e) {
            console.error(e);
        }
    };

    const handleClose = async () => {
        if (!newDate) return alert('الرجاء اختيار التاريخ');
        if (!window.confirm(`هل أنت متأكد من إغلاق الفترة المخزنية حتى تاريخ ${newDate}؟\nلا يمكن التراجع عن هذا الإجراء.`)) return;

        setLoading(true);
        try {
            // @ts-ignore
            await window.electronAPI.closePeriod(newDate);
            alert('تم إغلاق الفترة بنجاح');
            loadData();
            setNewDate('');
        } catch (err: any) {
            alert('خطأ: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6 bg-[#f8fafc] h-full overflow-auto font-cairo" dir="rtl">
            <div className="bg-red-50 border-r-4 border-red-500 p-4 mb-6 rounded-l">
                <h3 className="font-bold text-red-800 flex items-center gap-2">
                    <Lock size={18} /> إغلاق الفترة المخزنية
                </h3>
                <p className="text-red-600 text-sm mt-1">
                    إغلاق الفترة يمنع إجراء أي حركات مخزنية بتاريخ سابق لتاريخ الإغلاق.
                </p>
            </div>

            <div className="card p-6 max-w-xl">
                <div className="mb-4">
                    <label className="block text-sm font-bold text-gray-700 mb-2">آخر تاريخ إغلاق</label>
                    <div className="p-3 bg-gray-100 rounded text-gray-500 font-mono">
                        {lastDate ? new Date(lastDate).toLocaleDateString('en-GB') : 'لا يوجد فترة مغلقة مسبقاً'}
                    </div>
                </div>

                <div className="mb-6">
                    <label className="block text-sm font-bold text-gray-700 mb-2">تاريخ الإغلاق الجديد</label>
                    <input
                        type="date"
                        className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-red-200 outline-none"
                        value={newDate}
                        onChange={e => setNewDate(e.target.value)}
                        min={lastDate ? new Date(new Date(lastDate).getTime() + 86400000).toISOString().split('T')[0] : undefined}
                    />
                    <p className="text-xs text-gray-400 mt-1">يجب أن يكون التاريخ الجديد بعد آخر تاريخ إغلاق</p>
                </div>

                <button
                    onClick={handleClose}
                    disabled={loading}
                    className={`w-full py-2 text-white font-bold rounded-lg transition ${loading ? 'bg-gray-400' : 'bg-red-600 hover:bg-red-700'}`}
                >
                    {loading ? 'جاري الإغلاق...' : 'إغلاق الفترة'}
                </button>
            </div>
        </div>
    );
};
