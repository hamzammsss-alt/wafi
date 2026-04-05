import React, { useState } from 'react';
import { ArrowRightLeft, Search } from 'lucide-react';

export const ChequeEndorsement = () => {
    const [search, setSearch] = useState('');
    const [selectedCheck, setSelectedCheck] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [payee, setPayee] = useState('');

    const handleSearch = async () => {
        setLoading(true);
        try {
            // Brute force: get all receipts and find number. 
            // Ideally we need getChequeByNo API. get({type:'INCOMING'}) helps.
            const result = await window.electronAPI.cheques.get({ type: 'INCOMING' });
            const found = result.find((c: any) => c.cheque_no === search);

            if (found) {
                setSelectedCheck(found);
            } else {
                alert('شيك غير موجود');
                setSelectedCheck(null);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleEndorse = async () => {
        if (!payee) { alert('اختر المستفيد!'); return; }
        if (!selectedCheck) return;

        try {
            await window.electronAPI.cheques.updateStatus({
                id: selectedCheck.id,
                status: 'ENDORSED',
                date: new Date().toISOString().split('T')[0],
                options: { endorsedTo: payee }
            });
            alert('تم تجيير الشيك بنجاح ✅');
            setSelectedCheck(null);
            setPayee('');
        } catch (err: any) {
            alert(err.message);
        }
    };

    return (
        <div className="p-6 bg-gray-50 h-full flex flex-col items-center justify-center font-sans" dir="rtl">
            <div className="max-w-lg w-full bg-white p-8 rounded-xl shadow-lg border border-gray-100">
                <h2 className="text-2xl font-bold mb-6 flex items-center gap-2 text-gray-800">
                    <ArrowRightLeft className="text-purple-600" /> تجيير شيك
                </h2>

                <div className="flex gap-2 mb-6">
                    <input
                        className="flex-1 border rounded-lg px-4 py-2"
                        placeholder="ابحث برقم الشيك..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                    <button onClick={handleSearch} disabled={loading} className="bg-purple-600 text-white px-4 py-2 rounded-lg">{loading ? '...' : <Search size={20} />}</button>
                </div>

                {selectedCheck && (
                    <div className="bg-purple-50 p-4 rounded-xl border border-purple-100 animate-in fade-in">
                        <div className="mb-4 text-sm text-purple-900">
                            <strong>تفاصيل الشيك:</strong><br />
                            الرقم: {selectedCheck.cheque_no} | البنك: {selectedCheck.bank_name} | المبلغ: {selectedCheck.amount}
                        </div>

                        <label className="block text-sm font-bold text-gray-700 mb-2">تجيير إلى (المستفيد الجديد)</label>
                        <input
                            type="text"
                            className="w-full border rounded-lg p-2 mb-4"
                            placeholder="اسم المستفيد..."
                            value={payee}
                            onChange={e => setPayee(e.target.value)}
                        />
                        {/* Optionally integrate PartnerPicker here */}

                        <button onClick={handleEndorse} className="w-full bg-purple-600 text-white py-2 rounded-lg font-bold hover:bg-purple-700">تأكيد التجيير</button>
                    </div>
                )}
            </div>
        </div>
    );
};
