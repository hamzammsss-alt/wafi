import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { SquareArrowOutUpLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { DocumentDefinition, ValidationIssue } from '../../types/DocumentDefinition';
import { DocumentShell } from '../../components/documents/DocumentShell';
import { SmartGrid } from '../../components/documents/SmartGrid';
import { useDocumentKeyboardPro } from '../../hooks/useDocumentKeyboardPro';
import { useDocumentState } from '../../hooks/useDocumentState';
import { useMyPermissions } from '../../hooks/useMyPermissions';
import { ColumnDef, useSmartGridPro } from '../../hooks/useSmartGridPro';
import { ItemLookupModal } from '../../components/lookups/ItemLookupModal';
import { AccountLookupModal } from '../../components/lookups/AccountLookupModal';
import PostConfirmDialog from '../../components/ui/PostConfirmDialog';
import { useEnterNavigation } from '../../hooks/useEnterNavigation';
import { DocumentSupportDock } from '../../components/workspace/DocumentSupportDock';
import { buildDocumentSupportSections, resolveDocumentSupportSectionForField } from '../../components/workspace/documentSupportSections';
import { useTabs } from '../../contexts/TabsContext';

interface DocumentPageProps {
    definition: DocumentDefinition<any, any>;
    id?: string;
}

type SelectOption = { id: string; label: string; [key: string]: any };
type LookupMode = 'item' | 'account';

const nextLineId = () => `line_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

function tr(key: string, fallback?: string): string {
    const i18n = (window as any)?.i18n;
    if (i18n && typeof i18n.t === 'function') {
        const translated = i18n.t(key);
        if (translated && translated !== key) return translated;
    }
    return fallback || key;
}

function toNumber(value: unknown, fallback = 0): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
}

function ensureLine(line: any, emptyLine: any) {
    return { ...emptyLine, ...line, id: line?.id || nextLineId() };
}

function issueText(issue: ValidationIssue): string {
    return tr(issue.messageKey || '', issue.message || tr('validation.generic', 'Validation failed'));
}

export default function DocumentPage({ definition, id }: DocumentPageProps) {
    const navigate = useNavigate();
    const { openOverlay } = useTabs();
    const { can, whyNot, isLoading: permissionsLoading } = useMyPermissions();
    const {
        status,
        setEdit,
        setNew,
        setPendingApproval,
        setPosted,
        markDirty,
        markClean,
        isDirty,
    } = useDocumentState();

    const [docId, setDocId] = useState<string | undefined>(id);
    const [header, setHeader] = useState<any>({ ...(definition.defaultValues?.header || {}), status: 'DRAFT' });
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [errorText, setErrorText] = useState<string | null>(null);
    const [lastAction, setLastAction] = useState('');
    const [showPostConfirm, setShowPostConfirm] = useState(false);
    const [showItemLookup, setShowItemLookup] = useState(false);
    const [showAccountLookup, setShowAccountLookup] = useState(false);
    const [lookupItems, setLookupItems] = useState<any[]>([]);
    const [lookupAccounts, setLookupAccounts] = useState<any[]>([]);
    const [lookupRowIndex, setLookupRowIndex] = useState<number | null>(null);

    const [partners, setPartners] = useState<SelectOption[]>([]);
    const [branches, setBranches] = useState<SelectOption[]>([]);
    const [costCenters, setCostCenters] = useState<SelectOption[]>([]);
    const [warehouses, setWarehouses] = useState<SelectOption[]>([]);
    const [currencies, setCurrencies] = useState<SelectOption[]>([]);
    const [taxGroups, setTaxGroups] = useState<SelectOption[]>([]);
    const [dynamicSelects, setDynamicSelects] = useState<Record<string, SelectOption[]>>({});

    const draftInitRef = useRef(false);
    const headerNavRef = useRef<HTMLDivElement | null>(null);
    const gridSetRowsRef = useRef<React.Dispatch<React.SetStateAction<any[]>>>(() => {});
    const gridRowsRef = useRef<any[]>([]);

    const capabilities = useMemo(() => ({
        create: definition.capabilities?.create || 'sales.invoice.create',
        read: definition.capabilities?.read || 'sales.invoice.read',
        update: definition.capabilities?.update || 'sales.invoice.update',
        post: definition.capabilities?.post || definition.permissions?.post || 'sales.invoice.post',
        void: definition.capabilities?.void || 'sales.invoice.void',
    }), [definition.capabilities, definition.permissions]);

    const skipPermissionChecks = definition.skipPermissionChecks === true;

    const canRead = skipPermissionChecks ? true : can(capabilities.read);
    const canCreate = skipPermissionChecks ? true : can(capabilities.create);
    const canUpdate = skipPermissionChecks ? true : can(capabilities.update);
    const canPost = skipPermissionChecks ? true : can(capabilities.post);
    const canVoid = skipPermissionChecks ? true : can(capabilities.void);
    const postingPolicy = definition.postingPolicy;
    const statusRules = definition.statusRules;
    const editableStatuses = useMemo(
        () => new Set((statusRules?.editable?.length ? statusRules.editable : ['DRAFT', 'REJECTED']).map((item) => String(item))),
        [statusRules?.editable],
    );
    const postableStatuses = useMemo(
        () => new Set((statusRules?.postable?.length ? statusRules.postable : ['DRAFT']).map((item) => String(item))),
        [statusRules?.postable],
    );
    const voidableStatuses = useMemo(
        () => new Set((statusRules?.voidable?.length ? statusRules.voidable : ['DRAFT', 'POSTED']).map((item) => String(item))),
        [statusRules?.voidable],
    );

    const canSubmit = Boolean(
        (postingPolicy?.submitOnMissingPostPermission ?? definition.workflow?.submitOnMissingPostPermission) && canUpdate,
    );
    const supportSections = useMemo(() => buildDocumentSupportSections(definition), [definition]);
    const supportSectionById = useMemo(() => new Map(supportSections.map((section) => [section.id, section])), [supportSections]);

    const isEditableByStatus = editableStatuses.has(String(status || 'DRAFT'));
    const isPostableStatus = postableStatuses.has(String(status || ''));
    const isVoidableStatus = voidableStatuses.has(String(status || ''));
    const isReadOnly = !canUpdate || !isEditableByStatus || loading || saving;

    const headerFields = definition.headerSchema || definition.headerFields || [];
    const lineSchema = definition.linesSchema || definition.lineColumns || [];
    const emptyLine = useMemo(() => ({ ...(definition.defaultValues?.line || {}), ...(definition.emptyLine || {}) }), [definition.defaultValues?.line, definition.emptyLine]);
    const gridSelectMap = useMemo<Record<string, Array<{ id: string; label: string }>>>(() => ({
        customer_id: partners,
        supplier_id: partners,
        branch_id: branches,
        warehouse_id: warehouses,
        from_warehouse_id: warehouses,
        to_warehouse_id: warehouses,
        currency_id: currencies,
        tax_group_id: taxGroups,
        cost_center_id: costCenters,
    }), [branches, costCenters, currencies, partners, taxGroups, warehouses]);

    const toGridColumns = useMemo<ColumnDef<any>[]>(() => {
        const mapped = lineSchema.map((column) => {
            const type =
                column.inputType === 'number' ? 'number' :
                    column.inputType === 'date' ? 'date' :
                        column.inputType === 'select' ? 'select' :
                            column.inputType === 'readonly' ? 'readonly' : 'text';
            const options = type === 'select'
                ? (
                    (column.options || []).map((option: any) => ({
                        id: String(option?.id || option?.value || ''),
                        label: String(option?.label || option?.name || option?.value || ''),
                    })).filter((option: any) => option.id)
                ).concat(gridSelectMap[column.key] || [])
                : undefined;

            return {
                key: column.key as any,
                title: column.label,
                width: typeof column.width === 'number' ? `${column.width}px` : column.width,
                type,
                options,
                isReadonly: Boolean(column.editable === false || column.computed || type === 'readonly'),
            } as ColumnDef<any>;
        });

        return [...mapped, { key: 'actions', title: '', width: '56px', type: 'readonly', isReadonly: true } as ColumnDef<any>];
    }, [gridSelectMap, lineSchema]);

    const recalcLine = useCallback((line: any) => definition.recalcLine ? definition.recalcLine(line) : line, [definition]);
    const materializeLines = useCallback((rows: any[]) => {
        const base = Array.isArray(rows) && rows.length > 0 ? rows : [emptyLine];
        return base.map((row) => ensureLine(recalcLine(row), emptyLine));
    }, [emptyLine, recalcLine]);

    const lineLookup = useMemo(() => {
        if (definition.lineLookup?.fieldKey) return definition.lineLookup;
        return {
            fieldKey: 'item_code_lookup',
            type: 'item' as LookupMode,
        };
    }, [definition.lineLookup]);

    const lineReferenceSection = useMemo(() => {
        const section = resolveDocumentSupportSectionForField(definition, lineLookup.fieldKey);
        if (!section) return null;
        return supportSectionById.get(section.id) || section;
    }, [definition, lineLookup.fieldKey, supportSectionById]);

    const repriceRowsForHeader = useCallback(async (
        nextHeader: any,
        options: { applyDiscount?: boolean } = {},
    ) => {
        const resolveItemPrice = definition.client.resolveItemPrice;
        if (typeof resolveItemPrice !== 'function') return;

        const rows = gridRowsRef.current;
        const pricedRows = await Promise.all(rows.map(async (row, index) => {
            const itemId = String(row?.item_id || '').trim();
            if (!itemId) return null;

            const response = await resolveItemPrice({
                itemId,
                unitId: row?.unit_id,
                qty: row?.qty ?? row?.quantity ?? 1,
                customerId: nextHeader?.customer_id,
                priceListId: nextHeader?.price_list_id,
            });

            if (!response?.ok || !response.data) return null;
            return { index, pricing: response.data };
        }));

        const resolved = pricedRows.filter(Boolean) as Array<{ index: number; pricing: any }>;
        if (!resolved.length) return;

        gridSetRowsRef.current((previousRows) => {
            const nextRows = [...previousRows];
            for (const result of resolved) {
                if (!nextRows[result.index]) continue;
                const current = { ...nextRows[result.index] };
                current.price = toNumber(result.pricing?.price ?? current.price, 0);
                if (options.applyDiscount || toNumber(current.discount, 0) === 0) {
                    current.discount = toNumber(result.pricing?.discount_percent ?? nextHeader?.customer_discount_percent, 0);
                }
                if (result.pricing?.tax_rate !== undefined) {
                    current.tax_rate = toNumber(result.pricing.tax_rate, current.tax_rate || 0);
                }
                nextRows[result.index] = ensureLine(recalcLine(current), emptyLine);
            }
            return nextRows;
        });
    }, [definition.client, emptyLine, recalcLine]);

    const openSupportOverlay = useCallback((fieldKey: string) => {
        const section = resolveDocumentSupportSectionForField(definition, fieldKey);
        if (!section) return;
        const resolved = supportSectionById.get(section.id) || section;
        openOverlay({
            id: `doc-field:${resolved.id}`,
            title: resolved.label,
            content: resolved.render(),
            widthClassName: resolved.widthClassName,
        });
    }, [definition, openOverlay, supportSectionById]);

    const applyItemToRow = useCallback((rowIndex: number, item: any) => {
        grid.setRows((prev) => {
            const next = [...prev];
            const current = { ...next[rowIndex] };
            current.item_id = String(item?.id || '');
            current.item_code_lookup = String(item?.code || '');
            current.item_name = String(item?.name || item?.name_ar || item?.name_en || '');
            current.qty = toNumber(current.qty, 1) || 1;
            current.price = toNumber(item?.price ?? item?.default_price ?? current.price, 0);
            current.discount = toNumber(item?.discount_percent ?? header?.customer_discount_percent ?? current.discount, 0);
            if (item?.tax_rate !== undefined) {
                current.tax_rate = toNumber(item.tax_rate, current.tax_rate || 0);
            }
            next[rowIndex] = ensureLine(recalcLine(current), emptyLine);
            return next;
        });
        markDirty();
    }, [emptyLine, header?.customer_discount_percent, markDirty, recalcLine]);

    const applyAccountToRow = useCallback((rowIndex: number, account: any) => {
        grid.setRows((prev) => {
            const next = [...prev];
            const current = { ...next[rowIndex] };
            current.account_id = String(account?.id || '');
            current.account_code_lookup = String(account?.code || account?.account_code || '');
            current.account_name = String(account?.name || account?.name_ar || account?.name_en || '');
            next[rowIndex] = ensureLine(recalcLine(current), emptyLine);
            return next;
        });
        markDirty();
    }, [emptyLine, recalcLine, markDirty]);

    const openLookup = useCallback(async (rowIndex: number, mode: LookupMode, search = '') => {
        if (mode === 'account') {
            const searchAccounts = definition.client.searchAccounts;
            if (typeof searchAccounts === 'function') {
                const response = await searchAccounts(search);
                setLookupAccounts(response?.ok && Array.isArray(response.data) ? response.data : []);
            } else {
                setLookupAccounts([]);
            }
            setLookupRowIndex(rowIndex);
            setShowAccountLookup(true);
            return;
        }

        const searchItems = definition.client.searchItems;
        if (typeof searchItems === 'function') {
            const response = await searchItems(search, { header });
            setLookupItems(response?.ok && Array.isArray(response.data) ? response.data : []);
        } else {
            setLookupItems([]);
        }
        setLookupRowIndex(rowIndex);
        setShowItemLookup(true);
    }, [definition.client, header]);

    // Keep refs in sync with current grid state so callbacks don't need grid in their deps
    const grid = useSmartGridPro<any>({
        columns: toGridColumns,
        defaultRow: ensureLine(emptyLine, emptyLine),
        isLocked: isReadOnly,
        onRequestLookup: ({ rowIndex, colKey }) => {
            if (String(colKey) !== lineLookup.fieldKey) return;
            void openLookup(rowIndex, lineLookup.type, '');
        },
        onEnterCell: (ctx) => {
            if (ctx.colKey !== lineLookup.fieldKey) return false;
            const code = String((ctx.row as any)?.[lineLookup.fieldKey] || '').trim();
            if (!code) {
                void openLookup(ctx.rowIndex, lineLookup.type, '');
                return true;
            }
            if (lineLookup.type === 'account') {
                const matchedAccount = lookupAccounts.find((account) => String(account?.code || account?.account_code || '').trim() === code);
                if (matchedAccount) {
                    applyAccountToRow(ctx.rowIndex, matchedAccount);
                    return true;
                }
                void openLookup(ctx.rowIndex, 'account', code);
                return true;
            }

            const matchedItem = lookupItems.find((item) => String(item?.code || '').trim() === code);
            if (matchedItem) {
                applyItemToRow(ctx.rowIndex, matchedItem);
                return true;
            }
            void openLookup(ctx.rowIndex, 'item', code);
            return true;
        },
    });

    const computeTotals = useCallback((rows: any[]) => {
        const fn = definition.computeTotals || definition.recalcTotals;
        if (typeof fn === 'function') return fn(rows);
        let subtotal = 0;
        let tax_total = 0;
        let grand_total = 0;
        rows.forEach((line: any) => {
            const qty = toNumber(line?.qty ?? line?.quantity, 0);
            const price = toNumber(line?.price ?? line?.unit_price, 0);
            const discount = toNumber(line?.discount, 0);
            const tax = toNumber(line?.tax_rate, 0);
            const net = qty * price * (1 - (discount / 100));
            const taxAmount = net * (tax / 100);
            subtotal += net;
            tax_total += taxAmount;
            grand_total += net + taxAmount;
        });
        return { subtotal, tax_total, grand_total } as any;
    }, [definition]);

    // Sync refs every render (before effects fire)
    gridSetRowsRef.current = grid.setRows;
    gridRowsRef.current = grid.rows;

    const totals = useMemo(() => computeTotals(grid.rows), [computeTotals, grid.rows]);

    const loadLookups = useCallback(async () => {
        try {
            const [partnersRes, branchesRes, costCentersRes, warehousesRes, currenciesRes, taxGroupsRes] = await Promise.all([
                definition.client.searchSuppliers?.('')
                || definition.client.searchCustomers?.('')
                || Promise.resolve({ ok: true, data: [] }),
                (window as any)?.electronAPI?.masterData?.getBranches?.()
                || (window as any)?.electronAPI?.branch?.getBranches?.()
                || Promise.resolve([]),
                (window as any)?.electronAPI?.masterData?.getCostCenters?.()
                || Promise.resolve([]),
                (window as any)?.electronAPI?.warehouse?.getWarehouses?.('COMP_01') || Promise.resolve([]),
                (window as any)?.electronAPI?.currency?.getCurrencies?.() || Promise.resolve([]),
                (window as any)?.electronAPI?.taxGroup?.getTaxGroups?.() || Promise.resolve([]),
            ]);

            if (partnersRes?.ok && Array.isArray(partnersRes.data)) {
                setPartners(partnersRes.data.map((x: any) => ({
                    ...x,
                    id: String(x.id || ''),
                    label: String(x.name || x.name_ar || x.name_en || x.code || ''),
                    price_list_id: String(x.price_list_id || ''),
                    customer_discount_percent: toNumber(x.customer_discount_percent, 0),
                })).filter((x: SelectOption) => x.id));
            }
            if (Array.isArray(branchesRes)) {
                setBranches(branchesRes.map((x: any) => ({ id: String(x.id || ''), label: String(x.name_ar || x.name_en || x.name || x.code || x.id || '') })).filter((x: SelectOption) => x.id));
            }
            if (Array.isArray(costCentersRes)) {
                setCostCenters(costCentersRes.map((x: any) => ({ id: String(x.id || ''), label: String(x.name_ar || x.name_en || x.name || x.code || x.id || '') })).filter((x: SelectOption) => x.id));
            }
            if (Array.isArray(warehousesRes)) {
                setWarehouses(warehousesRes.map((x: any) => ({ id: String(x.id || ''), label: String(x.name_ar || x.name_en || x.name || x.code || '') })).filter((x: SelectOption) => x.id));
            }
            if (Array.isArray(currenciesRes)) {
                setCurrencies(currenciesRes.map((x: any) => ({ id: String(x.id || x.code || ''), label: String(x.name_ar || x.name_en || x.name || x.code || '') })).filter((x: SelectOption) => x.id));
            }
            if (Array.isArray(taxGroupsRes)) {
                setTaxGroups(taxGroupsRes.map((x: any) => ({ id: String(x.id || ''), label: String(x.name_ar || x.name_en || x.name || x.code || '') })).filter((x: SelectOption) => x.id));
            }

            if (definition.loadSelectOptions) {
                const extraOptions = await definition.loadSelectOptions();
                setDynamicSelects(extraOptions || {});
            } else {
                setDynamicSelects({});
            }
        } catch {
            // lookup loading is best-effort
        }
    }, [definition, definition.client.searchCustomers, definition.client.searchSuppliers]);

    const loadDoc = useCallback(async (targetId: string) => {
        setLoading(true);
        setErrorText(null);
        try {
            const response = await definition.client.get(targetId);
            if (!response.ok || !response.data) {
                setErrorText(tr('error.documents.load_failed', 'Failed to load document'));
                navigate(definition.listRoute);
                return;
            }
            const loadedHeader = { ...(definition.defaultValues?.header || {}), ...(response.data.header || {}) };
            const nextStatus = String(loadedHeader?.status || 'DRAFT');
            setDocId(targetId);
            setHeader(loadedHeader);
            setEdit(nextStatus as any);
            gridSetRowsRef.current(materializeLines(response.data.lines || []));
            markClean();
        } catch (error: any) {
            setErrorText(String(error?.messageKey || error?.message || 'error.documents.load_failed'));
            navigate(definition.listRoute);
        } finally {
            setLoading(false);
        }
    }, [definition.client, definition.defaultValues?.header, definition.listRoute, markClean, materializeLines, navigate, setEdit]);

    const createDraft = useCallback(async () => {
        if (!canCreate) {
            setErrorText(whyNot(capabilities.create));
            return null;
        }
        setLoading(true);
        setErrorText(null);
        try {
            const response = await definition.client.createDraft('admin');
            if (!response.ok || !response.data?.id) {
                setErrorText(tr('error.documents.create_failed', 'Failed to create draft'));
                navigate(definition.listRoute);
                return null;
            }
            const createdId = String(response.data.id);
            setDocId(createdId);
            setNew();
            navigate(definition.docRoute.replace(':id', createdId), { replace: true });
            return createdId;
        } catch (error: any) {
            setErrorText(String(error?.messageKey || error?.message || 'error.documents.create_failed'));
            navigate(definition.listRoute);
            return null;
        } finally {
            setLoading(false);
        }
    }, [canCreate, capabilities.create, definition.client, definition.docRoute, definition.listRoute, navigate, setNew, whyNot]);

    useEffect(() => { void loadLookups(); }, [loadLookups]);

    useEffect(() => {
        setDocId(id);
        if (id) {
            draftInitRef.current = false;
            void loadDoc(id);
            return;
        }
        if (!draftInitRef.current) {
            draftInitRef.current = true;
            if (definition.createDraftOnOpen === false) {
                setNew();
                setHeader({ ...(definition.defaultValues?.header || {}), status: 'DRAFT' });
                gridSetRowsRef.current(materializeLines([]));
                markClean();
            } else {
                void createDraft();
            }
        }
    }, [createDraft, definition.createDraftOnOpen, definition.defaultValues?.header, id, loadDoc, markClean, materializeLines, setNew]);

    const handleHeaderChange = useCallback((field: string, value: any) => {
        if (isReadOnly) return;
        const patch: Record<string, any> = { [field]: value };

        if (field === 'customer_id') {
            const selectedPartner = partners.find((partner) => String(partner.id) === String(value));
            patch.customer_name = selectedPartner?.label || '';
            patch.price_list_id = selectedPartner?.price_list_id || '';
            patch.customer_discount_percent = toNumber(selectedPartner?.customer_discount_percent, 0);
        }

        const nextHeader = { ...header, ...patch };
        setHeader(nextHeader);
        markDirty();
        if (field === 'customer_id' || field === 'price_list_id') {
            void repriceRowsForHeader(nextHeader, { applyDiscount: field === 'customer_id' });
        }
    }, [header, isReadOnly, markDirty, partners, repriceRowsForHeader]);

    const handleUpdateRow = useCallback((rowIndex: number, field: string, value: any) => {
        if (isReadOnly) return;
        grid.setRows((prev) => {
            const next = [...prev];
            next[rowIndex] = ensureLine(recalcLine({ ...next[rowIndex], [field]: value }), emptyLine);
            return next;
        });
        markDirty();
    }, [emptyLine, grid, isReadOnly, markDirty, recalcLine]);

    const buildPayload = useCallback((targetDocId?: string) => {
        const normalized = definition.normalize ? definition.normalize(header, grid.rows) : { header, lines: grid.rows };
        const lines = normalized.lines.map((line: any) => ensureLine(recalcLine(line), emptyLine));
        const payloadHeader = { ...normalized.header, ...computeTotals(lines), status };
        const validation = definition.validate ? definition.validate(payloadHeader, lines) : { ok: true, errors: [] };
        if (!validation.ok) {
            return { ok: false, message: issueText(validation.errors[0]) };
        }
        return { ok: true, payload: { id: targetDocId ?? docId, header: payloadHeader, lines, userId: 'admin' } };
    }, [computeTotals, definition, docId, emptyLine, grid.rows, header, recalcLine, status]);

    const saveDocument = useCallback(async () => {
        let targetDocId = docId;
        if (!canUpdate || !isEditableByStatus) {
            const deniedMessage = !canUpdate
                ? whyNot(capabilities.update)
                : tr('doc.common.readonly_posted', 'Posted documents are read-only');
            setErrorText(deniedMessage || tr('error.permission_denied', 'Permission denied'));
            return false;
        }
        if (!targetDocId) {
            const createdId = await createDraft();
            if (!createdId) return false;
            targetDocId = createdId;
        }

        const payload = buildPayload(targetDocId);
        if (!payload.ok) {
            setErrorText(payload.message);
            return false;
        }

        setSaving(true);
        setErrorText(null);
        try {
            const response = await definition.client.save(payload.payload);
            if (!response.ok) {
                setErrorText(String(response.error?.message || 'error.documents.save_failed'));
                return false;
            }
            const loadedHeader = { ...(definition.defaultValues?.header || {}), ...(response.data?.header || payload.payload.header) };
            const loadedLines = response.data?.lines || payload.payload.lines;
            const nextStatus = String(loadedHeader?.status || status);
            setHeader(loadedHeader);
            setEdit(nextStatus as any);
            gridSetRowsRef.current(materializeLines(loadedLines));
            markClean();
            setLastAction(tr('doc.common.saved', 'Saved'));
            return true;
        } catch (error: any) {
            setErrorText(String(error?.messageKey || error?.message || 'error.documents.save_failed'));
            return false;
        } finally {
            setSaving(false);
        }
    }, [
        buildPayload,
        canUpdate,
        capabilities.update,
        definition.client,
        definition.defaultValues?.header,
        docId,
        isEditableByStatus,
        markClean,
        materializeLines,
        setEdit,
        status,
        whyNot,
    ]);

    const postDocument = useCallback(async () => {
        if (!docId) return;
        if (!isPostableStatus) {
            setErrorText(tr('doc.common.invalid_status_for_post', 'Only draft documents can be posted'));
            return;
        }
        if (!canPost && !canSubmit) {
            const deniedMessage = whyNot(capabilities.post) || tr('error.permission_denied', 'Permission denied');
            setErrorText(deniedMessage);
            setLastAction(deniedMessage);
            return;
        }

        if (isDirty) {
            const saved = await saveDocument();
            if (!saved) return;
        }

        setSaving(true);
        setErrorText(null);
        try {
            const response = await definition.client.postOrSubmit({
                id: docId,
                userId: 'admin',
                hasPostPermission: canPost,
            });

            if (!response.ok) {
                setErrorText(String(response.error?.message || 'error.documents.post_failed'));
                return;
            }

            const action = String(response.data?.action || '');
            if (action === 'already_posted') {
                setLastAction(tr('doc.common.already_posted', 'Already posted'));
            } else if (action === 'submitted') {
                setLastAction(tr('doc.common.submitted_for_approval', 'Submitted for approval'));
            } else {
                setLastAction(tr('doc.common.posted', 'Posted'));
            }
            const nextStatus = String(response.data?.status || status);
            markClean();
            if (nextStatus === 'POSTED') {
                setPosted();
            } else if (nextStatus.startsWith('PENDING_APPROVAL')) {
                setPendingApproval(nextStatus.endsWith('L2') ? 2 : 1);
            } else {
                setEdit(nextStatus as any);
            }
            await loadDoc(docId);
        } catch (error: any) {
            setErrorText(String(error?.messageKey || error?.message || 'error.documents.post_failed'));
        } finally {
            setSaving(false);
            setShowPostConfirm(false);
        }
    }, [canPost, canSubmit, capabilities.post, definition.client, docId, isDirty, isPostableStatus, loadDoc, markClean, saveDocument, setEdit, setPendingApproval, setPosted, whyNot]);

    const voidDocument = useCallback(async () => {
        if (!docId || !definition.client.void) return;
        if (!canVoid) {
            const deniedMessage = whyNot(capabilities.void) || tr('error.permission_denied', 'Permission denied');
            setErrorText(deniedMessage);
            setLastAction(deniedMessage);
            return;
        }
        if (!isVoidableStatus) {
            setErrorText(tr('doc.common.invalid_status_for_void', 'Only draft or posted documents can be voided'));
            return;
        }

        setSaving(true);
        setErrorText(null);
        try {
            const response = await definition.client.void({ id: docId, userId: 'admin' });
            if (!response.ok) {
                setErrorText(String(response.error?.message || 'error.documents.void_failed'));
                return;
            }
            setEdit(String(response.data?.status || 'VOID') as any);
            markClean();
            setLastAction(tr('doc.common.voided', 'Voided'));
            await loadDoc(docId);
        } catch (error: any) {
            setErrorText(String(error?.messageKey || error?.message || 'error.documents.void_failed'));
        } finally {
            setSaving(false);
        }
    }, [canVoid, capabilities.void, definition.client, docId, isVoidableStatus, loadDoc, markClean, setEdit, whyNot]);

    const requireDocIdBeforeSave = definition.createDraftOnOpen !== false;
    const isSaveDisabled = (requireDocIdBeforeSave && !docId) || saving || loading || !canUpdate || !isEditableByStatus;
    const isPostDisabled = !docId || saving || loading || !isPostableStatus || (!canPost && !canSubmit);
    const shouldSaveOnHeaderCommit = definition.saveOnHeaderCommit === true;
    const shouldCloseOnEsc = definition.closeOnEsc === true;

    const handleEscClose = useCallback(() => {
        if (showPostConfirm) {
            setShowPostConfirm(false);
            return;
        }
        if (showItemLookup) {
            setShowItemLookup(false);
            return;
        }
        if (showAccountLookup) {
            setShowAccountLookup(false);
            return;
        }
        if (shouldCloseOnEsc) {
            navigate(definition.listRoute);
        }
    }, [definition.listRoute, navigate, shouldCloseOnEsc, showAccountLookup, showItemLookup, showPostConfirm]);

    useEnterNavigation(headerNavRef, {
        enabled: canRead && !loading,
        onCommit: () => {
            if (shouldSaveOnHeaderCommit && !isSaveDisabled) {
                void saveDocument();
            }
        },
    });

    useDocumentKeyboardPro({
        enabled: canRead,
        modalOpen: showItemLookup || showAccountLookup || showPostConfirm,
        onNew: () => navigate(definition.newDocRoute),
        onFocusGrid: () => {
            if (grid.editableCols.length === 0) return;
            grid.focusCell(0, 0);
        },
        onSave: () => {
            if (isSaveDisabled) {
                const deniedMessage = whyNot(capabilities.update) || tr('doc.common.readonly_posted', 'Document is not editable');
                setErrorText(deniedMessage);
                setLastAction(deniedMessage);
                return;
            }
            void saveDocument();
        },
        onPost: () => {
            if (isPostDisabled) {
                const deniedMessage = !isPostableStatus
                    ? tr('doc.common.invalid_status_for_post', 'Only draft documents can be posted')
                    : whyNot(capabilities.post) || tr('error.permission_denied', 'Permission denied');
                setErrorText(deniedMessage);
                setLastAction(deniedMessage);
                return;
            }
            setShowPostConfirm(true);
        },
        onClose: handleEscClose,
    });

    if (!canRead) {
        if (permissionsLoading) {
            return (
                <div className="p-6 text-slate-500">
                    {tr('auth.permissions.loading', 'جاري التحقق من الصلاحيات...')}
                </div>
            );
        }
        return <div className="p-6 text-rose-600">{tr(whyNot(capabilities.read) || 'error.permission_denied', 'Permission denied')}</div>;
    }

    const selectMap: Record<string, SelectOption[]> = {
        customer_id: partners,
        supplier_id: partners,
        branch_id: branches,
        warehouse_id: warehouses,
        from_warehouse_id: warehouses,
        to_warehouse_id: warehouses,
        currency_id: currencies,
        tax_group_id: taxGroups,
        cost_center_id: costCenters,
        ...dynamicSelects,
    };

    const subtotal = toNumber((totals as any)?.[definition.totals?.subtotalKey || 'subtotal'], 0);
    const discount = toNumber((totals as any)?.[definition.totals?.discountKey || 'discount_total'], 0);
    const tax = toNumber((totals as any)?.[definition.totals?.taxKey || 'tax_total'], 0);
    const grand = toNumber((totals as any)?.[definition.totals?.grandTotalKey || 'grand_total'], 0);
    const docNoFieldKey = definition.numbering?.fieldKey || 'invoice_no';
    const docNo = String(header?.[docNoFieldKey] || header?.invoice_no || header?.code || header?.voucher_no || tr('doc.common.new', 'NEW'));

    return (
        <>
            <DocumentShell
                title={definition.title}
                status={status as any}
                isEditable={!isReadOnly}
                onNew={() => navigate(definition.newDocRoute)}
                onSave={() => { void saveDocument(); }}
                onPost={() => setShowPostConfirm(true)}
                onEscape={handleEscClose}
                docType={definition.docType}
                docId={docId || null}
                docNo={docNo}
                lastAction={lastAction}
                saveDisabled={isSaveDisabled}
                postDisabled={isPostDisabled}
            >
                <div className="p-2 md:p-3">
                    <DocumentSupportDock
                        sections={supportSections}
                        title="لوحة السند"
                        description="عدّل التعريفات أو راجع القوائم المرجعية من فوق السند مباشرة، ثم عد للإدخال دون مغادرة الشاشة."
                    />

                    {(loading || saving) && (
                        <div className="mb-4 rounded-xl border border-slate-200 bg-white/80 px-3 py-2 text-sm text-slate-500">
                            {loading ? tr('doc.common.loading', 'جاري تحميل السند...') : tr('doc.common.saving', 'جاري حفظ السند...')}
                        </div>
                    )}
                    {errorText && (
                        <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
                            {tr(errorText, errorText)}
                        </div>
                    )}

                    <div ref={headerNavRef} className="mb-6 rounded-2xl border border-slate-200 bg-white/90 p-5 shadow-sm">
                        <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-2">
                            <h2 className="text-sm font-extrabold tracking-wide text-slate-800">{tr('doc.common.header', 'بيانات السند')}</h2>
                            {definition.client.void && (
                                <button
                                    type="button"
                                    onClick={() => void voidDocument()}
                                    disabled={!canVoid || saving || loading || (status !== 'DRAFT' && status !== 'POSTED')}
                                    className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    {tr('doc.common.void', 'إلغاء السند')}
                                </button>
                            )}
                        </div>

                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                            {headerFields.map((field) => {
                                const value = header?.[field.key] ?? '';
                                const fieldLocked = isReadOnly || (field.draftOnly && status !== 'DRAFT') || field.type === 'readonly';
                                const options: Array<{ id: string; label: string }> = (
                                    (field.options || []).map((option: any) => ({
                                        id: String(option?.id || option?.value || ''),
                                        label: String(option?.label || option?.name || option?.value || ''),
                                    })).filter((option: any) => option.id)
                                ).concat(selectMap[field.key] || []);
                                const label = tr(field.labelI18nKey || '', field.label);
                                const quickAccessSection = resolveDocumentSupportSectionForField(definition, field.key);
                                const canOpenQuickAccess = Boolean(quickAccessSection);

                                return (
                                    <div key={field.key} className={field.span === 2 ? 'md:col-span-2 xl:col-span-2' : 'col-span-1'}>
                                        <div className="mb-1 flex items-center justify-between gap-2">
                                            <label className="block text-xs font-semibold text-slate-600">{label}</label>
                                            {canOpenQuickAccess && (
                                                <button
                                                    type="button"
                                                    onClick={() => openSupportOverlay(field.key)}
                                                    className="inline-flex items-center gap-1 rounded-lg border border-sky-200 bg-sky-50 px-2 py-1 text-[11px] font-bold text-sky-700 transition hover:border-sky-300 hover:bg-sky-100"
                                                    title={`فتح ${quickAccessSection?.label}`}
                                                >
                                                    <SquareArrowOutUpLeft size={12} />
                                                    <span>فتح</span>
                                                </button>
                                            )}
                                        </div>
                                        {field.type === 'readonly' ? (
                                            <div className="flex h-10 w-full items-center rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-sm text-slate-700">
                                                {String(value || '-')}
                                            </div>
                                        ) : field.type === 'textarea' ? (
                                            <textarea
                                                value={value}
                                                disabled={fieldLocked}
                                                onChange={(event) => handleHeaderChange(field.key, event.target.value)}
                                                className="min-h-[92px] w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500/40 disabled:bg-slate-50"
                                            />
                                        ) : field.type === 'select' || field.type === 'lookup' ? (
                                            <select
                                                value={String(value || '')}
                                                disabled={fieldLocked}
                                                onChange={(event) => handleHeaderChange(field.key, event.target.value)}
                                                className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500/40 disabled:bg-slate-50"
                                            >
                                                <option value="">{tr('ui.select.placeholder', 'اختر')}</option>
                                                {options.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
                                            </select>
                                        ) : (
                                            <input
                                                type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
                                                value={value}
                                                disabled={fieldLocked}
                                                onChange={(event) => handleHeaderChange(field.key, event.target.value)}
                                                className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500/40 disabled:bg-slate-50"
                                            />
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {definition.renderBeforeLines?.({
                        docId,
                        header,
                        setHeader,
                        rows: grid.rows,
                        setRows: grid.setRows,
                        isReadOnly,
                        markDirty,
                    })}

                    <div className="mb-6 overflow-hidden rounded-2xl border border-slate-200 bg-white/90 shadow-sm">
                        <div className="flex items-center justify-between border-b border-slate-100 px-6">
                            <h2 className="py-4 text-sm font-extrabold tracking-wide text-slate-800">{tr('doc.common.lines', 'تفاصيل السند')}</h2>
                        </div>
                        {lineReferenceSection && (
                            <div className="border-b border-slate-100 px-6 py-2">
                                <button
                                    type="button"
                                    onClick={() => openSupportOverlay(lineLookup.fieldKey)}
                                    className="inline-flex items-center gap-1 rounded-lg border border-sky-200 bg-sky-50 px-2.5 py-1.5 text-[11px] font-bold text-sky-700 transition hover:border-sky-300 hover:bg-sky-100"
                                    title={`فتح ${lineReferenceSection.label}`}
                                >
                                    <SquareArrowOutUpLeft size={12} />
                                    <span>{lineReferenceSection.label}</span>
                                </button>
                            </div>
                        )}
                        <SmartGrid
                            gridRef={grid.gridRef}
                            rows={grid.rows}
                            columns={toGridColumns}
                            activeCell={grid.activeCell as any}
                            isLocked={isReadOnly}
                            onFocusCell={grid.focusCell}
                            onKeyDown={grid.handleKeyDown}
                            onUpdateRow={(rowIndex, field, value) => handleUpdateRow(rowIndex, String(field), value)}
                            onRemoveRow={grid.removeRow}
                            onAddRow={grid.addRow}
                        />
                    </div>

                    {definition.totals && (
                        <div className="flex justify-end mt-4">
                            <div className="w-96 overflow-hidden rounded-2xl border border-slate-200 bg-white/90 text-sm shadow-sm">
                                <div className="flex justify-between border-b border-slate-100 p-3">
                                    <span className="text-slate-600 font-medium">{tr(definition.totals.subtotalLabelI18nKey || '', definition.totals.subtotalLabel || 'Subtotal')}</span>
                                    <span className="font-semibold font-mono">{subtotal.toFixed(2)}</span>
                                </div>
                                {definition.totals.discountKey && (
                                    <div className="flex justify-between border-b border-slate-100 p-3">
                                        <span className="text-slate-600 font-medium">{tr(definition.totals.discountLabelI18nKey || '', definition.totals.discountLabel || 'Discount')}</span>
                                        <span className="font-mono font-semibold text-amber-700">{discount.toFixed(2)}</span>
                                    </div>
                                )}
                                {definition.totals.taxKey && (
                                    <div className="flex justify-between border-b border-slate-100 p-3">
                                        <span className="text-slate-600 font-medium">{tr(definition.totals.taxLabelI18nKey || '', definition.totals.taxLabel || 'Tax')}</span>
                                        <span className="font-mono font-semibold text-red-500">{tax.toFixed(2)}</span>
                                    </div>
                                )}
                                <div className="flex justify-between bg-gradient-to-r from-teal-50 to-sky-50 p-4 text-base">
                                    <span className="font-bold text-slate-800">{tr(definition.totals.grandTotalLabelI18nKey || '', definition.totals.grandTotalLabel || 'Grand Total')}</span>
                                    <span className="font-mono font-bold text-teal-700">{grand.toFixed(2)}</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </DocumentShell>

            {showItemLookup && (
                <ItemLookupModal
                    open={showItemLookup}
                    onClose={() => {
                        setShowItemLookup(false);
                        setLookupRowIndex(null);
                        grid.restoreFocus();
                    }}
                    onSelect={(item) => {
                        if (lookupRowIndex === null) return;
                        applyItemToRow(lookupRowIndex, item);
                        setShowItemLookup(false);
                        setLookupRowIndex(null);
                        grid.restoreFocus();
                    }}
                    items={lookupItems}
                />
            )}

            {showAccountLookup && (
                <AccountLookupModal
                    open={showAccountLookup}
                    onClose={() => {
                        setShowAccountLookup(false);
                        setLookupRowIndex(null);
                        grid.restoreFocus();
                    }}
                    onSelect={(account) => {
                        if (lookupRowIndex === null) return;
                        applyAccountToRow(lookupRowIndex, account);
                        setShowAccountLookup(false);
                        setLookupRowIndex(null);
                        grid.restoreFocus();
                    }}
                    accounts={lookupAccounts}
                />
            )}

            <PostConfirmDialog
                open={showPostConfirm}
                message={tr(
                    canPost ? 'doc.common.confirm_post' : 'doc.common.confirm_submit',
                    canPost ? 'Posting will lock this document. Continue?' : 'This document will be submitted for approval. Continue?',
                )}
                onCancel={() => setShowPostConfirm(false)}
                onConfirm={() => { void postDocument(); }}
            />
        </>
    );
}
