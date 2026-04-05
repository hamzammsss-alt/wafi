import React, { useState, useEffect } from 'react';
import { Save, User, ShoppingCart, Calendar, Plus, Trash2, Search, ArrowRight, Printer, Calculator, Truck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const PurchaseOrder = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [header, setHeader] = useState({
        supplier_id: '',
        branch_id: '',
        date: new Date().toISOString().split('T')[0],
        delivery_date: new Date().toISOString().split('T')[0],
        order_no: 'NEW',
        currency_id: 'ILS',
        exchange_rate: 1,
        notes: ''
    });

    const [lines, setLines] = useState<any[]>([
        { id: 1, item_id: '', quantity: 1, unit_id: '', unit_price: 0, tax_amount: 0, total: 0 }
    ]);

    // Master Data
    const [suppliers, setSuppliers] = useState<any[]>([]);
    const [items, setItems] = useState<any[]>([]);
    const [units, setUnits] = useState<any[]>([]);
    const [currencies, setCurrencies] = useState<any[]>([]);

    useEffect(() => {
        loadMasterData();
    }, []);

    const loadMasterData = async () => {
        try {
            const [supp, itm, unt, curr] = await Promise.all([
                window.electronAPI.partner.getPartners('SUPPLIER'),
                window.electronAPI.inventory.getItems(),
                window.electronAPI.inventory.getUnits(),
                window.electronAPI.currency.getCurrencies()
            ]);
            setSuppliers(supp);
            setItems(itm);
            setUnits(unt);
            setCurrencies(curr);

            // Fetch Next No (we might need a dedicated API or just use "NEW" and let backend handle it, 
            // but for consistency let's try to fetch if we had an API, otherwise 'NEW' is fine)
            // window.electronAPI.journal.getNextVoucherNo('PO').then(no => setHeader(h => ({...h, order_no: no})));
            // Actually backend createOrder handles it if 'NEW'.
        } catch (error) {
            console.error("Failed to load master data", error);
        }
    };

    // --- Calculations ---
    const updateLine = (index: number, field: string, value: any) => {
        const newLines = [...lines];
        const line = { ...newLines[index], [field]: value };

        if (field === 'item_id') {
            const item = items.find(i => i.id === value);
            if (item) {
                line.unit_price = item.cost_price || 0;
                line.unit_id = item.base_unit_id;
                line.description = item.name_ar;
            }
        }

        line.total = (Number(line.quantity) || 0) * (Number(line.unit_price) || 0);
        newLines[index] = line;
        setLines(newLines);
    };

    const addLine = () => {
        setLines([...lines, { id: Date.now(), item_id: '', quantity: 1, unit_id: '', unit_price: 0, tax_amount: 0, total: 0 }]);
    };

    const removeLine = (index: number) => {
        setLines(lines.filter((_, i) => i !== index));
    };

    const calculateTotals = () => {
        const subtotal = lines.reduce((sum, l) => sum + (l.total || 0), 0);
        const taxTotal = lines.reduce((sum, l) => sum + (Number(l.tax_amount) || 0), 0);
        const grandTotal = subtotal + taxTotal;
        return { subtotal, taxTotal, grandTotal };
    };

    const { subtotal, taxTotal, grandTotal } = calculateTotals();

    const handleSave = async (print: boolean = false) => {
        if (!header.supplier_id) {
            alert('الرجاء اختيار المورد');
            return;
        }
        if (lines.length === 0 || !lines[0].item_id) {
            alert('الرجاء إضافة أصناف');
            return;
        }

        setLoading(true);
        try {
            const orderData = {
                header: {
                    ...header,
                    subtotal,
                    tax_total: taxTotal,
                    grand_total: grandTotal
                },
                lines: lines
            };

            const result = await window.electronAPI.purchase.createOrder(orderData);
            if (result.success) {
                if (print) {
                    navigate(`/print/purchase-order/${result.id}`);
                } else {
                    alert(`تم حفظ طلب الشراء بنجاح رقم ${result.order_no}`);
                    // Reset
                    setHeader(h => ({ ...h, order_no: 'NEW', notes: '' }));
                    setLines([{ id: Date.now(), item_id: '', quantity: 1, unit_id: '', unit_price: 0, total: 0 }]);
                }
            }
        } catch (error: any) {
            console.error(error);
            alert('فشلت العملية: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6 space-y-6 bg-gray-50/50 min-h-screen font-sans" dir="rtl">
            {/* Header Toolbar */}
            <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors">
                        <ArrowRight className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                            <ShoppingCart className="w-6 h-6 text-blue-600" />
                            طلب شراء جديد (PO)
                        </h1>
                        <span className="text-sm text-gray-500 font-mono mt-1 block">
                            #{header.order_no} | {new Date().toLocaleDateString('ar-EG')}
                        </span>
                    </div>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => handleSave(true)}
                        disabled={loading}
                        className="flex items-center gap-2 bg-gray-600 hover:bg-gray-700 text-white px-4 py-2.5 rounded-lg font-bold shadow-lg transition-all disabled:opacity-50"
                    >
                        <Printer className="w-5 h-5" />
                        حفظ وطباعة
                    </button>
                    <button
                        onClick={() => handleSave(false)}
                        disabled={loading}
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-bold shadow-lg shadow-blue-600/20 transition-all disabled:opacity-50"
                    >
                        {loading ? 'جاري الحفظ...' : (
                            <>
                                <Save className="w-5 h-5" />
                                حفظ الطلب
                            </>
                        )}
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-12 gap-6">
                {/* Main Content */}
                <div className="col-span-9 space-y-6">
                    {/* Info Card */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 grid grid-cols-3 gap-6">
                        <div className="col-span-1">
                            <label className="block text-sm font-medium text-gray-700 mb-2">المورد</label>
                            <div className="relative">
                                <User className="absolute right-3 top-2.5 w-5 h-5 text-gray-400" />
                                <select
                                    className="w-full pr-10 pl-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                    value={header.supplier_id}
                                    onChange={(e) => setHeader({ ...header, supplier_id: e.target.value })}
                                >
                                    <option value="">اختر المورد...</option>
                                    {suppliers.map(c => (
                                        <option key={c.id} value={c.id}>{c.name_ar}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">تاريخ الطلب</label>
                            <input
                                type="date"
                                className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg outline-none"
                                value={header.date}
                                onChange={(e) => setHeader({ ...header, date: e.target.value })}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">تاريخ التوصيل المتوقع</label>
                            <input
                                type="date"
                                className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg outline-none"
                                value={header.delivery_date}
                                onChange={(e) => setHeader({ ...header, delivery_date: e.target.value })}
                            />
                        </div>
                    </div>

                    {/* Items Grid */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden min-h-[400px] flex flex-col">
                        <div className="flex-1 overflow-x-auto">
                            <table className="w-full text-right">
                                <thead className="bg-gray-50 text-gray-600 font-bold text-sm border-b border-gray-200">
                                    <tr>
                                        <th className="px-4 py-3 w-12">#</th>
                                        <th className="px-4 py-3 w-1/3">الصنف</th>
                                        <th className="px-4 py-3 w-32 text-center">الوحدة</th>
                                        <th className="px-4 py-3 w-24 text-center">الكمية</th>
                                        <th className="px-4 py-3 w-32 text-center">التكلفة التقديرية</th>
                                        <th className="px-4 py-3 w-32 text-center">الإجمالي</th>
                                        <th className="px-4 py-3 w-12 text-center"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {lines.map((line, index) => (
                                        <tr key={line.id} className="hover:bg-blue-50/50 transition-colors group">
                                            <td className="px-4 py-2 text-center text-gray-400 font-mono text-xs">{index + 1}</td>
                                            <td className="px-4 py-2">
                                                <select
                                                    className="w-full bg-transparent border-none outline-none font-medium text-gray-800 focus:ring-0"
                                                    value={line.item_id}
                                                    onChange={(e) => updateLine(index, 'item_id', e.target.value)}
                                                >
                                                    <option value="" disabled>اختر الصنف...</option>
                                                    {items.map(i => (
                                                        <option key={i.id} value={i.id}>{i.code} - {i.name_ar}</option>
                                                    ))}
                                                </select>
                                            </td>
                                            <td className="px-4 py-2">
                                                <select
                                                    className="w-full bg-transparent text-sm text-center outline-none"
                                                    value={line.unit_id}
                                                    onChange={(e) => updateLine(index, 'unit_id', e.target.value)}
                                                >
                                                    {line.item_id && items.find(i => i.id === line.item_id)?.base_unit_id && (
                                                        <option value={items.find(i => i.id === line.item_id)?.base_unit_id}>
                                                            {units.find(u => u.id === items.find(i => i.id === line.item_id)?.base_unit_id)?.name_ar}
                                                        </option>
                                                    )}
                                                </select>
                                            </td>
                                            <td className="px-4 py-2">
                                                <input
                                                    type="number"
                                                    min="1"
                                                    className="w-full bg-gray-50 border border-gray-200 rounded px-2 py-1 text-center font-bold text-gray-800 outline-none focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all"
                                                    value={line.quantity}
                                                    onChange={(e) => updateLine(index, 'quantity', parseFloat(e.target.value))}
                                                />
                                            </td>
                                            <td className="px-4 py-2">
                                                <input
                                                    type="number"
                                                    className="w-full bg-transparent border-none text-center outline-none font-mono text-gray-600"
                                                    value={line.unit_price}
                                                    onChange={(e) => updateLine(index, 'unit_price', parseFloat(e.target.value))}
                                                />
                                            </td>
                                            <td className="px-4 py-2 text-center font-mono font-bold text-gray-900 bg-gray-50/50">
                                                {line.total.toLocaleString()}
                                            </td>
                                            <td className="px-4 py-2 text-center">
                                                <button
                                                    onClick={() => removeLine(index)}
                                                    className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded opacity-0 group-hover:opacity-100 transition-all"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    <tr>
                                        <td colSpan={7} className="px-4 py-2">
                                            <button
                                                onClick={addLine}
                                                className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium text-sm px-2 py-1 hover:bg-blue-50 rounded-lg transition-colors w-full"
                                            >
                                                <Plus className="w-4 h-4" />
                                                إضافة سطر جديد
                                            </button>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Sidebar Summary */}
                <div className="col-span-3 space-y-6">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                        <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                            <Calculator className="w-5 h-5 text-gray-500" />
                            ملخص الطلب
                        </h3>

                        <div className="space-y-3">
                            <div className="flex justify-between text-gray-600">
                                <span>المجموع الفرعي</span>
                                <span className="font-mono">{subtotal.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-gray-600">
                                <span>ضريبة مضافة</span>
                                <span className="font-mono">{taxTotal.toLocaleString()}</span>
                            </div>

                            <div className="border-t border-dashed border-gray-300 my-4"></div>

                            <div className="flex justify-between items-end">
                                <span className="text-lg font-bold text-gray-900">الإجمالي النهائي</span>
                                <div className="text-right">
                                    <span className="block text-2xl font-bold text-blue-600 font-mono">
                                        {grandTotal.toLocaleString()}
                                    </span>
                                    <span className="text-xs text-gray-400 font-bold">
                                        {currencies.find(c => c.id === header.currency_id)?.code || 'ILS'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="mt-6 pt-6 border-t border-gray-100">
                            <label className="block text-sm font-medium text-gray-700 mb-2">ملاحظات</label>
                            <textarea
                                className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg outline-none h-32 text-sm"
                                placeholder="أي ملاحظات إضافية..."
                                value={header.notes}
                                onChange={(e) => setHeader({ ...header, notes: e.target.value })}
                            ></textarea>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export { PurchaseOrder }; // Use named export to match existing usage if any
