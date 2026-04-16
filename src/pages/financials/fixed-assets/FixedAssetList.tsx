import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Package, TrendingDown, CheckCircle, AlertCircle } from 'lucide-react';

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
    Active: { label: 'Active', color: 'bg-emerald-100 text-emerald-700' },
    Disposed: { label: 'Disposed', color: 'bg-red-100 text-red-700' },
    FullyDepreciated: { label: 'Fully Depreciated', color: 'bg-gray-100 text-gray-600' },
};

const fmt = (n: number) =>
    n?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) ?? '—';

export function FixedAssetList() {
    const [assets, setAssets] = useState<FixedAssetRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
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

    const filtered = assets.filter(a =>
        (a.code || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (a.name || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    const totalCost = assets.reduce((s, a) => s + (Number(a.purchaseCost) || 0), 0);
    const totalBook = assets.reduce((s, a) => s + (Number(a.bookValue) || 0), 0);
    const totalDep = assets.reduce((s, a) => s + (Number(a.accumulatedDepreciation) || 0), 0);

    return (
        <div className="p-6 h-full flex flex-col bg-gray-50 dark:bg-gray-950">
            {/* Header */}
            <div className="flex justify-between items-start mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Fixed Assets Register</h1>
                    <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
                        Manage assets, depreciation schedules, and book values
                    </p>
                </div>
                <button
                    id="btn-new-asset"
                    onClick={() => navigate('/assets/register/new')}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg shadow transition"
                >
                    <Plus size={18} />
                    New Asset
                </button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                            <Package size={20} className="text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Total Purchase Cost</p>
                            <p className="text-lg font-bold text-gray-800 dark:text-gray-100">{fmt(totalCost)}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-red-50 dark:bg-red-900/30 rounded-lg">
                            <TrendingDown size={20} className="text-red-500 dark:text-red-400" />
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Accumulated Depreciation</p>
                            <p className="text-lg font-bold text-gray-800 dark:text-gray-100">{fmt(totalDep)}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-emerald-50 dark:bg-emerald-900/30 rounded-lg">
                            <CheckCircle size={20} className="text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Net Book Value</p>
                            <p className="text-lg font-bold text-gray-800 dark:text-gray-100">{fmt(totalBook)}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex-1 flex flex-col overflow-hidden">
                <div className="p-4 border-b dark:border-gray-700 flex items-center gap-3">
                    <div className="relative w-72">
                        <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
                        <input
                            id="search-assets"
                            type="text"
                            placeholder="Search by code or name…"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 text-sm border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <span className="text-sm text-gray-400">{filtered.length} asset(s)</span>
                </div>

                <div className="flex-1 overflow-auto">
                    {loading ? (
                        <div className="flex justify-center items-center h-40">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
                        </div>
                    ) : (
                        <table className="dense-table w-full">
                            <thead className="bg-gray-50 dark:bg-gray-900 sticky top-0 z-10">
                                <tr>
                                    {['Code', 'Name', 'Method', 'Purchase Date', 'Cost', 'Acc. Depreciation', 'Book Value', 'Status', ''].map(h => (
                                        <th key={h} className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400 border-b dark:border-gray-700">
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                {filtered.map(asset => {
                                    const sc = STATUS_CONFIG[asset.status] || STATUS_CONFIG.Active;
                                    return (
                                        <tr
                                            key={asset.id}
                                            className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer"
                                            onClick={() => navigate(`/assets/register/${asset.id}`)}
                                        >
                                            <td className="px-4 py-3 font-mono text-xs text-gray-600 dark:text-gray-400">{asset.code}</td>
                                            <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-100">{asset.name}</td>
                                            <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs">{asset.depreciationMethod}</td>
                                            <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{asset.purchaseDate}</td>
                                            <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">{fmt(asset.purchaseCost)}</td>
                                            <td className="px-4 py-3 text-right text-red-500">{fmt(asset.accumulatedDepreciation)}</td>
                                            <td className="px-4 py-3 text-right font-semibold text-emerald-600 dark:text-emerald-400">{fmt(asset.bookValue)}</td>
                                            <td className="px-4 py-3">
                                                <span className={`px-2 py-0.5 rounded text-xs font-medium ${sc.color}`}>{sc.label}</span>
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <button
                                                    id={`btn-open-${asset.id}`}
                                                    onClick={e => { e.stopPropagation(); navigate(`/assets/register/${asset.id}`); }}
                                                    className="text-blue-600 hover:text-blue-800 dark:text-blue-400 text-xs font-medium"
                                                >
                                                    Open →
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                                {filtered.length === 0 && (
                                    <tr>
                                        <td colSpan={9} className="px-4 py-12 text-center">
                                            <AlertCircle className="mx-auto text-gray-300 dark:text-gray-600 mb-2" size={32} />
                                            <p className="text-gray-400 dark:text-gray-500">
                                                {searchTerm ? 'No assets match your search.' : 'No assets yet. Click "New Asset" to get started.'}
                                            </p>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
}
