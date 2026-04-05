import React, { useState } from 'react';
import { Calculator } from 'lucide-react';

export const MaturityCalculator = () => {
    const [items, setItems] = useState([{ amount: 0, date: '' }, { amount: 0, date: '' }]);
    const [avgDate, setAvgDate] = useState<string | null>(null);

    const calculate = () => {
        let totalProduct = 0;
        let totalAmount = 0;
        const refDate = new Date().getTime(); // Use today as origin to simplify

        items.forEach(i => {
            if (i.amount && i.date) {
                const days = (new Date(i.date).getTime() - refDate) / (1000 * 3600 * 24);
                totalProduct += days * i.amount;
                totalAmount += i.amount;
            }
        });

        if (totalAmount > 0) {
            const avgDays = totalProduct / totalAmount;
            const targetDate = new Date(refDate + avgDays * (1000 * 3600 * 24));
            setAvgDate(targetDate.toISOString().split('T')[0]);
        }
    };

    return (
        <div className="p-6 bg-gray-50 h-full flex flex-col items-center justify-center" dir="rtl">
            <div className="max-w-xl w-full bg-white p-8 rounded-xl shadow-lg border border-gray-100">
                <h1 className="text-xl font-bold mb-6 flex items-center gap-2"><Calculator className="text-blue-600" /> حاسبة متوسط الاستحقاق</h1>

                <div className="space-y-3 mb-6">
                    {items.map((item, idx) => (
                        <div key={idx} className="flex gap-2">
                            <input
                                type="number"
                                placeholder="المبلغ"
                                className="border p-2 rounded w-32"
                                value={item.amount || ''}
                                onChange={e => {
                                    const newItems = [...items];
                                    newItems[idx].amount = Number(e.target.value);
                                    setItems(newItems);
                                }}
                            />
                            <input
                                type="date"
                                className="border p-2 rounded flex-1"
                                value={item.date}
                                onChange={e => {
                                    const newItems = [...items];
                                    newItems[idx].date = e.target.value;
                                    setItems(newItems);
                                }}
                            />
                        </div>
                    ))}
                    <button onClick={() => setItems([...items, { amount: 0, date: '' }])} className="text-xs text-blue-600 underline">+ إضافة سطر</button>
                </div>

                <button onClick={calculate} className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 mb-4">احسب المتوسط</button>

                {avgDate && (
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                        <span className="block text-sm text-gray-500">متوسط تاريخ الاستحقاق هو</span>
                        <span className="text-2xl font-bold text-blue-800 font-mono">{avgDate}</span>
                    </div>
                )}
            </div>
        </div>
    );
};
