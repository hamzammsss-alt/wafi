import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
    Save, Printer, Search, Plus, Trash2, Calendar,
    ArrowRight, Truck, Building2, Package,
    ChevronDown, Hash, CreditCard, FileText
} from 'lucide-react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { UnifiedPartnerPicker, UnifiedPartner } from '../../components/UnifiedPartnerPicker';
import { v4 as uuidv4 } from 'uuid';
import { useTabs } from '../../src/contexts/TabsContext';
import { toArabicWords } from '../../src/utils/tafqeet';
import { useEnterNavigation } from '../../src/hooks/useEnterNavigation';
import { useBesanHotkeys } from '../../src/hooks/useBesanHotkeys';
import { findItemByCode, searchItemsByInput } from '../../utils/itemLookup';
import { ItemCodeInput } from '../../components/items/ItemCodeInput';
import { ItemLookupModal } from '../../src/components/items/ItemLookupModal';

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
    barcode?: string;
    name_en?: string;
    name?: string;
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

interface DispatchConversionContext {
    source: 'dispatch';
    dispatchId: string;
    dispatchCode?: string | null;
    createdAt?: number;
}

interface DispatchTrackingMeta {
    partnerCode: string;
    partnerName: string;
}

const PURCHASE_INVOICE_CONVERSION_KEY = 'wafi:purchase-invoice-conversion';

const normalizeText = (value: unknown): string => String(value ?? '').trim().toLowerCase();

const parseDispatchTrackingNotes = (rawNotes: unknown): DispatchTrackingMeta => {
    const parsed: DispatchTrackingMeta = {
        partnerCode: '',
        partnerName: ''
    };

    const source = String(rawNotes ?? '').trim();
    if (!source) return parsed;

    const parts = source.split('|').map((part) => part.trim()).filter(Boolean);
    for (const part of parts) {
        const separator = part.indexOf(':');
        if (separator < 0) continue;

        const key = normalizeText(part.slice(0, separator));
        const value = part.slice(separator + 1).trim();
        if (!value) continue;

        if (
            key.includes('partner code') ||
            key.includes('supplier code') ||
            key.includes('customer code') ||
            key.includes('كود')
        ) {
            parsed.partnerCode = value;
            continue;
        }
        if (
            key.includes('partner name') ||
            key.includes('supplier name') ||
            key.includes('customer name') ||
            key.includes('المورد') ||
            key.includes('العميل') ||
            key.includes('الدليل')
        ) {
            parsed.partnerName = value;
        }
    }

    return parsed;
};

