import React, { useEffect, useMemo, useState } from 'react';
import {
    AlertCircle,
    Briefcase,
    ChevronDown,
    ChevronRight,
    Edit,
    Folder,
    Layers,
    Loader2,
    Plus,
    Search,
    Trash2,
    X
} from 'lucide-react';
import DefinitionMasterList, { DefinitionListColumn } from '../../../src/components/definitions/DefinitionMasterList';

type CostCenterRow = {
    id: string;
    code: string;
    name_ar: string;
    name_en?: string;
    type?: 'DEPARTMENT' | 'PROJECT' | 'BRANCH';
    parent_id?: string | null;
    manager_name?: string;
};

type CostCenterTreeNode = CostCenterRow & {
    children: CostCenterTreeNode[];
};

type CostCenterListRow = CostCenterRow & {
    parent_name: string;
    child_count: number;
};

const typeLabelMap: Record<string, string> = {
    DEPARTMENT: 'قسم',
    PROJECT: 'مشروع',
    BRANCH: 'فرع'
};

const typeBadgeMap: Record<string, string> = {
    DEPARTMENT: 'bg-emerald-100 text-emerald-700',
    PROJECT: 'bg-violet-100 text-violet-700',
    BRANCH: 'bg-amber-100 text-amber-700'
};

const emptyForm = {
    code: '',
    name_ar: '',
    name_en: '',
    type: 'DEPARTMENT',
    parent_id: '',
    manager_name: ''
};

