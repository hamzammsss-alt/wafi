import React, { useState } from 'react';
import { LogIn, Building2, Calendar } from 'lucide-react';

export const LoginPage: React.FC<{ onLogin: (user: any) => void }> = ({ onLogin }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [fiscalYear, setFiscalYear] = useState(new Date().getFullYear().toString());
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        // Simulate authentication
        setTimeout(() => {
            if (username && password) {
                onLogin({
                    username,
                    fiscalYear,
                    role: 'admin',
                    loginTime: new Date().toISOString()
                });
            } else {
                alert('الرجاء إدخال اسم المستخدم وكلمة المرور');
            }
            setLoading(false);
        }, 1000);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-600 via-purple-600 to-blue-700 flex items-center justify-center p-4" dir="rtl">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-8 text-center">
                    <div className="w-20 h-20 bg-white rounded-full mx-auto mb-4 flex items-center justify-center shadow-lg">
                        <Building2 size={40} className="text-indigo-600" />
                    </div>
                    <h1 className="text-3xl font-bold text-white mb-2">WAFI ERP</h1>
                    <p className="text-indigo-100 text-sm">النظام المحاسبي المتكامل</p>
                </div>

                {/* Login Form */}
                <form onSubmit={handleLogin} className="p-8 space-y-6">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">اسم المستخدم</label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 outline-none transition"
                            placeholder="أدخل اسم المستخدم"
                            autoFocus
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">كلمة المرور</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 outline-none transition"
                            placeholder="أدخل كلمة المرور"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                            <Calendar size={16} />
                            السنة المالية
                        </label>
                        <select
                            value={fiscalYear}
                            onChange={(e) => setFiscalYear(e.target.value)}
                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 outline-none transition"
                        >
                            <option value="2024">2024</option>
                            <option value="2025">2025</option>
                            <option value="2026">2026</option>
                        </select>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 rounded-lg font-bold text-lg hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
                    >
                        {loading ? (
                            <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                            <>
                                <LogIn size={20} />
                                تسجيل الدخول
                            </>
                        )}
                    </button>
                </form>

                {/* Footer */}
                <div className="bg-gray-50 px-8 py-4 text-center text-sm text-gray-500 border-t">
                    <p>© 2026 WAFI ERP - جميع الحقوق محفوظة</p>
                </div>
            </div>
        </div>
    );
};
