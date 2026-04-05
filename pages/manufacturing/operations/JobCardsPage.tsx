import React, { useState, useEffect } from 'react';
import {
    Play, Square, User, Clock, CheckCircle, AlertOctagon, Search,
    PauseCircle, LayoutDashboard
} from 'lucide-react';

const JobCardsPage = () => {
    const [orders, setOrders] = useState<any[]>([]);
    const [activeCards, setActiveCards] = useState<any[]>([]);
    const [selectedOrder, setSelectedOrder] = useState<string>('');
    const [selectedOp, setSelectedOp] = useState<string>('');

    // Employee Selection (Mocked for now or fetched)
    const [employeeId, setEmployeeId] = useState('');
    const [employees, setEmployees] = useState<any[]>([]);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        // @ts-ignore
        const [ordersData, cardsData, empsData] = await Promise.all([
            // @ts-ignore
            window.electronAPI.manufacturing.getOrders(),
            // @ts-ignore
            window.electronAPI.manufacturing.getJobCards({ status: 'IN_PROGRESS' }),
            // @ts-ignore
            window.electronAPI.hr.getEmployees()
        ]);

        // Filter only ACTIVE orders for selection
        setOrders(ordersData?.filter((o: any) => o.status === 'IN_PROGRESS') || []);
        setActiveCards(cardsData || []);
        setEmployees(empsData || []);
    };

    const handleStartJob = async () => {
        if (!selectedOrder || !selectedOp || !employeeId) {
            return alert("يرجى اختيار الأمر، العملية، والموظف");
        }

        const order = orders.find(o => o.id === selectedOrder);
        // Find Operation Details - In a real app we fetch available ops for this order
        // For MVP, we assume we fetch order details or pass ops. 
        // Let's assume we select from a list of operations loaded when Order is selected.

        // Fetch specific routing ops for this order
        // @ts-ignore
        const routing = await window.electronAPI.manufacturing.getRoutings(order.bom_id);
        const ops = routing[0]?.operations || []; // Simplified: taking first routing
        const op = ops.find((o: any) => o.id === selectedOp);

        if (!op) return alert("العملية غير موجودة");

        try {
            // @ts-ignore
            await window.electronAPI.manufacturing.startJob({
                production_order_id: selectedOrder,
                operation_id: selectedOp,
                work_center_id: op.work_center_id,
                employee_id: employeeId
            });
            alert("تم بدء العمل بنجاح");
            loadData();
            setSelectedOrder('');
            setSelectedOp('');
        } catch (error: any) {
            alert(error.message);
        }
    };

    const handleStopJob = async (cardId: string) => {
        const qty = prompt("الكمية المنجزة:");
        if (qty === null) return;

        try {
            // @ts-ignore
            await window.electronAPI.manufacturing.stopJob(cardId, {
                produced_quantity: parseFloat(qty)
            });
            alert("تم إيقاف العمل وتسجيل الإنتاج");
            loadData();
        } catch (error: any) {
            alert(error.message);
        }
    };

    // Helper to load ops when order changes
    const [availableOps, setAvailableOps] = useState<any[]>([]);
    useEffect(() => {
        if (selectedOrder) {
            const order = orders.find(o => o.id === selectedOrder);
            if (order && order.bom_id) {
                // @ts-ignore
                window.electronAPI.manufacturing.getRoutings(order.bom_id).then((res: any) => {
                    // Flatten ops if multiple routings or pick specific
                    // Ideally order has routing_id.
                    const targetRouting = res.find((r: any) => r.id === order.routing_id) || res[0];
                    setAvailableOps(targetRouting?.operations || []);
                });
            }
        } else {
            setAvailableOps([]);
        }
    }, [selectedOrder]);

    return (
        <div className="p-6 bg-slate-50 min-h-screen rtl" dir="rtl">
            <h1 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                <LayoutDashboard className="text-orange-600" />
                لوحة تشغيل المصنع (Shop Floor)
            </h1>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* 1. Start New Job Panel */}
                <div className="lg:col-span-1 bg-white p-6 rounded-2xl shadow-sm border border-slate-200 h-fit">
                    <h3 className="font-bold text-lg text-slate-700 mb-4 border-b pb-2">تسجيل دخول عملية جديدة</h3>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-bold text-slate-600 mb-1">الموظف</label>
                            <select
                                value={employeeId}
                                onChange={e => setEmployeeId(e.target.value)}
                                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-orange-100"
                            >
                                <option value="">اختر الموظف...</option>
                                {employees.map(e => (
                                    <option key={e.id} value={e.id}>{e.full_name}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-600 mb-1">أمر التصنيع (الجاري)</label>
                            <select
                                value={selectedOrder}
                                onChange={e => setSelectedOrder(e.target.value)}
                                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-orange-100"
                            >
                                <option value="">اختر أمر التصنيع...</option>
                                {orders.map(o => (
                                    <option key={o.id} value={o.id}>#{o.order_number} - {o.item_name}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-600 mb-1">العملية المطلوبة</label>
                            <select
                                value={selectedOp}
                                onChange={e => setSelectedOp(e.target.value)}
                                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-orange-100"
                                disabled={!selectedOrder}
                            >
                                <option value="">اختر العملية...</option>
                                {availableOps.map(op => (
                                    <option key={op.id} value={op.id}>{op.sequence_order} - {op.description}</option>
                                ))}
                            </select>
                        </div>

                        <button
                            onClick={handleStartJob}
                            className="w-full bg-orange-600 text-white py-3 rounded-xl font-bold flex justify-center items-center gap-2 hover:bg-orange-700 transition-all shadow-lg shadow-orange-200"
                        >
                            <Play size={20} /> بدء العمل
                        </button>
                    </div>
                </div>

                {/* 2. Active Jobs List */}
                <div className="lg:col-span-2 space-y-4">
                    <h3 className="font-bold text-lg text-slate-700 mb-2 flex items-center gap-2">
                        <Clock className="text-emerald-600" />
                        العمليات الجارية حالياً
                    </h3>

                    {activeCards.length === 0 ? (
                        <div className="bg-white p-8 rounded-2xl border border-dashed border-slate-300 text-center text-slate-400">
                            <PauseCircle size={48} className="mx-auto mb-2 opacity-20" />
                            <p>لا يوجد عمليات جارية حالياً</p>
                        </div>
                    ) : (
                        activeCards.map(card => (
                            <div key={card.id} className="bg-white p-5 rounded-2xl shadow-sm border border-l-4 border-l-emerald-500 flex justify-between items-center animate-in slide-in-from-right-4 duration-300">
                                <div>
                                    <div className="flex items-center gap-3 mb-1">
                                        <span className="bg-emerald-100 text-emerald-700 text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                                            <Play size={10} fill="currentColor" /> جاري التنفيذ
                                        </span>
                                        <span className="text-slate-400 text-xs font-mono">{card.start_time.split('T')[1].substring(0, 5)}</span>
                                    </div>
                                    <h4 className="font-bold text-slate-800 text-lg">{card.operation_name}</h4>
                                    <div className="flex items-center gap-4 text-sm text-slate-500 mt-1">
                                        <span className="flex items-center gap-1"><User size={14} /> {card.employee_name || 'غير محدد'}</span>
                                        <span className="hidden sm:flex items-center gap-1"><Square size={14} /> {card.work_center_name}</span>
                                        <span className="bg-slate-100 px-2 rounded text-slate-600">أمر #{card.order_number}</span>
                                    </div>
                                </div>

                                <button
                                    onClick={() => handleStopJob(card.id)}
                                    className="bg-red-50 text-red-600 hover:bg-red-600 hover:text-white px-4 py-2 rounded-xl font-bold transition-all border border-red-100 flex items-center gap-2"
                                >
                                    <Square size={16} fill="currentColor" /> إيقاف
                                </button>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default JobCardsPage;
