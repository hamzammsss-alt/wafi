import React, { useState, useEffect } from 'react';
import { Settings, Play, Package, ArrowDown } from 'lucide-react';

export const Production = () => {
    // Tabs: BOM Definition / Production Order
    const [mode, setMode] = useState<'BOM' | 'ORDER'>('ORDER');

    const [boms, setBoms] = useState<any[]>([]);
    const [products, setProducts] = useState<any[]>([]);

    // Production Order Data
    const [order, setOrder] = useState({
        bomId: '',
        quantity: 1,
        date: new Date().toISOString().split('T')[0],
        ref: 'PRD-' + Date.now().toString().slice(-4)
    });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        // @ts-ignore
        if (window.electronAPI) {
            // @ts-ignore
            const bomsData = await window.electronAPI.getBoms();
            // @ts-ignore
            const prodsData = await window.electronAPI.getProducts('');
            setBoms(bomsData);
            setProducts(prodsData);
        }
    };

    const handleProduction = async () => {
        if (!order.bomId) return alert("اختر المعادلة");

        if (confirm(`هل أنت متأكد من إنتاج ${order.quantity} وحدة؟ سيتم خصم المواد الخام فوراً.`)) {
            try {
                // @ts-ignore
                await window.electronAPI.executeProduction({
                    bomId: order.bomId,
                    quantity: Number(order.quantity),
                    date: order.date,
                    refNo: order.ref
                });
                alert("تمت عملية التصنيع بنجاح وتحديث المستودعات!");
                setOrder({ ...order, quantity: 1, ref: 'PRD-' + Date.now().toString().slice(-4) });
            } catch (err: any) {
                alert("خطأ: " + err.message);
            }
        }
    };

    return (
        <div className="flex flex-col h-full bg-[#f0f2f5] p-4">
            <h1 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                <Settings className="text-orange-600" /> التصنيع والإنتاج
            </h1>

            {/* Tabs */}
            <div className="flex gap-4 mb-6 border-b border-gray-300">
                <button
                    onClick={() => setMode('ORDER')}
                    className={`pb-2 px-4 font-bold ${mode === 'ORDER' ? 'text-orange-600 border-b-2 border-orange-600' : 'text-gray-500'}`}
                >
                    أمر إنتاج (تطبيق)
                </button>
                <button
                    onClick={() => setMode('BOM')}
                    className={`pb-2 px-4 font-bold ${mode === 'BOM' ? 'text-orange-600 border-b-2 border-orange-600' : 'text-gray-500'}`}
                >
                    تعريف معادلة (وصفة)
                </button>
            </div>

            {mode === 'ORDER' ? (
                <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-200 max-w-2xl mx-auto">
                    <div className="flex items-center justify-center mb-8">
                        <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center text-orange-600">
                            <Package size={32} />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6 mb-8">
                        <div className="col-span-2">
                            <label className="block text-sm font-bold text-gray-600 mb-2">معادلة التصنيع (المنتج)</label>
                            <select
                                value={order.bomId}
                                onChange={e => setOrder({ ...order, bomId: e.target.value })}
                                className="w-full border border-gray-300 rounded p-2 text-lg"
                            >
                                <option value="">-- اختر ماذا تريد أن تصنع --</option>
                                {boms.map(b => (
                                    <option key={b.id} value={b.id}>{b.product_name} ({b.name})</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-600 mb-2">رقم الأمر</label>
                            <input type="text" value={order.ref} readOnly className="w-full bg-gray-100 border border-gray-300 rounded p-2 text-center font-mono" />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-600 mb-2">التاريخ</label>
                            <input type="date" value={order.date} onChange={e => setOrder({ ...order, date: e.target.value })} className="w-full border border-gray-300 rounded p-2" />
                        </div>

                        <div className="col-span-2 bg-orange-50 p-4 rounded border border-orange-100 flex items-center gap-4">
                            <div className="flex-1">
                                <label className="block text-sm font-bold text-gray-600 mb-1">الكمية المراد إنتاجها</label>
                                <input
                                    type="number"
                                    value={order.quantity}
                                    onChange={e => setOrder({ ...order, quantity: Number(e.target.value) })}
                                    className="w-full border border-orange-300 rounded p-3 text-2xl font-bold text-center text-orange-700"
                                />
                            </div>
                            <ArrowDown className="text-orange-400 mt-6" />
                            <div className="flex-1">
                                <p className="text-xs text-gray-500 mb-1">النتيجة المتوقعة</p>
                                <div className="text-sm font-bold text-gray-700">
                                    سيتم إضافة <span className="text-orange-600 text-lg">{order.quantity}</span> وحدة للمخزون
                                </div>
                                <div className="text-xs text-red-500 mt-1">
                                    وسيتم خصم المواد الخام تلقائياً
                                </div>
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={handleProduction}
                        className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-4 rounded-lg flex items-center justify-center gap-2 shadow-lg transition transform hover:scale-[1.02]"
                    >
                        <Play size={24} />
                        <span>تنفيذ الإنتاج</span>
                    </button>
                </div>
            ) : (
                <div className="text-center py-20 bg-white rounded border border-dashed border-gray-300">
                    <p className="text-gray-400">شاشة تعريف المعادلة (BOM Builder) - يمكن إضافتها هنا بنفس منطق فاتورة المبيعات</p>
                    <p className="text-sm text-gray-300 mt-2">(جدول لإضافة المواد الخام والكميات المطلوبة لكل وحدة)</p>
                    <div className="mt-4 p-4 bg-yellow-50 text-yellow-800 text-sm rounded inline-block">
                        حالياً يجب إضافة المعادلات يدوياً في قاعدة البيانات أو عبر أداة مساعدة، وسيتم تفعيل هذه الشاشة قريباً.
                    </div>
                </div>
            )}
        </div>
    );
};
