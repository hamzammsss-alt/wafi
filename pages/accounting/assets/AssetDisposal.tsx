import React, { useState } from 'react';
import { Trash2, Search, DollarSign, AlertCircle } from 'lucide-react';

export const AssetDisposal = () => {
    const [assetCode, setAssetCode] = useState('');
    const [assetData, setAssetData] = useState<any>(null);
    const [disposalDate, setDisposalDate] = useState(new Date().toISOString().split('T')[0]);
    const [saleAmount, setSaleAmount] = useState(0);
    const [disposalType, setDisposalType] = useState('Sale'); // Sale or Scrap

    const handleSearch = () => {
        // Mock search
        if (assetCode === 'AST001') {
            setAssetData({
                id: 1, name: 'سيارة نقل', cost: 50000, accumulated: 20000, book_value: 30000
            });
        } else {
            alert('أصل غير موجود');
            setAssetData(null);
        }
    };

    const gainLoss = saleAmount - (assetData?.book_value || 0);

    return (
        <div className="p-6 bg-gray-50 h-full font-sans" dir="rtl">
            <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="bg-red-50 p-4 border-b border-red-100 flex items-center gap-3">
                    <div className="bg-white p-2 rounded-full text-red-600 shadow-sm">
                        <Trash2 size={20} />
                    </div>
                    <div>
                        <h1 className="text-lg font-bold text-red-800">استبعاد / بيع أصل ثابت</h1>
                        <p className="text-xs text-red-600">إخراج الأصل من الخدمة واحتساب الأرباح/الخسائر الرأسمالية</p>
                    </div>
                </div>

                <div className="p-6 space-y-6">
                    {/* Step 1: Search */}
                    <div className="flex gap-4 items-end">
                        <div className="flex-1">
                            <label className="block text-sm font-bold text-gray-700 mb-1">رمز الأصل</label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={assetCode}
                                    onChange={e => setAssetCode(e.target.value)}
                                    placeholder="ادخل رمز الأصل..."
                                    className="flex-1 border rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500 outline-none"
                                />
                                <button onClick={handleSearch} className="bg-gray-100 px-4 py-2 rounded-lg hover:bg-gray-200">
                                    <Search size={20} />
                                </button>
                            </div>
                        </div>
                    </div>

                    {assetData && (
                        <div className="animate-in fade-in slide-in-from-top-4 duration-300">
                            {/* Asset Info Card */}
                            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 mb-6 flex justify-between items-center">
                                <div>
                                    <h3 className="font-bold text-lg text-gray-800">{assetData.name}</h3>
                                    <div className="text-sm text-gray-500 mt-1 flex gap-4">
                                        <span>التكلفة: <span className="font-mono text-gray-800">{assetData.cost.toLocaleString()}</span></span>
                                        <span>مجمع الإهلاك: <span className="font-mono text-gray-800">{assetData.accumulated.toLocaleString()}</span></span>
                                    </div>
                                </div>
                                <div className="text-center">
                                    <span className="text-xs text-gray-500 block">صافي القيمة الدفترية</span>
                                    <span className="font-bold text-2xl text-indigo-600 font-mono">{assetData.book_value.toLocaleString()}</span>
                                </div>
                            </div>

                            {/* Disposal Form */}
                            <div className="grid grid-cols-2 gap-6 mb-6">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">نوع العملية</label>
                                    <select
                                        value={disposalType}
                                        onChange={e => setDisposalType(e.target.value)}
                                        className="w-full border rounded-lg px-3 py-2"
                                    >
                                        <option value="Sale">بيع (Sale)</option>
                                        <option value="Scrap">تكهين (Scrap)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">تاريخ الاستبعاد</label>
                                    <input
                                        type="date"
                                        value={disposalDate}
                                        onChange={e => setDisposalDate(e.target.value)}
                                        className="w-full border rounded-lg px-3 py-2"
                                    />
                                </div>
                                {disposalType === 'Sale' && (
                                    <div className="col-span-2">
                                        <label className="block text-sm font-bold text-gray-700 mb-1">قيمة البيع (إن وجدت)</label>
                                        <div className="relative">
                                            <input
                                                type="number"
                                                value={saleAmount}
                                                onChange={e => setSaleAmount(Number(e.target.value))}
                                                className="w-full border rounded-lg px-3 py-2 pl-10 font-mono"
                                            />
                                            <DollarSign className="absolute left-3 top-2.5 text-gray-400" size={16} />
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Calculation Result */}
                            <div className={`p-4 rounded-xl border flex items-center gap-4 ${gainLoss >= 0 ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
                                <AlertCircle size={24} />
                                <div>
                                    <p className="text-sm font-bold">{gainLoss >= 0 ? 'ربح رأسمالي محقق' : 'خسارة رأسمالية'}</p>
                                    <p className="text-2xl font-mono font-bold mt-1">{Math.abs(gainLoss).toLocaleString()} ₪</p>
                                </div>
                            </div>

                            <div className="mt-8">
                                <button className="w-full bg-red-600 text-white py-3 rounded-lg font-bold hover:bg-red-700 shadow-lg shadow-red-100 transition">
                                    تأكيد الاستبعاد وإنشاء القيد
                                </button>
                            </div>

                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
