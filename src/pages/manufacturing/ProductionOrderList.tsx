import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Factory, PlayCircle, CheckCircle2, Clock, AlertCircle, XCircle } from 'lucide-react';

const STATUS_COLOR: Record<string, string> = {
    Draft: 'bg-gray-100 text-gray-600',
    Released: 'bg-blue-100 text-blue-700',
    InProgress: 'bg-amber-100 text-amber-700',
    Completed: 'bg-emerald-100 text-emerald-700',
    Cancelled: 'bg-red-100 text-red-600',
};

const api = () => (window.electronAPI as any).manufacturing;
const fmt = (n: number) => n?.toLocaleString('en-US', { minimumFractionDigits: 2 }) ?? '—';

export function ProductionOrderList() {
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const navigate = useNavigate();

    useEffect(() => { load(); }, []);
    const load = async () => {
        try {
            setLoading(true);
            const data = await api().getOrders();
            setOrders(data ?? []);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    const filtered = orders.filter(o =>
        o.orderNo?.toLowerCase().includes(search.toLowerCase()) ||
        o.productName?.toLowerCase().includes(search.toLowerCase())
    );

    const byStatus = (s: string) => orders.filter(o => o.status === s).length;

    return (
        <div className="p-6 h-full flex flex-col bg-gray-50 dark:bg-gray-950">
            <div className="flex justify-between items-start mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                        <Factory size={24} className="text-amber-600" /> Production Orders
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Track and execute manufacturing orders</p>
                </div>
                <button id="btn-new-order" onClick={() => navigate('/manufacturing/orders/new')}
                    className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg shadow transition">
                    <Plus size={18} /> New Order
                </button>
            </div>

            {/* Summary Strip */}
            <div className="grid grid-cols-4 gap-4 mb-6">
                {[
                    { label: 'Released', value: byStatus('Released'), icon: <PlayCircle size={18} className="text-blue-500" />, bg: 'bg-blue-50 dark:bg-blue-900/20' },
                    { label: 'In Progress', value: byStatus('InProgress'), icon: <Clock size={18} className="text-amber-500" />, bg: 'bg-amber-50 dark:bg-amber-900/20' },
                    { label: 'Completed', value: byStatus('Completed'), icon: <CheckCircle2 size={18} className="text-emerald-500" />, bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
                    { label: 'Cancelled', value: byStatus('Cancelled'), icon: <XCircle size={18} className="text-red-500" />, bg: 'bg-red-50 dark:bg-red-900/20' },
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
                        <input id="search-orders" type="text" placeholder="Search by order no or product…"
                            value={search} onChange={e => setSearch(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 text-sm border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-amber-500" />
                    </div>
                    <span className="text-sm text-gray-400">{filtered.length} order(s)</span>
                </div>
                <div className="flex-1 overflow-auto">
                    {loading ? (
                        <div className="flex justify-center items-center h-40">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600" />
                        </div>
                    ) : (
                        <table className="dense-table w-full">
                            <thead className="bg-gray-50 dark:bg-gray-900 sticky top-0">
                                <tr>
                                    {['Order No', 'Product', 'Planned Qty', 'Produced Qty', 'Planned Date', 'Status', ''].map(h => (
                                        <th key={h} className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400 border-b dark:border-gray-700">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                {filtered.map(o => (
                                    <tr key={o.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors"
                                        onClick={() => navigate(`/manufacturing/orders/${o.id}`)}>
                                        <td className="px-4 py-3 font-mono text-xs text-gray-600 dark:text-gray-400">{o.orderNo}</td>
                                        <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-100">{o.productName}</td>
                                        <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-300">{fmt(o.plannedQty)}</td>
                                        <td className="px-4 py-3 text-right text-emerald-600 dark:text-emerald-400 font-semibold">{fmt(o.producedQty)}</td>
                                        <td className="px-4 py-3 text-gray-500">{o.plannedDate}</td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLOR[o.status] || STATUS_COLOR.Draft}`}>{o.status}</span>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <button onClick={e => { e.stopPropagation(); navigate(`/manufacturing/orders/${o.id}`); }}
                                                className="text-amber-600 hover:text-amber-800 dark:text-amber-400 text-xs font-medium">Open →</button>
                                        </td>
                                    </tr>
                                ))}
                                {filtered.length === 0 && (
                                    <tr><td colSpan={7} className="px-4 py-12 text-center">
                                        <AlertCircle className="mx-auto text-gray-300 mb-2" size={32} />
                                        <p className="text-gray-400">{search ? 'No orders match your search.' : 'No production orders yet.'}</p>
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
