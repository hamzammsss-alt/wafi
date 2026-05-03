import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ClipboardList, Plus, Calendar, Building2, CheckCircle, Activity } from 'lucide-react';
import DefinitionMasterList, { DefinitionListColumn } from '../../src/components/definitions/DefinitionMasterList';

type StockTakeSession = {
    id: string;
    code?: string;
    warehouse_name?: string;
    date?: string;
    status?: string;
};

type StockTakeItem = {
    id: string;
    item_code?: string;
    item_name?: string;
    snapshot_quantity?: number;
    counted_quantity?: number;
    difference?: number;
};

function formatDate(value: unknown) {
    if (!value) return '-';
    return String(value).split('T')[0] || '-';
}

function formatNumber(value: unknown) {
    const parsed = Number(value || 0);
    return Number.isFinite(parsed) ? parsed.toLocaleString('en-US', { maximumFractionDigits: 3 }) : '0';
}

function getStatusLabel(status: unknown) {
    return String(status || '') === 'DRAFT' ? 'مفتوح (قيد الجرد)' : 'مرحل (POSTED)';
}

export const StockTake = () => {
    const [view, setView] = useState<'LIST' | 'SESSION'>('LIST');
    const [sessions, setSessions] = useState<StockTakeSession[]>([]);
    const [activeSession, setActiveSession] = useState<any>(null);
    const [warehouses, setWarehouses] = useState<any[]>([]);
    const [newSessionData, setNewSessionData] = useState({
        warehouseId: '',
        description: '',
        date: new Date().toISOString().split('T')[0],
    });
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    const loadSessions = useCallback(async () => {
        // @ts-ignore
        if (window.electronAPI) {
            // @ts-ignore
            const rows = await window.electronAPI.getStockTakes();
            setSessions(Array.isArray(rows) ? rows : []);
        }
    }, []);

    const loadWarehouses = useCallback(async () => {
        // @ts-ignore
        if (window.electronAPI) {
            // @ts-ignore
            const rows = await window.electronAPI.getWarehouses();
            setWarehouses(Array.isArray(rows) ? rows : []);
        }
    }, []);

    useEffect(() => {
        void loadSessions();
        void loadWarehouses();
    }, [loadSessions, loadWarehouses]);

    const handleOpenSession = useCallback(async (id: string) => {
        try {
            // @ts-ignore
            const session = await window.electronAPI.getStockTake(id);
            if (session) {
                setActiveSession(session);
                setView('SESSION');
            }
        } catch (err: any) {
            console.error(err);
        }
    }, []);

    const handleCreateSession = useCallback(async () => {
        if (!newSessionData.warehouseId) {
            setMessage({ type: 'error', text: 'يرجى اختيار المستودع' });
            return;
        }

        try {
            // @ts-ignore
            const res = await window.electronAPI.createStockTake({
                warehouse_id: newSessionData.warehouseId,
                notes: newSessionData.description || 'جرد دوري',
                type: 'FULL',
                created_by: 'System',
            });

            if (res.success) {
                setMessage({ type: 'success', text: 'تم بدء جلسة الجرد بنجاح' });
                await loadSessions();
                await handleOpenSession(res.id);
            }
        } catch (err: any) {
            setMessage({ type: 'error', text: err.message });
        }
    }, [handleOpenSession, loadSessions, newSessionData.description, newSessionData.warehouseId]);

    const handleUpdateCount = useCallback(async (itemId: string, qty: number) => {
        try {
            setActiveSession((previous: any) => ({
                ...previous,
                items: (previous?.items || []).map((item: StockTakeItem) => (
                    item.id === itemId
                        ? { ...item, counted_quantity: qty, difference: qty - Number(item.snapshot_quantity || 0) }
                        : item
                )),
            }));

            // @ts-ignore
            await window.electronAPI.updateStockTakeItem(itemId, qty);
        } catch (err) {
            console.error(err);
        }
    }, []);

    const handlePostSession = useCallback(async () => {
        if (!window.confirm('هل أنت متأكد من اعتماد الجرد؟ سيتم توليد قيود التسوية تلقائياً ولا يمكن التراجع.')) return;

        try {
            // @ts-ignore
            await window.electronAPI.approveStockTake(activeSession.id);
            setMessage({ type: 'success', text: 'تم اعتماد الجرد وترحيل الفروقات بنجاح' });
            setView('LIST');
            await loadSessions();
        } catch (err: any) {
            setMessage({ type: 'error', text: err.message });
        }
    }, [activeSession?.id, loadSessions]);

    const sessionColumns = useMemo<DefinitionListColumn<StockTakeSession>[]>(() => [
        {
            key: 'code',
            label: 'رمز الجرد',
            type: 'text',
            filterType: 'text',
            width: 170,
            defaultVisible: true,
            align: 'right',
            getValue: (session) => session.code || '',
            getDisplayValue: (session) => session.code || '-',
            renderCell: (session) => <span className="font-mono font-bold text-emerald-700">{session.code || '-'}</span>,
        },
        {
            key: 'warehouse_name',
            label: 'المستودع',
            type: 'text',
            filterType: 'text',
            width: 220,
            defaultVisible: true,
            align: 'right',
            getValue: (session) => session.warehouse_name || '',
            getDisplayValue: (session) => session.warehouse_name || '-',
        },
        {
            key: 'date',
            label: 'التاريخ',
            type: 'date',
            filterType: 'date',
            width: 140,
            defaultVisible: true,
            align: 'center',
            getValue: (session) => formatDate(session.date),
            getDisplayValue: (session) => formatDate(session.date),
            renderCell: (session) => <span className="font-mono text-slate-600">{formatDate(session.date)}</span>,
        },
        {
            key: 'status',
            label: 'الحالة',
            type: 'enum',
            filterType: 'enum',
            width: 170,
            defaultVisible: true,
            align: 'center',
            options: [
                { value: 'DRAFT', label: 'مفتوح' },
                { value: 'POSTED', label: 'مرحل' },
            ],
            getValue: (session) => session.status || '',
            getDisplayValue: (session) => getStatusLabel(session.status),
            renderCell: (session) => (
                <span className={`rounded-full px-3 py-1 text-xs font-bold ${session.status === 'DRAFT' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}`}>
                    {getStatusLabel(session.status)}
                </span>
            ),
        },
        {
            key: 'actions',
            label: 'الإجراء',
            type: 'text',
            filterType: 'text',
            width: 160,
            defaultVisible: true,
            sortable: false,
            filterable: false,
            searchable: false,
            align: 'center',
            getValue: () => '',
            getDisplayValue: () => '',
            renderCell: (session) => (
                <button
                    type="button"
                    onClick={(event) => {
                        event.stopPropagation();
                        void handleOpenSession(session.id);
                    }}
                    className="rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 transition hover:bg-emerald-100"
                >
                    {session.status === 'DRAFT' ? 'متابعة الجرد' : 'عرض التفاصيل'}
                </button>
            ),
        },
    ], [handleOpenSession]);

    const stockTakeItems = useMemo<StockTakeItem[]>(
        () => Array.isArray(activeSession?.items) ? activeSession.items : [],
        [activeSession?.items],
    );

    const itemColumns = useMemo<DefinitionListColumn<StockTakeItem>[]>(() => [
        {
            key: 'item_code',
            label: 'رمز الصنف',
            type: 'text',
            filterType: 'text',
            width: 150,
            defaultVisible: true,
            align: 'right',
            getValue: (item) => item.item_code || '',
            getDisplayValue: (item) => item.item_code || '-',
            renderCell: (item) => <span className="font-mono text-slate-600">{item.item_code || '-'}</span>,
        },
        {
            key: 'item_name',
            label: 'اسم الصنف',
            type: 'text',
            filterType: 'text',
            width: 280,
            defaultVisible: true,
            align: 'right',
            getValue: (item) => item.item_name || '',
            getDisplayValue: (item) => item.item_name || '-',
            renderCell: (item) => <span className="font-bold text-slate-800">{item.item_name || '-'}</span>,
        },
        {
            key: 'snapshot_quantity',
            label: 'الرصيد الدفتري',
            type: 'number',
            filterType: 'number',
            width: 160,
            defaultVisible: true,
            align: 'center',
            getValue: (item) => Number(item.snapshot_quantity || 0),
            getDisplayValue: (item) => formatNumber(item.snapshot_quantity),
            renderCell: (item) => <span className="font-mono text-slate-500">{formatNumber(item.snapshot_quantity)}</span>,
        },
        {
            key: 'counted_quantity',
            label: 'العد الفعلي',
            type: 'number',
            filterType: 'number',
            width: 160,
            defaultVisible: true,
            align: 'center',
            getValue: (item) => Number(item.counted_quantity || 0),
            getDisplayValue: (item) => formatNumber(item.counted_quantity),
            renderCell: (item) => {
                const isModified = Number(item.counted_quantity || 0) !== Number(item.snapshot_quantity || 0);
                if (activeSession?.status !== 'DRAFT') {
                    return <span className="font-mono text-lg font-bold">{formatNumber(item.counted_quantity)}</span>;
                }

                return (
                    <input
                        type="number"
                        value={Number(item.counted_quantity || 0)}
                        onClick={(event) => event.stopPropagation()}
                        onDoubleClick={(event) => event.stopPropagation()}
                        onChange={(event) => handleUpdateCount(item.id, Number(event.target.value))}
                        className={`h-10 w-28 rounded-lg border px-2 text-center font-mono text-lg font-bold outline-none transition focus:ring-2 focus:ring-yellow-300 ${isModified ? 'border-yellow-400 bg-white' : 'border-slate-300 bg-slate-50'}`}
                    />
                );
            },
        },
        {
            key: 'difference',
            label: 'الفارق',
            type: 'number',
            filterType: 'number',
            width: 130,
            defaultVisible: true,
            align: 'center',
            getValue: (item) => Number(item.difference || 0),
            getDisplayValue: (item) => formatNumber(item.difference),
            renderCell: (item) => {
                const diff = Number(item.difference || 0);
                return (
                    <span className={`font-mono text-lg font-bold ${diff < 0 ? 'text-red-500' : diff > 0 ? 'text-emerald-500' : 'text-slate-300'}`}>
                        {diff > 0 ? `+${formatNumber(diff)}` : formatNumber(diff)}
                    </span>
                );
            },
        },
    ], [activeSession?.status, handleUpdateCount]);

    if (view === 'LIST') {
        return (
            <div className="h-full overflow-auto bg-[#f8fafc] p-6" dir="rtl">
                <h1 className="mb-6 flex items-center gap-2 text-2xl font-bold text-slate-800">
                    <ClipboardList className="text-emerald-600" /> جلسات الجرد (Stock Take Sessions)
                </h1>

                <div className="mb-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                    <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-slate-700">
                        <Plus size={18} /> بدء جلسة جرد جديدة
                    </h2>
                    <div className="grid grid-cols-1 items-end gap-4 md:grid-cols-4">
                        <div>
                            <label className="mb-2 block text-sm font-bold text-slate-700">المستودع</label>
                            <select
                                className="w-full rounded-lg border p-2.5 outline-none focus:ring-2 focus:ring-emerald-200"
                                value={newSessionData.warehouseId}
                                onChange={(event) => setNewSessionData({ ...newSessionData, warehouseId: event.target.value })}
                            >
                                <option value="">اختر المستودع...</option>
                                {warehouses.map((warehouse) => (
                                    <option key={warehouse.id} value={warehouse.id}>
                                        {warehouse.name || warehouse.name_ar || warehouse.code}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="mb-2 block text-sm font-bold text-slate-700">تاريخ الجرد</label>
                            <input
                                type="date"
                                className="w-full rounded-lg border p-2.5 outline-none focus:ring-2 focus:ring-emerald-200"
                                value={newSessionData.date}
                                onChange={(event) => setNewSessionData({ ...newSessionData, date: event.target.value })}
                            />
                        </div>
                        <div>
                            <label className="mb-2 block text-sm font-bold text-slate-700">ملاحظات / وصف</label>
                            <input
                                className="w-full rounded-lg border p-2.5 outline-none focus:ring-2 focus:ring-emerald-200"
                                placeholder="جرد نهاية العام..."
                                value={newSessionData.description}
                                onChange={(event) => setNewSessionData({ ...newSessionData, description: event.target.value })}
                            />
                        </div>
                        <button
                            onClick={handleCreateSession}
                            className="rounded-lg bg-emerald-600 px-6 py-2.5 font-bold text-white shadow-lg shadow-emerald-100 transition hover:bg-emerald-700"
                        >
                            بدء الجرد
                        </button>
                    </div>
                </div>

                <DefinitionMasterList
                    headerIcon={<ClipboardList className="h-5 w-5" />}
                    headerTitle="جلسات الجرد"
                    headerSubtitle="قائمة جلسات الجرد السابقة والحالية مع خصائص البحث والتصفية والتصدير."
                    headerBadges={[{ label: `${sessions.length} جلسة`, tone: 'info', mono: true }]}
                    screenKey="inventory.stock-take.sessions"
                    data={sessions}
                    loading={false}
                    columns={sessionColumns}
                    rowKey={(session) => String(session.id)}
                    searchPlaceholder="بحث في جلسات الجرد..."
                    emptyMessage="لا توجد جلسات جرد سابقة"
                    onEdit={(session) => void handleOpenSession(session.id)}
                    onRowDoubleClick={(session) => void handleOpenSession(session.id)}
                    onRefresh={loadSessions}
                    defaultSort={{ key: 'date', direction: 'desc' }}
                />

                {message && (
                    <div className={`fixed bottom-4 left-4 rounded-lg p-4 font-bold shadow-xl ${message.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'}`}>
                        {message.text}
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="flex h-full flex-col bg-[#f8fafc]" dir="rtl">
            <div className="z-10 flex items-center justify-between border-b border-slate-200 bg-white p-4 shadow-sm">
                <div>
                    <button onClick={() => setView('LIST')} className="mb-1 text-sm text-slate-500 hover:text-slate-700">
                        الرجوع للقائمة
                    </button>
                    <h1 className="flex items-center gap-2 text-xl font-bold text-slate-800">
                        <Building2 size={20} className="text-emerald-600" />
                        {activeSession?.warehouse_name}
                        <span className="mx-2 font-light text-slate-400">|</span>
                        {activeSession?.code}
                    </h1>
                </div>
                {activeSession?.status === 'DRAFT' && (
                    <button
                        onClick={handlePostSession}
                        className="flex items-center gap-2 rounded-lg bg-emerald-600 px-6 py-2 font-bold text-white shadow-md shadow-emerald-200 transition hover:bg-emerald-700"
                    >
                        <CheckCircle size={18} /> اعتماد وترحيل الفروقات
                    </button>
                )}
            </div>

            <div className="flex-1 overflow-auto p-6">
                <DefinitionMasterList
                    headerIcon={<Activity className="h-5 w-5" />}
                    headerTitle="أصناف جلسة الجرد"
                    headerSubtitle="مطابقة الرصيد الدفتري مع العد الفعلي وإظهار الفروقات."
                    headerBadges={[
                        { label: `${stockTakeItems.length} صنف`, tone: 'info', mono: true },
                        { label: getStatusLabel(activeSession?.status), tone: activeSession?.status === 'DRAFT' ? 'warning' : 'success' },
                    ]}
                    screenKey={`inventory.stock-take.session.${activeSession?.id || 'active'}`}
                    data={stockTakeItems}
                    loading={false}
                    columns={itemColumns}
                    rowKey={(item) => String(item.id)}
                    searchPlaceholder="بحث في أصناف الجرد..."
                    emptyMessage="لا توجد أصناف في جلسة الجرد"
                    onRefresh={() => activeSession?.id ? handleOpenSession(activeSession.id) : undefined}
                    defaultSort={{ key: 'item_code', direction: 'asc' }}
                />
            </div>
        </div>
    );
};
