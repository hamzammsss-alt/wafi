import React, { useCallback, useMemo, useState } from 'react';
import { Megaphone, Trash2 } from 'lucide-react';
import DefinitionMasterList, { DefinitionListColumn } from '../../src/components/definitions/DefinitionMasterList';

type PromotionRow = {
    id: string;
    name: string;
    type: string;
    discount: number;
    startDate: string;
    endDate: string;
    status: 'ACTIVE' | 'DRAFT' | 'EXPIRED';
};

function getStatusLabel(status: PromotionRow['status']) {
    if (status === 'ACTIVE') return 'نشط';
    if (status === 'EXPIRED') return 'منتهي';
    return 'مسودة';
}

export const Promotions = () => {
    const [promotions, setPromotions] = useState<PromotionRow[]>([]);

    const handleCreate = useCallback(() => {
        const today = new Date().toISOString().slice(0, 10);
        setPromotions((currentPromotions) => [
            ...currentPromotions,
            {
                id: `promotion-${Date.now()}`,
                name: `عرض جديد ${currentPromotions.length + 1}`,
                type: 'خصم',
                discount: 0,
                startDate: today,
                endDate: today,
                status: 'DRAFT',
            },
        ]);
    }, []);

    const handleDelete = useCallback((selectedRows: PromotionRow[]) => {
        const selectedIds = new Set(selectedRows.map((promotion) => promotion.id));
        setPromotions((currentPromotions) => currentPromotions.filter((promotion) => !selectedIds.has(promotion.id)));
    }, []);

    const columns = useMemo<DefinitionListColumn<PromotionRow>[]>(() => [
        {
            key: 'name',
            label: 'اسم العرض',
            type: 'text',
            filterType: 'text',
            width: 240,
            defaultVisible: true,
            align: 'right',
            getValue: (promotion) => promotion.name,
            getDisplayValue: (promotion) => promotion.name,
            renderCell: (promotion) => <span className="font-bold text-slate-800">{promotion.name}</span>,
        },
        {
            key: 'type',
            label: 'النوع',
            type: 'text',
            filterType: 'text',
            width: 140,
            defaultVisible: true,
            align: 'center',
            getValue: (promotion) => promotion.type,
            getDisplayValue: (promotion) => promotion.type,
        },
        {
            key: 'discount',
            label: 'الخصم %',
            type: 'number',
            filterType: 'number',
            width: 130,
            defaultVisible: true,
            align: 'center',
            getValue: (promotion) => promotion.discount,
            getDisplayValue: (promotion) => String(promotion.discount),
            renderCell: (promotion) => <span className="font-mono font-bold text-pink-700">{promotion.discount}%</span>,
        },
        {
            key: 'startDate',
            label: 'تاريخ البداية',
            type: 'date',
            filterType: 'date',
            width: 150,
            defaultVisible: true,
            align: 'center',
            getValue: (promotion) => promotion.startDate,
            getDisplayValue: (promotion) => promotion.startDate,
        },
        {
            key: 'endDate',
            label: 'تاريخ النهاية',
            type: 'date',
            filterType: 'date',
            width: 150,
            defaultVisible: true,
            align: 'center',
            getValue: (promotion) => promotion.endDate,
            getDisplayValue: (promotion) => promotion.endDate,
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
                { value: 'ACTIVE', label: 'نشط' },
                { value: 'DRAFT', label: 'مسودة' },
                { value: 'EXPIRED', label: 'منتهي' },
            ],
            getValue: (promotion) => promotion.status,
            getDisplayValue: (promotion) => getStatusLabel(promotion.status),
            renderCell: (promotion) => (
                <span className={`rounded-full px-3 py-1 text-xs font-bold ${promotion.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : promotion.status === 'EXPIRED' ? 'bg-slate-100 text-slate-600' : 'bg-pink-50 text-pink-700'}`}>
                    {getStatusLabel(promotion.status)}
                </span>
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
            renderCell: (promotion) => (
                <button
                    type="button"
                    onClick={(event) => {
                        event.stopPropagation();
                        handleDelete([promotion]);
                    }}
                    className="rounded-lg p-2 text-rose-600 transition hover:bg-rose-50"
                    aria-label="حذف العرض"
                >
                    <Trash2 size={16} />
                </button>
            ),
        },
    ], [handleDelete]);

    return (
        <div className="h-full overflow-auto bg-[#f8fafc] p-6 font-cairo" dir="rtl">
            <DefinitionMasterList
                headerIcon={<Megaphone className="h-5 w-5" />}
                headerTitle="العروض والخصومات"
                headerSubtitle="إدارة الحملات الترويجية والخصومات."
                headerBadges={[{ label: `${promotions.length} عرض`, tone: 'info', mono: true }]}
                screenKey="trade.agreements.promotions"
                data={promotions}
                loading={false}
                columns={columns}
                rowKey={(promotion) => promotion.id}
                searchPlaceholder="بحث في العروض..."
                emptyMessage="لا توجد عروض نشطة حالياً"
                createLabel="عرض جديد"
                onCreate={handleCreate}
                onDelete={handleDelete}
                defaultSort={{ key: 'startDate', direction: 'desc' }}
            />
        </div>
    );
};
