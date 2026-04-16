import { useEffect, useMemo, useState } from 'react';
import { SalesInvoiceDefinition } from '../pages/sales/SalesInvoiceDefinition';
import { getVisibleColumns, useScreenViewManager } from './useScreenViewManager';
import { useMyPermissions } from './useMyPermissions';

type BranchOption = {
    value: string;
    label: string;
};

const SALES_INVOICE_COLUMN_FALLBACK_LABELS: Record<string, string> = {
    doc_no: 'Invoice No',
    doc_date: 'Date',
    due_date: 'Due Date',
    partner_name: 'Customer',
    status: 'Status',
    total: 'Grand Total',
    branch_id: 'Branch',
};

export function useSalesInvoiceList() {
    const { can, whyNot } = useMyPermissions();
    const screenKey = SalesInvoiceDefinition.screenKey || 'sales.invoice.list';
    const readCapability = SalesInvoiceDefinition.capabilities?.read || 'sales.invoice.read';
    const createCapability = SalesInvoiceDefinition.capabilities?.create || 'sales.invoice.create';
    const updateCapability = SalesInvoiceDefinition.capabilities?.update || 'sales.invoice.update';

    const canRead = can(readCapability);
    const canCreate = can(createCapability);
    const canCreateReturn = can('sales.return.create') || can(updateCapability);
    const createDeniedReason = whyNot(createCapability);
    const readDeniedReason = whyNot(readCapability);

    const [drawerOpen, setDrawerOpen] = useState(false);
    const [branchOptions, setBranchOptions] = useState<BranchOption[]>([]);
    const [lookupErrorKey, setLookupErrorKey] = useState<string | null>(null);

    const {
        definition,
        filters,
        setFilters,
        columns,
        setColumns,
        sort,
        setSort,
        views,
        activeViewId,
        result,
        isApplying,
        apply,
        resetState,
        applySavedView,
        saveCurrentView,
        setDefaultView,
        deleteView,
    } = useScreenViewManager(screenKey, { autoApply: true, pageSize: 200 });

    useEffect(() => {
        let mounted = true;

        const loadBranches = async () => {
            try {
                const rows = await (window as any)?.electronAPI?.branch?.getBranches?.();
                if (!mounted || !Array.isArray(rows)) return;
                const mapped = rows
                    .map((row: any) => ({
                        value: String(row.id || ''),
                        label: String(row.name_ar || row.name_en || row.name || row.id || ''),
                    }))
                    .filter((item: BranchOption) => item.value);
                setBranchOptions(mapped);
                setLookupErrorKey(null);
            } catch {
                if (!mounted) return;
                setLookupErrorKey('error.sales_invoice.branch_lookup_failed');
            }
        };

        void loadBranches();

        return () => {
            mounted = false;
        };
    }, []);

    const filterSchema = useMemo(() => {
        if (!definition) return [];
        return definition.filterSchema.map((item) => (
            item.key === 'branch_id'
                ? { ...item, options: branchOptions }
                : item
        ));
    }, [branchOptions, definition]);

    const rows = useMemo(
        () => (Array.isArray(result?.rows) ? result.rows : []),
        [result?.rows],
    );

    const visibleColumns = useMemo(() => {
        if (!definition) return [];
        return getVisibleColumns(definition, columns).filter((column) => column.key !== 'id');
    }, [definition, columns]);

    return {
        screenKey,
        definition,
        drawerOpen,
        setDrawerOpen,
        canRead,
        canCreate,
        canCreateReturn,
        createDeniedReason,
        readDeniedReason,
        lookupErrorKey,
        rows,
        filters,
        setFilters,
        columns,
        setColumns,
        sort,
        setSort,
        views,
        activeViewId,
        isApplying,
        visibleColumns,
        filterSchema,
        fallbackColumnLabels: SALES_INVOICE_COLUMN_FALLBACK_LABELS,
        apply,
        resetState,
        applySavedView,
        saveCurrentView,
        setDefaultView,
        deleteView,
    };
}
