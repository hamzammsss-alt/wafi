import React, { useState, useEffect } from 'react';
import { useTabs } from '../../src/contexts/TabsContext';
import {
    Plus, Edit2, Trash2, Settings, Factory, DollarSign, Clock, LayoutGrid, Monitor, MonitorSpeaker
} from 'lucide-react';

const WorkCentersPage = () => {
    const [activeTab, setActiveTab] = useState<'centers' | 'machines'>('centers');

    // Centers State
    const [centers, setCenters] = useState<any[]>([]);
    const [loadingCenters, setLoadingCenters] = useState(false);
    const [centerModal, setCenterModal] = useState(false);
    const [centerForm, setCenterForm] = useState<any>({});
    const [savingCenter, setSavingCenter] = useState(false);

    // Machines State
    const [machines, setMachines] = useState<any[]>([]);
    const [loadingMachines, setLoadingMachines] = useState(false);
    const [machineModal, setMachineModal] = useState(false);
    const [machineForm, setMachineForm] = useState<any>({});
    const [savingMachine, setSavingMachine] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        loadCenters();
        loadMachines();
    };

    const loadCenters = async () => {
        setLoadingCenters(true);
        try {
            // @ts-ignore
            const data = await window.electronAPI.manufacturing.getWorkCenters();
            setCenters(data || []);
        } catch (e) { console.error(e); }
        finally { setLoadingCenters(false); }
    };

    const loadMachines = async () => {
        setLoadingMachines(true);
        try {
            // @ts-ignore
            const data = await window.electronAPI.manufacturing.getMachines();
            setMachines(data || []);
        } catch (e) { console.error(e); }
        finally { setLoadingMachines(false); }
    };

    // --- Center Handlers ---
    const handleSaveCenter = async () => {
        if (!centerForm.name || !centerForm.code) return alert('يرجى تعبئة الحقول المطلوبة (الاسم والكود)');
        setSavingCenter(true);
        try {
            // @ts-ignore
            await window.electronAPI.manufacturing.saveWorkCenter(centerForm);
            setCenterModal(false);
            loadCenters();
        } catch (error) {
            console.error(error);
            alert('فشل الحفظ: تأكد من عدم تكرار الكود');
        } finally {
            setSavingCenter(false);
        }
    };

    const handleDeleteCenter = async (id: string) => {
        if (!window.confirm('هل أنت متأكد من حذف مركز العمل؟ قد يؤثر ذلك على الارتباطات الأخرى.')) return;
        try {
            // @ts-ignore
            await window.electronAPI.manufacturing.deleteWorkCenter(id);
            loadCenters();
        } catch (e) { console.error(e); alert('فشل الحذف'); }
    };

    // --- Machine Handlers ---
    const handleSaveMachine = async () => {
        if (!machineForm.name || !machineForm.work_center_id) return alert('يرجى اختيار مركز العمل واصم الآلة');
        setSavingMachine(true);
        try {
            // @ts-ignore
            await window.electronAPI.manufacturing.saveMachine(machineForm);
            setMachineModal(false);
            loadMachines();
        } catch (error) {
            console.error(error);
            alert('فشل الحفظ');
        } finally {
            setSavingMachine(false);
        }
    };

    const handleDeleteMachine = async (id: string) => {
        if (!window.confirm('حذف الآلة؟')) return;
        try {
            // @ts-ignore
            await window.electronAPI.manufacturing.deleteMachine(id);
            loadMachines();
        } catch (e) { console.error(e); }
    };

    return (
        <div className="p-6 bg-slate-50 min-h-screen rtl" dir="rtl">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <Factory size={28} className="text-emerald-600" />
                        إعدادات المصنع
                    </h1>
                    <p className="text-slate-500 mt-1">إدارة خطوط الإنتاج والآلات</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-white p-1 rounded-xl shadow-sm border border-slate-200 w-fit mb-6">
                <button
                    onClick={() => setActiveTab('centers')}
                    className={`px-6 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'centers' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
                >
                    <LayoutGrid size={18} /> خطوط الإنتاج (Work Centers)
                </button>
                <button
                    onClick={() => setActiveTab('machines')}
                    className={`px-6 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'machines' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
                >
                    <MonitorSpeaker size={18} /> الآلات والمعدات (Machines)
                </button>
            </div>

            {/* Content */}
            {activeTab === 'centers' && (
                <div>
                    <div className="flex justify-end mb-4">
                        <button
                            onClick={() => { setCenterForm({}); setCenterModal(true); }}
                            className="bg-emerald-600 text-white px-5 py-2 rounded-xl hover:bg-emerald-700 flex items-center gap-2 shadow-sm font-medium"
                        >
                            <Plus size={20} /> إضافة خط إنتاج
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {centers.map(center => (
                            <div key={center.id} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md transition-all group relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-1.5 h-full bg-emerald-500"></div>
                                <div className="flex justify-between items-start mb-4 pl-8">
                                    <div>
                                        <h3 className="text-lg font-bold text-slate-800">{center.name}</h3>
                                        <span className="text-xs font-mono text-slate-400 bg-slate-100 px-2 py-1 rounded-full mt-1 inline-block">
                                            {center.code}
                                        </span>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => { setCenterForm(center); setCenterModal(true); }} className="text-slate-400 hover:text-blue-600"><Edit2 size={16} /></button>
                                        <button onClick={() => handleDeleteCenter(center.id)} className="text-slate-400 hover:text-red-600"><Trash2 size={16} /></button>
                                    </div>
                                </div>
                                <div className="space-y-2 mt-4 text-sm text-slate-600">
                                    <div className="flex justify-between"><span>تكلفة الساعة:</span> <b>{center.cost_per_hour}</b></div>
                                    <div className="flex justify-between"><span>السعة:</span> <b>{center.capacity_per_hour}</b></div>
                                </div>
                            </div>
                        ))}
                        {centers.length === 0 && !loadingCenters && <div className="col-span-full text-center py-10 text-slate-400">لا يوجد بيانات</div>}
                    </div>
                </div>
            )}

            {activeTab === 'machines' && (
                <div>
                    <div className="flex justify-end mb-4">
                        <button
                            onClick={() => { setMachineForm({}); setMachineModal(true); }}
                            className="bg-blue-600 text-white px-5 py-2 rounded-xl hover:bg-blue-700 flex items-center gap-2 shadow-sm font-medium"
                        >
                            <Plus size={20} /> إضافة آلة
                        </button>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                        <table className="w-full text-right">
                            <thead className="bg-slate-50 text-slate-600 font-bold text-sm">
                                <tr>
                                    <th className="p-4">اسم الآلة</th>
                                    <th className="p-4">خط الإنتاج التابع</th>
                                    <th className="p-4">السيريال / الموديل</th>
                                    <th className="p-4">الحالة</th>
                                    <th className="p-4">إجراءات</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {machines.map(m => (
                                    <tr key={m.id} className="hover:bg-slate-50">
                                        <td className="p-4 font-bold text-slate-800">{m.name}</td>
                                        <td className="p-4 text-slate-600">{m.work_center_name || '-'}</td>
                                        <td className="p-4 text-xs font-mono text-slate-500">
                                            {m.brand} {m.model} <br /> {m.serial_number}
                                        </td>
                                        <td className="p-4">
                                            <span className={`px-2 py-1 rounded-full text-xs font-bold ${m.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                                                {m.status}
                                            </span>
                                        </td>
                                        <td className="p-4 flex gap-2">
                                            <button onClick={() => { setMachineForm(m); setMachineModal(true); }} className="text-blue-600 hover:bg-blue-50 p-1 rounded"><Edit2 size={16} /></button>
                                            <button onClick={() => handleDeleteMachine(m.id)} className="text-red-600 hover:bg-red-50 p-1 rounded"><Trash2 size={16} /></button>
                                        </td>
                                    </tr>
                                ))}
                                {machines.length === 0 && !loadingMachines && (
                                    <tr><td colSpan={5} className="text-center p-8 text-slate-400">لا يوجد آلات معرفة</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Center Modal */}
            {centerModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
                        <h3 className="font-bold text-lg mb-4">{centerForm.id ? 'تعديل مركز' : 'إضافة خط إنتاج جديد'}</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-slate-600 mb-1">كود المركز (يجب أن يكون فريداً)</label>
                                <input className="w-full border p-2 rounded-lg" value={centerForm.code || ''} onChange={e => setCenterForm({ ...centerForm, code: e.target.value })} placeholder="WC-01" />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-600 mb-1">اسم الخط/القسم</label>
                                <input className="w-full border p-2 rounded-lg" value={centerForm.name || ''} onChange={e => setCenterForm({ ...centerForm, name: e.target.value })} placeholder="قسم التجميع" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">تكلفة الساعة</label>
                                    <input type="number" className="w-full border p-2 rounded-lg" value={centerForm.cost_per_hour || ''} onChange={e => setCenterForm({ ...centerForm, cost_per_hour: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">السعة (وحدة/س)</label>
                                    <input type="number" className="w-full border p-2 rounded-lg" value={centerForm.capacity_per_hour || ''} onChange={e => setCenterForm({ ...centerForm, capacity_per_hour: e.target.value })} />
                                </div>
                            </div>
                            <button onClick={handleSaveCenter} disabled={savingCenter} className="w-full bg-emerald-600 text-white p-3 rounded-lg font-bold mt-2">
                                {savingCenter ? 'جاري الحفظ...' : 'حفظ'}
                            </button>
                            <button onClick={() => setCenterModal(false)} className="w-full text-slate-500 py-2">إلغاء</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Machine Modal */}
            {machineModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
                        <h3 className="font-bold text-lg mb-4">{machineForm.id ? 'تعديل آلة' : 'إضافة آلة جديدة'}</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-slate-600 mb-1">الاسم</label>
                                <input className="w-full border p-2 rounded-lg" value={machineForm.name || ''} onChange={e => setMachineForm({ ...machineForm, name: e.target.value })} placeholder="ماكينة خياطة #1" />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-600 mb-1">القسم/خط الإنتاج التابع</label>
                                <select
                                    className="w-full border p-2 rounded-lg"
                                    value={machineForm.work_center_id || ''}
                                    onChange={e => setMachineForm({ ...machineForm, work_center_id: e.target.value })}
                                >
                                    <option value="">اختر القسم...</option>
                                    {centers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <input className="border p-2 rounded-lg" placeholder="الماركة (Brand)" value={machineForm.brand || ''} onChange={e => setMachineForm({ ...machineForm, brand: e.target.value })} />
                                <input className="border p-2 rounded-lg" placeholder="الموديل (Model)" value={machineForm.model || ''} onChange={e => setMachineForm({ ...machineForm, model: e.target.value })} />
                            </div>
                            <input className="w-full border p-2 rounded-lg" placeholder="السيريال (Serial No)" value={machineForm.serial_number || ''} onChange={e => setMachineForm({ ...machineForm, serial_number: e.target.value })} />

                            <div>
                                <label className="block text-sm font-bold text-slate-600 mb-1">الحالة</label>
                                <select
                                    className="w-full border p-2 rounded-lg"
                                    value={machineForm.status || 'ACTIVE'}
                                    onChange={e => setMachineForm({ ...machineForm, status: e.target.value })}
                                >
                                    <option value="ACTIVE">نشطة</option>
                                    <option value="MAINTENANCE">في الصيانة</option>
                                    <option value="BROKEN">معطلة</option>
                                    <option value="INACTIVE">غير نشطة (مخزن)</option>
                                </select>
                            </div>

                            <button onClick={handleSaveMachine} disabled={savingMachine} className="w-full bg-blue-600 text-white p-3 rounded-lg font-bold mt-2">
                                {savingMachine ? 'جاري الحفظ...' : 'حفظ'}
                            </button>
                            <button onClick={() => setMachineModal(false)} className="w-full text-slate-500 py-2">إلغاء</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default WorkCentersPage;
