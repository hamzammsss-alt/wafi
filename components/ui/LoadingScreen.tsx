import React from 'react';

export const LoadingScreen: React.FC = () => {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900 overflow-hidden">
            {/* Background Effects */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-[100px] animate-pulse"></div>
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-500/10 rounded-full blur-[100px] animate-pulse delay-700"></div>

            <div className="relative z-10 flex flex-col items-center">
                {/* Logo Animation */}
                <div className="w-24 h-24 mb-8 relative">
                    <div className="absolute inset-0 border-4 border-slate-700 rounded-2xl"></div>
                    <div className="absolute inset-0 border-4 border-t-emerald-500 border-r-transparent border-b-blue-500 border-l-transparent rounded-2xl animate-spin"></div>
                    <div className="absolute inset-4 bg-slate-800 rounded-xl flex items-center justify-center shadow-inner">
                        <span className="text-3xl font-bold bg-gradient-to-br from-emerald-400 to-blue-500 bg-clip-text text-transparent animate-pulse">W</span>
                    </div>
                </div>

                {/* Text Animation */}
                <div className="text-center space-y-3">
                    <h1 className="text-3xl font-bold text-white tracking-tight animate-fade-in-up">
                        WAFI <span className="text-emerald-400">ERP</span>
                    </h1>
                    <p className="text-slate-400 text-sm tracking-widest uppercase animate-pulse">
                        System Loading
                    </p>
                </div>

                {/* Loading Bar */}
                <div className="mt-12 w-64 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-emerald-500 to-blue-500 w-1/2 animate-shimmer rounded-full"></div>
                </div>
            </div>

            <style>{`
                @keyframes shimmer {
                    0% { transform: translateX(-150%); }
                    100% { transform: translateX(150%); }
                }
                .animate-shimmer {
                    animation: shimmer 1.5s infinite linear;
                }
                .animate-fade-in-up {
                    animation: fadeInUp 0.8s ease-out forwards;
                }
                @keyframes fadeInUp {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
};
