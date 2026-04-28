import React, { useEffect, useState } from 'react';
import { BadgeCheck, Plus, Search, Edit, Trash2, Save, X, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { WorkspaceHeader } from '../../../src/components/workspace/WorkspaceHeader';
import { useCreateIntent } from '../../../src/hooks/useCreateIntent';
import DefinitionMasterList, { DefinitionListColumn } from '../../../src/components/definitions/DefinitionMasterList';

interface MembershipRow {
    id: string;
    code?: string;
    name_ar: string;
    name_en?: string;
    is_active?: number | boolean;
}

export const MembershipsPage: React.FC = () => {
    const [rows, setRows] = useState<MembershipRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [search, setSearch] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [form, setForm] = useState({
        code: '',
        name_ar: '',
        name_en: '',
        is_active: true
    });

    const loadRows = async () => {
        try {
            setLoading(true);
            const data = await window.electronAPI.partner.getMemberships();
            setRows(data || []);
        } catch (err) {
            console.error(err);
            setError('تعذر تحميل العضويات');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadRows();
    }, []);

    const resetForm = () => {
        setForm({ code: '', name_ar: '', name_en: '', is_active: true });
        setEditingId(null);
    };

    const openCreate = () => {
        resetForm();
        setIsOpen(true);
        setError(null);
    };

    useCreateIntent(openCreate);

    const openEdit = (row: MembershipRow) => {
        setForm({
            code: row.code || '',
            name_ar: row.name_ar || '',
            name_en: row.name_en || '',
            is_active: row.is_active ? true : false
        });
        setEditingId(row.id);
        setIsOpen(true);
        setError(null);
    };

    const onSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.name_ar.trim()) {
            setError('اسم العضوية بالعربية مطلوب');
            return;
        }

        try {
            setSaving(true);
            const payload = {
                ...form,
                is_active: form.is_active ? 1 : 0
            };
            if (editingId) {
                await window.electronAPI.partner.saveMembership({ id: editingId, ...payload });
            } else {
                await window.electronAPI.partner.saveMembership(payload);
            }
            setIsOpen(false);
            resetForm();
            await loadRows();
        } catch (err: any) {
            console.error(err);
            setError(err?.message || 'فشل حفظ العضوية');
        } finally {
            setSaving(false);
        }
    };

    const onDelete = async (id: string) => {
        if (!confirm('هل تريد حذف هذه العضوية؟')) return;
        try {
            await window.electronAPI.partner.deleteMembership(id);
            await loadRows();
        } catch (err: any) {
            alert(err?.message || 'تعذر حذف العضوية');
        }
    };

    const filtered = rows.filter((row) => {
        const q = search.trim().toLowerCase();
        if (!q) return true;
        return (
            String(row.name_ar || '').toLowerCase().includes(q) ||
            String(row.name_en || '').toLowerCase().includes(q) ||
            String(row.code || '').toLowerCase().includes(q)
        );
    });

    const handleDeleteRows = async (selectedRows: MembershipRow[]) => {
        if (selectedRows.length === 0) return;
        if (!confirm(selectedRows.length === 1 ? 'هل تريد حذف هذه العضوية؟' : `هل تريد حذف ${selectedRows.length} عضويات؟`)) return;

        try {
            for (const row of selectedRows) {
                await window.electronAPI.partner.deleteMembership(row.id);
            }
            await loadRows();
        } catch (err: any) {
            alert(err?.message || 'تعذر حذف العضويات المحددة');
        }
    };

    const columns = React.useMemo<DefinitionListColumn<MembershipRow>[]>(() => [
        {
            key: 'name_ar',
            label: 'اسم العضوية',
            width: 260,
            defaultVisible: true,
            getSearchValue: (row) => `${row.name_ar || ''} ${row.name_en || ''} ${row.code || ''}`,
            renderCell: (row) => (
                <div className="min-w-0">
                    <div className="truncate text-sm font-bold text-slate-800">{row.name_ar || '-'}</div>
                    <div className="truncate text-xs text-slate-400">{row.name_en || '-'}</div>
                </div>
            ),
        },
        {
            key: 'code',
            label: 'الرمز',
            width: 120,
            defaultVisible: true,
            getDisplayValue: (row) => row.code || '-',
            renderCell: (row) => row.code ? (
                <span className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-mono text-slate-600">{row.code}</span>
            ) : '-',
        },
        {
            key: 'is_active',
            label: 'الحالة',
            type: 'boolean',
            filterType: 'boolean',
            width: 140,
            defaultVisible: true,
            getValue: (row) => (row.is_active ? 1 : 0),
            renderCell: (row) => (
                <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${row.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                    {row.is_active ? <CheckCircle2 size={12} /> : <X size={12} />}
                    {row.is_active ? 'فعال' : 'غير فعال'}
                </span>
            ),
        },
        {
            key: 'actions',
            label: 'إجراءات',
            width: 120,
            sortable: false,
            filterable: false,
            searchable: false,
            defaultVisible: true,
            align: 'center',
            renderCell: (row) => (
                <div className="flex justify-center gap-2">
                    <button onClick={() => openEdit(row)} className="rounded-lg p-2 text-blue-600 hover:bg-blue-50" title="تعديل">
                        <Edit size={18} />
                    </button>
                    <button onClick={() => onDelete(row.id)} className="rounded-lg p-2 text-red-500 hover:bg-red-50" title="حذف">
                        <Trash2 size={18} />
                    </button>
                </div>
            ),
        },
    ], [rows]);

    return (
        <div className="app-page" dir="rtl">
            <WorkspaceHeader
                icon={<BadgeCheck size={24} />}
                title="تعريف العضويات"
                subtitle="إدارة عضويات العملاء"
                badges={[
                    { label: `الإجمالي ${rows.length}`, tone: 'warning' },
                    { label: `المعروض ${filtered.length}`, tone: 'success' },
                ]}
                actions={
                    <button
                        onClick={openCreate}
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-medium transition-all shadow-sm hover:shadow-md active:scale-95"
                    >
                        <Plus size={18} />
                        عضوية جديدة
                    </button>
                }
                className="mb-6"
            />
            <div className="hidden flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
                        <div className="p-2 bg-emerald-100 rounded-lg text-emerald-700">
                            <BadgeCheck size={24} />
                        </div>
                        تعريف العضويات
                    </h1>
                    <p className="text-gray-500 mt-1 mr-12">إدارة عضويات العملاء</p>
                </div>

                <button
                    onClick={openCreate}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-medium transition-all shadow-sm hover:shadow-md active:scale-95"
                >
                    <Plus size={18} />
                    عضوية جديدة
                </button>
            </div>

            <DefinitionMasterList
                screenKey="definitions.memberships"
                data={rows}
                loading={loading}
                columns={columns}
                rowKey={(row) => String(row.id)}
                searchPlaceholder="بحث عن عضوية..."
                emptyMessage="لا توجد عضويات مطابقة للمعايير الحالية"
                createLabel="عضوية جديدة"
                onCreate={openCreate}
                onEdit={openEdit}
                onDelete={handleDeleteRows}
                onRefresh={loadRows}
                defaultSort={{ key: 'name_ar', direction: 'asc' }}
            />

            {false && (
            <>
            <div className="card overflow-hidden">
                <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row gap-4 justify-between items-center">
                    <div className="relative w-full sm:w-96">
                        <input
                            type="text"
                            placeholder="بحث..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-4 pr-10 py-2.5 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
                        />
                        <Search className="absolute right-3 top-3 text-gray-400" size={18} />
                    </div>
                    <div className="text-sm text-gray-500 font-medium bg-white px-3 py-1 rounded-md border shadow-sm">
                        الإجمالي: <span className="text-blue-600 font-bold">{filtered.length}</span>
                    </div>
                </div>

                {loading ? (
                    <div className="p-12 text-center flex flex-col items-center justify-center text-gray-400">
                        <Loader2 size={40} className="animate-spin mb-4 text-blue-500" />
                        <p>جارٍ التحميل...</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="dense-table w-full text-right">
                            <thead className="bg-[#f8fafc] text-gray-600 font-semibold text-sm border-b">
                                <tr>
                                    <th className="px-6 py-4">الاسم</th>
                                    <th className="px-6 py-4">الرمز</th>
                                    <th className="px-6 py-4">الحالة</th>
                                    <th className="px-6 py-4 text-center w-32">إجراءات</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filtered.length > 0 ? (
                                    filtered.map((row) => (
                                        <tr key={row.id} className="hover:bg-slate-50 transition-colors group">
                                            <td className="px-6 py-4 font-medium text-gray-800">{row.name_ar}</td>
                                            <td className="px-6 py-4">{row.code || '-'}</td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${row.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                                                    {row.is_active ? 'فعال' : 'غير فعال'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => openEdit(row)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="تعديل">
                                                    <Edit size={18} />
                                                </button>
                                                <button onClick={() => onDelete(row.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="حذف">
                                                    <Trash2 size={18} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={4} className="py-16 text-center text-gray-400">لا توجد بيانات</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
            </>
            )}

            {isOpen && (
                <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-xl overflow-hidden" dir="rtl">
                        <div className="p-4 border-b flex items-center justify-between">
                            <h2 className="font-bold text-lg text-gray-800">{editingId ? 'تعديل عضوية' : 'إضافة عضوية'}</h2>
                            <button onClick={() => setIsOpen(false)} className="text-gray-500 hover:text-gray-700">
                                <X size={18} />
                            </button>
                        </div>

                        <form onSubmit={onSave} className="p-6 space-y-4">
                            {error && (
                                <div className="bg-red-50 text-red-700 p-3 rounded-lg flex items-center gap-2 border border-red-100">
                                    <AlertCircle size={16} />
                                    <span>{error}</span>
                                </div>
                            )}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">الرمز</label>
                                <input
                                    type="text"
                                    value={form.code}
                                    onChange={(e) => setForm((prev) => ({ ...prev, code: e.target.value }))}
                                    className="w-full border rounded-lg px-3 py-2"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">الاسم عربي</label>
                                <input
                                    type="text"
                                    value={form.name_ar}
                                    onChange={(e) => setForm((prev) => ({ ...prev, name_ar: e.target.value }))}
                                    className="w-full border rounded-lg px-3 py-2"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">الاسم EN</label>
                                <input
                                    type="text"
                                    value={form.name_en}
                                    onChange={(e) => setForm((prev) => ({ ...prev, name_en: e.target.value }))}
                                    className="w-full border rounded-lg px-3 py-2"
                                    dir="ltr"
                                />
                            </div>
                            <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                                <input
                                    type="checkbox"
                                    checked={form.is_active}
                                    onChange={(e) => setForm((prev) => ({ ...prev, is_active: e.target.checked }))}
                                />
                                فعال
                            </label>
                            <div className="flex justify-end gap-3 pt-2">
                                <button type="button" onClick={() => setIsOpen(false)} className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200">
                                    إلغاء
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60 flex items-center gap-2"
                                >
                                    {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
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

