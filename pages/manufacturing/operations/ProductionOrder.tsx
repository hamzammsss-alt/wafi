import React, { useState, useEffect } from 'react';
import {
    ClipboardList, Plus, Play, CheckCircle, AlertCircle, Clock, Calendar, ArrowRight,
    Package, Boxes
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const ProductionOrder = () => {
    const navigate = useNavigate();
    const [orders, setOrders] = useState<any[]>([]);
    const [boms, setBoms] = useState<any[]>([]);
    const [warehouses, setWarehouses] = useState<any[]>([]);
    const [routings, setRoutings] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    // Form State
    const [mode, setMode] = useState('LIST'); // LIST, NEW, VIEW
    const [newOrder, setNewOrder] = useState({
        bom_id: '',
        routing_id: '',
        warehouse_id: '',
        planned_quantity: 1,
        start_date: new Date().toISOString().split('T')[0],
        due_date: new Date().toISOString().split('T')[0],
        notes: ''
    });

    useEffect(() => {
        loadData();
    }, []);

    useEffect(() => {
        if (newOrder.bom_id) {
            loadRoutings(newOrder.bom_id);
        } else {
            setRoutings([]);
        }
    }, [newOrder.bom_id]);

    const loadRoutings = async (bomId: string) => {
        try {
            // @ts-ignore
            const list = await window.electronAPI.manufacturing.getRoutings(bomId);
            setRoutings(list || []);
            // Auto Select Default
            const def = list?.find((r: any) => r.is_default);
            if (def) setNewOrder(prev => ({ ...prev, routing_id: def.id }));
        } catch (e) {
            console.error(e);
        }
    };

    const loadData = async () => {
        setLoading(true);
        try {
            // @ts-ignore
            const ordersData = await window.electronAPI.manufacturing.getOrders();
            setOrders(ordersData || []);
            // @ts-ignore
            const bomsData = await window.electronAPI.manufacturing.getBOMs();
            setBoms(bomsData || []);
            // @ts-ignore
            const whData = await window.electronAPI.inventory.getWarehouses();
            setWarehouses(whData || []);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateOrder = async () => {
        if (!newOrder.bom_id || !newOrder.warehouse_id) {
            return alert('يرجى اختيار وجبة التصنيع والمستودع');
        }

        try {
            // @ts-ignore
            await window.electronAPI.manufacturing.createOrder(newOrder);
            alert('تم إنشاء أمر التصنيع بنجاح');
            setMode('LIST');
            loadData();
            // Reset form
            setNewOrder({
                bom_id: '',
                routing_id: '',
                warehouse_id: '',
                planned_quantity: 1,
                start_date: new Date().toISOString().split('T')[0],
                due_date: new Date().toISOString().split('T')[0],
                notes: ''
            });
        } catch (error) {
            console.error(error);
            alert('فشل إنشاء الأمر');
        }
    };

    const handleUpdateStatus = async (id: string, status: string) => {
        try {
            // @ts-ignore
            await window.electronAPI.manufacturing.updateOrderStatus(id, status);
            loadData();
        } catch (error) {
            console.error(error);
        }
    };

    const handleExecuteOrder = async (order: any) => {
        const actualQty = prompt(`الكمية المنتجة (المخطط لها: ${order.planned_quantity})`, order.planned_quantity);
        if (!actualQty) return;

        try {
            // @ts-ignore
            await window.electronAPI.manufacturing.executeOrder(order.id, parseFloat(actualQty), new Date().toISOString());
            alert('تم تنفيذ الأمر وإضافة المنتج للمخزون');
            loadData();
        } catch (error: any) {
            console.error(error);
            alert('خطأ في التنفيذ: ' + error.message);
        }
    };

    return (
        <div className="p-6 bg-slate-50 min-h-screen rtl" dir="rtl">

            {/* Header */}
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <ClipboardList className="text-indigo-600" size={28} />
                        أوامر التصنيع
                    </h1>
                    <p className="text-slate-500 mt-1">إدارة العملية الإنتاجية ومتابعة التشغيل</p>
                </div>
                {mode === 'LIST' && (
                    <button
                        onClick={() => setMode('NEW')}
                        className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl hover:bg-indigo-700 flex items-center gap-2 font-bold shadow-lg shadow-indigo-200 transition-all active:scale-95"
                    >
                        <Plus size={20} />
                        أمر تصنيع جديد
                    </button>
                )}
            </div>

            {mode === 'LIST' && (
                <div className="grid gap-4">
                    {orders.map(order => (
                        <div key={order.id} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md transition-all">
                            <div className="flex justify-between items-start">
                                <div className="flex items-start gap-4">
                                    <div className={`p-3 rounded-xl ${order.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-600' :
                                        order.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-500'
                                        }`}>
                                        <Package size={24} />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-bold text-lg text-slate-800">{order.bom_name || order.product_name}</h3>
                                            <span className="font-mono text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                                                {order.order_number}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-4 mt-2 text-sm text-slate-500">
                                            <span className="flex items-center gap-1">
                                                <Boxes size={14} />
                                                الكمية: <b className="text-slate-700">{order.planned_quantity}</b>
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <Calendar size={14} />
                                                البدء: {order.start_date}
                                            </span>
                                            {order.status === 'COMPLETED' && (
                                                <span className="flex items-center gap-1 text-emerald-600">
                                                    <Clock size={14} />
                                                    تم في: {order.actual_end_date?.split('T')[0] || '-'}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-col items-end gap-2">
                                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${order.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700' :
                                        order.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-700' :
                                            'bg-slate-100 text-slate-600'
                                        }`}>
                                        {order.status === 'PLANNED' ? 'مخطط' :
                                            order.status === 'IN_PROGRESS' ? 'قيد التنفيذ' :
                                                order.status === 'COMPLETED' ? 'مكتمل' : order.status}
                                    </span>

                                    <div className="flex gap-2 mt-2">
                                        {order.status === 'PLANNED' && (
                                            <button
                                                onClick={() => handleUpdateStatus(order.id, 'IN_PROGRESS')}
                                                className="text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors"
                                            >
                                                <Play size={14} /> بدء التشغيل
                                            </button>
                                        )}
                                        {order.status === 'IN_PROGRESS' && (
                                            <button
                                                onClick={() => handleExecuteOrder(order)}
                                                className="text-emerald-600 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors"
                                            >
                                                <CheckCircle size={14} /> إكمال وإنتاج
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}

                    {orders.length === 0 && !loading && (
                        <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-300">
                            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                <ClipboardList className="text-slate-300" size={32} />
                            </div>
                            <h3 className="font-bold text-slate-400">لا يوجد أوامر تصنيع حالياً</h3>
                        </div>
                    )}
                </div>
            )}

            {mode === 'NEW' && (
                <div className="max-w-2xl mx-auto bg-white p-8 rounded-2xl shadow-sm border border-slate-200 animate-in slide-in-from-bottom-5 duration-300">
                    <div className="flex items-center gap-4 mb-6 border-b pb-4">
                        <button onClick={() => setMode('LIST')} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors">
                            <ArrowRight />
                        </button>
                        <h2 className="text-xl font-bold text-slate-800">أمر تصنيع جديد</h2>
                    </div>

                    <div className="space-y-6">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">وجبة الإنتاج (المنتج)</label>
                            <select
                                value={newOrder.bom_id}
                                onChange={e => setNewOrder({ ...newOrder, bom_id: e.target.value })}
                                className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
                            >
                                <option value="">اختر المنتج...</option>
                                {boms.map(bom => (
                                    <option key={bom.id} value={bom.id}>{bom.item_name} (Standard Batch: {bom.batch_size})</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">مسار العمل (Routing)</label>
                            <select
                                value={newOrder.routing_id}
                                onChange={e => setNewOrder({ ...newOrder, routing_id: e.target.value })}
                                className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
                                disabled={!newOrder.bom_id}
                            >
                                <option value="">المسار الافتراضي</option>
                                {routings.map(r => (
                                    <option key={r.id} value={r.id}>{r.name}</option>
                                ))}
                            </select>
                        </div>

                        <div className="grid grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">الكمية المطلوبة</label>
                                <input
                                    type="number"
                                    value={newOrder.planned_quantity}
                                    onChange={e => setNewOrder({ ...newOrder, planned_quantity: parseFloat(e.target.value) })}
                                    className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">المستودع (للإنتاج)</label>
                                <select
                                    value={newOrder.warehouse_id}
                                    onChange={e => setNewOrder({ ...newOrder, warehouse_id: e.target.value })}
                                    className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
                                >
                                    <option value="">اختر المستودع...</option>
                                    {warehouses.map(w => (
                                        <option key={w.id} value={w.id}>{w.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">تاريخ البدء</label>
                                <input
                                    type="date"
                                    value={newOrder.start_date}
                                    onChange={e => setNewOrder({ ...newOrder, start_date: e.target.value })}
                                    className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">تاريخ الاستحقاق</label>
                                <input
                                    type="date"
                                    value={newOrder.due_date}
                                    onChange={e => setNewOrder({ ...newOrder, due_date: e.target.value })}
                                    className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">ملاحظات</label>
                            <textarea
                                value={newOrder.notes}
                                onChange={e => setNewOrder({ ...newOrder, notes: e.target.value })}
                                className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-100 outline-none h-24 transition-all"
                                placeholder="أي تعليمات إضافية..."
                            />
                        </div>

                        <button
                            onClick={handleCreateOrder}
                            className="w-full bg-indigo-600 text-white p-4 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 flex justify-center items-center gap-2 active:scale-95"
                        >
                            <Plus size={20} />
                            إنشاء الأمر
                        </button>
                    </div>
                </div>
            )}

        </div>
    );
};

export { ProductionOrder };
