import React, { useState, useEffect } from 'react';
import { ClipboardList, Save, Search, Plus, Calendar, Building2, CheckCircle, AlertTriangle } from 'lucide-react';

export const StockTake = () => {
    const [view, setView] = useState<'LIST' | 'SESSION'>('LIST');
    const [sessions, setSessions] = useState<any[]>([]);
    const [activeSession, setActiveSession] = useState<any>(null);
    const [warehouses, setWarehouses] = useState<any[]>([]);

    // New Session Form
    const [newSessionData, setNewSessionData] = useState({
        warehouseId: '',
        description: '',
        date: new Date().toISOString().split('T')[0]
    });

    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    useEffect(() => {
        loadSessions();
        loadWarehouses();
    }, []);

    const loadSessions = async () => {
        // @ts-ignore
        if (window.electronAPI) {
            // @ts-ignore
            const s = await window.electronAPI.getStockTakes();
            setSessions(s || []);
        }
    };

    const loadWarehouses = async () => {
        // @ts-ignore
        if (window.electronAPI) {
            // @ts-ignore
            const w = await window.electronAPI.getWarehouses();
            setWarehouses(w || []);
        }
    };

    const handleCreateSession = async () => {
        if (!newSessionData.warehouseId) {
            setMessage({ type: 'error', text: 'يرجى اختيار المستودع' });
            return;
        }

        try {
            // @ts-ignore
            const res = await window.electronAPI.createStockTake({
                warehouse_id: newSessionData.warehouseId,
                notes: newSessionData.description || 'جرد دوري',
                type: 'FULL', // Defaulting to FULL for now
                created_by: 'System' // In real app, get from auth context
            });

            if (res.success) {
                setMessage({ type: 'success', text: 'تم بدء جلسة الجرد بنجاح' });
                await loadSessions();
                // Optionally auto-open the new session
                handleOpenSession(res.id);
            }
        } catch (err: any) {
            setMessage({ type: 'error', text: err.message });
        }
    };

    const handleOpenSession = async (id: string) => {
        try {
            // @ts-ignore
            const session = await window.electronAPI.getStockTake(id);
            if (session) {
                setActiveSession(session);
                setView('SESSION');
            }
        } catch (err: any) {
            console.error(err);
        }
    };

    const handleUpdateCount = async (itemId: string, qty: number) => {
        try {
            // Optimistic Update
            setActiveSession((prev: any) => ({
                ...prev,
                items: prev.items.map((i: any) => i.id === itemId ? { ...i, counted_quantity: qty, difference: qty - i.snapshot_quantity } : i)
            }));

            // API Call
            // @ts-ignore
            await window.electronAPI.updateStockTakeItem(itemId, qty);
        } catch (err) {
            console.error(err);
            // Revert on error? For now simple log.
        }
    };

    const handlePostSession = async () => {
        if (!window.confirm('هل أنت متأكد من اعتماد الجرد؟ سيتم توليد قيود التسوية تلقائياً ولا يمكن التراجع.')) return;

        try {
            // @ts-ignore
            await window.electronAPI.approveStockTake(activeSession.id);
            setMessage({ type: 'success', text: 'تم اعتماد الجرد وترحيل الفروقات بنجاح' });
            setView('LIST');
            loadSessions();
        } catch (err: any) {
            setMessage({ type: 'error', text: err.message });
        }
    };

    // --- Sub-Components ---

    if (view === 'LIST') {
        return (
            <div className="p-6 bg-[#f8fafc] h-full overflow-auto" dir="rtl">
                <h1 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                    <ClipboardList className="text-emerald-600" /> جلسات الجرد (Stock Take Sessions)
                </h1>

                {/* New Session Card */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mb-8">
                    <h2 className="text-lg font-bold text-gray-700 mb-4 flex items-center gap-2">
                        <Plus size={18} /> بدء جلسة جرد جديدة
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">المستودع</label>
                            <select
                                className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-emerald-200 outline-none"
                                value={newSessionData.warehouseId}
                                onChange={e => setNewSessionData({ ...newSessionData, warehouseId: e.target.value })}
                            >
                                <option value="">اختر المستودع...</option>
                                {warehouses.filter(w => w.is_active || true).map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">تاريخ الجرد</label>
                            <input
                                type="date"
                                className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-emerald-200 outline-none"
                                value={newSessionData.date}
                                onChange={e => setNewSessionData({ ...newSessionData, date: e.target.value })}
                            />
                        </div>
                        <div className="md:col-span-1">
                            <label className="block text-sm font-bold text-gray-700 mb-2">ملاحظات / وصف</label>
                            <input
                                className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-emerald-200 outline-none"
                                placeholder="جرد نهاية العام..."
                                value={newSessionData.description}
                                onChange={e => setNewSessionData({ ...newSessionData, description: e.target.value })}
                            />
                        </div>
                        <button
                            onClick={handleCreateSession}
                            className="bg-emerald-600 text-white font-bold py-2.5 px-6 rounded-lg hover:bg-emerald-700 transition shadow-lg shadow-emerald-100"
                        >
                            بدء الجرد
                        </button>
                    </div>
                </div>

                {/* Sessions List */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <table className="w-full text-right">
                        <thead className="bg-gray-50 border-b border-gray-100 text-gray-600 text-sm">
                            <tr>
                                <th className="p-4">رمز الجرد</th>
                                <th className="p-4">المستودع</th>
                                <th className="p-4">التاريخ</th>
                                <th className="p-4">الحالة</th>
                                <th className="p-4">الإجراء</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {sessions.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="p-8 text-center text-gray-400 italic">لا توجد جلسات جرد سابقة</td>
                                </tr>
                            ) : sessions.map(session => (
                                <tr key={session.id} className="hover:bg-gray-50 transition">
                                    <td className="p-4">
                                        <div className="font-bold text-gray-800">{session.code}</div>
                                    </td>
                                    <td className="p-4">{session.warehouse_name}</td>
                                    <td className="p-4 text-gray-600">{session.date ? session.date.split('T')[0] : ''}</td>
                                    <td className="p-4">
                                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${session.status === 'DRAFT' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}`}>
                                            {session.status === 'DRAFT' ? 'مفتوح (قيد الجرد)' : 'مرحل (POSTED)'}
                                        </span>
                                    </td>
                                    <td className="p-4">
                                        <button
                                            onClick={() => handleOpenSession(session.id)}
                                            className="text-emerald-600 font-bold hover:underline"
                                        >
                                            {session.status === 'DRAFT' ? 'متابعة الجرد' : 'عرض التفاصيل'}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {message && (
                    <div className={`fixed bottom-4 left-4 p-4 rounded-lg shadow-xl font-bold ${message.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'}`}>
                        {message.text}
                    </div>
                )}
            </div>
        );
    }

    // SESSION VIEW
    return (
        <div className="flex flex-col h-full bg-[#f8fafc]" dir="rtl">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 p-4 flex justify-between items-center shadow-sm z-10">
                <div>
                    <button onClick={() => setView('LIST')} className="text-gray-500 hover:text-gray-700 text-sm mb-1">← العودة للقائمة</button>
                    <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                        <Building2 size={20} className="text-emerald-600" />
                        {activeSession?.warehouse_name}
                        <span className="text-gray-400 font-light mx-2">|</span>
                        {activeSession?.code}
                    </h1>
                </div>
                <div className="flex gap-3">
                    {activeSession?.status === 'DRAFT' && (
                        <button
                            onClick={handlePostSession}
                            className="flex items-center gap-2 px-6 py-2 bg-emerald-600 text-white font-bold rounded-lg hover:bg-emerald-700 shadow-md shadow-emerald-200 transition"
                        >
                            <CheckCircle size={18} /> اعتماد وترحيل الفروقات
                        </button>
                    )}
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto p-6">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <table className="w-full text-right text-sm">
                        <thead className="bg-gray-50 font-bold text-gray-700 border-b border-gray-200 sticky top-0 shadow-sm z-10">
                            <tr>
                                <th className="p-4">رمز الصنف</th>
                                <th className="p-4">اسم الصنف</th>
                                <th className="p-4 text-center bg-gray-100">الرصيد الدفتري (Snapshot)</th>
                                <th className="p-4 text-center w-40 bg-yellow-50">العد الفعلي (Counted)</th>
                                <th className="p-4 text-center">الفارق</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {activeSession?.items.map((item: any) => {
                                const diff = item.difference;
                                const isModified = item.counted_quantity !== item.snapshot_quantity;

                                return (
                                    <tr key={item.id} className={`hover:bg-gray-50 transition ${isModified ? 'bg-yellow-50/30' : ''}`}>
                                        <td className="p-4 font-mono text-gray-600">{item.item_code}</td>
                                        <td className="p-4 font-bold text-gray-800">{item.item_name}</td>
                                        <td className="p-4 text-center font-mono text-gray-500 bg-gray-50/50">{item.snapshot_quantity}</td>
                                        <td className="p-2 bg-yellow-50/50">
                                            {activeSession.status === 'DRAFT' ? (
                                                <input
                                                    type="number"
                                                    className={`w-full p-2 border rounded text-center font-bold text-lg focus:ring-2 focus:ring-yellow-400 outline-none ${isModified ? 'border-yellow-400 bg-white' : 'border-gray-300 bg-gray-50'}`}
                                                    value={item.counted_quantity}
                                                    onChange={e => handleUpdateCount(item.id, Number(e.target.value))}
                                                />
                                            ) : (
                                                <div className="text-center font-bold text-lg">{item.counted_quantity}</div>
                                            )}
                                        </td>
                                        <td className={`p-4 text-center font-bold text-lg ${diff < 0 ? 'text-red-500' : diff > 0 ? 'text-emerald-500' : 'text-gray-300'}`}>
                                            {diff > 0 ? `+${diff}` : diff}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
