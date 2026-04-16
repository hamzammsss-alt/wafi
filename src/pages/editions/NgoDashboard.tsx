import React from 'react';
import { useNavigate } from 'react-router-dom';
import { HandHeart, ArrowUpRight } from 'lucide-react';

const cards = [
    { label: 'Active Projects', value: '18' },
    { label: 'Donor Reports Due', value: '5' },
    { label: 'Grant Budget Utilization', value: '74%' },
];

export const NgoDashboard: React.FC = () => {
    const navigate = useNavigate();

    return (
        <div className="p-6 h-full overflow-auto bg-slate-50 dark:bg-slate-950">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                    <HandHeart size={22} className="text-emerald-600" />
                    NGO Edition Dashboard
                </h1>
                <p className="text-sm text-slate-500 mt-1">
                    Program controls, donor compliance cadence, and grant execution visibility.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                {cards.map((c) => (
                    <div key={c.label} className="rounded-xl border border-slate-200 bg-white dark:bg-slate-900 p-4 shadow-sm">
                        <p className="text-xs text-slate-500">{c.label}</p>
                        <p className="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-1">{c.value}</p>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                    onClick={() => navigate('/gl/budgets')}
                    className="rounded-xl border border-slate-200 bg-white dark:bg-slate-900 p-4 text-left hover:border-emerald-300 transition"
                >
                    <p className="font-semibold text-slate-800 dark:text-slate-100 flex items-center justify-between">
                        Project Budgets
                        <ArrowUpRight size={15} />
                    </p>
                    <p className="text-xs text-slate-500 mt-1">Track grant lines vs spending by program cycle.</p>
                </button>

                <button
                    onClick={() => navigate('/reports/financial/partner-ledger')}
                    className="rounded-xl border border-slate-200 bg-white dark:bg-slate-900 p-4 text-left hover:border-emerald-300 transition"
                >
                    <p className="font-semibold text-slate-800 dark:text-slate-100 flex items-center justify-between">
                        Donor Ledger
                        <ArrowUpRight size={15} />
                    </p>
                    <p className="text-xs text-slate-500 mt-1">Review donor balances and disbursement movements.</p>
                </button>
            </div>
        </div>
    );
};
