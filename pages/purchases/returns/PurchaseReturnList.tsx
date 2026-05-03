import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import DefinitionMasterList, { DefinitionListColumn } from '../../../src/components/definitions/DefinitionMasterList';

type PurchaseReturnRow = {
    id: string;
    return_no?: string;
    date?: string;
    supplier_name?: string;
    grand_total?: number;
    currency_id?: string;
    currency_code?: string;
    status?: string;
    created_by?: string;
};

const ISO_CURRENCY_CODE = /^[A-Z]{3}$/;

function normalizeCurrencyCode(value: unknown) {
    const code = String(value || '').trim().toUpperCase();
    if (!code) return '';
    return code === 'NIS' ? 'ILS' : code;
}

function resolveCurrencyCode(row: PurchaseReturnRow) {
    const joinedCode = normalizeCurrencyCode(row.currency_code);
    if (ISO_CURRENCY_CODE.test(joinedCode)) return joinedCode;

    const legacyCode = normalizeCurrencyCode(row.currency_id);
    if (ISO_CURRENCY_CODE.test(legacyCode)) return legacyCode;

    return 'ILS';
}

function formatDate(value: unknown) {
    if (!value) return '-';
    const raw = String(value);
    const isoDate = raw.match(/^\d{4}-\d{2}-\d{2}/)?.[0];
    return isoDate || raw;
}

function formatNumber(value: unknown) {
    const parsed = Number(value || 0);
    return Number.isFinite(parsed) ? parsed.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00';
}

function formatMoney(value: unknown, row: PurchaseReturnRow) {
    const parsed = Number(value || 0);
    const amount = Number.isFinite(parsed) ? parsed : 0;
    const currency = resolveCurrencyCode(row);

    try {
        return amount.toLocaleString('en-US', { style: 'currency', currency });
    } catch {
        return `${formatNumber(amount)} ${currency}`;
    }
}

function getStatusLabel(status: unknown) {
    const value = String(status || '').trim();
    if (value === 'POSTED') return 'مرحل';
    if (value === 'DRAFT') return 'مسودة';
    return value || '-';
}

