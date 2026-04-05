import React, { useState, useEffect, useRef } from 'react';
import {
    Save, Printer, Search, Plus, Trash2, Calendar,
    ArrowRight, Truck, Building2, Package,
    ChevronDown, Hash, CreditCard, FileText
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { UnifiedPartnerPicker, UnifiedPartner } from '../../components/UnifiedPartnerPicker';
import { v4 as uuidv4 } from 'uuid';
import { toArabicWords } from '../../src/utils/tafqeet';
import { useEnterNavigation } from '../../src/hooks/useEnterNavigation';

// --- Types ---
interface InvoiceHeader {
    invoiceNo: string;
    vendorInvoiceNo: string;
    manualRef: string;
    date: string;
    dueDate: string;
    currency: string;
    rate: number;
    supplierId: string | null;
    supplierCode: string; // Added for Input
    supplierName: string;
    supplierPhone: string;
    warehouseId: string;
    branchId: string;
    costCenterId: string;
    notes: string;
    status: 'Posted' | 'Draft';
    // Clearing Invoice Fields
    isClearingInvoice: boolean;
    clearingDealerNumber: string;
    clearingHebrewName: string;
    clearingOriginalDate: string;
    // Shipment Link (Import)
    shipmentId: string;
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
    taxAmount: number; // Input VAT
    taxRate: number;
    discount: number;
    total: number;
    net: number; // total + tax - discount
}

interface Item {
    id: string;
    name_ar: string;
    code: string;
    cost_price: number;
    base_unit_id: string;
    tax_rate?: number;
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
export const PurchaseInvoice = () => {
    const navigate = useNavigate();
    const { id } = useParams();

    // Add Container Ref for Navigation
    const containerRef = useRef<HTMLDivElement>(null);
    useEnterNavigation(containerRef);

    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Master Data
    const [items, setItems] = useState<Item[]>([]);
    const [units, setUnits] = useState<Unit[]>([]);
    const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
    const [branches, setBranches] = useState<any[]>([]);
    const [currencies, setCurrencies] = useState<any[]>([]);
    const [costCenters, setCostCenters] = useState<any[]>([]);
    const [shipments, setShipments] = useState<any[]>([]);
    const [suppliers, setSuppliers] = useState<any[]>([]); // Load all suppliers

    // Form State
    const [header, setHeader] = useState<InvoiceHeader>({
        invoiceNo: 'NEW',
        vendorInvoiceNo: '',
        manualRef: '',
        date: new Date().toISOString().split('T')[0],
        dueDate: new Date().toISOString().split('T')[0],
        currency: 'ILS',
        rate: 1,
        supplierId: null,
        supplierCode: '',
        supplierName: '',
        supplierPhone: '',
        warehouseId: '',
        branchId: '',
        costCenterId: '',
        notes: '',
        status: 'Draft',
        isClearingInvoice: false,
        clearingDealerNumber: '',
        clearingHebrewName: '',
        clearingOriginalDate: '',
        shipmentId: ''
    });

    const [lines, setLines] = useState<InvoiceLine[]>([
        { id: uuidv4(), itemId: '', itemName: '', itemCode: '', unitId: '', unitName: '', quantity: 1, price: 0, taxAmount: 0, taxRate: 0.16, discount: 0, total: 0, net: 0 },
        { id: uuidv4(), itemId: '', itemName: '', itemCode: '', unitId: '', unitName: '', quantity: 1, price: 0, taxAmount: 0, taxRate: 0.16, discount: 0, total: 0, net: 0 }
    ]);

    // UI State
    const [itemSearchOpen, setItemSearchOpen] = useState(false);
    const [supplierPickerOpen, setSupplierPickerOpen] = useState(false);
    const [activeLineId, setActiveLineId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    // --- Load Data ---
    useEffect(() => {
        loadMasterData();
    }, [id]);

    const loadMasterData = async () => {
        setLoading(true);
        try {
            const api = (window as any).electronAPI;
            if (!api) return;

            const [its, us, whs, brs, ccs, curs, shps, sups] = await Promise.all([
                api.getItems(),
                api.getUnits(),
                api.getWarehouses(),
                api.masterData.getBranches(),
                api.masterData.getCostCenters(),
                api.currency.getCurrencies(),
                api.masterData.getShipments ? api.masterData.getShipments() : Promise.resolve([]),
                api.partner.getPartners('SUPPLIER')
            ]);

            setItems(its || []);
            setUnits(us || []);
            setWarehouses(whs || []);
            setBranches(brs || []);
            setCostCenters(ccs || []);
            setCurrencies(curs || []);
            setShipments(shps || []);
            setSuppliers(sups || []);

            // Defaults
            const mainBranch = brs?.find((b: any) => b.is_main);
            const mainWarehouse = whs?.[0];

            if (!id || id === 'new') {
                setHeader(h => ({
                    ...h,
                    branchId: mainBranch ? mainBranch.id : (brs?.[0]?.id || ''),
                    warehouseId: mainWarehouse ? mainWarehouse.id : ''
                }));
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    // --- Calculations ---
    const calculateTotals = () => {
        const subtotal = lines.reduce((sum, l) => sum + (l.quantity * l.price), 0);
        const totalDiscount = lines.reduce((sum, l) => sum + l.discount, 0);
        const totalTax = lines.reduce((sum, l) => sum + l.taxAmount, 0);
        const netTotal = subtotal + totalTax - totalDiscount;
        return { subtotal, totalDiscount, totalTax, netTotal };
    };

    const { subtotal, totalDiscount, totalTax, netTotal } = calculateTotals();

    const updateLine = (id: string, field: keyof InvoiceLine, value: any) => {
        setLines(prev => prev.map(l => {
            if (l.id !== id) return l;

            const updated = { ...l, [field]: value };

            // Recalculate Logic
            const baseTotal = updated.quantity * updated.price;
            updated.total = baseTotal; // Line total before tax/disc? Usually line total is just Qty*Price

            // Tax Calculation
            updated.taxAmount = (baseTotal - updated.discount) * updated.taxRate;
            updated.net = baseTotal + updated.taxAmount - updated.discount;

            return updated;
        }));
    };

    const handleItemCodeBlur = (lineId: string, code: string) => {
        if (!code) return;
        const item = items.find(i => i.code === code);

        setLines(prev => prev.map(l => {
            if (l.id !== lineId) return l;
            if (item) {
                return {
                    ...l,
                    itemId: item.id,
                    itemCode: item.code,
                    itemName: item.name_ar,
                    unitId: item.base_unit_id,
                    price: item.cost_price,
                    taxRate: (item.tax_rate !== undefined) ? item.tax_rate : 0.16,
                    // Recalculate immediately
                    taxAmount: (l.quantity * item.cost_price - l.discount) * ((item.tax_rate !== undefined) ? item.tax_rate : 0.16),
                    net: (l.quantity * item.cost_price) + ((l.quantity * item.cost_price - l.discount) * ((item.tax_rate !== undefined) ? item.tax_rate : 0.16)) - l.discount
                };
            } else {
                return { ...l, itemId: '', itemName: '--- صنف غير موجود ---' };
            }
        }));
    };

    const handleItemSelect = (item: Item) => {
        if (!activeLineId) return;
        setLines(prev => prev.map(l => {
            if (l.id !== activeLineId) return l;
            return {
                ...l,
                itemId: item.id,
                itemCode: item.code,
                itemName: item.name_ar,
                unitId: item.base_unit_id,
                price: item.cost_price,
                taxRate: (item.tax_rate !== undefined) ? item.tax_rate : 0.16,
                // Recalculate immediately
                taxAmount: (l.quantity * item.cost_price - l.discount) * ((item.tax_rate !== undefined) ? item.tax_rate : 0.16),
                net: (l.quantity * item.cost_price) + ((l.quantity * item.cost_price - l.discount) * ((item.tax_rate !== undefined) ? item.tax_rate : 0.16)) - l.discount
            };
        }));
        setItemSearchOpen(false);
        setActiveLineId(null);
        setSearchTerm('');
    };

    const addNewLine = () => {
        setLines(prev => [...prev, {
            id: uuidv4(), itemId: '', itemName: '', itemCode: '', unitId: '', unitName: '', quantity: 1, price: 0, taxAmount: 0, taxRate: 0.16, discount: 0, total: 0, net: 0
        }]);
    };

    const removeLine = (id: string) => {
        if (lines.length > 1) {
            setLines(prev => prev.filter(l => l.id !== id));
        }
    };

    const handleSave = async (post: boolean = false) => {
        // Validation...
        alert("Save not implemented in this demo.");
    };

    const handlePartnerSelect = (partner: UnifiedPartner) => {
        setHeader(prev => ({
            ...prev,
            supplierId: partner.id,
            supplierCode: partner.code,
            supplierName: partner.name,
            supplierPhone: (partner as any).phone || '', // UnifiedPartner definition check
            currency: (partner as any).currency || prev.currency
        }));
        setSupplierPickerOpen(false);
    };

    const handleSupplierCodeBlur = () => {
        if (!header.supplierCode) return;
        const sup = suppliers.find((s: any) => s.code === header.supplierCode);
        if (sup) {
            setHeader(prev => ({
                ...prev,
                supplierId: sup.id,
                supplierName: sup.name_ar || sup.name_en,
                supplierPhone: sup.phone || '',
                currency: sup.currency || prev.currency
            }));
        } else {
            // Note: In a real app we might clear ID or show error
            setHeader(prev => ({ ...prev, supplierName: '--- غير موجود ---' }));
        }
    }

    return (
        <div ref={containerRef} className="flex flex-col h-screen bg-gray-50 from-gray-50 to-white" dir="rtl">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shadow-sm sticky top-0 z-30">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate('/purchases/invoices')} className="p-2 hover:bg-gray-100 rounded-full text-gray-500 transition-colors">
                        <ArrowRight className="w-6 h-6" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                            <Package className="w-7 h-7 text-indigo-600" />
                            فاتورة مشتريات (Purchase Invoice)
                        </h1>
                        <p className="text-sm text-gray-500 mt-1">تسجيل فاتورة مورد جديد</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg"><Printer className="w-5 h-5" /></button>
                    <button onClick={() => handleSave(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg font-bold shadow-lg shadow-indigo-500/20 transition-all flex items-center gap-2">
                        <Save className="w-5 h-5" />
                        <span>حفظ الفاتورة</span>
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-auto p-6 space-y-6">
                {/* 1. Master Info */}
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        {/* Supplier Selection - Code & Name */}
                        <div className="md:col-span-2">
                            <label className="block text-xs font-medium text-gray-500 mb-1.5">المورد</label>
                            <div className="flex gap-2">
                                <div className="w-1/3 relative">
                                    <input
                                        type="text"
                                        placeholder="كود المورد"
                                        value={header.supplierCode}
                                        onChange={e => setHeader({ ...header, supplierCode: e.target.value })}
                                        onBlur={handleSupplierCodeBlur}
                                        className="w-full pl-3 pr-8 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 outline-none text-sm font-mono"
                                    />
                                    <button
                                        onClick={() => setSupplierPickerOpen(true)}
                                        className="absolute right-2 top-2.5 text-gray-400 hover:text-indigo-600"
                                        tabIndex={-1}
                                    >
                                        <Search className="w-4 h-4" />
                                    </button>
                                </div>
                                <div className="flex-1">
                                    <input
                                        type="text"
                                        readOnly
                                        value={header.supplierName || ''}
                                        placeholder="اسم المورد..."
                                        className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-600 cursor-not-allowed"
                                        tabIndex={-1}
                                    />
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1.5">رقم فاتورة المورد</label>
                            <input
                                type="text"
                                value={header.vendorInvoiceNo}
                                onChange={e => setHeader({ ...header, vendorInvoiceNo: e.target.value })}
                                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 outline-none text-sm"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1.5">تاريخ الفاتورة</label>
                            <input
                                type="date"
                                value={header.date}
                                onChange={e => setHeader({ ...header, date: e.target.value })}
                                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 outline-none text-sm"
                            />
                        </div>
                    </div>
                </div>

                {/* 2. Items Grid */}
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col min-h-[400px]">
                    <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wider grid grid-cols-12 gap-3">
                        <div className="col-span-2">كود الصنف</div>
                        <div className="col-span-3">اسم الصنف</div>
                        <div className="col-span-1">الوحدة</div>
                        <div className="col-span-1">الكمية</div>
                        <div className="col-span-1">السعر</div>
                        <div className="col-span-1">الخصم</div>
                        <div className="col-span-1">الضريبة</div>
                        <div className="col-span-1 text-center">الإجمالي</div>
                        <div className="col-span-1"></div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-2">
                        {lines.map((line) => (
                            <div key={line.id} className="grid grid-cols-12 gap-3 items-center p-2 rounded-lg hover:bg-gray-50 group border border-transparent hover:border-gray-200 transition-all">
                                {/* Item Code Input */}
                                <div className="col-span-2 relative">
                                    <div className="flex items-center">
                                        <input
                                            type="text"
                                            value={line.itemCode}
                                            onChange={e => updateLine(line.id, 'itemCode', e.target.value)}
                                            onBlur={e => handleItemCodeBlur(line.id, e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none focus:border-indigo-500 font-mono text-sm h-10"
                                            placeholder="كود الصنف"
                                        />
                                        <button
                                            onClick={() => { setActiveLineId(line.id); setItemSearchOpen(true); }}
                                            className="absolute left-1 top-2.5 text-gray-400 hover:text-indigo-600"
                                            tabIndex={-1}
                                        >
                                            <Search className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>

                                {/* Item Name */}
                                <div className="col-span-3">
                                    <div className="w-full px-3 py-2 bg-gray-50 border border-gray-100 rounded-lg text-sm text-gray-600 truncate h-10 flex items-center">
                                        {line.itemName || '---'}
                                    </div>
                                </div>

                                {/* Unit */}
                                <div className="col-span-1">
                                    <select
                                        value={line.unitId}
                                        onChange={e => updateLine(line.id, 'unitId', e.target.value)}
                                        className="w-full px-1 py-2 border border-gray-200 rounded-lg outline-none text-sm bg-white h-10"
                                    >
                                        {units.map(u => <option key={u.id} value={u.id}>{u.name_ar}</option>)}
                                    </select>
                                </div>

                                {/* Qty */}
                                <div className="col-span-1">
                                    <input
                                        type="number"
                                        value={line.quantity}
                                        onChange={e => updateLine(line.id, 'quantity', Number(e.target.value))}
                                        className="w-full px-2 py-2 border border-gray-200 rounded-lg outline-none focus:border-indigo-500 text-center font-bold h-10"
                                        min="1"
                                    />
                                </div>

                                {/* Price */}
                                <div className="col-span-1">
                                    <input
                                        type="number"
                                        value={line.price}
                                        onChange={e => updateLine(line.id, 'price', Number(e.target.value))}
                                        className="w-full px-2 py-2 border border-gray-200 rounded-lg outline-none focus:border-indigo-500 text-center h-10"
                                    />
                                </div>

                                {/* Discount */}
                                <div className="col-span-1">
                                    <input
                                        type="number"
                                        value={line.discount}
                                        onChange={e => updateLine(line.id, 'discount', Number(e.target.value))}
                                        className="w-full px-2 py-2 border border-gray-200 rounded-lg outline-none focus:border-indigo-500 text-center h-10 text-red-500"
                                    />
                                </div>

                                {/* Tax */}
                                <div className="col-span-1 text-center text-xs text-gray-500 pt-3">
                                    {line.taxAmount.toFixed(2)}
                                </div>

                                {/* Total */}
                                <div className="col-span-1 text-center font-bold text-indigo-600 pt-3">
                                    {line.net.toFixed(2)}
                                </div>

                                {/* Actions */}
                                <div className="col-span-1 text-center">
                                    <button onClick={() => removeLine(line.id)} className="p-2 text-gray-300 hover:text-red-500 rounded-lg transition-colors tab-index-[-1]">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                        <button onClick={addNewLine} className="w-full py-3 border-2 border-dashed border-gray-200 rounded-xl text-gray-400 hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all flex items-center justify-center gap-2 font-medium mt-4">
                            <Plus className="w-4 h-4" /> إضافة صنف
                        </button>
                    </div>
                </div>

                {/* Footer Totals */}
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                    <div className="flex justify-between items-end">
                        <div>
                            <label className="text-gray-500 text-sm">صافي الفاتورة كتابة</label>
                            <div className="text-xl font-bold text-gray-800 mt-1">{toArabicWords(netTotal, header.currency)}</div>
                        </div>
                        <div className="w-96 space-y-3">
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-500">المجموع الفرعي</span>
                                <span className="font-bold">{subtotal.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-sm text-red-500">
                                <span>الخصم</span>
                                <span>- {totalDiscount.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-sm text-green-600">
                                <span>ضريبة القيمة المضافة (16%)</span>
                                <span>+ {totalTax.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-xl font-bold pt-3 border-t border-gray-100">
                                <span>الإجمالي النهائي</span>
                                <span className="text-indigo-600">{netTotal.toFixed(2)} {header.currency}</span>
                            </div>
                        </div>
                    </div>
                </div>

            </div>

            {/* Item Search Modal */}
            {itemSearchOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl h-[70vh] flex flex-col">
                        <div className="p-4 border-b border-gray-200 flex justify-between items-center">
                            <h3 className="font-bold">بحث عن صنف</h3>
                            <button onClick={() => setItemSearchOpen(false)} className="text-red-500">إغلاق</button>
                        </div>
                        <div className="p-4">
                            <input
                                autoFocus
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="w-full px-4 py-3 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                                placeholder="ابحث باسم الصنف أو الكود..."
                            />
                        </div>
                        <div className="flex-1 overflow-y-auto p-2">
                            {items
                                .filter(i => i.name_ar.includes(searchTerm) || i.code.includes(searchTerm))
                                .slice(0, 50)
                                .map(item => (
                                    <div
                                        key={item.id}
                                        onClick={() => handleItemSelect(item)}
                                        className="p-3 hover:bg-gray-50 border-b border-gray-100 cursor-pointer flex justify-between items-center"
                                    >
                                        <div className="font-bold text-gray-800">{item.name_ar}</div>
                                        <div className="text-sm text-gray-500 font-mono bg-gray-100 px-2 py-1 rounded">{item.code}</div>
                                    </div>
                                ))
                            }
                        </div>
                    </div>
                </div>
            )}

            {/* Supplier Search Modal */}
            <UnifiedPartnerPicker
                isOpen={supplierPickerOpen}
                onClose={() => setSupplierPickerOpen(false)}
                onSelect={handlePartnerSelect}
            />
        </div>
    );
};
