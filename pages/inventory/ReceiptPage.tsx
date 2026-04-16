import React, { useEffect, useMemo, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import { useSearchParams } from 'react-router-dom';
import {
    ArrowRight,
    ChevronDown,
    Download,
    FileText,
    Link2,
    Plus,
    Package,
    Printer,
    RefreshCw,
    Save,
    Search,
    Share2,
    Trash2,
    User,
    X
} from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { useTabs } from '../../src/contexts/TabsContext';
import { DocumentSupportDock } from '../../src/components/workspace/DocumentSupportDock';
import { WorkspaceHeader } from '../../src/components/workspace/WorkspaceHeader';
import { getInventoryOperationSupportSections } from '../../src/components/workspace/documentSupportSections';
import { useEnterNavigation } from '../../src/hooks/useEnterNavigation';
import { Item, Warehouse } from '../../types';
import { exportToCSV } from '../../utils/export';
import { searchItemsByInput } from '../../utils/itemLookup';
import PostConfirmDialog from '../../src/components/ui/PostConfirmDialog';
import { FloatingDropdown, floatingMenuItemClass } from '../../src/components/ui/FloatingDropdown';

type ToolbarMenu = 'tools' | 'convert' | 'export' | 'link' | null;
type ExportFormat = 'excel' | 'delimited' | 'json' | 'html' | 'pdf';
const RECEIPT_CONVERSION_KEY = 'wafi:receipt-conversion';

interface ReceiptLine {
    id: string;
    itemId: string;
    itemCode: string;
    name: string;
    quantity: number;
    notes: string;
}

type ReceiptLineField = 'quantity' | 'notes';

interface SelectOption {
    value: string;
    label: string;
}

interface ReceiptHeader {
    date: string;
    warehouseId: string;
    source: string;
    supplierRef: string;
    salesRep: string;
    truckNo: string;
    receivedBy: string;
    notes: string;
    ref_no: string;
}

interface ParsedReceiptNotes {
    source: string;
    supplierRef: string;
    salesRep: string;
    truckNo: string;
    receivedBy: string;
    notes: string;
}

interface DispatchConversionContext {
    source: 'dispatch';
    dispatchId: string;
    dispatchCode?: string | null;
    createdAt?: number;
}

interface ParsedDispatchNotesForReceipt {
    partnerCode: string;
    partnerName: string;
    salesOffice: string;
    vehicle: string;
    receiver: string;
}

const TOOL_MENU_ITEMS: Array<{ id: string; label: string }> = [
    { id: 'trace', label: 'تتبع السند' },
    { id: 'summary', label: 'ملخص السند' },
    { id: 'refresh', label: 'تحديث البيانات' }
];

const CONVERT_MENU_ITEMS: Array<{ id: string; label: string }> = [
    { id: 'dispatch', label: 'إلى سند إرسال' },
    { id: 'salesInvoice', label: 'إلى فاتورة مبيعات' },
    { id: 'purchaseInvoice', label: 'إلى فاتورة مشتريات' }
];

const nowDate = (): string => new Date().toISOString().split('T')[0];
const normalizeText = (value: unknown): string => String(value ?? '').trim().toLowerCase();
const onlyDate = (value: unknown): string => (value ? String(value).split('T')[0] : '-');
const itemDisplayName = (item: Partial<Item>): string =>
    String(item.name_ar || (item as any).name || item.name_en || '').trim();

const createInitialHeader = (): ReceiptHeader => ({
    date: nowDate(),
    warehouseId: '',
    source: '',
    supplierRef: '',
    salesRep: '',
    truckNo: '',
    receivedBy: '',
    notes: '',
    ref_no: 'RCP-NEW'
});

const parseReceiptNotes = (rawNotes: unknown): ParsedReceiptNotes => {
    const parsed: ParsedReceiptNotes = {
        source: '',
        supplierRef: '',
        salesRep: '',
        truckNo: '',
        receivedBy: '',
        notes: ''
    };

    const source = String(rawNotes ?? '').trim();
    if (!source) return parsed;

    const leftovers: string[] = [];
    const parts = source.split('|').map((part) => part.trim()).filter(Boolean);

    for (const part of parts) {
        const separator = part.indexOf(':');
        if (separator < 0) {
            leftovers.push(part);
            continue;
        }

        const key = normalizeText(part.slice(0, separator));
        const value = part.slice(separator + 1).trim();
        if (!value) continue;

        if (key.includes('source') || key.includes('المصدر') || key.includes('supplier') || key.includes('المورد')) {
            parsed.source = value;
            continue;
        }
        if (key.includes('supplier ref') || key.includes('مرجع المورد') || key.includes('مرجع')) {
            parsed.supplierRef = value;
            continue;
        }
        if (key.includes('sales rep') || key.includes('مندوب') || key.includes('مبيعات')) {
            parsed.salesRep = value;
            continue;
        }
        if (key.includes('truck') || key.includes('vehicle') || key.includes('الشاحنة')) {
            parsed.truckNo = value;
            continue;
        }
        if (key.includes('received by') || key.includes('تم الاستلام') || key.includes('المستلم')) {
            parsed.receivedBy = value;
            continue;
        }
        if (key.includes('notes') || key.includes('ملاحظ')) {
            parsed.notes = value;
            continue;
        }

        leftovers.push(part);
    }

    if (!parsed.notes && leftovers.length > 0) {
        parsed.notes = leftovers.join(' | ');
    }

    return parsed;
};

const parseDispatchNotesForReceipt = (rawNotes: unknown): ParsedDispatchNotesForReceipt => {
    const parsed: ParsedDispatchNotesForReceipt = {
        partnerCode: '',
        partnerName: '',
        salesOffice: '',
        vehicle: '',
        receiver: ''
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
            key.includes('customer code') ||
            key.includes('كود')
        ) {
            parsed.partnerCode = value;
            continue;
        }
        if (
            key.includes('partner name') ||
            key.includes('customer name') ||
            key.includes('العميل') ||
            key.includes('الدليل')
        ) {
            parsed.partnerName = value;
            continue;
        }
        if (
            key.includes('sales office') ||
            key.includes('sales rep') ||
            key.includes('مندوب')
        ) {
            parsed.salesOffice = value;
            continue;
        }
        if (
            key.includes('vehicle') ||
            key.includes('truck') ||
            key.includes('الشاحنة')
        ) {
            parsed.vehicle = value;
            continue;
        }
        if (
            key.includes('receiver') ||
            key.includes('received by') ||
            key.includes('المستلم')
        ) {
            parsed.receiver = value;
        }
    }

    return parsed;
};

