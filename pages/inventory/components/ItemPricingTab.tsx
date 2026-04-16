import React, { useEffect, useMemo, useState } from 'react';
import { Item, ItemPrice, Unit } from '../../../types';
import { Plus, Trash2 } from 'lucide-react';

interface Props {
    data: Partial<Item>;
    onChange: (data: Partial<Item>) => void;
}

interface PriceListOption {
    id: string;
    name_ar?: string;
    name_en?: string;
}

const TAX_OPTIONS = [
    { value: 'VAT_16', label: 'ضريبة القيمة المضافة 16%' },
    { value: 'ZERO_RATED', label: 'صفرية' },
    { value: 'EXEMPT', label: 'معفى' },
];

const ItemPricingTab: React.FC<Props> = ({ data, onChange }) => {
    const [units, setUnits] = useState<Unit[]>([]);
    const [priceLists, setPriceLists] = useState<PriceListOption[]>([]);

    useEffect(() => {
        void Promise.all([
            window.electronAPI.inventory.getUnits().then((rows) => setUnits(Array.isArray(rows) ? rows : [])),
            window.electronAPI.partner.getPriceLists().then((rows) => setPriceLists(Array.isArray(rows) ? rows : [])),
        ]).catch((error) => {
            console.error('Failed to load pricing references', error);
        });
    }, []);

    const margin = useMemo(() => {
        const cost = Number(data.cost_price ?? 0);
        const sale = Number(data.sale_price ?? 0);
        if (cost <= 0) return null;
        return ((sale - cost) / cost) * 100;
    }, [data.cost_price, data.sale_price]);

    const selectableUnits = useMemo(() => {
        const ids = new Set<string>();
        const rows: Unit[] = [];

        for (const unit of units) {
            if (!unit?.id || ids.has(unit.id)) continue;
            ids.add(unit.id);
            rows.push(unit);
        }

        return rows;
    }, [units]);

    const updatePriceRow = (index: number, patch: Partial<ItemPrice>) => {
        const next = [...(data.prices || [])];
        next[index] = { ...next[index], ...patch } as ItemPrice;
        onChange({ ...data, prices: next });
    };

    const addPriceRow = () => {
        const fallbackUnitId = data.base_unit_id || selectableUnits[0]?.id || '';
        const fallbackListId = priceLists[0]?.id || '';

        onChange({
            ...data,
            prices: [
                ...(data.prices || []),
                {
                    id: `${Date.now()}`,
                    item_id: data.id || '',
                    price_list_id: fallbackListId,
                    unit_id: fallbackUnitId,
                    price: Number(data.sale_price ?? 0),
                },
            ],
        });
    };

    const removePriceRow = (index: number) => {
        const next = [...(data.prices || [])];
        next.splice(index, 1);
        onChange({ ...data, prices: next });
    };

    return (
        <div className="space-y-6 p-4" dir="rtl">
            <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
                <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="mb-5 flex items-start justify-between gap-3">
                        <div>
                            <h3 className="text-lg font-black text-slate-800">التسعير الأساسي</h3>
                            <p className="mt-1 text-sm text-slate-500">سعر التكلفة والبيع وحدود الصلاحية التجارية للصنف.</p>
                        </div>
                        <div className="rounded-2xl bg-slate-100 px-3 py-2 text-xs font-bold text-slate-600">
                            {margin == null ? 'الهامش غير محسوب' : `هامش الربح ${margin.toFixed(1)}%`}
                        </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                        <label className="block">
                            <span className="mb-1 block text-sm font-semibold text-slate-700">سعر التكلفة</span>
                            <input
                                type="number"
                                value={data.cost_price || 0}
                                onChange={(e) => onChange({ ...data, cost_price: parseFloat(e.target.value) || 0 })}
                                className="w-full rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-slate-800 outline-none transition focus:border-rose-400 focus:ring-2 focus:ring-rose-100"
                            />
                        </label>

                        <label className="block">
                            <span className="mb-1 block text-sm font-semibold text-slate-700">سعر البيع الأساسي</span>
                            <input
                                type="number"
                                value={data.sale_price || 0}
                                onChange={(e) => onChange({ ...data, sale_price: parseFloat(e.target.value) || 0 })}
                                className="w-full rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 font-bold text-emerald-800 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                            />
                        </label>

                        <label className="block">
                            <span className="mb-1 block text-sm font-semibold text-slate-700">أقل سعر مسموح</span>
                            <input
                                type="number"
                                value={data.min_price || 0}
                                onChange={(e) => onChange({ ...data, min_price: parseFloat(e.target.value) || 0 })}
                                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-800 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                            />
                        </label>

                        <label className="block">
                            <span className="mb-1 block text-sm font-semibold text-slate-700">سعر الأرضية</span>
                            <input
                                type="number"
                                value={data.floor_price || 0}
                                onChange={(e) => onChange({ ...data, floor_price: parseFloat(e.target.value) || 0 })}
                                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-800 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                            />
                        </label>

                        <label className="block">
                            <span className="mb-1 block text-sm font-semibold text-slate-700">التكلفة المعيارية</span>
                            <input
                                type="number"
                                value={data.standard_cost || 0}
                                onChange={(e) => onChange({ ...data, standard_cost: parseFloat(e.target.value) || 0 })}
                                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-800 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                            />
                        </label>

                        <label className="block">
                            <span className="mb-1 block text-sm font-semibold text-slate-700">سعر الجملة</span>
                            <input
                                type="number"
                                value={data.wholesale_price || 0}
                                onChange={(e) => onChange({ ...data, wholesale_price: parseFloat(e.target.value) || 0 })}
                                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-800 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                            />
                        </label>
                    </div>
                </section>

                <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                    <h3 className="text-lg font-black text-slate-800">الضريبة والسياسة السعرية</h3>
                    <p className="mt-1 text-sm text-slate-500">إعداد الضريبة الافتراضية وكيفية عرض السعر على المستندات.</p>

                    <div className="mt-5 space-y-4">
                        <label className="block">
                            <span className="mb-1 block text-sm font-semibold text-slate-700">نوع الضريبة</span>
                            <select
                                value={data.tax_type || 'VAT_16'}
                                onChange={(e) => onChange({ ...data, tax_type: e.target.value })}
                                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-800 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                            >
                                {TAX_OPTIONS.map((option) => (
                                    <option key={option.value} value={option.value}>{option.label}</option>
                                ))}
                            </select>
                        </label>

                        <label className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                            <div>
                                <div className="text-sm font-semibold text-slate-700">السعر شامل الضريبة</div>
                                <div className="text-xs text-slate-500">يستخدم السعر النهائي مباشرة داخل الفواتير.</div>
                            </div>
                            <input
                                type="checkbox"
                                checked={!!data.tax_included}
                                onChange={(e) => onChange({ ...data, tax_included: e.target.checked ? 1 : 0 })}
                                className="h-5 w-5 rounded border-slate-300 text-sky-600 focus:ring-sky-400"
                            />
                        </label>

                        <div className="rounded-2xl border border-sky-100 bg-sky-50/80 p-4 text-sm text-sky-900">
                            <div className="font-bold">ملخص سريع</div>
                            <div className="mt-2 grid gap-2 text-xs text-sky-800 md:grid-cols-2">
                                <div>البيع الأساسي: {Number(data.sale_price || 0).toFixed(2)}</div>
                                <div>التكلفة: {Number(data.cost_price || 0).toFixed(2)}</div>
                                <div>أقل سعر: {Number(data.min_price || 0).toFixed(2)}</div>
                                <div>سعر الأرضية: {Number(data.floor_price || 0).toFixed(2)}</div>
                            </div>
                        </div>
                    </div>
                </section>
            </div>

            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h3 className="text-lg font-black text-slate-800">قوائم الأسعار</h3>
                        <p className="mt-1 text-sm text-slate-500">إدارة أسعار الصنف حسب قائمة السعر والوحدة مباشرة من بطاقة الصنف.</p>
                    </div>
                    <button
                        type="button"
                        onClick={addPriceRow}
                        className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-sky-600 to-cyan-500 px-4 py-2 text-sm font-bold text-white shadow-lg shadow-sky-900/15 transition hover:brightness-105"
                    >
                        <Plus size={16} />
                        <span>إضافة سعر</span>
                    </button>
                </div>

                <div className="overflow-hidden rounded-2xl border border-slate-200">
                    <table className="w-full border-separate border-spacing-0 text-right text-sm">
                        <thead className="bg-slate-50 text-slate-600">
                            <tr>
                                <th className="border-b border-slate-200 px-4 py-3 font-bold">قائمة السعر</th>
                                <th className="border-b border-slate-200 px-4 py-3 font-bold">الوحدة</th>
                                <th className="border-b border-slate-200 px-4 py-3 font-bold">السعر</th>
                                <th className="border-b border-slate-200 px-4 py-3 font-bold w-20">إجراء</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(data.prices || []).map((row, index) => (
                                <tr key={row.id || `${row.price_list_id}-${row.unit_id}-${index}`} className="bg-white">
                                    <td className="border-b border-slate-100 px-3 py-2">
                                        <select
                                            value={row.price_list_id || ''}
                                            onChange={(e) => updatePriceRow(index, { price_list_id: e.target.value })}
                                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                                        >
                                            <option value="">اختر قائمة السعر</option>
                                            {priceLists.map((list) => (
                                                <option key={list.id} value={list.id}>
                                                    {list.name_ar || list.name_en || list.id}
                                                </option>
                                            ))}
                                        </select>
                                    </td>
                                    <td className="border-b border-slate-100 px-3 py-2">
                                        <select
                                            value={row.unit_id || ''}
                                            onChange={(e) => updatePriceRow(index, { unit_id: e.target.value })}
                                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                                        >
                                            <option value="">اختر الوحدة</option>
                                            {selectableUnits.map((unit) => (
                                                <option key={unit.id} value={unit.id}>
                                                    {unit.name_ar || unit.name_en || unit.code || unit.id}
                                                </option>
                                            ))}
                                        </select>
                                    </td>
                                    <td className="border-b border-slate-100 px-3 py-2">
                                        <input
                                            type="number"
                                            value={row.price || 0}
                                            onChange={(e) => updatePriceRow(index, { price: parseFloat(e.target.value) || 0 })}
                                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 font-bold text-slate-800 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                                        />
                                    </td>
                                    <td className="border-b border-slate-100 px-3 py-2 text-center">
                                        <button
                                            type="button"
                                            onClick={() => removePriceRow(index)}
                                            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-rose-200 text-rose-600 transition hover:bg-rose-50"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))}

                            {(data.prices || []).length === 0 && (
                                <tr>
                                    <td colSpan={4} className="px-4 py-10 text-center text-sm text-slate-400">
                                        لا توجد أسعار خاصة بقوائم الأسعار بعد.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </section>
        </div>
    );
};

export default ItemPricingTab;
