import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Factory, CheckCircle2, Clock, Archive, AlertCircle } from 'lucide-react';

const STATUS_COLOR: Record<string, string> = {
    Draft: 'bg-gray-100 text-gray-600',
    Active: 'bg-emerald-100 text-emerald-700',
    Archived: 'bg-red-100 text-red-600',
};

export function BOMList() {
    const [boms, setBoms] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const navigate = useNavigate();

    useEffect(() => { load(); }, []);

    const load = async () => {
        try {
            setLoading(true);
            const data = await (window.electronAPI as any).manufacturing.getBOMs();
            setBoms(data ?? []);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    const filtered = boms.filter(b =>
        b.code?.toLowerCase().includes(search.toLowerCase()) ||
        b.productName?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="p-6 h-full flex flex-col bg-gray-50 dark:bg-gray-950">
            <div className="flex justify-between items-start mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                        <Factory size={24} className="text-purple-600" /> Bill of Materials
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
                        Define product recipes and manufacturing components
                    </p>
                </div>
                <button
                    id="btn-new-bom"
                    onClick={() => navigate('/manufacturing/bom/new')}
                    className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg shadow transition"
                >
                    <Plus size={18} /> New BOM
                </button>
            </div>

            {/* Summary Strip */}
            <div className="grid grid-cols-3 gap-4 mb-6">
                {[
                    { label: 'Total BOMs', value: boms.length, icon: <Factory size={18} className="text-purple-500" />, bg: 'bg-purple-50 dark:bg-purple-900/20' },
                    { label: 'Active', value: boms.filter(b => b.status === 'Active').length, icon: <CheckCircle2 size={18} className="text-emerald-500" />, bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
                    { label: 'Draft', value: boms.filter(b => b.status === 'Draft').length, icon: <Clock size={18} className="text-amber-500" />, bg: 'bg-amber-50 dark:bg-amber-900/20' },
                ].map(s => (
                    <div key={s.label} className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${s.bg}`}>{s.icon}</div>
                        <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{s.label}</p>
                            <p className="text-xl font-bold text-gray-800 dark:text-gray-100">{s.value}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex-1 flex flex-col overflow-hidden">
                <div className="p-4 border-b dark:border-gray-700 flex items-center gap-3">
                    <div className="relative w-72">
                        <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
                        <input
                            id="search-bom"
                            type="text"
                            placeholder="Search by code or product…"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 text-sm border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                    </div>
                    <span className="text-sm text-gray-400">{filtered.length} BOM(s)</span>
                </div>

                <div className="flex-1 overflow-auto">
                    {loading ? (
                        <div className="flex justify-center items-center h-40">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600" />
                        </div>
                    ) : (
                        <table className="dense-table w-full">
                            <thead className="bg-gray-50 dark:bg-gray-900 sticky top-0">
                                <tr>
                                    {['Code', 'Product', 'Output Qty', 'Unit', 'Components', 'Labor Cost', 'Status', ''].map(h => (
                                        <th key={h} className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400 border-b dark:border-gray-700">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                {filtered.map(bom => (
                                    <tr key={bom.id}
                                        className="hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors"
                                        onClick={() => navigate(`/manufacturing/bom/${bom.id}`)}>
                                        <td className="px-4 py-3 font-mono text-xs text-gray-600 dark:text-gray-400">{bom.code}</td>
                                        <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-100">{bom.productName}</td>
                                        <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{bom.outputQuantity}</td>
                                        <td className="px-4 py-3 text-gray-500">{bom.unit}</td>
                                        <td className="px-4 py-3 text-gray-500">{(bom.lines || []).length} items</td>
                                        <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-300">
                                            {Number(bom.laborCost).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLOR[bom.status] || STATUS_COLOR.Draft}`}>
                                                {bom.status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <button
                                                id={`btn-open-bom-${bom.id}`}
                                                onClick={e => { e.stopPropagation(); navigate(`/manufacturing/bom/${bom.id}`); }}
                                                className="text-purple-600 hover:text-purple-800 dark:text-purple-400 text-xs font-medium"
                                            >Open →</button>
                                        </td>
                                    </tr>
                                ))}
                                {filtered.length === 0 && (
                                    <tr><td colSpan={8} className="px-4 py-12 text-center">
                                        <AlertCircle className="mx-auto text-gray-300 mb-2" size={32} />
                                        <p className="text-gray-400">{search ? 'No BOMs match your search.' : 'No BOMs yet. Click "New BOM" to get started.'}</p>
                                    </td></tr>
                                )}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
}
