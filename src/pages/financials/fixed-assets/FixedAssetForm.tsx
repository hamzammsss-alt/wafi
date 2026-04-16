import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    Save, ArrowLeft, Calculator, TrendingDown,
    Package, List, AlertCircle, CheckCircle2, Loader2
} from 'lucide-react';

type DepreciationMethod = 'StraightLine' | 'DecliningBalance';
type AssetStatus = 'Active' | 'Disposed' | 'FullyDepreciated';

interface FormData {
    code: string;
    name: string;
    categoryId: string;
    purchaseDate: string;
    purchaseCost: string;
    salvageValue: string;
    lifeYears: string;
    depreciationMethod: DepreciationMethod;
    assetAccountId: string;
    accumulatedDepAccountId: string;
    depExpenseAccountId: string;
    status: AssetStatus;
}

const EMPTY: FormData = {
    code: '', name: '', categoryId: '',
    purchaseDate: new Date().toISOString().split('T')[0],
    purchaseCost: '', salvageValue: '0', lifeYears: '5',
    depreciationMethod: 'StraightLine',
    assetAccountId: '', accumulatedDepAccountId: '', depExpenseAccountId: '',
    status: 'Active',
};

const fmt = (n: number) =>
    n?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) ?? '—';

type Tab = 'details' | 'schedule';

