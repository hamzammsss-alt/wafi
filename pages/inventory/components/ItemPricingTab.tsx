import React from 'react';
import { Item } from '../../../types';

interface Props {
    data: Partial<Item>;
    onChange: (data: Partial<Item>) => void;
}

const ItemPricingTab: React.FC<Props> = ({ data, onChange }) => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-4">
            <div className="space-y-4">
                <h3 className="font-bold border-b pb-2">التكلفة والأسعار الأساسية</h3>

                <div>
                    <label className="block text-sm font-medium mb-1 text-red-700">سعر التكلفة (Standard/Avg Cost)</label>
                    <input
                        type="number"
                        value={data.cost_price || 0}
                        onChange={e => onChange({ ...data, cost_price: parseFloat(e.target.value) })}
                        className="w-full border rounded p-2 bg-red-50"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium mb-1 text-green-700">سعر البيع الأساسي</label>
                    <input
                        type="number"
                        value={data.sale_price || 0}
                        onChange={e => onChange({ ...data, sale_price: parseFloat(e.target.value) })}
                        className="w-full border rounded p-2 bg-green-50 font-bold"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium mb-1">أقل سعر بيع مسموح (Min Price)</label>
                    <input
                        type="number"
                        value={data.min_price || 0}
                        onChange={e => onChange({ ...data, min_price: parseFloat(e.target.value) })}
                        className="w-full border rounded p-2"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium mb-1">سعر الأرضية (Floor Price)</label>
                    <input
                        type="number"
                        value={data.floor_price || 0}
                        onChange={e => onChange({ ...data, floor_price: parseFloat(e.target.value) })}
                        className="w-full border rounded p-2"
                    />
                </div>
            </div>

            <div className="space-y-4">
                <h3 className="font-bold border-b pb-2">الضريبة</h3>

                <div>
                    <label className="block text-sm font-medium mb-1">نوع الضريبة</label>
                    <select
                        value={data.tax_type || 'VAT 16%'}
                        onChange={e => onChange({ ...data, tax_type: e.target.value })}
                        className="w-full border rounded p-2 bg-white"
                    >
                        <option value="VAT 16%">ضريبة القيمة المضافة 16%</option>
                        <option value="Zero Rated">صفري (0%)</option>
                        <option value="Exempt">معفي</option>
                    </select>
                </div>

                <div className="flex items-center space-x-2 space-x-reverse pt-2">
                    <input
                        type="checkbox"
                        id="taxIncluded"
                        checked={!!data.tax_included}
                        onChange={e => onChange({ ...data, tax_included: e.target.checked ? 1 : 0 })}
                        className="w-5 h-5 rounded border-gray-300 text-blue-600"
                    />
                    <label htmlFor="taxIncluded" className="text-gray-700">السعر شامل الضريبة</label>
                </div>

                <div className="mt-8 bg-blue-50 p-4 rounded border border-blue-100">
                    <p className="text-sm text-blue-800">
                        ملاحظة: قوائم الأسعار المتقدمة (جملة، تجزئة، VIP) سيتم إدارتها في تحديث قادم.
                        حالياً يتم الاعتماد على السعر الأساسي.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default ItemPricingTab;
