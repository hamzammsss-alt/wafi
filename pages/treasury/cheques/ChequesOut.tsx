import React, { useState } from 'react';
import { CreditCard } from 'lucide-react';

export const ChequesOut = () => {
    const [checks, setChecks] = useState<any[]>([]);

    React.useEffect(() => {
        const loadChecks = async () => {
            if (window.electronAPI && window.electronAPI.cheques) {
                try {
                    const result = await window.electronAPI.cheques.get({ type: 'OUTGOING' });
                    setChecks(result || []);
                } catch (err) {
                    console.error(err);
                }
            }
        };
        loadChecks();
    }, []);

    return (
        <div className="p-6 bg-gray-50 h-full flex flex-col gap-6" dir="rtl">
            <h1 className="text-2xl font-bold flex items-center gap-2 text-gray-800"><CreditCard className="text-red-600" /> حافظة الشيكات الصادرة</h1>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex-1">
                <table className="w-full text-right">
                    <thead className="bg-gray-100 text-sm font-bold text-gray-600">
                        <tr>
                            <th className="p-4">رقم الشيك</th>
                            <th className="p-4">المستفيد</th>
                            <th className="p-4">المبلغ</th>
                            <th className="p-4">الاستحقاق</th>
                            <th className="p-4">الحالة</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {checks.map(c => (
                            <tr key={c.id} className="hover:bg-gray-50">
                                <td className="p-4 font-mono font-bold">{c.cheque_no}</td>
                                <td className="p-4">{c.partner_name || c.payee_name || '-'}</td>
                                <td className="p-4 font-bold">{Number(c.amount).toLocaleString()}</td>
                                <td className="p-4">{c.cheque_date || c.due_date}</td>
                                <td className="p-4">
                                    <span className={`px-2 py-1 rounded-full text-xs font-bold 
                                        ${c.status === 'CLEARED' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                                        {c.status}
                                    </span>
                                </td>
                            </tr>
                        ))}
                        {checks.length === 0 && (
                            <tr><td colSpan={5} className="p-8 text-center text-gray-500">لا توجد شيكات صادرة</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
