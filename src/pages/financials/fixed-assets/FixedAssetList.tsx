import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, CheckCircle, Edit, Trash2, Archive } from 'lucide-react';
import DefinitionMasterList, { DefinitionListColumn } from '../../../components/definitions/DefinitionMasterList';

interface FixedAssetRow {
    id: string;
    code: string;
    name: string;
    categoryId: string;
    purchaseDate: string;
    purchaseCost: number;
    bookValue: number;
    accumulatedDepreciation: number;
    depreciationMethod: string;
    status: 'Active' | 'Disposed' | 'FullyDepreciated';
}

const STATUS_CONFIG = {
    Active: { label: 'فعال', color: 'bg-emerald-100 text-emerald-700' },
    Disposed: { label: 'مستبعد', color: 'bg-red-100 text-red-700' },
    FullyDepreciated: { label: 'مستهلك بالكامل', color: 'bg-gray-100 text-gray-600' },
};

const fmt = (n: number) =>
    n?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) ?? '—';

export function FixedAssetList() {
    const [assets, setAssets] = useState<FixedAssetRow[]>([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => { loadAssets(); }, []);

    const loadAssets = async () => {
        try {
            setLoading(true);
            const data = await window.electronAPI.fixedAssets.list();
            setAssets(data ?? []);
        } catch (err) {
            console.error('Failed to load fixed assets', err);
        } finally {
            setLoading(false);
        }
    };

    const filtered = assets;

    const totalCost = assets.reduce((s, a) => s + (Number(a.purchaseCost) || 0), 0);
    const totalBook = assets.reduce((s, a) => s + (Number(a.bookValue) || 0), 0);
    const totalDep = assets.reduce((s, a) => s + (Number(a.accumulatedDepreciation) || 0), 0);

    const handleDelete = async (asset: FixedAssetRow) => {
        if (!confirm(`هل أنت متأكد من حذف الأصل ${asset.code || asset.name}؟`)) return;

        try {
            await window.electronAPI.fixedAssets.delete(asset.id);
            await loadAssets();
        } catch (err: any) {
            alert(err?.message || 'تعذر حذف الأصل');
        }
    };

    const handleDeleteRows = async (rows: FixedAssetRow[]) => {
        if (rows.length === 0) return;
        if (!confirm(rows.length === 1 ? 'هل أنت متأكد من حذف هذا الأصل؟' : `هل أنت متأكد من حذف ${rows.length} أصول؟`)) return;

        try {
            for (const row of rows) {
                await window.electronAPI.fixedAssets.delete(row.id);
            }
            await loadAssets();
        } catch (err: any) {
            alert(err?.message || 'تعذر حذف الأصول المحددة');
        }
    };

    const columns = React.useMemo<DefinitionListColumn<FixedAssetRow>[]>(() => [
        {
            key: 'code',
            label: 'رمز الأصل',
            width: 140,
            defaultVisible: true,
            getSearchValue: (asset) => `${asset.code || ''} ${asset.name || ''}`,
            renderCell: (asset) => (
                <span className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-mono text-slate-700">
                    {asset.code || '-'}
                </span>
            ),
        },
        {
            key: 'name',
            label: 'اسم الأصل',
            width: 260,
            defaultVisible: true,
            getDisplayValue: (asset) => asset.name || '-',
            renderCell: (asset) => <span className="font-bold text-slate-800">{asset.name || '-'}</span>,
        },
        {
            key: 'depreciationMethod',
            label: 'طريقة الإهلاك',
            type: 'enum',
            filterType: 'enum',
            width: 160,
            defaultVisible: true,
            options: [
                { value: 'StraightLine', label: 'القسط الثابت' },
                { value: 'DecliningBalance', label: 'القسط المتناقص' },
            ],
            getDisplayValue: (asset) => !asset.categoryId ? '-' : asset.depreciationMethod === 'StraightLine' ? 'القسط الثابت' : asset.depreciationMethod || '-',
        },
        {
            key: 'purchaseDate',
            label: 'تاريخ الشراء',
            type: 'date',
            filterType: 'date',
            width: 140,
            defaultVisible: true,
            getDisplayValue: (asset) => asset.purchaseDate || '-',
        },
        {
            key: 'purchaseCost',
            label: 'تكلفة الشراء',
            type: 'number',
            filterType: 'number',
            width: 150,
            defaultVisible: true,
            getValue: (asset) => Number(asset.purchaseCost || 0),
            getDisplayValue: (asset) => fmt(asset.purchaseCost),
            renderCell: (asset) => <span className="font-mono text-slate-700">{fmt(asset.purchaseCost)}</span>,
        },
        {
            key: 'accumulatedDepreciation',
            label: 'مجمع الإهلاك',
            type: 'number',
            filterType: 'number',
            width: 150,
            defaultVisible: true,
            getValue: (asset) => Number(asset.accumulatedDepreciation || 0),
            getDisplayValue: (asset) => fmt(asset.accumulatedDepreciation),
            renderCell: (asset) => <span className="font-mono font-semibold text-red-500">{fmt(asset.accumulatedDepreciation)}</span>,
        },
        {
            key: 'bookValue',
            label: 'القيمة الدفترية',
            type: 'number',
            filterType: 'number',
            width: 150,
            defaultVisible: true,
            getValue: (asset) => Number(asset.bookValue || 0),
            getDisplayValue: (asset) => fmt(asset.bookValue),
            renderCell: (asset) => <span className="font-mono font-bold text-emerald-700">{fmt(asset.bookValue)}</span>,
        },
        {
            key: 'status',
            label: 'الحالة',
            type: 'enum',
            filterType: 'enum',
            width: 150,
            defaultVisible: true,
            options: [
                { value: 'Active', label: 'فعال' },
                { value: 'Disposed', label: 'مستبعد' },
                { value: 'FullyDepreciated', label: 'مستهلك بالكامل' },
            ],
            getDisplayValue: (asset) => STATUS_CONFIG[asset.status]?.label || asset.status,
            renderCell: (asset) => {
                const status = STATUS_CONFIG[asset.status] || STATUS_CONFIG.Active;
                return <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${status.color}`}>{status.label}</span>;
            },
        },
        {
            key: 'actions',
            label: 'إجراءات',
            width: 130,
            sortable: false,
            filterable: false,
            searchable: false,
            defaultVisible: true,
            align: 'center',
            renderCell: (asset) => (
                <div className="flex justify-center gap-2">
                    <button onClick={() => navigate(`/assets/register/${asset.id}`)} className="rounded-lg p-2 text-blue-600 hover:bg-blue-50" title="فتح">
                        <Edit size={18} />
                    </button>
                    <button onClick={() => handleDelete(asset)} className="rounded-lg p-2 text-red-500 hover:bg-red-50" title="حذف">
                        <Trash2 size={18} />
                    </button>
                </div>
            ),
        },
    ], [assets, navigate]);

    return (
        <div className="app-page" dir="rtl">

            <DefinitionMasterList
                headerIcon={<Archive size={24} />}
                headerTitle="سجل الأصول الثابتة"
                headerSubtitle="إدارة الأصول والإهلاك والقيم الدفترية من خلال جدول موحد قابل للتصفية."
                headerBadges={[
                    { label: `الأصول ${assets.length}`, tone: 'warning' },
                    { label: `تكلفة الشراء ${fmt(totalCost)}`, tone: 'info' },
                    { label: `مجمع الإهلاك ${fmt(totalDep)}`, tone: 'neutral' },
                    { label: `القيمة الدفترية ${fmt(totalBook)}`, tone: 'success' },
                ]}

                screenKey="definitions.fixed-assets"
                data={filtered}
                loading={loading}
                columns={columns}
                rowKey={(asset) => String(asset.id)}
                searchPlaceholder="بحث في سجل الأصول..."
                emptyMessage="لا توجد أصول ثابتة مطابقة للمعايير الحالية"
                createLabel="أصل جديد"
                onCreate={() => navigate('/assets/register/new')}
                onEdit={(asset) => navigate(`/assets/register/${asset.id}`)}
                onDelete={handleDeleteRows}
                onRefresh={loadAssets}
                onRowDoubleClick={(asset) => navigate(`/assets/register/${asset.id}`)}
                defaultSort={{ key: 'code', direction: 'asc' }}
                summaryBadges={(
                    <span className="inline-flex h-12 items-center gap-2 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 text-sm font-bold text-emerald-700">
                        <CheckCircle size={16} />
                        {filtered.length} معروض
                    </span>
                )}
            />
        </div>
    );
}
