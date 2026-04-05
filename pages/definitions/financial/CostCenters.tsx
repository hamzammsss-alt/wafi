import React, { useState, useEffect } from 'react';
import {
    Layers,
    Plus,
    Search,
    Trash2,
    Edit,
    X,
    CheckCircle2,
    AlertCircle,
    Loader2,
    ChevronRight,
    ChevronDown,
    Folder,
    Briefcase
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const CostCenters = () => {
    const [centers, setCenters] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [isAdding, setIsAdding] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [expanded, setExpanded] = useState<Record<string, boolean>>({});

    // Form State
    const [formData, setFormData] = useState({
        code: '',
        name_ar: '',
        name_en: '',
        type: 'DEPARTMENT',
        parent_id: '',
        manager_name: ''
    });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const api = (window as any).electronAPI?.masterData;

    useEffect(() => {
        loadCenters();
    }, []);

    const loadCenters = async () => {
        try {
            setLoading(true);
            const data = await api.getCostCenters();
            setCenters(data);
            // Default expand roots
            const initialExpanded: Record<string, boolean> = {};
            data.filter((c: any) => !c.parent_id).forEach((c: any) => initialExpanded[c.id] = true);
            setExpanded(prev => ({ ...initialExpanded, ...prev }));
        } catch (err) {
            console.error(err);
            setError('فشل في تحميل مراكز التكلفة');
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (center: any) => {
        setFormData({
            code: center.code || '',
            name_ar: center.name_ar,
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
        setFormData(prev => ({ ...prev, parent_id: parentId }));
        setIsAdding(true);
    };

    const handleClose = () => {
        setIsAdding(false);
        setEditingId(null);
        setFormData({
            code: '',
            name_ar: '',
            name_en: '',
            type: 'DEPARTMENT',
            parent_id: '',
            manager_name: ''
        });
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
            const payload = { ...formData }; // Add other fields if necessary

            if (editingId) {
                await api.saveCostCenter({ id: editingId, ...payload });
            } else {
                await api.saveCostCenter(payload);
            }

            // Success
            handleClose();
            loadCenters();
        } catch (err: any) {
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
            loadCenters();
        } catch (err) {
            console.error(err);
            alert('فشل في الحذف');
        }
    };

    const toggleExpand = (id: string) => {
        setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
    };

    // Tree Builder & Flattener
    const buildTree = (items: any[]) => {
        const map: any = {};
        const roots: any[] = [];
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

    const flattenTree = (nodes: any[], level = 0, result: any[] = []) => {
        for (const node of nodes) {
            // Apply search filter
            const matchesSearch = search === '' ||
                node.name_ar.toLowerCase().includes(search.toLowerCase()) ||
                node.code.includes(search);

            // If search is active, show flat list of matches logic??
            // Simplified: If search is active, show all matches regardless of hierarchy OR keep hierarchy but highlight?
            // Let's keep specific hierarchy behavior: if we search, we flatten the list to show matches
            if (search) {
                if (matchesSearch) result.push({ ...node, level });
                if (node.children) flattenTree(node.children, level + 1, result);
            } else {
                result.push({ ...node, level });
                if (expanded[node.id] && node.children) {
                    flattenTree(node.children, level + 1, result);
                }
            }
        }
        return result;
    };

    const treeRoots = buildTree(centers);
    // If search is active, we just filter the raw list roughly or use the flattened tree with a flag?
    // Let's simple filter the original list if search is on, otherwise use tree
    const displayItems = search
        ? centers.filter(c => c.name_ar.includes(search) || c.code.includes(search)).map(c => ({ ...c, level: 0 }))
        : flattenTree(treeRoots);


    return (
        <div className="min-h-screen bg-gray-50 p-6 md:p-8" dir="rtl">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
                        <div className="p-2 bg-orange-100 rounded-lg text-orange-600">
                            <Layers size={24} />
                        </div>
                        مراكز التكلفة (Cost Centers)
                    </h1>
                    <p className="text-gray-500 mt-1 mr-12">الهيكل التنظيمي للمراكز والمشاريع والفروع</p>
                </div>

                <button
                    onClick={() => setIsAdding(true)}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-medium transition-all shadow-sm hover:shadow-md active:scale-95"
                >
                    <Plus size={20} />
                    إضافة مركز رئيسي
                </button>
            </div>

            {/* Error Alert */}
            {error && (
                <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-6 flex items-center gap-3 border border-red-100 animate-in fade-in slide-in-from-top-2">
                    <AlertCircle size={20} />
                    {error}
                    <button onClick={() => setError(null)} className="mr-auto hover:bg-red-100 p-1 rounded">
                        <X size={16} />
                    </button>
                </div>
            )}

            {/* Search & Content */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                {/* Toolbar */}
                <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row gap-4 justify-between items-center">
                    <div className="relative w-full sm:w-96">
                        <input
                            type="text"
                            placeholder="بحث برقم أو اسم المركز..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-4 pr-10 py-2.5 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
                        />
                        <Search className="absolute right-3 top-3 text-gray-400" size={18} />
                    </div>
                    <div className="text-sm text-gray-500 font-medium bg-white px-3 py-1 rounded-md border shadow-sm">
                        الإجمالي: <span className="text-blue-600 font-bold">{centers.length}</span>
                    </div>
                </div>

                {/* Loading State */}
                {loading ? (
                    <div className="p-12 text-center flex flex-col items-center justify-center text-gray-400">
                        <Loader2 size={40} className="animate-spin mb-4 text-blue-500" />
                        <p>جاري تحميل البيانات...</p>
                    </div>
                ) : (
                    /* Table */
                    <div className="overflow-x-auto">
                        <table className="w-full text-right">
                            <thead className="bg-[#f8fafc] text-gray-600 font-semibold text-sm uppercase tracking-wider border-b">
                                <tr>
                                    <th className="px-6 py-4 w-1/3">اسم المركز</th>
                                    <th className="px-6 py-4">الرمز</th>
                                    <th className="px-6 py-4">النوع</th>
                                    <th className="px-6 py-4">المدير المسؤول</th>
                                    <th className="px-6 py-4 text-center w-32">إجراءات</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {displayItems.length > 0 ? (
                                    displayItems.map((center, index) => {
                                        const hasChildren = centers.some(c => c.parent_id === center.id);
                                        const isExpanded = expanded[center.id];

                                        return (
                                            <tr key={center.id || `center-${index}`} className="hover:bg-slate-50 transition-colors group">
                                                <td className="px-6 py-4 font-medium text-gray-800">
                                                    <div
                                                        className="flex items-center gap-2"
                                                        style={{ paddingRight: search ? 0 : `${center.level * 24}px` }}
                                                    >
                                                        {!search && (
                                                            <button
                                                                onClick={() => toggleExpand(center.id)}
                                                                className={`p-1 rounded hover:bg-gray-200 text-gray-500 transition-opacity ${!hasChildren ? 'opacity-0 cursor-default' : ''}`}
                                                                disabled={!hasChildren}
                                                            >
                                                                {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} className="rtl:rotate-180" />}
                                                            </button>
                                                        )}
                                                        <div className={`p-1.5 rounded-lg ${hasChildren ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'}`}>
                                                            {hasChildren ? <Folder size={16} /> : <Briefcase size={16} />}
                                                        </div>
                                                        {center.name_ar}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="font-mono text-gray-600 bg-gray-50 px-2 py-1 rounded text-xs">
                                                        {center.code}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-sm text-gray-600">
                                                    {center.type === 'DEPARTMENT' && 'قسم'}
                                                    {center.type === 'PROJECT' && 'مشروع'}
                                                    {center.type === 'BRANCH' && 'فرع'}
                                                </td>
                                                <td className="px-6 py-4 text-gray-500 text-sm">
                                                    {center.manager_name || '-'}
                                                </td>
                                                <td className="px-6 py-4 flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={() => handleAddSub(center.id)}
                                                        className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                                        title="إضافة فرعي"
                                                    >
                                                        <Plus size={18} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleEdit(center)}
                                                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                        title="تعديل"
                                                    >
                                                        <Edit size={18} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(center.id)}
                                                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                        title="حذف"
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan={5} className="py-16 text-center text-gray-400">
                                            <div className="flex flex-col items-center gap-3">
                                                <div className="bg-gray-50 p-4 rounded-full">
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

            {/* Add/Edit Modal */}
            {isAdding && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50">
                            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                                {editingId ? <Edit className="text-blue-600" size={20} /> : <Plus className="text-blue-600" size={20} />}
                                {editingId ? 'تعديل مركز تكلفة' : 'إضافة مركز تكلفة جديد'}
                            </h3>
                            <button onClick={handleClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSave} className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">الرمز (Code) <span className="text-red-500">*</span></label>
                                    <input
                                        type="text"
                                        value={formData.code}
                                        onChange={e => setFormData({ ...formData, code: e.target.value })}
                                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-mono"
                                        placeholder="01"
                                        autoFocus
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">النوع</label>
                                    <select
                                        value={formData.type}
                                        onChange={e => setFormData({ ...formData, type: e.target.value })}
                                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                                    >
                                        <option value="DEPARTMENT">قسم (Department)</option>
                                        <option value="PROJECT">مشروع (Project)</option>
                                        <option value="BRANCH">فرع (Branch)</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">اسم المركز (عربي) <span className="text-red-500">*</span></label>
                                <input
                                    type="text"
                                    value={formData.name_ar}
                                    onChange={e => setFormData({ ...formData, name_ar: e.target.value })}
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder:text-right"
                                    placeholder="مثال: الإدارة العامة"
                                    dir="rtl"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">الاسم (English)</label>
                                <input
                                    type="text"
                                    value={formData.name_en}
                                    onChange={e => setFormData({ ...formData, name_en: e.target.value })}
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                                    placeholder="e.g. Headquarters"
                                    dir="ltr"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">يتبع للمركز</label>
                                    <select
                                        value={formData.parent_id}
                                        onChange={e => setFormData({ ...formData, parent_id: e.target.value })}
                                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                                    >
                                        <option value="">-- رئيسي --</option>
                                        {centers.filter(c => c.id !== editingId).map(c => (
                                            <option key={c.id} value={c.id}>{c.name_ar}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">المدير المسؤول</label>
                                    <input
                                        type="text"
                                        value={formData.manager_name}
                                        onChange={e => setFormData({ ...formData, manager_name: e.target.value })}
                                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                                        placeholder=""
                                    />
                                </div>
                            </div>

                            <div className="pt-4 flex gap-3">
                                <button
                                    type="button"
                                    onClick={handleClose}
                                    className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
                                >
                                    إلغاء
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium shadow-sm shadow-blue-200 transition-all flex justify-center items-center gap-2 disabled:opacity-70"
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
