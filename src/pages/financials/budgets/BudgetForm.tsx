import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Save, ArrowLeft, Check, Plus, Trash2 } from 'lucide-react';

export interface Budget {
    id?: string;
    fiscal_year: number;
    name: string;
    description?: string;
    status?: string;
    lines: BudgetLine[];
}

export interface BudgetLine {
    id?: string;
    account_id: string;
    account_name?: string;
    period: number;
    amount: number;
    notes?: string;
}

export function BudgetForm() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const isNew = !id || id === 'new';

    const [budget, setBudget] = useState<Budget>({
        fiscal_year: new Date().getFullYear(),
        name: '',
        description: '',
        lines: []
    });

    // Simplification: Not full account lookup, just a mock for UI layout tests
    const [accounts, setAccounts] = useState<any[]>([]);

    useEffect(() => {
        loadAccounts();
        if (!isNew && id) {
            loadBudget(id);
        }
    }, [id, isNew]);

    const loadAccounts = async () => {
        try {
            const accs = await window.electronAPI.getTransactionalAccounts();
            setAccounts(accs);
        } catch (error) {
            console.error(error);
        }
    };

    const loadBudget = async (budgetId: string) => {
        try {
            const data = await window.electronAPI.budgets.get(budgetId);
            if (data) setBudget(data);
        } catch (error) {
            console.error(error);
        }
    };

    const handleSave = async () => {
        try {
            if (isNew) {
                await window.electronAPI.budgets.create(budget);
            } else {
                // Update budget lines not yet implemented in backend, normally we'd do a full upsert
            }
            navigate('/financials/budgets');
        } catch (error) {
            console.error('Failed to save budget', error);
            alert('Save failed: ' + error.message);
        }
    };

    const approveBudget = async () => {
        try {
            if (id) {
                await window.electronAPI.budgets.updateStatus(id, 'APPROVED', 'SYSTEM');
                loadBudget(id);
            }
        } catch (error) {
            console.error(error);
        }
    };

    const addLine = () => {
        setBudget({
            ...budget,
            lines: [...budget.lines, { account_id: '', period: 1, amount: 0, notes: '' }]
        });
    };

    const removeLine = (index: number) => {
        const newLines = [...budget.lines];
        newLines.splice(index, 1);
        setBudget({ ...budget, lines: newLines });
    };

    const updateLine = (index: number, field: string, value: any) => {
        const newLines = [...budget.lines];
        (newLines[index] as any)[field] = value;

        if (field === 'account_id') {
            const acc = accounts.find(a => a.id === value);
            if (acc) newLines[index].account_name = acc.name;
        }

        setBudget({ ...budget, lines: newLines });
    };

    const isReadOnly = budget.status === 'APPROVED' || budget.status === 'POSTED';

    return (
        <div className="flex flex-col h-full bg-gray-50">
            {/* Toolbar */}
            <div className="bg-white border-b px-4 py-3 flex justify-between items-center shadow-sm">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate('/financials/budgets')} className="text-gray-500 hover:bg-gray-100 p-1.5 rounded">
                        <ArrowLeft size={18} />
                    </button>
                    <h1 className="text-lg font-bold text-gray-800">
                        {isNew ? 'New Budget' : `Budget: ${budget.name || id}`}
                    </h1>
                    {!isNew && (
                        <span className={`px-2 py-0.5 text-xs rounded border ${budget.status === 'APPROVED' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-100 text-gray-700 border-gray-200'
                            }`}>
                            {budget.status}
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    {!isReadOnly && (
                        <>
                            <button onClick={handleSave} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded shadow text-sm hover:bg-blue-700">
                                <Save size={16} /> Save
                            </button>
                            {!isNew && (
                                <button onClick={approveBudget} className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white rounded shadow text-sm hover:bg-green-700">
                                    <Check size={16} /> Approve
                                </button>
                            )}
                        </>
                    )}
                </div>
            </div>

            <div className="flex-1 overflow-auto p-4">
                <div className="max-w-4xl mx-auto space-y-6">
                    {/* Header Card */}
                    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                        <div className="grid grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Budget Name</label>
                                <input
                                    type="text"
                                    value={budget.name}
                                    disabled={isReadOnly}
                                    onChange={e => setBudget({ ...budget, name: e.target.value })}
                                    className="w-full px-3 py-2 border rounded focus:ring-1 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Fiscal Year</label>
                                <input
                                    type="number"
                                    value={budget.fiscal_year}
                                    disabled={isReadOnly}
                                    onChange={e => setBudget({ ...budget, fiscal_year: parseInt(e.target.value) || 0 })}
                                    className="w-full px-3 py-2 border rounded focus:ring-1 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
                                />
                            </div>
                            <div className="col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                                <textarea
                                    value={budget.description || ''}
                                    disabled={isReadOnly}
                                    onChange={e => setBudget({ ...budget, description: e.target.value })}
                                    className="w-full px-3 py-2 border rounded focus:ring-1 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
                                    rows={2}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Lines Card */}
                    <div className="bg-white rounded-lg shadow-sm border border-gray-100 flex flex-col">
                        <div className="px-4 py-3 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 rounded-t-lg">
                            <h3 className="font-semibold text-gray-800">Budget Lines (Monthly Period)</h3>
                            {!isReadOnly && (
                                <button onClick={addLine} className="text-blue-600 hover:text-blue-800 flex items-center gap-1 text-sm font-medium">
                                    <Plus size={16} /> Add Line
                                </button>
                            )}
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-gray-50 border-b text-gray-600">
                                    <tr>
                                        <th className="p-3 w-1/3">Account</th>
                                        <th className="p-3 w-24">Month (1-12)</th>
                                        <th className="p-3 w-32">Amount</th>
                                        <th className="p-3">Notes</th>
                                        {!isReadOnly && <th className="p-3 w-12 text-center"></th>}
                                    </tr>
                                </thead>
                                <tbody>
                                    {budget.lines.map((line, idx) => (
                                        <tr key={idx} className="border-b focus-within:bg-blue-50/30 hover:bg-gray-50 transition-colors">
                                            <td className="p-2">
                                                <select
                                                    value={line.account_id}
                                                    disabled={isReadOnly}
                                                    onChange={e => updateLine(idx, 'account_id', e.target.value)}
                                                    className="w-full p-1.5 border-transparent hover:border-gray-300 focus:border-blue-500 rounded bg-transparent focus:bg-white disabled:opacity-75"
                                                >
                                                    <option value="">Select Account...</option>
                                                    {accounts.map(a => (
                                                        <option key={a.id} value={a.id}>{a.code} - {a.name}</option>
                                                    ))}
                                                </select>
                                            </td>
                                            <td className="p-2">
                                                <input
                                                    type="number"
                                                    min="1" max="12"
                                                    value={line.period}
                                                    disabled={isReadOnly}
                                                    onChange={e => updateLine(idx, 'period', parseInt(e.target.value) || 1)}
                                                    className="w-full p-1.5 border-transparent hover:border-gray-300 focus:border-blue-500 rounded bg-transparent focus:bg-white text-center disabled:opacity-75"
                                                />
                                            </td>
                                            <td className="p-2">
                                                <input
                                                    type="number"
                                                    value={line.amount}
                                                    disabled={isReadOnly}
                                                    onChange={e => updateLine(idx, 'amount', parseFloat(e.target.value) || 0)}
                                                    className="w-full p-1.5 border-transparent hover:border-gray-300 focus:border-blue-500 rounded bg-transparent focus:bg-white text-right font-medium disabled:opacity-75"
                                                />
                                            </td>
                                            <td className="p-2">
                                                <input
                                                    type="text"
                                                    value={line.notes || ''}
                                                    disabled={isReadOnly}
                                                    onChange={e => updateLine(idx, 'notes', e.target.value)}
                                                    className="w-full p-1.5 border-transparent hover:border-gray-300 focus:border-blue-500 rounded bg-transparent focus:bg-white disabled:opacity-75"
                                                    placeholder="Optional notes"
                                                />
                                            </td>
                                            {!isReadOnly && (
                                                <td className="p-2 text-center">
                                                    <button onClick={() => removeLine(idx)} className="text-gray-400 hover:text-red-500 p-1 rounded hover:bg-red-50 transition-colors">
                                                        <Trash2 size={16} />
                                                    </button>
                                                </td>
                                            )}
                                        </tr>
                                    ))}
                                    {budget.lines.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="p-6 text-center text-gray-400 italic">
                                                No lines configured. Click "Add Line" to begin.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                        <div className="p-3 bg-gray-50 border-t flex justify-end">
                            <div className="flex items-center gap-4 text-sm">
                                <span className="text-gray-600 font-medium">Total Budget:</span>
                                <span className="text-lg font-bold text-gray-900 border-b border-gray-300 pb-0.5 min-w-[120px] text-right">
                                    {budget.lines.reduce((sum, l) => sum + (l.amount || 0), 0).toLocaleString()}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
