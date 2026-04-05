import React, { useState, useEffect } from 'react';
import { Save, Plus, Trash2, Box, Layers, Search, RefreshCw } from 'lucide-react';

export const BillOfMaterials = () => {
    const [loading, setLoading] = useState(false);
    const [products, setProducts] = useState<any[]>([]); // All products (Raw & Finished)
    const [boms, setBoms] = useState<any[]>([]); // Existing BOMs

    // BOM Header
    const [name, setName] = useState('');
    const [finishedProductId, setFinishedProductId] = useState('');

    // Composition
    const [rows, setRows] = useState<any[]>([
        { id: 1, rawProductId: '', quantity: 1, cost: 0 }
    ]);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        // @ts-ignore
        if (window.electronAPI) {
            setLoading(true);
            try {
                // @ts-ignore
                const [prods, existingBoms] = await Promise.all([
                    // @ts-ignore
                    window.electronAPI.getProducts(''),
                    // @ts-ignore
                    window.electronAPI.getBoms()
                ]);
                setProducts(prods || []);
                setBoms(existingBoms || []);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        }
    };

    const addRow = () => {
        setRows([...rows, { id: rows.length + 1, rawProductId: '', quantity: 1, cost: 0 }]);
    };

    const updateRow = (id: number, field: string, value: any) => {
        setRows(prev => prev.map(r => {
            if (r.id === id) {
                const updated = { ...r, [field]: value };
                if (field === 'rawProductId') {
                    const p = products.find(x => x.id === value);
                    updated.cost = p ? p.cost_price : 0;
                }
                return updated;
            }
            return r;
        }));
    };

    const handleSave = async () => {
        if (!finishedProductId || !name) {
            alert("الرجاء تحديد المنتج النهائي واسم الوصفة");
            return;
        }
        if (rows.filter(r => r.rawProductId).length === 0) {
            alert("الرجاء إضافة مواد خام");
            return;
        }

        try {
            setLoading(true);
            // @ts-ignore
            await window.electronAPI.saveBom({
                finishedProductId,
                name,
                items: rows.filter(r => r.rawProductId)
            });
            alert("تم حفظ معادلة التصنيع بنجاح!");
            setName('');
            setFinishedProductId('');
            setRows([{ id: 1, rawProductId: '', quantity: 1, cost: 0 }]);
            loadData();
        } catch (err: any) {
            alert("خطأ: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    const estimatedCost = rows.reduce((sum, r) => sum + (r.quantity * r.cost), 0);

    return (
        <div className="flex flex-col h-full bg-gray-50 font-sans" dir="rtl">
            <div className="flex justify-between items-center bg-white p-4 border-b">
                <h1 className="text-xl font-bold flex items-center gap-2 text-gray-800">
                    <Layers className="text-purple-600" /> تعريف وجبات الإنتاج (BOM)
                </h1>
                <button
                    onClick={handleSave}
                    disabled={loading}
                    className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg font-bold flex items-center gap-2 disabled:opacity-50 shadow-sm transition"
                >
                    <Save size={18} /> حفظ المعادلة
                </button>
            </div>

            <div className="flex-1 overflow-auto p-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left: Input Form */}
                    <div className="lg:col-span-2 space-y-6">

                        {/* Header Card */}
                        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                            <h2 className="font-bold text-gray-700 mb-4 flex items-center gap-2">
                                <Box size={18} /> المنتج النهائي
                            </h2>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-600 mb-1">اسم الوصفة / الوجبة</label>
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={e => setName(e.target.value)}
                                        className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-purple-200 focus:border-purple-500"
                                        placeholder="مثال: خلطة الطلاء الأساسية"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-600 mb-1">المنتج الناتج</label>
                                    <select
                                        value={finishedProductId}
                                        onChange={e => setFinishedProductId(e.target.value)}
                                        className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-purple-200 focus:border-purple-500"
                                    >
                                        <option value="">-- اختر المنتج النهائي --</option>
                                        {products.map(p => (
                                            <option key={p.id} value={p.id}>{p.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Ingredients Card */}
                        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                            <h2 className="font-bold text-gray-700 mb-4">المكونات (المواد الخام)</h2>
                            <table className="w-full border-collapse">
                                <thead className="bg-gray-50 text-gray-600 text-sm">
                                    <tr>
                                        <th className="p-3 text-right rounded-r-lg">المادة الخام</th>
                                        <th className="p-3 text-center">الكمية المطلوبة</th>
                                        <th className="p-3 text-center">التكلفة التقديرية</th>
                                        <th className="p-3 w-10 rounded-l-lg"></th>
                                    </tr>
                                </thead>
                                <tbody className="text-sm">
                                    {rows.map((row, idx) => (
                                        <tr key={row.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50 transition">
                                            <td className="p-2">
                                                <select
                                                    value={row.rawProductId}
                                                    onChange={e => updateRow(row.id, 'rawProductId', e.target.value)}
                                                    className="w-full border border-gray-300 rounded p-1.5 focus:border-purple-500"
                                                >
                                                    <option value="">-- اختر مادة خام --</option>
                                                    {products.map(p => (
                                                        <option key={p.id} value={p.id}>{p.name}</option>
                                                    ))}
                                                </select>
                                            </td>
                                            <td className="p-2 text-center">
                                                <input
                                                    type="number"
                                                    value={row.quantity}
                                                    min="0.1" step="0.1"
                                                    onChange={e => updateRow(row.id, 'quantity', e.target.value)}
                                                    className="w-24 border border-gray-300 rounded p-1.5 text-center font-bold text-purple-700"
                                                />
                                            </td>
                                            <td className="p-2 text-center text-gray-500">
                                                {(row.quantity * row.cost).toFixed(2)}
                                            </td>
                                            <td className="p-2 text-center">
                                                <button onClick={() => setRows(rows.filter(r => r.id !== row.id))} className="text-gray-400 hover:text-red-500">
                                                    <Trash2 size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            <button onClick={addRow} className="mt-4 text-purple-600 hover:text-purple-800 text-sm font-bold flex items-center gap-1 transition">
                                <Plus size={16} /> إضافة سطر جديد
                            </button>

                            <div className="mt-8 pt-4 border-t flex justify-between items-center bg-purple-50 p-4 rounded-lg border-purple-100">
                                <span className="font-bold text-purple-900">تكلفة الانتاج التقديرية للقطعة الواحدة</span>
                                <span className="text-2xl font-black text-purple-700 font-mono">{estimatedCost.toFixed(2)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Right: Existing BOMs List */}
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col h-[500px]">
                        <div className="p-4 border-b bg-gray-50 font-bold text-gray-700 flex justify-between items-center rounded-t-xl">
                            <span>المعادلات المحفوظة</span>
                            <RefreshCw size={14} className="cursor-pointer hover:rotate-180 transition duration-300" onClick={loadData} />
                        </div>
                        <div className="flex-1 overflow-auto p-2 space-y-2">
                            {boms.length === 0 ? (
                                <div className="text-center text-gray-400 mt-10 p-4">لا توجد معادلات محفوظة</div>
                            ) : (
                                boms.map((bom, idx) => (
                                    <div key={idx} className="p-3 border rounded hover:bg-purple-50 cursor-pointer transition group">
                                        <div className="font-bold text-gray-800">{bom.name}</div>
                                        <div className="text-xs text-gray-500 mt-1">المنتج: {bom.product_name}</div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
