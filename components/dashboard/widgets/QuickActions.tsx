import React from 'react';
import { LucideIcon, ChevronLeft } from 'lucide-react';

export interface QuickAction {
    id: string;
    label: string;
    icon: LucideIcon;
    color: 'indigo' | 'emerald' | 'rose' | 'blue' | 'amber' | 'purple' | 'slate';
    onClick: () => void;
    description?: string;
    badge?: string | number;
}

export interface QuickActionsProps {
    actions: QuickAction[];
    layout?: 'grid' | 'list';
    columns?: 1 | 2 | 3 | 4;
}

const colorClasses: Record<string, string> = {
    indigo: 'hover:bg-indigo-50 hover:border-indigo-200 text-indigo-600',
    emerald: 'hover:bg-emerald-50 hover:border-emerald-200 text-emerald-600',
    rose: 'hover:bg-rose-50 hover:border-rose-200 text-rose-600',
    blue: 'hover:bg-blue-50 hover:border-blue-200 text-blue-600',
    amber: 'hover:bg-amber-50 hover:border-amber-200 text-amber-600',
    purple: 'hover:bg-purple-50 hover:border-purple-200 text-purple-600',
    slate: 'hover:bg-slate-50 hover:border-slate-200 text-slate-600',
};

export const QuickActions: React.FC<QuickActionsProps> = ({
    actions,
    layout = 'grid',
    columns = 2
}) => {
    if (layout === 'list') {
        return (
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                <h3 className="text-lg font-bold text-slate-800 mb-4">إجراءات سريعة</h3>
                <div className="space-y-2">
                    {actions.map(action => {
                        const Icon = action.icon;
                        const colorClass = colorClasses[action.color] || colorClasses.blue;

                        return (
                            <button
                                key={action.id}
                                onClick={action.onClick}
                                className={`w-full text-right flex items-center p-4 bg-white border border-slate-100 rounded-xl shadow-sm transition-all duration-200 group ${colorClass}`}
                            >
                                <div className="p-3 rounded-lg bg-slate-50 group-hover:bg-white group-hover:shadow-sm transition-all mr-0 ml-4">
                                    <Icon size={20} className="text-current" />
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        <h4 className="text-sm font-bold text-slate-700 group-hover:text-slate-900 transition-colors">
                                            {action.label}
                                        </h4>
                                        {action.badge && (
                                            <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs font-bold rounded-full">
                                                {action.badge}
                                            </span>
                                        )}
                                    </div>
                                    {action.description && (
                                        <p className="text-xs text-slate-400 mt-0.5">{action.description}</p>
                                    )}
                                </div>
                                <div className="opacity-0 group-hover:opacity-100 transform translate-x-2 group-hover:translate-x-0 transition-all duration-200">
                                    <ChevronLeft size={16} className="text-slate-400" />
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
            <h3 className="text-lg font-bold text-slate-800 mb-4">إجراءات سريعة</h3>
            <div className={`grid grid-cols-${columns} gap-3`}>
                {actions.map(action => {
                    const Icon = action.icon;
                    const colorClass = colorClasses[action.color] || colorClasses.blue;

                    return (
                        <button
                            key={action.id}
                            onClick={action.onClick}
                            className={`relative flex flex-col items-center justify-center p-6 bg-white border border-slate-100 rounded-xl shadow-sm transition-all duration-200 group ${colorClass} hover:scale-105 active:scale-95`}
                        >
                            {action.badge && (
                                <span className="absolute top-2 left-2 px-2 py-0.5 bg-rose-500 text-white text-xs font-bold rounded-full">
                                    {action.badge}
                                </span>
                            )}
                            <div className="p-4 rounded-xl bg-slate-50 group-hover:bg-white group-hover:shadow-md transition-all mb-3">
                                <Icon size={28} className="text-current" />
                            </div>
                            <h4 className="text-sm font-bold text-slate-700 group-hover:text-slate-900 transition-colors text-center">
                                {action.label}
                            </h4>
                            {action.description && (
                                <p className="text-xs text-slate-400 mt-1 text-center">{action.description}</p>
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
};
