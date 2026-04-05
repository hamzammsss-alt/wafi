import React from 'react';
import { Search, User, Menu, ScanBarcode } from 'lucide-react';
import { ProductGrid } from './components/ProductGrid';
import { CartPanel } from './components/CartPanel';

export const POSInterface = () => {
    return (
        <div className="h-full bg-gray-100 flex flex-col overflow-hidden" dir="rtl">
            {/* Top Bar */}
            <div className="bg-white px-4 py-3 shadow-sm border-b flex justify-between items-center z-10">
                <div className="flex items-center gap-4 flex-1">
                    <div className="bg-indigo-600 text-white font-bold px-3 py-1 rounded text-sm">POS-01</div>
                    <div className="relative flex-1 max-w-lg">
                        <input type="text" className="w-full bg-gray-100 border-none rounded-lg py-2 pr-10 pl-4 focus:ring-2 focus:ring-indigo-500 transition" placeholder="ابحث عن صنف (باركود / اسم)... F3" autoFocus />
                        <ScanBarcode className="absolute top-2.5 right-3 text-gray-400" size={18} />
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded-lg text-sm font-bold text-gray-700 transition">
                        <User size={18} /> عميل نقدي
                    </button>
                    <button className="p-2 hover:bg-gray-100 rounded-lg"><Menu /></button>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex gap-4 p-4 overflow-hidden">
                {/* Left Side (Products) */}
                <div className="flex-1 overflow-hidden">
                    <ProductGrid />
                </div>

                {/* Right Side (Cart) */}
                <div className="w-[400px] flex-shrink-0">
                    <CartPanel />
                </div>
            </div>
        </div>
    );
};
