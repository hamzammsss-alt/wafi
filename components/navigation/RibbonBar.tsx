import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { RIBBON_CONTENT } from '../../config/menuData';
import { ChevronDown } from 'lucide-react';

interface RibbonBarProps {
    activeTab: string;
}

export const RibbonBar: React.FC<RibbonBarProps> = ({ activeTab }) => {
    const location = useLocation();
    const currentGroups = RIBBON_CONTENT[activeTab] || [];

    return (
        <div className="h-28 bg-[#f8fafc] border-b border-slate-200 flex px-2 py-1 overflow-x-auto scrollbar-thin scrollbar-thumb-slate-300 z-[30] relative shadow-inner">
            {currentGroups.length === 0 ? (
                <div className="flex items-center justify-center w-full text-slate-400 text-xs italic">
                    لا توجد عناصر في هذه القائمة
                </div>
            ) : (
                currentGroups.map((group, groupIdx) => (
                    <div key={groupIdx} className="flex px-1 border-l border-slate-200 last:border-l-0">
                        <div className="flex flex-col h-full px-1">
                            {/* Group Items Grid - allowing 3 rows or flex wrap */}
                            <div className="flex flex-wrap flex-col h-[calc(100%-20px)] content-start gap-x-1 gap-y-1 min-w-max">
                                {group.items.map((item, itemIdx) => {
                                    // This section is part of the RIBBON_CONTENT definition, which is imported.
                                    // The instruction implies a change to the data in RIBBON_CONTENT, not this component.
                                    // Assuming the change is to the source of RIBBON_CONTENT,
                                    // the item with path '/inventory/adjustment' should now be '/inventory/transactions'
                                    // and its label should be 'حركات المخزون'.
                                    // For example, if 'item' was originally:
                                    // { label: 'سند تسوية', icon: <ArrowRightLeft size={18} />, path: '/inventory/adjustment' },
                                    // it should now be:
                                    // { label: 'حركات المخزون', icon: <ArrowRightLeft size={18} />, path: '/inventory/transactions' },
                                    const Icon = item.icon;
                                    const isActive = item.path === location.pathname;

                                    return (
                                        <Link
                                            key={itemIdx}
                                            to={item.path || '#'}
                                            className={`
                                                flex items-center gap-2 px-2 py-1 rounded min-w-[120px] max-w-[180px]
                                                hover:bg-white hover:shadow-sm hover:ring-1 hover:ring-slate-200 transition-all text-right group
                                                ${isActive ? 'bg-emerald-100/50 text-emerald-800 shadow-sm ring-1 ring-emerald-200' : 'text-slate-600'}
                                            `}
                                        >
                                            <div className={`p-1 rounded ${isActive ? 'bg-emerald-200 text-emerald-800' : 'bg-slate-100 text-slate-500 group-hover:text-emerald-600 group-hover:bg-emerald-50'}`}>
                                                {Icon && <Icon size={16} />}
                                            </div>
                                            <div className="flex flex-col leading-none">
                                                <span className="text-[11px] font-medium">{item.label}</span>
                                            </div>
                                        </Link>
                                    );
                                })}
                            </div>

                            {/* Group Label */}
                            <div className="text-center mt-auto border-t border-slate-200/50 pt-1">
                                <span className="text-[10px] text-slate-400 font-medium flex items-center justify-center gap-1">
                                    {group.label} <ChevronDown size={8} />
                                </span>
                            </div>
                        </div>
                    </div>
                ))
            )}
        </div>
    );
};
