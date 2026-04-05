import React, { useState, useEffect } from 'react';
import {
    Search, Scan, ShoppingCart, Trash2, Plus, Minus, CreditCard, Banknote,
    PauseCircle, RotateCcw, User, Tag, ChevronRight
} from 'lucide-react';

export const POS = () => {
    const [cart, setCart] = useState<any[]>([]);
    const [activeCategory, setActiveCategory] = useState("all");
    const [searchTerm, setSearchTerm] = useState("");

    // Mock Data
    const categories = [
        { id: "all", name: "الكل" },
        { id: "drinks", name: "مشروبات" },
        { id: "meals", name: "وجبات" },
        { id: "snacks", name: "تسالي" },
        { id: "electronics", name: "إلكترونيات" },
    ];

    const products = [
        { id: 1, name: "بيبسي علب 330 مل", price: 3.5, category: "drinks", image: "🥤" },
        { id: 2, name: "برجر دجاج وجبة", price: 25, category: "meals", image: "🍔" },
        { id: 3, name: "بطاطس شيبس عائلي", price: 5, category: "snacks", image: "🍟" },
        { id: 4, name: "مياه معدنية صغيرة", price: 1.5, category: "drinks", image: "💧" },
        { id: 5, name: "شاورما عربي دبل", price: 30, category: "meals", image: "🌯" },
        { id: 6, name: "شاحن آيفون أصلي", price: 80, category: "electronics", image: "🔌" },
        { id: 7, name: "قهوة باردة", price: 12, category: "drinks", image: "🧊" },
        { id: 8, name: "بيتزا خضار وسط", price: 40, category: "meals", image: "🍕" },
    ];

    const filteredProducts = products.filter(p =>
        (activeCategory === "all" || p.category === activeCategory) &&
        p.name.includes(searchTerm)
    );

    const addToCart = (product: any) => {
        setCart(prev => {
            const existing = prev.find(item => item.id === product.id);
            if (existing) {
                return prev.map(item => item.id === product.id ? { ...item, qty: item.qty + 1 } : item);
            }
            return [...prev, { ...product, qty: 1 }];
        });
    };

    const updateQty = (id: number, delta: number) => {
        setCart(prev => prev.map(item => {
            if (item.id === id) {
                const newQty = Math.max(1, item.qty + delta);
                return { ...item, qty: newQty };
            }
            return item;
        }));
    };

    const removeFromCart = (id: number) => {
        setCart(prev => prev.filter(item => item.id !== id));
    };

    const totalAmount = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    const tax = totalAmount * 0.16; // 16% Tax example

    return (
        <div className="h-full flex gap-4 p-4 bg-slate-100 overflow-hidden font-sans">

            {/* LEFT: CART SECTION */}
            <div className="w-[400px] flex flex-col bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden shrink-0">
                {/* Cart Header */}
                <div className="p-4 bg-slate-800 text-white flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <ShoppingCart size={20} className="text-emerald-400" />
                        <h2 className="font-bold">سلة المشتريات</h2>
                    </div>
                    <div className="bg-slate-700 px-3 py-1 rounded-full text-xs flex items-center gap-2 cursor-pointer hover:bg-slate-600">
                        <User size={12} />
                        <span>زبون نقدي</span>
                        <ChevronRight size={12} />
                    </div>
                </div>

                {/* Cart Items List */}
                <div className="flex-1 overflow-y-auto p-2 space-y-2 bg-slate-50">
                    {cart.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-50">
                            <Scan size={48} className="mb-2" />
                            <p>امسح الباركود أو اختر صنفاً</p>
                        </div>
                    ) : (
                        cart.map(item => (
                            <div key={item.id} className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm flex justify-between items-center group">
                                <div className="flex flex-col">
                                    <span className="font-bold text-slate-800 text-sm">{item.name}</span>
                                    <span className="text-xs text-slate-500 font-mono">{item.price.toFixed(2)} ILS</span>
                                </div>

                                <div className="flex items-center gap-3 bg-slate-100 rounded-lg p-1">
                                    <button onClick={() => updateQty(item.id, -1)} className="p-1 hover:bg-white hover:text-red-500 rounded-md transition-colors"><Minus size={14} /></button>
                                    <span className="font-bold text-sm w-4 text-center">{item.qty}</span>
                                    <button onClick={() => updateQty(item.id, 1)} className="p-1 hover:bg-white hover:text-emerald-500 rounded-md transition-colors"><Plus size={14} /></button>
                                </div>

                                <div className="text-right w-16">
                                    <div className="font-bold text-slate-800">{(item.price * item.qty).toFixed(2)}</div>
                                </div>

                                <button onClick={() => removeFromCart(item.id)} className="text-slate-300 hover:text-red-500 p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        ))
                    )}
                </div>

                {/* Cart Footer & Totals */}
                <div className="bg-white border-t border-slate-200 p-4 shadow-[0_-5px_15px_rgba(0,0,0,0.05)] z-10">
                    <div className="space-y-2 mb-4">
                        <div className="flex justify-between text-sm text-slate-500">
                            <span>المجموع الفرعي</span>
                            <span>{totalAmount.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm text-slate-500">
                            <span>الضريبة (16%)</span>
                            <span>{tax.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-xl font-black text-slate-800 border-t border-slate-100 pt-2">
                            <span>الإجمالي</span>
                            <span className="text-emerald-600">{(totalAmount + tax).toFixed(2)} ILS</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                        <button className="bg-emerald-600 hover:bg-emerald-700 text-white py-4 rounded-xl font-bold flex flex-col items-center justify-center gap-1 transition-transform active:scale-95 shadow-lg shadow-emerald-200">
                            <Banknote size={24} />
                            <span>دفع نقدي (F12)</span>
                        </button>
                        <div className="grid grid-cols-2 gap-2">
                            <button className="bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-xl font-bold flex flex-col items-center justify-center gap-1 text-xs">
                                <CreditCard size={18} />
                                بطاقة
                            </button>
                            <button className="bg-orange-500 hover:bg-orange-600 text-white py-2 rounded-xl font-bold flex flex-col items-center justify-center gap-1 text-xs">
                                <PauseCircle size={18} />
                                تعليق
                            </button>
                            <button
                                onClick={() => setCart([])}
                                className="bg-red-50 hover:bg-red-100 text-red-600 py-2 rounded-xl font-bold flex flex-col items-center justify-center gap-1 text-xs col-span-2 border border-red-100"
                            >
                                <RotateCcw size={18} />
                                إلغاء
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* RIGHT: CATALOG SECTION */}
            <div className="flex-1 flex flex-col gap-4 overflow-hidden min-w-0">

                {/* Top Bar: Search & Categories */}
                <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-200 flex flex-col gap-3 shrink-0">
                    <div className="relative">
                        <Search className="absolute top-3 right-3 text-slate-400" size={20} />
                        <input
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pr-10 pl-4 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                            placeholder="بحث عن منتج (اسم / باركود)..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        <button className="absolute top-2 left-2 bg-slate-200 p-1 rounded-lg text-slate-600 hover:text-indigo-600">
                            <Scan size={18} />
                        </button>
                    </div>

                    <div className="flex gap-2 overflow-x-auto pb-1 custom-scrollbar">
                        {categories.map(cat => (
                            <button
                                key={cat.id}
                                onClick={() => setActiveCategory(cat.id)}
                                className={`px-6 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all border
                       ${activeCategory === cat.id
                                        ? 'bg-slate-800 text-white border-slate-800 shadow-md transform scale-105'
                                        : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}
                            >
                                {cat.name}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Product Grid */}
                <div className="flex-1 overflow-y-auto bg-white rounded-2xl shadow-sm border border-slate-200 p-4">
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                        {filteredProducts.map(p => (
                            <button
                                key={p.id}
                                onClick={() => addToCart(p)}
                                className="flex flex-col items-center bg-slate-50 hover:bg-emerald-50 border border-slate-100 hover:border-emerald-200 rounded-xl p-4 transition-all hover:-translate-y-1 hover:shadow-md group h-40 justify-between"
                            >
                                <div className="text-4xl mb-2 group-hover:scale-110 transition-transform">{p.image}</div>
                                <div className="text-center w-full">
                                    <h3 className="font-bold text-slate-700 text-sm line-clamp-2 leading-tight">{p.name}</h3>
                                    <span className="text-emerald-600 font-bold block mt-1">{p.price.toFixed(2)}</span>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

        </div>
    );
};
