import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Save, ArrowLeft, Printer } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';

export const PurchaseReturnForm: React.FC = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const isNew = !id || id === 'new';

    // Master Data
    const [suppliers, setSuppliers] = useState<any[]>([]);
    const [items, setItems] = useState<any[]>([]);
    const [warehouses, setWarehouses] = useState<any[]>([]);
    const [units, setUnits] = useState<any[]>([]);

    const [header, setHeader] = useState<any>({
        return_no: 'NEW',
        date: new Date().toISOString().split('T')[0],
        supplier_id: '',
        warehouse_id: '',
        currency_id: 'ILS',
        exchange_rate: 1,
        notes: ''
    });

    const [lines, setLines] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        loadMasterData();
        if (!isNew) {
            loadReturn(id);
        }
    }, [id]);

    const loadMasterData = async () => {
        try {
            const [suppliersData, warehousesData, itemsData, unitsData] = await Promise.all([
                window.electronAPI.partner.getPartners('SUPPLIER'),
                window.electronAPI.getWarehouses(),
                window.electronAPI.inventory.getItems(),
                window.electronAPI.inventory.getUnits()
            ]);
            setSuppliers(suppliersData || []);
            setWarehouses(warehousesData || []);
            setItems(itemsData || []);
            setUnits(unitsData || []);

            // Set default warehouse
            if (warehousesData && warehousesData.length > 0) {
                setHeader((prev: any) => ({ ...prev, warehouse_id: warehousesData[0].id }));
            }
        } catch (error) {
            console.error("Failed to load master data", error);
        }
    };

    const loadReturn = async (returnId: string) => {
        try {
            setLoading(true);
            const data = await window.electronAPI.purchase.getReturn(returnId);
            if (data) {
                setHeader(data.header);
                setLines(data.lines);
            }
        } catch (error) {
            console.error("Failed to load return", error);
            alert("فشل تحميل بيانات المردود");
        } finally {
            setLoading(false);
        }
    };

    const addLine = () => {
        setLines([...lines, {
            id: Date.now().toString(), // Temp ID
            item_id: '',
            quantity: 1,
            unit_id: '',
            unit_price: 0,
            total: 0,
            tax_amount: 0
        }]);
    };

    const updateLine = (index: number, field: string, value: any) => {
        const newLines = [...lines];
        const line = newLines[index];
        line[field] = value;

        if (field === 'item_id') {
            const item = items.find(i => i.id === value);
            if (item) {
                line.unit_price = item.cost_price || 0;
                line.unit_id = item.base_unit_id;
            }
        }

        // Calculations
        const qty = Number(line.quantity) || 0;
        const price = Number(line.unit_price) || 0;
        line.total = qty * price;

        setLines(newLines);
    };

    const removeLine = (index: number) => {
        setLines(lines.filter((_, i) => i !== index));
    };

    const calculateTotals = () => {
        const subtotal = lines.reduce((sum, line) => sum + (line.total || 0), 0);
        const taxTotal = lines.reduce((sum, line) => sum + (line.tax_amount || 0), 0);
        return {
            subtotal,
            taxTotal,
            grandTotal: subtotal + taxTotal
        };
    };

    const handleSave = async () => {
        if (!header.supplier_id) {
            alert("الرجاء اختيار المورد");
            return;
        }
        if (lines.length === 0) {
            alert("الرجاء إضافة أصناف");
            return;
        }

        try {
            setLoading(true);
            const totals = calculateTotals();
            const payload = {
                header: {
                    ...header,
                    subtotal: totals.subtotal,
                    tax_total: totals.taxTotal,
                    grand_total: totals.grandTotal
                },
                lines
            };

            const result = await window.electronAPI.purchase.createReturn(payload);
            if (result.success) {
                alert(`تم حفظ المردود رقم ${result.return_no} بنجاح`);
                if (isNew) {
                    navigate(`/purchasing/returns/${result.id}`);
                } else {
                    loadReturn(result.id);
                }
            }
        } catch (error: any) {
            console.error(error);
            alert(error.message || "فشل الحفظ");
        } finally {
            setLoading(false);
        }
    };

    const totals = calculateTotals();

    return (
        <div className="p-6 space-y-6 max-w-[1200px] mx-auto animate-in fade-in duration-500">
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate('/purchasing/returns')}
                        className="p-2 hover:bg-gray-100 rounded-full text-gray-600 transition-colors"
                    >
                        <ArrowLeft className="h-5 w-5" />
                    </button>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-gray-900">
                            {isNew ? 'مردود مشتريات جديد' : `مردود رقم ${header.return_no}`}
                        </h1>
                        <p className="text-gray-500 mt-1">إرجاع بضائع للمورد (إشعار مدين)</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    {!isNew && (
                        <button
                            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 text-gray-700 font-medium"
                            onClick={() => window.open(`/print/purchase-return/${id}`, '_blank')}
                        >
                            <Printer className="h-4 w-4 ml-2" />
                            طباعة
                        </button>
                    )}
                    <button
                        onClick={handleSave}
                        disabled={loading || (!isNew && header.status === 'POSTED')}
                        className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm font-medium"
                    >
                        <Save className="h-4 w-4 ml-2" />
                        {loading ? 'جاري الحفظ...' : 'حفظ وترحيل'}
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-3 bg-white rounded-lg shadow border border-gray-200">
                    <div className="p-4 border-b border-gray-200 bg-gray-50 rounded-t-lg">
                        <h3 className="font-semibold text-gray-900">بيانات أساسية</h3>
                    </div>
                    <div className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">رقم المردود</label>
                                <input
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-500"
                                    value={header.return_no}
                                    disabled
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">التاريخ</label>
                                <input
                                    type="date"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                    value={header.date}
                                    onChange={(e) => setHeader({ ...header, date: e.target.value })}
                                    disabled={!isNew}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">المورد</label>
                                <select
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={header.supplier_id}
                                    onChange={(e) => setHeader({ ...header, supplier_id: e.target.value })}
                                    disabled={!isNew}
                                >
                                    <option value="">اختر المورد</option>
                                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.name_ar}</option>)}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">المستودع (المصدر)</label>
                                <select
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={header.warehouse_id}
                                    onChange={(e) => setHeader({ ...header, warehouse_id: e.target.value })}
                                    disabled={!isNew}
                                >
                                    <option value="">اختر المستودع</option>
                                    {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                                </select>
                            </div>
                            <div className="space-y-2 col-span-2">
                                <label className="text-sm font-medium text-gray-700">ملاحظات</label>
                                <input
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={header.notes}
                                    onChange={(e) => setHeader({ ...header, notes: e.target.value })}
                                    disabled={!isNew && header.status === 'POSTED'}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="md:col-span-3 bg-white rounded-lg shadow border border-gray-200">
                    <div className="p-4 border-b border-gray-200 bg-gray-50 rounded-t-lg flex justify-between items-center">
                        <h3 className="font-semibold text-gray-900">الأصناف المرجعة</h3>
                        {isNew && (
                            <button
                                onClick={addLine}
                                className="flex items-center gap-1 text-sm bg-blue-50 text-blue-600 px-3 py-1.5 rounded-md hover:bg-blue-100 transition-colors font-medium border border-blue-200"
                            >
                                <Plus className="h-4 w-4" /> إضافة صنف
                            </button>
                        )}
                    </div>
                    <div className="p-0 overflow-x-auto">
                        <table className="w-full text-right text-sm">
                            <thead className="bg-gray-50 text-gray-700 font-medium border-b border-gray-200">
                                <tr>
                                    <th className="px-4 py-3 w-[30%]">الصنف</th>
                                    <th className="px-4 py-3 w-[15%]">الوحدة</th>
                                    <th className="px-4 py-3 w-[15%]">الكمية</th>
                                    <th className="px-4 py-3 w-[15%]">السعر</th>
                                    <th className="px-4 py-3 w-[15%]">الإجمالي</th>
                                    <th className="px-4 py-3 w-[10%]"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {lines.map((line, index) => (
                                    <tr key={line.id || index} className="group hover:bg-gray-50">
                                        <td className="p-2">
                                            <select
                                                className="w-full px-2 py-1.5 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                                                value={line.item_id}
                                                onChange={(e) => updateLine(index, 'item_id', e.target.value)}
                                                disabled={!isNew}
                                            >
                                                <option value="">اختر..</option>
                                                {items.map(i => <option key={i.id} value={i.id}>{i.name_ar}</option>)}
                                            </select>
                                        </td>
                                        <td className="p-2">
                                            <select
                                                className="w-full px-2 py-1.5 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                                                value={line.unit_id}
                                                onChange={(e) => updateLine(index, 'unit_id', e.target.value)}
                                                disabled={!isNew}
                                            >
                                                {units.map(u => <option key={u.id} value={u.id}>{u.name_ar || u.name}</option>)}
                                            </select>
                                        </td>
                                        <td className="p-2">
                                            <input
                                                type="number"
                                                min="0"
                                                className="w-full px-2 py-1.5 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                                                value={line.quantity}
                                                onChange={(e) => updateLine(index, 'quantity', e.target.value)}
                                                disabled={!isNew}
                                            />
                                        </td>
                                        <td className="p-2">
                                            <input
                                                type="number"
                                                min="0"
                                                className="w-full px-2 py-1.5 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                                                value={line.unit_price}
                                                onChange={(e) => updateLine(index, 'unit_price', e.target.value)}
                                                disabled={!isNew}
                                            />
                                        </td>
                                        <td className="p-2 font-medium text-gray-900">
                                            {Number(line.total).toFixed(2)}
                                        </td>
                                        <td className="p-2 text-center">
                                            {isNew && (
                                                <button
                                                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors opacity-0 group-hover:opacity-100"
                                                    onClick={() => removeLine(index)}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {lines.length === 0 && (
                            <div className="text-center py-8 text-gray-400 border-t border-gray-200 border-dashed">
                                لا توجد أصناف مضافة
                            </div>
                        )}
                    </div>
                </div>

                <div className="md:col-span-3 flex justify-end">
                    <div className="bg-white rounded-lg shadow border border-gray-200 w-full md:w-1/3 overflow-hidden">
                        <div className="p-6 space-y-3">
                            <div className="flex justify-between text-gray-600">
                                <span>المجموع:</span>
                                <span className="font-medium">{totals.subtotal.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-gray-600">
                                <span>الضريبة:</span>
                                <span className="font-medium">{totals.taxTotal.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between items-center pt-4 border-t border-gray-200 mt-2">
                                <span className="font-bold text-gray-900 text-lg">الإجمالي النهائي:</span>
                                <span className="font-bold text-blue-600 text-xl">{totals.grandTotal.toFixed(2)} {header.currency_id}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
