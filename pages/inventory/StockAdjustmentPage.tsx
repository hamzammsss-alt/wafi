import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Save, Sliders, Search, Calendar, Box, Activity, Trash2 } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { Item, Warehouse } from '../../types';
import DefinitionMasterList, { DefinitionListColumn } from '../../src/components/definitions/DefinitionMasterList';

interface AdjustmentLine {
    id: string;
    itemId: string;
    itemCode?: string;
    name: string;
    quantity: number;
    notes: string;
}

function getAdjustmentType(quantity: number) {
    if (quantity > 0) return 'IN';
    if (quantity < 0) return 'OUT';
    return 'ZERO';
}

function getAdjustmentTypeLabel(quantity: number) {
    if (quantity > 0) return 'زيادة';
    if (quantity < 0) return 'نقص';
    return '-';
}

export const StockAdjustmentPage = () => {
    const [header, setHeader] = useState({
        date: new Date().toISOString().split('T')[0],
        warehouseId: '',
        reason: '',
        notes: '',
        ref_no: 'ADJ-NEW',
    });

    const [lines, setLines] = useState<AdjustmentLine[]>([]);
    const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
    const [items, setItems] = useState<Item[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [showItemPicker, setShowItemPicker] = useState(false);

    const loadMasterData = useCallback(async () => {
        try {
            // @ts-ignore
            if (window.electronAPI) {
                // @ts-ignore
                const [whs, itms] = await Promise.all([
                    // @ts-ignore
                    window.electronAPI.inventory.getWarehouses(),
                    // @ts-ignore
                    window.electronAPI.inventory.getItems(),
                ]);

                setWarehouses(whs || []);
                setItems(itms || []);

                if (whs && whs.length > 0) {
                    setHeader((currentHeader) => ({ ...currentHeader, warehouseId: currentHeader.warehouseId || whs[0].id }));
                }
            }
        } catch (err) {
            console.error('Failed to load master data', err);
        }
    }, []);

    useEffect(() => {
        void loadMasterData();
    }, [loadMasterData]);

    const updateLine = useCallback((id: string, field: keyof AdjustmentLine, value: string | number) => {
        setLines((currentLines) => currentLines.map((line) => line.id === id ? { ...line, [field]: value } : line));
    }, []);

    const removeLine = useCallback((id: string) => {
        setLines((currentLines) => currentLines.filter((line) => line.id !== id));
    }, []);

    const handleItemSelect = useCallback((item: Item) => {
        const displayName = String(item.name_ar || item.name_en || item.code || '').trim();
        const newLine: AdjustmentLine = {
            id: uuidv4(),
            itemId: item.id,
            itemCode: item.code,
            name: displayName,
            quantity: 1,
            notes: '',
        };

        setLines((currentLines) => [...currentLines, newLine]);
        setSearchTerm('');
        setShowItemPicker(false);
    }, []);

    const filteredItems = useMemo(() => {
        const term = searchTerm.trim().toLowerCase();
        if (!term) return [];

        return items.filter((item) =>
            String(item.name_ar || '').toLowerCase().includes(term) ||
            String(item.name_en || '').toLowerCase().includes(term) ||
            String(item.code || '').toLowerCase().includes(term)
        ).slice(0, 20);
    }, [items, searchTerm]);

    const netAdjustment = useMemo(
        () => lines.reduce((sum, line) => sum + (Number(line.quantity) || 0), 0),
        [lines],
    );

    const handleDeleteLines = useCallback((selectedLines: AdjustmentLine[]) => {
        const selectedIds = new Set(selectedLines.map((line) => line.id));
        setLines((currentLines) => currentLines.filter((line) => !selectedIds.has(line.id)));
    }, []);

    const getLineKey = useCallback((line: AdjustmentLine) => line.id, []);

    const lineColumns = useMemo<DefinitionListColumn<AdjustmentLine>[]>(() => [
        {
            key: 'itemCode',
            label: 'الرمز',
            type: 'text',
            filterType: 'text',
            width: 130,
            defaultVisible: true,
            align: 'center',
            getValue: (line) => line.itemCode || '',
            getDisplayValue: (line) => line.itemCode || '-',
            renderCell: (line) => (
                <span className="font-mono text-xs font-semibold text-sky-700">
                    {line.itemCode || '-'}
                </span>
            ),
        },
        {
            key: 'name',
            label: 'الصنف',
            type: 'text',
            filterType: 'text',
            width: 280,
            defaultVisible: true,
            align: 'right',
            getValue: (line) => line.name,
            getDisplayValue: (line) => line.name || '-',
            renderCell: (line) => (
                <span className="font-semibold text-slate-700">
                    {line.name || '-'}
                </span>
            ),
        },
        {
            key: 'quantity',
            label: 'الكمية (+/-)',
            type: 'number',
            filterType: 'number',
            width: 170,
            defaultVisible: true,
            align: 'center',
            getValue: (line) => line.quantity,
            getDisplayValue: (line) => String(Number(line.quantity) || 0),
            renderCell: (line) => {
                const quantity = Number(line.quantity) || 0;
                const toneClass = quantity < 0
                    ? 'border-red-200 text-red-600 focus:border-red-500 focus:ring-red-100'
                    : 'border-emerald-200 text-emerald-700 focus:border-emerald-500 focus:ring-emerald-100';

                return (
                    <input
                        type="number"
                        value={line.quantity}
                        dir="ltr"
                        onClick={(event) => event.stopPropagation()}
                        onDoubleClick={(event) => event.stopPropagation()}
                        onChange={(event) => updateLine(line.id, 'quantity', Number.parseFloat(event.target.value) || 0)}
                        className={`h-9 w-28 rounded-lg border bg-white px-2 text-center font-mono font-bold outline-none transition focus:ring-2 ${toneClass}`}
                    />
                );
            },
        },
        {
            key: 'adjustmentType',
            label: 'نوع الحركة',
            type: 'enum',
            filterType: 'enum',
            width: 130,
            defaultVisible: true,
            align: 'center',
            options: [
                { value: 'IN', label: 'زيادة' },
                { value: 'OUT', label: 'نقص' },
                { value: 'ZERO', label: '-' },
            ],
            getValue: (line) => getAdjustmentType(Number(line.quantity) || 0),
            getDisplayValue: (line) => getAdjustmentTypeLabel(Number(line.quantity) || 0),
            renderCell: (line) => {
                const quantity = Number(line.quantity) || 0;
                const label = getAdjustmentTypeLabel(quantity);
                const className = quantity > 0
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                    : quantity < 0
                        ? 'border-red-200 bg-red-50 text-red-700'
                        : 'border-slate-200 bg-slate-50 text-slate-500';

                return (
                    <span className={`inline-flex min-w-[4rem] justify-center rounded-full border px-3 py-1 text-xs font-bold ${className}`}>
                        {label}
                    </span>
                );
            },
        },
        {
            key: 'notes',
            label: 'ملاحظات',
            type: 'text',
            filterType: 'text',
            width: 320,
            defaultVisible: true,
            align: 'right',
            getValue: (line) => line.notes,
            getDisplayValue: (line) => line.notes || '-',
            renderCell: (line) => (
                <input
                    type="text"
                    value={line.notes}
                    onClick={(event) => event.stopPropagation()}
                    onDoubleClick={(event) => event.stopPropagation()}
                    onChange={(event) => updateLine(line.id, 'notes', event.target.value)}
                    placeholder="ملاحظة..."
                    className="h-9 w-full min-w-[14rem] rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-100"
                />
            ),
        },
        {
            key: 'actions',
            label: 'إجراءات',
            type: 'text',
            filterType: 'text',
            width: 100,
            defaultVisible: true,
            sortable: false,
            filterable: false,
            searchable: false,
            align: 'center',
            getValue: () => '',
            getDisplayValue: () => '',
            renderCell: (line) => (
                <button
                    type="button"
                    onClick={(event) => {
                        event.stopPropagation();
                        removeLine(line.id);
                    }}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-rose-100 bg-white text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                    aria-label="حذف السطر"
                >
                    <Trash2 size={15} />
                </button>
            ),
        },
    ], [removeLine, updateLine]);

    const lineHeaderBadges = useMemo(() => [
        { label: `${lines.length} صنف`, tone: 'info' as const, mono: true },
        { label: `${netAdjustment} صافي`, tone: (netAdjustment < 0 ? 'warning' : 'success') as const, mono: true },
    ], [lines.length, netAdjustment]);

    const itemPickerAction = useMemo(() => (
        <div className="relative z-[70]">
            <div className="flex h-11 w-72 items-center rounded-2xl border border-slate-200 bg-white px-3 shadow-sm transition focus-within:border-red-500 focus-within:ring-2 focus-within:ring-red-100">
                <Search size={16} className="ml-2 text-slate-400" />
                <input
                    type="text"
                    placeholder="بحث لإضافة صنف..."
                    className="w-full bg-transparent text-sm text-slate-700 outline-none"
                    value={searchTerm}
                    onChange={(event) => {
                        setSearchTerm(event.target.value);
                        setShowItemPicker(true);
                    }}
                    onFocus={() => setShowItemPicker(true)}
                />
            </div>

            {showItemPicker && searchTerm && (
                <div className="absolute left-0 right-0 top-full z-[80] mt-2 max-h-64 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-1 shadow-xl">
                    {filteredItems.map((item) => (
                        <button
                            key={item.id}
                            type="button"
                            className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-right text-sm transition hover:bg-red-50"
                            onClick={() => handleItemSelect(item)}
                        >
                            <span className="font-semibold text-slate-700">{item.name_ar}</span>
                            <span className="font-mono text-xs text-slate-400">{item.code}</span>
                        </button>
                    ))}
                    {filteredItems.length === 0 && (
                        <div className="p-3 text-center text-xs text-slate-400">لا توجد نتائج</div>
                    )}
                </div>
            )}
        </div>
    ), [filteredItems, handleItemSelect, searchTerm, showItemPicker]);

    const handleSave = async () => {
        const validLines = lines.filter((line) => String(line.itemId || '').trim());

        if (!header.warehouseId) {
            alert('الرجاء اختيار المستودع');
            return;
        }
        if (validLines.length === 0) {
            alert('الرجاء إضافة أصناف للمعالجة');
            return;
        }

        setLoading(true);
        try {
            const payload = {
                header,
                lines: validLines,
            };

            // @ts-ignore
            if (window.electronAPI && window.electronAPI.inventory.saveTransaction) {
                // @ts-ignore
                await window.electronAPI.inventory.saveTransaction({
                    type: 'ADJUSTMENT',
                    warehouseId: header.warehouseId,
                    date: header.date,
                    notes: `Adjustment: ${header.reason} - ${header.notes}`,
                    items: validLines.map((line) => ({ itemId: line.itemId, quantity: line.quantity })),
                });
                alert('تم حفظ تسوية المخزون بنجاح');
                setLines([]);
                setHeader((currentHeader) => ({ ...currentHeader, notes: '', reason: '' }));
            } else {
                console.log('Saving Adjustment:', payload);
                alert('تم الحفظ (محاكاة)');
            }
        } catch (err: any) {
            alert(`فشل الحفظ: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="relative flex h-full flex-col bg-slate-50 animate-in fade-in duration-300">
            <div className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3 shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100 text-red-600">
                        <Sliders size={20} />
                    </div>
                    <div>
                        <h1 className="text-lg font-bold text-slate-800">تعديل مخزون (تسوية)</h1>
                        <p className="text-xs text-slate-500">Stock Adjustment</p>
                    </div>
                </div>
                <button
                    onClick={handleSave}
                    disabled={loading}
                    className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 font-medium text-white shadow-sm transition-colors hover:bg-red-700 disabled:opacity-50"
                >
                    <Save size={18} />
                    <span>حفظ التعديل</span>
                </button>
            </div>

            <div className="flex-1 overflow-auto p-6">
                <div className="mx-auto max-w-6xl space-y-6">
                    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                        <h2 className="mb-4 flex items-center gap-2 border-b border-slate-100 pb-2 font-bold text-slate-700">
                            <Activity size={18} className="text-red-500" />
                            بيانات التسوية
                        </h2>
                        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                            <div>
                                <label className="mb-1.5 block text-sm font-medium text-slate-600">المستودع</label>
                                <select
                                    value={header.warehouseId}
                                    onChange={(event) => setHeader({ ...header, warehouseId: event.target.value })}
                                    className="w-full rounded-lg border border-slate-200 bg-slate-50 p-2.5 outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100"
                                >
                                    {warehouses.map((warehouse) => (
                                        <option key={warehouse.id} value={warehouse.id}>
                                            {warehouse.name || warehouse.name_ar}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="mb-1.5 block text-sm font-medium text-slate-600">تاريخ المعالجة</label>
                                <div className="relative">
                                    <input
                                        type="date"
                                        value={header.date}
                                        onChange={(event) => setHeader({ ...header, date: event.target.value })}
                                        className="w-full rounded-lg border border-slate-200 py-2.5 pl-3 pr-10 outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100"
                                    />
                                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                </div>
                            </div>

                            <div>
                                <label className="mb-1.5 block text-sm font-medium text-slate-600">سبب التعديل</label>
                                <select
                                    value={header.reason}
                                    onChange={(event) => setHeader({ ...header, reason: event.target.value })}
                                    className="w-full rounded-lg border border-slate-200 bg-white p-2.5 outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100"
                                >
                                    <option value="">-- اختر السبب --</option>
                                    <option value="DAMAGED">تالف / Damaged</option>
                                    <option value="EXPIRED">منتهي الصلاحية / Expired</option>
                                    <option value="COUNT_CORRECTION">تصحيح جرد / Inventory Correction</option>
                                    <option value="OTHER">أخرى / Other</option>
                                </select>
                            </div>

                            <div className="lg:col-span-3">
                                <label className="mb-1.5 block text-sm font-medium text-slate-600">ملاحظات إضافية</label>
                                <input
                                    type="text"
                                    value={header.notes}
                                    onChange={(event) => setHeader({ ...header, notes: event.target.value })}
                                    placeholder="شرح سبب التعديل..."
                                    className="w-full rounded-lg border border-slate-200 p-2.5 outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100"
                                />
                            </div>
                        </div>
                    </div>

                    <DefinitionMasterList
                        headerIcon={<Box className="h-5 w-5" />}
                        headerTitle="الأصناف المعدلة"
                        headerSubtitle="إدارة أصناف التسوية مع بحث وفرز وتصفية وتصدير بنفس خصائص الجداول."
                        headerBadges={lineHeaderBadges}
                        screenKey="inventory.stock-adjustment.lines"
                        data={lines}
                        loading={loading}
                        columns={lineColumns}
                        rowKey={getLineKey}
                        searchPlaceholder="بحث في أصناف التسوية..."
                        emptyMessage="لا توجد أصناف مضافة. ابحث عن صنف من شريط الأدوات لإضافته."
                        onDelete={handleDeleteLines}
                        onRefresh={loadMasterData}
                        toolbarExtraActions={itemPickerAction}
                        defaultSort={{ key: 'name', direction: 'asc' }}
                    />
                </div>
            </div>

            {showItemPicker && (
                <div className="fixed inset-0 z-40 bg-transparent" onClick={() => setShowItemPicker(false)} />
            )}
        </div>
    );
};

export default StockAdjustmentPage;
