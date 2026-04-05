import React, { useState } from 'react';
import { Tag, Save, Plus, Trash2, DollarSign } from 'lucide-react';

export const Pricing = () => {
    const [priceLists, setPriceLists] = useState<any[]>([
        { id: 1, name: 'سعر المستهلك (Retail)', currency: 'ILS', increase_percentage: 0 },
        { id: 2, name: 'سعر الجملة (Wholesale)', currency: 'ILS', increase_percentage: -10 },
        { id: 3, name: 'سعر التصدير (Export)', currency: 'USD', increase_percentage: 5 },
    ]);

    const [current, setCurrent] = useState<any>({});
    const [isEditing, setIsEditing] = useState(false);

    const handleSave = () => {
        if (!current.name) return;
        if (isEditing) {
            setPriceLists(priceLists.map(p => p.id === current.id ? current : p));
        } else {
            setPriceLists([...priceLists, { ...current, id: Date.now() }]);
        }
        setIsEditing(false);
        setCurrent({});
    };

    return (
        <div className="p-6 bg-[#f0f2f5] min-h-screen">
            <h1 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                <Tag className="text-green-600" /> تسعير الأصناف (Price Lists)
            </h1>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-lg shadow-sm h-fit">
                    <h2 className="font-bold text-gray-700 mb-4 border-b pb-2">
                        {isEditing ? 'تعديل قائمة' : 'قائمة أسعار جديدة'}
                    </h2>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm text-gray-600 mb-1">اسم القائمة</label>
                            <input
                                className="w-full p-2 border rounded"
                                placeholder="مثال: سعر الموزع"
                                value={current.name || ''}
                                onChange={e => setCurrent({ ...current, name: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-gray-600 mb-1">العملة الأساسية</label>
                            <select
                                className="w-full p-2 border rounded"
                                value={current.currency || 'ILS'}
                                onChange={e => setCurrent({ ...current, currency: e.target.value })}
                            >
                                <option value="ILS">شيكل (ILS)</option>
                                <option value="USD">دولار (USD)</option>
                                <option value="JOD">دينار (JOD)</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm text-gray-600 mb-1">نسبة الربح/الخصم التلقائي (%)</label>
                            <input
                                type="number"
                                className="w-full p-2 border rounded"
                                placeholder="0"
                                value={current.increase_percentage || ''}
                                onChange={e => setCurrent({ ...current, increase_percentage: parseFloat(e.target.value) })}
                            />
                            <p className="text-xs text-gray-400 mt-1">يُستخدم لحساب السعر تلقائياً من التكلفة</p>
                        </div>
                        <button onClick={handleSave} className="w-full bg-green-600 text-white py-2 rounded font-bold hover:bg-green-700 mt-2">
                            حفظ القائمة
                        </button>
                    </div>
                </div>

                <div className="col-span-2">
                    <div className="grid grid-cols-1 gap-4">
                        {priceLists.map(list => (
                            <div key={list.id} className="bg-white p-4 rounded-lg shadow-sm flex justify-between items-center border-r-4 border-green-500">
                                <div>
                                    <h3 className="font-bold text-lg text-gray-800">{list.name}</h3>
                                    <div className="flex gap-4 text-sm text-gray-500 mt-1">
                                        <span className="flex items-center gap-1"><DollarSign size={14} /> {list.currency}</span>
                                        <span>|</span>
                                        <span dir="ltr">{list.increase_percentage > 0 ? `+${list.increase_percentage}%` : `${list.increase_percentage}%`} Markup</span>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => { setCurrent(list); setIsEditing(true); }} className="px-3 py-1 bg-blue-50 text-blue-600 rounded text-sm font-bold">تعديل</button>
                                    <button onClick={() => setPriceLists(priceLists.filter(p => p.id !== list.id))} className="px-3 py-1 bg-red-50 text-red-600 rounded text-sm font-bold">حذف</button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};
