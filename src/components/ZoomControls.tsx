import React from 'react';
import { ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { useZoom } from '../contexts/ZoomContext';

const ZoomControls: React.FC = () => {
    const { zoomLevel, zoomIn, zoomOut, resetZoom } = useZoom();

    return (
        <div className="flex items-center gap-1 bg-slate-800/50 border border-slate-700 rounded-lg p-0.5 shadow-sm text-slate-300" dir="ltr">
            <button
                onClick={zoomOut}
                className="p-1 hover:bg-slate-700 hover:text-emerald-400 rounded transition-colors"
                title="تصغير"
            >
                <ZoomOut size={16} />
            </button>
            
            <button
                onClick={resetZoom}
                className="px-1 text-[11px] font-medium hover:bg-slate-700 hover:text-emerald-400 rounded transition-colors min-w-[40px]"
                title="إعادة تعيين"
            >
                {zoomLevel}%
            </button>

            <button
                onClick={zoomIn}
                className="p-1 hover:bg-slate-700 hover:text-emerald-400 rounded transition-colors"
                title="تكبير"
            >
                <ZoomIn size={16} />
            </button>
        </div>
    );
};

export default ZoomControls;