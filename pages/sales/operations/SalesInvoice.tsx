import React, { useState, useEffect, useRef } from 'react';
import {
    Save, Printer, Search, Plus, Trash2, Calendar,
    ArrowRight, ShoppingCart, User, Building2, Briefcase,
    ChevronDown, FileText, Hash, MapPin, Layers, Package, CreditCard
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { UnifiedPartnerPicker, UnifiedPartner } from '../../../components/UnifiedPartnerPicker';
import { v4 as uuidv4 } from 'uuid';
import { toArabicWords } from '../../../src/utils/tafqeet';

// --- Types ---
interface InvoiceHeader {
    invoiceNo: string;
    manualRef: string;
    date: string;
    dueDate: string;
    currency: string;
    rate: number;
    customerId: string | null;
    customerName: string;
    customerPhone: string;
    warehouseId: string;
    branchId: string;
    costCenterId: string;
    notes: string;
    status: 'Posted' | 'Draft';
}

interface InvoiceLine {
    id: string;
    itemId: string;
    itemName: string;
    itemCode: string;
    unitId: string;
    unitName: string;
    quantity: number;
    price: number;
    taxAmount: number;
    taxRate: number; // For calculation
    total: number;
    net: number; // total + tax
}

interface Item {
    id: string;
    name_ar: string;
    code: string;
    sale_price: number;
    base_unit_id: string;
    tax_percent?: number; // Optional in DB, assume 0 or 16 if missing
}

interface Unit {
    id: string;
    name_ar: string;
}

interface Warehouse {
    id: string;
    name: string;
}

// --- Component ---
export const SalesInvoice = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Master Data
    const [items, setItems] = useState<Item[]>([]);
    const [units, setUnits] = useState<Unit[]>([]);
    const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
    const [branches, setBranches] = useState<any[]>([]);
    const [currencies, setCurrencies] = useState<any[]>([]);
    const [costCenters, setCostCenters] = useState<any[]>([]);

    // Form State
    const [header, setHeader] = useState<InvoiceHeader>({
        invoiceNo: 'NEW',
        manualRef: '',
        date: new Date().toISOString().split('T')[0],
        dueDate: new Date().toISOString().split('T')[0],
        currency: 'ILS',
        rate: 1,
        customerId: null,
        customerName: '',
        customerPhone: '',
        warehouseId: '',
        branchId: '',
        costCenterId: '',
        notes: '',
        status: 'Draft'
    });

    const [lines, setLines] = useState<InvoiceLine[]>([
        { id: uuidv4(), itemId: '', itemName: '', itemCode: '', unitId: '', unitName: '', quantity: 1, price: 0, taxAmount: 0, taxRate: 0, total: 0, net: 0 }
    ]);

    // Pickers
    const [partnerPickerOpen, setPartnerPickerOpen] = useState(false);
    const [itemSearchOpen, setItemSearchOpen] = useState(false);
    const [activeLineId, setActiveLineId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    // --- Load Data ---
    useEffect(() => {
        loadMasterData();
    }, []);

    const loadMasterData = async () => {
        setLoading(true);
        try {
            const api = (window as any).electronAPI;
            if (!api) return;

            const [fetchedItems, fetchedUnits, fetchedWhs, fetchedBranches, fetchedCurrs, fetchedCC, nextNo] = await Promise.all([
                api.inventory.getItems(),
                api.inventory.getUnits(),
                api.getWarehouses(),
                api.masterData.getBranches(),
                api.currency.getCurrencies(),
                api.masterData.getCostCenters(),
                api.journal.getNextVoucherNo('INV')
            ]);

            setItems(fetchedItems || []);
            setUnits(fetchedUnits || []);
            setWarehouses(fetchedWhs || []);
            setBranches(fetchedBranches || []);
            setCurrencies(fetchedCurrs || []);
            setCostCenters(fetchedCC || []);

            // Set Defaults
            const mainBranch = fetchedBranches?.find((b: any) => b.is_main);
            const mainWh = fetchedWhs?.[0]; // Default Warehouse

            if (!id || id === 'new') {
                setHeader(prev => ({
                    ...prev,
                    invoiceNo: nextNo,
                    branchId: mainBranch ? mainBranch.id : (fetchedBranches?.[0]?.id || ''),
                    warehouseId: mainWh ? mainWh.id : ''
                }));
            } else {
                // Load Existing Invoice Logic (TODO for Edit Mode)
            }

        } catch (e) {
            console.error("Failed to load initial data", e);
        } finally {
            setLoading(false);
        }
    };

    // --- Computed ---
    const subtotal = lines.reduce((sum, l) => sum + (l.quantity * l.price), 0);
    const taxTotal = lines.reduce((sum, l) => sum + l.taxAmount, 0);
    const grandTotal = subtotal + taxTotal;

    // --- handlers ---
    const handlePartnerSelect = (partner: UnifiedPartner) => {
        setHeader(prev => ({
            ...prev,
            customerId: partner.id,
            customerName: partner.name,
            customerPhone: partner.raw_data?.phone || partner.raw_data?.mobile || partner.description || '',
            // If partner has currency preference, set it (TODO)
        }));
        setPartnerPickerOpen(false);
    };

    const handleItemSelect = (item: Item) => {
        if (!activeLineId) return;

        setLines(prev => prev.map(l => {
            if (l.id !== activeLineId) return l;

            // Default Unit
            const unit = units.find(u => u.id === item.base_unit_id);
            const taxRate = 0.16; // Hardcoded VAT for now (16%) - Should come from item or settings

            return {
                ...l,
                itemId: item.id,
                itemName: item.name_ar,
                itemCode: item.code,
                unitId: item.base_unit_id,
                unitName: unit?.name_ar || '',
                price: item.sale_price,
                taxRate: taxRate,
                // Recalc will happen in effect or next update
            };
        }));

        setItemSearchOpen(false);
        setActiveLineId(null);
        setSearchTerm('');
    };

    // Auto-Recalculate Lines
    useEffect(() => {
        setLines(prev => prev.map(l => {
            const total = l.quantity * l.price;
            const tax = total * l.taxRate;
            const net = total + tax;

            if (l.total === total && l.taxAmount === tax && l.net === net) return l; // No change

            return { ...l, total, taxAmount: tax, net };
        }));
    }, [lines.map(l => `${l.quantity}-${l.price}-${l.taxRate}`).join('|')]);


    const updateLine = (id: string, field: keyof InvoiceLine, value: any) => {
        setLines(prev => prev.map(l => {
            if (l.id !== id) return l;
            return { ...l, [field]: value };
        }));
    };

    const removeLine = (id: string) => {
        if (lines.length > 1) {
            setLines(prev => prev.filter(l => l.id !== id));
        }
    };

    const addNewLine = () => {
        setLines(prev => [...prev, {
            id: uuidv4(), itemId: '', itemName: '', itemCode: '', unitId: '', unitName: '',
            quantity: 1, price: 0, taxAmount: 0, taxRate: 0, total: 0, net: 0
        }]);
    };

    const handleSave = async () => {
        if (!header.customerId) { alert('الرجاء اختيار الزبون'); return; }
        if (lines.some(l => !l.itemId)) { alert('الرجاء تعبئة جميع الأصناف'); return; }

        setSubmitting(true);
        try {
            const payload = {
                header: {
                    invoice_no: header.invoiceNo,
                    customer_id: header.customerId,
                    branch_id: header.branchId,
                    warehouse_id: header.warehouseId,
                    date: header.date,
                    due_date: header.dueDate,
                    currency_id: header.currency,
                    exchange_rate: header.rate,
                    manual_ref: header.manualRef,
                    cost_center_id: header.costCenterId,
                    notes: header.notes
                },
                lines: lines.map(l => ({
                    item_id: l.itemId,
                    description: l.itemName,
                    quantity: l.quantity,
                    unit_id: l.unitId,
                    unit_price: l.price,
                    tax_amount: l.taxAmount,
                    // total_price and net_total calculated in backend usually, or sent explicitly
                }))
            };

            const res = await (window as any).electronAPI.sales.createInvoice(payload);
            if (res.success) {
                alert(`تم حفظ الفاتورة بنجاح رقم ${res.invoice_no}`);
                // Reset or Redirect
                navigate('/sales/invoices'); // Back to list for now
            }
        } catch (e: any) {
            console.error(e);
            alert(`خطأ في الحفظ: ${e.message}`);
        } finally {
            setSubmitting(false);
        }
    };

    const handlePrint = () => {
        window.print();
    };


    return (
        <div className="flex flex-col h-screen bg-gray-50/50" dir="rtl">
            <style>{`
                @media print {
                    .no-print { display: none !important; }
                    .printable { display: block !important; }
                    body { background: white; }
                    @page { size: A4; margin: 10px; }
                }
                .printable { display: none; }
            `}</style>

            <div className="no-print h-full flex flex-col">
                {/* --- HEADER --- */}
                <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between sticky top-0 z-20 shadow-sm">
                    <div className="flex items-center gap-4">
                        <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-full text-gray-500 transition-colors">
                            <ArrowRight className="w-6 h-6" />
                        </button>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                                <ShoppingCart className="w-7 h-7 text-indigo-600" />
                                فاتورة مبيعات (Sales Invoice)
                            </h1>
                            <p className="text-sm text-gray-500 mt-1">إنشاء فاتورة جديدة للمبيعات</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="hidden md:flex flex-col items-end mr-4">
                            <span className="text-xs text-gray-500">الصافي للدفع</span>
                            <span className="text-xl font-bold font-mono text-indigo-600">
                                {Number(grandTotal).toLocaleString()} {header.currency}
                            </span>
                        </div>
                        <button
                            onClick={handlePrint}
                            className="p-2.5 text-gray-600 hover:bg-gray-100 rounded-xl border border-gray-200 transition-colors flex items-center gap-2"
                        >
                            <Printer className="w-5 h-5" />
                            <span className="hidden md:inline text-sm font-bold">طباعة</span>
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={submitting}
                            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-medium text-white shadow-lg shadow-indigo-500/20 transition-all ${submitting ? 'bg-gray-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 hover:shadow-indigo-500/30 active:scale-95'
                                }`}
                        >
                            <Save className="w-5 h-5" />
                            <span>{submitting ? 'جاري الحفظ...' : 'حفظ الفاتورة'}</span>
                        </button>
                    </div>
                </div>

                {/* --- CONTENT --- */}
                <div className="flex-1 overflow-auto p-6 space-y-6">

                    {/* 1. Header Fields */}
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">

                            {/* Auto Generated */}
                            <div className="space-y-4 border-l pl-6 border-gray-100">
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wider">رقم الفاتورة</label>
                                    <div className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5">
                                        <span className="font-mono font-bold text-gray-700">{header.invoiceNo}</span>
                                        <Hash className="w-4 h-4 text-gray-400" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wider">التاريخ</label>
                                    <div className="relative">
                                        <input
                                            type="date"
                                            value={header.date}
                                            onChange={e => setHeader({ ...header, date: e.target.value })}
                                            className="w-full pl-3 pr-10 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all font-medium text-gray-700"
                                        />
                                        <Calendar className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                                    </div>
                                </div>
                            </div>

                            {/* Config */}
                            <div className="space-y-4 md:col-span-1">
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 mb-1.5">المرجع اليدوي</label>
                                    <input
                                        type="text"
                                        value={header.manualRef}
                                        onChange={e => setHeader({ ...header, manualRef: e.target.value })}
                                        className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-sm"
                                        placeholder="مثال: فاتورة ورقية 123"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-medium text-gray-500 mb-1.5">الفرع</label>
                                        <select
                                            value={header.branchId}
                                            onChange={e => setHeader({ ...header, branchId: e.target.value })}
                                            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-sm bg-white"
                                        >
                                            <option value="">تلقائي</option>
                                            {branches.map(b => (
                                                <option key={b.id} value={b.id}>{b.name_ar}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-500 mb-1.5">المستودع</label>
                                        <select
                                            value={header.warehouseId}
                                            onChange={e => setHeader({ ...header, warehouseId: e.target.value })}
                                            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-sm bg-white"
                                        >
                                            {warehouses.map(w => (
                                                <option key={w.id} value={w.id}>{w.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* Customer & Details */}
                            <div className="md:col-span-3 space-y-4">
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 mb-1.5 flex items-center gap-2">
                                        <User className="w-4 h-4" />
                                        <span>الزبون</span>
                                    </label>
                                    <button
                                        onClick={() => setPartnerPickerOpen(true)}
                                        className="w-full flex items-center justify-between px-4 py-3 border border-gray-200 rounded-xl hover:border-indigo-400 hover:bg-indigo-50/10 transition-all group"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${header.customerId ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-100 text-gray-400'}`}>
                                                <Building2 className="w-5 h-5" />
                                            </div>
                                            <div className="text-right">
                                                <div className={`font-bold ${header.customerId ? 'text-gray-900' : 'text-gray-400'}`}>
                                                    {header.customerName || 'اضغط لاختيار الزبون...'}
                                                </div>
                                                {header.customerPhone && (
                                                    <div className="text-xs text-gray-500 mt-0.5">
                                                        {header.customerPhone}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <ChevronDown className="w-5 h-5 text-gray-400 group-hover:text-indigo-500" />
                                    </button>
                                </div>

                                <div className="grid grid-cols-12 gap-4">
                                    <div className="col-span-4">
                                        <label className="block text-xs font-medium text-gray-500 mb-1.5">مركز التكلفة</label>
                                        <select
                                            value={header.costCenterId}
                                            onChange={e => setHeader({ ...header, costCenterId: e.target.value })}
                                            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 outline-none text-sm bg-white"
                                        >
                                            <option value="">بدون مركز</option>
                                            {costCenters.map(cc => <option key={cc.id} value={cc.id}>{cc.name_ar}</option>)}
                                        </select>
                                    </div>
                                    <div className="col-span-4">
                                        <label className="block text-xs font-medium text-gray-500 mb-1.5">العملة</label>
                                        <select
                                            value={header.currency}
                                            onChange={e => {
                                                const curr = currencies.find(c => c.code === e.target.value);
                                                setHeader({ ...header, currency: e.target.value, rate: curr?.exchange_rate || 1 });
                                            }}
                                            className="w-full px-2 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 outline-none text-sm bg-white"
                                        >
                                            {currencies.map(c => <option key={c.id} value={c.code}>{c.code}</option>)}
                                        </select>
                                    </div>
                                    <div className="col-span-4">
                                        <label className="block text-xs font-medium text-gray-500 mb-1.5">تاريخ الاستحقاق</label>
                                        <input
                                            type="date"
                                            value={header.dueDate}
                                            onChange={e => setHeader({ ...header, dueDate: e.target.value })}
                                            className="w-full pl-3 pr-10 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 outline-none text-sm text-center"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                        {/* Notes Input */}
                        <div className="mt-4">
                            <input
                                type="text"
                                value={header.notes}
                                onChange={e => setHeader({ ...header, notes: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-sm"
                                placeholder="ملاحظات إضافية على الفاتورة..."
                            />
                        </div>
                    </div>

                    {/* 2. Items Grid */}
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col min-h-[400px]">
                        <div className="px-6 py-3 bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wider grid grid-cols-12 gap-4">
                            <div className="col-span-4">الصنف</div>
                            <div className="col-span-2">الوحدة</div>
                            <div className="col-span-1">الكمية</div>
                            <div className="col-span-2">السعر (إفرادي)</div>
                            <div className="col-span-1">ضريبة 16%</div>
                            <div className="col-span-2">المجموع</div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-3">
                            {lines.map((line, index) => (
                                <div key={line.id} className="grid grid-cols-12 gap-4 items-start p-4 rounded-xl border border-gray-200 hover:border-indigo-300 hover:shadow-sm transition-all bg-white group">
                                    {/* Item */}
                                    <div className="col-span-4 relative">
                                        <div
                                            onClick={() => { setActiveLineId(line.id); setItemSearchOpen(true); }}
                                            className="w-full p-2.5 border border-gray-200 rounded-lg bg-gray-50 cursor-pointer hover:bg-white hover:border-indigo-500 transition-colors flex items-center justify-between"
                                        >
                                            <span className={`text-sm ${line.itemId ? 'text-gray-900 font-medium' : 'text-gray-400'}`}>
                                                {line.itemName || 'اختر صنف...'}
                                            </span>
                                            <Search className="w-4 h-4 text-gray-400" />
                                        </div>
                                    </div>

                                    {/* Unit */}
                                    <div className="col-span-2">
                                        <select
                                            value={line.unitId}
                                            onChange={(e) => updateLine(line.id, 'unitId', e.target.value)}
                                            className="w-full p-2.5 border border-gray-200 rounded-lg outline-none focus:border-indigo-500 transition-all text-sm bg-white"
                                        >
                                            {units.map(u => <option key={u.id} value={u.id}>{u.name_ar}</option>)}
                                        </select>
                                    </div>

                                    {/* Qty */}
                                    <div className="col-span-1">
                                        <input
                                            type="number"
                                            value={line.quantity}
                                            onChange={(e) => updateLine(line.id, 'quantity', Number(e.target.value))}
                                            className="w-full p-2.5 border border-gray-200 rounded-lg outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all font-bold text-center"
                                            min="1"
                                        />
                                    </div>

                                    {/* Price */}
                                    <div className="col-span-2">
                                        <input
                                            type="number"
                                            value={line.price}
                                            onChange={(e) => updateLine(line.id, 'price', Number(e.target.value))}
                                            className="w-full p-2.5 border border-gray-200 rounded-lg outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all font-mono"
                                        />
                                    </div>

                                    {/* Tax (ReadOnly for now) */}
                                    <div className="col-span-1">
                                        <div className="w-full p-2.5 border border-gray-200 rounded-lg bg-gray-50 text-center text-xs text-gray-500">
                                            {Number(line.taxAmount).toFixed(2)}
                                        </div>
                                    </div>

                                    {/* Total */}
                                    <div className="col-span-2 flex items-center gap-2">
                                        <div className="w-full p-2.5 bg-indigo-50 text-indigo-700 font-bold font-mono text-center rounded-lg border border-indigo-100">
                                            {Number(line.net).toFixed(2)}
                                        </div>
                                        <button
                                            onClick={() => removeLine(line.id)}
                                            disabled={lines.length === 1}
                                            className="text-gray-400 hover:text-red-600 transition-colors disabled:opacity-30 disabled:hover:text-gray-400"
                                        >
                                            <Trash2 className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                            <button
                                onClick={addNewLine}
                                className="w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all flex items-center justify-center gap-2 font-medium"
                            >
                                <Plus className="w-5 h-5" />
                                <span>إضافة سطر جديد</span>
                            </button>
                        </div>
                    </div>

                </div>

                {/* --- FOOTER --- */}
                <div className="bg-white border-t border-gray-200 px-8 py-4 shadow-[0_-5px_20px_rgba(0,0,0,0.05)] z-20">
                    <div className="flex items-center justify-between">
                        <div className="text-gray-500 text-sm">
                            <span className="font-medium text-gray-900 ml-2">الإجمالي كتابة:</span>
                            {grandTotal > 0 ? toArabicWords(grandTotal, header.currency) : '...'}
                        </div>

                        <div className="flex items-center gap-6">
                            <div className="text-right">
                                <div className="text-xs text-gray-400 mb-1">المجموع الفرعي</div>
                                <div className="font-bold text-gray-700">{subtotal.toFixed(2)}</div>
                            </div>
                            <div className="text-right border-r border-gray-200 pr-6">
                                <div className="text-xs text-gray-400 mb-1">الضريبة (16%)</div>
                                <div className="font-bold text-gray-700">{taxTotal.toFixed(2)}</div>
                            </div>
                            <div className="text-right border-r border-gray-200 pr-6">
                                <div className="text-xs text-gray-400 mb-1">الصافي للدفع</div>
                                <div className="text-3xl font-bold text-indigo-600 font-mono tracking-tight">
                                    {grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                    <span className="text-base font-normal text-gray-500 mr-2">{header.currency}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

            </div>

            {/* --- PRINT TEMPLATE --- */}
            <div className="printable">
                <PrintTemplate header={header} lines={lines} subtotal={subtotal} taxTotal={taxTotal} grandTotal={grandTotal} />
            </div>

            {/* Modals */}
            <UnifiedPartnerPicker
                isOpen={partnerPickerOpen}
                type="CUSTOMER"
                onSelect={handlePartnerSelect}
                onClose={() => setPartnerPickerOpen(false)}
            />

            {itemSearchOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl h-[70vh] flex flex-col overflow-hidden">
                        <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
                            <h3 className="text-lg font-bold flex items-center gap-2">
                                <Package className="w-5 h-5 text-indigo-600" />
                                اختيار صنف
                            </h3>
                            <button onClick={() => setItemSearchOpen(false)} className="text-gray-400 hover:text-red-500">إغلاق</button>
                        </div>
                        <div className="p-4 border-b border-gray-200">
                            <div className="relative">
                                <Search className="absolute right-3 top-3 text-gray-400 w-5 h-5" />
                                <input
                                    type="text"
                                    placeholder="بحث عن صنف (الاسم أو الرمز)..."
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                    autoFocus
                                    className="w-full pr-10 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                                />
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-2">
                            {items.filter(i => i.name_ar.includes(searchTerm) || i.code.includes(searchTerm)).map((item) => (
                                <div
                                    key={item.id}
                                    onClick={() => handleItemSelect(item)}
                                    className="flex items-center justify-between p-3 hover:bg-indigo-50 rounded-xl cursor-pointer border-b border-gray-100 last:border-0 transition-colors"
                                >
                                    <div>
                                        <div className="font-bold text-gray-900">{item.name_ar}</div>
                                        <div className="text-xs text-gray-500 font-mono mt-0.5">{item.code}</div>
                                    </div>
                                    <div className="text-indigo-600 font-bold font-mono bg-indigo-50 px-3 py-1 rounded-lg">
                                        {item.sale_price}
                                    </div>
                                </div>
                            ))}
                            {items.length === 0 && <div className="p-8 text-center text-gray-400">لا توجد أصناف</div>}
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

// --- PRINT TEMPLATE ---
const PrintTemplate = ({ header, lines, subtotal, taxTotal, grandTotal }: any) => {
    return (
        <div className="p-10 border-2 border-gray-800 h-full flex flex-col justify-between text-gray-900 font-sans" dir="rtl">
            <div>
                {/* Header */}
                <div className="flex items-start justify-between border-b-2 border-gray-800 pb-8 mb-8">
                    <div className="text-right">
                        <h1 className="text-4xl font-black text-gray-900 mb-2">فاتورة مبيعات</h1>
                        <h2 className="text-xl font-bold text-gray-600 uppercase tracking-widest">Tax Invoice</h2>
                    </div>
                    <div className="text-center">
                        <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center border-2 border-gray-300 mx-auto mb-2">
                            {/* Logo Placeholder */}
                            <Building2 className="w-12 h-12 text-gray-400" />
                        </div>
                        <p className="font-bold text-lg">شركة وافي للتكنولوجيا</p>
                    </div>
                    <div className="text-left space-y-2">
                        <div className="flex items-center justify-end gap-3">
                            <span className="font-bold text-gray-900 text-xl font-mono">{header.invoiceNo}</span>
                            <span className="text-gray-500 font-medium">:رقم الفاتورة</span>
                        </div>
                        <div className="flex items-center justify-end gap-3">
                            <span className="font-medium text-xl text-gray-800">{header.date}</span>
                            <span className="text-gray-500 font-medium">:التاريخ</span>
                        </div>
                    </div>
                </div>

                {/* Customer Info */}
                <div className="bg-gray-50 rounded-xl p-6 border border-gray-200 mb-8 grid grid-cols-2 gap-8">
                    <div>
                        <div className="text-xs font-bold text-gray-500 uppercase mb-2">معلومات العميل (Customer)</div>
                        <div className="font-bold text-xl text-gray-900 mb-1">{header.customerName}</div>
                        <div className="text-gray-600">{header.customerPhone}</div>
                        {header.costCenterId && <div className="text-xs text-gray-400 mt-2">CC: {header.costCenterId}</div>}
                    </div>
                    <div className="text-left">
                        <div className="text-xs font-bold text-gray-500 uppercase mb-2">تفاصيل (Details)</div>
                        <div className="flex items-center justify-end gap-2 text-gray-700">
                            <span>{header.manualRef || '-'}</span>
                            <span className="font-medium">:المرجع</span>
                        </div>
                        <div className="flex items-center justify-end gap-2 text-gray-700">
                            <span>{header.dueDate}</span>
                            <span className="font-medium">:تاريخ الاستحقاق</span>
                        </div>
                    </div>
                </div>

                {/* Lines Table */}
                <div className="mb-8">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="bg-gray-900 text-white text-sm">
                                <th className="py-3 px-4 text-right rounded-tr-lg">#</th>
                                <th className="py-3 px-4 text-right w-1/3">الصنف / Details</th>
                                <th className="py-3 px-4 text-center">الكمية / Qty</th>
                                <th className="py-3 px-4 text-center">السعر / Price</th>
                                <th className="py-3 px-4 text-center">الإجمالي / Total</th>
                                <th className="py-3 px-4 text-left rounded-tl-lg">الصافي / Net</th>
                            </tr>
                        </thead>
                        <tbody>
                            {lines.map((line: any, idx: number) => (
                                <tr key={idx} className="border-b border-gray-200">
                                    <td className="py-3 px-4 text-gray-500">{idx + 1}</td>
                                    <td className="py-3 px-4 font-bold text-gray-900">{line.itemName}</td>
                                    <td className="py-3 px-4 text-center">{line.quantity}</td>
                                    <td className="py-3 px-4 text-center font-mono">{Number(line.price).toFixed(2)}</td>
                                    <td className="py-3 px-4 text-center font-mono">{Number(line.total).toFixed(2)}</td>
                                    <td className="py-3 px-4 text-left font-mono font-bold">{Number(line.net).toFixed(2)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Totals */}
                <div className="flex justify-end">
                    <div className="w-72 space-y-3">
                        <div className="flex justify-between text-gray-600">
                            <span>المجموع الفرعي</span>
                            <span className="font-mono">{subtotal.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-gray-600">
                            <span>الضريبة (16%)</span>
                            <span className="font-mono">{taxTotal.toFixed(2)}</span>
                        </div>
                        <div className="border-t-2 border-gray-900 pt-3 flex justify-between items-center">
                            <span className="font-bold text-xl">الصافي</span>
                            <span className="font-bold text-2xl font-mono">{grandTotal.toFixed(2)} <span className="text-sm">{header.currency}</span></span>
                        </div>
                    </div>
                </div>

                <div className="mt-6 pt-6 border-t border-gray-200 text-gray-500 text-sm">
                    <span className="font-bold text-gray-900">المبلغ كتابة: </span>
                    {toArabicWords(grandTotal, header.currency)}
                </div>
            </div>

            {/* Footer */}
            <div className="mt-12 text-center text-xs text-gray-400">
                <p>Generated by Wafi ERP Systems - www.wafi.tech</p>
            </div>
        </div>
    );
};
