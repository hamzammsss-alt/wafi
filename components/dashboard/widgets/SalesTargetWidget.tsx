import React from 'react';
import { Target, TrendingUp, MoreHorizontal } from 'lucide-react';

export interface SalesTarget {
    label: string;
    achieved: number;
    goal: number;
    percentage: number;
}

export interface SalesTargetWidgetProps {
    targets: SalesTarget[];
    title?: string;
}

export const SalesTargetWidget: React.FC<SalesTargetWidgetProps> = ({
    targets,
    title = 'المستهدف الشهري'
}) => {
    return (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 h-full flex flex-col">
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-2">
                    <Target className="text-indigo-500" size={20} />
                    <h3 className="text-lg font-bold text-slate-800">{title}</h3>
                </div>
                <button className="p-1 hover:bg-slate-100 rounded-lg transition-colors">
                    <MoreHorizontal size={20} className="text-slate-400" />
                </button>
            </div>

            <div className="space-y-6 flex-1">
                {targets.map((target, idx) => {
                    const isComplete = target.percentage >= 100;
                    const isOnTrack = target.percentage >= 70;

                    return (
                        <div key={idx}>
                            <div className="flex justify-between text-sm mb-2">
                                <span className="font-bold text-slate-700">{target.label}</span>
                                <span className="text-slate-500">
                                    {target.achieved.toLocaleString('ar-EG')} / {target.goal.toLocaleString('ar-EG')}
                                </span>
                            </div>

                            {/* Progress Bar */}
                            <div className="relative h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                                <div
                                    className={`h-full rounded-full transition-all duration-1000 ${isComplete ? 'bg-emerald-500' :
                                            isOnTrack ? 'bg-indigo-500' : 'bg-amber-500'
                                        }`}
                                    style={{ width: `${Math.min(target.percentage, 100)}%` }}
                                >
                                    {/* Shimmer effect */}
                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
                                </div>
                            </div>

                            <div className="flex justify-between items-center mt-2">
                                <span className={`text-xs font-bold ${isComplete ? 'text-emerald-600' :
                                        isOnTrack ? 'text-indigo-600' : 'text-amber-600'
                                    }`}>
                                    {target.percentage.toFixed(0)}% محقق
                                </span>

                                {isComplete && (
                                    <div className="flex items-center gap-1 text-xs text-emerald-600">
                                        <TrendingUp size={14} />
                                        <span className="font-bold">مكتمل!</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Summary */}
            <div className="mt-6 pt-6 border-t border-slate-100">
                <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-600">الإجمالي المحقق</span>
                    <span className="text-lg font-bold text-slate-800">
                        {targets.reduce((sum, t) => sum + t.achieved, 0).toLocaleString('ar-EG')}
                    </span>
                </div>
                <div className="flex justify-between items-center mt-2">
                    <span className="text-sm text-slate-600">الهدف الإجمالي</span>
                    <span className="text-lg font-bold text-slate-800">
                        {targets.reduce((sum, t) => sum + t.goal, 0).toLocaleString('ar-EG')}
                    </span>
                </div>
            </div>
        </div>
    );
};
