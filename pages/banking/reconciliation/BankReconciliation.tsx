import React, { useState } from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';

export const BankReconciliation = () => {
    const [balance] = useState(150000);
    const [statementBalance, setStatementBalance] = useState(150000);

    return (
        <div className="p-6 bg-gray-50 h-full" dir="rtl">
            <h1 className="text-2xl font-bold mb-6 text-gray-800">مطابقة كشف البنك</h1>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 h-[calc(100%-80px)]">
                {/* System Side */}
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-col">
                    <h3 className="font-bold border-b pb-2 mb-4 text-indigo-700">حركات النظام (الدفتر)</h3>
                    <div className="flex-1 bg-gray-50 rounded p-4 text-center text-gray-400">
                        قائمة الحركات غير المطابقة...
                    </div>
                    <div className="mt-4 font-bold text-right pt-2 border-t">رصيد الدفتر: {balance.toLocaleString()}</div>
                </div>

                {/* Bank Side */}
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-col">
                    <div className="flex justify-between items-center border-b pb-2 mb-4">
                        <h3 className="font-bold text-green-700">كشف البنك</h3>
                        <input type="file" className="text-xs" />
                    </div>
                    <div className="flex-1 bg-gray-50 rounded p-4 text-center text-gray-400">
                        استيراد كشف الحساب (.xls / .csv)
                    </div>
                    <div className="mt-4 font-bold text-right pt-2 border-t flex justify-between items-center">
                        <span>رصيد الكشف:</span>
                        <input type="number" value={statementBalance} className="border rounded w-32 px-1" onChange={e => setStatementBalance(Number(e.target.value))} />
                    </div>
                </div>
            </div>

            <div className={`mt-4 p-4 rounded-xl flex justify-between items-center text-white font-bold
                ${balance === statementBalance ? 'bg-green-600' : 'bg-red-500'}`}>
                <span>الفارق: {Math.abs(balance - statementBalance).toLocaleString()}</span>
                {balance === statementBalance ? <div className="flex items-center gap-2"><CheckCircle2 /> مطابق</div> : <div className="flex items-center gap-2"><XCircle /> غير مطابق</div>}
            </div>
        </div>
    );
};
