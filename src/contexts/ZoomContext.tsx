import React, { createContext, useContext, useState, useEffect, useRef } from 'react';

interface ZoomContextType {
    zoomLevel: number;
    zoomIn: () => void;
    zoomOut: () => void;
    resetZoom: () => void;
}

const ZoomContext = createContext<ZoomContextType | undefined>(undefined);

export const ZoomProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    // نبدأ بنسبة 100% كقيمة افتراضية
    const [zoomLevel, setZoomLevel] = useState(100);
    const [showToast, setShowToast] = useState(false);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);
    const isInitialMount = useRef(true);

    useEffect(() => {
        // تطبيق نسبة التكبير على كامل المستند (تعمل بشكل ممتاز في Electron / متصفحات Chromium)
        document.body.style.zoom = `${zoomLevel}%`;

        // منع ظهور الإشعار عند التحميل الأولي للبرنامج
        if (isInitialMount.current) {
            isInitialMount.current = false;
            return;
        }

        // إظهار الإشعار وتعيين مؤقت لإخفائه
        setShowToast(true);
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => setShowToast(false), 2000);

    }, [zoomLevel]);

    // دوال التحكم (بحد أقصى 200% وأدنى 50%)
    const zoomIn = () => setZoomLevel((prev) => Math.min(prev + 10, 200));
    const zoomOut = () => setZoomLevel((prev) => Math.max(prev - 10, 50));
    const resetZoom = () => setZoomLevel(100);

    // إضافة مستمع لاختصارات لوحة المفاتيح
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // التأكد من ضغط مفتاح Ctrl (أو Cmd في الماك)
            if (e.ctrlKey || e.metaKey) {
                if (e.key === '=' || e.key === '+') {
                    e.preventDefault(); // منع التكبير الافتراضي للمتصفح
                    setZoomLevel((prev) => Math.min(prev + 10, 200));
                } else if (e.key === '-') {
                    e.preventDefault();
                    setZoomLevel((prev) => Math.max(prev - 10, 50));
                } else if (e.key === '0') {
                    e.preventDefault();
                    setZoomLevel(100);
                }
            }
        };

        const handleWheel = (e: WheelEvent) => {
            if (e.ctrlKey || e.metaKey) {
                e.preventDefault(); // منع التكبير الافتراضي للمتصفح
                if (e.deltaY < 0) {
                    // تمرير للأعلى = تكبير
                    setZoomLevel((prev) => Math.min(prev + 10, 200));
                } else if (e.deltaY > 0) {
                    // تمرير للأسفل = تصغير
                    setZoomLevel((prev) => Math.max(prev - 10, 50));
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('wheel', handleWheel, { passive: false });
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('wheel', handleWheel);
        };
    }, []);

    return (
        <ZoomContext.Provider value={{ zoomLevel, zoomIn, zoomOut, resetZoom }}>
            {children}
            
            {/* إشعار التكبير العائم (Toast HUD) */}
            <div 
                className={`fixed top-20 left-1/2 -translate-x-1/2 z-[99999] flex items-center gap-2 rounded-full border border-slate-700/80 bg-slate-900/90 px-5 py-2 text-sm text-slate-200 shadow-2xl backdrop-blur-md transition-all duration-300 pointer-events-none ${showToast ? 'translate-y-0 opacity-100' : '-translate-y-4 opacity-0'}`}
                dir="rtl"
            >
                <span className="font-bold">مستوى التكبير:</span>
                <span className="font-mono font-bold text-emerald-400">{zoomLevel}%</span>
            </div>
        </ZoomContext.Provider>
    );
};

// Hook مخصص لاستخدام الخاصية في أي مكان
export const useZoom = () => {
    const context = useContext(ZoomContext);
    if (context === undefined) {
        throw new Error('useZoom must be used within a ZoomProvider');
    }
    return context;
};