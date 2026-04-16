import React, { useState, useEffect } from 'react';
import { useDocumentKeyboardPro } from '../../hooks/useDocumentKeyboardPro';
import { SmartGrid } from '../../components/documents/SmartGrid';
import { useSmartGridPro, ColumnDef } from '../../hooks/useSmartGridPro';
import { Plus, Save, RefreshCw } from 'lucide-react';

export default function ApprovalSlaAdmin() {
    const [rules, setRules] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const docTypeOptions = [
        { id: 'sales_invoice', name: 'فاتورة مبيعات' },
        { id: 'purchase_order', name: 'أمر شراء' },
        { id: 'purchase_request', name: 'طلب شراء' }
    ];

    const levelOptions = [
        { id: 1, name: 'L1' },
        { id: 2, name: 'L2' }
    ];

    const escalateOptions = [
        { id: null, name: 'لا يوجد تصعيد (تنبيه فقط)' },
        { id: 2, name: 'تصعيد إلى L2' },
        { id: 3, name: 'اعتماد آلي (POSTED)' }
    ];

    const fetchRules = async () => {
        setIsLoading(true);
        try {
            const api = (window as any).electronAPI;
            const data = await api.approvalV4.slaRules.list();
            setRules(data || []);
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchRules();
    }, []);

    const columns: ColumnDef<any>[] = [
        { key: 'doc_type', title: 'النوع', type: 'select', options: docTypeOptions, width: '20%' },
        { key: 'level', title: 'المستوى الحالي', type: 'select', options: levelOptions, width: '20%' },
        { key: 'sla_minutes', title: 'دقائق السماح (SLA)', type: 'number', width: '20%' },
        { key: 'escalate_to_level', title: 'إجراء التصعيد الآلي', type: 'select', options: escalateOptions, width: '20%' },
        { key: 'enabled', title: 'مفعل', type: 'select', options: [{ id: 1, name: 'نعم' }, { id: 0, name: 'لا' }], width: '10%' },
        { key: 'actions', title: '', width: '10%' }
    ];

    const grid = useSmartGridPro({
        columns,
        defaultRow: { doc_type: 'sales_invoice', level: 1, sla_minutes: 60, escalate_to_level: 2, enabled: 1 }
    });

    useEffect(() => {
        if (rules.length > 0) {
            grid.setRows(rules);
        } else {
            grid.setRows([]);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [rules]);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const api = (window as any).electronAPI;

            const currentIds = grid.rows.map(r => r.id);
            const deletedRules = rules.filter(r => !currentIds.includes(r.id) && !r.id.toString().startsWith('new-'));

            for (const r of deletedRules) {
                await api.approvalV4.slaRules.delete(r.id);
            }

            for (const row of grid.rows) {
                if (!row.doc_type) continue;
                await api.approvalV4.slaRules.upsert({
                    id: row.id.toString().startsWith('new-') ? null : row.id,
                    doc_type: row.doc_type,
                    level: parseInt(row.level) || 1,
                    sla_minutes: parseInt(row.sla_minutes) || 60,
                    escalate_to_level: row.escalate_to_level ? parseInt(row.escalate_to_level) : null,
                    enabled: parseInt(row.enabled) || 0
                });
            }

            alert('تم حفظ سياسات الوقت بنجاح');
            fetchRules();
        } catch (e: any) {
            alert('خطأ في الحفظ: ' + e.message);
        } finally {
            setIsSaving(false);
        }
    };

    const triggerSweep = async () => {
        try {
            const res = await (window as any).electronAPI.approvalV4.runSlaSweepNow();
            alert(`تم تنفيذ الجدولة يدوياً. تم تصعيد ${res.escalatedCount} مستند.`);
        } catch (e: any) {
            alert(e.message);
        }
    };

    useDocumentKeyboardPro({
        enabled: true,
        modalOpen: false,
        onSave: handleSave,
    });

    return (
        <div className="p-6 h-full flex flex-col">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h3 className="font-bold text-lg">قواعد وقت الانتظار (SLA Rules)</h3>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={triggerSweep}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 transition-colors rounded-lg font-bold"
                    >
                        تشغيل الماسح الآن (Force Sweep)
                    </button>
                    <button
                        onClick={fetchRules}
                        className="flex items-center gap-2 px-4 py-2 bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 transition-colors rounded-lg font-bold"
                    >
                        <RefreshCw className="w-5 h-5 cursor-pointer" />
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors rounded-lg font-bold shadow-sm"
                    >
                        <Save className="w-5 h-5" />
                        حفظ القواعد (F4)
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
                        onFocusCell={grid.focusCell}
                        onKeyDown={grid.handleKeyDown}
                        onUpdateRow={grid.updateRow}
                        onRemoveRow={grid.removeRow}
                    />
                )}
            </div>
            <div className="mt-4 flex justify-start">
                <button
                    onClick={() => grid.addRow()}
                    className="flex items-center gap-2 px-4 py-2 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition-colors rounded-lg font-bold text-sm"
                >
                    <Plus className="w-4 h-4" />
                    إضافة قاعدة وقت
                </button>
            </div>
        </div>
    );
}