export const CostCenters = () => {
    const [centers, setCenters] = useState<CostCenterRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [isAdding, setIsAdding] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [expanded, setExpanded] = useState<Record<string, boolean>>({});
    const [formData, setFormData] = useState(emptyForm);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const api = (window as any).electronAPI?.masterData;

    useEffect(() => {
        void loadCenters();
    }, []);

    const loadCenters = async () => {
        try {
            setLoading(true);
            const data = await api.getCostCenters();
            const rows = Array.isArray(data) ? data : [];
            setCenters(rows);

            const initialExpanded: Record<string, boolean> = {};
            rows.filter((row: CostCenterRow) => !row.parent_id).forEach((row: CostCenterRow) => {
                initialExpanded[row.id] = true;
            });
            setExpanded((prev) => ({ ...initialExpanded, ...prev }));
        } catch (err) {
            console.error(err);
            setError('فشل في تحميل مراكز التكلفة');
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (center: CostCenterRow) => {
        setFormData({
            code: center.code || '',
            name_ar: center.name_ar || '',
            name_en: center.name_en || '',
            type: center.type || 'DEPARTMENT',
            parent_id: center.parent_id || '',
            manager_name: center.manager_name || ''
        });
        setEditingId(center.id);
        setIsAdding(true);
    };

    const handleAddSub = (parentId: string) => {
        handleClose();
        setFormData((prev) => ({ ...prev, parent_id: parentId }));
        setIsAdding(true);
    };

    const handleClose = () => {
        setIsAdding(false);
        setEditingId(null);
        setFormData(emptyForm);
        setError(null);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!formData.code || !formData.name_ar) {
            setError('الرمز واسم المركز مطلوبان');
            return;
        }

        try {
            setSaving(true);
            const payload = { ...formData };

            if (editingId) {
                await api.saveCostCenter({ id: editingId, ...payload });
            } else {
                await api.saveCostCenter(payload);
            }

            handleClose();
            await loadCenters();
        } catch (err) {
            console.error(err);
            setError('حدث خطأ أثناء الحفظ. حاول مرة أخرى.');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('هل أنت متأكد من حذف هذا المركز؟')) return;

        try {
            await api.deleteCostCenter(id);
            await loadCenters();
        } catch (err) {
            console.error(err);
            alert('فشل في الحذف');
        }
    };

    const handleDeleteRows = async (rows: CostCenterRow[]) => {
        if (rows.length === 0) return;
        const message = rows.length === 1
            ? 'هل أنت متأكد من حذف هذا المركز؟'
            : `هل أنت متأكد من حذف ${rows.length} مراكز تكلفة؟`;
        if (!confirm(message)) return;

        try {
            for (const row of rows) {
                await api.deleteCostCenter(row.id);
            }
            await loadCenters();
        } catch (err) {
            console.error(err);
            alert('فشل في الحذف');
        }
    };

    const toggleExpand = (id: string) => {
        setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
    };

    const buildTree = (items: CostCenterRow[]) => {
        const map: Record<string, CostCenterTreeNode> = {};
        const roots: CostCenterTreeNode[] = [];

        items.forEach((item) => {
            map[item.id] = { ...item, children: [] };
        });

        items.forEach((item) => {
            if (item.parent_id && map[item.parent_id]) {
                map[item.parent_id].children.push(map[item.id]);
            } else {
                roots.push(map[item.id]);
            }
        });

        return roots;
    };

    const flattenTree = (nodes: CostCenterTreeNode[], level = 0, result: Array<CostCenterTreeNode & { level: number }> = []) => {
        for (const node of nodes) {
            if (search) {
                const query = search.toLowerCase();
                const matches =
                    String(node.name_ar || '').toLowerCase().includes(query) ||
                    String(node.code || '').toLowerCase().includes(query);

                if (matches) result.push({ ...node, level: 0 });
                if (node.children?.length) flattenTree(node.children, level + 1, result);
                continue;
            }

            result.push({ ...node, level });
            if (expanded[node.id] && node.children?.length) {
                flattenTree(node.children, level + 1, result);
            }
        }
        return result;
    };

    const displayItems = useMemo(() => {
        const treeRoots = buildTree(centers);
        return search
            ? centers
                .filter((center) =>
                    String(center.name_ar || '').toLowerCase().includes(search.toLowerCase()) ||
                    String(center.code || '').toLowerCase().includes(search.toLowerCase())
                )
                .map((center) => ({ ...center, children: [], level: 0 }))
            : flattenTree(treeRoots);
    }, [centers, search, expanded]);

    const listRows = useMemo<CostCenterListRow[]>(() => {
        const childrenCountByParent = centers.reduce<Record<string, number>>((acc, center) => {
            if (center.parent_id) {
                acc[center.parent_id] = (acc[center.parent_id] || 0) + 1;
            }
            return acc;
        }, {});

        return [...centers]
            .map((center) => ({
                ...center,
                parent_name: centers.find((item) => item.id === center.parent_id)?.name_ar || '',
                child_count: childrenCountByParent[center.id] || 0,
            }))
            .sort((left, right) => String(left.code || '').localeCompare(String(right.code || ''), 'ar', { numeric: true, sensitivity: 'base' }));
    }, [centers]);

    const columns = useMemo<DefinitionListColumn<CostCenterListRow>[]>(() => [
        {
            key: 'name_ar',
            label: 'اسم المركز',
            width: 260,
            defaultVisible: true,
            getSearchValue: (center) => `${center.name_ar || ''} ${center.name_en || ''} ${center.code || ''}`,
            renderCell: (center) => (
                <div className="flex items-center gap-3">
                    <div className={`rounded-lg p-1.5 ${center.child_count > 0 ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'}`}>
                        {center.child_count > 0 ? <Folder size={16} /> : <Briefcase size={16} />}
                    </div>
                    <div className="min-w-0">
                        <div className="truncate font-medium text-gray-800">{center.name_ar || '-'}</div>
                        <div className="truncate text-xs text-gray-400">{center.name_en || center.code || '-'}</div>
                    </div>
                </div>
            ),
        },
        {
            key: 'code',
            label: 'الرمز',
            width: 130,
            defaultVisible: true,
            getDisplayValue: (center) => center.code || '-',
            renderCell: (center) => (
                <span className="inline-flex items-center rounded-md bg-slate-100 px-2.5 py-1 font-mono text-xs text-slate-700">
                    {center.code || '-'}
                </span>
            ),
        },
        {
            key: 'type',
            label: 'النوع',
            type: 'enum',
            filterType: 'enum',
            width: 140,
            defaultVisible: true,
            options: [
                { value: 'DEPARTMENT', label: 'قسم' },
                { value: 'PROJECT', label: 'مشروع' },
                { value: 'BRANCH', label: 'فرع' },
            ],
            getDisplayValue: (center) => typeLabelMap[String(center.type || 'DEPARTMENT')] || 'قسم',
            renderCell: (center) => {
                const typeKey = String(center.type || 'DEPARTMENT');
                return (
                    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${typeBadgeMap[typeKey] || typeBadgeMap.DEPARTMENT}`}>
                        {typeLabelMap[typeKey] || 'قسم'}
                    </span>
                );
            },
        },
        {
            key: 'parent_name',
            label: 'المركز الأب',
            width: 220,
            defaultVisible: true,
            getDisplayValue: (center) => center.parent_name || '-',
        },
        {
            key: 'manager_name',
            label: 'المدير المسؤول',
            width: 180,
            defaultVisible: true,
            getDisplayValue: (center) => center.manager_name || '-',
        },
        {
            key: 'child_count',
            label: 'عدد الفروع',
            type: 'number',
            filterType: 'number',
            width: 110,
            defaultVisible: true,
            getValue: (center) => Number(center.child_count || 0),
            getDisplayValue: (center) => String(center.child_count || 0),
        },
        {
            key: 'actions',
            label: 'إجراءات',
            width: 140,
            sortable: false,
            filterable: false,
            searchable: false,
            defaultVisible: true,
            align: 'center',
            renderCell: (center) => (
                <div className="flex justify-center gap-2">
                    <button
                        type="button"
                        onClick={() => handleAddSub(center.id)}
                        className="rounded-lg p-2 text-green-600 transition-colors hover:bg-green-50"
                        title="إضافة فرعي"
                    >
                        <Plus size={18} />
                    </button>
                    <button
                        type="button"
                        onClick={() => handleEdit(center)}
                        className="rounded-lg p-2 text-blue-600 transition-colors hover:bg-blue-50"
                        title="تعديل"
                    >
                        <Edit size={18} />
                    </button>
                    <button
                        type="button"
                        onClick={() => handleDelete(center.id)}
                        className="rounded-lg p-2 text-red-500 transition-colors hover:bg-red-50"
                        title="حذف"
                    >
                        <Trash2 size={18} />
                    </button>
                </div>
            ),
        },
    ], [centers]);

    return (
        <div className="min-h-screen bg-gray-50 p-6 md:p-8" dir="rtl">

            {error && (
                <div className="mb-6 flex items-center gap-3 rounded-lg border border-red-100 bg-red-50 p-4 text-red-700">
                    <AlertCircle size={20} />
                    {error}
                    <button onClick={() => setError(null)} className="mr-auto rounded p-1 hover:bg-red-100">
                        <X size={16} />
                    </button>
                </div>
            )}

            <DefinitionMasterList
                headerIcon={<Layers size={22} />}
                headerTitle="مراكز التكلفة"
                headerSubtitle="الهيكل التنظيمي للمراكز والمشاريع والفروع مع نفس هوية القوائم المرجعية."
                headerBadges={[
                    { label: `${listRows.length} مركز`, tone: 'info' },
                    { label: `${centers.filter((center) => !center.parent_id).length} رئيسي`, tone: 'warning' },
                ]}

                screenKey="definitions.cost-centers"
                data={listRows}
                loading={loading}
                columns={columns}
                rowKey={(center) => String(center.id)}
                searchPlaceholder="بحث برقم أو اسم مركز التكلفة..."
                emptyMessage="لا توجد مراكز تكلفة مطابقة للمعايير الحالية"
                createLabel="إضافة مركز رئيسي"
                onCreate={() => setIsAdding(true)}
                onEdit={handleEdit}
                onDelete={handleDeleteRows}
                onRefresh={loadCenters}
                defaultSort={{ key: 'code', direction: 'asc' }}
            />

            {false && (
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                <div className="flex flex-col items-center justify-between gap-4 border-b border-gray-100 bg-gray-50/50 p-4 sm:flex-row">
                    <div className="relative w-full sm:w-96">
                        <input
                            type="text"
                            placeholder="بحث برقم أو اسم المركز..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-4 pr-10 shadow-sm transition-all focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        />
                        <Search className="absolute right-3 top-3 text-gray-400" size={18} />
                    </div>

                    <div className="rounded-md border bg-white px-3 py-1 text-sm font-medium text-gray-500 shadow-sm">
                        الإجمالي: <span className="font-bold text-blue-600">{centers.length}</span>
                    </div>
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center p-12 text-center text-gray-400">
                        <Loader2 size={40} className="mb-4 animate-spin text-blue-500" />
                        <p>جارِ تحميل البيانات...</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-right" style={{ minWidth: '1100px' }}>
                            <thead className="border-b border-slate-200 bg-slate-50 text-sm font-semibold text-slate-600">
                                <tr>
                                    <th className="w-20 px-4 py-4 text-center">الرقم</th>
                                    <th className="min-w-[320px] px-6 py-4">اسم المركز</th>
                                    <th className="w-40 px-6 py-4">الرمز</th>
                                    <th className="w-40 px-6 py-4">النوع</th>
                                    <th className="min-w-[220px] px-6 py-4">المدير المسؤول</th>
                                    <th className="w-40 px-6 py-4 text-center">الإجراءات</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {displayItems.length > 0 ? (
                                    displayItems.map((center, index) => {
                                        const hasChildren = centers.some((item) => item.parent_id === center.id);
                                        const isExpanded = expanded[center.id];
                                        const typeKey = String(center.type || 'DEPARTMENT');

                                        return (
                                            <tr key={center.id || `center-${index}`} className="group transition-colors hover:bg-slate-50/70">
                                                <td className="px-4 py-4 text-center">
                                                    <span className="inline-flex min-w-9 items-center justify-center rounded-lg bg-slate-100 px-2 py-1 text-xs font-bold text-slate-700">
                                                        {index + 1}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 font-medium text-gray-800">
                                                    <div
                                                        className="flex items-center gap-2"
                                                        style={{ paddingRight: search ? 0 : `${center.level * 24}px` }}
                                                    >
                                                        {!search && (
                                                            <button
                                                                onClick={() => toggleExpand(center.id)}
                                                                className={`rounded p-1 text-gray-500 transition-opacity hover:bg-gray-200 ${!hasChildren ? 'cursor-default opacity-0' : ''}`}
                                                                disabled={!hasChildren}
                                                            >
                                                                {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} className="rtl:rotate-180" />}
                                                            </button>
                                                        )}

                                                        <div className={`rounded-lg p-1.5 ${hasChildren ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'}`}>
                                                            {hasChildren ? <Folder size={16} /> : <Briefcase size={16} />}
                                                        </div>

                                                        <span>{center.name_ar}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="inline-flex items-center rounded-md bg-slate-100 px-2.5 py-1 font-mono text-xs text-slate-700">
                                                        {center.code}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-sm text-gray-600">
                                                    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${typeBadgeMap[typeKey] || typeBadgeMap.DEPARTMENT}`}>
                                                        {typeLabelMap[typeKey] || 'قسم'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-sm text-gray-500">{center.manager_name || '-'}</td>
                                                <td className="px-6 py-4">
                                                    <div className="flex justify-center gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                                                        <button
                                                            onClick={() => handleAddSub(center.id)}
                                                            className="rounded-lg p-2 text-green-600 transition-colors hover:bg-green-50"
                                                            title="إضافة فرعي"
                                                        >
                                                            <Plus size={18} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleEdit(center)}
                                                            className="rounded-lg p-2 text-blue-600 transition-colors hover:bg-blue-50"
                                                            title="تعديل"
                                                        >
                                                            <Edit size={18} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(center.id)}
                                                            className="rounded-lg p-2 text-red-500 transition-colors hover:bg-red-50"
                                                            title="حذف"
                                                        >
                                                            <Trash2 size={18} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan={6} className="py-16 text-center text-gray-400">
                                            <div className="flex flex-col items-center gap-3">
                                                <div className="rounded-full bg-gray-50 p-4">
                                                    <Search size={32} className="text-gray-300" />
                                                </div>
                                                <p>لا توجد مراكز تكلفة</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
            )}

            {isAdding && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
                    <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-xl">
                        <div className="flex items-center justify-between border-b bg-gray-50 px-6 py-4">
                            <h3 className="flex items-center gap-2 text-lg font-bold text-gray-800">
                                {editingId ? <Edit className="text-blue-600" size={20} /> : <Plus className="text-blue-600" size={20} />}
                                {editingId ? 'تعديل مركز تكلفة' : 'إضافة مركز تكلفة جديد'}
                            </h3>
                            <button onClick={handleClose} className="text-gray-400 transition-colors hover:text-gray-600">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSave} className="space-y-4 p-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="mb-1.5 block text-sm font-medium text-gray-700">
                                        الرمز (Code) <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.code}
                                        onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                                        className="w-full rounded-lg border px-3 py-2 font-mono outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                                        placeholder="01"
                                        autoFocus
                                    />
                                </div>

                                <div>
                                    <label className="mb-1.5 block text-sm font-medium text-gray-700">النوع</label>
                                    <select
                                        value={formData.type}
                                        onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                        className="w-full rounded-lg border px-3 py-2 outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                                    >
                                        <option value="DEPARTMENT">قسم (Department)</option>
                                        <option value="PROJECT">مشروع (Project)</option>
                                        <option value="BRANCH">فرع (Branch)</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                                    اسم المركز (عربي) <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={formData.name_ar}
                                    onChange={(e) => setFormData({ ...formData, name_ar: e.target.value })}
                                    className="w-full rounded-lg border px-3 py-2 outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                                    placeholder="مثال: الإدارة العامة"
                                    dir="rtl"
                                />
                            </div>

                            <div>
                                <label className="mb-1.5 block text-sm font-medium text-gray-700">الاسم (English)</label>
                                <input
                                    type="text"
                                    value={formData.name_en}
                                    onChange={(e) => setFormData({ ...formData, name_en: e.target.value })}
                                    className="w-full rounded-lg border px-3 py-2 outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                                    placeholder="e.g. Headquarters"
                                    dir="ltr"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="mb-1.5 block text-sm font-medium text-gray-700">يتبع للمركز</label>
                                    <select
                                        value={formData.parent_id}
                                        onChange={(e) => setFormData({ ...formData, parent_id: e.target.value })}
                                        className="w-full rounded-lg border px-3 py-2 outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                                    >
                                        <option value="">-- رئيسي --</option>
                                        {centers.filter((center) => center.id !== editingId).map((center) => (
                                            <option key={center.id} value={center.id}>{center.name_ar}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="mb-1.5 block text-sm font-medium text-gray-700">المدير المسؤول</label>
                                    <input
                                        type="text"
                                        value={formData.manager_name}
                                        onChange={(e) => setFormData({ ...formData, manager_name: e.target.value })}
                                        className="w-full rounded-lg border px-3 py-2 outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                                    />
                                </div>
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={handleClose}
                                    className="flex-1 rounded-lg bg-gray-100 px-4 py-2 font-medium text-gray-700 transition-colors hover:bg-gray-200"
                                >
                                    إلغاء
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 font-medium text-white shadow-sm shadow-blue-200 transition-all hover:bg-blue-700 disabled:opacity-70"
                                >
                                    {saving && <Loader2 size={16} className="animate-spin" />}
                                    {editingId ? 'حفظ التعديلات' : 'إضافة المركز'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
