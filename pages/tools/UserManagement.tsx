import React, { useEffect, useState } from 'react';
import { Users as UsersIcon, Plus, Shield, Edit, Trash2, X, Check } from 'lucide-react';

interface User {
    id: string;
    username: string;
    full_name: string;
    role_id: string;
    role_name?: string;
    branch_id?: string;
    is_active: boolean;
}

// 1. Add definitions
interface Role {
    id: string;
    name: string;
}

interface Branch {
    id: string;
    name_ar: string;
    name_en: string;
    type: string;
}

export const UserManagement: React.FC = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [roles, setRoles] = useState<Role[]>([]);
    const [branches, setBranches] = useState<Branch[]>([]);
    const [loading, setLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        id: '',
        username: '',
        password: '',
        full_name: '',
        role_id: '',
        branch_id: '',
        is_active: true
    });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            // @ts-ignore
            const [usersData, rolesData, branchesData] = await Promise.all([
                // @ts-ignore
                window.electronAPI.auth.getUsers(),
                // @ts-ignore
                window.electronAPI.auth.getRoles(),
                // @ts-ignore
                window.electronAPI.auth.getBranches()
            ]);
            setUsers(usersData);
            setRoles(rolesData);
            setBranches(branchesData);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveUser = async () => {
        if (!formData.username || !formData.full_name || !formData.role_id || !formData.branch_id) {
            alert('يرجى تعبئة كافة الحقول المطلوبة');
            return;
        }

        try {
            // @ts-ignore
            await window.electronAPI.auth.saveUser(formData);
            setIsModalOpen(false);
            resetForm();
            loadData();
        } catch (error: any) {
            alert('فشل الحفظ: ' + error.message);
        }
    };

    const handleDeleteUser = async (id: string) => {
        if (!confirm('هل أنت متأكد من حذف هذا المستخدم؟')) return;
        try {
            // @ts-ignore
            await window.electronAPI.auth.deleteUser(id);
            loadData();
        } catch (error: any) {
            alert(error.message);
        }
    };

    const openEdit = (user: User) => {
        setFormData({
            id: user.id,
            username: user.username,
            password: '', // Don't show hash, only set if changing
            full_name: user.full_name,
            role_id: user.role_id,
            branch_id: user.branch_id || '',
            is_active: Boolean(user.is_active)
        });
        setIsModalOpen(true);
    };

    const resetForm = () => {
        setFormData({
            id: '',
            username: '',
            password: '',
            full_name: '',
            role_id: '',
            branch_id: '',
            is_active: true
        });
    };

    return (
        <div className="h-full bg-gray-50 p-6 font-cairo" dir="rtl">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center">
                                <UsersIcon size={24} className="text-indigo-600" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-gray-800">إدارة المستخدمين</h1>
                                <p className="text-sm text-gray-500">التحكم في وصول الموظفين والأدوار</p>
                            </div>
                        </div>
                        <button
                            onClick={() => { resetForm(); setIsModalOpen(true); }}
                            className="bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition flex items-center gap-2 shadow-lg shadow-indigo-200"
                        >
                            <Plus size={18} />
                            مستخدم جديد
                        </button>
                    </div>
                </div>

                {/* Table */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    {loading ? (
                        <div className="p-10 text-center text-gray-500">جاري التحميل...</div>
                    ) : (
                        <table className="w-full">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="px-6 py-4 text-right text-sm font-bold text-gray-700">المستخدم</th>
                                    <th className="px-6 py-4 text-right text-sm font-bold text-gray-700">الاسم الكامل</th>
                                    <th className="px-6 py-4 text-right text-sm font-bold text-gray-700">الدور الوظيفي</th>
                                    <th className="px-6 py-4 text-right text-sm font-bold text-gray-700">الفرع</th>
                                    <th className="px-6 py-4 text-right text-sm font-bold text-gray-700">الحالة</th>
                                    <th className="px-6 py-4 text-center text-sm font-bold text-gray-700">الإجراءات</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {users.map((user) => (
                                    <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 text-sm font-mono text-gray-800 font-bold">{user.username}</td>
                                        <td className="px-6 py-4 text-sm text-gray-600">{user.full_name}</td>
                                        <td className="px-6 py-4">
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                <Shield size={12} className="ml-1" />
                                                {user.role_name || 'غير محدد'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500">
                                            {/* @ts-ignore */}
                                            {user.branch_name || '-'}
                                        </td>
                                        <td className="px-6 py-4">
                                            {user.is_active ? (
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                    نشط
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                                    مجمد
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center justify-center gap-2">
                                                <button onClick={() => openEdit(user)} className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition" title="تعديل">
                                                    <Edit size={16} />
                                                </button>
                                                <button onClick={() => handleDeleteUser(user.id)} className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition" title="حذف">
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                            <h3 className="font-bold text-lg text-gray-800">
                                {formData.id ? 'تعديل مستخدم' : 'اضافة مستخدم جديد'}
                            </h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">اسم المستخدم (للدخول)</label>
                                <input
                                    type="text"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
                                    value={formData.username}
                                    onChange={e => setFormData({ ...formData, username: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">كلمة المرور</label>
                                <input
                                    type="password"
                                    placeholder={formData.id ? "اتركه فارغاً للإبقاء على القديمة" : ""}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
                                    value={formData.password}
                                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">الاسم الكامل</label>
                                <input
                                    type="text"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
                                    value={formData.full_name}
                                    onChange={e => setFormData({ ...formData, full_name: e.target.value })}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">الدور (Role)</label>
                                    <select
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                                        value={formData.role_id}
                                        onChange={e => setFormData({ ...formData, role_id: e.target.value })}
                                    >
                                        <option value="">اختر...</option>
                                        {roles.map(role => (
                                            <option key={role.id} value={role.id}>{role.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">الفرع (Branch)</label>
                                    <select
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                                        value={formData.branch_id}
                                        onChange={e => setFormData({ ...formData, branch_id: e.target.value })}
                                    >
                                        <option value="">اختر...</option>
                                        {branches.map(branch => (
                                            <option key={branch.id} value={branch.id}>{branch.name_ar}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 mt-4">
                                <input
                                    type="checkbox"
                                    id="activeCheck"
                                    className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                                    checked={formData.is_active}
                                    onChange={e => setFormData({ ...formData, is_active: e.target.checked })}
                                />
                                <label htmlFor="activeCheck" className="text-sm text-gray-700 select-none">حساب نشط</label>
                            </div>
                        </div>

                        <div className="bg-gray-50 px-6 py-4 flex gap-3">
                            <button
                                onClick={handleSaveUser}
                                className="flex-1 bg-indigo-600 text-white font-bold py-2 rounded-lg hover:bg-indigo-700 transition shadow-sm"
                            >
                                حفظ البيانات
                            </button>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="flex-1 bg-white text-gray-700 font-bold py-2 rounded-lg border border-gray-300 hover:bg-gray-50 transition"
                            >
                                إلغاء
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

