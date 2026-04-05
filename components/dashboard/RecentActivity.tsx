
import React from 'react';
import { FileText, User, Settings, CheckCircle, Clock } from 'lucide-react';

interface ActivityItem {
    id: string;
    type: 'invoice' | 'login' | 'system' | 'payment';
    title: string;
    description: string;
    time: string;
    user?: string;
}

export const RecentActivity: React.FC<{ activities: ActivityItem[] }> = ({ activities }) => {

    const getIcon = (type: string) => {
        switch (type) {
            case 'invoice': return <FileText size={16} className="text-blue-500" />;
            case 'login': return <User size={16} className="text-emerald-500" />;
            case 'system': return <Settings size={16} className="text-slate-500" />;
            case 'payment': return <CheckCircle size={16} className="text-green-500" />;
            default: return <Clock size={16} className="text-gray-400" />;
        }
    };

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 h-full overflow-hidden flex flex-col">
            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                <Clock className="text-slate-400" size={20} />
                النشاطات الأخيرة
            </h3>

            <div className="flex-1 overflow-y-auto pr-1 -mr-1 space-y-4 custom-scrollbar">
                {activities.length === 0 ? (
                    <div className="text-center py-10 text-slate-400 text-sm">لا توجد نشاطات حديثة</div>
                ) : (
                    activities.map((item, idx) => (
                        <div key={item.id} className="relative pl-4 border-r-2 border-slate-100 last:border-0 pb-4 last:pb-0 mr-2">
                            <div className="absolute -right-[9px] top-0 bg-white border-2 border-slate-100 rounded-full p-1 z-10">
                                {getIcon(item.type)}
                            </div>
                            <div className="mr-6">
                                <p className="text-sm font-bold text-slate-700">{item.title}</p>
                                <p className="text-xs text-slate-500 mt-1 line-clamp-1">{item.description}</p>
                                <div className="flex items-center gap-2 mt-2">
                                    <span className="text-[10px] bg-slate-50 text-slate-400 px-2 py-0.5 rounded-full font-mono">{item.time}</span>
                                    {item.user && <span className="text-[10px] text-slate-400 flex items-center gap-1"><User size={10} /> {item.user}</span>}
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};
