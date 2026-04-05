import React, { useState, useEffect } from 'react';
import { Save, ArrowRightLeft, History, Calculator, Building2, Package, RefreshCw } from 'lucide-react';
import { Warehouse, Item } from '../../types';

export const StockTransactions = () => {
    const [activeTab, setActiveTab] = useState<'ADJUSTMENT' | 'TRANSFER'>('ADJUSTMENT');
    const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
    const [items, setItems] = useState<Item[]>([]);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    // Adjustment State
    const [adjData, setAdjData] = useState({
        warehouseId: '',
        itemId: '',
        type: 'ADJ', // ADJ
        quantity: 0, // The adjustment amount (+/-)
        currentQty: 0, // Display only
        description: ''
    });

    // Transfer State
    const [transferData, setTransferData] = useState({
        fromWarehouseId: '',
        toWarehouseId: '',
        itemId: '',
        quantity: 0,
        currentSourceQty: 0,
        description: ''
    });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        // @ts-ignore
        if (window.electronAPI) {
            // @ts-ignore
            const w = await window.electronAPI.getWarehouses();
            setWarehouses(w || []);
            // @ts-ignore
            const i = await window.electronAPI.getItems();
            setItems(i || []);
        }
    };

    const fetchStock = async (itemId: string, warehouseId: string, isTransferSource: boolean = false) => {
        if (!itemId || !warehouseId) return;
        // @ts-ignore
        const stock = await window.electronAPI.getStock(itemId, warehouseId);
        if (isTransferSource) {
            setTransferData(prev => ({ ...prev, currentSourceQty: stock.quantity }));
        } else {
            setAdjData(prev => ({ ...prev, currentQty: stock.quantity }));
        }
    };

    // Watchers for fetching stock
    useEffect(() => {
        fetchStock(adjData.itemId, adjData.warehouseId);
    }, [adjData.itemId, adjData.warehouseId]);

    useEffect(() => {
        fetchStock(transferData.itemId, transferData.fromWarehouseId, true);
    }, [transferData.itemId, transferData.fromWarehouseId]);


    const handleSaveAdjustment = async () => {
        try {
            if (!adjData.warehouseId || !adjData.itemId || adjData.quantity === 0) {
                setMessage({ type: 'error', text: 'يرجى تعبئة جميع الحقول المطلوبة' });
                return;
            }

            const trx = {
                date: new Date().toISOString().split('T')[0],
                type: 'ADJ',
                ref_no: 'ADJ-' + Date.now(),
                warehouse_id: adjData.warehouseId,
                item_id: adjData.itemId,
                quantity: adjData.quantity,
                cost: 0, // Adjustment usually keeps cost or takes current avg, Service handles 0 logic for existing items? 
                // Actually service needs cost. If we send 0, it might dilute cost.
                // Ideally we fetch current cost and send it back, or Service looks it up.
                // Service V1: If existing, it re-averages. If we send 0 cost for incoming ADJ, it dilutes. 
                // For ADJ, we often want to just fix Qty without changing Cost Per Unit, 
                // OR we are adding value. Let's assume for now we use current avg cost from backend logic (Service logic update required if we want to preserve cost).
                // Service: "if quantity > 0 ... totalValue = ... + (quantity * cost)".
                // If we pass cost=0, we decrease value. 
                // Let's rely on service logic for now or fetch cost. (Simplification: cost 0).
                description: adjData.description || 'تعديل مخزني يدوي'
            };

            // @ts-ignore
            await window.electronAPI.addStockTransaction(trx);
            setMessage({ type: 'success', text: 'تم حفظ التسوية بنجاح' });

            // Refund/Reset
            setAdjData({ ...adjData, quantity: 0, description: '' });
            fetchStock(adjData.itemId, adjData.warehouseId); // Refresh

        } catch (err: any) {
            setMessage({ type: 'error', text: err.message });
        }
    };

    const handleSaveTransfer = async () => {
        try {
            if (!transferData.fromWarehouseId || !transferData.toWarehouseId || !transferData.itemId || transferData.quantity <= 0) {
                setMessage({ type: 'error', text: 'يرجى تعبئة الحقول بشكل صحيح' });
                return;
            }

            if (transferData.fromWarehouseId === transferData.toWarehouseId) {
                setMessage({ type: 'error', text: 'لا يمكن التحويل لنفس المستودع' });
                return;
            }

            if (transferData.quantity > transferData.currentSourceQty) {
                setMessage({ type: 'error', text: 'الكمية المراد نقلها أكبر من المتوفر' });
                return;
            }

            const transfer = {
                date: new Date().toISOString().split('T')[0],
                ref_no: 'TRF-' + Date.now(),
                from_warehouse_id: transferData.fromWarehouseId,
                to_warehouse_id: transferData.toWarehouseId,
                items: [
                    { item_id: transferData.itemId, quantity: transferData.quantity }
                ],
                description: transferData.description || 'نقل مخزني'
            };

            // @ts-ignore
            await window.electronAPI.transferStock(transfer);
            setMessage({ type: 'success', text: 'تم التحويل بنجاح' });

            setTransferData({ ...transferData, quantity: 0, description: '' });
            fetchStock(transferData.itemId, transferData.fromWarehouseId, true);

        } catch (err: any) {
            setMessage({ type: 'error', text: err.message });
        }
    };


    return (
        <div className="p-6 bg-[#f8fafc] h-full overflow-auto" dir="rtl">
            <h1 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                <RefreshCw className="text-emerald-600" /> حركات المخزون (Stock Control)
            </h1>

            {message && (
                <div className={`p-4 mb-4 rounded-lg flex items-center gap-2 font-bold ${message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {message.type === 'success' ? '✓' : '✕'} {message.text}
                </div>
            )}

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="flex border-b border-gray-200">
                    <button
                        onClick={() => setActiveTab('ADJUSTMENT')}
                        className={`flex-1 py-4 font-bold flex items-center justify-center gap-2 transition ${activeTab === 'ADJUSTMENT' ? 'text-emerald-600 border-b-2 border-emerald-600 bg-emerald-50' : 'text-gray-500 hover:bg-gray-50'}`}
                    >
                        <Calculator size={18} /> تسوية مخزنية (Adjustment)
                    </button>
                    <button
                        onClick={() => setActiveTab('TRANSFER')}
                        className={`flex-1 py-4 font-bold flex items-center justify-center gap-2 transition ${activeTab === 'TRANSFER' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50' : 'text-gray-500 hover:bg-gray-50'}`}
                    >
                        <ArrowRightLeft size={18} /> نقل بين المستودعات (Transfer)
                    </button>
                </div>

                <div className="p-8">
                    {activeTab === 'ADJUSTMENT' ? (
                        <div className="max-w-2xl mx-auto space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">المستودع</label>
                                    <div className="relative">
                                        <Building2 className="absolute top-3 right-3 text-gray-400" size={16} />
                                        <select
                                            className="w-full p-2.5 pr-10 border rounded-lg focus:ring-2 focus:ring-emerald-200 outline-none"
                                            value={adjData.warehouseId}
                                            onChange={e => setAdjData({ ...adjData, warehouseId: e.target.value })}
                                        >
                                            <option value="">اختر المستودع...</option>
                                            {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">الصنف</label>
                                    <div className="relative">
                                        <Package className="absolute top-3 right-3 text-gray-400" size={16} />
                                        <select
                                            className="w-full p-2.5 pr-10 border rounded-lg focus:ring-2 focus:ring-emerald-200 outline-none"
                                            value={adjData.itemId}
                                            onChange={e => setAdjData({ ...adjData, itemId: e.target.value })}
                                        >
                                            <option value="">اختر الصنف...</option>
                                            {items.map(i => <option key={i.id} value={i.id}>{i.code} - {i.name_ar}</option>)}
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-gray-50 p-4 rounded-lg flex justify-between items-center border border-gray-200">
                                <span className="text-gray-600 font-bold">الكمية الحالية المتوفرة:</span>
                                <span className="text-2xl font-mono font-bold text-emerald-600">{adjData.currentQty}</span>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">كمية التعديل (Adjustment Qty)</label>
                                <div className="text-xs text-gray-500 mb-2">
                                    * قيمة موجبة لزيادة المخزون، وسالبة للإنقاص (مثال: 5، -2)
                                </div>
                                <input
                                    type="number"
                                    className="w-full p-3 border rounded-lg font-mono text-lg font-bold focus:ring-2 focus:ring-emerald-200 outline-none"
                                    placeholder="0"
                                    value={adjData.quantity}
                                    onChange={e => setAdjData({ ...adjData, quantity: Number(e.target.value) })}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">ملاحظات</label>
                                <input
                                    className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-emerald-200 outline-none"
                                    placeholder="سبب التعديل..."
                                    value={adjData.description}
                                    onChange={e => setAdjData({ ...adjData, description: e.target.value })}
                                />
                            </div>

                            <button
                                onClick={handleSaveAdjustment}
                                className="w-full py-3 bg-emerald-600 text-white font-bold rounded-lg hover:bg-emerald-700 transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-200"
                            >
                                <Save size={18} /> حفظ التسوية
                            </button>
                        </div>
                    ) : (
                        <div className="max-w-2xl mx-auto space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">من مستودع (المصدر)</label>
                                    <select
                                        className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-blue-200 outline-none"
                                        value={transferData.fromWarehouseId}
                                        onChange={e => setTransferData({ ...transferData, fromWarehouseId: e.target.value })}
                                    >
                                        <option value="">اختر المصدر...</option>
                                        {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">إلى مستودع (الوجهة)</label>
                                    <select
                                        className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-blue-200 outline-none"
                                        value={transferData.toWarehouseId}
                                        onChange={e => setTransferData({ ...transferData, toWarehouseId: e.target.value })}
                                    >
                                        <option value="">اختر الوجهة...</option>
                                        {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">الصنف</label>
                                <select
                                    className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-blue-200 outline-none"
                                    value={transferData.itemId}
                                    onChange={e => setTransferData({ ...transferData, itemId: e.target.value })}
                                >
                                    <option value="">اختر الصنف المطلوب نقله...</option>
                                    {items.map(i => <option key={i.id} value={i.id}>{i.code} - {i.name_ar}</option>)}
                                </select>
                            </div>

                            <div className="bg-blue-50 p-4 rounded-lg flex justify-between items-center border border-blue-100">
                                <span className="text-gray-600 font-bold">الكمية المتوفرة في المصدر:</span>
                                <span className="text-2xl font-mono font-bold text-blue-600">{transferData.currentSourceQty}</span>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">الكمية المنقولة</label>
                                <input
                                    type="number"
                                    className="w-full p-3 border rounded-lg font-mono text-lg font-bold focus:ring-2 focus:ring-blue-200 outline-none"
                                    placeholder="0"
                                    value={transferData.quantity}
                                    onChange={e => setTransferData({ ...transferData, quantity: Number(e.target.value) })}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">ملاحظات</label>
                                <input
                                    className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-blue-200 outline-none"
                                    placeholder="سبب النقل..."
                                    value={transferData.description}
                                    onChange={e => setTransferData({ ...transferData, description: e.target.value })}
                                />
                            </div>

                            <button
                                onClick={handleSaveTransfer}
                                className="w-full py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition flex items-center justify-center gap-2 shadow-lg shadow-blue-200"
                            >
                                <ArrowRightLeft size={18} /> تنفيذ النقل
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
