import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Compass, ArrowRight } from 'lucide-react';
import { VERTICAL_APPS } from '../../constants/verticalApps';
import { useEdition } from '../../hooks/useEdition';

export const VerticalAppsHub: React.FC = () => {
    const navigate = useNavigate();
    const { edition } = useEdition();

    const apps = VERTICAL_APPS.filter((app) => app.editions.includes(edition));

    return (
        <div className="p-6 h-full overflow-auto bg-slate-50 dark:bg-slate-950">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                    <Compass size={22} className="text-emerald-600" />
                    Vertical Apps Hub
                </h1>
                <p className="text-sm text-slate-500 mt-1">
                    Industry-specific modules available for the active edition.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {apps.map((app) => (
                    <button
                        key={app.id}
                        onClick={() => navigate(app.targetPath)}
                        className="text-left rounded-xl border border-slate-200 bg-white dark:bg-slate-900 p-5 shadow-sm hover:border-emerald-300 transition"
                    >
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="font-semibold text-slate-800 dark:text-slate-100">{app.name}</h3>
                            <ArrowRight size={16} className="text-slate-400" />
                        </div>
                        <p className="text-sm text-slate-500">{app.description}</p>
                        <p className="text-xs text-emerald-700 mt-3">{app.targetPath}</p>
                    </button>
                ))}
            </div>
        </div>
    );
};
