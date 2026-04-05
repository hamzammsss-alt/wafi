import React, { useState, useEffect } from 'react';
import { Save, ArrowRight, User, Calendar, Plus, Trash2, FileText, Box, Info } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { useTabs } from '../../../src/contexts/TabsContext';

export const PurchaseRequestForm = () => {
    const { id } = useParams();
    const { closeTab, activeTabPath } = useTabs();
    const [loading, setLoading] = useState(false);

    const [header, setHeader] = useState({
        request_no: 'NEW',
        requester_id: '',
        branch_id: '',
        warehouse_id: '',
        date: new Date().toISOString().split('T')[0],
        needed_date: '',
        notes: ''
    });

    const [lines, setLines] = useState<any[]>([
        { id: Date.now(), item_id: '', description: '', quantity: 1, unit_id: '', notes: '' }
    ]);

    // Master Data
    const [items, setItems] = useState<any[]>([]);
    const [units, setUnits] = useState<any[]>([]);
    const [warehouses, setWarehouses] = useState<any[]>([]);
    const [employees, setEmployees] = useState<any[]>([]);

    useEffect(() => {
        loadMasterData();
        if (id && id !== 'new') {
            loadRequest(id);
        }
    }, [id]);

    const loadMasterData = async () => {
        try {
            const [itm, unt, wh, emp] = await Promise.all([
                window.electronAPI.inventory.getItems(),
                window.electronAPI.inventory.getUnits(),
                window.electronAPI.getWarehouses(),
                window.electronAPI.hr.getEmployees()
            ]);
            setItems(itm);
            setUnits(unt);
            setWarehouses(wh);
            setEmployees(emp);
            if (wh.length > 0) setHeader(h => ({ ...h, warehouse_id: wh[0].id, branch_id: wh[0].id }));
        } catch (error) {
            console.error(error);
        }
    };

    const loadRequest = async (requestId: string) => {
        try {
            const result = await window.electronAPI.purchase.getRequest(requestId);
            if (result && result.header) {
                setHeader(result.header);
                setLines(result.lines.map((l: any) => ({ ...l, id: l.id || Date.now() })));
            }
        } catch (error) {
            console.error(error);
            alert("فشل تحميل الطلب");
        }
    };

    const updateLine = (index: number, field: string, value: any) => {
        const newLines = [...lines];
        const line = { ...newLines[index], [field]: value };

        if (field === 'item_id') {
            const item = items.find(i => i.id === value);
            if (item) {
                line.description = item.name_ar;
                line.unit_id = item.base_unit_id;
            }
        }

        newLines[index] = line;
        setLines(newLines);
    };

    const addLine = () => {
        setLines([...lines, { id: Date.now(), item_id: '', description: '', quantity: 1, unit_id: '', notes: '' }]);
    };

    const removeLine = (index: number) => {
        setLines(lines.filter((_, i) => i !== index));
    };

    const handleSave = async () => {
        if (!header.warehouse_id) {
            alert('الرجاء اختيار المستودع');
            return;
        }

        if (lines.length === 0 || !lines[0].item_id) {
            alert('الرجاء إضافة أصناف');
            return;
        }

        const invalidLines = lines.filter(l => !l.item_id || l.quantity <= 0);
        if (invalidLines.length > 0) {
            alert('يرجى التأكد من اختيار الصنف وإدخال كمية صحيحة لجميع الأسطر');
            return;
        }

        setLoading(true);
        try {
            const data = { header, lines };
            if (id) {
                // Update existing
                const updateData = { header: { ...header, id }, lines };
                const result = await window.electronAPI.purchase.updateRequest(updateData);
                if (result.success) {
                    alert(`تم تعديل طلب الشراء رقم ${result.request_no}`);
                    closeTab(activeTabPath);
                }
            } else {
                // Create new
                const result = await window.electronAPI.purchase.createRequest(data);
                if (result.success) {
                    alert(`تم حفظ طلب الشراء رقم ${result.request_no}`);
                    closeTab(activeTabPath);
                }
            }
        } catch (error: any) {
            alert("خطأ: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6 bg-slate-50/50 min-h-screen font-sans" dir="rtl">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => closeTab(activeTabPath)}
                        className="p-2.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 hover:border-slate-300 text-slate-500 transition-all shadow-sm"
                    >
                        <ArrowRight className="w-5 h-5" />
                    </button>
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <h1 className="text-2xl font-bold text-slate-800">طلب شراء مواد</h1>
                            <span className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full text-xs font-bold border border-indigo-100">
                                {header.request_no === 'NEW' ? 'مسودة جديدة' : header.request_no}
                            </span>
                        </div>
                        <p className="text-sm text-slate-500 flex items-center gap-2">
                            <FileText className="w-4 h-4" />
                            تعبئة نموذج طلب المواد وتفاصيل الكميات
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={handleSave}
                        disabled={loading}
                        className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 hover:shadow-indigo-300 transition-all active:scale-95 disabled:opacity-70 disabled:active:scale-100"
                    >
                        {loading ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <Save className="w-5 h-5" />
                        )}
                        <span>حفظ الطلب</span>
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Right Column: Main Info */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Items Table */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <div className="flex items-center gap-2 text-slate-700 font-bold">
                                <Box className="w-5 h-5 text-indigo-500" />
                                <h3>قائمة الأصناف المطلوبة</h3>
                            </div>
                            <span className="text-xs text-slate-400 bg-white px-2 py-1 rounded border border-slate-200">
                                {lines.length} عناصر
                            </span>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-right">
                                <thead className="bg-slate-50 text-slate-600 font-bold text-sm">
                                    <tr>
                                        <th className="p-4 w-12 text-center">#</th>
                                        <th className="p-4 min-w-[240px]">الصنف</th>
                                        <th className="p-4 w-32">الكمية</th>
                                        <th className="p-4 w-32">الوحدة</th>
                                        <th className="p-4">ملاحظات الصنف</th>
                                        <th className="p-4 w-16"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {lines.map((line, idx) => (
                                        <tr key={line.id} className="hover:bg-slate-50/80 transition-colors group">
                                            <td className="p-4 text-center text-slate-400 text-sm font-mono">{idx + 1}</td>
                                            <td className="p-4">
                                                <select
                                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                                                    value={line.item_id}
                                                    onChange={e => updateLine(idx, 'item_id', e.target.value)}
                                                >
                                                    <option value="">اختر الصنف...</option>
                                                    {items.map(i => (
                                                        <option key={i.id} value={i.id}>{i.code} - {i.name_ar}</option>
                                                    ))}
                                                </select>
                                            </td>
                                            <td className="p-4">
                                                <input
                                                    type="number"
                                                    min="1"
                                                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-center font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                                                    value={line.quantity}
                                                    onChange={e => updateLine(idx, 'quantity', e.target.value)}
                                                />
                                            </td>
                                            <td className="p-4">
                                                <div className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-center text-slate-600">
                                                    {line.item_id && items.find(i => i.id === line.item_id)?.base_unit_id
                                                        ? units.find(u => u.id === items.find(i => i.id === line.item_id)?.base_unit_id)?.name_ar
                                                        : '-'}
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <input
                                                    type="text"
                                                    className="w-full bg-transparent border-b border-transparent hover:border-slate-200 focus:border-indigo-400 focus:bg-white rounded px-2 py-1 text-sm outline-none transition-all placeholder:text-slate-300"
                                                    value={line.notes}
                                                    onChange={e => updateLine(idx, 'notes', e.target.value)}
                                                    placeholder="اختياري..."
                                                />
                                            </td>
                                            <td className="p-4 text-center">
                                                <button
                                                    onClick={() => removeLine(idx)}
                                                    className="p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="p-3 bg-slate-50 border-t border-slate-100">
                            <button
                                onClick={addLine}
                                className="w-full py-3 border border-dashed border-slate-300 rounded-xl text-slate-500 font-medium hover:border-indigo-500 hover:text-indigo-600 hover:bg-indigo-50 transition-all flex justify-center items-center gap-2"
                            >
                                <Plus className="w-5 h-5" />
                                إضافة سطر جديد
                            </button>
                        </div>
                    </div>
                </div>

                {/* Left Column: Metadata */}
                <div className="space-y-6">
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-6">
                        <div className="flex items-center gap-2 text-slate-800 font-bold text-lg pb-4 border-b border-slate-100">
                            <Info className="w-5 h-5 text-indigo-500" />
                            <h2>بيانات الطلب</h2>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">المستودع الطالب</label>
                            <div className="relative">
                                <select
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all appearance-none"
                                    value={header.warehouse_id}
                                    onChange={e => setHeader({ ...header, warehouse_id: e.target.value })}
                                >
                                    <option value="">اختر المستودع...</option>
                                    {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                                </select>
                                <div className="absolute left-3 top-3 pointer-events-none text-slate-400">
                                    <Box className="w-4 h-4" />
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">مقدم الطلب</label>
                            <div className="relative">
                                <select
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all appearance-none"
                                    value={header.requester_id}
                                    onChange={e => setHeader({ ...header, requester_id: e.target.value })}
                                >
                                    <option value="">اختر الموظف...</option>
                                    {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                                </select>
                                <div className="absolute left-3 top-3 pointer-events-none text-slate-400">
                                    <User className="w-4 h-4" />
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">تاريخ الطلب</label>
                                <input
                                    type="date"
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                                    value={header.date}
                                    onChange={e => setHeader({ ...header, date: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">تاريخ الحاجة</label>
                                <input
                                    type="date"
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                                    value={header.needed_date}
                                    onChange={e => setHeader({ ...header, needed_date: e.target.value })}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">ملاحظات إضافية</label>
                            <textarea
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all min-h-[100px] resize-none"
                                value={header.notes}
                                onChange={e => setHeader({ ...header, notes: e.target.value })}
                                placeholder="اكتب أي ملاحظات تتعلق بطلب الشراء هنا..."
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
