import React, { useState, useEffect } from 'react';
import { Save, ArrowRight, User, Calendar, Plus, Trash2, Truck, Box, Info, DollarSign } from 'lucide-react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useTabs } from '../../../src/contexts/TabsContext';
import { v4 as uuidv4 } from 'uuid';

export const PurchaseOrderForm = () => {
    const { id } = useParams();
    const [searchParams] = useSearchParams();
    const requestId = searchParams.get('requestId');

    const { closeTab, activeTabPath } = useTabs();
    const [loading, setLoading] = useState(true);

    const [header, setHeader] = useState({
        order_no: 'NEW',
        supplier_id: '',
        branch_id: '',
        date: new Date().toISOString().split('T')[0],
        delivery_date: '',
        currency_id: 'ILS',
        exchange_rate: 1,
        request_id: '',
        status: 'DRAFT',
        payment_terms: '',
        notes: '',
        subtotal: 0,
        tax_total: 0,
        grand_total: 0
    });

    const [lines, setLines] = useState<any[]>([]);

    // Master Data
    const [suppliers, setSuppliers] = useState<any[]>([]);
    const [items, setItems] = useState<any[]>([]);
    const [units, setUnits] = useState<any[]>([]);
    const [currencies, setCurrencies] = useState<any[]>([]);

    useEffect(() => {
        loadMasterData();
        if (id && id !== 'new') {
            loadOrder(id);
        } else if (requestId) {
            importFromRequest(requestId);
        } else {
            setLoading(false);
            addLine(); // Add initial line
        }
    }, [id, requestId]);

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
        } catch (error) {
            console.error("Failed to load master data", error);
        }
    };

    const loadOrder = async (orderId: string) => {
        try {
            setLoading(true);
            const result = await window.electronAPI.purchase.getOrder(orderId);
            if (result && result.header) {
                setHeader(result.header);
                setLines(result.lines.map((l: any) => ({ ...l, id: l.id || uuidv4() })));
            }
        } catch (error) {
            console.error("Failed to load order", error);
        } finally {
            setLoading(false);
        }
    };

    const importFromRequest = async (reqId: string) => {
        try {
            setLoading(true);
            const result = await window.electronAPI.purchase.getRequest(reqId);
            if (result && result.header) {
                setHeader(h => ({
                    ...h,
                    request_id: reqId,
                    branch_id: result.header.branch_id || h.branch_id,
                    notes: `Converted from PR #${result.header.request_no}`
                }));

                const newLines = result.lines.map((l: any) => ({
                    id: uuidv4(),
                    item_id: l.item_id,
                    quantity: l.quantity,
                    unit_id: l.unit_id,
                    unit_price: 0, // Need to fetch price
                    tax_amount: 0,
                    total: 0
                }));
                setLines(newLines);

                // Try to fetch standard costs for items
                // Not implemented here for brevity, assume user enters prices
            }
        } catch (error) {
            console.error("Failed to import request", error);
        } finally {
            setLoading(false);
        }
    };

    const addLine = () => {
        setLines([...lines, { id: uuidv4(), item_id: '', quantity: 1, unit_id: '', unit_price: 0, total: 0, tax_amount: 0 }]);
    };

    const removeLine = (index: number) => {
        const newLines = [...lines];
        newLines.splice(index, 1);
        setLines(newLines);
        calculateTotals(newLines);
    };

    const updateLine = (index: number, field: string, value: any) => {
        const newLines = [...lines];
        const line = { ...newLines[index], [field]: value };

        // Auto-fill unit/price if item changed
        if (field === 'item_id') {
            const item = items.find(i => i.id === value);
            if (item) {
                line.unit_id = item.base_unit_id;
                line.unit_price = item.cost_price || 0;
            }
        }

        // Calculate
        const qty = parseFloat(line.quantity) || 0;
        const price = parseFloat(line.unit_price) || 0;
        line.total = qty * price;
        line.tax_amount = line.total * 0.16; // Standard VAT example

        newLines[index] = line;
        setLines(newLines);
        calculateTotals(newLines);
    };

    const calculateTotals = (currentLines: any[]) => {
        const sub = currentLines.reduce((sum, l) => sum + (l.total || 0), 0);
        const tax = currentLines.reduce((sum, l) => sum + (l.tax_amount || 0), 0);

        setHeader(h => ({
            ...h,
            subtotal: sub,
            tax_total: tax,
            grand_total: sub + tax
        }));
    };

    const handleSave = async () => {
        if (!header.supplier_id) {
            alert("الرجاء اختيار المورد");
            return;
        }
        if (lines.length === 0) {
            alert(" الرجاء إضافة صنف واحد على الأقل");
            return;
        }

        const data = { header: { ...header, id: id === 'new' ? undefined : id }, lines };

        try {
            let result;
            if (id && id !== 'new') {
                result = await window.electronAPI.purchase.updateOrder(data);
                alert(`تم تحديث الطلبية رقم ${result.order_no}`);
            } else {
                result = await window.electronAPI.purchase.createOrder(data);
                alert(`تم حفظ الطلبية الجديدة رقم ${result.order_no}`);
            }
            if (activeTabPath) closeTab(activeTabPath);
        } catch (error: any) {
            alert(`خطأ: ${error.message}`);
        }
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
                            {id === 'new' ? 'طلبية شراء جديدة' : `تعديل الطلبية #${header.order_no}`}
                            {id !== 'new' && <span className={`text-sm font-normal px-2 py-0.5 rounded-full ${header.status === 'DRAFT' ? 'bg-slate-100 text-slate-500' : 'bg-green-100 text-green-600'}`}>{header.status}</span>}
                        </h1>
                    </div>
                </div>
                <button
                    onClick={handleSave}
                    disabled={id !== 'new' && header.status !== 'DRAFT'}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-medium shadow-sm hover:shadow-md transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <Save className="w-5 h-5" />
                    <span>حفظ الطلبية</span>
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Main Content (Items) */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                            <h2 className="font-bold text-slate-700 flex items-center gap-2">
                                <Box className="w-5 h-5 text-blue-500" />
                                الأصناف المطلوبة
                            </h2>
                            <button
                                onClick={addLine}
                                disabled={id !== 'new' && header.status !== 'DRAFT'}
                                className="text-sm text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 font-medium disabled:opacity-50"
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
                                        <th className="py-3 px-4 w-24">الكمية</th>
                                        <th className="py-3 px-4 w-32">الوحدة</th>
                                        <th className="py-3 px-4 w-32">السعر</th>
                                        <th className="py-3 px-4 w-32">الإجمالي</th>
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
                                                    className="w-full p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all text-sm bg-white"
                                                    disabled={id !== 'new' && header.status !== 'DRAFT'}
                                                >
                                                    <option value="">اختر الصنف...</option>
                                                    {items.map(item => (
                                                        <option key={item.id} value={item.id}>{item.name_ar}</option>
                                                    ))}
                                                </select>
                                            </td>
                                            <td className="py-3 px-4">
                                                <input
                                                    type="number"
                                                    min="0.1"
                                                    step="0.1"
                                                    value={line.quantity}
                                                    onChange={(e) => updateLine(index, 'quantity', parseFloat(e.target.value))}
                                                    className="w-full p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all text-sm text-center font-mono"
                                                    disabled={id !== 'new' && header.status !== 'DRAFT'}
                                                />
                                            </td>
                                            <td className="py-3 px-4">
                                                <select
                                                    value={line.unit_id}
                                                    onChange={(e) => updateLine(index, 'unit_id', e.target.value)}
                                                    className="w-full p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all text-sm bg-slate-50"
                                                    disabled={id !== 'new' && header.status !== 'DRAFT'}
                                                >
                                                    <option value="">الوحدة...</option>
                                                    {units.map(u => (
                                                        <option key={u.id} value={u.id}>{u.name_ar}</option>
                                                    ))}
                                                </select>
                                            </td>
                                            <td className="py-3 px-4">
                                                <input
                                                    type="number"
                                                    min="0"
                                                    step="0.01"
                                                    value={line.unit_price}
                                                    onChange={(e) => updateLine(index, 'unit_price', parseFloat(e.target.value))}
                                                    className="w-full p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all text-sm text-center font-mono"
                                                    disabled={id !== 'new' && header.status !== 'DRAFT'}
                                                />
                                            </td>
                                            <td className="py-3 px-4 font-bold text-slate-700 font-mono text-sm">
                                                {(line.total || 0).toLocaleString()}
                                            </td>
                                            <td className="py-3 px-4 text-center">
                                                <button
                                                    onClick={() => removeLine(index)}
                                                    className="text-slate-300 hover:text-red-500 transition-colors p-1 disabled:opacity-0"
                                                    disabled={id !== 'new' && header.status !== 'DRAFT'}
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
                            <Info className="w-5 h-5 text-blue-500" />
                            ملاحظات إضافية
                        </h2>
                        <textarea
                            value={header.notes || ''}
                            onChange={(e) => setHeader({ ...header, notes: e.target.value })}
                            className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all min-h-[100px]"
                            placeholder="أي شروط خاصة، تعليمات التوصيل أو ملاحظات..."
                            disabled={id !== 'new' && header.status !== 'DRAFT'}
                        />
                    </div>
                </div>

                {/* Sidebar (Details) */}
                <div className="space-y-6">
                    <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 space-y-4">
                        <h2 className="font-bold text-slate-700 pb-2 border-b border-slate-100 flex items-center gap-2">
                            <Truck className="w-5 h-5 text-blue-500" />
                            بيانات الطلبية
                        </h2>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-600 mb-1.5">رقم الطلبية</label>
                                <div className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-500 font-mono">
                                    {header.order_no}
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-600 mb-1.5">المورد</label>
                                <div className="relative">
                                    <select
                                        value={header.supplier_id}
                                        onChange={(e) => setHeader({ ...header, supplier_id: e.target.value })}
                                        className="w-full pl-3 pr-10 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all appearance-none"
                                        disabled={id !== 'new' && header.status !== 'DRAFT'}
                                    >
                                        <option value="">-- اختر المورد --</option>
                                        {suppliers.map(s => (
                                            <option key={s.id} value={s.id}>{s.name_ar}</option>
                                        ))}
                                    </select>
                                    <User className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-600 mb-1.5">تاريخ الطلبية</label>
                                <div className="relative">
                                    <input
                                        type="date"
                                        value={header.date}
                                        onChange={(e) => setHeader({ ...header, date: e.target.value })}
                                        className="w-full pl-3 pr-10 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all"
                                        disabled={id !== 'new' && header.status !== 'DRAFT'}
                                    />
                                    <Calendar className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-600 mb-1.5">تاريخ التوصيل</label>
                                <div className="relative">
                                    <input
                                        type="date"
                                        value={header.delivery_date || ''}
                                        onChange={(e) => setHeader({ ...header, delivery_date: e.target.value })}
                                        className="w-full pl-3 pr-10 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all"
                                        disabled={id !== 'new' && header.status !== 'DRAFT'}
                                    />
                                    <Calendar className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-600 mb-1.5">العملة</label>
                                <select
                                    value={header.currency_id}
                                    onChange={(e) => setHeader({ ...header, currency_id: e.target.value })}
                                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all"
                                    disabled={id !== 'new' && header.status !== 'DRAFT'}
                                >
                                    {currencies.map(c => (
                                        <option key={c.id} value={c.id}>{c.name} ({c.symbol})</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="bg-slate-900 text-white p-5 rounded-2xl shadow-lg space-y-4">
                        <div className="flex justify-between items-center text-slate-300">
                            <span>المجموع</span>
                            <span className="font-mono">{header.subtotal.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center text-slate-300">
                            <span>الضريبة (16%)</span>
                            <span className="font-mono">{header.tax_total.toLocaleString()}</span>
                        </div>
                        <div className="border-t border-slate-700 pt-3 flex justify-between items-center text-xl font-bold">
                            <span>الإجمالي</span>
                            <span className="font-mono flex items-center gap-1">
                                {currencies.find(c => c.id === header.currency_id)?.symbol || header.currency_id}
                                {header.grand_total.toLocaleString()}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PurchaseOrderForm;
