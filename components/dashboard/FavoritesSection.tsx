
import React, { useState } from 'react';
import { Star, Plus, X, Search } from 'lucide-react';
import { Link } from 'react-router-dom';

interface FavoriteItem {
    id: string;
    label: string;
    path: string;
    icon?: any; // Just for display if we map it
}

export const FavoritesSection: React.FC<{ favorites: FavoriteItem[], onRemove: (id: string) => void, onAdd: () => void }> = ({ favorites, onRemove, onAdd }) => {

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 flex flex-col h-full">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <Star className="text-amber-500 fill-amber-500" size={20} />
                    المفضلة
                </h3>
                <button
                    onClick={onAdd}
                    className="p-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-500 transition-colors"
                    title="إضافة للمفضلة"
                >
                    <Plus size={16} />
                </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {favorites.map(fav => (
                    <div key={fav.id} className="group relative">
                        <Link
                            to={fav.path}
                            className="flex flex-col items-center justify-center p-4 bg-slate-50 border border-slate-100 rounded-xl hover:bg-white hover:shadow-md hover:border-blue-200 transition-all duration-300 h-24 text-center"
                        >
                            <span className="text-sm font-bold text-slate-700 group-hover:text-blue-600 transition-colors">{fav.label}</span>
                        </Link>
                        <button
                            onClick={(e) => { e.preventDefault(); onRemove(fav.id); }}
                            className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 p-1 bg-white rounded-full text-slate-400 hover:text-red-500 shadow-sm border border-slate-100 transition-all transform scale-75 hover:scale-100"
                        >
                            <X size={12} />
                        </button>
                    </div>
                ))}

                {favorites.length === 0 && (
                    <div className="col-span-full border-2 border-dashed border-slate-200 rounded-xl p-6 flex flex-col items-center justify-center text-slate-400">
                        <Star size={24} className="mb-2 opacity-50" />
                        <p className="text-sm">لا توجد عناصر في المفضلة</p>
                        <button onClick={onAdd} className="text-xs text-blue-600 font-bold mt-2 hover:underline">أضف عناصر</button>
                    </div>
                )}
            </div>
        </div>
    );
};
