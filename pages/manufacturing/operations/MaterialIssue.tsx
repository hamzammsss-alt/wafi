import React, { useCallback, useMemo, useState } from 'react';
import { CheckCircle2, PackageMinus } from 'lucide-react';
import DefinitionMasterList, { DefinitionListColumn } from '../../../src/components/definitions/DefinitionMasterList';

type MaterialIssueLine = {
    id: string;
    itemName: string;
    availableQty: number;
    requiredQty: number;
    issuedQty: number;
    unit: string;
    warehouse: string;
};

const WAREHOUSES = ['مستودع الخامات', 'المستودع الرئيسي', 'مستودع الإنتاج'];

const INITIAL_LINES: MaterialIssueLine[] = [
    {
        id: 'wood-panels',
        itemName: 'ألواح خشب زان 2سم',
        availableQty: 500,
        requiredQty: 125,
        issuedQty: 125,
        unit: 'م2',
        warehouse: 'مستودع الخامات',
    },
    {
        id: 'wood-glue',
        itemName: 'لاصق خشب ممتاز',
        availableQty: 50,
        requiredQty: 10,
        issuedQty: 10,
        unit: 'عبوة',
        warehouse: 'مستودع الخامات',
    },
];

function formatQty(value: number, unit: string) {
    return `${Number(value || 0).toLocaleString('en-US')} ${unit}`;
}

function lineStatus(line: MaterialIssueLine) {
    if (line.issuedQty <= 0) return 'لم يصرف';
    if (line.issuedQty < line.requiredQty) return 'صرف جزئي';
    if (line.issuedQty > line.availableQty) return 'يتجاوز الرصيد';
    return 'جاهز للصرف';
}

function lineStatusClass(line: MaterialIssueLine) {
    const status = lineStatus(line);
    if (status === 'جاهز للصرف') return 'border-emerald-200 bg-emerald-50 text-emerald-700';
    if (status === 'صرف جزئي') return 'border-amber-200 bg-amber-50 text-amber-700';
    if (status === 'يتجاوز الرصيد') return 'border-red-200 bg-red-50 text-red-700';
    return 'border-slate-200 bg-slate-100 text-slate-500';
}

