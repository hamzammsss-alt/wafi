import React, { useState, useEffect } from 'react';
import {
    Wrench, Plus, AlertCircle, CheckCircle, Clock,
    Settings, Filter
} from 'lucide-react';

const MaintenancePage = () => {
    const [requests, setRequests] = useState<any[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState<any>({});

    // Mock Machines (should fetch from DB)
    const [machines, setMachines] = useState<any[]>([
        { id: '1', name: 'Machine A' },
        { id: '2', name: 'Machine B' }
    ]);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            // @ts-ignore
            const reqs = await window.electronAPI.manufacturing.getMaintenanceRequests();
            setRequests(reqs || []);
        } catch (e) { console.error(e); }
    };

    const handleSave = async () => {
        try {
            // @ts-ignore
            await window.electronAPI.manufacturing.saveMaintenanceRequest({
                ...formData,
                requested_by: 'Current User'
            });
            setShowModal(false);
            loadData();
        } catch (e) {
            console.error(e);
            alert('Error Saving');
        }
    };

    return (
        <div className="p-6 bg-slate-50 min-h-screen rtl" dir="rtl">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <Wrench size={28} className="text-orange-600" />
                        طلبات الصيانة (Maintenance)
                    </h1>
                    <p className="text-slate-500 mt-1">إدارة الأعطال والصيانة الدورية للماكينات</p>
                </div>
                <button
                    onClick={() => { setFormData({}); setShowModal(true); }}
                    className="bg-orange-600 text-white px-5 py-2.5 rounded-xl hover:bg-orange-700 flex items-center gap-2 shadow-sm shadow-orange-200 transition-all active:scale-95 font-medium"
                >
                    <Plus size={20} />
                    طلب صيانة جديد
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {requests.map(req => (
                    <div key={req.id} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex justify-between items-start">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${req.priority === 'CRITICAL' ? 'bg-red-100 text-red-700' :
                                        req.priority === 'HIGH' ? 'bg-orange-100 text-orange-700' : 'bg-blue-50 text-blue-700'
                                    }`}>
                                    {req.priority}
                                </span>
                                <span className="text-slate-400 text-xs">{req.request_date?.split('T')[0]}</span>
                            </div>
                            <h3 className="font-bold text-slate-800 text-lg mb-1">{req.issue_description}</h3>
                            <p className="text-slate-500 text-sm flex items-center gap-1">
                                <Settings size={14} /> ماكينة: {req.machine_name || 'غير محدد'}
                            </p>
                            <p className="text-slate-400 text-xs mt-2">بواسطة: {req.requested_by}</p>
                        </div>

                        <div className="text-left">
                            <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-bold ${req.status === 'OPEN' ? 'bg-slate-100 text-slate-600' :
                                    req.status === 'RESOLVED' ? 'bg-emerald-100 text-emerald-700' : 'bg-yellow-100 text-yellow-700'
                                }`}>
                                {req.status === 'OPEN' && <AlertCircle size={16} />}
                                {req.status === 'RESOLVED' && <CheckCircle size={16} />}
                                {req.status === 'IN_PROGRESS' && <Clock size={16} />}
                                {req.status}
                            </span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl w-full max-w-md p-6 animate-in fade-in zoom-in-95">
                        <h3 className="font-bold text-lg mb-4 text-slate-800">إبلاغ عن عطل (طلب صيانة)</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-slate-600 mb-1.5">الماكينة / الأصل</label>
                                <select
                                    className="w-full p-2.5 border rounded-xl bg-slate-50"
                                    value={formData.machine_id || ''}
                                    onChange={e => setFormData({ ...formData, machine_id: e.target.value })}
                                >
                                    <option value="">اختر الماكينة...</option>
                                    {machines.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-600 mb-1.5">وصف العطل</label>
                                <textarea
                                    className="w-full p-2.5 border rounded-xl h-24"
                                    placeholder="اشرح المشكلة الحاصلة..."
                                    value={formData.issue_description || ''}
                                    onChange={e => setFormData({ ...formData, issue_description: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-600 mb-1.5">الأولوية</label>
                                <div className="flex gap-2">
                                    {['NORMAL', 'HIGH', 'CRITICAL'].map(p => (
                                        <button
                                            key={p}
                                            onClick={() => setFormData({ ...formData, priority: p })}
                                            className={`flex-1 py-2 rounded-lg text-sm font-bold border ${formData.priority === p
                                                    ? 'bg-orange-50 border-orange-500 text-orange-700'
                                                    : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                                                }`}
                                        >
                                            {p}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <button
                                onClick={handleSave}
                                className="w-full bg-orange-600 text-white py-3 rounded-xl font-bold hover:bg-orange-700 transition-all mt-2 shadow-lg shadow-orange-200"
                            >
                                إرسال الطلب
                            </button>
                            <button
                                onClick={() => setShowModal(false)}
                                className="w-full text-slate-400 py-2 mt-2 hover:text-slate-600"
                            >
                                إلغاء
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MaintenancePage;
