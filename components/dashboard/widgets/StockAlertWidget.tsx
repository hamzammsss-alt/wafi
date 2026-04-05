import React from 'react';
import { AlertTriangle, Package, TrendingDown } from 'lucide-react';

export interface StockAlert {
    id: string;
    item: string;
    current: number;
    min: number;
    status: 'critical' | 'warning' | 'info';
}

export interface StockAlertWidgetProps {
    alerts: StockAlert[];
    onItemClick?: (alert: StockAlert) => void;
}

export const StockAlertWidget: React.FC<StockAlertWidgetProps> = ({ alerts, onItemClick }) => {
    const getStatusColor = (status: string) => {
        switch (status) {
            case 'critical': return { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', icon: 'text-rose-500' };
            case 'warning': return { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', icon: 'text-amber-500' };
            default: return { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', icon: 'text-blue-500' };
        }
    };

    return (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 h-full flex flex-col">
            <div className="flex items-center gap-2 mb-4">
                <AlertTriangle className="text-rose-500" size={20} />
                <h3 className="text-lg font-bold text-slate-800">تنبيهات المخزون</h3>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar">
                {alerts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-slate-400">
                        <Package size={48} className="mb-3 opacity-50" />
                        <p className="text-sm">لا توجد تنبيهات</p>
                    </div>
                ) : (
                    alerts.map(alert => {
                        const colors = getStatusColor(alert.status);
                        const percentage = (alert.current / alert.min) * 100;

                        return (
                            <div
                                key={alert.id}
                                className={`p-4 rounded-xl border ${colors.border} ${colors.bg} cursor-pointer hover:shadow-md transition-all`}
                                onClick={() => onItemClick?.(alert)}
                            >
                                <div className="flex items-start justify-between mb-2">
                                    <div className="flex-1">
                                        <h4 className="text-sm font-bold text-slate-800">{alert.item}</h4>
                                        <p className="text-xs text-slate-500 mt-1">
                                            الحد الأدنى: {alert.min} | الحالي: {alert.current}
                                        </p>
                                    </div>
                                    <TrendingDown className={colors.icon} size={20} />
                                </div>

                                {/* Progress Bar */}
                                <div className="w-full h-2 bg-white rounded-full overflow-hidden">
                                    <div
                                        className={`h-full transition-all duration-500 ${alert.status === 'critical' ? 'bg-rose-500' :
                                                alert.status === 'warning' ? 'bg-amber-500' : 'bg-blue-500'
                                            }`}
                                        style={{ width: `${Math.min(percentage, 100)}%` }}
                                    />
                                </div>

                                <div className="flex justify-between items-center mt-2">
                                    <span className={`text-xs font-bold ${colors.text}`}>
                                        {percentage.toFixed(0)}% من الحد الأدنى
                                    </span>
                                    <span className={`text-xs px-2 py-0.5 rounded-full ${colors.bg} ${colors.text} border ${colors.border}`}>
                                        {alert.status === 'critical' ? 'حرج' : alert.status === 'warning' ? 'تحذير' : 'عادي'}
                                    </span>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};
