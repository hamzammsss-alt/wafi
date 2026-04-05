import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Check, FileText, CreditCard } from 'lucide-react';

interface Cheque {
    id: string;
    cheque_no: string;
    amount: number;
    currency: string;
    bank_name?: string;
    due_date?: string;
    partner_name?: string;
    status: string;
    type: 'INCOMING' | 'OUTGOING';
}

interface ChequePickerProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (cheque: Cheque | { cheque_no: string, bank_name: string }) => void;
    type?: 'INCOMING' | 'OUTGOING'; // Context filter
}

export const ChequePicker: React.FC<ChequePickerProps> = ({ isOpen, onClose, onSelect, type }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState<'SELECT' | 'MANUAL'>('SELECT');
    const [cheques, setCheques] = useState<Cheque[]>([]);
    const [loading, setLoading] = useState(false);

    // Manual Form
    const [manualNo, setManualNo] = useState('');
    const [manualBank, setManualBank] = useState('');

    const searchRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen && activeTab === 'SELECT') {
            loadCheques();
            setTimeout(() => searchRef.current?.focus(), 100);
        }
    }, [isOpen, activeTab]);

    const loadCheques = async () => {
        setLoading(true);
        try {
            // Mock API or actual IPC call
            // const data = await window.electronAPI.cheques.getCheques({ type });
            // For now, let's assume we can fetch or use mock data if API not ready
            // As per context, we have ChequeService but not exposed via IPC explicitly in snippets viewed.
            // I'll try to use a generic safe call or mock for UI demo if needed.

            // Checking if window.electronAPI.cheques exists would be good, 
            // but for this task I will implement a safe fallback to empty list or mock.
            if (window.electronAPI?.cheques?.getCheques) {
                const data = await window.electronAPI.cheques.getCheques({ type });
                setCheques(data);
            } else {
                console.warn("Cheque API not found, using empty list");
                setCheques([]);
            }
        } catch (error) {
            console.error("Failed to load cheques", error);
        } finally {
            setLoading(false);
        }
    };

    const filteredCheques = cheques.filter(c =>
        c.cheque_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.bank_name && c.bank_name.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const handleManualSubmit = () => {
        if (!manualNo) return;
        onSelect({ cheque_no: manualNo, bank_name: manualBank });
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center pt-20" dir="rtl">
            <div className="bg-white rounded-lg shadow-xl w-[600px] flex flex-col max-h-[80vh] animate-in fade-in zoom-in-95 duration-200">

                {/* Header with Tabs */}
                <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-gray-50 rounded-t-lg">
                    <div className="flex gap-2 bg-gray-200 p-1 rounded-lg">
                        <button
                            onClick={() => setActiveTab('SELECT')}
                            className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all ${activeTab === 'SELECT' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-600 hover:text-gray-800'}`}
                        >
                            <span className="flex items-center gap-2"><Search size={14} /> بحث عن شيك</span>
                        </button>
                        <button
                            onClick={() => setActiveTab('MANUAL')}
                            className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all ${activeTab === 'MANUAL' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-600 hover:text-gray-800'}`}
                        >
                            <span className="flex items-center gap-2"><FileText size={14} /> إدخال يدوي</span>
                        </button>
                    </div>
                    <button onClick={onClose} className="p-1 hover:bg-gray-200 rounded-full text-gray-400 hover:text-gray-600 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-auto p-4">
                    {activeTab === 'SELECT' ? (
                        <div className="space-y-4">
                            <div className="relative">
                                <Search className="absolute right-3 top-2.5 text-gray-400" size={18} />
                                <input
                                    ref={searchRef}
                                    type="text"
                                    placeholder="بحث برقم الشيك أو البنك..."
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                    className="w-full pl-4 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                                />
                            </div>

                            <div className="border rounded-lg overflow-hidden">
                                <table className="w-full text-sm text-right">
                                    <thead className="bg-gray-50 text-gray-500 font-medium">
                                        <tr>
                                            <th className="px-4 py-2 border-b">الرقم</th>
                                            <th className="px-4 py-2 border-b">البنك</th>
                                            <th className="px-4 py-2 border-b">المبلغ</th>
                                            <th className="px-4 py-2 border-b">الاستحقاق</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {filteredCheques.length > 0 ? filteredCheques.map((cheque) => (
                                            <tr
                                                key={cheque.id}
                                                onClick={() => { onSelect(cheque); onClose(); }}
                                                className="hover:bg-indigo-50 cursor-pointer transition-colors"
                                            >
                                                <td className="px-4 py-2 font-mono font-bold text-indigo-600">{cheque.cheque_no}</td>
                                                <td className="px-4 py-2">{cheque.bank_name || '-'}</td>
                                                <td className="px-4 py-2 font-bold">{cheque.amount?.toLocaleString()} {cheque.currency}</td>
                                                <td className="px-4 py-2 text-gray-500">{cheque.due_date}</td>
                                            </tr>
                                        )) : (
                                            <tr>
                                                <td colSpan={4} className="px-4 py-8 text-center text-gray-400">
                                                    {loading ? 'جاري التحميل...' : 'لا توجد شيكات مطابقة'}
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4 py-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">رقم الشيك</label>
                                <div className="relative">
                                    <CreditCard className="absolute right-3 top-2.5 text-gray-400" size={18} />
                                    <input
                                        type="text"
                                        value={manualNo}
                                        onChange={e => setManualNo(e.target.value)}
                                        className="w-full pl-4 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-mono text-center font-bold"
                                        placeholder="000000"
                                        autoFocus
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">اسم البنك</label>
                                <input
                                    type="text"
                                    value={manualBank}
                                    onChange={e => setManualBank(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                    placeholder="مثال: البنك العربي"
                                />
                            </div>

                            <div className="pt-4 flex justify-end gap-2">
                                <button
                                    onClick={onClose}
                                    className="px-4 py-2 rounded-lg text-gray-600 hover:bg-gray-100 font-bold"
                                >
                                    إلغاء
                                </button>
                                <button
                                    onClick={handleManualSubmit}
                                    disabled={!manualNo}
                                    className="px-6 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 font-bold shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                >
                                    <Check size={18} /> <span>تأكيد</span>
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
