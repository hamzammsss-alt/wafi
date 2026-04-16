import React, { useState, useEffect } from 'react';
import { SmartGrid } from '../../components/documents/SmartGrid';
import { useSmartGridPro, ColumnDef } from '../../hooks/useSmartGridPro';
import { RefreshCw, PlayCircle } from 'lucide-react';
import { approvalClient } from '../../lib/approvalClient';

export default function ApprovalSchedulerLogs() {
    const [logs, setLogs] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const fetchLogs = async () => {
        setIsLoading(true);
        try {
            const res = await approvalClient.schedulerLogs.list(100);
            if (res.ok) setLogs(res.data || []);
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs();
    }, []);

    const columns: ColumnDef<any>[] = [
        { key: 'ran_at', title: 'تاريخ/وقت التشغيل', width: '25%' },
        { key: 'scanned_count', title: 'تم فحصها', type: 'number', width: '15%' },
        { key: 'escalated_count', title: 'تم تصعيدها', type: 'number', width: '15%' },
        { key: 'duration_ms', title: 'المدة (ملي ثانية)', type: 'number', width: '15%' },
        { key: 'error', title: 'الأخطاء', width: '30%' }
    ];

    const grid = useSmartGridPro({
        columns,
        defaultRow: {},
        isLocked: true // purely informational
    });

    useEffect(() => {
        if (logs.length > 0) {
            grid.setRows(logs.map(log => ({
                id: log.id,
                ran_at: new Date(log.ran_at).toLocaleString('ar-SA'),
                scanned_count: log.scanned_count,
                escalated_count: log.escalated_count,
                duration_ms: log.duration_ms,
                error: log.error ? <span className="text-rose-600 font-bold text-xs">{log.error}</span> : <span className="text-emerald-600 text-xs">لا يوجد أخطاء</span>
            })));
        } else {
            grid.setRows([]);
        }
    }, [logs]);

    const handleRunSweep = async () => {
        try {
            await approvalClient.runSlaSweepNow();
            fetchLogs();
        } catch (e: any) { alert(e.message); }
    };

    return (
        <div className="p-6 h-full flex flex-col">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h3 className="font-bold text-lg">سجل الجدولة التلقائية (SLA Scheduler)</h3>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={handleRunSweep}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors rounded-lg font-bold shadow-sm"
                    >
                        <PlayCircle className="w-5 h-5" />
                        تشغيل يدوي (Force Sweep)
                    </button>
                    <button
                        onClick={fetchLogs}
                        className="flex items-center gap-2 px-4 py-2 bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 transition-colors rounded-lg font-bold"
                    >
                        <RefreshCw className="w-5 h-5 cursor-pointer" />
                        تحديث القائمة
                    </button>
                </div>
            </div>

            <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-200 p-1">
                {isLoading ? (
                    <div className="text-center py-10 text-slate-500">جاري التحميل...</div>
                ) : (
                    <SmartGrid
                        gridRef={grid.gridRef}
                        rows={grid.rows}
                        columns={columns}
                        activeCell={grid.activeCell}
                        isLocked={true}
                        onFocusCell={grid.focusCell}
                        onKeyDown={grid.handleKeyDown}
                        onUpdateRow={grid.updateRow}
                        onRemoveRow={grid.removeRow}
                    />
                )}
            </div>
        </div>
    );
}
