import React, { useState, useEffect } from 'react';
import { Play, Clipboard, CheckCircle, AlertTriangle } from 'lucide-react';

export const ProductionOrder = () => {
    const [loading, setLoading] = useState(false);
    const [boms, setBoms] = useState<any[]>([]);

    // Form
    const [refNo, setRefNo] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [selectedBomId, setSelectedBomId] = useState('');
    const [quantity, setQuantity] = useState(1);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        // @ts-ignore
        if (window.electronAPI) {
            try {
                // @ts-ignore
                const data = await window.electronAPI.getBoms();
                setBoms(data || []);
                // Generate simple ref
                setRefNo(`WO-${Date.now().toString().substring(7)}`);
            } catch (err) {
                console.error(err);
            }
        }
    };

    const handleExecute = async () => {
        if (!selectedBomId || quantity <= 0) {
            alert("الرجاء اختيار معادلة وتحديد كمية صحيحة");
            return;
        }

        if (!confirm(`هل أنت متأكد من إنتاج كمية ${quantity}؟ سيتم خصم المواد الخام وإضافة المنتج الجاهز.`)) return;

        try {
            setLoading(true);
            // @ts-ignore
            await window.electronAPI.executeProduction({
                bomId: selectedBomId,
                quantity: Number(quantity),
                date,
                refNo
            });

            alert("تم تنفيذ أمر التصنيع بنجاح!");

            // Reset
            setQuantity(1);
            setRefNo(`WO-${Date.now().toString().substring(7)}`);
            // Maybe redirect or show standard success ID
        } catch (err: any) {
            alert("خطأ في التنفيذ: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    const selectedBom = boms.find(b => b.id === Number(selectedBomId)); // ID might be number from DB

    return (
        <div className="flex justify-center items-start min-h-full bg-gray-100 p-8 font-sans" dir="rtl">
            <div className="bg-white max-w-2xl w-full rounded-2xl shadow-xl overflow-hidden border border-gray-200">
                <div className="bg-gradient-to-l from-purple-700 to-indigo-800 p-6 text-white text-center">
                    <Clipboard className="mx-auto mb-2 opacity-80" size={32} />
                    <h1 className="text-2xl font-bold">أمر تصنيع جديد</h1>
                    <p className="opacity-70 text-sm mt-1">تحويل المواد الخام إلى منتجات جاهزة</p>
                </div>

                <div className="p-8 space-y-6">
                    {/* Header Info */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-gray-600 mb-1">رقم الأمر</label>
                            <input
                                type="text"
                                value={refNo}
                                readOnly
                                className="w-full bg-gray-50 border border-gray-200 rounded p-2 text-center font-mono font-bold text-gray-700"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-600 mb-1">تاريخ الإنتاج</label>
                            <input
                                type="date"
                                value={date}
                                onChange={e => setDate(e.target.value)}
                                className="w-full border border-gray-300 rounded p-2"
                            />
                        </div>
                    </div>

                    {/* BOM Selection */}
                    <div>
                        <label className="block text-sm font-bold text-gray-600 mb-1">معادلة التصنيع (BOM)</label>
                        <select
                            value={selectedBomId}
                            onChange={e => setSelectedBomId(e.target.value)}
                            className="w-full border border-gray-300 rounded p-3 text-lg focus:ring-2 focus:ring-purple-200"
                        >
                            <option value="">-- اختر المنتج المراد تصنيعه --</option>
                            {boms.map(b => (
                                <option key={b.id} value={b.id}>{b.name} ({b.product_name})</option>
                            ))}
                        </select>
                    </div>

                    {selectedBom && (
                        <div className="bg-purple-50 p-4 rounded-lg border border-purple-100 flex items-start gap-3">
                            <CheckCircle className="text-purple-600 mt-1" size={20} />
                            <div>
                                <div className="font-bold text-purple-900">سيتم إنتاج: {selectedBom.product_name}</div>
                                <div className="text-xs text-purple-700 mt-1">بناءً على المعادلة: {selectedBom.name}</div>
                            </div>
                        </div>
                    )}

                    {/* Quantity */}
                    <div>
                        <label className="block text-sm font-bold text-gray-600 mb-1">الكمية المراد إنتاجها</label>
                        <div className="flex items-center gap-4">
                            <input
                                type="number"
                                value={quantity}
                                min="1"
                                onChange={e => setQuantity(Number(e.target.value))}
                                className="flex-1 border border-gray-300 rounded p-3 text-2xl font-black text-center text-gray-800 focus:ring-2 focus:ring-purple-200"
                            />
                            <div className="text-gray-500 font-bold">وحدة</div>
                        </div>
                    </div>

                    {/* Submit */}
                    <button
                        onClick={handleExecute}
                        disabled={loading || !selectedBomId}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl py-4 font-bold text-lg shadow-lg shadow-indigo-200 flex items-center justify-center gap-3 disabled:opacity-50 disabled:shadow-none transition transform active:scale-95"
                    >
                        {loading ? "جاري المعالجة..." : (
                            <>
                                <Play fill="currentColor" /> تنفيذ أمر التصنيع
                            </>
                        )}
                    </button>

                    <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
                        <AlertTriangle size={12} />
                        <span>سيقوم هذا الإجراء بتحديث كميات المخزون وتلفتها فوراً</span>
                    </div>
                </div>
            </div>
        </div>
    );
};
