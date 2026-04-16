import React from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Layers, ShieldCheck, Sparkles } from 'lucide-react';
import { AppEdition, getEditionProfiles } from '../../lib/edition';
import { useEdition } from '../../hooks/useEdition';

export const EditionSettings: React.FC = () => {
    const navigate = useNavigate();
    const { edition, profile, setEdition } = useEdition();
    const profiles = getEditionProfiles();

    const handleSelect = (next: AppEdition) => {
        setEdition(next);
    };

    return (
        <div className="p-6 h-full overflow-auto bg-slate-50 dark:bg-slate-950">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                    <Layers className="text-emerald-600" size={22} />
                    Edition Manager
                </h1>
                <p className="text-sm text-slate-500 mt-1">
                    Configure product edition behavior for NGO, Government, or Standard deployments.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                {profiles.map((p) => {
                    const active = p.id === edition;
                    return (
                        <button
                            key={p.id}
                            onClick={() => handleSelect(p.id)}
                            className={`text-left rounded-xl border p-4 shadow-sm transition ${active
                                ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                                : 'border-slate-200 bg-white dark:bg-slate-900 hover:border-emerald-300'
                                }`}
                        >
                            <div className="flex items-center justify-between mb-2">
                                <span className="font-semibold text-slate-800 dark:text-slate-100">{p.label}</span>
                                {active && <CheckCircle2 size={18} className="text-emerald-600" />}
                            </div>
                            <p className="text-xs text-slate-500">{p.description}</p>
                        </button>
                    );
                })}
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm mb-6">
                <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2 flex items-center gap-2">
                    <ShieldCheck size={16} className="text-indigo-600" />
                    Active Edition
                </h2>
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{profile.label}</p>
                <p className="text-sm text-slate-500 mt-1">{profile.description}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                    onClick={() => navigate('/editions/ngo')}
                    className="rounded-xl border border-slate-200 bg-white dark:bg-slate-900 p-4 text-left hover:border-emerald-300 transition"
                >
                    <p className="font-semibold text-slate-800 dark:text-slate-100">NGO Operations Dashboard</p>
                    <p className="text-xs text-slate-500 mt-1">Program-level budget and donor delivery workflows.</p>
                </button>

                <button
                    onClick={() => navigate('/editions/government')}
                    className="rounded-xl border border-slate-200 bg-white dark:bg-slate-900 p-4 text-left hover:border-emerald-300 transition"
                >
                    <p className="font-semibold text-slate-800 dark:text-slate-100">Government Operations Dashboard</p>
                    <p className="text-xs text-slate-500 mt-1">Tender-led procurement and compliance checkpoints.</p>
                </button>
            </div>

            <button
                onClick={() => navigate('/vertical/apps')}
                className="mt-4 inline-flex items-center gap-2 text-sm text-emerald-700 hover:text-emerald-800"
            >
                <Sparkles size={14} />
                Open Vertical Apps Hub
            </button>
        </div>
    );
};
