import React, { useState, useEffect } from 'react';
import {
    GitMerge, Plus, Save, Trash2, ArrowRight, Clock, Settings, Search, AlertCircle
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

const RoutingPage = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [boms, setBoms] = useState<any[]>([]);
    const [workCenters, setWorkCenters] = useState<any[]>([]);
    const [routings, setRoutings] = useState<any[]>([]);

    // Selection
    const [selectedBOM, setSelectedBOM] = useState('');

    // Editor State
    const [showEditor, setShowEditor] = useState(false);
    const [currentRouting, setCurrentRouting] = useState<any>({
        id: '',
        name: 'Standard Operations',
        is_default: true,
        operations: []
    });

    useEffect(() => {
        loadData();
    }, []);

    useEffect(() => {
        if (selectedBOM) {
            loadRoutings(selectedBOM);
        } else {
            setRoutings([]);
        }
    }, [selectedBOM]);

    const loadData = async () => {
        // @ts-ignore
        const [bomsData, wcData] = await Promise.all([
            // @ts-ignore
            window.electronAPI.manufacturing.getBOMs(),
            // @ts-ignore
            window.electronAPI.manufacturing.getWorkCenters()
        ]);
        setBoms(bomsData || []);
        setWorkCenters(wcData || []);

        // Optional: Pre-select if passed in navigation state
        if (location.state?.bomId) {
            setSelectedBOM(location.state.bomId);
        }
    };

    const loadRoutings = async (bomId: string) => {
        // @ts-ignore
        const list = await window.electronAPI.manufacturing.getRoutings(bomId);
        setRoutings(list || []);
    };

    const handleSave = async () => {
        if (!selectedBOM) return alert("اختر وجبة إنتاج أولاً");
        if (currentRouting.operations.length === 0) return alert("أضف عملية واحدة على الأقل");

        try {
            // @ts-ignore
            await window.electronAPI.manufacturing.saveRouting(
                { ...currentRouting, bom_id: selectedBOM },
                currentRouting.operations
            );
            alert("تم حفظ المسار بنجاح");
            setShowEditor(false);
            loadRoutings(selectedBOM);
        } catch (error: any) {
            alert("خطأ: " + error.message);
        }
    };

    const addOperation = () => {
        setCurrentRouting({
            ...currentRouting,
            operations: [
                ...currentRouting.operations,
                {
                    sequence_order: (currentRouting.operations.length + 1) * 10,
                    work_center_id: '',
                    description: '',
                    setup_time_minutes: 0,
                    run_time_minutes: 0
                }
            ]
        });
    };

    const updateOperation = (index: number, field: string, value: any) => {
        const newOps = [...currentRouting.operations];
        newOps[index][field] = value;
        setCurrentRouting({ ...currentRouting, operations: newOps });
    };

    const removeOperation = (index: number) => {
        const newOps = [...currentRouting.operations];
        newOps.splice(index, 1);
        setCurrentRouting({ ...currentRouting, operations: newOps });
    };

    const handleEdit = (routing: any) => {
        setCurrentRouting({
            id: routing.id,
            name: routing.name,
            is_default: routing.is_default,
            operations: routing.operations || []
        });
        setShowEditor(true);
    };

    const handleNew = () => {
        setCurrentRouting({
            id: '',
            name: 'مسار قياسي',
            is_default: true,
            operations: []
        });
        addOperation(); // Add first line automatically
        setShowEditor(true);
    };

    return (
        <div className="p-6 bg-slate-50 min-h-screen rtl" dir="rtl">

            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500">
                        <ArrowRight />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                            <GitMerge className="text-purple-600" size={28} />
                            مسارات العمل (Routings)
                        </h1>
                        <p className="text-slate-500 mt-1">تعريف تسلسل العمليات الإنتاجية والأزمنة المعيارية</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

                {/* Sidebar: Select BOM */}
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 lg:h-[calc(100vh-140px)] overflow-y-auto">
                    <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
                        <Search size={18} />
                        اختر المنتج (BOM)
                    </h3>
                    <div className="space-y-2">
                        {boms.map(bom => (
                            <div
                                key={bom.id}
                                onClick={() => { setSelectedBOM(bom.id); setShowEditor(false); }}
                                className={`p-3 rounded-xl cursor-pointer transition-all border ${selectedBOM === bom.id
                                        ? 'bg-purple-50 border-purple-200 ring-1 ring-purple-300'
                                        : 'bg-white border-slate-100 hover:bg-slate-50 hover:border-slate-200'
                                    }`}
                            >
                                <div className="font-bold text-slate-800 text-sm">{bom.item_name}</div>
                                <div className="text-xs text-slate-400 font-mono mt-1">{bom.bom_number}</div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Main Content */}
                <div className="lg:col-span-3">
                    {!selectedBOM ? (
                        <div className="h-full flex flex-col items-center justify-center text-slate-400 bg-white rounded-2xl border border-dashed border-slate-300 py-20">
                            <GitMerge size={48} className="mb-4 opacity-20" />
                            <p>يرجى اختيار وجبة إنتاج من القائمة الجانبية لعرض أو إنشاء مسارات العمل</p>
                        </div>
                    ) : showEditor ? (
                        // EDITOR MODE
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
                            <div className="flex justify-between items-center mb-6 pb-4 border-b">
                                <h3 className="text-xl font-bold text-slate-800">تحرير/إنشاء مسار</h3>
                                <div className="flex gap-2">
                                    <button onClick={() => setShowEditor(false)} className="px-4 py-2 text-slate-500 hover:text-slate-700 font-medium">إلغاء</button>
                                    <button onClick={handleSave} className="px-6 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 font-bold shadow-lg shadow-purple-200 flex items-center gap-2">
                                        <Save size={18} /> حفظ المسار
                                    </button>
                                </div>
                            </div>

                            <div className="mb-6">
                                <label className="block text-sm font-bold text-slate-700 mb-2">اسم المسار</label>
                                <input
                                    type="text"
                                    value={currentRouting.name}
                                    onChange={e => setCurrentRouting({ ...currentRouting, name: e.target.value })}
                                    className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-100 outline-none"
                                />
                            </div>

                            <div className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <h4 className="font-bold text-slate-700 flex items-center gap-2">
                                        <Settings size={18} /> العمليات التشغيلية
                                    </h4>
                                    <button onClick={addOperation} className="text-purple-600 hover:bg-purple-50 px-3 py-1.5 rounded-lg text-sm font-bold flex items-center gap-1 transition-colors">
                                        <Plus size={16} /> إضافة عملية
                                    </button>
                                </div>

                                <div className="overflow-hidden border border-slate-200 rounded-xl">
                                    <table className="w-full text-right bg-slate-50/50">
                                        <thead className="bg-slate-100 text-xs text-slate-500 font-bold uppercase border-b border-slate-200">
                                            <tr>
                                                <th className="p-3 w-16 text-center">التسلسل</th>
                                                <th className="p-3 w-1/4">مركز العمل</th>
                                                <th className="p-3">وصف العملية</th>
                                                <th className="p-3 w-32">وقت الإعداد (دقيقة)</th>
                                                <th className="p-3 w-32">وقت التشغيل (دقيقة)</th>
                                                <th className="p-3 w-16"></th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 bg-white">
                                            {currentRouting.operations.map((op: any, idx: number) => (
                                                <tr key={idx} className="group hover:bg-slate-50">
                                                    <td className="p-2 text-center">
                                                        <input
                                                            type="number"
                                                            value={op.sequence_order}
                                                            onChange={e => updateOperation(idx, 'sequence_order', parseInt(e.target.value))}
                                                            className="w-full text-center bg-transparent outline-none font-mono text-slate-600"
                                                        />
                                                    </td>
                                                    <td className="p-2">
                                                        <select
                                                            value={op.work_center_id}
                                                            onChange={e => updateOperation(idx, 'work_center_id', e.target.value)}
                                                            className="w-full p-2 border border-slate-200 rounded-lg focus:border-purple-500 outline-none text-sm"
                                                        >
                                                            <option value="">اختر القسم...</option>
                                                            {workCenters.map(wc => (
                                                                <option key={wc.id} value={wc.id}>{wc.name}</option>
                                                            ))}
                                                        </select>
                                                    </td>
                                                    <td className="p-2">
                                                        <input
                                                            type="text"
                                                            value={op.description}
                                                            onChange={e => updateOperation(idx, 'description', e.target.value)}
                                                            placeholder="مثال: قص، تجميع، تغليف..."
                                                            className="w-full p-2 border border-slate-200 rounded-lg focus:border-purple-500 outline-none text-sm"
                                                        />
                                                    </td>
                                                    <td className="p-2">
                                                        <input
                                                            type="number"
                                                            value={op.setup_time_minutes}
                                                            onChange={e => updateOperation(idx, 'setup_time_minutes', parseFloat(e.target.value))}
                                                            className="w-full p-2 border border-slate-200 rounded-lg focus:border-purple-500 outline-none text-sm text-center"
                                                        />
                                                    </td>
                                                    <td className="p-2">
                                                        <input
                                                            type="number"
                                                            value={op.run_time_minutes}
                                                            onChange={e => updateOperation(idx, 'run_time_minutes', parseFloat(e.target.value))}
                                                            className="w-full p-2 border border-slate-200 rounded-lg focus:border-purple-500 outline-none text-sm text-center"
                                                        />
                                                    </td>
                                                    <td className="p-2 text-center">
                                                        <button onClick={() => removeOperation(idx)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    ) : (
                        // LIST MODE
                        <div className="space-y-4">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="font-bold text-slate-800">المسارات المعرفة لهذا المنتج</h3>
                                <button
                                    onClick={handleNew}
                                    className="bg-purple-600 text-white px-4 py-2 rounded-xl hover:bg-purple-700 font-bold shadow-md flex items-center gap-2"
                                >
                                    <Plus size={18} /> مسار جديد
                                </button>
                            </div>

                            {routings.length === 0 ? (
                                <div className="bg-purple-50 rounded-xl p-6 text-center border border-purple-100">
                                    <p className="text-purple-800 font-medium">لا يوجد مسارات معرفة بعد</p>
                                    <p className="text-sm text-purple-600 mt-1">قم بإنشاء مسار "قياسي" لتعريف خطوات الإنتاج الافتراضية</p>
                                </div>
                            ) : (
                                routings.map(routing => (
                                    <div key={routing.id} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md transition-all">
                                        <div className="flex justify-between items-start mb-4">
                                            <div>
                                                <h4 className="font-bold text-lg text-slate-900 flex items-center gap-2">
                                                    {routing.name}
                                                    {routing.is_default === 1 && <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">افتراضي</span>}
                                                </h4>
                                                <span className="text-xs text-slate-400 font-mono">{routing.id.split('-')[0]}...</span>
                                            </div>
                                            <button
                                                onClick={() => handleEdit(routing)}
                                                className="text-purple-600 hover:bg-purple-50 px-3 py-1.5 rounded-lg text-sm font-bold transition-colors"
                                            >
                                                تعديل
                                            </button>
                                        </div>

                                        {/* Operations Preview */}
                                        <div className="space-y-3 relative before:absolute before:right-[15px] before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                                            {routing.operations?.map((op: any) => (
                                                <div key={op.id} className="flex items-center gap-4 relative pr-8">
                                                    <div className="absolute right-[11px] top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-slate-300 border-2 border-white ring-1 ring-slate-200"></div>
                                                    <div className="bg-slate-50 p-2 px-3 rounded-lg border border-slate-100 flex-1 flex justify-between items-center">
                                                        <div className="flex items-center gap-3">
                                                            <span className="font-mono text-xs text-slate-400 font-bold w-6">{op.sequence_order}</span>
                                                            <span className="text-sm font-bold text-slate-700">{op.description}</span>
                                                        </div>
                                                        <div className="flex items-center gap-4 text-xs text-slate-500">
                                                            <span className="px-2 py-0.5 bg-white rounded border border-slate-100">{op.work_center_name || 'مركز غير معروف'}</span>
                                                            <span className="flex items-center gap-1"><Clock size={12} /> {op.run_time_minutes} دقيقة</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>
            </div>

        </div>
    );
};

export default RoutingPage;
