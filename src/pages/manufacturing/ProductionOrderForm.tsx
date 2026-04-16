import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    Save, ArrowLeft, PlayCircle, Factory, List,
    AlertCircle, CheckCircle2, Loader2, StopCircle, Play
} from 'lucide-react';

type Tab = 'details' | 'jobcards';

const INPUT = `w-full px-3 py-2 text-sm border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-amber-500`;

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{label}</label>
            {children}
        </div>
    );
}

const api = () => (window.electronAPI as any).manufacturing;
const fmt = (n: number) => n?.toLocaleString('en-US', { minimumFractionDigits: 2 }) ?? '—';

const JC_COLOR: Record<string, string> = {
    Pending: 'bg-gray-100 text-gray-600',
    Running: 'bg-blue-100 text-blue-700',
    Done: 'bg-emerald-100 text-emerald-700',
};

export function ProductionOrderForm() {
    const { id } = useParams<{ id: string }>();
    const isEdit = !!id;
    const navigate = useNavigate();

    const [order, setOrder] = useState<any>(null);
    const [boms, setBoms] = useState<any[]>([]);
    const [jobCards, setJobCards] = useState<any[]>([]);
    const [tab, setTab] = useState<Tab>('details');
    const [loading, setLoading] = useState(isEdit);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // Form fields
    const [bomId, setBomId] = useState('');
    const [productName, setProductName] = useState('');
    const [productId, setProductId] = useState('');
    const [plannedQty, setPlannedQty] = useState('1');
    const [plannedDate, setPlannedDate] = useState(new Date().toISOString().split('T')[0]);
    const [notes, setNotes] = useState('');

    // Execute
    const [execQty, setExecQty] = useState('');
    const [execDate, setExecDate] = useState(new Date().toISOString().split('T')[0]);
    const [executing, setExecuting] = useState(false);

    useEffect(() => {
        api().getBOMs().then((b: any[]) => setBoms(b || [])).catch(console.error);
        if (isEdit) loadOrder();
    }, [id]);

    const loadOrder = async () => {
        try {
            setLoading(true);
            const [ord, jcs] = await Promise.all([
                (window.electronAPI as any).manufacturing.getOrders().then((all: any[]) => all.find((o: any) => o.id === id)),
                api().getJobCards({ orderId: id }),
            ]);
            if (ord) {
                setOrder(ord);
                setBomId(ord.bomId || '');
                setProductName(ord.productName || '');
                setProductId(ord.productId || '');
                setPlannedQty(String(ord.plannedQty || 1));
                setPlannedDate(ord.plannedDate || '');
                setNotes(ord.notes || '');
                setExecQty(String(ord.plannedQty - ord.producedQty));
            }
            setJobCards(jcs || []);
        } catch (e) { setError('Failed to load order.'); }
        finally { setLoading(false); }
    };

    const onBOMChange = (selectedId: string) => {
        setBomId(selectedId);
        const bom = boms.find(b => b.id === selectedId);
        if (bom) {
            setProductName(bom.productName);
            setProductId(bom.productId || '');
        }
    };

    const handleSave = async () => {
        setError(''); setSuccess('');
        if (!bomId || !plannedQty) { setError('Please select a BOM and enter planned quantity.'); return; }
        try {
            setSaving(true);
            const data = { bomId, productId, productName, plannedQty: parseFloat(plannedQty), plannedDate, notes };
            if (isEdit) {
                await api().updateOrderStatus(id!, order?.status || 'Draft');
                setSuccess('Order updated.');
                await loadOrder();
            } else {
                const created = await api().createOrder(data);
                setSuccess('Production order created.');
                navigate(`/manufacturing/orders/${created.id}`, { replace: true });
            }
        } catch (e: any) { setError(e?.message || 'Failed to save.'); }
        finally { setSaving(false); }
    };

    const handleExecute = async () => {
        const qty = parseFloat(execQty);
        if (!qty || qty <= 0) { setError('Enter a valid quantity to execute.'); return; }
        try {
            setExecuting(true); setError(''); setSuccess('');
            const updated = await api().executeOrder(id!, qty, execDate);
            setOrder(updated);
            setSuccess(`Executed ${qty} units. Produced: ${updated.producedQty} / ${updated.plannedQty}`);
            const jcs = await api().getJobCards({ orderId: id });
            setJobCards(jcs || []);
            setExecQty(String(updated.plannedQty - updated.producedQty));
        } catch (e: any) { setError(e?.message || 'Execution failed.'); }
        finally { setExecuting(false); }
    };

    const handleStartJob = async () => {
        try {
            const card = await api().startJob({ orderId: id });
            setJobCards(prev => [...prev, card]);
            setSuccess('Job card started.');
        } catch (e: any) { setError(e?.message || 'Failed to start job card.'); }
    };

    if (loading) return (
        <div className="flex justify-center items-center h-full">
            <Loader2 className="animate-spin text-amber-500" size={36} />
        </div>
    );

    const remaining = order ? (order.plannedQty - order.producedQty) : 0;
    const progress = order ? Math.round((order.producedQty / order.plannedQty) * 100) : 0;

    return (
        <div className="p-6 h-full flex flex-col bg-gray-50 dark:bg-gray-950">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <button id="btn-back" onClick={() => navigate('/manufacturing/orders')}
                        className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition">
                        <ArrowLeft size={20} className="text-gray-600 dark:text-gray-300" />
                    </button>
                    <div>
                        <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">
                            {isEdit ? `Order: ${order?.orderNo || '…'}` : 'New Production Order'}
                        </h1>
                        {isEdit && order && (
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                                <span className="font-medium">{order.productName}</span>
                                {' · '}<span className="text-amber-600">{progress}% complete</span>
                                {' · '}Remaining: <span className="font-semibold">{fmt(remaining)}</span>
                            </p>
                        )}
                    </div>
                </div>
                <button id="btn-save" onClick={handleSave} disabled={saving}
                    className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 disabled:bg-amber-400 text-white px-4 py-2 rounded-lg shadow transition">
                    {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                    {saving ? 'Saving…' : 'Save'}
                </button>
            </div>

            {error && (
                <div className="mb-4 flex items-center gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg text-sm">
                    <AlertCircle size={16} /> {error}
                </div>
            )}
            {success && (
                <div className="mb-4 flex items-center gap-2 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 px-4 py-3 rounded-lg text-sm">
                    <CheckCircle2 size={16} /> {success}
                </div>
            )}

            {/* Progress Bar (edit mode) */}
            {isEdit && order && (
                <div className="mb-4 bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700 shadow-sm">
                    <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                        <span>Production Progress</span>
                        <span>{fmt(order.producedQty)} / {fmt(order.plannedQty)}</span>
                    </div>
                    <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div className="h-2 bg-emerald-500 rounded-full transition-all" style={{ width: `${progress}%` }} />
                    </div>
                </div>
            )}

            {/* Tabs */}
            <div className="flex gap-1 mb-4 border-b dark:border-gray-700">
                {[
                    { key: 'details', label: 'Order Details', icon: <Factory size={14} /> },
                    { key: 'jobcards', label: `Job Cards (${jobCards.length})`, icon: <List size={14} /> },
                ].map(t => (
                    <button key={t.key} id={`tab-${t.key}`} onClick={() => setTab(t.key as Tab)}
                        className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 transition ${tab === t.key ? 'border-amber-600 text-amber-600 dark:text-amber-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>
                        {t.icon} {t.label}
                    </button>
                ))}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto">
                {tab === 'details' && (
                    <div className="grid grid-cols-2 gap-6">
                        {/* Left: Order fields */}
                        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700 space-y-4">
                            <Field label="Bill of Materials *">
                                <select id="field-bom" className={INPUT} value={bomId} onChange={e => onBOMChange(e.target.value)} disabled={isEdit}>
                                    <option value="">— Select BOM —</option>
                                    {boms.map(b => <option key={b.id} value={b.id}>{b.code} — {b.productName}</option>)}
                                </select>
                            </Field>
                            <Field label="Product Name">
                                <input className={INPUT} value={productName} onChange={e => setProductName(e.target.value)} placeholder="Auto-filled from BOM" />
                            </Field>
                            <Field label="Planned Quantity *">
                                <input id="field-planned-qty" type="number" min="0.001" step="any" className={INPUT} value={plannedQty} onChange={e => setPlannedQty(e.target.value)} />
                            </Field>
                            <Field label="Planned Date">
                                <input id="field-planned-date" type="date" className={INPUT} value={plannedDate} onChange={e => setPlannedDate(e.target.value)} />
                            </Field>
                            <Field label="Notes">
                                <textarea className={INPUT + ' resize-none'} rows={3} value={notes} onChange={e => setNotes(e.target.value)} />
                            </Field>
                        </div>

                        {/* Right: Execute panel */}
                        {isEdit && order?.status !== 'Completed' && order?.status !== 'Cancelled' && (
                            <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700 space-y-4">
                                <h3 className="font-semibold text-gray-700 dark:text-gray-200 text-sm uppercase tracking-wide flex items-center gap-2">
                                    <PlayCircle size={15} className="text-emerald-600" /> Execute Production
                                </h3>
                                <Field label="Execution Date">
                                    <input id="field-exec-date" type="date" className={INPUT} value={execDate} onChange={e => setExecDate(e.target.value)} />
                                </Field>
                                <Field label={`Quantity (remaining: ${fmt(remaining)})`}>
                                    <input id="field-exec-qty" type="number" min="0.001" step="any" className={INPUT}
                                        value={execQty} onChange={e => setExecQty(e.target.value)}
                                        max={remaining} />
                                </Field>
                                <button id="btn-execute" onClick={handleExecute} disabled={executing || remaining <= 0}
                                    className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 text-white px-4 py-2.5 rounded-lg font-medium transition">
                                    {executing ? <Loader2 size={15} className="animate-spin" /> : <PlayCircle size={15} />}
                                    {executing ? 'Executing…' : 'Execute Production Run'}
                                </button>
                                <div className="pt-2 border-t dark:border-gray-700">
                                    <button id="btn-start-job" onClick={handleStartJob}
                                        className="w-full flex items-center justify-center gap-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 px-4 py-2 rounded-lg text-sm font-medium transition">
                                        <Play size={14} /> Start Manual Job Card
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {tab === 'jobcards' && (
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                        {jobCards.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-16 text-gray-400 dark:text-gray-500">
                                <List size={36} className="mb-2 opacity-40" />
                                <p>No job cards for this order yet.</p>
                            </div>
                        ) : (
                            <table className="dense-table w-full">
                                <thead className="bg-gray-50 dark:bg-gray-900 sticky top-0">
                                    <tr>
                                        {['#', 'Status', 'Output Qty', 'Started', 'Completed', 'Notes'].map(h => (
                                            <th key={h} className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400 border-b dark:border-gray-700">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                    {jobCards.map((jc, idx) => (
                                        <tr key={jc.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                            <td className="px-4 py-3 text-gray-400">{idx + 1}</td>
                                            <td className="px-4 py-3">
                                                <span className={`px-2 py-0.5 rounded text-xs font-medium ${JC_COLOR[jc.status] || JC_COLOR.Pending}`}>{jc.status}</span>
                                            </td>
                                            <td className="px-4 py-3 text-right font-semibold text-emerald-600">{fmt(jc.outputQty)}</td>
                                            <td className="px-4 py-3 text-gray-500 text-xs">{jc.startedAt?.split('T')[0] || '—'}</td>
                                            <td className="px-4 py-3 text-gray-500 text-xs">{jc.completedAt?.split('T')[0] || '—'}</td>
                                            <td className="px-4 py-3 text-gray-500 text-xs">{jc.notes}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
