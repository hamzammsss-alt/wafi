import React, { useState, useEffect } from 'react';
import { useDocumentKeyboardPro } from '../../hooks/useDocumentKeyboardPro';
import { SmartGrid } from '../../components/documents/SmartGrid';
import { useSmartGridPro, ColumnDef } from '../../hooks/useSmartGridPro';
import { Plus, Trash2, Save, RefreshCw } from 'lucide-react';

export default function ApprovalRulesAdmin() {
    const [rules, setRules] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const docTypeOptions = [
        { id: 'sales_invoice', name: 'فاتورة مبيعات' },
        { id: 'purchase_order', name: 'أمر شراء' },
        { id: 'purchase_request', name: 'طلب شراء' }
    ];

    const levelOptions = [
        { id: 1, name: 'مستوى 1 فقط' },
        { id: 2, name: 'يتطلب مستوى 2' }
    ];

    const fetchRules = async () => {
        setIsLoading(true);
        try {
            const api = (window as any).electronAPI;
            const data = await api.approvalV2.rules.list();
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
        { key: 'doc_type', title: 'نوع المستند', type: 'select', options: docTypeOptions, width: '30%' },
        { key: 'min_amount', title: 'القيمة الدنيا للتصعيد', type: 'number', width: '30%' },
        { key: 'requires_level', title: 'المستوى المطلوب', type: 'select', options: levelOptions, width: '30%' },
        { key: 'actions', title: '', width: '10%' }
    ];

    const grid = useSmartGridPro({
        columns,
        defaultRow: { doc_type: 'sales_invoice', min_amount: 1000, requires_level: 2 }
    });

    useEffect(() => {
        if (rules.length > 0) {
            grid.setRows(rules);
        } else {
            grid.setRows([{ id: 'new-1', doc_type: 'sales_invoice', min_amount: 1000, requires_level: 2 }]);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [rules]);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const api = (window as any).electronAPI;

            // Delete old rules first to accurately mirror the grid and avoid complexity, 
            // BUT since this is a simple UI, we'll just upsert and rely on users directly deleting rows.

            // Find rows that were deleted from original rules
            const currentIds = grid.rows.map(r => r.id);
            const deletedRules = rules.filter(r => !currentIds.includes(r.id) && !r.id.toString().startsWith('new-'));

            for (const r of deletedRules) {
                await api.approvalV2.rules.delete(r.id);
            }

            for (const row of grid.rows) {
                if (!row.doc_type) continue;
                await api.approvalV2.rules.upsert({
                    id: row.id.toString().startsWith('new-') ? null : row.id,
                    doc_type: row.doc_type,
                    min_amount: parseFloat(row.min_amount) || 0,
                    requires_level: parseInt(row.requires_level) || 1
                });
            }

            alert('تم حفظ القواعد بنجاح');
            fetchRules();
        } catch (e: any) {
            alert('خطأ في الحفظ: ' + e.message);
        } finally {
            setIsSaving(false);
        }
    };

    useDocumentKeyboardPro({
        enabled: true,
        modalOpen: false,
        onSave: handleSave,
    });

    return (
        <div className="min-h-screen bg-slate-50 p-6 font-sans" dir="rtl">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">قواعد الاعتماد المتقدمة (Approval Rules)</h2>
                    <p className="text-sm text-slate-500 mt-1">إعداد قوانين تصعيد المستندات للمستوى الثاني بناءً على القيمة.</p>
                </div>
                <div className="flex gap-2">
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

            <div className="mb-4 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800 font-medium">
                ملاحظة: المستندات التي قيمتها أقل من القيمة الدنيا ستتطلب موافقة <strong>المستوى الأول (L1)</strong> فقط، بينما المستندات التي تتجاوز القيمة ستُصعد فوراً إلى <strong>المستوى الثاني (L2)</strong> بعد موافقة المستوى الأول.
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-1">
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
                    إضافة قاعدة التاف
                </button>
            </div>
        </div>
    );
}
