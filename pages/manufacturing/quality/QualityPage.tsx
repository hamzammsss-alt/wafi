import React, { useState, useEffect } from 'react';
import {
    ClipboardCheck, Plus, CheckCircle, XCircle, AlertTriangle,
    Beaker, Search, Filter
} from 'lucide-react';

const QualityPage = () => {
    const [activeTab, setActiveTab] = useState<'inspections' | 'tests'>('inspections');
    const [inspections, setInspections] = useState<any[]>([]);
    const [tests, setTests] = useState<any[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState<any>({});

    // Test Definition Form
    const [testForm, setTestForm] = useState<any>({});
    const [showTestModal, setShowTestModal] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        // @ts-ignore
        const insps = await window.electronAPI.manufacturing.getInspections();
        setInspections(insps || []);
        // @ts-ignore
        const tsts = await window.electronAPI.manufacturing.getQCTests();
        setTests(tsts || []);
    };

    const handleSaveInspection = async () => {
        try {
            // @ts-ignore
            await window.electronAPI.manufacturing.saveInspection({
                ...formData,
                inspector_id: '1', // Mock User
                status: formData.passed_quantity > 0 && formData.failed_quantity === 0 ? 'PASSED' : 'FAILED'
            });
            setShowModal(false);
            loadData();
        } catch (e) {
            console.error(e);
        }
    };

    const handleSaveTest = async () => {
        try {
            // @ts-ignore
            await window.electronAPI.manufacturing.saveQCTest(testForm);
            setShowTestModal(false);
            loadData();
        } catch (e) {
            console.error(e);
        }
    };

    return (
        <div className="p-6 bg-slate-50 min-h-screen rtl" dir="rtl">
            <h1 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                <ClipboardCheck className="text-blue-600" />
                مراقبة الجودة (Quality Control)
            </h1>

            {/* Tabs */}
            <div className="flex gap-4 mb-6 border-b border-slate-200">
                <button
                    className={`pb-2 px-4 font-bold ${activeTab === 'inspections' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500'}`}
                    onClick={() => setActiveTab('inspections')}
                >
                    سجلات الفحص
                </button>
                <button
                    className={`pb-2 px-4 font-bold ${activeTab === 'tests' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500'}`}
                    onClick={() => setActiveTab('tests')}
                >
                    تعريف الاختبارات
                </button>
            </div>

            {activeTab === 'inspections' ? (
                <div>
                    <div className="flex justify-between mb-4">
                        <div className="relative w-64">
                            <input type="text" placeholder="بحث..." className="w-full pl-8 pr-3 py-2 border rounded-lg" />
                            <Search className="absolute left-2 top-2.5 text-slate-400" size={18} />
                        </div>
                        <button
                            onClick={() => { setFormData({}); setShowModal(true); }}
                            className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700"
                        >
                            <Plus size={18} /> فحص جديد
                        </button>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                        <table className="w-full text-right">
                            <thead className="bg-slate-50 text-slate-600 font-bold text-sm">
                                <tr>
                                    <th className="p-4">التاريخ</th>
                                    <th className="p-4">المرجع</th>
                                    <th className="p-4">رقم الدفعة</th>
                                    <th className="p-4">الكميات (ناجح/فاشل)</th>
                                    <th className="p-4">الحالة</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {inspections.map(ins => (
                                    <tr key={ins.id} className="hover:bg-slate-50">
                                        <td className="p-4 text-slate-600">{ins.inspection_date?.split('T')[0]}</td>
                                        <td className="p-4 font-bold">{ins.reference_type} #{ins.reference_id?.substring(0, 6)}</td>
                                        <td className="p-4 font-mono text-sm">{ins.batch_number}</td>
                                        <td className="p-4">
                                            <span className="text-emerald-600 font-bold">{ins.passed_quantity}</span> /
                                            <span className="text-red-500 font-bold"> {ins.failed_quantity}</span>
                                        </td>
                                        <td className="p-4">
                                            {ins.status === 'PASSED' && <span className="text-emerald-600 flex items-center gap-1 bg-emerald-50 px-2 py-1 rounded w-fit text-xs font-bold"><CheckCircle size={14} /> ناجح</span>}
                                            {ins.status === 'FAILED' && <span className="text-red-600 flex items-center gap-1 bg-red-50 px-2 py-1 rounded w-fit text-xs font-bold"><XCircle size={14} /> فاشل</span>}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <div>
                    <div className="flex justify-end mb-4">
                        <button
                            onClick={() => { setTestForm({}); setShowTestModal(true); }}
                            className="bg-slate-800 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-slate-900"
                        >
                            <Plus size={18} /> اختبار جديد
                        </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {tests.map(t => (
                            <div key={t.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm relative">
                                <div className="absolute top-4 left-4 text-slate-300"><Beaker size={24} /></div>
                                <h3 className="font-bold text-lg mb-1">{t.name}</h3>
                                <p className="text-slate-500 text-sm mb-3">{t.description || 'لا يوجد وصف'}</p>
                                <div className="flex gap-2">
                                    <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs font-bold">{t.test_type}</span>
                                    {t.unit && <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-xs">{t.unit}</span>}
                                </div>
                                <div className="mt-3 text-sm text-slate-600">
                                    المقبول: <span className="font-mono font-bold">{t.min_value} - {t.max_value}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Inspection Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl w-full max-w-lg p-6">
                        <h3 className="font-bold text-lg mb-4">تسجيل نتيجة فحص</h3>
                        <div className="space-y-3">
                            <div>
                                <label className="block text-sm font-bold text-slate-600 mb-1">نوع المرجع</label>
                                <select
                                    value={formData.reference_type}
                                    onChange={e => setFormData({ ...formData, reference_type: e.target.value })}
                                    className="w-full border p-2 rounded-lg"
                                >
                                    <option value="">اختر...</option>
                                    <option value="PRODUCTION_ORDER">أمر تصنيع</option>
                                    <option value="RECEIPT">استلام بضاعة</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-600 mb-1">رقم المرجع (ID)</label>
                                <input
                                    className="w-full border p-2 rounded-lg"
                                    value={formData.reference_id || ''}
                                    onChange={e => setFormData({ ...formData, reference_id: e.target.value })}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-slate-600 mb-1">الكمية المقبولة</label>
                                    <input
                                        type="number"
                                        className="w-full border p-2 rounded-lg border-emerald-200 focus:ring-emerald-200"
                                        value={formData.passed_quantity || 0}
                                        onChange={e => setFormData({ ...formData, passed_quantity: parseFloat(e.target.value) })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-600 mb-1">الكمية المرفوضة</label>
                                    <input
                                        type="number"
                                        className="w-full border p-2 rounded-lg border-red-200 focus:ring-red-200"
                                        value={formData.failed_quantity || 0}
                                        onChange={e => setFormData({ ...formData, failed_quantity: parseFloat(e.target.value) })}
                                    />
                                </div>
                            </div>
                            <button
                                onClick={handleSaveInspection}
                                className="w-full bg-blue-600 text-white py-2 rounded-lg font-bold mt-4"
                            >
                                حفظ النتيجة
                            </button>
                            <button
                                onClick={() => setShowModal(false)}
                                className="w-full text-slate-500 py-2 mt-2"
                            >
                                إلغاء
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Test Modal */}
            {showTestModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl w-full max-w-md p-6">
                        <h3 className="font-bold text-lg mb-4">تعريف اختبار جديد</h3>
                        <div className="space-y-3">
                            <input
                                placeholder="اسم الاختبار"
                                className="w-full border p-2 rounded-lg"
                                value={testForm.name || ''}
                                onChange={e => setTestForm({ ...testForm, name: e.target.value })}
                            />
                            <select
                                value={testForm.test_type}
                                onChange={e => setTestForm({ ...testForm, test_type: e.target.value })}
                                className="w-full border p-2 rounded-lg"
                            >
                                <option value="">نوع الاختبار...</option>
                                <option value="VISUAL">فحص بصري</option>
                                <option value="MEASUREMENT">قياس</option>
                            </select>
                            <div className="grid grid-cols-2 gap-2">
                                <input placeholder="Min" type="number" className="border p-2 rounded" onChange={e => setTestForm({ ...testForm, min_value: e.target.value })} />
                                <input placeholder="Max" type="number" className="border p-2 rounded" onChange={e => setTestForm({ ...testForm, max_value: e.target.value })} />
                            </div>
                            <button
                                onClick={handleSaveTest}
                                className="w-full bg-slate-800 text-white py-2 rounded-lg font-bold mt-4"
                            >
                                حفظ
                            </button>
                            <button
                                onClick={() => setShowTestModal(false)}
                                className="w-full text-slate-500 py-2 mt-2"
                            >
                                إلغاء
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default QualityPage;
