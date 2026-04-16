import React, { useMemo, useState } from 'react';
import { CalendarClock, Copy, Play } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { DocumentSupportDock } from '../../../src/components/workspace/DocumentSupportDock';
import { WorkspaceHeader } from '../../../src/components/workspace/WorkspaceHeader';
import { buildDocumentSupportSections } from '../../../src/components/workspace/documentSupportSections';
import { JournalVoucherDefinition } from '../../../src/pages/accounting/JournalVoucherDefinition';

export const RecurringVoucher = () => {
    const navigate = useNavigate();
    const helperSections = useMemo(() => buildDocumentSupportSections(JournalVoucherDefinition), []);
    const [templates] = useState([
        { id: 1, name: 'الإيجار الشهري', next_run: '2026-05-01', frequency: 'شهري', amount: 5000 },
        { id: 2, name: 'رواتب الموظفين', next_run: '2026-04-30', frequency: 'شهري', amount: 45000 },
    ]);
    const [isCreating, setIsCreating] = useState(false);

    if (isCreating) {
        return (
            <div className="p-6 bg-slate-50 h-full flex flex-col gap-6" dir="rtl">
                <WorkspaceHeader
                    icon={<Copy size={22} />}
                    title="تعريف قالب قيد متكرر"
                    subtitle="ابدأ من نفس نموذج سند القيد الموحد، ثم احفظه لاحقاً كقالب للتكرار."
                    badges={[
                        { label: 'قوالب القيود', tone: 'info' },
                        { label: 'تجهيز سريع', tone: 'neutral' },
                    ]}
                    actions={(
                        <>
                            <button onClick={() => setIsCreating(false)} className="app-toolbar-btn app-focus-ring">
                                <span>العودة للقائمة</span>
                            </button>
                            <button
                                onClick={() => navigate('/gl/journal-vouchers/new')}
                                className="rounded-xl bg-gradient-to-r from-indigo-600 to-violet-500 px-4 py-2 text-sm font-bold text-white shadow-lg shadow-indigo-900/15 transition hover:brightness-105"
                            >
                                فتح سند جديد
                            </button>
                        </>
                    )}
                />

                <DocumentSupportDock
                    sections={helperSections}
                    title="تعريفات القيد المتكرر"
                    description="يمكنك إدارة الحسابات ومراكز التكلفة والتعريفات المالية قبل إعداد قالب القيد المتكرر."
                />

                <div className="app-elevated p-6 space-y-4">
                    <h2 className="text-lg font-extrabold text-slate-900">آلية العمل الحالية</h2>
                    <p className="text-sm text-slate-600">
                        تم توحيد تجربة القيود بحيث يبدأ القيد المتكرر من نفس نموذج سند القيد. افتح السند الجديد،
                        أدخل البيانات، ثم أكمل حفظه كقالب تكرار ضمن المرحلة التالية من التشغيل.
                    </p>
                    <div className="grid gap-3 md:grid-cols-3">
                        <div className="rounded-2xl border border-slate-200 bg-white p-4">
                            <div className="text-sm font-bold text-slate-900">1. إعداد القيد</div>
                            <p className="mt-2 text-xs text-slate-500">أدخل الحسابات والبيان والمدين والدائن بنفس الشبكة الموحدة.</p>
                        </div>
                        <div className="rounded-2xl border border-slate-200 bg-white p-4">
                            <div className="text-sm font-bold text-slate-900">2. ضبط التكرار</div>
                            <p className="mt-2 text-xs text-slate-500">حدد لاحقاً التكرار الشهري أو الأسبوعي للقالب.</p>
                        </div>
                        <div className="rounded-2xl border border-slate-200 bg-white p-4">
                            <div className="text-sm font-bold text-slate-900">3. التنفيذ</div>
                            <p className="mt-2 text-xs text-slate-500">نفّذ القالب دورياً مع مراجعة قبل الترحيل.</p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 bg-slate-50 h-full flex flex-col gap-6" dir="rtl">
            <WorkspaceHeader
                icon={<CalendarClock size={22} />}
                title="القيود المتكررة"
                subtitle="إدارة قوالب القيود الدورية مع نفس أسلوب السندات الموحد داخل النظام."
                badges={[
                    { label: `${templates.length} قوالب`, tone: 'info' },
                    { label: 'شهري/أسبوعي', tone: 'neutral' },
                ]}
                actions={(
                    <button
                        onClick={() => setIsCreating(true)}
                        className="rounded-xl bg-gradient-to-r from-indigo-600 to-violet-500 px-4 py-2 text-sm font-bold text-white shadow-lg shadow-indigo-900/15 transition hover:brightness-105"
                    >
                        <span className="inline-flex items-center gap-2">
                            <Copy size={16} />
                            <span>إنشاء قالب جديد</span>
                        </span>
                    </button>
                )}
            />

            <DocumentSupportDock
                sections={helperSections}
                title="تعريفات القيود المتكررة"
                description="افتح دليل الحسابات ومراكز التكلفة والتعريفات المالية أثناء إعداد القوالب المتكررة."
            />

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {templates.map((template) => (
                    <div key={template.id} className="app-elevated p-5">
                        <div className="flex items-start justify-between gap-3 mb-4">
                            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                                <Copy size={20} />
                            </div>
                            <span className="rounded-xl border border-slate-200 bg-white px-3 py-1 text-xs font-bold text-slate-500">
                                {template.frequency}
                            </span>
                        </div>
                        <h3 className="text-lg font-extrabold text-slate-900">{template.name}</h3>
                        <p className="mt-2 text-sm text-slate-500">
                            التنفيذ القادم: <span className="font-mono text-slate-700">{template.next_run}</span>
                        </p>
                        <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4">
                            <div className="font-mono text-base font-bold text-slate-800">
                                {template.amount.toLocaleString()} شيكل
                            </div>
                            <button className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-bold text-indigo-700 transition hover:bg-indigo-50">
                                <Play size={16} />
                                <span>تنفيذ</span>
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