export const MaterialIssue = () => {
    const [selectedOrder, setSelectedOrder] = useState('MO-2024-001');
    const [lines, setLines] = useState<MaterialIssueLine[]>(INITIAL_LINES);

    const updateLine = useCallback((lineId: string, patch: Partial<MaterialIssueLine>) => {
        setLines((current) => current.map((line) => (line.id === lineId ? { ...line, ...patch } : line)));
    }, []);

    const totals = useMemo(() => {
        return lines.reduce(
            (acc, line) => {
                acc.required += Number(line.requiredQty || 0);
                acc.issued += Number(line.issuedQty || 0);
                if (line.issuedQty > line.availableQty) acc.shortage += 1;
                return acc;
            },
            { required: 0, issued: 0, shortage: 0 },
        );
    }, [lines]);

    const columns = useMemo<DefinitionListColumn<MaterialIssueLine>[]>(() => [
        {
            key: 'itemName',
            label: 'المادة',
            type: 'text',
            filterType: 'text',
            width: 280,
            defaultVisible: true,
            align: 'right',
            getValue: (line) => line.itemName,
            getSearchValue: (line) => `${line.itemName} ${line.warehouse} ${line.unit}`,
            getDisplayValue: (line) => line.itemName,
            renderCell: (line) => (
                <div className="min-w-0">
                    <div className="truncate font-extrabold text-slate-800">{line.itemName}</div>
                    <div className="mt-1 text-[11px] font-bold text-slate-400">أمر التصنيع: {selectedOrder}</div>
                </div>
            ),
        },
        {
            key: 'availableQty',
            label: 'الرصيد المتوفر',
            type: 'number',
            filterType: 'number',
            width: 160,
            defaultVisible: true,
            align: 'center',
            getValue: (line) => line.availableQty,
            getDisplayValue: (line) => formatQty(line.availableQty, line.unit),
            renderCell: (line) => (
                <span className="font-mono text-sm font-extrabold text-emerald-600">
                    {formatQty(line.availableQty, line.unit)}
                </span>
            ),
        },
        {
            key: 'requiredQty',
            label: 'الكمية المطلوبة (BOM)',
            type: 'number',
            filterType: 'number',
            width: 185,
            defaultVisible: true,
            align: 'center',
            getValue: (line) => line.requiredQty,
            getDisplayValue: (line) => formatQty(line.requiredQty, line.unit),
            renderCell: (line) => (
                <span className="font-mono text-sm font-extrabold text-slate-800">
                    {formatQty(line.requiredQty, line.unit)}
                </span>
            ),
        },
        {
            key: 'issuedQty',
            label: 'الكمية المصروفة',
            type: 'number',
            filterType: 'number',
            width: 170,
            defaultVisible: true,
            align: 'center',
            getValue: (line) => line.issuedQty,
            getDisplayValue: (line) => formatQty(line.issuedQty, line.unit),
            renderCell: (line) => (
                <input
                    type="number"
                    min="0"
                    value={line.issuedQty}
                    onClick={(event) => event.stopPropagation()}
                    onChange={(event) => updateLine(line.id, { issuedQty: Number(event.target.value || 0) })}
                    className="h-10 w-28 rounded-xl border border-slate-200 bg-white px-3 text-center font-mono text-sm font-extrabold text-slate-800 outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                />
            ),
        },
        {
            key: 'warehouse',
            label: 'المستودع',
            type: 'enum',
            filterType: 'enum',
            width: 190,
            defaultVisible: true,
            align: 'center',
            options: WAREHOUSES.map((warehouse) => ({ value: warehouse, label: warehouse })),
            getValue: (line) => line.warehouse,
            getDisplayValue: (line) => line.warehouse,
            renderCell: (line) => (
                <select
                    value={line.warehouse}
                    onClick={(event) => event.stopPropagation()}
                    onChange={(event) => updateLine(line.id, { warehouse: event.target.value })}
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                >
                    {WAREHOUSES.map((warehouse) => (
                        <option key={warehouse} value={warehouse}>{warehouse}</option>
                    ))}
                </select>
            ),
        },
        {
            key: 'status',
            label: 'الحالة',
            type: 'enum',
            filterType: 'enum',
            width: 145,
            defaultVisible: true,
            align: 'center',
            options: [
                { value: 'جاهز للصرف', label: 'جاهز للصرف' },
                { value: 'صرف جزئي', label: 'صرف جزئي' },
                { value: 'يتجاوز الرصيد', label: 'يتجاوز الرصيد' },
                { value: 'لم يصرف', label: 'لم يصرف' },
            ],
            getValue: lineStatus,
            getDisplayValue: lineStatus,
            renderCell: (line) => (
                <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${lineStatusClass(line)}`}>
                    {lineStatus(line)}
                </span>
            ),
        },
    ], [selectedOrder, updateLine]);

    return (
        <div className="h-full overflow-auto bg-slate-50 p-6" dir="rtl">
            <div className="mb-4 rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-start gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-600">
                            <PackageMinus size={24} />
                        </div>
                        <div>
                            <h1 className="text-2xl font-extrabold text-slate-900">صرف مواد خام للإنتاج</h1>
                            <p className="mt-1 text-sm font-medium text-slate-500">أمر صرف مخزني مرتبط بأمر تصنيع.</p>
                        </div>
                    </div>

                    <label className="grid min-w-[260px] gap-1.5 text-sm font-bold text-slate-600">
                        <span>رقم أمر التصنيع</span>
                        <select
                            value={selectedOrder}
                            onChange={(event) => setSelectedOrder(event.target.value)}
                            className="h-11 rounded-xl border border-slate-200 bg-white px-3 font-mono text-sm font-bold text-indigo-700 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                        >
                            <option value="MO-2024-001">MO-2024-001 - طاولة مكتبية</option>
                        </select>
                    </label>
                </div>
            </div>

            <DefinitionMasterList
                headerIcon={<PackageMinus className="h-5 w-5" />}
                headerTitle="مواد الصرف"
                headerSubtitle="كل مادة تظهر كصف مستقل مع تعديل الكمية والمستودع من داخل الجدول."
                headerBadges={[
                    { label: `${lines.length} مواد`, tone: 'info', mono: true },
                    { label: `BOM ${totals.required.toLocaleString('en-US')}`, tone: 'neutral', mono: true },
                    { label: `الصرف ${totals.issued.toLocaleString('en-US')}`, tone: totals.shortage ? 'warning' : 'success', mono: true },
                    { label: `${totals.shortage} يتجاوز الرصيد`, tone: totals.shortage ? 'warning' : 'success', mono: true },
                ]}
                screenKey="manufacturing.material-issue.lines"
                data={lines}
                columns={columns}
                rowKey={(line) => line.id}
                searchPlaceholder="بحث بالمادة أو المستودع..."
                emptyMessage="لا توجد مواد خام للصرف"
                defaultSort={{ key: 'itemName', direction: 'asc' }}
                toolbarExtraActions={(
                    <button
                        type="button"
                        onClick={() => alert('تم تأكيد الصرف')}
                        className="inline-flex h-11 items-center gap-2 rounded-2xl bg-red-600 px-5 text-sm font-bold text-white shadow-lg shadow-red-900/15 transition hover:bg-red-700"
                    >
                        <CheckCircle2 size={16} />
                        <span>تأكيد الصرف</span>
                    </button>
                )}
            />
        </div>
    );
};
