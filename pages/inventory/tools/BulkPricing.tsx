import React, { useState, useEffect } from 'react';
import { Item, Brand, Category } from '../../../types';

const BulkPricing = () => {
    // Data Stats
    const [items, setItems] = useState<Item[]>([]);
    const [brands, setBrands] = useState<Brand[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);

    // Filters
    const [filterName, setFilterName] = useState('');
    const [filterBrand, setFilterBrand] = useState('');
    const [filterCategory, setFilterCategory] = useState('');

    // Operations
    const [targetField, setTargetField] = useState<'sale_price' | 'cost_price' | 'min_price'>('sale_price');
    const [operationType, setOperationType] = useState<'PERCENT' | 'FIXED'>('PERCENT');
    const [operationAction, setOperationAction] = useState<'INCREASE' | 'DECREASE' | 'SET'>('INCREASE');
    const [value, setValue] = useState<number>(0);

    // Filtered Items (Source for operations)
    const [filteredItems, setFilteredItems] = useState<Item[]>([]);

    // Preview Data
    const [previewData, setPreviewData] = useState<any[]>([]);

    const [loading, setLoading] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    useEffect(() => {
        applyFilters();
    }, [items, filterName, filterBrand, filterCategory]);

    useEffect(() => {
        calculatePreview();
    }, [filteredItems, targetField, operationType, operationAction, value]);

    const loadData = async () => {
        try {
            const [i, b, c] = await Promise.all([
                window.electronAPI.inventory.getItems(),
                window.electronAPI.inventory.getBrands(),
                window.electronAPI.inventory.getCategories()
            ]);
            setItems(i);
            setBrands(b);
            setCategories(c);
        } catch (e) {
            console.error("Failed to load data", e);
        }
    };

    const applyFilters = () => {
        let res = items;
        if (filterName) {
            res = res.filter(i =>
                i.name_ar.includes(filterName) ||
                (i.code && i.code.includes(filterName))
            );
        }
        if (filterBrand) res = res.filter(i => i.brand_id === filterBrand);
        if (filterCategory) res = res.filter(i => i.category_id === filterCategory);
        setFilteredItems(res);
    };

    const calculatePreview = () => {
        if (!value && operationAction !== 'SET') {
            setPreviewData([]);
            return;
        }

        const data = filteredItems.map(item => {
            const currentPrice = Number(item[targetField] || 0);
            let newPrice = currentPrice;

            if (operationAction === 'SET') {
                newPrice = value;
            } else {
                const val = operationType === 'PERCENT' ? (currentPrice * (value / 100)) : value;
                if (operationAction === 'INCREASE') newPrice += val;
                if (operationAction === 'DECREASE') newPrice -= val;
            }

            // Round to 2 decimals
            newPrice = Math.round(newPrice * 100) / 100;

            return {
                id: item.id,
                code: item.code,
                name: item.name_ar,
                currentPrice,
                newPrice,
                diff: newPrice - currentPrice
            };
        });
        setPreviewData(data);
    };

    const handleExecute = async () => {
        if (previewData.length === 0) return;
        if (!window.confirm(`سيتم تحديث أسعار ${previewData.length} صنف. هل أنت متأكد؟`)) return;

        setLoading(true);
        try {
            // Prepare Payload
            const updates = previewData.map(p => ({
                id: p.id,
                [targetField]: p.newPrice
            }));

            await window.electronAPI.inventory.bulkUpdateItems(updates);

            alert('تم التحديث بنجاح!');
            loadData(); // Reload to reflect changes
            setValue(0); // Reset
        } catch (e) {
            console.error(e);
            alert('حدث خطأ أثناء التحديث');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6 h-full flex flex-col max-w-6xl mx-auto">
            <h1 className="text-3xl font-bold mb-6 text-gray-800">تعديل الأسعار الجماعي (Bulk Updates)</h1>

            {/* Top Section: Filters */}
            <div className="bg-white p-4 rounded shadow mb-4 grid grid-cols-1 md:grid-cols-3 gap-4 border-t-4 border-blue-500">
                <div>
                    <label className="block text-sm font-medium mb-1">بحث (اسم / كود)</label>
                    <input
                        className="w-full border rounded p-2"
                        value={filterName} onChange={e => setFilterName(e.target.value)}
                        placeholder="...بحث"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1">العلامة التجارية</label>
                    <select className="w-full border rounded p-2" value={filterBrand} onChange={e => setFilterBrand(e.target.value)}>
                        <option value="">(الكل)</option>
                        {brands.map(b => (
                            <option key={b.id} value={b.id}>{b.name_ar}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1">الفئة</label>
                    <select className="w-full border rounded p-2" value={filterCategory} onChange={e => setFilterCategory(e.target.value)}>
                        <option value="">(الكل)</option>
                        {categories.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Middle Section: Operation */}
            <div className="bg-white p-4 rounded shadow mb-4 grid grid-cols-1 md:grid-cols-4 gap-4 border-t-4 border-green-500 items-end">
                <div>
                    <label className="block text-sm font-medium mb-1">السعر المستهدف</label>
                    <select
                        className="w-full border rounded p-2 bg-gray-50"
                        value={targetField}
                        onChange={e => setTargetField(e.target.value as any)}
                    >
                        <option value="sale_price">سعر البيع (Sale Price)</option>
                        <option value="cost_price">سعر التكلفة (Cost Price)</option>
                        <option value="min_price">أقل سعر بيع (Min Price)</option>
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1">العملية</label>
                    <div className="flex gap-1">
                        <select
                            className="w-1/2 border rounded p-2"
                            value={operationAction}
                            onChange={e => setOperationAction(e.target.value as any)}
                        >
                            <option value="INCREASE">زيادة (+)</option>
                            <option value="DECREASE">خصم (-)</option>
                            <option value="SET">تعيين قيمة (=)</option>
                        </select>
                        <select
                            className="w-1/2 border rounded p-2"
                            value={operationType}
                            onChange={e => setOperationType(e.target.value as any)}
                            disabled={operationAction === 'SET'}
                        >
                            <option value="PERCENT">نسبة %</option>
                            <option value="FIXED">مبلغ ثابت</option>
                        </select>
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1">القيمة</label>
                    <input
                        type="number"
                        step="0.01"
                        className="w-full border rounded p-2 font-bold text-lg text-center"
                        value={value}
                        onChange={e => setValue(parseFloat(e.target.value) || 0)}
                    />
                </div>
                <div>
                    <button
                        onClick={handleExecute}
                        disabled={loading || previewData.length === 0}
                        className={`w-full py-2 rounded text-white font-bold shadow ${loading || previewData.length === 0 ? 'bg-gray-400' : 'bg-green-600 hover:bg-green-700'
                            }`}
                    >
                        {loading ? 'جاري التحديث...' : `تنفيذ التحديث (${previewData.length})`}
                    </button>
                </div>
            </div>

            {/* Bottom Section: Grid */}
            <div className="bg-white rounded shadow overflow-hidden flex-1 flex flex-col">
                <div className="bg-gray-50 p-2 border-b flex justify-between items-center text-sm text-gray-500 px-4">
                    <span>نتائج المعاينة (Preview)</span>
                    <span>عدد الأصناف: {filteredItems.length}</span>
                </div>
                <div className="overflow-auto flex-1 p-0">
                    <table className="w-full text-right text-sm">
                        <thead className="bg-gray-100 sticky top-0">
                            <tr>
                                <th className="p-3 border-b">الرمز</th>
                                <th className="p-3 border-b">اسم الصنف</th>
                                <th className="p-3 border-b w-32">السعر الحالي</th>
                                <th className="p-3 border-b w-32">السعر الجديد</th>
                                <th className="p-3 border-b w-24">الفرق</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {previewData.map(row => (
                                <tr key={row.id} className="hover:bg-blue-50">
                                    <td className="p-3">{row.code}</td>
                                    <td className="p-3 font-medium">{row.name}</td>
                                    <td className="p-3 font-mono">{row.currentPrice.toFixed(2)}</td>
                                    <td className="p-3">
                                        <span className={`px-2 py-1 rounded font-bold ${row.newPrice > row.currentPrice ? 'bg-green-100 text-green-700' :
                                                row.newPrice < row.currentPrice ? 'bg-red-100 text-red-700' : 'bg-gray-100'
                                            }`}>
                                            {row.newPrice.toFixed(2)}
                                        </span>
                                    </td>
                                    <td className="p-3 text-gray-500 dir-ltr text-left">
                                        {row.diff > 0 ? '+' : ''}{row.diff.toFixed(2)}
                                    </td>
                                </tr>
                            ))}
                            {previewData.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="p-8 text-center text-gray-400">
                                        قم بتحديد الفلاتر والقيم لعرض النتائج
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default BulkPricing;
