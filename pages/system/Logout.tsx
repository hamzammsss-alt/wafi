import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';

export const Logout = () => {
    const navigate = useNavigate();

    useEffect(() => {
        // Clear local storage / session / context
        // This is a simulation
        const timer = setTimeout(() => {
            navigate('/system/login');
        }, 1500);

        return () => clearTimeout(timer);
    }, [navigate]);

    return (
        <div className="min-h-screen bg-[#f1f5f9] flex flex-col items-center justify-center font-cairo">
            <div className="text-emerald-600 mb-4 animate-bounce">
                <LogOut size={48} />
            </div>
            <h2 className="text-xl font-bold text-slate-700">جاري تسجيل الخروج...</h2>
            <p className="text-slate-500 mt-2">نراك قريباً!</p>
        </div>
    );
};
