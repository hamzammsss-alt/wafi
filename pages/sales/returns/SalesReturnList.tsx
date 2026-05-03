import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText } from 'lucide-react';
import DefinitionMasterList, { DefinitionListColumn } from '../../../src/components/definitions/DefinitionMasterList';

type SalesReturnRow = {
    id: string;
    return_no?: string;
    date?: string;
    customer_name?: string;
    grand_total?: number;
    status?: string;
};

function formatDate(value: unknown) {
    if (!value) return '-';
    const raw = String(value);
    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime())) return raw;
    return parsed.toLocaleDateString('en-GB');
}

function formatNumber(value: unknown) {
    const parsed = Number(value || 0);
    return Number.isFinite(parsed) ? parsed.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00';
}

function getStatusLabel(status: unknown) {
    const value = String(status || '').trim();
    if (value === 'POSTED') return 'مرحل';
    return value || '-';
}

export const SalesReturnList = () => {
    const navigate = useNavigate();
    const [returns, setReturns] = useState<SalesReturnRow[]>([]);
    const [loading, setLoading] = useState(true);

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            // @ts-ignore
            const api = window.electronAPI.sales;
            if (api && api.getReturns) {
                const data = await api.getReturns();
                setReturns(Array.isArray(data) ? data : []);
            } else {
                console.error('getReturns method not found');
                setReturns([]);
            }
        } catch (error) {
            console.error('Failed to load sales returns', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void loadData();
    }, [loadData]);

    const openReturn = useCallback((row: SalesReturnRow) => {
        const id = String(row?.id || '').trim();
        if (id) navigate(`/trade/sales/return/${id}`);
    }, [navigate]);

    const columns = useMemo<DefinitionListColumn<SalesReturnRow>[]>(() => [
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
                <span className="inline-flex items-center gap-2 font-mono font-bold text-blue-700">
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
            key: 'customer_name',
            label: 'العميل',
            type: 'text',
            filterType: 'text',
            width: 220,
            defaultVisible: true,
            align: 'right',
            getValue: (row) => row.customer_name || '',
            getDisplayValue: (row) => row.customer_name || '-',
        },
        {
            key: 'grand_total',
            label: 'المبلغ الإجمالي',
            type: 'number',
            filterType: 'number',
            width: 160,
            defaultVisible: true,
            align: 'right',
            getValue: (row) => Number(row.grand_total || 0),
            getDisplayValue: (row) => formatNumber(row.grand_total),
            renderCell: (row) => <span className="font-mono font-bold text-slate-800">{formatNumber(row.grand_total)}</span>,
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
                    className="rounded-xl border border-blue-100 bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700 transition hover:bg-blue-100"
                >
                    فتح
                </button>
            ),
        },
    ], [openReturn]);

    return (
        <div className="min-h-screen bg-slate-50 p-6 font-sans" dir="rtl">
            <DefinitionMasterList
                headerIcon={<FileText className="h-5 w-5" />}
                headerTitle="مرتجعات المبيعات"
                headerSubtitle="إدارة مرتجعات المبيعات (إشعارات دائنة)"
                headerBadges={[{ label: `${returns.length} مرتجع`, tone: 'info', mono: true }]}
                screenKey="trade.sales.returns.list"
                data={returns}
                loading={loading}
                columns={columns}
                rowKey={(row) => String(row.id)}
                searchPlaceholder="بحث برقم المرتجع أو اسم العميل..."
                emptyMessage="لا توجد مرتجعات"
                createLabel="مرتجع جديد"
                onCreate={() => navigate('/trade/sales/return/new')}
                onEdit={openReturn}
                onRowDoubleClick={openReturn}
                onRefresh={loadData}
                defaultSort={{ key: 'date', direction: 'desc' }}
            />
        </div>
    );
};

export default SalesReturnList;
