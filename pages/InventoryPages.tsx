
import React, { useState } from 'react';
import { GenericDocument } from '../components/GenericDocument';
import { ClipboardList, Save, Search } from 'lucide-react';

// --- Inventory Documents ---
export const InternalOrder = () => (
    <GenericDocument
        title="طلبية داخلية (Internal Order)"
        documentName="الطلبية"
        type="INVENTORY"
        accountLabel="القسم / المستودع الطالب"
        colorTheme="emerald"
        prefix="INT"
    />
);

export const TransferOut = () => (
    <GenericDocument
        title="سند إرسال / نقل (Transfer Out)"
        documentName="سند الإرسال"
        type="INVENTORY"
        accountLabel="المستودع المستلم"
        colorTheme="emerald"
        prefix="TRO"
    />
);

export const TransferIn = () => (
    <GenericDocument
        title="سند استلام / نقل (Transfer In)"
        documentName="سند الاستلام"
        type="INVENTORY"
        accountLabel="المستودع المرسل"
        colorTheme="emerald"
        prefix="TRI"
    />
);

export const StockIn = () => (
    <GenericDocument
        title="سند إدخال مخزني (Stock In)"
        documentName="سند الإدخال"
        type="INVENTORY"
        accountLabel="المستودع"
        colorTheme="emerald"
        prefix="STI"
    />
);

export const StockOut = () => (
    <GenericDocument
        title="سند إخراج مخزني (Stock Out)"
        documentName="سند الإخراج"
        type="INVENTORY"
        accountLabel="المستودع"
        colorTheme="emerald"
        prefix="STO"
    />
);

export const StockAdjustment = () => (
    <GenericDocument
        title="تعديل مخزون / تسوية (Adj)"
        documentName="سند التسوية"
        type="INVENTORY"
        accountLabel="حساب الفروقات" // e.g. Cost of Goods Sold or Loss
        colorTheme="emerald"
        prefix="ADJ"
    />
);

// --- Stock Take (Custom) ---
export const StockTake = () => {
    const [items, setItems] = useState([
        { id: 1, code: '1001', name: 'لابتوب ديل', systemQty: 10, countedQty: 10 },
        { id: 2, code: '1002', name: 'ماوس لاسلكي', systemQty: 50, countedQty: 48 },
    ]);

    return (
        <div className="flex flex-col h-full bg-[#f0f2f5] p-6">
            <h1 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                <ClipboardList className="text-emerald-600" /> جرد الأصناف (Stock Take)
            </h1>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 flex-1 flex flex-col">
                <div className="flex justify-between items-center mb-4">
                    <div className="flex gap-2 relative w-96">
                        <input className="w-full p-2 pr-8 border rounded" placeholder="بحث عن صنف..." />
                        <Search size={16} className="absolute top-3 right-2 text-gray-400" />
                    </div>
                    <button className="flex items-center gap-2 px-6 py-2 bg-emerald-600 text-white font-bold rounded hover:bg-emerald-700">
                        <Save size={18} /> اعتماد الجرد
                    </button>
                </div>

                <div className="overflow-auto border rounded">
                    <table className="w-full text-right text-sm">
                        <thead className="bg-gray-100 font-bold text-gray-700">
                            <tr>
                                <th className="p-3">رمز الصنف</th>
                                <th className="p-3">اسم الصنف</th>
                                <th className="p-3 text-center">الكمية المسجلة</th>
                                <th className="p-3 text-center w-32">الكميت الفعلية</th>
                                <th className="p-3 text-center">الفارق</th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.map(item => {
                                const diff = item.countedQty - item.systemQty;
                                return (
                                    <tr key={item.id} className="border-b hover:bg-gray-50">
                                        <td className="p-3 font-mono">{item.code}</td>
                                        <td className="p-3">{item.name}</td>
                                        <td className="p-3 text-center">{item.systemQty}</td>
                                        <td className="p-2">
                                            <input
                                                type="number"
                                                className="w-full p-1 border rounded text-center font-bold"
                                                value={item.countedQty}
                                                onChange={e => {
                                                    const val = Number(e.target.value);
                                                    setItems(items.map(i => i.id === item.id ? { ...i, countedQty: val } : i));
                                                }}
                                            />
                                        </td>
                                        <td className={`p-3 text-center font-bold ${diff < 0 ? 'text-red-500' : diff > 0 ? 'text-green-500' : 'text-gray-400'}`}>
                                            {diff}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
