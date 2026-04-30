import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowRight, Loader2, Save } from 'lucide-react';

type CostCenterFormState = {
    code: string;
    name_ar: string;
    name_en: string;
    parent_id: string;
    description: string;
    is_active: number;
};

const EMPTY_STATE: CostCenterFormState = {
    code: '',
    name_ar: '',
    name_en: '',
    parent_id: '',
    description: '',
    is_active: 1,
};

export function CostCenterForm() {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const isEdit = useMemo(() => Boolean(id), [id]);

    const [form, setForm] = useState<CostCenterFormState>(EMPTY_STATE);
    const [allCenters, setAllCenters] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const api = (window as any).electronAPI?.costCenter;

    useEffect(() => {
        void loadData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    const loadData = async () => {
        try {
            setLoading(true);
            setError(null);

            const centers = await api.getCostCenters();
            setAllCenters(Array.isArray(centers) ? centers : []);

            if (isEdit) {
                const current = (centers || []).find((c: any) => c.id === id);
                if (!current) {
                    setError('تعذر العثور على مركز التكلفة المطلوب.');
                    return;
                }
                setForm({
                    code: current.code || '',
                    name_ar: current.name_ar || '',
                    name_en: current.name_en || '',
                    parent_id: current.parent_id || '',
                    description: current.description || '',
                    is_active: current.is_active === 0 ? 0 : 1,
                });
                return;
            }

            setForm(EMPTY_STATE);
        } catch (err) {
            console.error(err);
            setError('فشل تحميل بيانات مركز التكلفة.');
        } finally {
            setLoading(false);
        }
    };

    const onSave = async () => {
        if (!form.code.trim() || !form.name_ar.trim()) {
            setError('الرمز والاسم العربي حقول مطلوبة.');
            return;
        }

        try {
            setSaving(true);
            setError(null);

            const payload: any = {
                ...form,
                parent_id: form.parent_id || null,
            };
            if (isEdit) payload.id = id;

            await api.saveCostCenter(payload);
            navigate('/master/cost-centers');
        } catch (err: any) {
            console.error(err);
            setError(err?.message || 'فشل حفظ البيانات.');
        } finally {
            setSaving(false);
        }
    };

    const parentOptions = allCenters.filter((c: any) => c.id !== id);

    if (loading) {
        return (
            <div className="h-full flex items-center justify-center text-gray-500">
                <Loader2 className="animate-spin ml-2" size={18} />
                جاري التحميل...
            </div>
        );
    }

    return (
        <div className="app-page space-y-6" dir="rtl">
            <div className="max-w-3xl mx-auto bg-white rounded-xl border border-gray-200 shadow-sm">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                    <h1 className="text-xl font-bold text-gray-800">
                        {isEdit ? 'تعديل مركز تكلفة' : 'إضافة مركز تكلفة'}
                    </h1>
                    <button
                        onClick={() => navigate('/master/cost-centers')}
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-gray-600 hover:bg-gray-100"
                    >
                        <ArrowRight size={16} />
                        رجوع
                    </button>
                </div>

                <div className="p-6 space-y-5">
                    {error && (
                        <div className="px-4 py-3 rounded-lg bg-red-50 border border-red-100 text-red-700 text-sm">
                            {error}
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Field label="الرمز *">
                            <input
                                value={form.code}
                                onChange={(e) => setForm((prev) => ({ ...prev, code: e.target.value }))}
                                className={INPUT}
                                placeholder="CC-001"
                            />
                        </Field>
                        <Field label="مركز أب">
                            <select
                                value={form.parent_id}
                                onChange={(e) => setForm((prev) => ({ ...prev, parent_id: e.target.value }))}
                                className={INPUT}
                            >
                                <option value="">-- رئيسي --</option>
                                {parentOptions.map((c: any) => (
                                    <option key={c.id} value={c.id}>
                                        {c.code} - {c.name_ar || c.name_en}
                                    </option>
                                ))}
                            </select>
                        </Field>
                    </div>

                    <Field label="الاسم العربي *">
                        <input
                            value={form.name_ar}
                            onChange={(e) => setForm((prev) => ({ ...prev, name_ar: e.target.value }))}
                            className={INPUT}
                        />
                    </Field>

                    <Field label="الاسم الإنجليزي">
                        <input
                            value={form.name_en}
                            onChange={(e) => setForm((prev) => ({ ...prev, name_en: e.target.value }))}
                            className={INPUT}
                            dir="ltr"
                        />
                    </Field>

                    <Field label="الوصف">
                        <textarea
                            value={form.description}
                            onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                            className={`${INPUT} min-h-24`}
                        />
                    </Field>

                    <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                        <input
                            type="checkbox"
                            checked={form.is_active === 1}
                            onChange={(e) => setForm((prev) => ({ ...prev, is_active: e.target.checked ? 1 : 0 }))}
                        />
                        فعال
                    </label>
                </div>

                <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
                    <button
                        onClick={() => navigate('/master/cost-centers')}
                        className="px-4 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-100"
                    >
                        إلغاء
                    </button>
                    <button
                        onClick={onSave}
                        disabled={saving}
                        className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-70 inline-flex items-center gap-2"
                    >
                        {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                        حفظ
                    </button>
                </div>
            </div>
        </div>
    );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <label className="block">
            <span className="block mb-1.5 text-sm font-medium text-gray-700">{label}</span>
            {children}
        </label>
    );
}

const INPUT =
    'w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500';
