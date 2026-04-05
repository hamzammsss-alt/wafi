import React, { useState, useEffect } from 'react';
import { Network, Plus, Trash2, Folder, FolderOpen, ChevronRight, ChevronDown, CheckCircle2, AlertCircle, X, Search } from 'lucide-react';
import { AnalysisCode } from '../../types';

export const AnalysisCodesPage: React.FC = () => {
    const [codes, setCodes] = useState<AnalysisCode[]>([]);
    const [flatCodes, setFlatCodes] = useState<AnalysisCode[]>([]); // For parent selection
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentCode, setCurrentCode] = useState<Partial<AnalysisCode>>({ name_ar: '', code: '', is_active: 1 });
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error', message: string } | null>(null);
    const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setIsLoading(true);
        try {
            // @ts-ignore
            if (window.electronAPI) {
                const api = (window.electronAPI as any);
                const [tree, flat] = await Promise.all([
                    api.finance.getAnalysisCodes(),
                    api.finance.getAnalysisCodesFlat()
                ]);
                setCodes(tree || []);
                setFlatCodes(flat || []);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    const toggleExpand = (id: string) => {
        const newSet = new Set(expandedNodes);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setExpandedNodes(newSet);
    };

    const handleSave = async () => {
        if (!currentCode.name_ar || !currentCode.code) {
            setFeedback({ type: 'error', message: 'الاسم والرمز مطلوبان' });
            return;
        }

        try {
            // @ts-ignore
            await window.electronAPI.finance.saveAnalysisCode(currentCode);
            setFeedback({ type: 'success', message: 'تم الحفظ بنجاح' });
            setIsModalOpen(false);
            loadData();
            setTimeout(() => setFeedback(null), 3000);
        } catch (error) {
            console.error(error);
            setFeedback({ type: 'error', message: 'حدث خطأ أثناء الحفظ' });
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('هل أنت متأكد من الحذف؟ سيتم منع الحذف إذا وجد تفرعات.')) return;
        try {
            // @ts-ignore
            await window.electronAPI.finance.deleteAnalysisCode(id);
            loadData();
        } catch (error) {
            alert('لا يمكن الحذف، تأكد من عدم وجود تفرعات');
        }
    };

    const renderTree = (nodes: AnalysisCode[], level = 0) => {
        return nodes.map(node => (
            <React.Fragment key={node.id}>
                <div
                    className={`flex items-center p-3 border-b hover:bg-indigo-50 transition group ${level === 0 ? 'bg-white' : 'bg-gray-50'}`}
                    style={{ paddingRight: `${level * 24 + 12}px` }}
                >
                    <div className="flex-1 flex items-center gap-3">
                        <button onClick={() => toggleExpand(node.id)} className="text-gray-400 hover:text-indigo-600">
                            {node.children && node.children.length > 0 ? (
                                expandedNodes.has(node.id) ? <ChevronDown size={18} /> : <ChevronRight size={18} />
                            ) : <span className="w-[18px]" />}
                        </button>

                        <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
                            {expandedNodes.has(node.id) ? <FolderOpen size={20} /> : <Folder size={20} />}
                        </div>

                        <div>
                            <div className="font-bold text-gray-800 flex items-center gap-2">
                                {node.code} - {node.name_ar}
                                {!node.is_active && <span className="text-xs bg-red-100 text-red-600 px-2 rounded-full">معطل</span>}
                            </div>
                            {node.name_en && <div className="text-xs text-gray-500">{node.name_en}</div>}
                        </div>
                    </div>

                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition px-4">
                        <button
                            onClick={() => {
                                setCurrentCode({ parent_id: node.id, is_active: 1, code: '', name_ar: '' });
                                setIsModalOpen(true);
                                if (!expandedNodes.has(node.id)) toggleExpand(node.id);
                            }}
                            className="p-1.5 text-green-600 hover:bg-green-100 rounded tooltip-trigger"
                            title="إضافة فرع"
                        >
                            <Plus size={16} />
                        </button>
                        <button
                            onClick={() => { setCurrentCode(node); setIsModalOpen(true); }}
                            className="p-1.5 text-blue-600 hover:bg-blue-100 rounded"
                            title="تعديل"
                        >
                            <FolderOpen size={16} />
                        </button>
                        <button
                            onClick={() => handleDelete(node.id)}
                            className="p-1.5 text-red-600 hover:bg-red-100 rounded"
                            title="حذف"
                        >
                            <Trash2 size={16} />
                        </button>
                    </div>
                </div>
                {expandedNodes.has(node.id) && node.children && renderTree(node.children, level + 1)}
            </React.Fragment>
        ));
    };

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <Network className="text-indigo-600" />
                        رموز التحليل ومراكز التكلفة
                    </h1>
                    <p className="text-gray-500 mt-1">هيكل شجري لتصنيف المصاريف والإيرادات والمشاريع</p>
                </div>
                <button
                    onClick={() => { setCurrentCode({ name_ar: '', code: '', is_active: 1 }); setIsModalOpen(true); }}
                    className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-lg hover:bg-indigo-700 transition font-medium shadow-lg shadow-indigo-100"
                >
                    <Plus size={18} />
                    رمز رئيسي جديد
                </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden min-h-[500px]">
                {isLoading ? (
                    <div className="p-12 text-center text-gray-500">جاري التحميل...</div>
                ) : codes.length > 0 ? (
                    <div className="divide-y divide-gray-100">
                        {renderTree(codes)}
                    </div>
                ) : (
                    <div className="p-12 text-center text-gray-400">
                        <Network size={48} className="mx-auto mb-4 opacity-20" />
                        <p>لا يوجد رموز تحليل معرفة. ابدأ بإضافة رمز جديد.</p>
                    </div>
                )}
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl animate-in fade-in zoom-in duration-200">
                        <div className="p-6 border-b flex justify-between items-center">
                            <h2 className="text-xl font-bold text-gray-800">
                                {currentCode.id ? 'تعديل رمز تحليل' : 'إضافة رمز تحليل جديد'}
                            </h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-red-500">
                                <X size={24} />
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">الرمز (Code) <span className="text-red-500">*</span></label>
                                <input
                                    type="text"
                                    className="w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500"
                                    value={currentCode.code || ''}
                                    onChange={e => setCurrentCode({ ...currentCode, code: e.target.value })}
                                    placeholder="مثلاً: PRJ-01"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">الاسم (عربي) <span className="text-red-500">*</span></label>
                                <input
                                    type="text"
                                    className="w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500"
                                    value={currentCode.name_ar || ''}
                                    onChange={e => setCurrentCode({ ...currentCode, name_ar: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">الاسم (إنجليزي)</label>
                                <input
                                    type="text"
                                    className="w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500"
                                    value={currentCode.name_en || ''}
                                    onChange={e => setCurrentCode({ ...currentCode, name_en: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">المركز الرئيسي</label>
                                <select
                                    className="w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500"
                                    value={currentCode.parent_id || ''}
                                    onChange={e => setCurrentCode({ ...currentCode, parent_id: e.target.value })}
                                >
                                    <option value="">-- مستوى رئيسي --</option>
                                    {flatCodes.filter(c => c.id !== currentCode.id).map(c => (
                                        <option key={c.id} value={c.id}>{c.code} - {c.name_ar}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex items-center gap-2 pt-2">
                                <input
                                    type="checkbox"
                                    id="isActive"
                                    className="w-4 h-4 text-indigo-600 rounded"
                                    checked={currentCode.is_active === 1}
                                    onChange={e => setCurrentCode({ ...currentCode, is_active: e.target.checked ? 1 : 0 })}
                                />
                                <label htmlFor="isActive" className="text-sm text-gray-700 cursor-pointer select-none">فعال</label>
                            </div>
                        </div>

                        <div className="p-4 border-t bg-gray-50 rounded-b-2xl flex justify-end gap-2">
                            <button onClick={() => setIsModalOpen(false)} className="px-5 py-2 text-gray-600 hover:bg-gray-200 rounded-lg transition">إلغاء</button>
                            <button onClick={handleSave} className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-bold shadow-lg shadow-indigo-200 transition">حفظ</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
