import React, { useState, useEffect } from 'react';
import { Calculator, AlertCircle, Loader2, Check } from 'lucide-react';

export const CostAllocation = () => {
    // State
    const [selectedLC, setSelectedLC] = useState<string>('');
    const [lcList, setLcList] = useState<any[]>([]);
    const [expenses, setExpenses] = useState<any[]>([]);
    const [items, setItems] = useState<any[]>([]);
    const [exchangeRate, setExchangeRate] = useState(3.5); // Default, should come from shipment
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Initial Load of Shipments
    useEffect(() => {
        const fetchShipments = async () => {
            try {
                const ships = await window.electronAPI.import.getShipments({ status: 'Open' });
                setLcList(ships || []);
            } catch (err) {
                console.error(err);
                setError("فشل تحميل ملفات الاستيراد");
            }
        };
        fetchShipments();
    }, []);

    // Load Data
    const handleLoadLC = async () => {
        if (!selectedLC) return;
        setLoading(true);
        setError(null);
        try {
            // 1. Get Items from Linked Invoices
            const fetchedItems = await window.electronAPI.import.getShipmentItems(selectedLC);
            setItems(fetchedItems || []);

            // 2. Get Expenses
            const fetchedExpenses = await window.electronAPI.import.getExpenses(selectedLC);
            setExpenses(fetchedExpenses || []);

            // 3. Get Shipment Details (for Exchange Rate)
            const shipment = await window.electronAPI.import.getShipmentById(selectedLC);
            if (shipment) {
                setExchangeRate(shipment.exchange_rate || 1);
            }

        } catch (err) {
            console.error(err);
            setError("فشل تحميل بيانات الشحنة");
            setItems([]);
        } finally {
            setLoading(false);
        }
    };

    // Calculations
    const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount_local || 0), 0);
    const totalFOB_FX = items.reduce((sum, i) => sum + (i.total_fob || 0), 0);
    const totalFOB_Local = items.reduce((sum, i) => sum + ((i.total_fob || 0) * (i.exchange_rate || 1)), 0) || (totalFOB_FX * exchangeRate);
    // Note: Items from Invoice might have their own exchange rate if multi-currency, but simplified here.

    // Landed Cost Factor
    const allocationRatio = totalFOB_Local > 0 ? (totalExpenses / totalFOB_Local) : 0;

    const handleSaveAllocation = async () => {
        if (!selectedLC || items.length === 0) return;
        if (!window.confirm('هل أنت متأكد من اعتماد تكاليف الاستيراد؟ سيتم تحديث أسعار التكلفة للأصناف.')) return;

        setLoading(true);
        try {
            // Prepare Payload: Item ID -> New Unit Cost
            const allocationData = items.map(item => {
                const baseCostLocal = (item.total_fob || 0) * (item.exchange_rate || exchangeRate);
                const addedCost = baseCostLocal * allocationRatio;
                const finalCost = baseCostLocal + addedCost;
                const unitFinal = finalCost / item.quantity;

                return {
                    item_id: item.item_id,
                    new_cost: unitFinal
                };
            });

            const result = await window.electronAPI.import.allocateCosts(selectedLC, allocationData, 'value');

            if (result.success) {
                alert('تم تحديث التكاليف بنجاح!');
                setItems([]);
                setExpenses([]);
                setSelectedLC('');
                // Refresh list if needed
            }
        } catch (err: any) {
            console.error(err);
            alert('فشل حفظ التكاليف: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6 bg-[#f8fafc] h-full overflow-auto font-sans" dir="rtl">
            <h1 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                <Calculator className="text-purple-600" /> توزيع المصاريف (Landed Cost Allocation)
            </h1>

            {/* Selection Area */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 mb-6 flex gap-4 items-end">
                <div className="flex-1">
                    <label className="block text-sm font-bold text-gray-700 mb-1">اختر ملف الاستيراد (الشحنة)</label>
                    <select
                        className="w-full p-2.5 border rounded-lg bg-gray-50 outline-none focus:ring-2 focus:ring-purple-500"
                        value={selectedLC}
                        onChange={e => setSelectedLC(e.target.value)}
                    >
                        <option value="">-- اختر الملف --</option>
                        {lcList.map(lc => (
                            <option key={lc.id} value={lc.id}>
                                {lc.shipment_no} - {lc.supplier_name} ({lc.status})
                            </option>
                        ))}
                    </select>
                </div>
                {/* 
                <div className="w-32">
                    <label className="block text-sm font-bold text-gray-700 mb-1">سعر الصرف</label>
                    <input
                        type="number"
                        value={exchangeRate}
                        readOnly
                        className="w-full p-2.5 border rounded-lg text-center font-bold bg-slate-100"
                    />
                </div>
                */}
                <button
                    onClick={handleLoadLC}
                    disabled={!selectedLC || loading}
                    className="px-6 py-2.5 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 disabled:bg-gray-300 transition flex items-center gap-2">
                    {loading ? <Loader2 className="animate-spin" /> : 'تحميل البيانات'}
                </button>
            </div>

            {error && (
                <div className="mb-6 bg-red-50 text-red-700 p-4 rounded-lg flex items-center gap-2 border border-red-200">
                    <AlertCircle size={20} />
                    {error}
                </div>
            )}

            {items.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in-up">
                    {/* Expenses Summary */}
                    <div className="col-span-1">
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 sticky top-6">
                            <h3 className="font-bold border-b pb-2 mb-4 text-gray-800">1. ملخص التكاليف</h3>
                            <div className="space-y-4">
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-gray-600">قيمة البضاعة (FOB - محلي)</span>
                                    <span className="font-mono font-bold text-indigo-700">{totalFOB_Local.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                                </div>
                                <div className="border-t border-dashed my-2"></div>
                                <div className="space-y-2">
                                    <div className="text-xs font-bold text-gray-400 uppercase">المصاريف الإضافية</div>
                                    {expenses.length === 0 && <p className="text-xs text-gray-400">لا توجد مصاريف مسجلة</p>}
                                    {expenses.map(exp => (
                                        <div key={exp.id} className="flex justify-between text-sm text-red-600 bg-red-50 p-2 rounded">
                                            <span>{exp.expense_type} ({exp.reference_doc})</span>
                                            <span className="font-bold">+{Number(exp.amount_local).toLocaleString()}</span>
                                        </div>
                                    ))}
                                    <div className="flex justify-between text-red-700 font-black pt-1 border-t mt-2">
                                        <span>إجمالي المصاريف</span>
                                        <span>{totalExpenses.toLocaleString()}</span>
                                    </div>
                                </div>

                                <div className="bg-purple-50 p-4 rounded-lg mt-4 text-center border border-purple-100">
                                    <div className="text-xs text-purple-600 font-bold mb-1">نسبة التحميل (Allocation Ratio)</div>
                                    <div className="text-2xl font-black text-purple-700">{(allocationRatio * 100).toFixed(2)}%</div>
                                    <div className="text-xs text-purple-400 mt-1">يتم إضافة هذه النسبة لكل صنف</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Cost Distribution Table */}
                    <div className="col-span-1 lg:col-span-2">
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                            <div className="flex justify-between items-center mb-4 border-b pb-2">
                                <h3 className="font-bold text-gray-800">2. توزيع التكلفة على الأصناف</h3>
                                <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded font-bold">التوزيع حسب: القيمة (Value)</span>
                            </div>

                            <table className="w-full text-right text-sm">
                                <thead className="bg-gray-50 text-gray-700 font-bold">
                                    <tr>
                                        <th className="p-3">الصنف</th>
                                        <th className="p-3 text-center">الكمية</th>
                                        <th className="p-3">FOB (عملة)</th>
                                        <th className="p-3">FOB (محلي)</th>
                                        <th className="p-3 text-purple-600">+ مصاريف</th>
                                        <th className="p-3 font-black text-emerald-700">التكلفة النهائية</th>
                                        <th className="p-3 text-xs text-gray-400">الزيادة</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {items.map(item => {
                                        const baseCostLocal = (item.total_fob || 0) * (item.exchange_rate || exchangeRate); // Total Line Cost Local
                                        const addedCost = baseCostLocal * allocationRatio;
                                        const finalCost = baseCostLocal + addedCost;

                                        // Unit Costs
                                        const unitBase = baseCostLocal / item.quantity;
                                        const unitFinal = finalCost / item.quantity;
                                        const increasePct = baseCostLocal > 0 ? ((finalCost - baseCostLocal) / baseCostLocal) * 100 : 0;

                                        return (
                                            <tr key={item.line_id} className="hover:bg-gray-50">
                                                <td className="p-3 font-bold text-gray-800">
                                                    {item.item_name}
                                                    <span className="block text-xs text-gray-400">{item.item_code}</span>
                                                </td>
                                                <td className="p-3 text-center">{item.quantity}</td>
                                                <td className="p-3 font-mono text-gray-500">{(item.total_fob || 0).toFixed(2)}</td>
                                                <td className="p-3 font-mono">{baseCostLocal.toFixed(2)}</td>
                                                <td className="p-3 font-mono text-purple-600 font-bold">+{addedCost.toFixed(2)}</td>
                                                <td className="p-3 font-mono font-black text-emerald-700 text-lg">
                                                    {finalCost.toFixed(2)}
                                                    <span className="block text-xs font-normal text-gray-500">@{unitFinal.toFixed(2)} / unit</span>
                                                </td>
                                                <td className="p-3">
                                                    <span className="text-xs bg-gray-100 px-1.5 py-0.5 rounded text-gray-500">
                                                        +{increasePct.toFixed(1)}%
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>

                            <div className="mt-8 pt-4 border-t flex justify-end">
                                <button
                                    onClick={handleSaveAllocation}
                                    disabled={loading}
                                    className="px-8 py-3 bg-emerald-600 text-white font-bold rounded-lg hover:bg-emerald-700 shadow-lg shadow-emerald-200 flex items-center gap-2 disabled:opacity-50">
                                    {loading ? <Loader2 className="animate-spin" /> : <><Check size={20} /> اعتماد وتحديث التكاليف</>}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl border border-dashed border-gray-300">
                    <AlertCircle className="w-16 h-16 text-gray-200 mb-4" />
                    <h3 className="text-lg font-bold text-gray-500">يرجى اختيار ملف شحنة لتحميل الأصناف</h3>
                    <p className="text-gray-400 text-sm mt-2">تأكد من ربط فاتورة مشتريات بملف الاستيراد أولاً</p>
                </div>
            )}
        </div>
    );
};
