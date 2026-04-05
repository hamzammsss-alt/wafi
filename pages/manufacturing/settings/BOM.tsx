import React, { useState, useEffect } from 'react';
import {
    Layers, Plus, Save, Trash2, ArrowRight
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const BOM = () => {
    const navigate = useNavigate();
    const [items, setItems] = useState<any[]>([]);
    const [units, setUnits] = useState<any[]>([]);
    const [boms, setBoms] = useState<any[]>([]);

    // View Mode: 'LIST' or 'FORM'
    const [mode, setMode] = useState('LIST');

    const [header, setHeader] = useState({
        product_id: '',
        product_name: '',
        batch_size: 1,
        notes: ''
    });

    const [lines, setLines] = useState<any[]>([
        { item_id: '', quantity: 1, unit_id: '', wastage_percent: 0 }
    ]);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        // @ts-ignore
        const i = await window.electronAPI.inventory.getItems();
        setItems(i || []);
        // @ts-ignore
        const u = await window.electronAPI.inventory.getUnits();
        setUnits(u || []);
        // @ts-ignore
        const list = await window.electronAPI.manufacturing.getBOMs();
        setBoms(list || []);
    };

    const handleSave = async () => {
        if (!header.product_id) { alert("اختر المنتج النهائي"); return; }

        const productName = items.find(i => i.id === header.product_id)?.name_ar;

        try {
            // @ts-ignore
            await window.electronAPI.manufacturing.createBOM({ ...header, product_name: productName }, lines);
            alert("تم حفظ المعادلة بنجاح");
            setMode('LIST');
            loadData();
            // Reset
            setHeader({ product_id: '', product_name: '', batch_size: 1, notes: '' });
            setLines([{ item_id: '', quantity: 1, unit_id: '', wastage_percent: 0 }]);
        } catch (error: any) {
            alert("خطأ: " + error.message);
        }
    };

    const addLine = () => {
        setLines([...lines, { item_id: '', quantity: 1, unit_id: '', wastage_percent: 0 }]);
    };

    const removeLine = (index: number) => {
        const newLines = [...lines];
        newLines.splice(index, 1);
        setLines(newLines);
    };

    const updateLine = (index: number, field: string, value: any) => {
        const newLines = [...lines];
        newLines[index][field] = value;

        // Auto-set unit if item selected
        if (field === 'item_id') {
            const item = items.find(i => i.id === value);
            if (item) newLines[index]['unit_id'] = item.base_unit_id;
        }

        setLines(newLines);
    };

    return (
        <div className="p-6 space-y-6 bg-gray-50/50 min-h-screen font-sans" dir="rtl">

            <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500">
                        <ArrowRight className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                            <Layers className="w-6 h-6 text-indigo-600" />
                            معادلات التصنيع (BOM)
                        </h1>
                        <span className="text-sm text-gray-500">إدارة وصفات الإنتاج ومكوناتها</span>
                    </div>
                </div>
                {mode === 'LIST' ? (
                    <button
                        onClick={() => setMode('FORM')}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium"
                    >
                        <Plus className="w-4 h-4" />
                        معادلة جديدة
                    </button>
                ) : (
                    <button
                        onClick={() => setMode('LIST')}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
                    >
                        إلغاء
                    </button>
                )}
            </div>

            {mode === 'LIST' ? (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <table className="w-full text-right">
                        <thead className="bg-gray-50 text-xs text-gray-500 uppercase border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-3">رقم المعادلة</th>
                                <th className="px-6 py-3">المنتج النهائي</th>
                                <th className="px-6 py-3">حجم الدفعة</th>
                                <th className="px-6 py-3">التكلفة التقديرية</th>
                                <th className="px-6 py-3">ملاحظات</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {boms.map((bom) => (
                                <tr key={bom.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-mono">{bom.bom_no}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-800">{bom.product_name_ar}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{bom.batch_size}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{bom.estimated_cost}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{bom.notes}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {boms.length === 0 && (
                        <div className="p-12 text-center text-gray-400">
                            <Layers className="w-12 h-12 mx-auto mb-4 opacity-20" />
                            <p>لا يوجد معادلات معرفة</p>
                        </div>
                    )}
                </div>
            ) : (
                <div className="space-y-6">
                    {/* Header Form */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                        <h3 className="text-lg font-bold text-gray-800 mb-4 border-b pb-2">بيانات المنتج النهائي</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">المنتج النهائي</label>
                                <select
                                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                                    value={header.product_id}
                                    onChange={(e) => setHeader({ ...header, product_id: e.target.value })}
                                >
                                    <option value="">اختر المنتج...</option>
                                    {items.filter(i => i.type !== 'Service').map(item => (
                                        <option key={item.id} value={item.id}>{item.name_ar} ({item.code})</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">كمية الإنتاج القياسية (Batch)</label>
                                <input
                                    type="number"
                                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                                    value={header.batch_size}
                                    onChange={(e) => setHeader({ ...header, batch_size: Number(e.target.value) })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">ملاحظات</label>
                                <input
                                    type="text"
                                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                                    value={header.notes}
                                    onChange={(e) => setHeader({ ...header, notes: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Lines Form */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                        <div className="flex justify-between items-center mb-4 border-b pb-2">
                            <h3 className="text-lg font-bold text-gray-800">المواد الخام (المكونات)</h3>
                            <button onClick={addLine} className="text-indigo-600 hover:text-indigo-800 text-sm font-bold flex items-center gap-1">
                                <Plus className="w-4 h-4" /> إضافة مادة
                            </button>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="text-right text-gray-500 text-sm">
                                        <th className="pb-2 w-10">#</th>
                                        <th className="pb-2 w-1/3">المادة الخام</th>
                                        <th className="pb-2 w-32">الكمية</th>
                                        <th className="pb-2 w-32">الوحدة</th>
                                        <th className="pb-2 w-32">هالك %</th>
                                        <th className="pb-2 w-10"></th>
                                    </tr>
                                </thead>
                                <tbody className="space-y-2">
                                    {lines.map((line, idx) => (
                                        <tr key={idx}>
                                            <td className="py-2 text-gray-400">{idx + 1}</td>
                                            <td className="py-2 px-1">
                                                <select
                                                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg"
                                                    value={line.item_id}
                                                    onChange={(e) => updateLine(idx, 'item_id', e.target.value)}
                                                >
                                                    <option value="">اختر المادة...</option>
                                                    {items.map(item => (
                                                        <option key={item.id} value={item.id}>{item.name_ar}</option>
                                                    ))}
                                                </select>
                                            </td>
                                            <td className="py-2 px-1">
                                                <input
                                                    type="number"
                                                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg"
                                                    value={line.quantity}
                                                    onChange={(e) => updateLine(idx, 'quantity', Number(e.target.value))}
                                                />
                                            </td>
                                            <td className="py-2 px-1">
                                                <select
                                                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg"
                                                    value={line.unit_id}
                                                    onChange={(e) => updateLine(idx, 'unit_id', e.target.value)}
                                                >
                                                    <option value="">-</option>
                                                    {units.map(u => (
                                                        <option key={u.id} value={u.id}>{u.name_ar}</option>
                                                    ))}
                                                </select>
                                            </td>
                                            <td className="py-2 px-1">
                                                <input
                                                    type="number"
                                                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg"
                                                    value={line.wastage_percent}
                                                    onChange={(e) => updateLine(idx, 'wastage_percent', Number(e.target.value))}
                                                />
                                            </td>
                                            <td className="py-2 px-1 text-center">
                                                <button onClick={() => removeLine(idx)} className="text-red-400 hover:text-red-600">
                                                    <Trash2 className="w-5 h-5" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="flex justify-end gap-2">
                        <button
                            onClick={handleSave}
                            className="flex items-center gap-2 px-8 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-bold shadow-lg shadow-indigo-600/20"
                        >
                            <Save className="w-5 h-5" />
                            حفظ المعادلة
                        </button>
                    </div>

                </div>
            )}

        </div>
    );
};

export { BOM };
