import React from 'react';
import { Cpu, Radio, Zap } from 'lucide-react';

export const RFIDIntegration = () => {
    return (
        <div className="app-page h-full flex flex-col" dir="rtl">
            <div className="mb-6 flex items-center gap-3">
                <div className="rounded-full bg-indigo-100 p-3 text-indigo-600">
                    <Cpu size={28} />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">تكامل RFID</h1>
                    <p className="text-sm text-gray-600">واجهة لإدارة أجهزة RFID وربطها مع نظام الأصول والمخزون.</p>
                </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
                <div className="card p-6">
                    <h2 className="font-bold text-lg text-gray-800 mb-4">حالة القارئ</h2>
                    <div className="space-y-3 text-gray-700">
                        <p>يمكنك ربط قارئ RFID خارجي عبر منفذ USB أو شبكة محلية.</p>
                        <p>سيعرض النظام حالة الاتصال، وسجل البطاقات الممسوحة، والإجراءات التالية.</p>
                        <button className="mt-4 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-white font-bold hover:bg-indigo-700">
                            <Zap size={18} /> تشغيل فحص الجهاز
                        </button>
                    </div>
                </div>

                <div className="card p-6 bg-slate-50">
                    <h2 className="font-bold text-lg text-gray-800 mb-4">قراءة بطاقة</h2>
                    <div className="rounded-xl border border-dashed border-gray-300 bg-white p-6 text-center">
                        <Radio size={48} className="mx-auto text-indigo-600 mb-4" />
                        <p className="text-gray-700">انقر على زر الفحص لإرسال النظام إلى وضع الاستماع إلى قارئ RFID.</p>
                        <p className="text-sm text-gray-500 mt-3">بعد قراءة البطاقة، سيتم عرض معلومات العنصر أو المورد المرتبط تلقائياً.</p>
                    </div>
                </div>
            </div>

            <div className="card p-6 mt-6">
                <h2 className="font-bold text-lg text-gray-800 mb-4">معلومات إضافية</h2>
                <ul className="list-disc list-inside space-y-2 text-gray-700">
                    <li>دعم إضافة تهيئة منفذ القارئ.</li>
                    <li>ربط بطاقة RFID بالأصناف، الأصول، أو الباركود.</li>
                    <li>تتبع تحركات المخزون عبر مسح RFID أوتوماتيكياً.</li>
                </ul>
            </div>
        </div>
    );
};