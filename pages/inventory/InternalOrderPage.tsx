
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    ArrowRight,
    ChevronDown,
    Download,
    FileText,
    Plus,
    Printer,
    Save,
    Search,
    Share2,
    Trash2,
    Truck
} from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { useTabs } from '../../src/contexts/TabsContext';
import { DocumentSupportDock } from '../../src/components/workspace/DocumentSupportDock';
import { getInventoryOperationSupportSections } from '../../src/components/workspace/documentSupportSections';
import { useEnterNavigation } from '../../src/hooks/useEnterNavigation';
import { Item, Warehouse } from '../../types';
import { exportToCSV } from '../../utils/export';
import { FloatingDropdown, floatingMenuItemClass } from '../../src/components/ui/FloatingDropdown';
import DefinitionMasterList, { DefinitionListColumn } from '../../src/components/definitions/DefinitionMasterList';

type ViewMode = 'LIST' | 'FORM';
type ToolbarMenu = 'track' | 'convert' | 'export' | null;
type ExportFormat = 'excel' | 'delimited' | 'json' | 'html' | 'pdf';

interface OrderLine {
    id: string;
    itemId: string;
    itemCode: string;
    name: string;
    quantity: number;
    receivedQuantity: number;
    notes: string;
    unitId?: string;
}

interface InternalOrderHeader {
    date: string;
    requiredDate: string;
    fromWarehouseId: string;
    toWarehouseId: string;
    notes: string;
    refNo: string;
    status: string;
}

interface InternalOrderRow {
    id: string;
    code: string;
    date: string;
    status: string;
    notes: string;
    from_warehouse_id: string;
    to_warehouse_id: string;
    from_warehouse_name: string;
    to_warehouse_name: string;
    lines_count: number;
    total_quantity: number;
    received_quantity: number;
    pending_lines: number;
    request_type?: string;
}

const INTERNAL_ORDER_CONVERSION_KEY = 'wafi:internal-order-conversion';

const TRACK_MENU_ITEMS: Array<{ id: string; label: string }> = [
    { id: 'summary', label: 'ملخص الطلبية' },
    { id: 'openDocument', label: 'فتح المستند' },
    { id: 'trace', label: 'حركات المخزون' },
    { id: 'toDispatches', label: 'سندات الإرسال' },
    { id: 'toReceipts', label: 'سندات الاستلام' }
];

const CONVERT_MENU_ITEMS: Array<{ id: string; label: string }> = [
    { id: 'dispatch', label: 'إلى سند إرسال' },
    { id: 'receipt', label: 'إلى سند استلام' },
    { id: 'salesOrder', label: 'إلى طلبية مبيعات' },
    { id: 'purchaseOrder', label: 'إلى طلبية مشتريات' },
    { id: 'salesInvoice', label: 'إلى فاتورة مبيعات' },
    { id: 'purchaseInvoice', label: 'إلى فاتورة مشتريات' }
];

const INTERNAL_ORDER_STATUS_OPTIONS = [
    { value: 'PENDING', label: 'قيد الطلب' },
    { value: 'IN_TRANSIT', label: 'قيد النقل' },
    { value: 'COMPLETED', label: 'مكتملة' },
    { value: 'CANCELLED', label: 'ملغاة' },
    { value: 'DRAFT', label: 'مسودة' }
];

const nowDate = (): string => new Date().toISOString().split('T')[0];
const normalizeText = (value: unknown): string => String(value ?? '').trim().toLowerCase();

const onlyDate = (value: unknown): string => {
    const raw = String(value ?? '').trim();
    if (!raw) return '';
    return raw.includes('T') ? raw.split('T')[0] : raw;
};

const createEmptyLine = (): OrderLine => ({
    id: uuidv4(),
    itemId: '',
    itemCode: '',
    name: '',
    quantity: 1,
    receivedQuantity: 0,
    notes: ''
});

const buildHeaderDefaults = (warehouses: Warehouse[]): InternalOrderHeader => {
    const requester = warehouses[0]?.id ? String(warehouses[0].id) : '';
    const source = warehouses[1]?.id ? String(warehouses[1].id) : requester;
    return {
        date: nowDate(),
        requiredDate: '',
        fromWarehouseId: requester,
        toWarehouseId: source,
        notes: '',
        refNo: 'NEW',
        status: 'PENDING'
    };
};

const buildFileStem = (seed: string) =>
    String(seed || 'internal-order')
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

const parseInternalOrderNotes = (raw: unknown): { requiredDate: string; notes: string } => {
    const source = String(raw ?? '').trim();
    if (!source) return { requiredDate: '', notes: '' };

    const parts = source.split('|').map((part) => part.trim()).filter(Boolean);
    const remaining: string[] = [];
    let requiredDate = '';

    parts.forEach((part) => {
        const normalized = normalizeText(part);
        if (normalized.startsWith('required date:') || normalized.startsWith('requireddate:') || normalized.startsWith('required_date=')) {
            const separator = part.includes('=') ? '=' : ':';
            const rawValue = part.split(separator).slice(1).join(separator).trim();
            if (rawValue) requiredDate = onlyDate(rawValue);
            return;
        }
        if (normalized.startsWith('تاريخ الاحتياج:')) {
            const rawValue = part.split(':').slice(1).join(':').trim();
            if (rawValue) requiredDate = onlyDate(rawValue);
            return;
        }
        remaining.push(part);
    });

    return { requiredDate, notes: remaining.join(' | ') };
};

const buildInternalOrderNotes = (header: InternalOrderHeader): string => {
    const segments: string[] = [];
    if (header.requiredDate) segments.push(`Required Date: ${header.requiredDate}`);
    const freeNotes = String(header.notes || '').trim();
    if (freeNotes) segments.push(freeNotes);
    return segments.join(' | ');
};

