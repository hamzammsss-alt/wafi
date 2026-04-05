import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, User, Building, Calendar, Globe, LogIn } from 'lucide-react';
import { authService } from '@/services/authService';

const Login: React.FC = () => {
    const navigate = useNavigate();
    const [branches, setBranches] = useState<any[]>([]); // Keep branches mocked for now or move to generic service
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const [formData, setFormData] = useState({
        username: '',
        password: '',
        branchId: '',
        year: new Date().getFullYear().toString(),
        lang: 'ar'
    });

    useEffect(() => {
        // Redirect if already logged in
        if (authService.isAuthenticated()) {
            navigate('/', { replace: true });
            return;
        }

        const loadBranches = async () => {
            try {
                // Keep using mock for branches drop-down for now until Tenure API is ready
                const data = await window.electronAPI.auth.getBranches();
                setBranches(data);
                if (data.length > 0) {
                    setFormData(prev => ({ ...prev, branchId: data[0].id }));
                }
            } catch (err) {
                console.error("Failed to load branches", err);
                // Fallback
                setBranches([{ id: '1', name_ar: 'الفرع الرئيسي' }]);
            }
        };
        loadBranches();
    }, [navigate]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            // Use the Hybrid Auth Service
            const response = await authService.login(formData.username, formData.password);

            // Settings for local state
            localStorage.setItem('branchId', formData.branchId);
            localStorage.setItem('fiscalYear', formData.year);

            // Redirect to Dashboard
            navigate('/');
        } catch (err: any) {
            console.error(err);
            let errorMessage = 'فشل تسجيل الدخول. تأكد من تشغيل الخادم (Backend) أو صحة البيانات.';
            if (err.message) {
                if (err.message.includes('User not found') || err.message.includes('Invalid password')) {
                    errorMessage = 'اسم المستخدم أو كلمة المرور غير صحيحة';
                } else {
                    // Show the technical error only if it's meaningful (not "Error invoking remote method")
                    // Usually Electron prefixes with "Error invoking remote method...: Original Error"
                    const parts = err.message.split(': ');
                    if (parts.length > 1) {
                        errorMessage = parts[parts.length - 1]; // Get the last part (the actual error)
                    }
                }
            }
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 font-cairo" dir="rtl">
            <div className="bg-slate-800 border border-slate-700 w-full max-w-md rounded-lg shadow-2xl p-8 relative overflow-hidden">

                {/* Background Decor */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl -mr-10 -mt-10"></div>
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl -ml-10 -mb-10"></div>

                <div className="relative z-10">
                    <div className="text-center mb-8">
                        <div className="w-16 h-16 bg-slate-700 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-slate-600 shadow-inner">
                            <span className="text-3xl font-bold text-emerald-400">W</span>
                        </div>
                        <h1 className="text-2xl font-bold text-white mb-1">WAFI ERP</h1>
                        <p className="text-slate-400 text-sm">Enterprise Resource Planning</p>
                    </div>

                    {error && (
                        <div className="mb-6 p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded flex items-center gap-2">
                            <span>⚠️</span> {error}
                        </div>
                    )}

                    <form onSubmit={handleLogin} className="space-y-4">

                        {/* Username */}
                        <div className="space-y-1">
                            <label className="text-slate-400 text-xs mr-1">اسم المستخدم</label>
                            <div className="relative group">
                                <User className="absolute right-3 top-2.5 text-slate-500 group-focus-within:text-emerald-400 transition-colors" size={18} />
                                <input
                                    type="text"
                                    required
                                    className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded px-10 py-2 focus:outline-none focus:border-emerald-500 transition-colors"
                                    placeholder="أدخل اسم المستخدم"
                                    value={formData.username}
                                    onChange={e => setFormData({ ...formData, username: e.target.value })}
                                />
                            </div>
                        </div>

                        {/* Password */}
                        <div className="space-y-1">
                            <label className="text-slate-400 text-xs mr-1">كلمة المرور</label>
                            <div className="relative group">
                                <Lock className="absolute right-3 top-2.5 text-slate-500 group-focus-within:text-emerald-400 transition-colors" size={18} />
                                <input
                                    type="password"
                                    required
                                    className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded px-10 py-2 focus:outline-none focus:border-emerald-500 transition-colors"
                                    placeholder="••••••••"
                                    value={formData.password}
                                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            {/* Branch */}
                            <div className="space-y-1">
                                <label className="text-slate-400 text-xs mr-1">الفرع</label>
                                <div className="relative group">
                                    <Building className="absolute right-3 top-2.5 text-slate-500 group-focus-within:text-emerald-400 transition-colors" size={16} />
                                    <select
                                        className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded px-9 py-2 text-sm focus:outline-none focus:border-emerald-500 appearance-none"
                                        value={formData.branchId}
                                        onChange={e => setFormData({ ...formData, branchId: e.target.value })}
                                    >
                                        {branches.map(b => (
                                            <option key={b.id} value={b.id}>{b.name_ar || b.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Year */}
                            <div className="space-y-1">
                                <label className="text-slate-400 text-xs mr-1">السنة المالية</label>
                                <div className="relative group">
                                    <Calendar className="absolute right-3 top-2.5 text-slate-500 group-focus-within:text-emerald-400 transition-colors" size={16} />
                                    <select
                                        className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded px-9 py-2 text-sm focus:outline-none focus:border-emerald-500 appearance-none"
                                        value={formData.year}
                                        onChange={e => setFormData({ ...formData, year: e.target.value })}
                                    >
                                        <option value="2026">2026</option>
                                        <option value="2025">2025</option>
                                        <option value="2024">2024</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Language */}
                        <div className="flex justify-end mb-2">
                            <div className="flex items-center gap-2 text-slate-400 text-xs cursor-pointer hover:text-white">
                                <Globe size={14} />
                                <span>English</span>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-2.5 rounded shadow-lg shadow-emerald-900/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            ) : (
                                <>
                                    <span>تسجيل الدخول</span>
                                    <LogIn size={18} />
                                </>
                            )}
                        </button>

                    </form>
                </div>
            </div>

            <div className="absolute bottom-4 text-center text-slate-600 text-[10px]">
                &copy; 2026 WAFI ERP. All rights reserved.
            </div>
        </div>
    );
};

export default Login;
