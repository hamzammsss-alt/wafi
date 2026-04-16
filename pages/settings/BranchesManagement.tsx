import React, { useState, useEffect } from 'react';
import { MapPin, Plus, Edit, Trash2, Save, X } from 'lucide-react';

interface Branch {
    id: number;
    code: string;
    name: string;
    location: string;
    manager: string;
    phone: string;
    is_active: boolean;
}

export const BranchesManagement: React.FC = () => {
    const [branches, setBranches] = useState<Branch[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
    const [formData, setFormData] = useState({
        code: '',
        name: '',
        location: '',
        manager: '',
        phone: ''
    });

    useEffect(() => {
        loadBranches();
    }, []);

    const loadBranches = async () => {
        // @ts-ignore
        if (window.electronAPI?.getBranches) {
            // @ts-ignore
            const data = await window.electronAPI.getBranches();
            setBranches(data);
        } else {
            // Mock data
            setBranches([
                { id: 1, code: 'BR001', name: 'الفرع الرئيسي', location: 'رام الله', manager: 'أحمد محمد', phone: '022951234', is_active: true },
                { id: 2, code: 'BR002', name: 'فرع الخليل', location: 'الخليل', manager: 'محمود خالد', phone: '022987654', is_active: true },
            ]);
        }
    };

    const handleSave = async () => {
        const branchData = {
            ...formData,
            id: editingBranch?.id || Date.now(),
            is_active: true
        };

        // @ts-ignore
        if (window.electronAPI?.saveBranch) {
            // @ts-ignore
            await window.electronAPI.saveBranch(branchData);
        }

        setIsModalOpen(false);
        setEditingBranch(null);
        setFormData({ code: '', name: '', location: '', manager: '', phone: '' });
        loadBranches();
    };

    const handleEdit = (branch: Branch) => {
        setEditingBranch(branch);
        setFormData({
            code: branch.code,
            name: branch.name,
            location: branch.location,
            manager: branch.manager,
            phone: branch.phone
        });
        setIsModalOpen(true);
    };

    const handleDelete = async (id: number) => {
        if (confirm('هل أنت متأكد من حذف هذا الفرع؟')) {
            // @ts-ignore
            if (window.electronAPI?.deleteBranch) {
                // @ts-ignore
                await window.electronAPI.deleteBranch(id);
            }
            loadBranches();
        }
    };

    return (
        <div className="app-page h-full" dir="rtl">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="card p-6 mb-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                                <MapPin size={24} className="text-blue-600" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-gray-800">إدارة الفروع</h1>
                                <p className="text-sm text-gray-500">تعريف فروع الشركة وربطها بالموظفين والمخزون</p>
                            </div>
                        </div>
                        <button
                            onClick={() => {
                                setEditingBranch(null);
                                setFormData({ code: '', name: '', location: '', manager: '', phone: '' });
                                setIsModalOpen(true);
                            }}
                            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition flex items-center gap-2 shadow-sm"
                        >
                            <Plus size={18} />
                            إضافة فرع جديد
                        </button>
                    </div>
                </div>

                {/* Branches Table */}
                <div className="card overflow-hidden">
                    <table className="dense-table w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-4 text-right text-sm font-bold text-gray-700">الرمز</th>
                                <th className="px-6 py-4 text-right text-sm font-bold text-gray-700">اسم الفرع</th>
                                <th className="px-6 py-4 text-right text-sm font-bold text-gray-700">الموقع</th>
                                <th className="px-6 py-4 text-right text-sm font-bold text-gray-700">المدير</th>
                                <th className="px-6 py-4 text-right text-sm font-bold text-gray-700">الهاتف</th>
                                <th className="px-6 py-4 text-right text-sm font-bold text-gray-700">الحالة</th>
                                <th className="px-6 py-4 text-center text-sm font-bold text-gray-700">الإجراءات</th>
                            </tr>
                        </thead>
                        <tbody>
                            {branches.map((branch) => (
                                <tr key={branch.id} className="border-b border-gray-100 hover:bg-gray-50 transition">
                                    <td className="px-6 py-4 text-sm font-mono text-gray-600">{branch.code}</td>
                                    <td className="px-6 py-4 text-sm font-medium text-gray-800">{branch.name}</td>
                                    <td className="px-6 py-4 text-sm text-gray-600">{branch.location}</td>
                                    <td className="px-6 py-4 text-sm text-gray-600">{branch.manager}</td>
                                    <td className="px-6 py-4 text-sm text-gray-600">{branch.phone}</td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${branch.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                            }`}>
                                            {branch.is_active ? 'نشط' : 'غير نشط'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center justify-center gap-2">
                                            <button
                                                onClick={() => handleEdit(branch)}
                                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                                                title="تعديل"
                                            >
                                                <Edit size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(branch.id)}
                                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                                                title="حذف"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Modal */}
                {isModalOpen && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl">
                            <div className="bg-blue-600 p-6 flex justify-between items-center text-white rounded-t-xl">
                                <h3 className="text-xl font-bold">{editingBranch ? 'تعديل فرع' : 'إضافة فرع جديد'}</h3>
                                <button onClick={() => setIsModalOpen(false)} className="hover:bg-blue-700 p-2 rounded-full transition">
                                    <X size={20} />
                                </button>
                            </div>
                            <div className="p-6 space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-2">رمز الفرع</label>
                                        <input
                                            type="text"
                                            value={formData.code}
                                            onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
                                            placeholder="BR001"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-2">اسم الفرع</label>
                                        <input
                                            type="text"
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
                                            placeholder="الفرع الرئيسي"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-2">الموقع</label>
                                        <input
                                            type="text"
                                            value={formData.location}
                                            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
                                            placeholder="رام الله"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-2">المدير</label>
                                        <input
                                            type="text"
                                            value={formData.manager}
                                            onChange={(e) => setFormData({ ...formData, manager: e.target.value })}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
                                            placeholder="أحمد محمد"
                                        />
                                    </div>
                                    <div className="col-span-2">
                                        <label className="block text-sm font-bold text-gray-700 mb-2">الهاتف</label>
                                        <input
                                            type="tel"
                                            value={formData.phone}
                                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
                                            placeholder="022951234"
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="p-6 bg-gray-50 flex justify-end gap-3 rounded-b-xl">
                                <button
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-6 py-2 text-gray-600 hover:bg-gray-200 rounded-lg transition"
                                >
                                    إلغاء
                                </button>
                                <button
                                    onClick={handleSave}
                                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
                                >
                                    <Save size={18} />
                                    حفظ
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