const readReceiptConversionContext = (): DispatchConversionContext | null => {
    try {
        const raw = sessionStorage.getItem(RECEIPT_CONVERSION_KEY);
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

const clearReceiptConversionContext = () => {
    try {
        sessionStorage.removeItem(RECEIPT_CONVERSION_KEY);
    } catch {
        // ignore storage failures
    }
};

const buildReceiptNotes = (header: ReceiptHeader): string => {
    const segments: string[] = [];
    if (header.source.trim()) segments.push(`المصدر: ${header.source.trim()}`);
    if (header.supplierRef.trim()) segments.push(`مرجع المورد: ${header.supplierRef.trim()}`);
    if (header.salesRep.trim()) segments.push(`مندوب المبيعات: ${header.salesRep.trim()}`);
    if (header.truckNo.trim()) segments.push(`الشاحنة: ${header.truckNo.trim()}`);
    if (header.receivedBy.trim()) segments.push(`تم الاستلام بواسطة: ${header.receivedBy.trim()}`);
    if (header.notes.trim()) segments.push(`ملاحظات: ${header.notes.trim()}`);
    return segments.join(' | ');
};

const statusLabel = (status: unknown): string => {
    const value = normalizeText(status).toUpperCase();
    if (value === 'POSTED') return 'مرحل';
    if (value === 'SAVED') return 'محفوظ';
    if (value === 'DRAFT') return 'عالق';
    return 'عالق';
};

const buildFileStem = (seed: string) =>
    String(seed || 'receipt')
        .replace(/[\\/:*?"<>|]+/g, '-')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');

const downloadBlob = (content: string, fileName: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
};

const escapeHtml = (value: unknown): string =>
    String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');

export const ReceiptPage: React.FC = () => {
    const { openTab } = useTabs();
    const [searchParams] = useSearchParams();
    const pageRef = useRef<HTMLDivElement | null>(null);
    const conversionAppliedRef = useRef(false);
    const helperSections = useMemo(() => getInventoryOperationSupportSections(), []);

    useEnterNavigation(pageRef);

    const [viewMode, setViewMode] = useState<'LIST' | 'FORM'>('LIST');
    const [openMenu, setOpenMenu] = useState<ToolbarMenu>(null);

    const [header, setHeader] = useState<ReceiptHeader>(createInitialHeader());
    const [lines, setLines] = useState<ReceiptLine[]>([]);

    const [receipts, setReceipts] = useState<any[]>([]);
    const [selectedReceiptId, setSelectedReceiptId] = useState<string | null>(null);
    const [statusFilter, setStatusFilter] = useState<'ALL' | 'DRAFT' | 'POSTED' | 'PENDING'>('ALL');
    const [listSearch, setListSearch] = useState('');

    const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
    const [items, setItems] = useState<Item[]>([]);
    const [suppliers, setSuppliers] = useState<any[]>([]);
    const [salesReps, setSalesReps] = useState<any[]>([]);
    const [vehicles, setVehicles] = useState<any[]>([]);

    const [loadingList, setLoadingList] = useState(false);
    const [saving, setSaving] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [showItemPicker, setShowItemPicker] = useState(false);
    const [itemBrowserOpen, setItemBrowserOpen] = useState(false);
    const [itemBrowserSearch, setItemBrowserSearch] = useState('');

    const supplierName = (supplier: any): string => String(supplier?.name_ar || supplier?.name || supplier?.name_en || '').trim();
    const supplierCode = (supplier: any): string => String(supplier?.code || supplier?.partner_code || '').trim();
    const salesRepName = (rep: any): string => String(rep?.name_ar || rep?.name || rep?.full_name || '').trim();
    const salesRepCode = (rep: any): string => String(rep?.code || rep?.sales_rep_code || rep?.employee_no || '').trim();
    const vehiclePlate = (vehicle: any): string => String(vehicle?.plate_no || vehicle?.plate || '').trim();
    const vehicleCode = (vehicle: any): string => String(vehicle?.vehicle_code || vehicle?.code || '').trim();

    const [postDialogOpen, setPostDialogOpen] = useState(false);

    useEffect(() => {
        void loadMasterData();
        void loadReceipts();
    }, []);

    useEffect(() => {
        const handleOutsideClick = (event: MouseEvent) => {
            if (!pageRef.current) return;
            if (!pageRef.current.contains(event.target as Node)) {
                setOpenMenu(null);
            }
        };
        document.addEventListener('mousedown', handleOutsideClick);
        return () => document.removeEventListener('mousedown', handleOutsideClick);
    }, []);

    useEffect(() => {
        const handleFocus = () => {
            void loadMasterData();
        };
        window.addEventListener('focus', handleFocus);
        return () => window.removeEventListener('focus', handleFocus);
    }, []);

    useEffect(() => {
        if (!itemBrowserOpen) return;
        const onEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setItemBrowserOpen(false);
            }
        };
        window.addEventListener('keydown', onEscape);
        return () => window.removeEventListener('keydown', onEscape);
    }, [itemBrowserOpen]);

    const openPortalTab = (path: string, title: string) => {
        setOpenMenu(null);
        setShowItemPicker(false);
        setItemBrowserOpen(false);
        openTab({
            id: path,
            path,
            title,
            isClosable: true
        });
    };

    const applyDispatchConversion = async (
        dispatchId: string,
        fallbackDispatchCode: string | null,
        catalogItems: Item[] = items
    ) => {
        const api = (window as any).electronAPI;
        if (!api?.inventory?.getStockDocument) return false;

        const dispatch = await api.inventory.getStockDocument(dispatchId);
        const sourceHeader = dispatch?.header;
        const sourceLines = Array.isArray(dispatch?.lines) ? dispatch.lines : [];
        if (!sourceHeader || sourceLines.length === 0) return false;

        const parsedDispatch = parseDispatchNotesForReceipt(sourceHeader?.notes);
        const dispatchCode = String(sourceHeader?.code || sourceHeader?.ref_no || fallbackDispatchCode || '').trim();
        const mappedLines: ReceiptLine[] = sourceLines
            .map((line: any) => {
                const itemId = String(line?.item_id || '').trim();
                if (!itemId) return null;

                const quantity = Math.abs(Number(line?.quantity) || 0);
                if (quantity <= 0) return null;

                const matched = catalogItems.find((item) => String(item.id) === itemId);
                return {
                    id: uuidv4(),
                    itemId,
                    itemCode: String(line?.item_code || line?.code || (matched as any)?.code || ''),
                    name: String(line?.item_name || itemDisplayName(matched || {}) || ''),
                    quantity,
                    notes: String(line?.notes || '')
                };
            })
            .filter((line: ReceiptLine | null): line is ReceiptLine => !!line);

        if (mappedLines.length === 0) return false;

        const dispatchDate = onlyDate(sourceHeader?.date) !== '-' ? onlyDate(sourceHeader?.date) : nowDate();
        const conversionNote = `محول من سند إرسال ${dispatchCode || dispatchId}`;

        setHeader((prev) => ({
            ...prev,
            ref_no: 'RCP-NEW',
            date: dispatchDate,
            warehouseId: String(sourceHeader?.warehouse_id || prev.warehouseId || ''),
            source: parsedDispatch.partnerName || parsedDispatch.partnerCode || prev.source,
            supplierRef: dispatchCode || prev.supplierRef,
            salesRep: parsedDispatch.salesOffice || prev.salesRep,
            truckNo: parsedDispatch.vehicle || prev.truckNo,
            receivedBy: parsedDispatch.receiver || prev.receivedBy,
            notes: prev.notes ? `${conversionNote} | ${prev.notes}` : conversionNote
        }));
        setLines(mappedLines);
        setViewMode('FORM');
        setSelectedReceiptId(null);
        setOpenMenu(null);
        return true;
    };

    const loadMasterData = async () => {
        const api = (window as any).electronAPI;
        if (!api) return;

        try {
            const inventoryApi = api.inventory || {};
            const partnerApi = api.partner || {};
            const logisticsApi = api.logistics || {};
            const masterDataApi = api.masterData || {};

            const toCallers = (candidates: any[]): Array<() => Promise<any>> =>
                candidates.filter((fn): fn is () => Promise<any> => typeof fn === 'function');

            const loadArray = async (label: string, callers: Array<() => Promise<any>>): Promise<any[]> => {
                for (const caller of callers) {
                    try {
                        const rows = await caller();
                        return Array.isArray(rows) ? rows : [];
                    } catch (error) {
                        console.warn(`[ReceiptPage] Failed to load ${label} from one source, trying fallback.`, error);
                    }
                }
                return [];
            };

            const [whs, itms, sups, salesRepRows, vehicleRows] = await Promise.all([
                loadArray(
                    'warehouses',
                    toCallers([inventoryApi.getWarehouses, masterDataApi.getWarehouses, api.getWarehouses])
                ),
                loadArray(
                    'items',
                    toCallers([inventoryApi.getItems, masterDataApi.getItems, api.getItems])
                ),
                loadArray(
                    'suppliers',
                    toCallers([
                        typeof partnerApi.getPartners === 'function' ? () => partnerApi.getPartners('SUPPLIER') : null,
                        typeof masterDataApi.getPartners === 'function' ? () => masterDataApi.getPartners('SUPPLIER') : null
                    ])
                ),
                loadArray(
                    'sales reps',
                    toCallers([partnerApi.getSalesReps, masterDataApi.getSalesReps])
                ),
                loadArray(
                    'vehicles',
                    toCallers([logisticsApi.getVehicles, masterDataApi.getVehicles])
                )
            ]);

            const resolvedWhs = Array.isArray(whs) ? whs : [];
            setWarehouses(resolvedWhs);
            setItems(Array.isArray(itms) ? itms : []);
            setSuppliers(Array.isArray(sups) ? sups : []);
            setSalesReps(Array.isArray(salesRepRows) ? salesRepRows : []);
            setVehicles(Array.isArray(vehicleRows) ? vehicleRows : []);

            if (resolvedWhs.length > 0) {
                setHeader((prev) => ({
                    ...prev,
                    warehouseId: prev.warehouseId || String(resolvedWhs[0]?.id || '')
                }));
            }

            if (!conversionAppliedRef.current) {
                const queryDispatchId = String(searchParams.get('dispatch_id') || '').trim();
                const queryDispatchCode = String(searchParams.get('dispatch_code') || '').trim();
                const storedContext = readReceiptConversionContext();
                const conversionContext: DispatchConversionContext | null =
                    storedContext ||
                    (queryDispatchId
                        ? {
                            source: 'dispatch',
                            dispatchId: queryDispatchId,
                            dispatchCode: queryDispatchCode || null
                        }
                        : null);

                if (conversionContext?.source === 'dispatch' && conversionContext.dispatchId) {
                    try {
                        await applyDispatchConversion(
                            conversionContext.dispatchId,
                            conversionContext.dispatchCode || null,
                            itms || []
                        );
                    } finally {
                        clearReceiptConversionContext();
                    }
                } else {
                    clearReceiptConversionContext();
                }

                conversionAppliedRef.current = true;
            }
        } catch (error) {
            console.error('Failed to load receipt master data:', error);
        }
    };

    const loadReceipts = async () => {
        const api = (window as any).electronAPI;
        if (!api?.inventory?.getGoodsReceipts) return;

        try {
            setLoadingList(true);
            const rows = await api.inventory.getGoodsReceipts();
            setReceipts(Array.isArray(rows) ? rows : []);
        } catch (error) {
            console.error('Failed to load receipts:', error);
        } finally {
            setLoadingList(false);
        }
    };

    const fetchStockDocument = async (documentId: string) => {
        const api = (window as any).electronAPI;
        if (!api?.inventory?.getStockDocument) return null;
        return api.inventory.getStockDocument(documentId);
    };

    const resetForm = () => {
        setHeader({
            ...createInitialHeader(),
            warehouseId: warehouses.length > 0 ? String((warehouses[0] as any)?.id || '') : ''
        });
        setLines([]);
        setSearchTerm('');
        setShowItemPicker(false);
        setItemBrowserSearch('');
        setItemBrowserOpen(false);
        setOpenMenu(null);
        setSelectedReceiptId(null);
    };

    const supplierOptions = useMemo(() => {
        const seen = new Set<string>();
        const options: SelectOption[] = [];

        const addOption = (value: string, label?: string) => {
            const normalized = normalizeText(value);
            if (!normalized || seen.has(normalized)) return;
            seen.add(normalized);
            options.push({ value: String(value).trim(), label: String(label || value).trim() });
        };

        suppliers.forEach((supplier: any) => {
            const name = supplierName(supplier);
            const code = supplierCode(supplier);
            if (name) addOption(name, code ? `${name} - ${code}` : name);
            if (code && code !== name) addOption(code, name ? `${code} - ${name}` : code);
        });

        receipts.forEach((row: any) => {
            const parsed = parseReceiptNotes(row?.notes);
            addOption(parsed.source);
        });

        return options;
    }, [suppliers, receipts]);

    const salesRepOptions = useMemo(() => {
        const seen = new Set<string>();
        const options: SelectOption[] = [];

        const addOption = (value: string, label?: string) => {
            const normalized = normalizeText(value);
            if (!normalized || seen.has(normalized)) return;
            seen.add(normalized);
            options.push({ value: String(value).trim(), label: String(label || value).trim() });
        };

        salesReps.forEach((rep: any) => {
            const name = salesRepName(rep);
            const code = salesRepCode(rep);
            if (name) addOption(name, code ? `${name} - ${code}` : name);
            if (code && code !== name) addOption(code, name ? `${code} - ${name}` : code);
        });

        receipts.forEach((row: any) => {
            const parsed = parseReceiptNotes(row?.notes);
            addOption(parsed.salesRep);
        });

        return options;
    }, [salesReps, receipts]);

    const vehicleOptions = useMemo(() => {
        const seen = new Set<string>();
        const options: SelectOption[] = [];

        const addOption = (value: string, label?: string) => {
            const normalized = normalizeText(value);
            if (!normalized || seen.has(normalized)) return;
            seen.add(normalized);
            options.push({ value: String(value).trim(), label: String(label || value).trim() });
        };

        vehicles.forEach((vehicle: any) => {
            const plate = vehiclePlate(vehicle);
            const code = vehicleCode(vehicle);
            if (plate) addOption(plate, code ? `${plate} - ${code}` : plate);
            if (code && code !== plate) addOption(code, plate ? `${code} - ${plate}` : code);
        });

        receipts.forEach((row: any) => {
            const parsed = parseReceiptNotes(row?.notes);
            addOption(parsed.truckNo);
        });

        return options;
    }, [vehicles, receipts]);

    const handleSourceChange = (value: string) => {
        const typed = String(value || '').trim();
        if (!typed) {
            setHeader((prev) => ({ ...prev, source: '' }));
            return;
        }

        const query = normalizeText(typed);
        const match = suppliers.find((supplier: any) => {
            const name = normalizeText(supplierName(supplier));
            const code = normalizeText(supplierCode(supplier));
            return (name && name === query) || (code && code === query);
        });

        if (match) {
            const canonicalName = supplierName(match);
            setHeader((prev) => ({ ...prev, source: canonicalName || typed }));
            return;
        }

        setHeader((prev) => ({ ...prev, source: typed }));
    };

    const handleSalesRepChange = (value: string) => {
        const typed = String(value || '').trim();
        if (!typed) {
            setHeader((prev) => ({ ...prev, salesRep: '' }));
            return;
        }

        const query = normalizeText(typed);
        const match = salesReps.find((rep: any) => {
            const name = normalizeText(salesRepName(rep));
            const code = normalizeText(salesRepCode(rep));
            return (name && name === query) || (code && code === query);
        });

        if (match) {
            const canonicalName = salesRepName(match);
            setHeader((prev) => ({ ...prev, salesRep: canonicalName || typed }));
            return;
        }

        setHeader((prev) => ({ ...prev, salesRep: typed }));
    };

    const handleTruckChange = (value: string) => {
        const typed = String(value || '').trim();
        if (!typed) {
            setHeader((prev) => ({ ...prev, truckNo: '' }));
            return;
        }

        const query = normalizeText(typed);
        const match = vehicles.find((vehicle: any) => {
            const plate = normalizeText(vehiclePlate(vehicle));
            const code = normalizeText(vehicleCode(vehicle));
            return (plate && plate === query) || (code && code === query);
        });

        if (match) {
            const canonical = vehiclePlate(match) || vehicleCode(match) || typed;
            setHeader((prev) => ({ ...prev, truckNo: canonical }));
            return;
        }

        setHeader((prev) => ({ ...prev, truckNo: typed }));
    };

    const updateLine = (id: string, field: keyof ReceiptLine, value: any) => {
        setLines((prev) => prev.map((line) => (line.id === id ? { ...line, [field]: value } : line)));
    };

    const removeLine = (id: string) => {
        setLines((prev) => prev.filter((line) => line.id !== id));
    };

    const focusLineField = (rowIndex: number, field: ReceiptLineField) => {
        const element = document.getElementById(`receipt-${field}-${rowIndex}`) as HTMLInputElement | null;
        if (!element) return;
        element.focus();
        element.select();
    };

    const moveToNextLineField = (rowIndex: number, field: ReceiptLineField) => {
        if (field === 'quantity') {
            window.setTimeout(() => focusLineField(rowIndex, 'notes'), 0);
            return;
        }

        const nextIndex = rowIndex + 1;
        if (nextIndex < lines.length) {
            window.setTimeout(() => focusLineField(nextIndex, 'quantity'), 0);
            return;
        }

        window.setTimeout(() => {
            const searchInput = document.getElementById('receipt-item-search') as HTMLInputElement | null;
            if (!searchInput) return;
            setShowItemPicker(true);
            searchInput.focus();
            searchInput.select();
        }, 0);
    };

    const handleLineEnter = (
        event: React.KeyboardEvent<HTMLInputElement>,
        rowIndex: number,
        field: ReceiptLineField
    ) => {
        if (event.key !== 'Enter') return;
        event.preventDefault();
        event.stopPropagation();
        moveToNextLineField(rowIndex, field);
    };

    const openItemBrowser = () => {
        setShowItemPicker(false);
        setItemBrowserSearch(searchTerm.trim());
        setItemBrowserOpen(true);
    };

    const handleItemSelect = (item: Item) => {
        setLines((prev) => {
            const existingIndex = prev.findIndex((line) => String(line.itemId) === String(item.id));
            if (existingIndex >= 0) {
                const next = [...prev];
                next[existingIndex] = {
                    ...next[existingIndex],
                    itemCode: String((item as any).code || next[existingIndex].itemCode || ''),
                    name: itemDisplayName(item) || next[existingIndex].name || String(item.code || ''),
                    quantity: (Number(next[existingIndex].quantity) || 0) + 1
                };
                return next;
            }

            return [
                ...prev,
                {
                    id: uuidv4(),
                    itemId: String(item.id),
                    itemCode: String((item as any).code || ''),
                    name: itemDisplayName(item) || String(item.code || ''),
                    quantity: 1,
                    notes: ''
                }
            ];
        });
        setSearchTerm('');
        setShowItemPicker(false);
        setItemBrowserOpen(false);
    };

    const filteredItems = useMemo(() => {
        const query = searchTerm.trim();
        if (!query) {
            return [...items]
                .sort((a, b) => {
                    const codeCmp = String(a.code || '').localeCompare(String(b.code || ''), 'ar');
                    if (codeCmp !== 0) return codeCmp;
                    return itemDisplayName(a).localeCompare(itemDisplayName(b), 'ar');
                })
                .slice(0, 20);
        }
        return searchItemsByInput(items, query, 20);
    }, [items, searchTerm]);

    const itemBrowserItems = useMemo(() => {
        const query = itemBrowserSearch.trim();
        if (!query) {
            return [...items]
                .sort((a, b) => {
                    const codeCmp = String(a.code || '').localeCompare(String(b.code || ''), 'ar');
                    if (codeCmp !== 0) return codeCmp;
                    return itemDisplayName(a).localeCompare(itemDisplayName(b), 'ar');
                })
                .slice(0, 400);
        }
        return searchItemsByInput(items, query, 400);
    }, [items, itemBrowserSearch]);

    const filteredReceipts = useMemo(() => {
        const query = normalizeText(listSearch);

        return receipts.filter((row) => {
            const rawStatus = normalizeText(row?.status).toUpperCase();
            const statusMatches =
                statusFilter === 'ALL' ||
                (statusFilter === 'POSTED' && rawStatus === 'POSTED') ||
                (statusFilter === 'DRAFT' && rawStatus === 'DRAFT') ||
                (statusFilter === 'PENDING' && rawStatus !== 'POSTED' && rawStatus !== 'DRAFT');

            if (!statusMatches) return false;
            if (!query) return true;

            const parsed = parseReceiptNotes(row?.notes);
            const haystack = [
                row?.code,
                row?.ref_no,
                row?.date,
                row?.warehouse_name,
                row?.notes,
                parsed.source,
                parsed.supplierRef,
                parsed.salesRep,
                parsed.truckNo,
                parsed.receivedBy
            ]
                .map((value) => normalizeText(value))
                .join(' ');

            return haystack.includes(query);
        });
    }, [receipts, statusFilter, listSearch]);

    const selectedReceipt = useMemo(
        () => receipts.find((row) => String(row?.id) === String(selectedReceiptId || '')) || null,
        [receipts, selectedReceiptId]
    );

    const receiptLines = useMemo(
        () => lines.filter((line) => line.itemId && Number(line.quantity) > 0),
        [lines]
    );

    const totalQty = useMemo(
        () => receiptLines.reduce((sum, line) => sum + (Number(line.quantity) || 0), 0),
        [receiptLines]
    );

    const openReceiptFromRow = async (row: any) => {
        let sourceRow = row;
        let mappedLines: ReceiptLine[] = [];

        try {
            if (row?.id) {
                const document = await fetchStockDocument(String(row.id));
                if (document?.header) {
                    sourceRow = document.header;
                }
                if (Array.isArray(document?.lines) && document.lines.length > 0) {
                    mappedLines = document.lines
                        .map((line: any) => {
                            const itemId = String(line?.item_id || '');
                            const matched = items.find((item) => String(item.id) === itemId);
                            return {
                                id: uuidv4(),
                                itemId,
                                itemCode: String(line?.item_code || line?.code || (matched as any)?.code || ''),
                                name: String(line?.item_name || itemDisplayName(matched || {}) || ''),
                                quantity: Math.abs(Number(line?.quantity) || 0),
                                notes: String(line?.notes || '')
                            };
                        })
                        .filter((line: ReceiptLine) => !!line.itemId && Number(line.quantity) > 0);
                }
            }
        } catch (error) {
            console.error('Failed to load receipt details:', error);
        }

        const parsed = parseReceiptNotes(sourceRow?.notes);
        setHeader((prev) => ({
            ...prev,
            ref_no: String(sourceRow?.code || sourceRow?.ref_no || 'RCP-NEW'),
            date: onlyDate(sourceRow?.date) !== '-' ? onlyDate(sourceRow?.date) : nowDate(),
            warehouseId: String(sourceRow?.warehouse_id || prev.warehouseId || ''),
            source: parsed.source,
            supplierRef: parsed.supplierRef,
            salesRep: parsed.salesRep,
            truckNo: parsed.truckNo,
            receivedBy: parsed.receivedBy,
            notes: parsed.notes
        }));
        setLines(mappedLines);
        setViewMode('FORM');
        setOpenMenu(null);
        setSelectedReceiptId(String(row?.id || ''));
    };

    const openSelectedReceipt = async () => {
        if (!selectedReceipt) {
            alert('الرجاء تحديد سند من القائمة أولًا.');
            return;
        }
        await openReceiptFromRow(selectedReceipt);
    };

    const formatExport = (rows: any[], format: ExportFormat, fileStem: string, title: string) => {
        if (rows.length === 0) {
            alert('لا توجد بيانات للتصدير.');
            return;
        }

        if (format === 'excel' || format === 'delimited') {
            exportToCSV(rows, `${fileStem}.csv`);
            return;
        }
        if (format === 'json') {
            downloadBlob(JSON.stringify(rows, null, 2), `${fileStem}.json`, 'application/json;charset=utf-8');
            return;
        }
        if (format === 'html') {
            const headerRow = Object.keys(rows[0]).map((key) => `<th>${escapeHtml(key)}</th>`).join('');
            const bodyRows = rows
                .map((row) => `<tr>${Object.values(row).map((value) => `<td>${escapeHtml(value)}</td>`).join('')}</tr>`)
                .join('');
            const html = `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>${escapeHtml(title)}</title></head><body><table border="1" cellspacing="0" cellpadding="4"><thead><tr>${headerRow}</tr></thead><tbody>${bodyRows}</tbody></table></body></html>`;
            downloadBlob(html, `${fileStem}.html`, 'text/html;charset=utf-8');
            return;
        }
        window.print();
    };

    const exportReceipts = (format: ExportFormat) => {
        const rows = filteredReceipts.map((row, index) => {
            const parsed = parseReceiptNotes(row?.notes);
            return {
                '#': index + 1,
                'رقم السند': row?.code || row?.ref_no || '',
                'التاريخ': onlyDate(row?.date),
                'الحالة': statusLabel(row?.status),
                'المستودع': row?.warehouse_name || '',
                'المصدر/المورد': parsed.source,
                'مرجع المورد': parsed.supplierRef,
                'مندوب المبيعات': parsed.salesRep,
                'الشاحنة': parsed.truckNo,
                'تم الاستلام بواسطة': parsed.receivedBy,
                'ملاحظات': parsed.notes || row?.notes || ''
            };
        });

        formatExport(rows, format, `receipts-${nowDate()}`, 'Receipts');
        setOpenMenu(null);
    };

    const exportCurrentReceipt = (format: ExportFormat) => {
        const rows = receiptLines.map((line, index) => ({
            '#': index + 1,
            'رقم السند': header.ref_no || '',
            'التاريخ': header.date,
            'الصنف': line.name,
            'الكمية': Number(line.quantity) || 0,
            'ملاحظات الصنف': line.notes || ''
        }));

        const stem = buildFileStem(`receipt-${header.ref_no || nowDate()}`);
        formatExport(rows, format, stem, 'Receipt Document');
        setOpenMenu(null);
    };

    const handleToolAction = async (action: string) => {
        if (action === 'trace') {
            openPortalTab('/inventory/stock-transactions', 'حركات المخزون');
        } else if (action === 'summary') {
            const qty = receiptLines.reduce((sum, line) => sum + (Number(line.quantity) || 0), 0);
            alert(`مرجع السند: ${header.ref_no}\nعدد الأصناف: ${receiptLines.length}\nإجمالي الكمية: ${qty.toFixed(3)}`);
        } else if (action === 'refresh') {
            await loadMasterData();
            if (viewMode === 'LIST') {
                await loadReceipts();
            }
        }
        setOpenMenu(null);
    };

    const handleConvertAction = (action: string) => {
        if (action === 'dispatch') {
            openPortalTab('/inventory/dispatch', 'سندات الإرسال');
        } else if (action === 'salesInvoice') {
            openPortalTab('/sales/invoices/new', 'فاتورة مبيعات جديدة');
        } else if (action === 'purchaseInvoice') {
            openPortalTab('/trade/purchasing/invoice', 'فاتورة مشتريات محلية');
        }
        setOpenMenu(null);
    };

    const handleLinkAction = (action: 'link' | 'unlink') => {
        if (action === 'link') {
            openPortalTab('/sales/orders', 'طلبيات المبيعات');
        } else {
            alert('لا يوجد ارتباط مباشر محفوظ على هذا السند.');
        }
        setOpenMenu(null);
    };

    const handleSave = async (status: 'DRAFT' | 'POSTED') => {
        if (status === 'POSTED' && !postDialogOpen) {
            setPostDialogOpen(true);
            return;
        }
        setPostDialogOpen(false);

        if (!header.warehouseId) {
            alert('يرجى اختيار المستودع.');
            return;
        }
        // ... rest of validation and save logic
        if (receiptLines.length === 0) {
            alert('يرجى إضافة صنف واحد على الأقل.');
            return;
        }

        const api = (window as any).electronAPI;
        if (!api?.inventory) {
            alert('واجهة الحفظ غير متاحة في هذا الإصدار.');
            return;
        }

        const stockPayload = {
            type: 'ENTRY',
            status,
            warehouse_id: header.warehouseId,
            date: `${header.date}T00:00:00`,
            notes: buildReceiptNotes(header),
            items: receiptLines.map((line) => ({
                item_id: line.itemId,
                quantity: Math.abs(Number(line.quantity) || 0),
                cost: 0,
                notes: line.notes || ''
            }))
        };

        try {
            setSaving(true);

            if (api.inventory.createStockDocument) {
                await api.inventory.createStockDocument(stockPayload);
            } else if (api.inventory.saveTransaction) {
                await api.inventory.saveTransaction({
                    type: 'RECEIPT',
                    warehouseId: header.warehouseId,
                    date: header.date,
                    notes: buildReceiptNotes(header),
                    items: receiptLines.map((line) => ({
                        itemId: line.itemId,
                        quantity: Math.abs(Number(line.quantity) || 0)
                    }))
                });
            } else {
                throw new Error('createStockDocument/saveTransaction غير متاح');
            }

            alert(status === 'POSTED' ? 'تم حفظ سند الاستلام وترحيله بنجاح.' : 'تم حفظ سند الاستلام كمسودة.');
            setViewMode('LIST');
            resetForm();
            await loadReceipts();
        } catch (error: any) {
            alert(`فشل حفظ سند الاستلام: ${error?.message || error}`);
        } finally {
            setSaving(false);
        }
    };


    if (viewMode === 'LIST') {
        return (
            <>
                <div className="flex flex-col h-full bg-slate-50 p-4 gap-3" dir="rtl" ref={pageRef}>
                    <DocumentSupportDock
                        sections={helperSections}
                        title="تعريفات الاستلام"
                        description="أدر الأصناف والمستودعات والعملاء والمركبات فوق شاشة الاستلام مباشرة."
                    />

                    <WorkspaceHeader
                        icon={<Download size={22} />}
                        title="سندات الاستلام"
                        subtitle="إدارة ومتابعة سندات الاستلام مع لوحة تعريفات ثابتة فوق الصفحة."
                        badges={[
                            { label: `${receipts.length} سند`, tone: 'info' },
                            { label: 'تنقل جدولي', tone: 'neutral' },
                        ]}
                        actions={(
                            <>
                                <button
                                    type="button"
                                    onClick={() => void loadReceipts()}
                                    className="app-toolbar-btn app-focus-ring"
                                >
                                    <RefreshCw size={16} />
                                    <span>تحديث</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => void openSelectedReceipt()}
                                    className="app-toolbar-btn app-focus-ring"
                                >
                                    <FileText size={16} />
                                    <span>فتح المحدد</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        resetForm();
                                        setViewMode('FORM');
                                    }}
                                    className="rounded-xl bg-gradient-to-r from-orange-600 to-amber-500 px-4 py-2 text-sm font-bold text-white shadow-lg shadow-orange-900/15 transition hover:brightness-105"
                                >
                                    <span className="inline-flex items-center gap-2">
                                        <Download size={16} />
                                        <span>سند استلام جديد</span>
                                    </span>
                                </button>
                            </>
                        )}
                        className="mb-3"
                    />

                    <div className="hidden bg-white border border-slate-200 rounded-lg p-3 flex items-center justify-between">
                        <div>
                            <h1 className="text-xl font-bold text-slate-800">سندات الاستلام</h1>
                            <p className="text-xs text-slate-500 mt-1">إدارة ومتابعة سندات الاستلام</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => void loadReceipts()}
                                className="inline-flex items-center gap-1.5 px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-700 hover:bg-slate-50"
                            >
                                <RefreshCw size={15} />
                                تحديث
                            </button>
                            <button
                                type="button"
                                onClick={() => void openSelectedReceipt()}
                                className="inline-flex items-center gap-1.5 px-3 py-2 border border-sky-300 bg-sky-50 rounded-lg text-sm text-sky-700 hover:bg-sky-100"
                            >
                                <FileText size={15} />
                                فتح المحدد
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    resetForm();
                                    setViewMode('FORM');
                                }}
                                className="inline-flex items-center gap-1.5 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm font-semibold"
                            >
                                <Download size={16} />
                                سند استلام جديد
                            </button>
                        </div>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-lg p-2 flex items-center gap-2 flex-wrap">
                        <FloatingDropdown
                            isOpen={openMenu === 'tools'}
                            onClose={() => setOpenMenu(null)}
                            menuWidth={220}
                            title="الأدوات"
                            trigger={
                                <button
                                    type="button"
                                    onClick={() => setOpenMenu((prev) => (prev === 'tools' ? null : 'tools'))}
                                    className="inline-flex items-center gap-1.5 px-3 py-2 border border-slate-300 rounded-lg text-sm hover:bg-slate-50"
                                >
                                    <FileText size={15} />
                                    الأدوات
                                    <ChevronDown size={14} />
                                </button>
                            }
                        >
                            {TOOL_MENU_ITEMS.map(({ id, label }) => (
                                <button
                                    key={id}
                                    type="button"
                                    role="menuitem"
                                    onClick={() => void handleToolAction(id)}
                                    className={floatingMenuItemClass}
                                >
                                    {label}
                                </button>
                            ))}
                        </FloatingDropdown>

                        <FloatingDropdown
                            isOpen={openMenu === 'convert'}
                            onClose={() => setOpenMenu(null)}
                            menuWidth={200}
                            title="تحويل"
                            trigger={
                                <button
                                    type="button"
                                    onClick={() => setOpenMenu((prev) => (prev === 'convert' ? null : 'convert'))}
                                    className="inline-flex items-center gap-1.5 px-3 py-2 border border-slate-300 rounded-lg text-sm hover:bg-slate-50"
                                >
                                    <Share2 size={15} />
                                    تحويل
                                    <ChevronDown size={14} />
                                </button>
                            }
                        >
                            {CONVERT_MENU_ITEMS.map(({ id, label }) => (
                                <button
                                    key={id}
                                    type="button"
                                    role="menuitem"
                                    onClick={() => handleConvertAction(id)}
                                    className={floatingMenuItemClass}
                                >
                                    {label}
                                </button>
                            ))}
                        </FloatingDropdown>

                        <FloatingDropdown
                            isOpen={openMenu === 'export'}
                            onClose={() => setOpenMenu(null)}
                            menuWidth={190}
                            title="تصدير"
                            trigger={
                                <button
                                    type="button"
                                    onClick={() => setOpenMenu((prev) => (prev === 'export' ? null : 'export'))}
                                    className="inline-flex items-center gap-1.5 px-3 py-2 border border-slate-300 rounded-lg text-sm hover:bg-slate-50"
                                >
                                    <Download size={15} />
                                    تصدير
                                    <ChevronDown size={14} />
                                </button>
                            }
                        >
                            <button type="button" role="menuitem" onClick={() => exportReceipts('excel')} className={floatingMenuItemClass}>Excel</button>
                            <button type="button" role="menuitem" onClick={() => exportReceipts('html')} className={floatingMenuItemClass}>HTML</button>
                            <button type="button" role="menuitem" onClick={() => exportReceipts('delimited')} className={floatingMenuItemClass}>Delimited text</button>
                            <button type="button" role="menuitem" onClick={() => exportReceipts('json')} className={floatingMenuItemClass}>JSON</button>
                            <button type="button" role="menuitem" onClick={() => exportReceipts('pdf')} className={floatingMenuItemClass}>PDF</button>
                        </FloatingDropdown>

                        <FloatingDropdown
                            isOpen={openMenu === 'link'}
                            onClose={() => setOpenMenu(null)}
                            menuWidth={180}
                            title="ارتباط"
                            trigger={
                                <button
                                    type="button"
                                    onClick={() => setOpenMenu((prev) => (prev === 'link' ? null : 'link'))}
                                    className="inline-flex items-center gap-1.5 px-3 py-2 border border-slate-300 rounded-lg text-sm hover:bg-slate-50"
                                >
                                    <Link2 size={15} />
                                    ارتباط
                                    <ChevronDown size={14} />
                                </button>
                            }
                        >
                            <button type="button" role="menuitem" onClick={() => handleLinkAction('link')} className={floatingMenuItemClass}>ربط مع طلبية</button>
                            <button type="button" role="menuitem" onClick={() => handleLinkAction('unlink')} className={floatingMenuItemClass}>إلغاء الارتباط</button>
                        </FloatingDropdown>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-lg p-3 flex items-center gap-2">
                        <select
                            value={statusFilter}
                            onChange={(event) => setStatusFilter(event.target.value as 'ALL' | 'DRAFT' | 'POSTED' | 'PENDING')}
                            className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
                        >
                            <option value="PENDING">عالق</option>
                            <option value="DRAFT">محفوظ</option>
                            <option value="POSTED">مرحل</option>
                            <option value="ALL">الكل</option>
                        </select>

                        <div className="relative flex-1">
                            <Search size={16} className="absolute right-3 top-2.5 text-slate-400" />
                            <input
                                type="text"
                                value={listSearch}
                                onChange={(event) => setListSearch(event.target.value)}
                                className="w-full pr-9 pl-3 py-2 border border-slate-300 rounded-lg text-sm"
                                placeholder="بحث برقم السند، المستودع، المورد، المندوب، الشاحنة..."
                            />
                        </div>
                    </div>

                    <div className="bg-white border border-[#8ec5ff] rounded-lg overflow-auto flex-1">
                        <table className="w-full min-w-[1200px] text-right text-sm">
                            <thead className="bg-[#e8f3ff] text-slate-700 sticky top-0 z-10">
                                <tr>
                                    <th className="px-3 py-2 border-b border-[#8ec5ff] w-10 text-center">✓</th>
                                    <th className="px-3 py-2 border-b border-[#8ec5ff]">رقم السند</th>
                                    <th className="px-3 py-2 border-b border-[#8ec5ff]">تاريخ</th>
                                    <th className="px-3 py-2 border-b border-[#8ec5ff]">حالة</th>
                                    <th className="px-3 py-2 border-b border-[#8ec5ff]">مستودع</th>
                                    <th className="px-3 py-2 border-b border-[#8ec5ff]">المصدر / المورد</th>
                                    <th className="px-3 py-2 border-b border-[#8ec5ff]">مرجع المورد</th>
                                    <th className="px-3 py-2 border-b border-[#8ec5ff]">مندوب المبيعات</th>
                                    <th className="px-3 py-2 border-b border-[#8ec5ff]">الشاحنة</th>
                                    <th className="px-3 py-2 border-b border-[#8ec5ff]">ملاحظات</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loadingList && (
                                    <tr>
                                        <td colSpan={10} className="px-3 py-10 text-center text-slate-500">
                                            جاري تحميل سندات الاستلام...
                                        </td>
                                    </tr>
                                )}

                                {!loadingList && filteredReceipts.length === 0 && (
                                    <tr>
                                        <td colSpan={10} className="px-3 py-10 text-center text-slate-400">
                                            لا توجد بيانات
                                        </td>
                                    </tr>
                                )}

                                {!loadingList &&
                                    filteredReceipts.map((row) => {
                                        const parsed = parseReceiptNotes(row?.notes);
                                        const checked = String(row?.id) === selectedReceiptId;
                                        return (
                                            <tr
                                                key={row?.id}
                                                className={`border-b border-slate-100 hover:bg-sky-50 cursor-pointer ${checked ? 'bg-sky-100/70' : ''}`}
                                                onClick={() => setSelectedReceiptId(String(row?.id))}
                                                onDoubleClick={() => void openReceiptFromRow(row)}
                                            >
                                                <td className="px-3 py-2 text-center">
                                                    <input type="checkbox" readOnly checked={checked} />
                                                </td>
                                                <td className="px-3 py-2 font-mono text-sky-800">{row?.code || row?.ref_no || '-'}</td>
                                                <td className="px-3 py-2">{onlyDate(row?.date)}</td>
                                                <td className="px-3 py-2">{statusLabel(row?.status)}</td>
                                                <td className="px-3 py-2">{row?.warehouse_name || '-'}</td>
                                                <td className="px-3 py-2">{parsed.source || '-'}</td>
                                                <td className="px-3 py-2">{parsed.supplierRef || '-'}</td>
                                                <td className="px-3 py-2">{parsed.salesRep || '-'}</td>
                                                <td className="px-3 py-2">{parsed.truckNo || '-'}</td>
                                                <td className="px-3 py-2 truncate max-w-[260px]" title={parsed.notes || row?.notes || ''}>
                                                    {parsed.notes || row?.notes || '-'}
                                                </td>
                                            </tr>
                                        );
                                    })}
                            </tbody>
                        </table>
                    </div>
                </div>
                <PostConfirmDialog
                    open={postDialogOpen}
                    onConfirm={() => void handleSave('POSTED')}
                    onCancel={() => setPostDialogOpen(false)}
                    onDraft={() => void handleSave('DRAFT')}
                    onConfirmNoPrint={() => void handleSave('POSTED')}
                />
            </>
        );
    }

    return (
        <>
            <div className="flex flex-col h-full bg-slate-50 relative" dir="rtl" ref={pageRef}>
                <div className="bg-white border-b border-slate-200 px-4 py-2 flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-2">
                        <button type="button" onClick={() => setViewMode('LIST')} className="p-2 rounded-md border border-slate-300 text-slate-600 hover:bg-slate-50">
                            <ArrowRight size={16} />
                        </button>
                        <div className="w-9 h-9 bg-emerald-100 rounded-md text-emerald-600 flex items-center justify-center">
                            <Download size={18} />
                        </div>
                        <div>
                            <h1 className="text-base font-bold text-slate-800">سند استلام جديد</h1>
                            <p className="text-xs text-slate-500">{header.ref_no}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <FloatingDropdown
                            isOpen={openMenu === 'tools'}
                            onClose={() => setOpenMenu(null)}
                            menuWidth={220}
                            title="الأدوات"
                            trigger={
                                <button
                                    type="button"
                                    onClick={() => setOpenMenu((prev) => (prev === 'tools' ? null : 'tools'))}
                                    className="inline-flex items-center gap-1.5 px-3 py-2 border border-slate-300 rounded-lg text-sm hover:bg-slate-50"
                                >
                                    <FileText size={15} />
                                    الأدوات
                                    <ChevronDown size={14} />
                                </button>
                            }
                        >
                            {TOOL_MENU_ITEMS.map(({ id, label }) => (
                                <button
                                    key={id}
                                    type="button"
                                    role="menuitem"
                                    onClick={() => void handleToolAction(id)}
                                    className={floatingMenuItemClass}
                                >
                                    {label}
                                </button>
                            ))}
                        </FloatingDropdown>

                        <FloatingDropdown
                            isOpen={openMenu === 'convert'}
                            onClose={() => setOpenMenu(null)}
                            menuWidth={200}
                            title="تحويل"
                            trigger={
                                <button
                                    type="button"
                                    onClick={() => setOpenMenu((prev) => (prev === 'convert' ? null : 'convert'))}
                                    className="inline-flex items-center gap-1.5 px-3 py-2 border border-slate-300 rounded-lg text-sm hover:bg-slate-50"
                                >
                                    <Share2 size={15} />
                                    تحويل
                                    <ChevronDown size={14} />
                                </button>
                            }
                        >
                            {CONVERT_MENU_ITEMS.map(({ id, label }) => (
                                <button
                                    key={id}
                                    type="button"
                                    role="menuitem"
                                    onClick={() => handleConvertAction(id)}
                                    className={floatingMenuItemClass}
                                >
                                    {label}
                                </button>
                            ))}
                        </FloatingDropdown>

                        <FloatingDropdown
                            isOpen={openMenu === 'export'}
                            onClose={() => setOpenMenu(null)}
                            menuWidth={190}
                            title="تصدير"
                            trigger={
                                <button
                                    type="button"
                                    onClick={() => setOpenMenu((prev) => (prev === 'export' ? null : 'export'))}
                                    className="inline-flex items-center gap-1.5 px-3 py-2 border border-slate-300 rounded-lg text-sm hover:bg-slate-50"
                                >
                                    <Download size={15} />
                                    تصدير
                                    <ChevronDown size={14} />
                                </button>
                            }
                        >
                            <button type="button" role="menuitem" onClick={() => exportCurrentReceipt('excel')} className={floatingMenuItemClass}>Excel</button>
                            <button type="button" role="menuitem" onClick={() => exportCurrentReceipt('html')} className={floatingMenuItemClass}>HTML</button>
                            <button type="button" role="menuitem" onClick={() => exportCurrentReceipt('delimited')} className={floatingMenuItemClass}>Delimited text</button>
                            <button type="button" role="menuitem" onClick={() => exportCurrentReceipt('json')} className={floatingMenuItemClass}>JSON</button>
                            <button type="button" role="menuitem" onClick={() => exportCurrentReceipt('pdf')} className={floatingMenuItemClass}>PDF</button>
                        </FloatingDropdown>

                        <FloatingDropdown
                            isOpen={openMenu === 'link'}
                            onClose={() => setOpenMenu(null)}
                            menuWidth={180}
                            title="ارتباط"
                            trigger={
                                <button
                                    type="button"
                                    onClick={() => setOpenMenu((prev) => (prev === 'link' ? null : 'link'))}
                                    className="inline-flex items-center gap-1.5 px-3 py-2 border border-slate-300 rounded-lg text-sm hover:bg-slate-50"
                                >
                                    <Link2 size={15} />
                                    ارتباط
                                    <ChevronDown size={14} />
                                </button>
                            }
                        >
                            <button type="button" role="menuitem" onClick={() => handleLinkAction('link')} className={floatingMenuItemClass}>ربط مع طلبية</button>
                            <button type="button" role="menuitem" onClick={() => handleLinkAction('unlink')} className={floatingMenuItemClass}>إلغاء الارتباط</button>
                        </FloatingDropdown>

                        <button type="button" onClick={() => window.print()} className="p-2 border border-slate-300 rounded-md hover:bg-slate-50 text-slate-700">
                            <Printer size={16} />
                        </button>
                        <button type="button" onClick={() => setViewMode('LIST')} className="px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-700 hover:bg-slate-50">
                            إلغاء
                        </button>
                        <button type="button" onClick={() => void handleSave('DRAFT')} disabled={saving} className="px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50">
                            حفظ (مسودة)
                        </button>
                        <button type="button" onClick={() => void handleSave('POSTED')} disabled={saving} className="inline-flex items-center gap-1.5 px-3 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm font-semibold disabled:opacity-50">
                            <Save size={15} />
                            حفظ وترحيل
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-auto p-4">
                    <DocumentSupportDock
                        sections={helperSections}
                        title="تعريفات سند الاستلام"
                        description="يمكنك تعديل القوائم المرجعية أثناء العمل على السند ثم العودة مباشرة للحقول."
                    />

                    <div className="bg-[#dfe6ef] border border-[#c3d2e3] rounded-lg p-4 mb-3">
                        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3">
                            <div>
                                <label className="block text-xs text-slate-700 mb-1">تاريخ الاستلام</label>
                                <input
                                    type="date"
                                    value={header.date}
                                    onChange={(event) => setHeader((prev) => ({ ...prev, date: event.target.value }))}
                                    className="w-full border border-slate-300 rounded-md px-2 py-1.5 text-sm bg-white"
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-slate-700 mb-1">المستودع</label>
                                <select
                                    value={header.warehouseId}
                                    onChange={(event) => setHeader((prev) => ({ ...prev, warehouseId: event.target.value }))}
                                    className="w-full border border-slate-300 rounded-md px-2 py-1.5 text-sm bg-white"
                                >
                                    {warehouses.map((warehouse) => (
                                        <option key={warehouse.id} value={warehouse.id}>
                                            {(warehouse as any).name_ar || (warehouse as any).name || (warehouse as any).code || warehouse.id}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs text-slate-700 mb-1">المصدر / المورد</label>
                                <input
                                    type="text"
                                    list="receipt-source-list"
                                    value={header.source}
                                    onChange={(event) => handleSourceChange(event.target.value)}
                                    className="w-full border border-slate-300 rounded-md px-2 py-1.5 text-sm bg-white"
                                    placeholder="اختر من التعريفات أو اكتب يدويًا"
                                />
                                <datalist id="receipt-source-list">
                                    {supplierOptions.map((option, index) => (
                                        <option key={`${option.value}-${index}`} value={option.value} label={option.label} />
                                    ))}
                                </datalist>
                            </div>
                            <div>
                                <label className="block text-xs text-slate-700 mb-1">مرجع المورد</label>
                                <input
                                    type="text"
                                    value={header.supplierRef}
                                    onChange={(event) => setHeader((prev) => ({ ...prev, supplierRef: event.target.value }))}
                                    className="w-full border border-slate-300 rounded-md px-2 py-1.5 text-sm bg-white"
                                    placeholder="مرجع المورد"
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-slate-700 mb-1">مندوب المبيعات</label>
                                <input
                                    type="text"
                                    list="receipt-sales-rep-list"
                                    value={header.salesRep}
                                    onChange={(event) => handleSalesRepChange(event.target.value)}
                                    className="w-full border border-slate-300 rounded-md px-2 py-1.5 text-sm bg-white"
                                    placeholder="اسم أو كود المندوب"
                                />
                                <datalist id="receipt-sales-rep-list">
                                    {salesRepOptions.map((option, index) => (
                                        <option key={`${option.value}-${index}`} value={option.value} label={option.label} />
                                    ))}
                                </datalist>
                            </div>
                            <div>
                                <label className="block text-xs text-slate-700 mb-1">الشاحنة</label>
                                <input
                                    type="text"
                                    list="receipt-vehicle-list"
                                    value={header.truckNo}
                                    onChange={(event) => handleTruckChange(event.target.value)}
                                    className="w-full border border-slate-300 rounded-md px-2 py-1.5 text-sm bg-white"
                                    placeholder="رقم أو كود المركبة"
                                />
                                <datalist id="receipt-vehicle-list">
                                    {vehicleOptions.map((option, index) => (
                                        <option key={`${option.value}-${index}`} value={option.value} label={option.label} />
                                    ))}
                                </datalist>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                            <div>
                                <label className="block text-xs text-slate-700 mb-1">تم الاستلام بواسطة</label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        value={header.receivedBy}
                                        onChange={(event) => setHeader((prev) => ({ ...prev, receivedBy: event.target.value }))}
                                        className="w-full border border-slate-300 rounded-md px-2 py-1.5 pl-8 text-sm bg-white"
                                        placeholder="يتم التعبئة يدويًا"
                                    />
                                    <User size={14} className="absolute left-2 top-2 text-slate-400" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs text-slate-700 mb-1">ملاحظات</label>
                                <input
                                    type="text"
                                    value={header.notes}
                                    onChange={(event) => setHeader((prev) => ({ ...prev, notes: event.target.value }))}
                                    className="w-full border border-slate-300 rounded-md px-2 py-1.5 text-sm bg-white"
                                    placeholder="ملاحظات إضافية"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="bg-white border border-[#8ec5ff] rounded-lg overflow-auto">
                        <div className="px-3 py-2 border-b border-[#8ec5ff] bg-[#e8f3ff] flex items-center justify-between">
                            <h2 className="font-bold text-slate-700 flex items-center gap-2 text-sm">
                                <Package size={16} className="text-emerald-600" />
                                الأصناف المستلمة
                            </h2>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={openItemBrowser}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-indigo-200 bg-indigo-50 rounded-lg text-xs text-indigo-700 hover:bg-indigo-100 transition-colors"
                                >
                                    <Plus size={14} />
                                    اختيار صنف
                                </button>
                                <button
                                    type="button"
                                    onClick={() => openPortalTab('/items', 'بطاقات الأصناف')}
                                    className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs text-slate-700 hover:bg-white transition-colors"
                                >
                                    قائمة الأصناف
                                </button>
                                <button
                                    type="button"
                                    onClick={() => void loadMasterData()}
                                    className="px-3 py-1.5 border border-sky-200 bg-sky-50 rounded-lg text-xs text-sky-700 hover:bg-sky-100 transition-colors"
                                >
                                    تحديث الأصناف
                                </button>
                            </div>
                        </div>

                        <table className="w-full min-w-[980px] text-right text-sm">
                            <thead className="bg-[#e8f3ff] text-slate-700 sticky top-0 z-10">
                                <tr>
                                    <th className="px-3 py-2 border-b border-[#8ec5ff] w-10 text-center">#</th>
                                    <th className="px-3 py-2 border-b border-[#8ec5ff]">الصنف</th>
                                    <th className="px-3 py-2 border-b border-[#8ec5ff] w-40">الكمية</th>
                                    <th className="px-3 py-2 border-b border-[#8ec5ff]">ملاحظات الصنف</th>
                                    <th className="px-3 py-2 border-b border-[#8ec5ff] w-16" />
                                </tr>
                            </thead>
                            <tbody>
                                <tr className="bg-slate-50/60">
                                    <td className="px-3 py-2 text-center text-slate-400 font-mono">+</td>
                                    <td className="px-3 py-2">
                                        <div className="relative">
                                            <div className="flex items-center bg-white border border-slate-300 rounded-md px-3 py-1.5 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-100 transition-all">
                                                <Search size={15} className="text-slate-400 ml-2" />
                                                <input
                                                    type="text"
                                                    placeholder="بحث لإضافة صنف (اضغط للإظهار)..."
                                                    className="w-full outline-none text-sm"
                                                    id="receipt-item-search"
                                                    data-enter-nav="manual"
                                                    value={searchTerm}
                                                    onChange={(event) => {
                                                        setSearchTerm(event.target.value);
                                                        setShowItemPicker(true);
                                                    }}
                                                    onKeyDown={(event) => {
                                                        if (event.key !== 'Enter') return;
                                                        event.preventDefault();
                                                        event.stopPropagation();
                                                        if (filteredItems.length > 0) {
                                                            handleItemSelect(filteredItems[0]);
                                                        }
                                                    }}
                                                    onFocus={() => setShowItemPicker(true)}
                                                />
                                            </div>
                                            {showItemPicker && (
                                                <div className="absolute top-full right-0 mt-1 w-full min-w-[320px] bg-white border border-slate-200 rounded-lg shadow-xl z-50 max-h-60 overflow-y-auto">
                                                    {filteredItems.map((item) => (
                                                        <button
                                                            key={item.id}
                                                            type="button"
                                                            className="w-full text-right px-4 py-2 hover:bg-emerald-50 text-sm border-b border-slate-50 last:border-0 flex justify-between group"
                                                            onClick={() => handleItemSelect(item)}
                                                        >
                                                            <span className="font-medium text-slate-700 group-hover:text-emerald-700">{itemDisplayName(item) || '-'}</span>
                                                            <span className="text-slate-400 text-xs font-mono">{item.code}</span>
                                                        </button>
                                                    ))}
                                                    {filteredItems.length === 0 && (
                                                        <div className="p-3 text-center text-xs text-slate-400">لا توجد نتائج</div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-3 py-2" />
                                    <td className="px-3 py-2" />
                                    <td className="px-3 py-2" />
                                </tr>

                                {lines.map((line, index) => (
                                    <tr key={line.id} className="border-b border-slate-100 hover:bg-slate-50/60">
                                        <td className="px-3 py-2 text-center text-slate-500 font-mono">{index + 1}</td>
                                        <td className="px-3 py-2">
                                            <div className="flex items-center gap-2">
                                                <span className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                                                    {line.itemCode || '-'}
                                                </span>
                                                <span className="font-medium text-slate-700">{line.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-3 py-2">
                                            <input
                                                id={`receipt-quantity-${index}`}
                                                data-enter-nav="manual"
                                                type="number"
                                                min="1"
                                                value={line.quantity}
                                                onChange={(event) => updateLine(line.id, 'quantity', Number(event.target.value) || 0)}
                                                onKeyDown={(event) => handleLineEnter(event, index, 'quantity')}
                                                className="w-full border border-slate-300 rounded-md px-2 py-1.5 text-sm bg-white text-center"
                                            />
                                        </td>
                                        <td className="px-3 py-2">
                                            <input
                                                type="text"
                                                id={`receipt-notes-${index}`}
                                                data-enter-nav="manual"
                                                value={line.notes}
                                                onChange={(event) => updateLine(line.id, 'notes', event.target.value)}
                                                onKeyDown={(event) => handleLineEnter(event, index, 'notes')}
                                                placeholder="ملاحظة..."
                                                className="w-full border border-slate-300 rounded-md px-2 py-1.5 text-sm bg-white"
                                            />
                                        </td>
                                        <td className="px-3 py-2 text-center">
                                            <button
                                                type="button"
                                                onClick={() => removeLine(line.id)}
                                                className="text-slate-300 hover:text-red-500 p-1 rounded-full hover:bg-red-50 transition-all"
                                            >
                                                <Trash2 size={15} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}

                                {lines.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="px-3 py-10 text-center text-slate-400">
                                            لا توجد أصناف مضافة. ابحث بجانب عمود الصنف للإضافة.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>

                        <div className="px-3 py-2 border-t border-[#8ec5ff] bg-[#f5f9ff] text-sm text-slate-700 flex items-center justify-between">
                            <span>عدد الأصناف: {receiptLines.length}</span>
                            <span>إجمالي الكميات: {totalQty}</span>
                        </div>
                    </div>
                </div>

                <PostConfirmDialog
                    open={postDialogOpen}
                    onConfirm={() => void handleSave('POSTED')}
                    onCancel={() => setPostDialogOpen(false)}
                    onDraft={() => void handleSave('DRAFT')}
                    onConfirmNoPrint={() => void handleSave('POSTED')}
                />

                {itemBrowserOpen &&
                    ReactDOM.createPortal(
                        <div
                            className="fixed inset-0 z-[12000] bg-black/35 backdrop-blur-[1px] flex items-start justify-center p-6"
                            onClick={() => setItemBrowserOpen(false)}
                        >
                            <div
                                className="w-full max-w-6xl h-[82vh] bg-white rounded-xl shadow-2xl border border-slate-300 overflow-hidden flex flex-col"
                                onClick={(event) => event.stopPropagation()}
                            >
                                <div className="px-4 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-slate-800 font-semibold">
                                        <Package size={18} className="text-indigo-600" />
                                        اختيار الصنف
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setItemBrowserOpen(false)}
                                        className="inline-flex items-center justify-center w-8 h-8 rounded-md text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors"
                                    >
                                        <X size={16} />
                                    </button>
                                </div>

                                <div className="p-3 border-b border-slate-200 bg-white">
                                    <div className="flex items-center gap-2">
                                        <div className="relative flex-1">
                                            <Search size={15} className="absolute right-2.5 top-2.5 text-slate-400" />
                                            <input
                                                type="text"
                                                value={itemBrowserSearch}
                                                onChange={(event) => setItemBrowserSearch(event.target.value)}
                                                placeholder="ابحث بالكود أو الاسم أو الباركود..."
                                                autoFocus
                                                className="w-full border border-slate-300 rounded-md pr-8 pl-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400"
                                            />
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => void loadMasterData()}
                                            className="inline-flex items-center gap-1.5 px-3 py-2 border border-slate-300 rounded-md text-sm text-slate-700 hover:bg-slate-50"
                                        >
                                            <RefreshCw size={14} />
                                            تحديث
                                        </button>
                                    </div>
                                </div>

                                <div className="flex-1 overflow-auto">
                                    <table className="dense-table w-full">
                                        <thead className="sticky top-0 z-10 bg-[#e8f3ff] text-slate-700">
                                            <tr>
                                                <th className="px-3 py-2 border-b border-[#8ec5ff] w-14 text-center">#</th>
                                                <th className="px-3 py-2 border-b border-[#8ec5ff] w-44 text-right">Code</th>
                                                <th className="px-3 py-2 border-b border-[#8ec5ff] text-right">Name</th>
                                                <th className="px-3 py-2 border-b border-[#8ec5ff] w-44 text-right">Barcode</th>
                                                <th className="px-3 py-2 border-b border-[#8ec5ff] w-28 text-right">Stock</th>
                                                <th className="px-3 py-2 border-b border-[#8ec5ff] w-24 text-center">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {itemBrowserItems.map((item, index) => {
                                                const rawStock = Number((item as any).current_stock ?? (item as any).quantity ?? 0);
                                                const stock = Number.isFinite(rawStock) ? rawStock : 0;
                                                return (
                                                    <tr
                                                        key={item.id}
                                                        onDoubleClick={() => handleItemSelect(item)}
                                                        className="hover:bg-indigo-50/70 border-b border-slate-100"
                                                    >
                                                        <td className="px-3 py-2 text-center text-slate-500 font-mono">{index + 1}</td>
                                                        <td className="px-3 py-2 text-slate-700 font-mono">{String(item.code || '-')}</td>
                                                        <td className="px-3 py-2 text-slate-800 font-medium">{itemDisplayName(item) || '-'}</td>
                                                        <td className="px-3 py-2 text-slate-600 font-mono">{String((item as any).barcode || '-')}</td>
                                                        <td className="px-3 py-2 text-slate-700 font-mono">{stock.toFixed(3)}</td>
                                                        <td className="px-3 py-2 text-center">
                                                            <button
                                                                type="button"
                                                                onClick={() => handleItemSelect(item)}
                                                                className="px-2.5 py-1 rounded-md bg-indigo-600 text-white hover:bg-indigo-700 text-xs"
                                                            >
                                                                اختيار
                                                            </button>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                            {itemBrowserItems.length === 0 && (
                                                <tr>
                                                    <td colSpan={6} className="px-3 py-10 text-center text-slate-400">
                                                        لا توجد أصناف مطابقة
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>,
                        document.body
                    )}

                {showItemPicker && (
                    <div className="fixed inset-0 z-40 bg-transparent" onClick={() => setShowItemPicker(false)} />
                )}
            </div>
        </>
    );
};

export default ReceiptPage;