const statusLabel = (status: unknown): string => {
    const value = String(status || '').toUpperCase();
    if (value === 'PENDING') return 'قيد الطلب';
    if (value === 'IN_TRANSIT') return 'قيد النقل';
    if (value === 'COMPLETED') return 'مكتملة';
    if (value === 'CANCELLED') return 'ملغاة';
    if (value === 'DRAFT') return 'مسودة';
    return value || '-';
};

const statusClass = (status: unknown): string => {
    const value = String(status || '').toUpperCase();
    if (value === 'COMPLETED') return 'bg-emerald-100 text-emerald-700';
    if (value === 'IN_TRANSIT') return 'bg-sky-100 text-sky-700';
    if (value === 'CANCELLED') return 'bg-rose-100 text-rose-700';
    if (value === 'DRAFT') return 'bg-slate-100 text-slate-700';
    return 'bg-amber-100 text-amber-700';
};

const itemDisplayName = (item: Partial<Item>): string => String(item.name_ar || (item as any).name || item.name_en || '');
const itemCodeValue = (item: Partial<Item>): string => String((item as any).code || '').trim();

export const InternalOrderPage = () => {
    const { openTab } = useTabs();
    const pageRef = useRef<HTMLDivElement | null>(null);
    const helperSections = useMemo(() => getInventoryOperationSupportSections(), []);

    useEnterNavigation(pageRef);

    const [viewMode, setViewMode] = useState<ViewMode>('LIST');
    const [openMenu, setOpenMenu] = useState<ToolbarMenu>(null);

    const [header, setHeader] = useState<InternalOrderHeader>(buildHeaderDefaults([]));
    const [lines, setLines] = useState<OrderLine[]>([]);

    const [orders, setOrders] = useState<InternalOrderRow[]>([]);
    const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
    const [openedOrderStatus, setOpenedOrderStatus] = useState('');
    const [isExistingOrder, setIsExistingOrder] = useState(false);

    const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
    const [items, setItems] = useState<Item[]>([]);

    const [loadingList, setLoadingList] = useState(false);
    const [saving, setSaving] = useState(false);

    const [searchTerm, setSearchTerm] = useState('');
    const [showItemPicker, setShowItemPicker] = useState(false);

    const openPortalTab = (path: string, title: string) => {
        openTab({ id: path, path, title, isClosable: true });
        setOpenMenu(null);
        setShowItemPicker(false);
    };

    const resetForm = () => {
        setHeader(buildHeaderDefaults(warehouses));
        setLines([]);
        setSelectedOrderId(null);
        setOpenedOrderStatus('');
        setIsExistingOrder(false);
        setSearchTerm('');
        setShowItemPicker(false);
        setOpenMenu(null);
    };

    const loadMasterData = async () => {
        const api = window.electronAPI;
        if (!api?.inventory) return;
        try {
            const [warehouseRows, itemRows] = await Promise.all([
                api.inventory.getWarehouses(),
                api.inventory.getItems()
            ]);

            const resolvedWarehouses = Array.isArray(warehouseRows) ? warehouseRows : [];
            setWarehouses(resolvedWarehouses);
            setItems(Array.isArray(itemRows) ? itemRows : []);

            if (!selectedOrderId) {
                const defaults = buildHeaderDefaults(resolvedWarehouses);
                setHeader((prev) => ({
                    ...prev,
                    fromWarehouseId: prev.fromWarehouseId || defaults.fromWarehouseId,
                    toWarehouseId: prev.toWarehouseId || defaults.toWarehouseId
                }));
            }
        } catch (error) {
            console.error('Failed to load internal order master data:', error);
        }
    };

    const loadOrders = async () => {
        const api = window.electronAPI;
        if (!api?.inventory?.getTransferRequests) {
            setOrders([]);
            return;
        }

        setLoadingList(true);
        try {
            const rows = await api.inventory.getTransferRequests({ request_type: 'INTERNAL_ORDER' });
            setOrders(Array.isArray(rows) ? (rows as InternalOrderRow[]) : []);
        } catch (error) {
            console.error('Failed to load internal orders:', error);
            setOrders([]);
        } finally {
            setLoadingList(false);
        }
    };

    useEffect(() => {
        void Promise.all([loadMasterData(), loadOrders()]);
    }, []);

    useEffect(() => {
        const onFocus = () => {
            void Promise.all([loadMasterData(), loadOrders()]);
        };
        window.addEventListener('focus', onFocus);
        return () => window.removeEventListener('focus', onFocus);
    }, []);

    useEffect(() => {
        const onOutsideClick = (event: MouseEvent) => {
            if (!pageRef.current) return;
            if (!pageRef.current.contains(event.target as Node)) {
                setOpenMenu(null);
            }
        };
        document.addEventListener('mousedown', onOutsideClick);
        return () => document.removeEventListener('mousedown', onOutsideClick);
    }, []);

    const selectedOrder = useMemo(
        () => orders.find((row) => String(row.id) === String(selectedOrderId || '')) || null,
        [orders, selectedOrderId]
    );

    const filteredItems = useMemo(() => {
        const query = normalizeText(searchTerm);
        if (!query) return items.slice(0, 20);
        return items
            .filter((item) => {
                const code = normalizeText(itemCodeValue(item));
                const name = normalizeText(itemDisplayName(item));
                return code.includes(query) || name.includes(query);
            })
            .slice(0, 20);
    }, [items, searchTerm]);

    const applyOrderDetail = (sourceHeader: any, sourceLines: any[]) => {
        const parsedNotes = parseInternalOrderNotes(sourceHeader?.notes);

        const mappedLines: OrderLine[] = Array.isArray(sourceLines)
            ? sourceLines.map((line) => {
                const itemId = String(line?.item_id || '');
                const matchedItem = items.find((item) => String(item.id) === itemId);
                return {
                    id: uuidv4(),
                    itemId,
                    itemCode: String(line?.item_code || itemCodeValue(matchedItem || {})),
                    name: String(line?.item_name || itemDisplayName(matchedItem || {})),
                    quantity: Number(line?.quantity) || 0,
                    receivedQuantity: Number(line?.received_quantity) || 0,
                    notes: String(line?.notes || ''),
                    unitId: String(line?.unit_id || '') || undefined
                };
            })
            : [];

        setHeader({
            date: onlyDate(sourceHeader?.date) || nowDate(),
            requiredDate: parsedNotes.requiredDate,
            fromWarehouseId: String(sourceHeader?.to_warehouse_id || ''),
            toWarehouseId: String(sourceHeader?.from_warehouse_id || ''),
            notes: parsedNotes.notes,
            refNo: String(sourceHeader?.code || sourceHeader?.id || 'NEW'),
            status: String(sourceHeader?.status || 'PENDING').toUpperCase()
        });

        setLines(mappedLines);
        setSelectedOrderId(String(sourceHeader?.id || ''));
        setOpenedOrderStatus(String(sourceHeader?.status || ''));
        setIsExistingOrder(true);
        setViewMode('FORM');
        setOpenMenu(null);
        setShowItemPicker(false);
    };

    const openOrderById = async (id: string) => {
        if (!id) return;
        const api = window.electronAPI;
        if (!api?.inventory?.getTransferRequest) return;

        try {
            const detail = await api.inventory.getTransferRequest(id);
            if (!detail?.header) return;
            applyOrderDetail(detail.header, Array.isArray(detail.lines) ? detail.lines : []);
        } catch (error) {
            console.error('Failed to open internal order by id:', error);
            alert('تعذر فتح الطلبية.');
        }
    };

    const openOrderFromRow = async (row: InternalOrderRow) => {
        if (!row?.id) return;
        await openOrderById(String(row.id));
    };

    const openSelectedOrder = async () => {
        if (!selectedOrderId) {
            alert('حدد طلبية من القائمة أولاً.');
            return;
        }

        const row = orders.find((candidate) => String(candidate.id) === String(selectedOrderId));
        if (!row) {
            alert('تعذر العثور على الطلبية المحددة.');
            return;
        }

        await openOrderFromRow(row);
    };

    const addLine = () => {
        if (isExistingOrder) return;
        setLines((prev) => [...prev, createEmptyLine()]);
    };

    const updateLine = (id: string, field: keyof OrderLine, value: string | number) => {
        if (isExistingOrder) return;
        setLines((prev) => prev.map((line) => (line.id === id ? { ...line, [field]: value } : line)));
    };

    const removeLine = (id: string) => {
        if (isExistingOrder) return;
        setLines((prev) => prev.filter((line) => line.id !== id));
    };

    const handleItemSelect = (item: Item) => {
        if (isExistingOrder) return;

        setLines((prev) => [
            ...prev,
            {
                id: uuidv4(),
                itemId: String(item.id || ''),
                itemCode: itemCodeValue(item),
                name: itemDisplayName(item),
                quantity: 1,
                receivedQuantity: 0,
                notes: '',
                unitId: String((item as any).base_unit_id || '') || undefined
            }
        ]);
        setSearchTerm('');
        setShowItemPicker(false);
    };

    const handleSave = async () => {
        if (isExistingOrder) {
            alert('هذه طلبية محفوظة مسبقاً للمتابعة فقط. أنشئ طلبية جديدة للتعديل.');
            return;
        }

        if (!header.fromWarehouseId || !header.toWarehouseId) {
            alert('الرجاء اختيار المستودعات.');
            return;
        }

        if (header.fromWarehouseId === header.toWarehouseId) {
            alert('لا يمكن أن يكون المستودع الطالب والمزود نفس المستودع.');
            return;
        }

        const validLines = lines
            .filter((line) => line.itemId && Number(line.quantity) > 0)
            .map((line) => ({
                item_id: line.itemId,
                unit_id: line.unitId || null,
                quantity: Number(line.quantity) || 0,
                notes: line.notes || ''
            }));

        if (validLines.length === 0) {
            alert('الرجاء إضافة أصناف وكميات صحيحة قبل الحفظ.');
            return;
        }

        const api = window.electronAPI;
        if (!api?.inventory?.transferRequest) {
            alert('خدمة حفظ الطلبيات غير متاحة حالياً.');
            return;
        }

        setSaving(true);
        try {
            const result = await api.inventory.transferRequest({
                type: 'INTERNAL_ORDER',
                from_warehouse_id: header.toWarehouseId,
                to_warehouse_id: header.fromWarehouseId,
                date: header.date,
                notes: buildInternalOrderNotes(header),
                items: validLines
            });

            const createdCode = String(result?.code || '');
            const createdId = String(result?.id || '');
            alert(createdCode ? `تم حفظ الطلبية بنجاح: ${createdCode}` : 'تم حفظ الطلبية بنجاح.');

            await loadOrders();

            if (createdId) {
                await openOrderById(createdId);
            } else {
                resetForm();
                setViewMode('LIST');
            }
        } catch (error: any) {
            alert(`فشل حفظ الطلبية: ${error?.message || 'خطأ غير معروف'}`);
        } finally {
            setSaving(false);
        }
    };

    const resolveActiveContext = async (): Promise<{ refNo: string; status: string; lines: OrderLine[]; orderId: string; }> => {
        if (viewMode === 'FORM') {
            return {
                refNo: header.refNo,
                status: header.status,
                lines,
                orderId: String(selectedOrderId || '')
            };
        }

        if (!selectedOrderId) {
            throw new Error('حدد طلبية من القائمة أولاً.');
        }

        const api = window.electronAPI;
        if (!api?.inventory?.getTransferRequest) {
            throw new Error('تعذر تحميل تفاصيل الطلبية.');
        }

        const detail = await api.inventory.getTransferRequest(String(selectedOrderId));
        if (!detail?.header) {
            throw new Error('تعذر العثور على الطلبية المحددة.');
        }

        const contextLines: OrderLine[] = Array.isArray(detail.lines)
            ? detail.lines.map((line: any) => ({
                id: uuidv4(),
                itemId: String(line?.item_id || ''),
                itemCode: String(line?.item_code || ''),
                name: String(line?.item_name || ''),
                quantity: Number(line?.quantity) || 0,
                receivedQuantity: Number(line?.received_quantity) || 0,
                notes: String(line?.notes || ''),
                unitId: String(line?.unit_id || '') || undefined
            }))
            : [];

        return {
            refNo: String(detail.header?.code || detail.header?.id || ''),
            status: String(detail.header?.status || ''),
            lines: contextLines,
            orderId: String(detail.header?.id || '')
        };
    };

    const openConversionTarget = async (path: string, title: string) => {
        let orderId = String(selectedOrderId || '');
        let orderCode = viewMode === 'FORM' ? header.refNo : String(selectedOrder?.code || '');

        if (orderId) {
            try {
                sessionStorage.setItem(
                    INTERNAL_ORDER_CONVERSION_KEY,
                    JSON.stringify({
                        source: 'internal-order',
                        orderId,
                        orderCode: orderCode || null,
                        timestamp: Date.now()
                    })
                );
            } catch (error) {
                console.warn('Failed to store internal order conversion context:', error);
            }

            const query = new URLSearchParams({ internal_order_id: orderId });
            if (orderCode) query.set('internal_order_code', orderCode);
            openPortalTab(`${path}?${query.toString()}`, orderCode ? `${title} ${orderCode}` : title);
            return;
        }

        openPortalTab(path, title);
    };

    const handleTrackAction = async (action: string) => {
        try {
            if (action === 'trace') {
                openPortalTab('/inventory/stock-transactions', 'حركات المخزون');
                return;
            }

            if (action === 'openDocument') {
                if (viewMode === 'LIST') await openSelectedOrder();
                return;
            }

            if (action === 'toDispatches') {
                await openConversionTarget('/inventory/dispatch', 'سندات الإرسال');
                return;
            }

            if (action === 'toReceipts') {
                await openConversionTarget('/inventory/receipt', 'سندات الاستلام');
                return;
            }

            if (action === 'summary') {
                const context = await resolveActiveContext();
                const totalQty = context.lines.reduce((sum, line) => sum + (Number(line.quantity) || 0), 0);
                const receivedQty = context.lines.reduce((sum, line) => sum + (Number(line.receivedQuantity) || 0), 0);
                const pendingQty = totalQty - receivedQty;

                alert(
                    `مرجع الطلبية: ${context.refNo || '-'}\n` +
                    `الحالة: ${statusLabel(context.status)}\n` +
                    `عدد الأصناف: ${context.lines.length}\n` +
                    `إجمالي الكمية المطلوبة: ${totalQty.toFixed(3)}\n` +
                    `إجمالي المستلم: ${receivedQty.toFixed(3)}\n` +
                    `الكمية المتبقية: ${pendingQty.toFixed(3)}`
                );
            }
        } catch (error: any) {
            alert(error?.message || 'تعذر تنفيذ عملية التتبع.');
        } finally {
            setOpenMenu(null);
        }
    };

    const handleConvertAction = async (action: string) => {
        if (action === 'dispatch') {
            await openConversionTarget('/inventory/dispatch', 'سند إرسال');
        } else if (action === 'receipt') {
            await openConversionTarget('/inventory/receipt', 'سند استلام');
        } else if (action === 'salesOrder') {
            await openConversionTarget('/sales/orders/new', 'طلبية مبيعات جديدة');
        } else if (action === 'purchaseOrder') {
            await openConversionTarget('/purchasing/orders/new', 'طلبية مشتريات جديدة');
        } else if (action === 'salesInvoice') {
            await openConversionTarget('/sales/invoices/new', 'فاتورة مبيعات جديدة');
        } else if (action === 'purchaseInvoice') {
            await openConversionTarget('/trade/purchasing/invoice', 'فاتورة مشتريات');
        }
        setOpenMenu(null);
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

    const exportOrders = (format: ExportFormat) => {
        const rows = orders.map((row, index) => {
            const parsed = parseInternalOrderNotes(row.notes);
            const totalQty = Number(row.total_quantity) || 0;
            const receivedQty = Number(row.received_quantity) || 0;
            return {
                '#': index + 1,
                'رقم الطلبية': row.code || '-',
                'تاريخ الطلب': onlyDate(row.date) || '-',
                'الحالة': statusLabel(row.status),
                'المستودع المزود (من)': row.from_warehouse_name || '-',
                'المستودع الطالب (إلى)': row.to_warehouse_name || '-',
                'عدد الأصناف': Number(row.lines_count) || 0,
                'الكمية المطلوبة': totalQty,
                'الكمية المستلمة': receivedQty,
                'الكمية المتبقية': totalQty - receivedQty,
                'تاريخ الاحتياج': parsed.requiredDate || '-',
                'ملاحظات': parsed.notes || '-'
            };
        });

        formatExport(rows, format, `internal-orders-${nowDate()}`, 'Internal Orders');
    };

    const exportCurrentOrder = (format: ExportFormat) => {
        const fromWarehouse = warehouses.find((warehouse) => String(warehouse.id) === String(header.fromWarehouseId));
        const toWarehouse = warehouses.find((warehouse) => String(warehouse.id) === String(header.toWarehouseId));

        const rows = lines.map((line, index) => {
            const qty = Number(line.quantity) || 0;
            const received = Number(line.receivedQuantity) || 0;
            return {
                '#': index + 1,
                'رقم الطلبية': header.refNo || '-',
                'الحالة': statusLabel(header.status),
                'تاريخ الطلب': header.date || '-',
                'تاريخ الاحتياج': header.requiredDate || '-',
                'المستودع الطالب (إلى)': String((fromWarehouse as any)?.name_ar || (fromWarehouse as any)?.name || fromWarehouse?.code || '-'),
                'المستودع المزود (من)': String((toWarehouse as any)?.name_ar || (toWarehouse as any)?.name || toWarehouse?.code || '-'),
                'الصنف': line.name || '-',
                'كود الصنف': line.itemCode || '-',
                'الكمية المطلوبة': qty,
                'الكمية المستلمة': received,
                'الكمية المتبقية': qty - received,
                'ملاحظات الصنف': line.notes || '-',
                'ملاحظات الطلبية': header.notes || '-'
            };
        });

        formatExport(rows, format, buildFileStem(`internal-order-${header.refNo || header.date || nowDate()}`), 'Internal Warehouse Order');
    };

    const totalQty = useMemo(() => lines.reduce((sum, line) => sum + (Number(line.quantity) || 0), 0), [lines]);
    const totalReceivedQty = useMemo(() => lines.reduce((sum, line) => sum + (Number(line.receivedQuantity) || 0), 0), [lines]);
    const ordersTotalQty = useMemo(() => orders.reduce((sum, row) => sum + (Number(row.total_quantity) || 0), 0), [orders]);
    const pendingOrdersCount = useMemo(
        () => orders.filter((row) => String(row.status || '').toUpperCase() === 'PENDING').length,
        [orders]
    );
    const completedOrdersCount = useMemo(
        () => orders.filter((row) => String(row.status || '').toUpperCase() === 'COMPLETED').length,
        [orders]
    );

    const handleListSelectedRowsChange = useCallback((rows: InternalOrderRow[]) => {
        setSelectedOrderId(rows[0]?.id ? String(rows[0].id) : null);
    }, []);

    const listColumns = useMemo<DefinitionListColumn<InternalOrderRow>[]>(() => [
        {
            key: 'code',
            label: 'رقم الطلبية',
            width: 150,
            defaultVisible: true,
            getSearchValue: (row) => {
                const parsed = parseInternalOrderNotes(row.notes);
                return [
                    row.code,
                    row.date,
                    row.status,
                    row.from_warehouse_name,
                    row.to_warehouse_name,
                    parsed.requiredDate,
                    parsed.notes
                ].filter(Boolean).join(' ');
            },
            renderCell: (row) => (
                <span className="rounded-lg bg-slate-100 px-2 py-1 font-mono text-xs font-bold text-sky-700">
                    {row.code || '-'}
                </span>
            )
        },
        {
            key: 'date',
            label: 'تاريخ الطلب',
            type: 'date',
            filterType: 'date',
            width: 130,
            defaultVisible: true,
            getValue: (row) => onlyDate(row.date),
            getDisplayValue: (row) => onlyDate(row.date) || '-'
        },
        {
            key: 'status',
            label: 'الحالة',
            type: 'enum',
            filterType: 'enum',
            width: 140,
            defaultVisible: true,
            options: INTERNAL_ORDER_STATUS_OPTIONS,
            getValue: (row) => String(row.status || '').toUpperCase(),
            getDisplayValue: (row) => statusLabel(row.status),
            renderCell: (row) => (
                <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${statusClass(row.status)}`}>
                    {statusLabel(row.status)}
                </span>
            )
        },
        {
            key: 'from_warehouse_name',
            label: 'المزود (من)',
            width: 190,
            defaultVisible: true,
            getDisplayValue: (row) => row.from_warehouse_name || '-'
        },
        {
            key: 'to_warehouse_name',
            label: 'الطالب (إلى)',
            width: 190,
            defaultVisible: true,
            getDisplayValue: (row) => row.to_warehouse_name || '-'
        },
        {
            key: 'lines_count',
            label: 'عدد الأصناف',
            type: 'number',
            filterType: 'number',
            width: 120,
            defaultVisible: true,
            getValue: (row) => Number(row.lines_count || 0),
            getDisplayValue: (row) => String(Number(row.lines_count || 0))
        },
        {
            key: 'total_quantity',
            label: 'الكمية المطلوبة',
            type: 'number',
            filterType: 'number',
            width: 150,
            defaultVisible: true,
            getValue: (row) => Number(row.total_quantity || 0),
            getDisplayValue: (row) => Number(row.total_quantity || 0).toFixed(3)
        },
        {
            key: 'received_quantity',
            label: 'المستلم',
            type: 'number',
            filterType: 'number',
            width: 120,
            defaultVisible: true,
            getValue: (row) => Number(row.received_quantity || 0),
            getDisplayValue: (row) => Number(row.received_quantity || 0).toFixed(3)
        },
        {
            key: 'remaining_quantity',
            label: 'المتبقي',
            type: 'number',
            filterType: 'number',
            width: 120,
            defaultVisible: true,
            getValue: (row) => Number(row.total_quantity || 0) - Number(row.received_quantity || 0),
            getDisplayValue: (row) => (Number(row.total_quantity || 0) - Number(row.received_quantity || 0)).toFixed(3)
        },
        {
            key: 'required_date',
            label: 'تاريخ الاحتياج',
            type: 'date',
            filterType: 'date',
            width: 140,
            defaultVisible: false,
            getValue: (row) => parseInternalOrderNotes(row.notes).requiredDate,
            getDisplayValue: (row) => parseInternalOrderNotes(row.notes).requiredDate || '-'
        },
        {
            key: 'notes',
            label: 'ملاحظات',
            width: 260,
            defaultVisible: true,
            getDisplayValue: (row) => parseInternalOrderNotes(row.notes).notes || '-',
            renderCell: (row) => (
                <span className="line-clamp-2 text-slate-600" title={parseInternalOrderNotes(row.notes).notes || ''}>
                    {parseInternalOrderNotes(row.notes).notes || '-'}
                </span>
            )
        },
        {
            key: 'actions',
            label: 'إجراءات',
            width: 110,
            sortable: false,
            filterable: false,
            searchable: false,
            defaultVisible: true,
            align: 'center',
            renderCell: (row) => (
                <button
                    type="button"
                    onClick={(event) => {
                        event.stopPropagation();
                        setSelectedOrderId(String(row.id));
                        void openOrderFromRow(row);
                    }}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-sky-700 transition hover:border-sky-300 hover:bg-sky-50"
                    title="فتح الطلبية"
                >
                    فتح
                </button>
            )
        }
    ], [openOrderFromRow]);

    if (viewMode === 'LIST') {
        return (
            <div className="flex flex-col h-full bg-slate-50 p-4 gap-3" dir="rtl" ref={pageRef}>
                <DocumentSupportDock
                    sections={helperSections}
                    title="تعريفات الطلبيات"
                    description="يمكنك إدارة الأصناف والمستودعات والعملاء والمركبات من نفس شاشة الطلبية."
                />

                <DefinitionMasterList
                    headerIcon={<Truck size={24} />}
                    headerTitle="طلبيات المستودع الداخلية"
                    headerSubtitle="إدارة الطلبات الداخلية والتحويلات بين المستودعات بنفس خصائص جدول العملات وأسعار الصرف."
                    headerBadges={[
                        { label: `${orders.length} طلبية`, tone: 'info' },
                        { label: `${ordersTotalQty.toFixed(3)} كمية`, tone: 'neutral', mono: true },
                        { label: `قيد الطلب ${pendingOrdersCount}`, tone: 'warning' },
                        { label: `مكتملة ${completedOrdersCount}`, tone: 'success' }
                    ]}
                    screenKey="inventory.internal-orders"
                    data={orders}
                    loading={loadingList}
                    columns={listColumns}
                    rowKey={(row) => String(row.id)}
                    searchPlaceholder="بحث برقم الطلبية أو المستودع أو الملاحظات..."
                    emptyMessage="لا توجد طلبيات مطابقة للمعايير الحالية"
                    createLabel="طلبية جديدة"
                    onCreate={() => {
                        resetForm();
                        setViewMode('FORM');
                    }}
                    onRefresh={loadOrders}
                    onRowDoubleClick={openOrderFromRow}
                    onSelectedRowsChange={handleListSelectedRowsChange}
                    defaultSort={{ key: 'date', direction: 'desc' }}
                    toolbarExtraActions={(
                        <>
                            <button
                                type="button"
                                onClick={() => void openSelectedOrder()}
                                disabled={!selectedOrderId}
                                className="inline-flex h-11 items-center gap-2 rounded-2xl border border-sky-200 bg-white px-4 text-sm font-semibold text-sky-700 shadow-sm transition hover:bg-sky-50 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                                <FileText size={16} />
                                <span>فتح المحدد</span>
                            </button>

                            <FloatingDropdown
                                isOpen={openMenu === 'track'}
                                onClose={() => setOpenMenu(null)}
                                menuWidth={230}
                                title="التتبع"
                                trigger={
                                    <button
                                        type="button"
                                        onClick={() => setOpenMenu((prev) => (prev === 'track' ? null : 'track'))}
                                        className="inline-flex h-11 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-sky-300 hover:text-sky-700"
                                    >
                                        <FileText size={16} />
                                        <span>التتبع</span>
                                        <ChevronDown size={14} />
                                    </button>
                                }
                            >
                                {TRACK_MENU_ITEMS.map(({ id, label }) => (
                                    <button key={id} type="button" role="menuitem" onClick={() => void handleTrackAction(id)} className={floatingMenuItemClass}>{label}</button>
                                ))}
                            </FloatingDropdown>

                            <FloatingDropdown
                                isOpen={openMenu === 'convert'}
                                onClose={() => setOpenMenu(null)}
                                menuWidth={230}
                                title="تحويل"
                                trigger={
                                    <button
                                        type="button"
                                        onClick={() => setOpenMenu((prev) => (prev === 'convert' ? null : 'convert'))}
                                        className="inline-flex h-11 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-sky-300 hover:text-sky-700"
                                    >
                                        <Share2 size={16} />
                                        <span>تحويل</span>
                                        <ChevronDown size={14} />
                                    </button>
                                }
                            >
                                {CONVERT_MENU_ITEMS.map(({ id, label }) => (
                                    <button key={id} type="button" role="menuitem" onClick={() => void handleConvertAction(id)} className={floatingMenuItemClass}>{label}</button>
                                ))}
                            </FloatingDropdown>
                        </>
                    )}
                />
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-slate-50 relative" dir="rtl" ref={pageRef}>
            <div className="bg-white border-b border-slate-200 px-4 py-2 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-2">
                    <button type="button" onClick={() => { setViewMode('LIST'); setOpenMenu(null); }} className="p-2 rounded-md border border-slate-300 text-slate-600 hover:bg-slate-50">
                        <ArrowRight size={16} />
                    </button>
                    <div className="w-9 h-9 bg-orange-100 rounded-md text-orange-600 flex items-center justify-center"><Truck size={18} /></div>
                    <div>
                        <h1 className="text-base font-bold text-slate-800">طلبية مستودع داخلية</h1>
                        <p className="text-xs text-slate-500">{header.refNo || 'NEW'}</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {isExistingOrder && <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${statusClass(openedOrderStatus || header.status)}`}>{statusLabel(openedOrderStatus || header.status)}</span>}

                    <FloatingDropdown
                        isOpen={openMenu === 'track'}
                        onClose={() => setOpenMenu(null)}
                        menuWidth={230}
                        title="التتبع"
                        trigger={
                            <button
                                type="button"
                                onClick={() => setOpenMenu((prev) => (prev === 'track' ? null : 'track'))}
                                className="inline-flex items-center gap-1.5 px-3 py-2 border border-slate-300 rounded-lg text-sm hover:bg-slate-50"
                            >
                                <FileText size={15} />
                                التتبع
                                <ChevronDown size={14} />
                            </button>
                        }
                    >
                        {TRACK_MENU_ITEMS.map(({ id, label }) => (
                            <button key={id} type="button" role="menuitem" onClick={() => void handleTrackAction(id)} className={floatingMenuItemClass}>{label}</button>
                        ))}
                    </FloatingDropdown>

                    <FloatingDropdown
                        isOpen={openMenu === 'convert'}
                        onClose={() => setOpenMenu(null)}
                        menuWidth={230}
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
                            <button key={id} type="button" role="menuitem" onClick={() => void handleConvertAction(id)} className={floatingMenuItemClass}>{label}</button>
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
                        <button type="button" role="menuitem" onClick={() => exportCurrentOrder('excel')} className={floatingMenuItemClass}>Excel / CSV</button>
                        <button type="button" role="menuitem" onClick={() => exportCurrentOrder('html')} className={floatingMenuItemClass}>HTML</button>
                        <button type="button" role="menuitem" onClick={() => exportCurrentOrder('json')} className={floatingMenuItemClass}>JSON</button>
                        <button type="button" role="menuitem" onClick={() => exportCurrentOrder('pdf')} className={floatingMenuItemClass}>PDF</button>
                    </FloatingDropdown>

                    <button type="button" onClick={() => window.print()} className="p-2 border border-slate-300 rounded-md hover:bg-slate-50 text-slate-700"><Printer size={16} /></button>
                    <button type="button" onClick={() => { resetForm(); setViewMode('LIST'); }} className="px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-700 hover:bg-slate-50">إغلاق</button>
                    <button type="button" onClick={() => void handleSave()} disabled={saving || isExistingOrder} className="inline-flex items-center gap-1.5 px-3 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm font-semibold disabled:opacity-50">
                        <Save size={15} />
                        حفظ الطلبية
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-auto p-4">
                <DocumentSupportDock
                    sections={helperSections}
                    title="تعريفات الطلبية"
                    description="افتح القوائم المرجعية فوق النموذج ثم تابع تعبئة الطلبية مباشرة."
                />

                {isExistingOrder && (
                    <div className="mb-3 px-3 py-2 rounded-lg border border-amber-200 bg-amber-50 text-amber-700 text-sm">
                        هذه طلبية محفوظة مسبقاً للمتابعة والتتبع فقط. لإنشاء طلبية جديدة استخدم زر "طلبية جديدة" من شاشة القائمة.
                    </div>
                )}

                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-4">
                    <h2 className="font-bold text-slate-700 mb-4 flex items-center gap-2 border-b border-slate-100 pb-2"><Truck size={18} className="text-purple-500" />بيانات الموقع والتاريخ</h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-600 mb-1.5">المستودع الطالب (إلى)</label>
                            <select value={header.fromWarehouseId} onChange={(event) => setHeader((prev) => ({ ...prev, fromWarehouseId: event.target.value }))} disabled={isExistingOrder} className="w-full p-2.5 bg-white border border-slate-200 rounded-lg focus:border-purple-500 focus:ring-2 focus:ring-purple-100 outline-none disabled:bg-slate-100">
                                {warehouses.map((warehouse) => <option key={warehouse.id} value={warehouse.id}>{String((warehouse as any).name_ar || (warehouse as any).name || warehouse.code || warehouse.id)}</option>)}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-600 mb-1.5">المستودع المزود (من)</label>
                            <select value={header.toWarehouseId} onChange={(event) => setHeader((prev) => ({ ...prev, toWarehouseId: event.target.value }))} disabled={isExistingOrder} className="w-full p-2.5 bg-white border border-slate-200 rounded-lg focus:border-purple-500 focus:ring-2 focus:ring-purple-100 outline-none disabled:bg-slate-100">
                                {warehouses.map((warehouse) => <option key={warehouse.id} value={warehouse.id}>{String((warehouse as any).name_ar || (warehouse as any).name || warehouse.code || warehouse.id)}</option>)}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-600 mb-1.5">تاريخ الطلب</label>
                            <input type="date" value={header.date} onChange={(event) => setHeader((prev) => ({ ...prev, date: event.target.value }))} disabled={isExistingOrder} className="w-full p-2.5 border border-slate-200 rounded-lg focus:border-purple-500 focus:ring-2 focus:ring-purple-100 outline-none disabled:bg-slate-100" />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-600 mb-1.5">تاريخ الاحتياج</label>
                            <input type="date" value={header.requiredDate} onChange={(event) => setHeader((prev) => ({ ...prev, requiredDate: event.target.value }))} disabled={isExistingOrder} className="w-full p-2.5 border border-slate-200 rounded-lg focus:border-purple-500 focus:ring-2 focus:ring-purple-100 outline-none disabled:bg-slate-100" />
                        </div>

                        <div className="lg:col-span-4">
                            <label className="block text-sm font-medium text-slate-600 mb-1.5">ملاحظات</label>
                            <input type="text" value={header.notes} onChange={(event) => setHeader((prev) => ({ ...prev, notes: event.target.value }))} disabled={isExistingOrder} placeholder="أي ملاحظات إضافية..." className="w-full p-2.5 border border-slate-200 rounded-lg focus:border-purple-500 focus:ring-2 focus:ring-purple-100 outline-none disabled:bg-slate-100" />
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col min-h-[360px]">
                    <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 rounded-t-xl">
                        <h2 className="font-bold text-slate-700 flex items-center gap-2"><Truck size={18} className="text-purple-500" />الأصناف المطلوبة</h2>
                        <div className="flex items-center gap-2">
                            {!isExistingOrder && <button type="button" onClick={addLine} className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm text-slate-700 hover:bg-white transition-colors"><Plus size={14} className="inline ml-1" />إضافة سطر</button>}
                            <button type="button" onClick={() => openPortalTab('/items', 'بطاقات الأصناف')} className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm text-slate-700 hover:bg-white transition-colors">قائمة الأصناف</button>
                            <button type="button" onClick={() => openPortalTab('/items', 'إضافة صنف جديد')} className="px-3 py-1.5 border border-purple-200 bg-purple-50 rounded-lg text-sm text-purple-700 hover:bg-purple-100 transition-colors">إضافة صنف جديد</button>
                            <button type="button" onClick={() => void loadMasterData()} className="px-3 py-1.5 border border-sky-200 bg-sky-50 rounded-lg text-sm text-sky-700 hover:bg-sky-100 transition-colors">تحديث الأصناف</button>

                            {!isExistingOrder && (
                                <div className="relative">
                                    <div className="flex items-center bg-white border border-slate-200 rounded-lg px-3 py-1.5 focus-within:border-purple-500 focus-within:ring-2 focus-within:ring-purple-100 w-64 shadow-sm transition-all">
                                        <Search size={16} className="text-slate-400 ml-2" />
                                        <input type="text" placeholder="بحث لإضافة صنف..." className="w-full outline-none text-sm" value={searchTerm} onChange={(event) => { setSearchTerm(event.target.value); setShowItemPicker(true); }} onFocus={() => setShowItemPicker(true)} />
                                    </div>

                                    {showItemPicker && (
                                        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-xl z-50 max-h-60 overflow-y-auto animate-in fade-in zoom-in-95 duration-100">
                                            {filteredItems.map((item) => (
                                                <button key={item.id} className="w-full text-right px-4 py-2 hover:bg-purple-50 text-sm border-b border-slate-50 last:border-0 flex justify-between group" onClick={() => handleItemSelect(item)}>
                                                    <span className="font-medium text-slate-700 group-hover:text-purple-700">{itemDisplayName(item)}</span>
                                                    <span className="text-slate-400 text-xs font-mono">{itemCodeValue(item)}</span>
                                                </button>
                                            ))}
                                            {filteredItems.length === 0 && <div className="p-3 text-center text-xs text-slate-400">لا توجد نتائج</div>}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex-1 overflow-auto">
                        <table className="dense-table w-full text-right">
                            <thead className="bg-slate-50 text-slate-600 text-xs font-bold uppercase tracking-wider sticky top-0">
                                <tr>
                                    <th className="px-4 py-3 border-b border-slate-200 w-16 text-center">#</th>
                                    <th className="px-4 py-3 border-b border-slate-200">الصنف</th>
                                    <th className="px-4 py-3 border-b border-slate-200 w-36">الكمية المطلوبة</th>
                                    <th className="px-4 py-3 border-b border-slate-200 w-36">الكمية المستلمة</th>
                                    <th className="px-4 py-3 border-b border-slate-200 w-36">المتبقي</th>
                                    <th className="px-4 py-3 border-b border-slate-200">ملاحظات الصنف</th>
                                    <th className="px-4 py-3 border-b border-slate-200 w-16" />
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {lines.map((line, index) => {
                                    const required = Number(line.quantity) || 0;
                                    const received = Number(line.receivedQuantity) || 0;
                                    return (
                                        <tr key={line.id} className="group hover:bg-slate-50/50 transition-colors">
                                            <td className="px-4 py-3 text-center text-slate-400 text-sm font-mono">{index + 1}</td>
                                            <td className="px-4 py-3">
                                                <div className="font-medium text-slate-700">{line.name || '-'}</div>
                                                <div className="text-xs text-slate-400 font-mono">{line.itemCode || '-'}</div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <input type="number" min="0" step="0.001" value={line.quantity} onChange={(event) => updateLine(line.id, 'quantity', Number(event.target.value) || 0)} disabled={isExistingOrder} className="w-full p-1.5 border border-slate-200 rounded text-center focus:border-purple-500 focus:ring-2 focus:ring-purple-100 outline-none font-bold text-slate-800 disabled:bg-slate-100" />
                                            </td>
                                            <td className="px-4 py-3"><input type="number" value={received} readOnly className="w-full p-1.5 border border-slate-200 rounded text-center bg-slate-100 text-slate-600" /></td>
                                            <td className="px-4 py-3"><input type="number" value={required - received} readOnly className="w-full p-1.5 border border-slate-200 rounded text-center bg-slate-100 text-slate-600" /></td>
                                            <td className="px-4 py-3"><input type="text" value={line.notes} onChange={(event) => updateLine(line.id, 'notes', event.target.value)} disabled={isExistingOrder} placeholder="ملاحظة..." className="w-full p-1.5 border border-slate-200 rounded text-sm focus:border-purple-500 focus:ring-2 focus:ring-purple-100 outline-none disabled:bg-slate-100" /></td>
                                            <td className="px-4 py-3 text-center">
                                                {!isExistingOrder && (
                                                    <button type="button" onClick={() => removeLine(line.id)} className="text-slate-300 hover:text-red-500 p-1 rounded-full hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100">
                                                        <Trash2 size={16} />
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}

                                {lines.length === 0 && (
                                    <tr>
                                        <td colSpan={7} className="py-12 text-center text-slate-400">لا توجد أصناف مضافة.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div className="p-4 border-t border-slate-200 bg-slate-50 rounded-b-xl flex justify-between items-center text-sm text-slate-600">
                        <span>عدد الأصناف: {lines.length}</span>
                        <span>إجمالي المطلوب: {totalQty.toFixed(3)}</span>
                        <span>إجمالي المستلم: {totalReceivedQty.toFixed(3)}</span>
                        <span>المتبقي: {(totalQty - totalReceivedQty).toFixed(3)}</span>
                    </div>
                </div>
            </div>

            {showItemPicker && !isExistingOrder && (
                <div className="fixed inset-0 z-40 bg-transparent" onClick={() => setShowItemPicker(false)} />
            )}
        </div>
    );
};

export default InternalOrderPage;

