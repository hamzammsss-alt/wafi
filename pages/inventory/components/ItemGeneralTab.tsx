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
        window.electronAPI.inventory.getBrands().then(setBrands);
        window.electronAPI.inventory.getCategories().then(setCategories);
        window.electronAPI.partner.getPartners('SUPPLIER').then(setSuppliers);
        window.electronAPI.manufacturing.getWorkCenters().then(setWorkCenters);
    }, []);

    const handleChange = (field: keyof Item, value: any) => {
        onChange({ ...data, [field]: value });
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4" dir="rtl">
            {/* Right Column (Code/Name) - First in DOM = Right in RTL */}
            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 text-right">رمز الصنف *</label>
                    <input
                        type="text"
                        value={data.code || ''}
                        onChange={e => handleChange('code', e.target.value)}
                        className="w-full border rounded p-2 focus:ring-blue-500 text-right"
                        dir="ltr"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 text-right">الاسم بالعربي *</label>
                    <input
                        type="text"
                        value={data.name_ar || ''}
                        onChange={e => handleChange('name_ar', e.target.value)}
                        className="w-full border rounded p-2 focus:ring-blue-500 text-right"
                        dir="rtl"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 text-right">الاسم بالإنجليزي</label>
                    <input
                        type="text"
                        value={data.name_en || ''}
                        onChange={e => handleChange('name_en', e.target.value)}
                        className="w-full border rounded p-2 focus:ring-blue-500 text-right"
                        dir="ltr"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 text-right">الاسم التجاري</label>
                    <input
                        type="text"
                        value={data.trade_name || ''}
                        onChange={e => handleChange('trade_name', e.target.value)}
                        className="w-full border rounded p-2 focus:ring-blue-500 text-right"
                    />
                </div>

                <div className="flex space-x-4 space-x-reverse">
                    <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700 mb-1 text-right">المجموعة / الفئة</label>
                        <select
                            value={data.category_id || ''}
                            onChange={e => handleChange('category_id', e.target.value)}
                            className="w-full border rounded p-2 bg-white text-right"
                        >
                            <option value="">اختر المجموعة...</option>
                            {categories.map(c => <option key={c.id} value={c.id}>{c.name_ar}</option>)}
                        </select>
                    </div>
                    <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700 mb-1 text-right">العلامة التجارية</label>
                        <select
                            value={data.brand_id || ''}
                            onChange={e => handleChange('brand_id', e.target.value)}
                            className="w-full border rounded p-2 bg-white text-right"
                        >
                            <option value="">اختر العلامة...</option>
                            {brands.map(b => <option key={b.id} value={b.id}>{b.name_ar}</option>)}
                        </select>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 text-right">المورد الافتراضي</label>
                    <select
                        value={data.default_supplier_id || ''}
                        onChange={e => handleChange('default_supplier_id', e.target.value)}
                        className="w-full border rounded p-2 bg-white text-right"
                    >
                        <option value="">اختر المورد...</option>
                        {suppliers.map(s => <option key={s.id} value={s.id}>{s.name_ar}</option>)}
                    </select>
                </div>
            </div>

            {/* Left Column (Details/Image) - Second in DOM = Left in RTL */}
            <div className="space-y-4">
                <div className="flex space-x-4 space-x-reverse">
                    <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700 mb-1 text-right">نوع الصنف</label>
                        <select
                            value={data.type || 'Goods'}
                            onChange={e => handleChange('type', e.target.value)}
                            className="w-full border rounded p-2 bg-white text-right"
                        >
                            <option value="Goods">سلعة مخزنية (Goods)</option>
                            <option value="Service">خدمة (Service)</option>
                            <option value="Raw Material">مادة خام (Raw Material)</option>
                            <option value="Finished Good">منتج تام (Finished Good)</option>
                            <option value="Asset">أصل ثابت (Asset)</option>
                        </select>
                    </div>
                    <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700 mb-1 text-right">تصنيف / نخب</label>
                        <input
                            type="text"
                            value={data.grade || ''}
                            onChange={e => handleChange('grade', e.target.value)}
                            placeholder="مثال: نخب أول"
                            className="w-full border rounded p-2 focus:ring-blue-500 text-right placeholder-right"
                        />
                    </div>
                </div>

                <div className="flex space-x-4 space-x-reverse">
                    <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700 mb-1 text-right">خط الإنتاج</label>
                        <select
                            value={data.production_line || ''}
                            onChange={e => handleChange('production_line', e.target.value)}
                            className="w-full border rounded p-2 bg-white text-right"
                        >
                            <option value="">اختر خط الإنتاج...</option>
                            {workCenters.map(wc => <option key={wc.id} value={wc.name}>{wc.name}</option>)}
                        </select>
                    </div>
                    <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700 mb-1 text-right">معلومات الكفالة</label>
                        <input
                            type="text"
                            value={data.warranty_info || ''}
                            onChange={e => handleChange('warranty_info', e.target.value)}
                            placeholder="مثال: سنة واحدة"
                            className="w-full border rounded p-2 focus:ring-blue-500 text-right placeholder-right"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 text-right">الوصف</label>
                    <textarea
                        value={data.description || ''}
                        onChange={e => handleChange('description', e.target.value)}
                        className="w-full border rounded p-2 h-24 text-right"
                    />
                </div>

                <div className="border p-4 rounded bg-gray-50 flex flex-col items-center">
                    <label className="block text-sm font-bold mb-2 text-gray-600">صورة الصنف</label>
                    <div className="w-32 h-32 bg-gray-200 rounded mb-2 flex items-center justify-center overflow-hidden">
                        {data.image_url ? (
                            <img src={data.image_url?.startsWith('wafi://') ? data.image_url : `wafi://${data.image_url}`} alt="Item" className="w-full h-full object-cover" />
                        ) : (
                            <span className="text-gray-400">لا توجد صورة</span>
                        )}
                    </div>
                    {/* Placeholder for upload logic */}
                    <button
                        onClick={async () => {
                            document.getElementById('imageUploadInput')?.click();
                        }}
                        className="text-sm text-blue-600 hover:underline"
                    >
                        اختيار صورة...
                    </button>
                    <input
                        type="file"
                        id="imageUploadInput"
                        className="hidden"
                        accept="image/*"
                        onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                                const buffer = await file.arrayBuffer();
                                const result = await window.electronAPI.system.saveImage(buffer, file.name);
                                if (result.success) {
                                    handleChange('image_url', result.path);
                                }
                            }
                        }}
                    />
                </div>

                <div className="flex items-center space-x-2 space-x-reverse pt-4" dir="rtl">
                    <input
                        type="checkbox"
                        id="isActive"
                        checked={!!data.is_active}
                        onChange={e => handleChange('is_active', e.target.checked ? 1 : 0)}
                        className="w-5 h-5 text-blue-600 rounded"
                    />
                    <label htmlFor="isActive" className="text-gray-900 font-medium mr-2">الصنف نشط</label>
                </div>
            </div>
        </div>
    );
};

export default ItemGeneralTab;
