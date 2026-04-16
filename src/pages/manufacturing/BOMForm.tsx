import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    Save, ArrowLeft, Plus, Trash2, Factory, Route,
    AlertCircle, CheckCircle2, Loader2, Package
} from 'lucide-react';

type Tab = 'details' | 'lines' | 'routing';

interface BOMLineRow {
    id: string; itemId: string; itemName: string;
    quantity: number; unit: string; wastePercent: number;
}

interface RoutingRow {
    sequence: number; workCenterId: string;
    operationName: string; setupMinutes: number; runMinutes: number;
}

const INPUT = `w-full px-3 py-2 text-sm border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500`;

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{label}</label>
            {children}
        </div>
    );
}

const api = () => (window.electronAPI as any).manufacturing;

export function BOMForm() {
    const { id } = useParams<{ id: string }>();
    const isEdit = !!id;
    const navigate = useNavigate();

    const [code, setCode] = useState('');
    const [productId, setProductId] = useState('');
    const [productName, setProductName] = useState('');
    const [outputQty, setOutputQty] = useState('1');
    const [unit, setUnit] = useState('EA');
    const [laborCost, setLaborCost] = useState('0');
    const [overheadCost, setOverheadCost] = useState('0');
    const [status, setStatus] = useState('Draft');
    const [lines, setLines] = useState<BOMLineRow[]>([]);
    const [routing, setRouting] = useState<RoutingRow[]>([]);
    const [workCenters, setWorkCenters] = useState<any[]>([]);
    const [tab, setTab] = useState<Tab>('details');
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(isEdit);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    useEffect(() => {
        api().getWorkCenters().then((wcs: any[]) => setWorkCenters(wcs || [])).catch(console.error);
        if (isEdit) loadBOM();
    }, [id]);

    const loadBOM = async () => {
        try {
            setLoading(true);
            const [bom, ops] = await Promise.all([
                api().getBOM(id!),
                api().getRoutings(id!),
            ]);
            setCode(bom.code || '');
            setProductId(bom.productId || '');
            setProductName(bom.productName || '');
            setOutputQty(String(bom.outputQuantity || 1));
            setUnit(bom.unit || 'EA');
            setLaborCost(String(bom.laborCost || 0));
            setOverheadCost(String(bom.overheadCost || 0));
            setStatus(bom.status || 'Draft');
            setLines((bom.lines || []).map((l: any) => ({
                id: l.id, itemId: l.itemId, itemName: l.itemName,
                quantity: l.quantity, unit: l.unit, wastePercent: l.wastePercent,
            })));
            setRouting((ops || []).map((o: any) => ({
                sequence: o.sequence, workCenterId: o.workCenterId,
                operationName: o.operationName,
                setupMinutes: o.setupMinutes, runMinutes: o.runMinutes,
            })));
        } catch (e) { setError('Failed to load BOM.'); }
        finally { setLoading(false); }
    };

    const addLine = () => setLines(prev => [...prev, {
        id: crypto.randomUUID(), itemId: '', itemName: '',
        quantity: 1, unit: 'EA', wastePercent: 0,
    }]);

    const removeLine = (idx: number) => setLines(prev => prev.filter((_, i) => i !== idx));

    const addRouting = () => setRouting(prev => [...prev, {
        sequence: prev.length + 1, workCenterId: '',
        operationName: '', setupMinutes: 0, runMinutes: 0,
    }]);

    const removeRouting = (idx: number) => setRouting(prev => prev.filter((_, i) => i !== idx));

    const handleSave = async () => {
        setError(''); setSuccess('');
        if (!code.trim() || !productName.trim()) {
            setError('Code and Product Name are required.');
            return;
        }
        try {
            setSaving(true);
            const header = { code, productId, productName, outputQuantity: parseFloat(outputQty) || 1, unit, laborCost: parseFloat(laborCost) || 0, overheadCost: parseFloat(overheadCost) || 0, status };
            let bomId = id;
            if (isEdit) {
                await api().updateBOM(id!, header, lines);
            } else {
                const bom = await api().createBOM(header, lines);
                bomId = bom.id;
            }
            // Save routing
            if (routing.length > 0 && bomId) {
                await api().saveRouting(bomId, routing);
            }
            setSuccess('BOM saved successfully.');
            if (!isEdit && bomId) navigate(`/manufacturing/bom/${bomId}`, { replace: true });
            else await loadBOM();
        } catch (e: any) {
            setError(e?.message || 'Failed to save BOM.');
        } finally { setSaving(false); }
    };

    if (loading) return (
        <div className="flex justify-center items-center h-full">
            <Loader2 className="animate-spin text-purple-500" size={36} />
        </div>
    );

    const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
        { key: 'details', label: 'Header', icon: <Factory size={14} /> },
        { key: 'lines', label: `Components (${lines.length})`, icon: <Package size={14} /> },
        { key: 'routing', label: `Routing (${routing.length})`, icon: <Route size={14} /> },
    ];

    return (
        <div className="p-6 h-full flex flex-col bg-gray-50 dark:bg-gray-950">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <button id="btn-back" onClick={() => navigate('/manufacturing/bom')}
                        className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition">
                        <ArrowLeft size={20} className="text-gray-600 dark:text-gray-300" />
                    </button>
                    <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">
                        {isEdit ? `BOM: ${productName || '…'}` : 'New Bill of Materials'}
                    </h1>
                </div>
                <button id="btn-save" onClick={handleSave} disabled={saving}
                    className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white px-4 py-2 rounded-lg shadow transition">
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

            {/* Tabs */}
            <div className="flex gap-1 mb-4 border-b dark:border-gray-700">
                {tabs.map(t => (
                    <button key={t.key} id={`tab-${t.key}`} onClick={() => setTab(t.key)}
                        className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 transition ${tab === t.key ? 'border-purple-600 text-purple-600 dark:text-purple-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>
                        {t.icon} {t.label}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-auto">
                {tab === 'details' && (
                    <div className="grid grid-cols-2 gap-6">
                        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700 space-y-4">
                            <Field label="BOM Code *"><input id="field-code" className={INPUT} value={code} onChange={e => setCode(e.target.value)} placeholder="BOM-0001" /></Field>
                            <Field label="Product Name *"><input id="field-product-name" className={INPUT} value={productName} onChange={e => setProductName(e.target.value)} placeholder="e.g. Wooden Table" /></Field>
                            <Field label="Product ID"><input id="field-product-id" className={INPUT} value={productId} onChange={e => setProductId(e.target.value)} placeholder="Link to inventory item (optional)" /></Field>
                            {isEdit && (
                                <Field label="Status">
                                    <select id="field-status" className={INPUT} value={status} onChange={e => setStatus(e.target.value)}>
                                        <option>Draft</option>
                                        <option>Active</option>
                                        <option>Archived</option>
                                    </select>
                                </Field>
                            )}
                        </div>
                        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700 space-y-4">
                            <Field label="Output Quantity *"><input id="field-output-qty" type="number" min="0.001" step="any" className={INPUT} value={outputQty} onChange={e => setOutputQty(e.target.value)} /></Field>
                            <Field label="Unit"><input id="field-unit" className={INPUT} value={unit} onChange={e => setUnit(e.target.value)} placeholder="EA, KG, M..." /></Field>
                            <Field label="Labor Cost"><input id="field-labor-cost" type="number" min="0" step="0.01" className={INPUT} value={laborCost} onChange={e => setLaborCost(e.target.value)} /></Field>
                            <Field label="Overhead Cost"><input id="field-overhead-cost" type="number" min="0" step="0.01" className={INPUT} value={overheadCost} onChange={e => setOverheadCost(e.target.value)} /></Field>
                        </div>
                    </div>
                )}

                {tab === 'lines' && (
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                        <div className="p-4 border-b dark:border-gray-700 flex justify-between items-center">
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Raw Material Components</span>
                            <button id="btn-add-line" onClick={addLine}
                                className="flex items-center gap-1.5 bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 px-3 py-1.5 rounded-lg text-sm hover:bg-purple-100 transition">
                                <Plus size={14} /> Add Component
                            </button>
                        </div>
                        <table className="dense-table w-full">
                            <thead className="bg-gray-50 dark:bg-gray-900">
                                <tr>
                                    {['Item Name', 'Item ID', 'Quantity', 'Unit', 'Waste %', ''].map(h => (
                                        <th key={h} className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400 border-b dark:border-gray-700">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                {lines.map((l, i) => (
                                    <tr key={l.id}>
                                        <td className="px-3 py-2"><input className={INPUT} value={l.itemName} onChange={e => setLines(prev => prev.map((r, ri) => ri === i ? { ...r, itemName: e.target.value } : r))} placeholder="Material name" /></td>
                                        <td className="px-3 py-2"><input className={INPUT} value={l.itemId} onChange={e => setLines(prev => prev.map((r, ri) => ri === i ? { ...r, itemId: e.target.value } : r))} placeholder="Item ID" /></td>
                                        <td className="px-3 py-2 w-28"><input type="number" min="0" step="any" className={INPUT} value={l.quantity} onChange={e => setLines(prev => prev.map((r, ri) => ri === i ? { ...r, quantity: parseFloat(e.target.value) || 0 } : r))} /></td>
                                        <td className="px-3 py-2 w-24"><input className={INPUT} value={l.unit} onChange={e => setLines(prev => prev.map((r, ri) => ri === i ? { ...r, unit: e.target.value } : r))} placeholder="EA" /></td>
                                        <td className="px-3 py-2 w-24"><input type="number" min="0" max="100" step="0.1" className={INPUT} value={l.wastePercent} onChange={e => setLines(prev => prev.map((r, ri) => ri === i ? { ...r, wastePercent: parseFloat(e.target.value) || 0 } : r))} /></td>
                                        <td className="px-3 py-2 w-12 text-center"><button onClick={() => removeLine(i)} className="text-red-400 hover:text-red-600 transition"><Trash2 size={15} /></button></td>
                                    </tr>
                                ))}
                                {lines.length === 0 && (
                                    <tr><td colSpan={6} className="px-4 py-10 text-center text-gray-400">No components yet — click "Add Component" above.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}

                {tab === 'routing' && (
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                        <div className="p-4 border-b dark:border-gray-700 flex justify-between items-center">
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Manufacturing Routing Operations</span>
                            <button id="btn-add-routing" onClick={addRouting}
                                className="flex items-center gap-1.5 bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 px-3 py-1.5 rounded-lg text-sm hover:bg-purple-100 transition">
                                <Plus size={14} /> Add Operation
                            </button>
                        </div>
                        <table className="dense-table w-full">
                            <thead className="bg-gray-50 dark:bg-gray-900">
                                <tr>
                                    {['Seq', 'Operation Name', 'Work Center', 'Setup (min)', 'Run (min)', ''].map(h => (
                                        <th key={h} className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400 border-b dark:border-gray-700">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                {routing.map((r, i) => (
                                    <tr key={i}>
                                        <td className="px-3 py-2 w-16"><input type="number" className={INPUT} value={r.sequence} onChange={e => setRouting(prev => prev.map((x, xi) => xi === i ? { ...x, sequence: parseInt(e.target.value) || i + 1 } : x))} /></td>
                                        <td className="px-3 py-2"><input className={INPUT} value={r.operationName} onChange={e => setRouting(prev => prev.map((x, xi) => xi === i ? { ...x, operationName: e.target.value } : x))} placeholder="e.g. Cutting" /></td>
                                        <td className="px-3 py-2">
                                            <select className={INPUT} value={r.workCenterId} onChange={e => setRouting(prev => prev.map((x, xi) => xi === i ? { ...x, workCenterId: e.target.value } : x))}>
                                                <option value="">— None —</option>
                                                {workCenters.map((wc: any) => <option key={wc.id} value={wc.id}>{wc.name}</option>)}
                                            </select>
                                        </td>
                                        <td className="px-3 py-2 w-28"><input type="number" min="0" step="1" className={INPUT} value={r.setupMinutes} onChange={e => setRouting(prev => prev.map((x, xi) => xi === i ? { ...x, setupMinutes: parseFloat(e.target.value) || 0 } : x))} /></td>
                                        <td className="px-3 py-2 w-28"><input type="number" min="0" step="1" className={INPUT} value={r.runMinutes} onChange={e => setRouting(prev => prev.map((x, xi) => xi === i ? { ...x, runMinutes: parseFloat(e.target.value) || 0 } : x))} /></td>
                                        <td className="px-3 py-2 w-12 text-center"><button onClick={() => removeRouting(i)} className="text-red-400 hover:text-red-600 transition"><Trash2 size={15} /></button></td>
                                    </tr>
                                ))}
                                {routing.length === 0 && (
                                    <tr><td colSpan={6} className="px-4 py-10 text-center text-gray-400">No routing operations yet.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
