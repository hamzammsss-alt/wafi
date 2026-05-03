import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Save, Trash2, Search, FileQuestion, Calendar, User, Briefcase, Box } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { Item, Warehouse } from '../../types';
import DefinitionMasterList, { DefinitionListColumn } from '../../src/components/definitions/DefinitionMasterList';

interface RequestLine {
    id: string;
    itemId: string;
    itemCode?: string;
    name: string;
    quantity: number;
    notes: string;
}

export const SuppliesRequestPage = () => {
    const [header, setHeader] = useState({
        date: new Date().toISOString().split('T')[0],
        warehouseId: '',
        department: '',
        requesterName: '',
        notes: '',
        ref_no: 'REQ-NEW',
    });

    const [lines, setLines] = useState<RequestLine[]>([]);
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

    const updateLine = useCallback((id: string, field: keyof RequestLine, value: string | number) => {
        setLines((currentLines) => currentLines.map((line) => line.id === id ? { ...line, [field]: value } : line));
    }, []);

    const removeLine = useCallback((id: string) => {
        setLines((currentLines) => currentLines.filter((line) => line.id !== id));
    }, []);

    const handleItemSelect = useCallback((item: Item) => {
        const displayName = String(item.name_ar || item.name_en || item.code || '').trim();
        const newLine: RequestLine = {
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

    const totalQuantity = useMemo(
        () => lines.reduce((sum, line) => sum + (Number(line.quantity) || 0), 0),
        [lines],
    );

    const handleDeleteLines = useCallback((selectedLines: RequestLine[]) => {
        const selectedIds = new Set(selectedLines.map((line) => line.id));
        setLines((currentLines) => currentLines.filter((line) => !selectedIds.has(line.id)));
    }, []);

    const getLineKey = useCallback((line: RequestLine) => line.id, []);

    const lineColumns = useMemo<DefinitionListColumn<RequestLine>[]>(() => [
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
            label: 'المادة',
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
            label: 'الكمية',
            type: 'number',
            filterType: 'number',
            width: 150,
            defaultVisible: true,
            align: 'center',
            getValue: (line) => line.quantity,
            getDisplayValue: (line) => String(Number(line.quantity) || 0),
            renderCell: (line) => (
                <input
                    type="number"
                    min="1"
                    value={line.quantity}
                    onClick={(event) => event.stopPropagation()}
                    onDoubleClick={(event) => event.stopPropagation()}
                    onChange={(event) => updateLine(line.id, 'quantity', Number.parseFloat(event.target.value) || 0)}
                    className="h-9 w-24 rounded-lg border border-slate-200 bg-white px-2 text-center font-mono font-bold text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
            ),
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
                    className="h-9 w-full min-w-[14rem] rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
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
        { label: `${lines.length} مادة`, tone: 'info' as const, mono: true },
        { label: `${totalQuantity} كمية`, tone: 'success' as const, mono: true },
    ], [lines.length, totalQuantity]);

    const itemPickerAction = useMemo(() => (
        <div className="relative z-[70]">
            <div className="flex h-11 w-72 items-center rounded-2xl border border-slate-200 bg-white px-3 shadow-sm transition focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100">
                <Search size={16} className="ml-2 text-slate-400" />
                <input
                    type="text"
                    placeholder="بحث لإضافة مادة..."
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
                            className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-right text-sm transition hover:bg-blue-50"
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
            alert('الرجاء إضافة أصناف');
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
                    type: 'SUPPLIES_REQUEST',
                    warehouseId: header.warehouseId,
                    date: header.date,
                    notes: `Requested By: ${header.requesterName} (${header.department}) - ${header.notes}`,
                    items: validLines.map((line) => ({ itemId: line.itemId, quantity: line.quantity })),
                });
                alert('تم إرسال طلب اللوازم بنجاح');
                setLines([]);
                setHeader((currentHeader) => ({ ...currentHeader, notes: '', requesterName: '', department: '' }));
            } else {
                console.log('Saving Supplies Request:', payload);
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
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
                        <FileQuestion size={20} />
                    </div>
                    <div>
                        <h1 className="text-lg font-bold text-slate-800">طلب لوازم</h1>
                        <p className="text-xs text-slate-500">Supplies Request</p>
                    </div>
                </div>
                <button
                    onClick={handleSave}
                    disabled={loading}
                    className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 font-medium text-white shadow-sm transition-colors hover:bg-blue-700 disabled:opacity-50"
                >
                    <Save size={18} />
                    <span>إرسال الطلب</span>
                </button>
            </div>

            <div className="flex-1 overflow-auto p-6">
                <div className="mx-auto max-w-6xl space-y-6">
                    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                        <h2 className="mb-4 flex items-center gap-2 border-b border-slate-100 pb-2 font-bold text-slate-700">
                            <User size={18} className="text-blue-500" />
                            بيانات مقدم الطلب
                        </h2>
                        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
                            <div>
                                <label className="mb-1.5 block text-sm font-medium text-slate-600">القسم / الإدارة</label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        value={header.department}
                                        onChange={(event) => setHeader({ ...header, department: event.target.value })}
                                        placeholder="القسم..."
                                        className="w-full rounded-lg border border-slate-200 py-2.5 pl-3 pr-10 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                                    />
                                    <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                </div>
                            </div>

                            <div>
                                <label className="mb-1.5 block text-sm font-medium text-slate-600">اسم الموظف</label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        value={header.requesterName}
                                        onChange={(event) => setHeader({ ...header, requesterName: event.target.value })}
                                        placeholder="اسم الطالب..."
                                        className="w-full rounded-lg border border-slate-200 py-2.5 pl-3 pr-10 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                                    />
                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                </div>
                            </div>

                            <div>
                                <label className="mb-1.5 block text-sm font-medium text-slate-600">تاريخ الطلب</label>
                                <div className="relative">
                                    <input
                                        type="date"
                                        value={header.date}
                                        onChange={(event) => setHeader({ ...header, date: event.target.value })}
                                        className="w-full rounded-lg border border-slate-200 py-2.5 pl-3 pr-10 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                                    />
                                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                </div>
                            </div>

                            <div>
                                <label className="mb-1.5 block text-sm font-medium text-slate-600">المستودع المطلوب منه</label>
                                <select
                                    value={header.warehouseId}
                                    onChange={(event) => setHeader({ ...header, warehouseId: event.target.value })}
                                    className="w-full rounded-lg border border-slate-200 bg-slate-50 p-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                                >
                                    {warehouses.map((warehouse) => (
                                        <option key={warehouse.id} value={warehouse.id}>
                                            {warehouse.name || warehouse.name_ar}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="lg:col-span-4">
                                <label className="mb-1.5 block text-sm font-medium text-slate-600">ملاحظات / سبب الطلب</label>
                                <input
                                    type="text"
                                    value={header.notes}
                                    onChange={(event) => setHeader({ ...header, notes: event.target.value })}
                                    placeholder="ملاحظات إضافية..."
                                    className="w-full rounded-lg border border-slate-200 p-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                                />
                            </div>
                        </div>
                    </div>

                    <DefinitionMasterList
                        headerIcon={<Box className="h-5 w-5" />}
                        headerTitle="المواد المطلوبة"
                        headerSubtitle="إدارة مواد طلب اللوازم مع بحث وفرز وتصفية وتصدير بنفس خصائص الجداول."
                        headerBadges={lineHeaderBadges}
                        screenKey="inventory.supplies-request.lines"
                        data={lines}
                        loading={loading}
                        columns={lineColumns}
                        rowKey={getLineKey}
                        searchPlaceholder="بحث في مواد الطلب..."
                        emptyMessage="لا توجد مواد مضافة. ابحث عن مادة من شريط الأدوات لإضافتها."
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

export default SuppliesRequestPage;
