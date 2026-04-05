import React, { useEffect, useState } from 'react';
import { User, Plus, Edit2, Trash2, CheckCircle, XCircle, Search, Shield, Building } from 'lucide-react';

const Users: React.FC = () => {
    const [users, setUsers] = useState<any[]>([]);
    const [roles, setRoles] = useState<any[]>([]);
    const [branches, setBranches] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // Modal State
    const [showModal, setShowModal] = useState(false);
    const [editingUser, setEditingUser] = useState<any | null>(null);
    const [formData, setFormData] = useState({
        username: '',
        password: '',
        full_name: '',
        role_id: '',
        branch_id: '',
        is_active: true
    });

    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [usersData, rolesData, branchesData] = await Promise.all([
                window.electronAPI.auth.getUsers(),
                window.electronAPI.auth.getRoles(),
                window.electronAPI.auth.getBranches()
            ]);
            setUsers(usersData);
            setRoles(rolesData);
            setBranches(branchesData);
        } catch (err) {
            console.error(err);
            setError('فشل تحميل البيانات');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        try {
            const payload = { ...formData, id: editingUser?.id };
            await window.electronAPI.auth.saveUser(payload);
            setSuccess(editingUser ? 'تم تحديث البيانات بنجاح' : 'تم إضافة المستخدم بنجاح');
            setShowModal(false);
            loadData();
        } catch (err: any) {
            setError(err.message || 'فشل الحفظ');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('هل أنت متأكد من حذف هذا المستخدم؟')) return;
        try {
            await window.electronAPI.auth.deleteUser(id);
            setSuccess('تم الحذف بنجاح');
            loadData();
        } catch (err: any) {
            setError(err.message);
        }
    };

    const openEdit = (user: any) => {
        setEditingUser(user);
        setFormData({
            username: user.username,
            password: '', // Don't show hash
            full_name: user.full_name,
            role_id: user.role_id,
            branch_id: user.branch_id,
            is_active: !!user.is_active
        });
        setShowModal(true);
    };

    const openNew = () => {
        setEditingUser(null);
        setFormData({
            username: '',
            password: '',
            full_name: '',
            role_id: roles[0]?.id || '',
            branch_id: branches[0]?.id || '',
            is_active: true
        });
        setShowModal(true);
    };

    const filteredUsers = users.filter(u =>
        u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="p-6 font-cairo">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <User className="text-emerald-600" /> دليل المستخدمين
                    </h1>
                    <p className="text-slate-500 text-sm mt-1">إدارة حسابات النظام والصلاحيات</p>
                </div>
                <button
                    onClick={openNew}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded shadow flex items-center gap-2 transition-colors"
                >
                    <Plus size={18} /> مستخدم جديد
                </button>
            </div>

            {/* Messages */}
            {error && <div className="bg-red-50 text-red-600 p-3 rounded border border-red-200 mb-4">{error}</div>}
            {success && <div className="bg-emerald-50 text-emerald-600 p-3 rounded border border-emerald-200 mb-4">{success}</div>}

            {/* Search */}
            <div className="bg-white p-4 rounded shadow-sm border border-slate-200 mb-4 flex gap-4">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute right-3 top-2.5 text-slate-400" size={18} />
                    <input
                        type="text"
                        placeholder="بحث عن مستخدم..."
                        className="w-full pr-10 pl-4 py-2 border border-slate-300 rounded focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded shadow-sm border border-slate-200 overflow-hidden">
                <table className="w-full text-right">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 text-sm font-semibold">
                        <tr>
                            <th className="px-6 py-3">اسم المستخدم</th>
                            <th className="px-6 py-3">الاسم الكامل</th>
                            <th className="px-6 py-3">الدور (Role)</th>
                            <th className="px-6 py-3">الفرع</th>
                            <th className="px-6 py-3 text-center">الحالة</th>
                            <th className="px-6 py-3 text-center">إجراءات</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {loading ? (
                            <tr><td colSpan={6} className="text-center py-8 text-slate-500">جاري التحميل...</td></tr>
                        ) : filteredUsers.length === 0 ? (
                            <tr><td colSpan={6} className="text-center py-8 text-slate-500">لا يوجد بيانات</td></tr>
                        ) : (
                            filteredUsers.map(user => (
                                <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-3 font-medium text-slate-800">{user.username}</td>
                                    <td className="px-6 py-3 text-slate-600">{user.full_name}</td>
                                    <td className="px-6 py-3">
                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 gap-1 border border-blue-200">
                                            <Shield size={10} /> {user.role_name || user.role_id}
                                        </span>
                                    </td>
                                    <td className="px-6 py-3 text-slate-600">
                                        <div className="flex items-center gap-1">
                                            <Building size={12} className="text-slate-400" />
                                            {user.branch_name || 'عام'}
                                        </div>
                                    </td>
                                    <td className="px-6 py-3 text-center">
                                        {user.is_active ? (
                                            <span className="text-emerald-600 bg-emerald-50 px-2 py-1 rounded text-xs border border-emerald-100 inline-flex items-center gap-1">
                                                <CheckCircle size={10} /> نشط
                                            </span>
                                        ) : (
                                            <span className="text-red-600 bg-red-50 px-2 py-1 rounded text-xs border border-red-100 inline-flex items-center gap-1">
                                                <XCircle size={10} /> غير نشط
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-3">
                                        <div className="flex items-center justify-center gap-2">
                                            <button
                                                onClick={() => openEdit(user)}
                                                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                                title="تعديل"
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(user.id)}
                                                className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                                                title="حذف"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center backdrop-blur-sm">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6 animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center mb-6 border-b pb-4">
                            <h2 className="text-xl font-bold text-slate-800">
                                {editingUser ? 'تعديل مستخدم' : 'إضافة مستخدم جديد'}
                            </h2>
                            <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                                <XCircle size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">اسم المستخدم *</label>
                                    <input
                                        type="text"
                                        required
                                        className="w-full border p-2 rounded focus:ring-emerald-500 text-sm"
                                        value={formData.username}
                                        onChange={e => setFormData({ ...formData, username: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1 leading-none">
                                        كلمة المرور
                                        {editingUser && <span className="text-xs text-slate-400 font-normal mr-1">(اتركها فارغة للإبقاء)</span>}
                                    </label>
                                    <input
                                        type="password"
                                        required={!editingUser}
                                        className="w-full border p-2 rounded focus:ring-emerald-500 text-sm"
                                        value={formData.password}
                                        onChange={e => setFormData({ ...formData, password: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">الاسم الكامل</label>
                                <input
                                    type="text"
                                    className="w-full border p-2 rounded focus:ring-emerald-500 text-sm"
                                    value={formData.full_name}
                                    onChange={e => setFormData({ ...formData, full_name: e.target.value })}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">الدور (Role)</label>
                                    <select
                                        className="w-full border p-2 rounded focus:ring-emerald-500 text-sm bg-white"
                                        value={formData.role_id}
                                        onChange={e => setFormData({ ...formData, role_id: e.target.value })}
                                    >
                                        {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">الفرع</label>
                                    <select
                                        className="w-full border p-2 rounded focus:ring-emerald-500 text-sm bg-white"
                                        value={formData.branch_id}
                                        onChange={e => setFormData({ ...formData, branch_id: e.target.value })}
                                    >
                                        <option value="">(عام - كل الفروع)</option>
                                        {branches.map(b => <option key={b.id} value={b.id}>{b.name_ar}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 mt-4 border-t pt-4">
                                <input
                                    type="checkbox"
                                    id="isActive"
                                    checked={formData.is_active}
                                    onChange={e => setFormData({ ...formData, is_active: e.target.checked })}
                                    className="w-4 h-4 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500"
                                />
                                <label htmlFor="isActive" className="text-sm font-medium text-slate-700 cursor-pointer select-none">
                                    حساب نشط (يمكنه الدخول للنظام)
                                </label>
                            </div>

                            <div className="flex justify-end gap-2 mt-6 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded text-sm font-medium"
                                >
                                    إلغاء
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-sm font-medium shadow-sm"
                                >
                                    حفظ البيانات
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Users;