const readPurchaseInvoiceConversionContext = (): DispatchConversionContext | null => {
    try {
        const raw = sessionStorage.getItem(PURCHASE_INVOICE_CONVERSION_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (parsed?.source !== 'dispatch') return null;
        const dispatchId = String(parsed?.dispatchId || '').trim();
        if (!dispatchId) return null;
        return {
            source: 'dispatch',
            dispatchId,
            dispatchCode: parsed?.dispatchCode ? String(parsed.dispatchCode) : null,
            createdAt: Number(parsed?.createdAt || 0) || undefined
        };
    } catch {
        return null;
    }
};

const clearPurchaseInvoiceConversionContext = () => {
    try {
        sessionStorage.removeItem(PURCHASE_INVOICE_CONVERSION_KEY);
    } catch {
        // ignore storage failures
    }
};

// --- Component ---
export const PurchaseInvoice = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const [searchParams] = useSearchParams();
    const dispatchIdFromQuery = String(searchParams.get('dispatch_id') || '').trim();
    const dispatchCodeFromQuery = String(searchParams.get('dispatch_code') || '').trim();
    const conversionAppliedRef = useRef(false);
    const { openTab } = useTabs();

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

    const createLine = (): InvoiceLine => ({
        id: uuidv4(),
        itemId: '',
        itemName: '',
        itemCode: '',
        unitId: '',
        unitName: '',
        quantity: 1,
        price: 0,
        taxAmount: 0,
        taxRate: 0.16,
        discount: 0,
        total: 0,
        net: 0
    });

    const [lines, setLines] = useState<InvoiceLine[]>([
        createLine(),
        createLine()
    ]);

    // UI State
    const [itemSearchOpen, setItemSearchOpen] = useState(false);
    const [supplierPickerOpen, setSupplierPickerOpen] = useState(false);
    const [activeLineId, setActiveLineId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    const applyDispatchConversion = async (
        api: any,
        conversionContext: DispatchConversionContext,
        fetchedItems: Item[],
        fetchedUnits: Unit[],
        fetchedSuppliers: any[]
    ) => {
        if (!api?.inventory?.getStockDocument) return false;

        const dispatch = await api.inventory.getStockDocument(conversionContext.dispatchId);
        const sourceHeader = dispatch?.header;
        const sourceLines = Array.isArray(dispatch?.lines) ? dispatch.lines : [];
        if (!sourceHeader || sourceLines.length === 0) return false;

        const notesMeta = parseDispatchTrackingNotes(sourceHeader?.notes);
        const dispatchCode = String(
            sourceHeader?.code ||
            sourceHeader?.ref_no ||
            conversionContext.dispatchCode ||
            ''
        ).trim();
        const dispatchDate =
            String(sourceHeader?.date || '').split('T')[0] ||
            new Date().toISOString().split('T')[0];

        let matchedSupplier: any = null;
        if (Array.isArray(fetchedSuppliers)) {
            const byCode = notesMeta.partnerCode
                ? fetchedSuppliers.find((supplier: any) =>
                    normalizeText(supplier?.code || supplier?.partner_code) === normalizeText(notesMeta.partnerCode)
                )
                : null;
            const byName = !byCode && notesMeta.partnerName
                ? fetchedSuppliers.find((supplier: any) =>
                    normalizeText(supplier?.name_ar || supplier?.name || supplier?.name_en) === normalizeText(notesMeta.partnerName)
                )
                : null;
            matchedSupplier = byCode || byName || null;
        }

        const mappedLines = sourceLines
            .map((line: any): InvoiceLine | null => {
                const itemId = String(line?.item_id || '').trim();
                if (!itemId) return null;

                const quantity = Math.abs(Number(line?.quantity) || 0);
                if (quantity <= 0) return null;

                const matchedItem = fetchedItems.find((item) => String(item.id) === itemId);
                const unitId = String(line?.unit_id || matchedItem?.base_unit_id || '').trim();
                const unitName = unitId
                    ? String(fetchedUnits.find((unit) => String(unit.id) === unitId)?.name_ar || line?.unit_name || '')
                    : String(line?.unit_name || '');
                const taxRate = Number(matchedItem?.tax_rate ?? 0.16);
                const price = Number(matchedItem?.cost_price ?? line?.cost ?? 0);
                const total = quantity * price;
                const taxAmount = (total || 0) * taxRate;

                return {
                    id: uuidv4(),
                    itemId,
                    itemName: String(line?.item_name || matchedItem?.name_ar || matchedItem?.name || ''),
                    itemCode: String(line?.item_code || matchedItem?.code || ''),
                    unitId,
                    unitName,
                    quantity,
                    price,
                    taxAmount,
                    taxRate,
                    discount: 0,
                    total,
                    net: total + taxAmount
                };
            })
            .filter((line: InvoiceLine | null): line is InvoiceLine => !!line);

        if (mappedLines.length === 0) return false;

        setHeader((prev) => ({
            ...prev,
            date: dispatchDate,
            dueDate: dispatchDate,
            warehouseId: String(sourceHeader?.warehouse_id || prev.warehouseId || ''),
            supplierId: matchedSupplier?.id || prev.supplierId,
            supplierCode: String(matchedSupplier?.code || matchedSupplier?.partner_code || prev.supplierCode || ''),
            supplierName: String(
                matchedSupplier?.name_ar ||
                matchedSupplier?.name ||
                matchedSupplier?.name_en ||
                notesMeta.partnerName ||
                prev.supplierName
            ),
            supplierPhone: String(matchedSupplier?.phone || matchedSupplier?.mobile || prev.supplierPhone || ''),
            manualRef: dispatchCode || prev.manualRef,
            notes: `محول من سند إرسال ${dispatchCode || conversionContext.dispatchId}`
        }));
        setLines(mappedLines);
        return true;
    };

    // --- Load Data ---
    useEffect(() => {
        conversionAppliedRef.current = false;
        loadMasterData();
    }, [id, dispatchIdFromQuery, dispatchCodeFromQuery]);

    useEffect(() => {
        const handleFocus = () => {
            loadMasterData();
        };
        window.addEventListener('focus', handleFocus);
        return () => window.removeEventListener('focus', handleFocus);
    }, [id, dispatchIdFromQuery, dispatchCodeFromQuery]);

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

                if (!conversionAppliedRef.current) {
                    const storedContext = readPurchaseInvoiceConversionContext();
                    const conversionContext: DispatchConversionContext | null =
                        storedContext ||
                        (dispatchIdFromQuery
                            ? {
                                source: 'dispatch',
                                dispatchId: dispatchIdFromQuery,
                                dispatchCode: dispatchCodeFromQuery || null
                            }
                            : null);

                    if (conversionContext?.source === 'dispatch' && conversionContext.dispatchId) {
                        try {
                            await applyDispatchConversion(
                                api,
                                conversionContext,
                                its || [],
                                us || [],
                                sups || []
                            );
                        } finally {
                            clearPurchaseInvoiceConversionContext();
                        }
                    } else {
                        clearPurchaseInvoiceConversionContext();
                    }

                    conversionAppliedRef.current = true;
                }
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

    const applyItemToLine = (line: InvoiceLine, item: Item): InvoiceLine => {
        const taxRate = (item.tax_rate !== undefined) ? item.tax_rate : 0.16;
        const baseTotal = line.quantity * item.cost_price;
        const taxAmount = (baseTotal - line.discount) * taxRate;

        return {
            ...line,
            itemId: item.id,
            itemCode: item.code,
            itemName: item.name_ar,
            unitId: item.base_unit_id,
            price: item.cost_price,
            taxRate,
            total: baseTotal,
            taxAmount,
            net: baseTotal + taxAmount - line.discount
        };
    };

    const updateLine = (id: string, field: keyof InvoiceLine, value: any) => {
        setLines(prev => prev.map(l => {
            if (l.id !== id) return l;

            const updated = { ...l, [field]: value };

            if (field === 'itemCode') {
                const matched = findItemByCode(items, String(value));
                if (matched) return applyItemToLine(updated, matched);
                return { ...updated, itemId: '', itemName: '' };
            }

            // Recalculate Logic
            const baseTotal = updated.quantity * updated.price;
            updated.total = baseTotal; // Line total before tax/disc? Usually line total is just Qty*Price

            // Tax Calculation
            updated.taxAmount = (baseTotal - updated.discount) * updated.taxRate;
            updated.net = baseTotal + updated.taxAmount - updated.discount;

            return updated;
        }));
    };

    const handleItemSelect = (item: Item) => {
        if (!activeLineId) return;
        setLines(prev => prev.map(l => {
            if (l.id !== activeLineId) return l;
            return applyItemToLine(l, item);
        }));
        setItemSearchOpen(false);
        setActiveLineId(null);
        setSearchTerm('');
    };

    const openPortalTab = (path: string, title: string) => {
        openTab({
            id: path,
            path,
            title,
            isClosable: true
        });
        setItemSearchOpen(false);
        setActiveLineId(null);
        setSearchTerm('');
    };

    const addNewLine = () => {
        setLines(prev => [...prev, createLine()]);
    };

    const removeLine = (id: string) => {
        if (lines.length > 1) {
            setLines(prev => prev.filter(l => l.id !== id));
        }
    };

    const focusLineField = (
        rowIndex: number,
        field: 'itemCode' | 'quantity' | 'price' | 'discount'
    ) => {
        const input = document.getElementById(`purchase-invoice-${field}-${rowIndex}`) as HTMLInputElement | null;
        if (!input) return;
        input.focus();
        input.select();
    };

    const moveNextFromField = (
        rowIndex: number,
        field: 'itemCode' | 'quantity' | 'price' | 'discount'
    ) => {
        if (field === 'itemCode') {
            window.setTimeout(() => focusLineField(rowIndex, 'quantity'), 0);
            return;
        }

        if (field === 'quantity') {
            window.setTimeout(() => focusLineField(rowIndex, 'price'), 0);
            return;
        }

        if (field === 'price') {
            window.setTimeout(() => focusLineField(rowIndex, 'discount'), 0);
            return;
        }

        const nextIndex = rowIndex + 1;
        if (rowIndex === lines.length - 1) {
            setLines(prev => [...prev, createLine()]);
            window.setTimeout(() => focusLineField(nextIndex, 'itemCode'), 40);
            return;
        }

        window.setTimeout(() => focusLineField(nextIndex, 'itemCode'), 0);
    };

    const handleLineEnter = (
        e: React.KeyboardEvent<HTMLInputElement>,
        rowIndex: number,
        field: 'itemCode' | 'quantity' | 'price' | 'discount'
    ) => {
        if (e.key !== 'Enter') return;
        e.preventDefault();
        e.stopPropagation();
        moveNextFromField(rowIndex, field);
    };

    const modalItems = useMemo(() => searchItemsByInput(items, searchTerm, 100), [items, searchTerm]);

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

    const handleNew = () => navigate('/purchases/invoices/new');
    const handlePost = async () => { alert("Post not implemented in this demo."); };

    useBesanHotkeys({
        disabled: itemSearchOpen || supplierPickerOpen || loading || submitting,
        onNew: handleNew,
        onSave: () => handleSave(false),
        onPost: handlePost,
        onClose: () => {
            if (itemSearchOpen) setItemSearchOpen(false);
            if (supplierPickerOpen) setSupplierPickerOpen(false);
        },
        onLookup: () => {
            if (activeLineId) {
                setItemSearchOpen(true);
            } else {
                // If no active line, set the first one or create new
                if (lines.length > 0) {
                    setActiveLineId(lines[0].id);
                    setItemSearchOpen(true);
                }
            }
        }
    });

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
                    <div className="px-4 py-3 border-b border-gray-200 bg-white flex items-center justify-between">
                        <div className="text-sm font-bold text-gray-700">الأصناف</div>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => openPortalTab('/items', 'بطاقات الأصناف')}
                                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                            >
                                قائمة الأصناف
                            </button>
                            <button
                                type="button"
                                onClick={() => openPortalTab('/items', 'إضافة صنف جديد')}
                                className="px-3 py-1.5 border border-indigo-200 bg-indigo-50 rounded-lg text-sm text-indigo-700 hover:bg-indigo-100 transition-colors"
                            >
                                إضافة صنف جديد
                            </button>
                            <button
                                type="button"
                                onClick={loadMasterData}
                                className="px-3 py-1.5 border border-emerald-200 bg-emerald-50 rounded-lg text-sm text-emerald-700 hover:bg-emerald-100 transition-colors"
                            >
                                تحديث الأصناف
                            </button>
                        </div>
                    </div>
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
                        {lines.map((line, index) => (
                            <div key={line.id} className="grid grid-cols-12 gap-3 items-center p-2 rounded-lg hover:bg-gray-50 group border border-transparent hover:border-gray-200 transition-all">
                                {/* Item Code Input */}
                                <div className="col-span-2 relative">
                                    <div className="flex items-center">
                                        <ItemCodeInput
                                            items={items}
                                            value={line.itemCode}
                                            onChange={(nextCode) => updateLine(line.id, 'itemCode', nextCode)}
                                            onEnter={() => moveNextFromField(index, 'itemCode')}
                                            inputId={`purchase-invoice-itemCode-${index}`}
                                            className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none focus:border-indigo-500 font-mono text-sm h-10"
                                            autoSelectUnique={false}
                                            showOnEmpty={true}
                                            maxResults={20}
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
                                        id={`purchase-invoice-quantity-${index}`}
                                        value={line.quantity}
                                        onChange={e => updateLine(line.id, 'quantity', Number(e.target.value))}
                                        onKeyDown={e => handleLineEnter(e, index, 'quantity')}
                                        className="w-full px-2 py-2 border border-gray-200 rounded-lg outline-none focus:border-indigo-500 text-center font-bold h-10"
                                        min="1"
                                    />
                                </div>

                                {/* Price */}
                                <div className="col-span-1">
                                    <input
                                        type="number"
                                        id={`purchase-invoice-price-${index}`}
                                        value={line.price}
                                        onChange={e => updateLine(line.id, 'price', Number(e.target.value))}
                                        onKeyDown={e => handleLineEnter(e, index, 'price')}
                                        className="w-full px-2 py-2 border border-gray-200 rounded-lg outline-none focus:border-indigo-500 text-center h-10"
                                    />
                                </div>

                                {/* Discount */}
                                <div className="col-span-1">
                                    <input
                                        type="number"
                                        id={`purchase-invoice-discount-${index}`}
                                        value={line.discount}
                                        onChange={e => updateLine(line.id, 'discount', Number(e.target.value))}
                                        onKeyDown={e => handleLineEnter(e, index, 'discount')}
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
                            {modalItems
                                .map(item => (
                                    <div
                                        key={item.id}
                                        onClick={() => handleItemSelect(item)}
                                        className="p-3 hover:bg-gray-50 border-b border-gray-100 cursor-pointer flex justify-between items-center"
                                    >
                                        <div className="font-bold text-gray-800">{item.name_ar}</div>
                                        <div className="text-sm text-gray-500 font-mono bg-gray-100 px-2 py-1 rounded">
                                            {item.barcode ? `${item.code} | ${item.barcode}` : item.code}
                                        </div>
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
