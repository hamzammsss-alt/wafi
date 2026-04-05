import React, { useState, useEffect } from 'react';
import { Save, ArrowRight, User, Calendar, Plus, Trash2, FileText, Box, Info } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { useTabs } from '../../../src/contexts/TabsContext';
import { v4 as uuidv4 } from 'uuid';

const RFQForm = () => {
    const { id } = useParams();
    const { closeTab, activeTabPath } = useTabs();
    const [loading, setLoading] = useState(true);

    const [header, setHeader] = useState({
        request_no: 'NEW',
        date: new Date().toISOString().split('T')[0],
        needed_date: '',
        requester_id: '',
        status: 'OPEN',
        notes: ''
    });

    const [lines, setLines] = useState<any[]>([]);
    const [employees, setEmployees] = useState<any[]>([]);
    const [items, setItems] = useState<any[]>([]);
    const [units, setUnits] = useState<any[]>([]);

    useEffect(() => {
        loadMasterData();
        if (id && id !== 'new') {
            loadRFQ(id);
        } else {
            setLoading(false);
            // Add initial empty line
            addLine();
        }
    }, [id]);

    const loadMasterData = async () => {
        try {
            const [emps, itms, unts] = await Promise.all([
                window.electronAPI.hr.getEmployees(),
                window.electronAPI.inventory.getItems(), // V2
                window.electronAPI.inventory.getUnits()
            ]);
            setEmployees(emps);
            setItems(itms);
            setUnits(unts);
        } catch (error) {
            console.error("Error loading master data:", error);
        }
    };

    const loadRFQ = async (rfqId: string) => {
        try {
            setLoading(true);
            const data = await window.electronAPI.purchase.getRFQ(rfqId);
            if (data) {
                setHeader(data.header);
                setLines(data.lines);
            }
        } catch (error) {
            console.error("Error loading RFQ:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!header.date || lines.length === 0) {
            alert('يرجى تعبئة البيانات الأساسية وإضافة صنف واحد على الأقل');
            return;
        }

        const data = { header: { ...header, id: id === 'new' ? undefined : id }, lines };

        try {
            let result;
            if (id && id !== 'new') {
                result = await window.electronAPI.purchase.updateRFQ(data);
                alert(`تم تحديث الطلب رقم ${result.request_no}`);
            } else {
                result = await window.electronAPI.purchase.createRFQ(data);
                alert(`تم حفظ الطلب الجديد رقم ${result.request_no}`);
            }
            if (activeTabPath) closeTab(activeTabPath);
        } catch (error: any) {
            alert(`خطأ في الحفظ: ${error.message}`);
        }
    };

    const addLine = () => {
        setLines([...lines, { id: uuidv4(), item_id: '', quantity: 1, unit_id: '', description: '', notes: '' }]);
    };

    const removeLine = (index: number) => {
        const newLines = [...lines];
        newLines.splice(index, 1);
        setLines(newLines);
    };

    const updateLine = (index: number, field: string, value: any) => {
        const newLines = [...lines];
        const line = { ...newLines[index], [field]: value };

        // Auto-fill unit if item changed
        if (field === 'item_id') {
            const item = items.find(i => i.id === value);
            if (item) {
                line.unit_id = item.main_unit_id;
                line.description = item.name_ar; // Default desc
            }
        }

        newLines[index] = line;
        setLines(newLines);
    };

    if (loading) return <div className="p-12 text-center text-slate-500">جاري التحميل...</div>;

    return (
        <div className="p-6 max-w-[1600px] mx-auto space-y-6 animate-in slide-in-from-bottom-4 duration-500" dir="rtl">
            {/* Header Actions */}
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => activeTabPath && closeTab(activeTabPath)}
                        className="p-2 hover:bg-slate-100 rounded-full transition-colors group"
                    >
                        <ArrowRight className="w-6 h-6 text-slate-400 group-hover:text-slate-700 rtl:rotate-180" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                            {id === 'new' ? 'طلب تسعير جديد' : `تعديل طلب تسعير #${header.request_no}`}
                            {id !== 'new' && <span className="text-sm font-normal px-2 py-0.5 bg-slate-100 rounded-full text-slate-500">RFQ</span>}
                        </h1>
                    </div>
                </div>
                <button
                    onClick={handleSave}
                    className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-xl font-medium shadow-sm hover:shadow-md transition-all active:scale-95"
                >
                    <Save className="w-5 h-5" />
                    <span>حفظ الطلب</span>
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Main Content (Items) */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                            <h2 className="font-bold text-slate-700 flex items-center gap-2">
                                <Box className="w-5 h-5 text-indigo-500" />
                                الأصناف المطلوبة
                            </h2>
                            <button
                                onClick={addLine}
                                className="text-sm text-indigo-600 hover:bg-indigo-50 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 font-medium"
                            >
                                <Plus className="w-4 h-4" />
                                إضافة صنف
                            </button>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-100 text-right text-sm font-semibold text-slate-600">
                                        <th className="py-3 px-4 w-12">#</th>
                                        <th className="py-3 px-4 w-1/3">الصنف</th>
                                        <th className="py-3 px-4">الوصف (للمورد)</th>
                                        <th className="py-3 px-4 w-24">الكمية</th>
                                        <th className="py-3 px-4 w-32">الوحدة</th>
                                        <th className="py-3 px-4 w-12"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {lines.map((line, index) => (
                                        <tr key={line.id} className="group hover:bg-slate-50/50 transition-colors">
                                            <td className="py-3 px-4 text-slate-400 font-mono text-sm">{index + 1}</td>
                                            <td className="py-3 px-4">
                                                <select
                                                    value={line.item_id}
                                                    onChange={(e) => updateLine(index, 'item_id', e.target.value)}
                                                    className="w-full p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all text-sm bg-white"
                                                >
                                                    <option value="">اختر الصنف...</option>
                                                    {items.map(item => (
                                                        <option key={item.id} value={item.id}>{item.name_ar}</option>
                                                    ))}
                                                </select>
                                            </td>
                                            <td className="py-3 px-4">
                                                <input
                                                    type="text"
                                                    value={line.description || ''}
                                                    onChange={(e) => updateLine(index, 'description', e.target.value)}
                                                    className="w-full p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all text-sm"
                                                    placeholder="وصف إضافي..."
                                                />
                                            </td>
                                            <td className="py-3 px-4">
                                                <input
                                                    type="number"
                                                    min="0.1"
                                                    step="0.1"
                                                    value={line.quantity}
                                                    onChange={(e) => updateLine(index, 'quantity', parseFloat(e.target.value))}
                                                    className="w-full p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all text-sm text-center font-mono"
                                                />
                                            </td>
                                            <td className="py-3 px-4">
                                                <select
                                                    value={line.unit_id}
                                                    onChange={(e) => updateLine(index, 'unit_id', e.target.value)}
                                                    className="w-full p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all text-sm bg-slate-50"
                                                >
                                                    <option value="">الوحدة...</option>
                                                    {units.map(u => (
                                                        <option key={u.id} value={u.id}>{u.name_ar}</option>
                                                    ))}
                                                </select>
                                            </td>
                                            <td className="py-3 px-4 text-center">
                                                <button
                                                    onClick={() => removeLine(index)}
                                                    className="text-slate-300 hover:text-red-500 transition-colors p-1"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {lines.length === 0 && (
                                <div className="p-8 text-center text-slate-400 bg-slate-50/30">
                                    لا توجد أصناف مضافة. اضغط على أزرار الإضافة أعلاه.
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
                        <h2 className="font-bold text-slate-700 flex items-center gap-2 mb-4">
                            <Info className="w-5 h-5 text-indigo-500" />
                            ملاحظات إضافية
                        </h2>
                        <textarea
                            value={header.notes || ''}
                            onChange={(e) => setHeader({ ...header, notes: e.target.value })}
                            className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all min-h-[100px]"
                            placeholder="أي شروط خاصة أو ملاحظات للموردين..."
                        />
                    </div>
                </div>

                {/* Sidebar (Details) */}
                <div className="space-y-6">
                    <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 space-y-4">
                        <h2 className="font-bold text-slate-700 pb-2 border-b border-slate-100 flex items-center gap-2">
                            <FileText className="w-5 h-5 text-indigo-500" />
                            تفاصيل الطلب
                        </h2>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-600 mb-1.5">رقم الطلب</label>
                                <div className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-500 font-mono">
                                    {header.request_no}
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-600 mb-1.5">تاريخ الطلب</label>
                                <div className="relative">
                                    <input
                                        type="date"
                                        value={header.date}
                                        onChange={(e) => setHeader({ ...header, date: e.target.value })}
                                        className="w-full pl-3 pr-10 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all"
                                    />
                                    <Calendar className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-600 mb-1.5">تاريخ الاحتياج (Needed By)</label>
                                <div className="relative">
                                    <input
                                        type="date"
                                        value={header.needed_date || ''}
                                        onChange={(e) => setHeader({ ...header, needed_date: e.target.value })}
                                        className="w-full pl-3 pr-10 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all"
                                    />
                                    <Calendar className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-600 mb-1.5">الموظف الطالب</label>
                                <div className="relative">
                                    <select
                                        value={header.requester_id || ''}
                                        onChange={(e) => setHeader({ ...header, requester_id: e.target.value })}
                                        className="w-full pl-3 pr-10 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all appearance-none"
                                    >
                                        <option value="">-- اختر الموظف --</option>
                                        {employees.map(e => (
                                            <option key={e.id} value={e.id}>{e.name}</option>
                                        ))}
                                    </select>
                                    <User className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-600 mb-1.5">الحالة</label>
                                <select
                                    value={header.status}
                                    onChange={(e) => setHeader({ ...header, status: e.target.value as any })}
                                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all"
                                >
                                    <option value="OPEN">مفتوح</option>
                                    <option value="CLOSED">مغلق</option>
                                    <option value="CANCELLED">ملغى</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RFQForm;
