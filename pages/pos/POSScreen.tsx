
import React, { useState } from 'react';
import { ShoppingCart, Search, Home, CreditCard, Trash2, Plus, Minus, Euro } from 'lucide-react';

export const POSScreen = () => {
    const [cart, setCart] = useState<any[]>([]);
    const [activeCategory, setActiveCategory] = useState<number | null>(null);

    const categories = [
        { id: 1, name: 'مشروبات' }, { id: 2, name: 'وجبات' }, { id: 3, name: 'حلويات' }, { id: 4, name: 'إضافات' }
    ];

    const products = [
        { id: 101, catId: 1, name: 'كوكا كولا', price: 3 },
        { id: 102, catId: 1, name: 'ماء معدني', price: 1 },
        { id: 103, catId: 2, name: 'برغر دجاج', price: 15 },
        { id: 104, catId: 2, name: 'شاورما', price: 18 },
        { id: 105, catId: 3, name: 'كنافة', price: 12 },
    ];

    const addToCart = (product: any) => {
        const existing = cart.find(x => x.id === product.id);
        if (existing) {
            setCart(cart.map(x => x.id === product.id ? { ...x, qty: x.qty + 1 } : x));
        } else {
            setCart([...cart, { ...product, qty: 1 }]);
        }
    };

    const updateQty = (id: number, delta: number) => {
        setCart(cart.map(x => {
            if (x.id === id) return { ...x, qty: Math.max(1, x.qty + delta) };
            return x;
        }));
    };

    const total = cart.reduce((acc, item) => acc + (item.price * item.qty), 0);

    return (
        <div className="flex h-screen bg-gray-100 overflow-hidden" dir="rtl">
            {/* Left: Cart */}
            <div className="w-1/3 bg-white border-l shadow-xl flex flex-col z-10">
                <div className="p-4 bg-emerald-600 text-white flex justify-between items-center shadow-md">
                    <h2 className="font-bold text-lg flex items-center gap-2">
                        <ShoppingCart /> الفاتورة الحالية
                    </h2>
                    <span className="bg-emerald-800 px-3 py-1 rounded-full text-sm">#POS-001</span>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {cart.length === 0 ? (
                        <div className="text-gray-400 text-center mt-20">عربة التسوق فارغة</div>
                    ) : (
                        cart.map(item => (
                            <div key={item.id} className="flex justify-between items-center border-b pb-2">
                                <div>
                                    <div className="font-bold text-gray-800">{item.name}</div>
                                    <div className="text-sm text-gray-500">{item.price} x {item.qty}</div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center border rounded">
                                        <button onClick={() => updateQty(item.id, -1)} className="p-1 hover:bg-gray-100"><Minus size={14} /></button>
                                        <span className="w-8 text-center font-bold text-sm">{item.qty}</span>
                                        <button onClick={() => updateQty(item.id, 1)} className="p-1 hover:bg-gray-100"><Plus size={14} /></button>
                                    </div>
                                    <div className="font-bold w-12 text-left">{(item.price * item.qty).toFixed(0)}</div>
                                    <button onClick={() => setCart(cart.filter(x => x.id !== item.id))} className="text-red-400 hover:text-red-600"><Trash2 size={16} /></button>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                <div className="p-4 bg-gray-50 border-t">
                    <div className="flex justify-between items-center text-xl font-bold mb-4">
                        <span>المجموع الكلي</span>
                        <span className="text-emerald-600 text-2xl">{total.toFixed(2)}</span>
                    </div>
                    <button className="w-full bg-emerald-600 text-white py-4 rounded-lg font-bold text-xl hover:bg-emerald-700 shadow-lg flex justify-center items-center gap-2">
                        <CreditCard /> دفع وإصدار (F12)
                    </button>
                </div>
            </div>

            {/* Right: Catalog */}
            <div className="flex-1 flex flex-col relative">
                {/* Header */}
                <div className="h-16 bg-white border-b flex items-center px-6 justify-between">
                    <div className="relative w-96">
                        <Search className="absolute right-3 top-3 text-gray-400" size={20} />
                        <input className="w-full pr-10 pl-4 py-2 bg-gray-100 rounded-full border-none focus:ring-2 ring-emerald-500" placeholder="بحث عن صنف أو باركود..." />
                    </div>
                </div>

                {/* Categories */}
                <div className="p-4 flex gap-3 overflow-x-auto">
                    <button
                        onClick={() => setActiveCategory(null)}
                        className={`px-6 py-3 rounded-xl font-bold shadow-sm whitespace-nowrap transition-all ${activeCategory === null ? 'bg-gray-800 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                    >
                        الكل
                    </button>
                    {categories.map(c => (
                        <button
                            key={c.id}
                            onClick={() => setActiveCategory(c.id)}
                            className={`px-6 py-3 rounded-xl font-bold shadow-sm whitespace-nowrap transition-all ${activeCategory === c.id ? 'bg-emerald-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                        >
                            {c.name}
                        </button>
                    ))}
                </div>

                {/* Products Grid */}
                <div className="flex-1 p-4 overflow-y-auto grid grid-cols-2md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 content-start">
                    {products.filter(p => !activeCategory || p.catId === activeCategory).map(p => (
                        <button
                            key={p.id}
                            onClick={() => addToCart(p)}
                            className="bg-white p-4 rounded-2xl shadow-sm hover:shadow-lg transition-all border border-transparent hover:border-emerald-500 flex flex-col items-center text-center h-32 justify-center group"
                        >
                            <span className="font-bold text-gray-800 text-lg group-hover:text-emerald-700">{p.name}</span>
                            <span className="mt-2 bg-emerald-100 text-emerald-800 px-2 py-1 rounded text-sm font-bold">{p.price}</span>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};
