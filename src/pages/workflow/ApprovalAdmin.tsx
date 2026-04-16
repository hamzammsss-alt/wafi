import React, { useState } from 'react';
import ApprovalRulesAdmin from './ApprovalRulesAdmin';
import ApprovalSlaAdmin from './ApprovalSlaAdmin';
import ApprovalSchedulerLogs from './ApprovalSchedulerLogs';

export default function ApprovalAdmin() {
    const [activeTab, setActiveTab] = useState<'rules' | 'sla' | 'logs'>('rules');

    return (
        <div className="min-h-screen bg-slate-50 p-6 font-sans flex flex-col" dir="rtl">
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-slate-800">إعدادات سير الاعتمادات (Workflow Config)</h2>
                <p className="text-sm text-slate-500 mt-1">إدارة قواعد التصعيد التلقائي للمستندات والتنبيهات المجدولة وسجلات تشغيلها.</p>
            </div>

            <div className="flex gap-2 mb-4 border-b border-slate-200 pb-2">
                <button
                    onClick={() => setActiveTab('rules')}
                    className={`px-6 py-2 rounded-lg font-bold text-sm transition-colors ${activeTab === 'rules' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-200'}`}
                >
                    قواعد الاعتماد والقيمة (Amount Rules)
                </button>
                <button
                    onClick={() => setActiveTab('sla')}
                    className={`px-6 py-2 rounded-lg font-bold text-sm transition-colors ${activeTab === 'sla' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-200'}`}
                >
                    مستوى الخدمة (SLA Rules)
                </button>
                <button
                    onClick={() => setActiveTab('logs')}
                    className={`px-6 py-2 rounded-lg font-bold text-sm transition-colors ${activeTab === 'logs' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-200'}`}
                >
                    سجل تشغيل الجدولة (Scheduler Logs)
                </button>
            </div>

            <div className="flex-1 min-h-0 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden relative">
                <div className="absolute inset-0 overflow-auto">
                    {activeTab === 'rules' && <div className="scale-[0.98] origin-top"><ApprovalRulesAdmin /></div>}
                    {activeTab === 'sla' && <ApprovalSlaAdmin />}
                    {activeTab === 'logs' && <ApprovalSchedulerLogs />}
                </div>
            </div>
        </div>
    );
}
