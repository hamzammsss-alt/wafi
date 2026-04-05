
import React, { useState } from 'react';
import { Ship, Save, Calculator } from 'lucide-react';

export const LandedCosts = () => {
    const [invoiceNo, setInvoiceNo] = useState('');
    const [expenses, setExpenses] = useState([{ name: 'جمارك', amount: 0 }, { name: 'شحن بحري', amount: 0 }]);

    const totalExp = expenses.reduce((a, b) => a + b.amount, 0);

    return (
        <div className="p-6 bg-[#f0f2f5] min-h-screen">
            <h1 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                <Ship className="text-blue-600" /> مصاريف الشراء (Landed Costs)
            </h1>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-lg shadow-sm">
                    <h3 className="font-bold mb-4 border-b pb-2">1. اختيار الفاتورة</h3>
                    <div className="flex gap-2 mb-4">
                        <input
                            className="flex-1 p-2 border rounded"
                            placeholder="رقم فاتورة المشتريات (PO-xxx)..."
                            value={invoiceNo}
                            onChange={e => setInvoiceNo(e.target.value)}
                        />
                        <button className="bg-blue-600 text-white px-4 rounded">بحث</button>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow-sm">
                    <h3 className="font-bold mb-4 border-b pb-2">2. توزيع المصاريف</h3>
                    {expenses.map((exp, idx) => (
                        <div key={idx} className="flex justify-between items-center mb-2">
                            <span>{exp.name}</span>
                            <input
                                type="number"
                                className="w-32 p-1 border rounded text-center"
                                value={exp.amount}
                                onChange={(e) => {
                                    const newExp = [...expenses];
                                    newExp[idx].amount = Number(e.target.value);
                                    setExpenses(newExp);
                                }}
                            />
                        </div>
                    ))}
                    <div className="border-t mt-4 pt-2 flex justify-between font-bold text-lg">
                        <span>المجموع</span>
                        <span>{totalExp.toFixed(2)}</span>
                    </div>
                </div>

                <div className="col-span-2 bg-yellow-50 p-6 rounded border border-yellow-200 text-center">
                    <p className="text-gray-600 mb-4">سيقوم النظام بتوزيع مبلغ <strong>{totalExp}</strong> على أصناف الفاتورة المختارة بناءً على قيمة كل صنف، مما سيؤدي لرفع تكلفة المخزون.</p>
                    <button className="bg-green-600 text-white px-8 py-3 rounded-lg font-bold hover:bg-green-700 flex items-center gap-2 mx-auto">
                        <Calculator size={18} /> اعتماد وتحديث التكاليف
                    </button>
                </div>
            </div>
        </div>
    );
};
