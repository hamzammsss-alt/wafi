import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useApprovalInboxV3, PendingDocV3 } from '../../hooks/useApprovalInboxV3';
import { DocumentStatusBadge } from '../../components/ui/DocumentStatusBadge';
import { SmartGrid } from '../../components/documents/SmartGrid';
import { useSmartGridPro, ColumnDef } from '../../hooks/useSmartGridPro';
import { useTabs } from '../../contexts/TabsContext';
import { useMyPermissions } from '../../hooks/useMyPermissions';
import { Search, Filter, RefreshCw, XCircle, AlertCircle, CheckSquare, Square, Info, Keyboard } from 'lucide-react';
// Auth context removed - using mock user for now

const getDocPath = (docType: string, docId: string | number) => {
    switch (docType) {
        case 'sales_invoice': return `/sales/invoices/${docId}`;
        case 'purchase_invoice': return `/purchases/invoices/${docId}`;
        case 'stock_transfer': return `/inventory/stock-transfers/${docId}`;
        case 'journal_voucher': return `/gl/journal-vouchers/${docId}`;
        case 'purchase_order': return `/purchasing/orders/${docId}`;
        case 'purchase_request': return `/purchasing/requests/${docId}`;
        default: return `/${docType}/${docId}`;
    }
};

export default function ApprovalInbox() {
    const { openTab } = useTabs();
    const { hasPermission } = useMyPermissions();
    const user = { id: 'admin' }; // for passing userId to bulk actions

    const [activeTab, setActiveTab] = useState<1 | 2>(1);
    const [filters, setFilters] = useState({
        doc_type: 'ALL', doc_no: '', doc_date_from: '', doc_date_to: ''
    });
    const [sortMode, setSortMode] = useState<'submitted_at_desc' | 'overdue_desc'>('submitted_at_desc');

    const { documents, isLoading, isPaginating, hasMore, fetchDocs, canApprove, canReject, approve, reject, bulkApprove, bulkReject } = useApprovalInboxV3(activeTab, filters, sortMode);

    // Multiselect State
    const [selectedDocs, setSelectedDocs] = useState<Set<string>>(new Set());
    const [lastSelectedIdx, setLastSelectedIdx] = useState<number | null>(null);

    // UX State
    const [showHelp, setShowHelp] = useState(false);
    const [showDetailsPanel, setShowDetailsPanel] = useState(false);
    const [activeDocParams, setActiveDocParams] = useState<any>(null); // For Details Panel
    const [docAuditTrail, setDocAuditTrail] = useState<any[]>([]);

    // Bulk Results State
    const [bulkResults, setBulkResults] = useState<any[] | null>(null);

    // Reset selection on tab or refresh
    useEffect(() => {
        setSelectedDocs(new Set());
        setLastSelectedIdx(null);
    }, [activeTab, sortMode]);

    // Modal State
    const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
    const [rejectReason, setRejectReason] = useState('');
    const [rejectType, setRejectType] = useState<'single' | 'bulk'>('single');
    const [selectedSingleDoc, setSelectedSingleDoc] = useState<{ docType: string; docId: string | number } | null>(null);

    const toggleSelection = useCallback((idStr: string, index: number, shiftKey: boolean) => {
        setSelectedDocs(prev => {
            const next = new Set(prev);
            if (shiftKey && lastSelectedIdx !== null && documents.length > 0) {
                const start = Math.min(lastSelectedIdx, index);
                const end = Math.max(lastSelectedIdx, index);
                for (let i = start; i <= end; i++) {
                    const rowId = `${documents[i].doc_type}-${documents[i].doc_id}`;
                    next.add(rowId);
                }
            } else {
                if (next.has(idStr)) next.delete(idStr);
                else next.add(idStr);
            }
            return next;
        });
        setLastSelectedIdx(index);
    }, [lastSelectedIdx, documents]);

    const selectAll = () => {
        setSelectedDocs(new Set(documents.map(d => `${d.doc_type}-${d.doc_id}`)));
    };

    const columns: ColumnDef<any>[] = [
        { key: 'selector', title: 'تحديد', width: '5%' },
        { key: 'doc_type_disp', title: 'نوع السند', width: '15%' },
        { key: 'doc_no', title: 'رقم السند', width: '15%' },
        { key: 'doc_date_disp', title: 'التاريخ', width: '15%' },
        { key: 'total_amount', title: 'القيمة', width: '15%', type: 'number' },
        { key: 'submitted_at_disp', title: 'وقت الإرسال', width: '20%' },
        { key: 'status_disp', title: 'الحالة', width: '15%' }
    ];

    const grid = useSmartGridPro({
        columns,
        defaultRow: {},
        isLocked: true
    });

    useEffect(() => {
        if (documents) {
            grid.setRows(documents.map(doc => {
                const id = `${doc.doc_type}-${doc.doc_id}`;
                return {
                    id,
                    selector: selectedDocs.has(id) ? <CheckSquare className="text-indigo-600 w-5 h-5 mx-auto" /> : <Square className="text-slate-300 w-5 h-5 mx-auto" />,
                    doc_type: doc.doc_type,
                    doc_id: doc.doc_id,
                    doc_type_disp: doc.doc_type === 'sales_invoice' ? 'فاتورة مبيعات' : doc.doc_type === 'purchase_order' ? 'أمر شراء' : doc.doc_type === 'purchase_request' ? 'طلب شراء' : doc.doc_type,
                    doc_no: doc.doc_no,
                    doc_date_disp: (
                        <div className="flex items-center gap-2">
                            {doc.doc_date}
                            {doc.is_overdue && (
                                <span className="flex items-center gap-1 bg-rose-100 text-rose-700 px-2 py-0.5 rounded text-xs font-bold">
                                    <AlertCircle className="w-3 h-3" /> متأخر ({doc.overdue_minutes}د)
                                </span>
                            )}
                        </div>
                    ),
                    doc_date: doc.doc_date,
                    is_overdue: doc.is_overdue,
                    overdue_minutes: doc.overdue_minutes,
                    total_amount: doc.total_amount,
                    submitted_at_disp: new Date(doc.submitted_at).toLocaleString('ar-SA'),
                    status: doc.status,
                    status_disp: <DocumentStatusBadge status={doc.status} />
                };
            }));
        }
    }, [documents, selectedDocs]);

    const getActiveDocRef = useCallback(() => {
        if (!grid.activeCell) return null;
        const activeItem = grid.rows[grid.activeCell.row];
        if (!activeItem) return null;

        return {
            docType: activeItem.doc_type,
            docId: activeItem.doc_id,
            idStr: activeItem.id,
            index: grid.activeCell.row,
            row: activeItem
        };
    }, [grid.activeCell, grid.rows]);

    // Active Row Side Panel Data Fetcher
    useEffect(() => {
        const ref = getActiveDocRef();
        if (ref) {
            setActiveDocParams(ref.row);
            if (showDetailsPanel) {
                (window as any).electronAPI.documentsRead.getAuditTrail(ref.docId)
                    .then((trail: any) => setDocAuditTrail(trail || []))
                    .catch(console.error);
            }
        } else {
            setActiveDocParams(null);
            setDocAuditTrail([]);
        }
    }, [getActiveDocRef, showDetailsPanel]);

    const handleApproveSingle = async () => {
        const ref = getActiveDocRef();
        if (!ref || !user) return;
        try {
            await approve(ref.docType, String(ref.docId), user.id);
        } catch (e: any) { alert(e.message); }
    };

    const handleRejectSingle = () => {
        const ref = getActiveDocRef();
        if (!ref) return;
        setSelectedSingleDoc({ docType: ref.docType, docId: String(ref.docId) });
        setRejectType('single');
        setRejectReason('');
        setIsRejectModalOpen(true);
    };

    const handleBulkApprove = async () => {
        if (!user) return;
        const docsList = documents.filter(d => selectedDocs.has(`${d.doc_type}-${String(d.doc_id)}`));
        try {
            const results = await bulkApprove(docsList, user.id);
            setBulkResults(results || []);
        } catch (e: any) { alert(e.message); }
    };

    const handleBulkReject = () => {
        if (selectedDocs.size === 0) return;
        setRejectType('bulk');
        setRejectReason('');
        setIsRejectModalOpen(true);
    };

    const submitRejection = async () => {
        if (!user) return;
        if (!rejectReason.trim()) return;

        try {
            if (rejectType === 'single' && selectedSingleDoc) {
                await reject(selectedSingleDoc.docType, String(selectedSingleDoc.docId), rejectReason, user.id);
            } else if (rejectType === 'bulk') {
                const docsList = documents.filter(d => selectedDocs.has(`${d.doc_type}-${String(d.doc_id)}`));
                const results = await bulkReject(docsList, rejectReason, user.id);
                setBulkResults(results || []);
            }
            setIsRejectModalOpen(false);
        } catch (e: any) { alert(e.message); }
    };

    const handleOpenDocument = () => {
        const ref = getActiveDocRef();
        if (!ref) return;
        const path = getDocPath(ref.docType, ref.docId);
        openTab({ id: `${ref.docType}-${ref.docId}`, path, title: `مستند ${ref.docId}` });
    };

    // Keyboard handling
    useEffect(() => {
        const handleKeys = (e: KeyboardEvent) => {
            if (isRejectModalOpen || bulkResults || showHelp) {
                if (e.key === 'Escape') {
                    e.preventDefault();
                    if (isRejectModalOpen) setIsRejectModalOpen(false);
                    if (bulkResults) setBulkResults(null);
                    if (showHelp) setShowHelp(false);
                }
                return;
            }

            // Command Palette Help
            if (e.key === 'F1') {
                e.preventDefault();
                setShowHelp(true);
                return;
            }

            // Alt+D Toggle Details
            if (e.key === 'd' && e.altKey) {
                e.preventDefault();
                setShowDetailsPanel(prev => !prev);
                return;
            }

            // PageDown Pagination
            if (e.key === 'PageDown' && hasMore && !isPaginating && !isLoading) {
                e.preventDefault();
                fetchDocs(true);
                return;
            }

            // F9 logic handling
            if (e.key === 'F9') {
                e.preventDefault();
                if (e.ctrlKey) handleBulkApprove();
                else handleApproveSingle();
                return;
            }

            // F8 logic handling
            if (e.key === 'F8') {
                e.preventDefault();
                if (e.ctrlKey) handleBulkReject();
                else handleRejectSingle();
                return;
            }

            // F5
            if (e.key === 'F5') {
                e.preventDefault();
                fetchDocs(false);
                return;
            }

            // Space toggles selection
            if (e.key === ' ' && document.activeElement?.tagName !== 'INPUT') {
                e.preventDefault();
                const ref = getActiveDocRef();
                if (ref) toggleSelection(ref.idStr, ref.index, e.shiftKey);
                return;
            }

            // Ctrl+A Select all
            if (e.key === 'a' && e.ctrlKey && document.activeElement?.tagName !== 'INPUT') {
                e.preventDefault();
                selectAll();
                return;
            }

            // Enter to open
            if (e.key === 'Enter') {
                e.preventDefault();
                handleOpenDocument();
                return;
            }

            // Nav Tabs
            if (e.ctrlKey) {
                if (e.key === '1') { e.preventDefault(); setActiveTab(1); }
                if (e.key === '2') { e.preventDefault(); setActiveTab(2); }
            }
        };
        window.addEventListener('keydown', handleKeys);
        return () => window.removeEventListener('keydown', handleKeys);
    }, [
        isRejectModalOpen, bulkResults, showHelp, activeTab, hasMore, isPaginating, isLoading,
        handleBulkReject, handleRejectSingle, fetchDocs
    ]);

    return (
        <div className="min-h-screen bg-slate-50 p-6 flex flex-col font-sans" dir="rtl">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        صندوق الاعتمادات V4 <span className="bg-indigo-100 text-indigo-700 text-xs px-2 py-1 rounded">Enterprise</span>
                    </h2>
                    <p className="text-sm text-slate-500 mt-1">F1 للمساعدة | Alt+D للتفاصيل</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setSortMode(prev => prev === 'submitted_at_desc' ? 'overdue_desc' : 'submitted_at_desc')}
                        className={`px-4 py-2 border rounded-lg font-bold transition-colors ${sortMode === 'overdue_desc' ? 'bg-rose-50 border-rose-200 text-rose-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                    >
                        {sortMode === 'overdue_desc' ? 'ترتيب: المتأخر أولاً' : 'ترتيب: وقت الإرسال'}
                    </button>
                    <button
                        onClick={() => fetchDocs(false)}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors rounded-lg font-bold"
                    >
                        <RefreshCw className="w-5 h-5" />
                        تحديث القائمة
                    </button>
                </div>
            </div>

            {/* Quick Actions Legend */}
            <div className="mb-4 rounded-xl border border-slate-200 bg-white px-4 py-3 flex justify-between text-sm text-slate-600 items-center shadow-sm">
                <div className="flex gap-6 items-center flex-wrap">
                    <span className={canApprove ? 'font-bold text-emerald-700' : 'text-slate-400'}>
                        <strong>F9</strong>: اعتماد
                    </span>
                    <span className={canApprove && selectedDocs.size > 0 ? 'font-bold text-emerald-700' : 'text-slate-400'}>
                        <strong>Ctrl+F9</strong>: اعتماد جماعي ({selectedDocs.size})
                    </span>
                    <span className={canReject ? 'font-bold text-rose-700' : 'text-slate-400'}>
                        <strong>F8</strong>: رفض
                    </span>
                    <span className={canReject && selectedDocs.size > 0 ? 'font-bold text-rose-700' : 'text-slate-400'}>
                        <strong>Ctrl+F8</strong>: رفض جماعي ({selectedDocs.size})
                    </span>
                </div>
                <div>
                    <button onClick={() => setShowDetailsPanel(!showDetailsPanel)} className="font-bold border-r pr-4 border-slate-200 text-indigo-600 flex items-center gap-1 hover:text-indigo-800">
                        <Info className="w-4 h-4" />
                        Alt+D لتفاصيل المستند
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-4">
                <button
                    onClick={() => setActiveTab(1)}
                    className={`px-6 py-2.5 rounded-lg font-bold text-sm transition-colors ${activeTab === 1 ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}
                >
                    مستوى الإعتماد الأول (L1)
                </button>
                <button
                    onClick={() => setActiveTab(2)}
                    className={`px-6 py-2.5 rounded-lg font-bold text-sm transition-colors ${activeTab === 2 ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}
                >
                    مستوى الإعتماد الثاني (L2)
                </button>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex gap-4 min-h-0">
                {/* Grid */}
                <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-200 p-1 flex flex-col overflow-hidden relative">
                    {isLoading && documents.length === 0 ? (
                        <div className="m-auto text-slate-400 font-medium p-10 flex flex-col items-center gap-3">
                            <RefreshCw className="w-8 h-8 animate-spin" />
                            <div>جاري جلب المستندات...</div>
                        </div>
                    ) : documents.length === 0 ? (
                        <div className="m-auto text-slate-400 font-medium p-10 flex flex-col items-center gap-2">
                            <Filter className="w-8 h-8 opacity-50" />
                            <div>الصندوق فارغ أو لا توجد نتائح</div>
                        </div>
                    ) : (
                        <div className="flex-1 overflow-auto">
                            <SmartGrid
                                gridRef={grid.gridRef}
                                rows={grid.rows}
                                columns={columns}
                                activeCell={grid.activeCell}
                                isLocked={true}
                                onFocusCell={grid.focusCell}
                                onKeyDown={() => { }} // Disabled native keydown since we use custom logic here
                                onUpdateRow={grid.updateRow}
                                onRemoveRow={grid.removeRow}
                            />

                            {/* Pagination Status / Trigger */}
                            <div className="p-4 text-center border-t border-slate-100">
                                {isPaginating ? (
                                    <div className="inline-flex items-center gap-2 text-indigo-600 font-bold text-sm">
                                        <RefreshCw className="w-4 h-4 animate-spin" /> جاري التحميل...
                                    </div>
                                ) : hasMore ? (
                                    <button onClick={() => fetchDocs(true)} className="text-slate-500 hover:text-indigo-600 text-sm font-bold">
                                        تحميل المزيد (PageDown)
                                    </button>
                                ) : (
                                    <div className="text-slate-400 text-sm">تم عرض جميع المستندات</div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Details Side Panel */}
                {showDetailsPanel && (
                    <div className="w-80 bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col overflow-hidden">
                        <div className="bg-slate-50 p-4 border-b border-slate-200">
                            <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                <Info className="w-5 h-5 text-indigo-600" />
                                تفاصيل المستند
                            </h3>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 text-sm">
                            {!activeDocParams ? (
                                <div className="text-center text-slate-400 py-10">قم بتحديد مستند لعرض تفاصيله</div>
                            ) : (
                                <>
                                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 flex flex-col gap-2">
                                        <div className="flex justify-between">
                                            <span className="text-slate-500">النوع</span>
                                            <span className="font-bold">{activeDocParams.doc_type_disp}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-500">الرقم</span>
                                            <span className="font-bold text-indigo-700">{activeDocParams.doc_no}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-500">الإرسال</span>
                                            <span className="font-bold">{activeDocParams.submitted_at_disp}</span>
                                        </div>
                                        <div className="flex justify-between items-center mt-2 pt-2 border-t border-slate-200">
                                            <span className="font-bold text-slate-800">القيمة الإجمالية</span>
                                            <span className="text-emerald-700 font-bold text-lg">{activeDocParams.total_amount?.toLocaleString()}</span>
                                        </div>
                                        {activeDocParams.is_overdue && (
                                            <div className="bg-rose-100 text-rose-800 text-xs p-2 rounded font-bold mt-1 text-center">
                                                هذا المستند متأخر بمقدار {activeDocParams.overdue_minutes} دقيقة!
                                            </div>
                                        )}
                                    </div>

                                    <div>
                                        <h4 className="font-bold text-slate-700 mb-3">سجل الاعتمادات (Audit)</h4>
                                        <div className="relative border-r-2 border-slate-200 pr-4 space-y-4">
                                            {docAuditTrail.length === 0 ? (
                                                <div className="text-slate-400 py-2">لا يوجد سجل سابق</div>
                                            ) : docAuditTrail.map((audit, idx) => (
                                                <div key={idx} className="relative">
                                                    <div className="absolute w-3 h-3 bg-indigo-500 rounded-full -right-[23px] top-1 border-2 border-white"></div>
                                                    <div className="flex flex-col">
                                                        <span className="font-bold text-slate-800">{audit.action}</span>
                                                        <span className="text-xs text-slate-500">{new Date(audit.at).toLocaleString('ar-SA')} - {audit.display_name || audit.actor_user_id}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Help Overlay (F1) */}
            {showHelp && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm" onClick={() => setShowHelp(false)}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3 bg-indigo-50">
                            <Keyboard className="w-6 h-6 text-indigo-700" />
                            <h3 className="font-bold text-lg text-indigo-900">دليل اختصارات صندوق الاعتمادات</h3>
                        </div>
                        <div className="p-6 grid grid-cols-2 gap-8 text-sm">
                            <div>
                                <h4 className="font-bold text-slate-800 mb-4 border-b pb-2">التنقل والاختيار</h4>
                                <ul className="space-y-3">
                                    <li className="flex justify-between"><span className="text-slate-600">تنقل في القائمة</span><kbd className="font-sans px-2 py-1 bg-slate-100 rounded border border-slate-200">↑ ↓</kbd></li>
                                    <li className="flex justify-between"><span className="text-slate-600">فتح المستند لقرائته</span><kbd className="font-sans px-2 py-1 bg-slate-100 rounded border border-slate-200">Enter</kbd></li>
                                    <li className="flex justify-between"><span className="text-slate-600">تبديل المستوى (L1/L2)</span><kbd className="font-sans px-2 py-1 bg-slate-100 rounded border border-slate-200">Ctrl + 1 / 2</kbd></li>
                                    <li className="flex justify-between"><span className="text-slate-600">تحديد متعدد</span><kbd className="font-sans px-2 py-1 bg-slate-100 rounded border border-slate-200">Space</kbd></li>
                                    <li className="flex justify-between"><span className="text-slate-600">تحديد نطاق</span><kbd className="font-sans px-2 py-1 bg-slate-100 rounded border border-slate-200">Shift + Space</kbd></li>
                                    <li className="flex justify-between"><span className="text-slate-600">تحديد الكل</span><kbd className="font-sans px-2 py-1 bg-slate-100 rounded border border-slate-200">Ctrl + A</kbd></li>
                                    <li className="flex justify-between"><span className="text-slate-600">تحميل نتائج إضافية</span><kbd className="font-sans px-2 py-1 bg-slate-100 rounded border border-slate-200">PageDown</kbd></li>
                                </ul>
                            </div>
                            <div>
                                <h4 className="font-bold text-slate-800 mb-4 border-b pb-2">الإجراءات</h4>
                                <ul className="space-y-3">
                                    <li className="flex justify-between"><span className="text-slate-600">اعتماد المفرد المدد</span><kbd className="font-sans px-2 py-1 bg-emerald-50 text-emerald-700 border-emerald-200 rounded border">F9</kbd></li>
                                    <li className="flex justify-between"><span className="text-slate-600">اعتماد جماعي (المحدد)</span><kbd className="font-sans px-2 py-1 bg-emerald-50 text-emerald-700 border-emerald-200 rounded border">Ctrl + F9</kbd></li>
                                    <li className="flex justify-between"><span className="text-slate-600">رفض المفرد السريع</span><kbd className="font-sans px-2 py-1 bg-rose-50 text-rose-700 border-rose-200 rounded border">F8</kbd></li>
                                    <li className="flex justify-between"><span className="text-slate-600">رفض جماعي (المحدد)</span><kbd className="font-sans px-2 py-1 bg-rose-50 text-rose-700 border-rose-200 rounded border">Ctrl + F8</kbd></li>
                                    <li className="flex justify-between"><span className="text-slate-600">تحديث القائمة</span><kbd className="font-sans px-2 py-1 bg-slate-100 rounded border border-slate-200">F5</kbd></li>
                                    <li className="flex justify-between"><span className="text-slate-600">إظهار الدليل</span><kbd className="font-sans px-2 py-1 bg-slate-100 rounded border border-slate-200">F1</kbd></li>
                                    <li className="flex justify-between"><span className="text-slate-600">لوحة التفاصيل الجانبية</span><kbd className="font-sans px-2 py-1 bg-slate-100 rounded border border-slate-200">Alt + D</kbd></li>
                                </ul>
                            </div>
                        </div>
                        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 text-center">
                            <span className="text-slate-500 text-xs">اضغط <kbd className="font-sans px-1 bg-slate-200 rounded">Esc</kbd> للإغلاق</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Reject Modal */}
            {isRejectModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-[1px]">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-rose-50 text-rose-800">
                            <h3 className="font-bold text-lg flex items-center gap-2">
                                <XCircle className="w-5 h-5" />
                                تأكيد رفض {rejectType === 'bulk' ? `جماعي (${selectedDocs.size} مستند)` : 'المستند'}
                            </h3>
                        </div>
                        <div className="p-6">
                            <label className="block text-sm font-bold text-slate-700 mb-2">سبب الرفض (إلزامي)</label>
                            <textarea
                                value={rejectReason}
                                onChange={(e) => setRejectReason(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20"
                                rows={4}
                                placeholder="يرجى كتابة سبب الرفض الواضح لإعلام المنشئ..."
                                autoFocus
                            />
                        </div>
                        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-2">
                            <button
                                onClick={() => setIsRejectModalOpen(false)}
                                className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg font-bold transition-colors"
                            >
                                إلغاء (Esc)
                            </button>
                            <button
                                onClick={submitRejection}
                                disabled={!rejectReason.trim()}
                                className="px-6 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-bold shadow-sm transition-colors"
                            >
                                تأكيد الرفض
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Bulk Results Summary Modal */}
            {bulkResults && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-[1px]" onClick={() => setBulkResults(null)}>
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[80vh]" onClick={e => e.stopPropagation()}>
                        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <h3 className="font-bold text-lg text-slate-800">
                                تقرير العملية الجماعية
                            </h3>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6">
                            <div className="flex gap-4 mb-6">
                                <div className="flex-1 bg-emerald-50 text-emerald-800 p-4 rounded-xl text-center border border-emerald-100">
                                    <div className="text-3xl font-black">{bulkResults.filter(r => r.success).length}</div>
                                    <div className="font-bold text-sm">عملية ناجحة</div>
                                </div>
                                <div className="flex-1 bg-rose-50 text-rose-800 p-4 rounded-xl text-center border border-rose-100">
                                    <div className="text-3xl font-black">{bulkResults.filter(r => !r.success).length}</div>
                                    <div className="font-bold text-sm">أخطاء</div>
                                </div>
                            </div>

                            {bulkResults.some(r => !r.success) && (
                                <div>
                                    <h4 className="font-bold text-slate-700 mb-3">تفاصيل الأخطاء</h4>
                                    <div className="space-y-2">
                                        {bulkResults.filter(r => !r.success).map((fail, i) => (
                                            <div key={i} className="bg-rose-50/50 p-3 rounded-lg border border-rose-100 flex gap-2">
                                                <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />
                                                <div className="text-sm">
                                                    <span className="font-bold text-rose-800">مستند {fail.docId}</span>:
                                                    <span className="text-rose-600 mr-2">{fail.error}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 text-center">
                            <button
                                onClick={() => setBulkResults(null)}
                                className="px-8 py-2 bg-slate-800 text-white hover:bg-slate-900 rounded-lg font-bold transition-colors"
                            >
                                إغلاق (Esc)
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}