export function FixedAssetForm() {
    const { id } = useParams<{ id: string }>();
    const isEdit = !!id;
    const navigate = useNavigate();

    const [form, setForm] = useState<FormData>(EMPTY);
    const [assetMeta, setAssetMeta] = useState<any>(null); // bookValue, accumulatedDepreciation
    const [schedule, setSchedule] = useState<any[]>([]);
    const [loading, setLoading] = useState(isEdit);
    const [saving, setSaving] = useState(false);
    const [tab, setTab] = useState<Tab>('details');
    const [calcResult, setCalcResult] = useState<{ yearly: string; monthly: string } | null>(null);
    const [postAmount, setPostAmount] = useState('');
    const [postDate, setPostDate] = useState(new Date().toISOString().split('T')[0]);
    const [postLoading, setPostLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    useEffect(() => {
        if (isEdit) loadAsset();
    }, [id]);

    const loadAsset = async () => {
        try {
            setLoading(true);
            const [asset, sched] = await Promise.all([
                window.electronAPI.fixedAssets.get(id!),
                window.electronAPI.fixedAssets.getSchedule(id!),
            ]);
            setAssetMeta(asset);
            setSchedule(sched ?? []);
            setForm({
                code: asset.code || '',
                name: asset.name || '',
                categoryId: asset.categoryId || '',
                purchaseDate: asset.purchaseDate || '',
                purchaseCost: String(asset.purchaseCost ?? ''),
                salvageValue: String(asset.salvageValue ?? '0'),
                lifeYears: String(asset.lifeYears ?? '5'),
                depreciationMethod: asset.depreciationMethod || 'StraightLine',
                assetAccountId: asset.assetAccountId || '',
                accumulatedDepAccountId: asset.accumulatedDepAccountId || '',
                depExpenseAccountId: asset.depExpenseAccountId || '',
                status: asset.status || 'Active',
            });
            // Pre-fill post amount from monthly depreciation
            if (asset.bookValue != null && asset.purchaseCost && asset.lifeYears) {
                const result = await window.electronAPI.fixedAssets.calcDepreciation(id!);
                setCalcResult(result);
                setPostAmount(result.monthly);
            }
        } catch (err) {
            console.error('Failed to load asset', err);
            setError('Failed to load asset details.');
        } finally {
            setLoading(false);
        }
    };

    const f = (field: keyof FormData, value: string) =>
        setForm(prev => ({ ...prev, [field]: value }));

    const handleSave = async () => {
        setError('');
        if (!form.code.trim() || !form.name.trim() || !form.purchaseDate || !form.purchaseCost) {
            setError('Code, Name, Purchase Date, and Purchase Cost are required.');
            return;
        }
        try {
            setSaving(true);
            const payload = {
                ...form,
                purchaseCost: parseFloat(form.purchaseCost) || 0,
                salvageValue: parseFloat(form.salvageValue) || 0,
                lifeYears: parseFloat(form.lifeYears) || 1,
            };
            if (isEdit) {
                await window.electronAPI.fixedAssets.update(id!, payload);
                setSuccess('Asset updated successfully.');
                await loadAsset();
            } else {
                const asset = await window.electronAPI.fixedAssets.create(payload);
                setSuccess('Asset created successfully.');
                navigate(`/assets/register/${asset.id}`, { replace: true });
            }
        } catch (err: any) {
            setError(err?.message || 'Failed to save asset.');
        } finally {
            setSaving(false);
        }
    };

    const handleCalc = async () => {
        if (!id) return;
        try {
            const result = await window.electronAPI.fixedAssets.calcDepreciation(id);
            setCalcResult(result);
            setPostAmount(result.monthly);
        } catch (err: any) {
            setError(err?.message || 'Failed to calculate depreciation.');
        }
    };

    const handlePostDepreciation = async () => {
        if (!id || !postAmount || !postDate) return;
        const amount = parseFloat(postAmount);
        if (isNaN(amount) || amount <= 0) {
            setError('Enter a valid positive amount.');
            return;
        }
        try {
            setPostLoading(true);
            setError('');
            const updated = await window.electronAPI.fixedAssets.postDepreciation(id, amount, postDate);
            setAssetMeta(updated);
            const newSched = await window.electronAPI.fixedAssets.getSchedule(id);
            setSchedule(newSched ?? []);
            setSuccess(`Depreciation of ${fmt(amount)} posted for ${postDate}.`);
        } catch (err: any) {
            setError(err?.message || 'Failed to post depreciation.');
        } finally {
            setPostLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-full">
                <Loader2 className="animate-spin text-blue-500" size={36} />
            </div>
        );
    }

    return (
        <div className="p-6 h-full flex flex-col bg-gray-50 dark:bg-gray-950">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <button
                        id="btn-back"
                        onClick={() => navigate('/assets/register')}
                        className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition"
                    >
                        <ArrowLeft size={20} className="text-gray-600 dark:text-gray-300" />
                    </button>
                    <div>
                        <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">
                            {isEdit ? `Asset: ${form.name || '…'}` : 'New Fixed Asset'}
                        </h1>
                        {isEdit && assetMeta && (
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                                Book Value: <span className="font-semibold text-emerald-600 dark:text-emerald-400">{fmt(assetMeta.bookValue)}</span>
                                {' · '}Acc. Dep.: <span className="text-red-500">{fmt(assetMeta.accumulatedDepreciation)}</span>
                                {' · '}Status: <span className="font-medium">{assetMeta.status}</span>
                            </p>
                        )}
                    </div>
                </div>
                <button
                    id="btn-save"
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-2 rounded-lg shadow transition"
                >
                    {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                    {saving ? 'Saving…' : 'Save'}
                </button>
            </div>

            {/* Alerts */}
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
                {[
                    { key: 'details', label: 'Asset Details', icon: <Package size={15} /> },
                    { key: 'schedule', label: `Depreciation Schedule (${schedule.length})`, icon: <TrendingDown size={15} /> },
                ].map(t => (
                    <button
                        key={t.key}
                        id={`tab-${t.key}`}
                        onClick={() => setTab(t.key as Tab)}
                        className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 transition ${tab === t.key
                                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                                : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                            }`}
                    >
                        {t.icon} {t.label}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-auto">
                {tab === 'details' && (
                    <div className="grid grid-cols-2 gap-6">
                        {/* Left column */}
                        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700 space-y-4">
                            <h3 className="font-semibold text-gray-700 dark:text-gray-200 text-sm uppercase tracking-wide mb-2">
                                Basic Information
                            </h3>
                            <Field label="Asset Code *">
                                <input id="field-code" className={INPUT} value={form.code} onChange={e => f('code', e.target.value)} placeholder="AST-0001" />
                            </Field>
                            <Field label="Asset Name *">
                                <input id="field-name" className={INPUT} value={form.name} onChange={e => f('name', e.target.value)} placeholder="e.g. Office Computer" />
                            </Field>
                            <Field label="Purchase Date *">
                                <input id="field-purchase-date" type="date" className={INPUT} value={form.purchaseDate} onChange={e => f('purchaseDate', e.target.value)} />
                            </Field>
                            <Field label="Purchase Cost *">
                                <input id="field-purchase-cost" type="number" min="0" step="0.01" className={INPUT} value={form.purchaseCost} onChange={e => f('purchaseCost', e.target.value)} placeholder="0.00" />
                            </Field>
                            <Field label="Salvage Value">
                                <input id="field-salvage" type="number" min="0" step="0.01" className={INPUT} value={form.salvageValue} onChange={e => f('salvageValue', e.target.value)} placeholder="0.00" />
                            </Field>
                            {isEdit && (
                                <Field label="Status">
                                    <select id="field-status" className={INPUT} value={form.status} onChange={e => f('status', e.target.value as AssetStatus)}>
                                        <option value="Active">Active</option>
                                        <option value="Disposed">Disposed</option>
                                        <option value="FullyDepreciated">Fully Depreciated</option>
                                    </select>
                                </Field>
                            )}
                        </div>

                        {/* Right column */}
                        <div className="space-y-6">
                            <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700 space-y-4">
                                <h3 className="font-semibold text-gray-700 dark:text-gray-200 text-sm uppercase tracking-wide mb-2">
                                    Depreciation Settings
                                </h3>
                                <Field label="Useful Life (Years) *">
                                    <input id="field-life" type="number" min="1" step="1" className={INPUT} value={form.lifeYears} onChange={e => f('lifeYears', e.target.value)} />
                                </Field>
                                <Field label="Depreciation Method">
                                    <select id="field-method" className={INPUT} value={form.depreciationMethod} onChange={e => f('depreciationMethod', e.target.value as DepreciationMethod)}>
                                        <option value="StraightLine">Straight Line</option>
                                        <option value="DecliningBalance">Declining Balance (Double)</option>
                                    </select>
                                </Field>

                                {/* Depreciation Calculator */}
                                {isEdit && (
                                    <div className="pt-2 border-t dark:border-gray-700">
                                        <button
                                            id="btn-calc"
                                            onClick={handleCalc}
                                            className="flex items-center gap-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 px-3 py-2 rounded-lg text-sm transition"
                                        >
                                            <Calculator size={15} /> Calculate Depreciation
                                        </button>
                                        {calcResult && (
                                            <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                                                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
                                                    <p className="text-xs text-gray-500 dark:text-gray-400">Annual</p>
                                                    <p className="font-bold text-blue-700 dark:text-blue-400">{fmt(parseFloat(calcResult.yearly))}</p>
                                                </div>
                                                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
                                                    <p className="text-xs text-gray-500 dark:text-gray-400">Monthly</p>
                                                    <p className="font-bold text-blue-700 dark:text-blue-400">{fmt(parseFloat(calcResult.monthly))}</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Post Depreciation Panel (edit only) */}
                            {isEdit && (
                                <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700 space-y-4">
                                    <h3 className="font-semibold text-gray-700 dark:text-gray-200 text-sm uppercase tracking-wide mb-2 flex items-center gap-2">
                                        <TrendingDown size={15} /> Post Depreciation
                                    </h3>
                                    <Field label="Period Date">
                                        <input
                                            id="field-post-date"
                                            type="date"
                                            className={INPUT}
                                            value={postDate}
                                            onChange={e => setPostDate(e.target.value)}
                                        />
                                    </Field>
                                    <Field label="Amount">
                                        <input
                                            id="field-post-amount"
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            className={INPUT}
                                            value={postAmount}
                                            onChange={e => setPostAmount(e.target.value)}
                                            placeholder="e.g. 150.00"
                                        />
                                    </Field>
                                    <button
                                        id="btn-post-dep"
                                        onClick={handlePostDepreciation}
                                        disabled={postLoading || !postAmount || !postDate}
                                        className="w-full flex items-center justify-center gap-2 bg-orange-600 hover:bg-orange-700 disabled:bg-orange-300 text-white px-3 py-2 rounded-lg text-sm font-medium transition"
                                    >
                                        {postLoading ? <Loader2 size={14} className="animate-spin" /> : <TrendingDown size={14} />}
                                        {postLoading ? 'Posting…' : 'Post Depreciation Entry'}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {tab === 'schedule' && (
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                        {schedule.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-16 text-gray-400 dark:text-gray-500">
                                <List size={36} className="mb-2 opacity-40" />
                                <p>No depreciation entries posted yet.</p>
                                <p className="text-sm mt-1">Use the "Post Depreciation Entry" button to record an entry.</p>
                            </div>
                        ) : (
                            <table className="dense-table w-full">
                                <thead className="bg-gray-50 dark:bg-gray-900 sticky top-0">
                                    <tr>
                                        {['#', 'Period Date', 'Amount', 'Posted At'].map(h => (
                                            <th key={h} className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400 border-b dark:border-gray-700">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                    {schedule.map((row, idx) => (
                                        <tr key={row.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                            <td className="px-4 py-3 text-gray-400 dark:text-gray-500">{idx + 1}</td>
                                            <td className="px-4 py-3 font-medium text-gray-700 dark:text-gray-200">{row.periodDate}</td>
                                            <td className="px-4 py-3 text-right text-red-500 font-semibold">{fmt(row.amount)}</td>
                                            <td className="px-4 py-3 text-gray-400 dark:text-gray-500 text-xs">{row.createdAt?.split('T')[0]}</td>
                                        </tr>
                                    ))}
                                    <tr className="bg-gray-50 dark:bg-gray-900 font-semibold">
                                        <td className="px-4 py-3 text-gray-500" colSpan={2}>Total Posted</td>
                                        <td className="px-4 py-3 text-right text-red-600">
                                            {fmt(schedule.reduce((s, r) => s + (Number(r.amount) || 0), 0))}
                                        </td>
                                        <td />
                                    </tr>
                                </tbody>
                            </table>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

// Helpers
const INPUT = `w-full px-3 py-2 text-sm border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500`;

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{label}</label>
            {children}
        </div>
    );
}
