import React, { useMemo } from 'react';
import { FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { DocumentSupportDock } from '../../../src/components/workspace/DocumentSupportDock';
import { WorkspaceHeader } from '../../../src/components/workspace/WorkspaceHeader';
import { buildDocumentSupportSections } from '../../../src/components/workspace/documentSupportSections';
import { JournalVoucherDefinition } from '../../../src/pages/accounting/JournalVoucherDefinition';

export const SettlementVoucher = () => {
    const navigate = useNavigate();
    const helperSections = useMemo(() => buildDocumentSupportSections(JournalVoucherDefinition), []);

    return (
        <div className="h-full flex flex-col bg-slate-50 p-6 gap-6" dir="rtl">
            <WorkspaceHeader
                icon={<FileText size={22} />}
                title="قيود التسوية"
                subtitle="ابدأ قيد التسوية من نفس نموذج سند القيد الموحد مع الوصول السريع للتعريفات المالية."
                badges={[
                    { label: 'نموذج موحد', tone: 'info' },
                    { label: 'تسويات شهرية/سنوية', tone: 'neutral' },
                ]}
                actions={(
                    <button
                        onClick={() => navigate('/gl/journal-vouchers/new')}
                        className="rounded-xl bg-gradient-to-r from-orange-600 to-amber-500 px-4 py-2 text-sm font-bold text-white shadow-lg shadow-orange-900/15 transition hover:brightness-105"
                    >
                        فتح سند تسوية جديد
                    </button>
                )}
            />

            <DocumentSupportDock
                sections={helperSections}
                title="تعريفات قيود التسوية"
                description="يمكنك مراجعة الحسابات والتعريفات المالية ومراكز التكلفة قبل إنشاء قيد التسوية."
            />

            <div className="app-elevated p-6 space-y-4">
                <h2 className="text-lg font-extrabold text-slate-900">آلية التسوية الجديدة</h2>
                <p className="text-sm text-slate-600">
                    تم اعتماد نفس واجهة سند القيد الموحدة لقيود التسوية حتى تبقى طريقة الإدخال والتنقل والحفظ
                    واحدة في جميع السندات المالية.
                </p>
                <div className="grid gap-3 md:grid-cols-3">
                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                        <div className="text-sm font-bold text-slate-900">إدخال جدولي</div>
                        <p className="mt-2 text-xs text-slate-500">أدخل الحسابات والبيان والمدين والدائن بنفس الشبكة الموحدة.</p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                        <div className="text-sm font-bold text-slate-900">لوحة تعريفات</div>
                        <p className="mt-2 text-xs text-slate-500">افتح الحسابات ومراكز التكلفة من أعلى الصفحة دون مغادرة القيد.</p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                        <div className="text-sm font-bold text-slate-900">ترحيل موحد</div>
                        <p className="mt-2 text-xs text-slate-500">احفظ وراجع ثم رحّل التسوية بنفس دورة العمل المعتمدة.</p>
                    </div>
                </div>
            </div>
        </div>
    );
};
