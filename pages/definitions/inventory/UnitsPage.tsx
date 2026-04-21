import React, { useEffect, useMemo, useState } from 'react';
import { Ruler, Plus, Search, Trash2, X, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { Unit } from '../../../types';
import {
    UnitCalculationMode,
    getUnitCalculationMode,
    getUnitCalculationRequirements,
    getUnitFormulaHint,
    inferUnitCalculationMode,
} from '../../../src/lib/unit-calculations';

const UNIT_TYPE_OPTIONS = ['كمية', 'وزن', 'مساحة', 'حجم', 'وقت', 'طول'];
const CALCULATION_MODE_OPTIONS: Array<{ value: UnitCalculationMode; label: string }> = [
    { value: 'MANUAL', label: 'إدخال يدوي' },
    { value: 'LINEAR', label: 'طولي' },
    { value: 'AREA', label: 'مساحة' },
    { value: 'VOLUME', label: 'حجم' },
];

export const UnitsPage = () => {
    const [units, setUnits] = useState<Unit[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [isAdding, setIsAdding] = useState(false);

    const [formData, setFormData] = useState({
        name_ar: '',
        name_en: '',
        name_he: '',
        code: '',
        is_active: true,
        is_used: false,
        unit_type: 'كمية',
        parent_unit_id: '',
        level_no: 1,
        symbol_ar: '',
        symbol_en: '',
        symbol_he: '',
        multiplier: 1,
        total_factor: 1,
        calculation_mode: 'MANUAL' as UnitCalculationMode,
    });

    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        void loadUnits();
    }, []);

    const loadUnits = async () => {
        try {
            setLoading(true);
            const data = await window.electronAPI.inventory.getUnits();
            setUnits(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error(err);
            setError('فشل في تحميل البيانات');
        } finally {
            setLoading(false);
        }
    };

    const parentById = useMemo(() => new Map(units.map((u) => [u.id, u])), [units]);
    const calculationRequirements = useMemo(
        () => getUnitCalculationRequirements(formData.calculation_mode),
        [formData.calculation_mode],
    );
    const formulaHint = useMemo(
        () => getUnitFormulaHint(formData.calculation_mode),
        [formData.calculation_mode],
    );

    useEffect(() => {
        const parent = parentById.get(formData.parent_unit_id);
        const parentFactor = Number(parent?.total_factor || 1);
        const multiplier = Number(formData.multiplier || 1);
        const total = formData.parent_unit_id ? parentFactor * multiplier : multiplier;
        if (Number(formData.total_factor) !== Number(total)) {
            setFormData((prev) => ({ ...prev, total_factor: total }));
        }
    }, [formData.parent_unit_id, formData.multiplier, formData.total_factor, parentById]);

    useEffect(() => {
        const inferredMode = inferUnitCalculationMode({
            code: formData.code,
            name_ar: formData.name_ar,
            name_en: formData.name_en,
            unit_type: formData.unit_type,
        });

        if (inferredMode !== 'MANUAL' && formData.calculation_mode === 'MANUAL') {
            setFormData((prev) => ({
                ...prev,
                calculation_mode: inferredMode,
            }));
        }
    }, [formData.code, formData.name_ar, formData.name_en, formData.unit_type, formData.calculation_mode]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!formData.name_ar.trim()) {
            setError('اسم الوحدة (عربي) مطلوب');
            return;
        }

        if (!formData.code.trim()) {
            setError('الرقم/الرمز مطلوب');
            return;
        }

        try {
            setSaving(true);
            await window.electronAPI.inventory.createUnit({
                ...formData,
                code: formData.code.toUpperCase(),
                is_active: formData.is_active ? 1 : 0,
                is_used: formData.is_used ? 1 : 0,
                calculation_mode: formData.calculation_mode,
                requires_length: calculationRequirements.requiresLength ? 1 : 0,
                requires_width: calculationRequirements.requiresWidth ? 1 : 0,
                requires_height: calculationRequirements.requiresHeight ? 1 : 0,
                requires_count: calculationRequirements.requiresCount ? 1 : 0,
                formula_hint: formulaHint,
            });

            setIsAdding(false);
            setFormData({
                name_ar: '',
                name_en: '',
                name_he: '',
                code: '',
                is_active: true,
                is_used: false,
                unit_type: 'كمية',
                parent_unit_id: '',
                level_no: 1,
                symbol_ar: '',
                symbol_en: '',
                symbol_he: '',
                multiplier: 1,
                total_factor: 1,
                calculation_mode: 'MANUAL',
            });
            await loadUnits();
        } catch (err) {
            console.error(err);
            setError('حدث خطأ أثناء الحفظ. حاول مرة أخرى.');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('هل أنت متأكد من حذف هذه الوحدة؟')) return;

        try {
            await window.electronAPI.inventory.deleteUnit(id);
            await loadUnits();
        } catch (err) {
            console.error(err);
            alert('فشل في الحذف');
        }
    };

    const filteredUnits = units.filter((u) =>
        (u.name_ar || '').toLowerCase().includes(search.toLowerCase()) ||
        (u.name_en || '').toLowerCase().includes(search.toLowerCase()) ||
        (u.name_he || '').toLowerCase().includes(search.toLowerCase()) ||
        (u.code || '').toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-gray-50 p-6 md:p-8" dir="rtl">
            <div className="mb-8 flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
                <div>
                    <h1 className="flex items-center gap-3 text-2xl font-bold text-gray-800">
                        <div className="rounded-lg bg-blue-100 p-2 text-blue-600">
                            <Ruler size={24} />
                        </div>
                        إدارة الوحدات
                    </h1>
                    <p className="mt-1 mr-12 text-gray-500">جميع معلومات تعريف الوحدات للأصناف</p>
                </div>

                <button
                    onClick={() => setIsAdding(true)}
                    className="flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-2.5 font-medium text-white shadow-sm transition-all hover:bg-blue-700 hover:shadow-md active:scale-95"
                >
                    <Plus size={20} />
                    إضافة وحدة جديدة
                </button>
            </div>

            {error && (
                <div className="mb-6 flex items-center gap-3 rounded-lg border border-red-100 bg-red-50 p-4 text-red-700">
                    <AlertCircle size={20} />
                    {error}
                    <button onClick={() => setError(null)} className="mr-auto rounded p-1 hover:bg-red-100">
                        <X size={16} />
                    </button>
                </div>
            )}

            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                <div className="flex flex-col items-center justify-between gap-4 border-b border-gray-100 bg-gray-50/50 p-4 sm:flex-row">
                    <div className="relative w-full sm:w-96">
                        <input
                            type="text"
                            placeholder="بحث عن وحدة..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-4 pr-10 shadow-sm transition-all focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        />
                        <Search className="absolute right-3 top-3 text-gray-400" size={18} />
                    </div>
                    <div className="rounded-md border bg-white px-3 py-1 text-sm font-medium text-gray-500 shadow-sm">
                        إجمالي الوحدات: <span className="font-bold text-blue-600">{units.length}</span>
                    </div>
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center p-12 text-center text-gray-400">
                        <Loader2 size={40} className="mb-4 animate-spin text-blue-500" />
                        <p>جاري تحميل البيانات...</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-right text-sm">
                            <thead className="border-b bg-[#f8fafc] font-semibold uppercase tracking-wider text-gray-600">
                                <tr>
                                    <th className="px-4 py-3">الرقم</th>
                                    <th className="px-4 py-3">الاسم</th>
                                    <th className="px-4 py-3">آخر تغيير</th>
                                    <th className="px-4 py-3">الاسم - العربية</th>
                                    <th className="px-4 py-3">الاسم - English</th>
                                    <th className="px-4 py-3">الاسم - עברית</th>
                                    <th className="px-4 py-3">فعال</th>
                                    <th className="px-4 py-3">مستخدم</th>
                                    <th className="px-4 py-3">نوع الوحدة</th>
                                    <th className="px-4 py-3">طريقة الحساب</th>
                                    <th className="px-4 py-3">تابع ل</th>
                                    <th className="px-4 py-3">مستوى</th>
                                    <th className="px-4 py-3">رمز - العربية</th>
                                    <th className="px-4 py-3">رمز - English</th>
                                    <th className="px-4 py-3">رمز - עברית</th>
                                    <th className="px-4 py-3">ضرب</th>
                                    <th className="px-4 py-3">المعامل الكلي</th>
                                    <th className="w-24 px-4 py-3 text-center">إجراءات</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredUnits.length > 0 ? (
                                    filteredUnits.map((unit, index) => (
                                        <tr key={unit.id || `unit-${index}`} className="group transition-colors hover:bg-slate-50">
                                            <td className="px-4 py-3 font-mono text-left">{unit.code || '-'}</td>
                                            <td className="px-4 py-3 font-medium text-gray-800">{unit.name_ar || '-'}</td>
                                            <td className="px-4 py-3 text-xs text-gray-500">{unit.updated_at ? new Date(unit.updated_at).toLocaleString('en-GB') : '-'}</td>
                                            <td className="px-4 py-3">{unit.name_ar || '-'}</td>
                                            <td className="px-4 py-3">{unit.name_en || '-'}</td>
                                            <td className="px-4 py-3">{unit.name_he || '-'}</td>
                                            <td className="px-4 py-3">{Number(unit.is_active || 0) === 1 ? 'نعم' : 'لا'}</td>
                                            <td className="px-4 py-3">{Number(unit.is_used || 0) === 1 ? 'نعم' : 'لا'}</td>
                                            <td className="px-4 py-3">{unit.unit_type || '-'}</td>
                                            <td className="px-4 py-3">
                                                <div className="space-y-1">
                                                    <div className="font-medium text-gray-700">
                                                        {CALCULATION_MODE_OPTIONS.find((option) => option.value === getUnitCalculationMode(unit))?.label || 'إدخال يدوي'}
                                                    </div>
                                                    <div className="text-xs text-gray-500">
                                                        {unit.formula_hint || getUnitFormulaHint(getUnitCalculationMode(unit))}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">{parentById.get(unit.parent_unit_id || '')?.code || '-'}</td>
                                            <td className="px-4 py-3 text-center">{unit.level_no || 1}</td>
                                            <td className="px-4 py-3">{unit.symbol_ar || unit.code || '-'}</td>
                                            <td className="px-4 py-3">{unit.symbol_en || unit.symbol || unit.code || '-'}</td>
                                            <td className="px-4 py-3">{unit.symbol_he || '-'}</td>
                                            <td className="px-4 py-3 text-left font-mono">{Number(unit.multiplier || 1)}</td>
                                            <td className="px-4 py-3 text-left font-mono">{Number(unit.total_factor || 1)}</td>
                                            <td className="px-4 py-3 text-center opacity-0 transition-opacity group-hover:opacity-100">
                                                <button
                                                    onClick={() => handleDelete(unit.id)}
                                                    className="rounded-lg p-2 text-red-500 transition-colors hover:bg-red-50"
                                                    title="حذف"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={18} className="py-16 text-center text-gray-400">
                                            <div className="flex flex-col items-center gap-3">
                                                <div className="rounded-full bg-gray-50 p-4">
                                                    <Search size={32} className="text-gray-300" />
                                                </div>
                                                <p>لا توجد وحدات مطابقة للبحث</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {isAdding && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
                    <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-xl">
                        <div className="flex items-center justify-between border-b bg-gray-50 px-6 py-4">
                            <h3 className="flex items-center gap-2 text-lg font-bold text-gray-800">
                                <Plus className="text-blue-600" size={20} />
                                إضافة وحدة جديدة
                            </h3>
                            <button onClick={() => setIsAdding(false)} className="text-gray-400 transition-colors hover:text-gray-600">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSave} className="space-y-4 p-6">
                            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                                <div>
                                    <label className="mb-1.5 block text-sm font-medium text-gray-700">الاسم - العربية <span className="text-red-500">*</span></label>
                                    <input type="text" value={formData.name_ar} onChange={(e) => setFormData({ ...formData, name_ar: e.target.value })} className="w-full rounded-lg border px-3 py-2" autoFocus />
                                </div>
                                <div>
                                    <label className="mb-1.5 block text-sm font-medium text-gray-700">الاسم - English</label>
                                    <input type="text" value={formData.name_en} onChange={(e) => setFormData({ ...formData, name_en: e.target.value })} className="w-full rounded-lg border px-3 py-2" dir="ltr" />
                                </div>
                                <div>
                                    <label className="mb-1.5 block text-sm font-medium text-gray-700">الاسم - עברית</label>
                                    <input type="text" value={formData.name_he} onChange={(e) => setFormData({ ...formData, name_he: e.target.value })} className="w-full rounded-lg border px-3 py-2" />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                                <div>
                                    <label className="mb-1.5 block text-sm font-medium text-gray-700">الرقم/الرمز <span className="text-red-500">*</span></label>
                                    <input type="text" value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })} className="w-full rounded-lg border px-3 py-2 font-mono" dir="ltr" />
                                </div>
                                <div>
                                    <label className="mb-1.5 block text-sm font-medium text-gray-700">نوع الوحدة</label>
                                    <select value={formData.unit_type} onChange={(e) => setFormData({ ...formData, unit_type: e.target.value })} className="w-full rounded-lg border px-3 py-2">
                                        {UNIT_TYPE_OPTIONS.map((item) => <option key={item} value={item}>{item}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="mb-1.5 block text-sm font-medium text-gray-700">طريقة الحساب</label>
                                    <select
                                        value={formData.calculation_mode}
                                        onChange={(e) => setFormData({ ...formData, calculation_mode: e.target.value as UnitCalculationMode })}
                                        className="w-full rounded-lg border px-3 py-2"
                                    >
                                        {CALCULATION_MODE_OPTIONS.map((item) => (
                                            <option key={item.value} value={item.value}>
                                                {item.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="mb-1.5 block text-sm font-medium text-gray-700">تابع لـ</label>
                                    <select
                                        value={formData.parent_unit_id}
                                        onChange={(e) => {
                                            const parentId = e.target.value;
                                            const parent = parentById.get(parentId);
                                            setFormData({
                                                ...formData,
                                                parent_unit_id: parentId,
                                                level_no: parentId ? Number(parent?.level_no || 1) + 1 : 1,
                                            });
                                        }}
                                        className="w-full rounded-lg border px-3 py-2"
                                    >
                                        <option value="">لا يوجد</option>
                                        {units.map((u) => <option key={u.id} value={u.id}>{u.code || u.name_ar}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="mb-1.5 block text-sm font-medium text-gray-700">المستوى</label>
                                    <input type="number" min={1} value={formData.level_no} onChange={(e) => setFormData({ ...formData, level_no: Number(e.target.value || 1) })} className="w-full rounded-lg border px-3 py-2" />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                                <div>
                                    <label className="mb-1.5 block text-sm font-medium text-gray-700">رمز - العربية</label>
                                    <input type="text" value={formData.symbol_ar} onChange={(e) => setFormData({ ...formData, symbol_ar: e.target.value })} className="w-full rounded-lg border px-3 py-2" />
                                </div>
                                <div>
                                    <label className="mb-1.5 block text-sm font-medium text-gray-700">رمز - English</label>
                                    <input type="text" value={formData.symbol_en} onChange={(e) => setFormData({ ...formData, symbol_en: e.target.value })} className="w-full rounded-lg border px-3 py-2" dir="ltr" />
                                </div>
                                <div>
                                    <label className="mb-1.5 block text-sm font-medium text-gray-700">رمز - עברית</label>
                                    <input type="text" value={formData.symbol_he} onChange={(e) => setFormData({ ...formData, symbol_he: e.target.value })} className="w-full rounded-lg border px-3 py-2" />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                                <div>
                                    <label className="mb-1.5 block text-sm font-medium text-gray-700">ضرب</label>
                                    <input type="number" min={1} value={formData.multiplier} onChange={(e) => setFormData({ ...formData, multiplier: Number(e.target.value || 1) })} className="w-full rounded-lg border px-3 py-2" />
                                </div>
                                <div>
                                    <label className="mb-1.5 block text-sm font-medium text-gray-700">المعامل الكلي</label>
                                    <input type="number" readOnly value={formData.total_factor} className="w-full rounded-lg border bg-gray-50 px-3 py-2" />
                                </div>
                                <div className="flex items-end gap-6 pb-2">
                                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                                        <input type="checkbox" checked={formData.is_active} onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })} className="h-4 w-4" />
                                        فعال
                                    </label>
                                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                                        <input type="checkbox" checked={formData.is_used} onChange={(e) => setFormData({ ...formData, is_used: e.target.checked })} className="h-4 w-4" />
                                        مستخدم
                                    </label>
                                </div>
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setIsAdding(false)} className="flex-1 rounded-lg bg-gray-100 px-4 py-2 font-medium text-gray-700 hover:bg-gray-200">إلغاء</button>
                                <button type="submit" disabled={saving} className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-70">
                                    {saving && <Loader2 size={16} className="animate-spin" />}
                                    حفظ
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
