import React, { useState } from 'react';
import { Key, Save, AlertCircle, CheckCircle } from 'lucide-react';

export const ChangePassword = () => {
    const [formData, setFormData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (formData.newPassword !== formData.confirmPassword) {
            setError('كلمة المرور الجديدة غير متطابقة');
            return;
        }

        if (formData.newPassword.length < 6) {
            setError('يجب أن تكون كلمة المرور 6 خانات على الأقل');
            return;
        }

        setLoading(true);
        // Simulate API call
        setTimeout(() => {
            setLoading(false);
            setSuccess('تم تغيير كلمة المرور بنجاح');
            setFormData({ currentPassword: '', newPassword: '', confirmPassword: '' });
        }, 1500);
    };

    return (
        <div className="p-6 font-cairo max-w-xl mx-auto">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="bg-slate-50 border-b border-slate-100 p-4 flex items-center gap-2">
                    <Key className="text-emerald-600" size={20} />
                    <h1 className="font-bold text-slate-800">تغيير كلمة المرور</h1>
                </div>

                <div className="p-6">
                    {error && (
                        <div className="mb-4 bg-red-50 text-red-600 p-3 rounded text-sm flex items-center gap-2 border border-red-100">
                            <AlertCircle size={16} /> {error}
                        </div>
                    )}
                    {success && (
                        <div className="mb-4 bg-emerald-50 text-emerald-600 p-3 rounded text-sm flex items-center gap-2 border border-emerald-100">
                            <CheckCircle size={16} /> {success}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">كلمة المرور الحالية</label>
                            <input
                                type="password"
                                value={formData.currentPassword}
                                onChange={e => setFormData({ ...formData, currentPassword: e.target.value })}
                                className="w-full border p-2 rounded focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-shadow"
                                required
                            />
                        </div>

                        <hr className="border-slate-100 my-2" />

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">كلمة المرور الجديدة</label>
                            <input
                                type="password"
                                value={formData.newPassword}
                                onChange={e => setFormData({ ...formData, newPassword: e.target.value })}
                                className="w-full border p-2 rounded focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-shadow"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">تأكيد كلمة المرور الجديدة</label>
                            <input
                                type="password"
                                value={formData.confirmPassword}
                                onChange={e => setFormData({ ...formData, confirmPassword: e.target.value })}
                                className="w-full border p-2 rounded focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-shadow"
                                required
                            />
                        </div>

                        <div className="pt-4">
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-2 px-4 rounded font-medium shadow-sm transition-transform active:scale-95 flex items-center justify-center gap-2 disabled:opacity-70"
                            >
                                {loading ? 'جاري الحفظ...' : <><Save size={18} /> حفظ التغييرات</>}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};