export const PurchaseReturnList: React.FC = () => {
    const navigate = useNavigate();
    const currentDir = (typeof document !== 'undefined' && document?.documentElement?.dir) || 'rtl';
    const [returns, setReturns] = useState<PurchaseReturnRow[]>([]);
    const [loading, setLoading] = useState(true);

    const loadData = useCallback(async () => {
        try {
            setLoading(true);
            const data = await window.electronAPI.purchase.getReturns();
            setReturns(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Failed to load returns', error);
            setReturns([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void loadData();
    }, [loadData]);

    const openReturn = useCallback((row: PurchaseReturnRow) => {
        const id = String(row?.id || '').trim();
        if (id) navigate(`/purchasing/returns/${id}`);
    }, [navigate]);

    const columns = useMemo<DefinitionListColumn<PurchaseReturnRow>[]>(() => [
        {
            key: 'return_no',
            label: 'رقم المرتجع',
            type: 'text',
            filterType: 'text',
            width: 180,
            defaultVisible: true,
            align: 'right',
            getValue: (row) => row.return_no || '',
            getDisplayValue: (row) => row.return_no || '-',
            renderCell: (row) => (
                <span className="inline-flex items-center gap-2 font-mono font-bold text-amber-700">
                    <FileText className="h-4 w-4" />
                    {row.return_no || '-'}
                </span>
            ),
        },
        {
            key: 'date',
            label: 'التاريخ',
            type: 'date',
            filterType: 'date',
            width: 140,
            defaultVisible: true,
            align: 'center',
            getValue: (row) => row.date || '',
            getDisplayValue: (row) => formatDate(row.date),
            renderCell: (row) => <span className="font-mono text-slate-600">{formatDate(row.date)}</span>,
        },
        {
            key: 'supplier_name',
            label: 'المورد',
            type: 'text',
            filterType: 'text',
            width: 240,
            defaultVisible: true,
            align: 'right',
            getValue: (row) => row.supplier_name || '',
            getDisplayValue: (row) => row.supplier_name || '-',
        },
        {
            key: 'grand_total',
            label: 'إجمالي القيمة',
            type: 'number',
            filterType: 'number',
            width: 170,
            defaultVisible: true,
            align: 'right',
            getValue: (row) => Number(row.grand_total || 0),
            getDisplayValue: (row) => formatMoney(row.grand_total, row),
            renderCell: (row) => <span className="font-mono font-bold text-emerald-700">{formatMoney(row.grand_total, row)}</span>,
        },
        {
            key: 'currency_code',
            label: 'العملة',
            type: 'enum',
            filterType: 'enum',
            width: 120,
            defaultVisible: true,
            align: 'center',
            options: [
                { value: 'ILS', label: 'ILS' },
                { value: 'USD', label: 'USD' },
                { value: 'JOD', label: 'JOD' },
                { value: 'EUR', label: 'EUR' },
            ],
            getValue: (row) => resolveCurrencyCode(row),
            getDisplayValue: (row) => resolveCurrencyCode(row),
            renderCell: (row) => (
                <span className="rounded-full border border-amber-100 bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700">
                    {resolveCurrencyCode(row)}
                </span>
            ),
        },
        {
            key: 'status',
            label: 'الحالة',
            type: 'enum',
            filterType: 'enum',
            width: 130,
            defaultVisible: true,
            align: 'center',
            options: [
                { value: 'POSTED', label: 'مرحل' },
                { value: 'DRAFT', label: 'مسودة' },
            ],
            getValue: (row) => row.status || '',
            getDisplayValue: (row) => getStatusLabel(row.status),
            renderCell: (row) => (
                <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${row.status === 'POSTED' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-700'}`}>
                    {getStatusLabel(row.status)}
                </span>
            ),
        },
        {
            key: 'created_by',
            label: 'بواسطة',
            type: 'text',
            filterType: 'text',
            width: 150,
            defaultVisible: false,
            align: 'right',
            getValue: (row) => row.created_by || '',
            getDisplayValue: (row) => row.created_by || '-',
        },
        {
            key: 'actions',
            label: 'إجراءات',
            type: 'text',
            filterType: 'text',
            width: 110,
            defaultVisible: true,
            sortable: false,
            filterable: false,
            searchable: false,
            align: 'center',
            getValue: () => '',
            getDisplayValue: () => '',
            renderCell: (row) => (
                <button
                    type="button"
                    onClick={(event) => {
                        event.stopPropagation();
                        openReturn(row);
                    }}
                    className="rounded-xl border border-amber-100 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-700 transition hover:bg-amber-100"
                >
                    فتح
                </button>
            ),
        },
    ], [openReturn]);

    return (
        <div className="app-page h-full" dir={currentDir}>
            <DefinitionMasterList
                headerIcon={<FileText className="h-5 w-5" />}
                headerTitle="مرتجعات المشتريات"
                headerSubtitle="إدارة مردودات المشتريات وإشعارات الموردين المدينة"
                headerBadges={[{ label: `${returns.length} مرتجع`, tone: 'info', mono: true }]}
                screenKey="trade.purchasing.returns.list"
                data={returns}
                loading={loading}
                columns={columns}
                rowKey={(row) => String(row.id)}
                searchPlaceholder="بحث برقم المرتجع أو اسم المورد أو الحالة..."
                emptyMessage="لا توجد مردودات مشتريات مطابقة"
                createLabel="مرتجع جديد"
                onCreate={() => navigate('/purchasing/returns/new')}
                onEdit={openReturn}
                onRowDoubleClick={openReturn}
                onRefresh={loadData}
                defaultSort={{ key: 'date', direction: 'desc' }}
            />
        </div>
    );
};

export default PurchaseReturnList;
