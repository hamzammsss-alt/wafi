import React from 'react';

export const ProductGrid = () => {
    return (
        <div className="h-full flex flex-col">
            {/* Categories */}
            <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide">
                {['الكل', 'مشروبات', 'وجبات سريعة', 'حلويات', 'عصائر', 'سندويشات', 'مشاوي'].map((cat, i) => (
                    <button key={cat} className={`px-6 py-3 rounded-xl font-bold whitespace-nowrap shadow-sm transition ${i === 0 ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-100'}`}>
                        {cat}
                    </button>
                ))}
            </div>

            {/* Grid */}
            <div className="grid grid-cols-3 xl:grid-cols-4 gap-4 overflow-y-auto pr-1">
                {Array.from({ length: 12 }).map((_, i) => (
                    <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 cursor-pointer hover:border-indigo-500 hover:shadow-md transition group h-40 flex flex-col justify-between relative overflow-hidden">
                        <div className="absolute top-0 right-0 bg-indigo-500 w-16 h-16 rounded-bl-full -mr-8 -mt-8 z-0"></div>
                        <div className="relative z-10">
                            <div className="font-bold text-gray-800 mb-1">برغر دجاج</div>
                            <div className="text-xs text-gray-400">سندويش بخبز البطاطا</div>
                        </div>
                        <div className="font-bold text-indigo-600 text-lg text-left relative z-10 w-full flex justify-between items-end">
                            <span>25.00</span>
                            <div className="bg-indigo-50 p-2 rounded-lg text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition">+</div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
