import React, { useEffect, useState } from 'react';
import { Item, Brand } from '../../../types';

interface Props {
    data: Partial<Item>;
    onChange: (data: Partial<Item>) => void;
}

const ItemGeneralTab: React.FC<Props> = ({ data, onChange }) => {
    const [brands, setBrands] = useState<Brand[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    const [suppliers, setSuppliers] = useState<any[]>([]);
    const [workCenters, setWorkCenters] = useState<any[]>([]);

    useEffect(() => {
        void Promise.all([
            window.electronAPI.inventory.getBrands().then(setBrands),
            window.electronAPI.inventory.getCategories().then(setCategories),
            window.electronAPI.partner.getPartners('SUPPLIER').then(setSuppliers),
            window.electronAPI.manufacturing.getWorkCenters().then(setWorkCenters),
        ]).catch((error) => {
            console.error('Failed to load item master references', error);
        });
    }, []);

    const handleChange = (field: keyof Item, value: any) => {
        onChange({ ...data, [field]: value });
    };

    return (
        <div className="space-y-6 p-4" dir="rtl">
            <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
                <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="mb-5">
                        <h3 className="text-lg font-black text-slate-800">الهوية الأساسية</h3>
                        <p className="mt-1 text-sm text-slate-500">الرقم، الأسماء، والتصنيف الرئيسي للصنف.</p>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                        <label className="block">
                            <span className="mb-1 block text-sm font-semibold text-slate-700">رقم الصنف *</span>
                            <input
                                type="text"
                                value={data.code || ''}
                                onChange={(e) => handleChange('code', e.target.value)}
                                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left text-slate-800 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                                dir="ltr"
                            />
                        </label>

                        <label className="block">
                            <span className="mb-1 block text-sm font-semibold text-slate-700">نوع الصنف</span>
                            <select
                                value={data.type || 'Goods'}
                                onChange={(e) => handleChange('type', e.target.value)}
                                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-800 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                            >
                                <option value="Goods">بضاعة وخدمات</option>
                                <option value="Service">خدمي</option>
                                <option value="Raw Material">مواد أولية</option>
                                <option value="Finished Good">منتج تام</option>
                                <option value="Asset">موجودات ثابتة</option>
                            </select>
                        </label>

                        <label className="block md:col-span-2">
                            <span className="mb-1 block text-sm font-semibold text-slate-700">الاسم بالعربية *</span>
                            <input
                                type="text"
                                value={data.name_ar || ''}
                                onChange={(e) => handleChange('name_ar', e.target.value)}
                                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-800 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                                dir="rtl"
                            />
                        </label>

                        <label className="block">
                            <span className="mb-1 block text-sm font-semibold text-slate-700">الاسم English</span>
                            <input
                                type="text"
                                value={data.name_en || ''}
                                onChange={(e) => handleChange('name_en', e.target.value)}
                                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left text-slate-800 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                                dir="ltr"
                            />
                        </label>

                        <label className="block">
                            <span className="mb-1 block text-sm font-semibold text-slate-700">الاسم بالعبرية</span>
                            <input
                                type="text"
                                value={data.name_he || ''}
                                onChange={(e) => handleChange('name_he', e.target.value)}
                                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left text-slate-800 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                                dir="rtl"
                            />
                        </label>

                        <label className="block md:col-span-2">
                            <span className="mb-1 block text-sm font-semibold text-slate-700">الاسم التجاري</span>
                            <input
                                type="text"
                                value={data.trade_name || ''}
                                onChange={(e) => handleChange('trade_name', e.target.value)}
                                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-800 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                            />
                        </label>
                    </div>
                </section>

                <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="mb-5">
                        <h3 className="text-lg font-black text-slate-800">المعايير والربط</h3>
                        <p className="mt-1 text-sm text-slate-500">الفئة، العلامة، المورد، وخط الإنتاج الافتراضي.</p>
                    </div>

                    <div className="space-y-4">
                        <label className="block">
                            <span className="mb-1 block text-sm font-semibold text-slate-700">مجموعة الصنف</span>
                            <select
                                value={data.category_id || ''}
                                onChange={(e) => handleChange('category_id', e.target.value)}
                                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-800 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                            >
                                <option value="">اختر المجموعة</option>
                                {categories.map((category) => (
                                    <option key={category.id} value={category.id}>{category.name_ar}</option>
                                ))}
                            </select>
                        </label>

                        <label className="block">
                            <span className="mb-1 block text-sm font-semibold text-slate-700">العلامة التجارية</span>
                            <select
                                value={data.brand_id || ''}
                                onChange={(e) => handleChange('brand_id', e.target.value)}
                                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-800 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                            >
                                <option value="">اختر العلامة</option>
                                {brands.map((brand) => (
                                    <option key={brand.id} value={brand.id}>{brand.name_ar}</option>
                                ))}
                            </select>
                        </label>

                        <label className="block">
                            <span className="mb-1 block text-sm font-semibold text-slate-700">المورد الافتراضي</span>
                            <select
                                value={data.default_supplier_id || ''}
                                onChange={(e) => handleChange('default_supplier_id', e.target.value)}
                                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-800 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                            >
                                <option value="">اختر المورد</option>
                                {suppliers.map((supplier) => (
                                    <option key={supplier.id} value={supplier.id}>{supplier.name_ar}</option>
                                ))}
                            </select>
                        </label>

                        <label className="block">
                            <span className="mb-1 block text-sm font-semibold text-slate-700">خط الإنتاج</span>
                            <select
                                value={data.production_line || ''}
                                onChange={(e) => handleChange('production_line', e.target.value)}
                                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-800 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                            >
                                <option value="">اختر خط الإنتاج</option>
                                {workCenters.map((workCenter) => (
                                    <option key={workCenter.id} value={workCenter.name}>{workCenter.name}</option>
                                ))}
                            </select>
                        </label>

                        <div className="grid gap-4 md:grid-cols-2">
                            <label className="block">
                                <span className="mb-1 block text-sm font-semibold text-slate-700">الدرجة</span>
                                <input
                                    type="text"
                                    value={data.grade || ''}
                                    onChange={(e) => handleChange('grade', e.target.value)}
                                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-800 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                                />
                            </label>

                            <label className="block">
                                <span className="mb-1 block text-sm font-semibold text-slate-700">الكفالة</span>
                                <input
                                    type="text"
                                    value={data.warranty_info || ''}
                                    onChange={(e) => handleChange('warranty_info', e.target.value)}
                                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-800 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                                />
                            </label>
                        </div>
                    </div>
                </section>
            </div>

            <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
                <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                    <h3 className="text-lg font-black text-slate-800">الوصف</h3>
                    <p className="mt-1 text-sm text-slate-500">وصف تشغيلي يساعد المستخدمين في البحث والتعامل مع الصنف.</p>

                    <textarea
                        value={data.description || ''}
                        onChange={(e) => handleChange('description', e.target.value)}
                        className="mt-4 h-40 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-800 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                    />
                </section>

                <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                    <h3 className="text-lg font-black text-slate-800">الصورة والحالة</h3>
                    <p className="mt-1 text-sm text-slate-500">صورة مرجعية وحالة تفعيل الصنف داخل النظام.</p>

                    <div className="mt-4 flex flex-col items-center rounded-3xl border border-dashed border-slate-200 bg-slate-50 px-4 py-5">
                        <div className="mb-3 flex h-36 w-36 items-center justify-center overflow-hidden rounded-3xl bg-slate-200">
                            {data.image_url ? (
                                <img
                                    src={data.image_url?.startsWith('wafi://') ? data.image_url : `wafi://${data.image_url}`}
                                    alt="Item"
                                    className="h-full w-full object-cover"
                                />
                            ) : (
                                <span className="text-sm text-slate-400">لا توجد صورة</span>
                            )}
                        </div>

                        <button
                            type="button"
                            onClick={() => document.getElementById('item-image-upload')?.click()}
                            className="rounded-2xl border border-sky-200 bg-white px-4 py-2 text-sm font-semibold text-sky-700 transition hover:bg-sky-50"
                        >
                            اختيار صورة
                        </button>

                        <input
                            type="file"
                            id="item-image-upload"
                            className="hidden"
                            accept="image/*"
                            onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                const buffer = await file.arrayBuffer();
                                const result = await window.electronAPI.system.saveImage(buffer, file.name);
                                if (result.success) {
                                    handleChange('image_url', result.path);
                                }
                            }}
                        />

                        <label className="mt-5 flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3">
                            <div>
                                <div className="text-sm font-semibold text-slate-700">الصنف فعال</div>
                                <div className="text-xs text-slate-500">يظهر في البحث والسندات وشاشات الحركة.</div>
                            </div>
                            <input
                                type="checkbox"
                                checked={!!data.is_active}
                                onChange={(e) => handleChange('is_active', e.target.checked ? 1 : 0)}
                                className="h-5 w-5 rounded border-slate-300 text-sky-600 focus:ring-sky-400"
                            />
                        </label>
                    </div>
                </section>
            </div>
        </div>
    );
};

export default ItemGeneralTab;
