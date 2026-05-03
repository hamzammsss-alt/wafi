import React, { useCallback, useMemo, useState } from 'react';
import { MapPin, Edit, Trash2 } from 'lucide-react';
import DefinitionMasterList, { DefinitionListColumn } from '../../../src/components/definitions/DefinitionMasterList';

type RouteRow = {
    id: string;
    name: string;
    region: string;
    salesRep: string;
    customerCount: number;
    visitDays: string;
};

const INITIAL_ROUTES: RouteRow[] = [
    {
        id: 'north-1',
        name: 'مسار الشمال 1',
        region: 'نابلس - رفيديا',
        salesRep: 'أحمد المصري',
        customerCount: 45,
        visitDays: 'سبت - اثنين - أربعاء',
    },
    {
        id: 'ramallah-center',
        name: 'مسار رام الله المركزي',
        region: 'رام الله - الإرسال',
        salesRep: 'خالد العلي',
        customerCount: 60,
        visitDays: 'يومياً',
    },
];

export const RoutePlan = () => {
    const [routes, setRoutes] = useState<RouteRow[]>(INITIAL_ROUTES);

    const handleDelete = useCallback((selectedRoutes: RouteRow[]) => {
        const selectedIds = new Set(selectedRoutes.map((route) => route.id));
        setRoutes((currentRoutes) => currentRoutes.filter((route) => !selectedIds.has(route.id)));
    }, []);

    const handleCreate = useCallback(() => {
        const nextIndex = routes.length + 1;
        setRoutes((currentRoutes) => [
            ...currentRoutes,
            {
                id: `route-${Date.now()}`,
                name: `مسار جديد ${nextIndex}`,
                region: '-',
                salesRep: '-',
                customerCount: 0,
                visitDays: '-',
            },
        ]);
    }, [routes.length]);

    const columns = useMemo<DefinitionListColumn<RouteRow>[]>(() => [
        {
            key: 'name',
            label: 'اسم المسار',
            type: 'text',
            filterType: 'text',
            width: 220,
            defaultVisible: true,
            align: 'right',
            getValue: (route) => route.name,
            getDisplayValue: (route) => route.name,
            renderCell: (route) => <span className="font-bold text-slate-800">{route.name}</span>,
        },
        {
            key: 'region',
            label: 'المنطقة',
            type: 'text',
            filterType: 'text',
            width: 200,
            defaultVisible: true,
            align: 'right',
            getValue: (route) => route.region,
            getDisplayValue: (route) => route.region,
        },
        {
            key: 'salesRep',
            label: 'المندوب المسؤول',
            type: 'text',
            filterType: 'text',
            width: 190,
            defaultVisible: true,
            align: 'right',
            getValue: (route) => route.salesRep,
            getDisplayValue: (route) => route.salesRep,
        },
        {
            key: 'customerCount',
            label: 'عدد العملاء',
            type: 'number',
            filterType: 'number',
            width: 150,
            defaultVisible: true,
            align: 'center',
            getValue: (route) => route.customerCount,
            getDisplayValue: (route) => String(route.customerCount),
            renderCell: (route) => (
                <span className="rounded-lg bg-blue-100 px-3 py-1 text-xs font-bold text-blue-700">
                    {route.customerCount} عميل
                </span>
            ),
        },
        {
            key: 'visitDays',
            label: 'أيام الزيارة',
            type: 'text',
            filterType: 'text',
            width: 210,
            defaultVisible: true,
            align: 'right',
            getValue: (route) => route.visitDays,
            getDisplayValue: (route) => route.visitDays,
            renderCell: (route) => <span className="text-sm text-slate-500">{route.visitDays}</span>,
        },
        {
            key: 'actions',
            label: 'الإجراءات',
            type: 'text',
            filterType: 'text',
            width: 120,
            defaultVisible: true,
            sortable: false,
            filterable: false,
            searchable: false,
            align: 'center',
            getValue: () => '',
            getDisplayValue: () => '',
            renderCell: (route) => (
                <div className="flex items-center justify-center gap-2">
                    <button
                        type="button"
                        className="rounded-lg p-2 text-blue-600 transition hover:bg-blue-50"
                        aria-label="تعديل المسار"
                    >
                        <Edit size={16} />
                    </button>
                    <button
                        type="button"
                        onClick={(event) => {
                            event.stopPropagation();
                            handleDelete([route]);
                        }}
                        className="rounded-lg p-2 text-red-600 transition hover:bg-red-50"
                        aria-label="حذف المسار"
                    >
                        <Trash2 size={16} />
                    </button>
                </div>
            ),
        },
    ], [handleDelete]);

    return (
        <div className="h-full bg-slate-50 p-6" dir="rtl">
            <DefinitionMasterList
                headerIcon={<MapPin className="h-5 w-5" />}
                headerTitle="مسارات التوزيع"
                headerSubtitle="إدارة مسارات الزيارة والمندوبين والعملاء."
                headerBadges={[{ label: `${routes.length} مسار`, tone: 'info', mono: true }]}
                screenKey="trade.distribution.routes"
                data={routes}
                loading={false}
                columns={columns}
                rowKey={(route) => route.id}
                searchPlaceholder="بحث في المسارات..."
                emptyMessage="لا توجد مسارات توزيع"
                createLabel="مسار جديد"
                onCreate={handleCreate}
                onDelete={handleDelete}
                defaultSort={{ key: 'name', direction: 'asc' }}
            />
        </div>
    );
};
