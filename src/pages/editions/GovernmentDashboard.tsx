import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Landmark, ArrowUpRight } from 'lucide-react';

const cards = [
    { label: 'Open Tenders', value: '11' },
    { label: 'Pending Approvals', value: '27' },
    { label: 'Budget Commitment Ratio', value: '68%' },
];

export const GovernmentDashboard: React.FC = () => {
    const navigate = useNavigate();

    return (
        <div className="p-6 h-full overflow-auto bg-slate-50 dark:bg-slate-950">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                    <Landmark size={22} className="text-indigo-600" />
                    Government Edition Dashboard
                </h1>
                <p className="text-sm text-slate-500 mt-1">
                    Public procurement workflow, approval traceability, and commitment oversight.
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
                    onClick={() => navigate('/trade/purchasing/pr')}
                    className="rounded-xl border border-slate-200 bg-white dark:bg-slate-900 p-4 text-left hover:border-indigo-300 transition"
                >
                    <p className="font-semibold text-slate-800 dark:text-slate-100 flex items-center justify-between">
                        Tender Requests
                        <ArrowUpRight size={15} />
                    </p>
                    <p className="text-xs text-slate-500 mt-1">Start and track requisitions through approval tiers.</p>
                </button>

                <button
                    onClick={() => navigate('/approval-inbox')}
                    className="rounded-xl border border-slate-200 bg-white dark:bg-slate-900 p-4 text-left hover:border-indigo-300 transition"
                >
                    <p className="font-semibold text-slate-800 dark:text-slate-100 flex items-center justify-between">
                        Approval Inbox
                        <ArrowUpRight size={15} />
                    </p>
                    <p className="text-xs text-slate-500 mt-1">Review pending approvals with full audit visibility.</p>
                </button>
            </div>
        </div>
    );
};
