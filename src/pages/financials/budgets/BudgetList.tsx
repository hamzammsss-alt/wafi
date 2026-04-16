import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, FileText } from 'lucide-react';

export function BudgetList() {
    const [budgets, setBudgets] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        loadBudgets();
    }, []);

    const loadBudgets = async () => {
        try {
            setLoading(true);
            const data = await window.electronAPI.budgets.list();
            setBudgets(data);
        } catch (error) {
            console.error('Failed to load budgets', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredBudgets = budgets.filter(b =>
        (b.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (b.fiscal_year?.toString() || '').includes(searchTerm)
    );

    return (
        <div className="p-6 h-full flex flex-col bg-gray-50">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Budgets</h1>
                    <p className="text-gray-500 text-sm mt-1">Manage financial budgets and forecasts</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => navigate('/financials/budgets/new')}
                        className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded shadow hover:bg-blue-700"
                    >
                        <Plus size={18} />
                        New Budget
                    </button>
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow flex-1 flex flex-col overflow-hidden">
                <div className="p-4 border-b dark:border-gray-700">
                    <div className="relative w-64">
                        <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search budgets..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-auto">
                    {loading ? (
                        <div className="flex justify-center items-center h-32">
                            <span className="text-gray-500">Loading budgets...</span>
                        </div>
                    ) : (
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-gray-50 dark:bg-gray-900 sticky top-0">
                                <tr>
                                    <th className="p-3 border-b font-medium text-gray-600 dark:text-gray-400">Name</th>
                                    <th className="p-3 border-b font-medium text-gray-600 dark:text-gray-400">Fiscal Year</th>
                                    <th className="p-3 border-b font-medium text-gray-600 dark:text-gray-400">Status</th>
                                    <th className="p-3 border-b font-medium text-gray-600 dark:text-gray-400">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredBudgets.map((budget) => (
                                    <tr key={budget.id} className="border-b hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                        <td className="p-3 text-gray-800 dark:text-gray-200">{budget.name}</td>
                                        <td className="p-3 text-gray-600 dark:text-gray-400">{budget.fiscal_year}</td>
                                        <td className="p-3">
                                            <span className={`px-2 py-1 rounded text-xs font-medium ${budget.status === 'APPROVED' ? 'bg-green-100 text-green-700' :
                                                    budget.status === 'POSTED' ? 'bg-blue-100 text-blue-700' :
                                                        'bg-yellow-100 text-yellow-700'
                                                }`}>
                                                {budget.status || 'DRAFT'}
                                            </span>
                                        </td>
                                        <td className="p-3">
                                            <button
                                                onClick={() => navigate(`/financials/budgets/${budget.id}`)}
                                                className="text-blue-600 hover:text-blue-800 dark:text-blue-400 flex items-center gap-1"
                                            >
                                                <FileText size={16} /> Open
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {filteredBudgets.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="p-6 text-center text-gray-500">
                                            No budgets found. Create one to get started.
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
