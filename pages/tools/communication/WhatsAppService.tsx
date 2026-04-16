import React, { useMemo, useState } from 'react';
import { MessageCircle, Send, Link2, Smartphone } from 'lucide-react';

export const WhatsAppService = () => {
    const [recipients, setRecipients] = useState('');
    const [message, setMessage] = useState('');

    const previewLink = useMemo(() => {
        const encodedText = encodeURIComponent(message || 'مرحباً من نظام WAFI ERP');
        const cleanedNumbers = recipients
            .split(/[\s,;]+/)
            .filter(Boolean)
            .map(number => number.replace(/[^0-9+]/g, ''))
            .join(',');

        return cleanedNumbers
            ? `https://wa.me/${cleanedNumbers}?text=${encodedText}`
            : `https://wa.me/?text=${encodedText}`;
    }, [recipients, message]);

    return (
        <div className="app-page h-full flex flex-col" dir="rtl">
            <h1 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                <Smartphone className="text-green-500" /> التكامل مع WhatsApp
            </h1>

            <div className="grid grid-cols-3 gap-6">
                <div className="col-span-2 card p-6">
                    <h2 className="font-bold text-gray-800 mb-4 border-b pb-2">إرسال رسالة WhatsApp</h2>
                    <div className="space-y-5">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">أرقام الهواتف</label>
                            <textarea
                                className="w-full border rounded-lg p-3 bg-gray-50 h-24"
                                placeholder="أدخل الأرقام مفصولة بفاصلة أو مسافة"
                                value={recipients}
                                onChange={e => setRecipients(e.target.value)}
                            />
                            <div className="text-xs text-gray-400 mt-2">مثال: 201234567890+, 201112223334</div>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">نص الرسالة</label>
                            <textarea
                                className="w-full border rounded-lg p-3 bg-gray-50 h-40"
                                placeholder="اكتب نص الرسالة هنا..."
                                value={message}
                                onChange={e => setMessage(e.target.value)}
                            />
                        </div>

                        <button
                            className="bg-green-600 text-white px-8 py-3 rounded-lg font-bold hover:bg-green-700 shadow-sm flex items-center gap-2 w-fit"
                            onClick={() => window.open(previewLink, '_blank')}
                        >
                            <Send size={18} /> فتح WhatsApp
                        </button>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="card p-6">
                        <h3 className="font-bold text-gray-700 mb-4">معاينة الرابط</h3>
                        <div className="bg-gray-50 rounded-lg border p-4 text-sm text-gray-700 break-all">{previewLink}</div>
                        <button
                            className="mt-4 w-full bg-white border border-gray-200 text-gray-700 py-2 rounded-lg font-bold hover:bg-gray-100"
                            onClick={() => navigator.clipboard.writeText(previewLink)}
                        >
                            <Link2 size={16} className="inline-block mr-2" /> نسخ الرابط
                        </button>
                    </div>

                    <div className="card p-6 bg-green-50 border-green-100">
                        <h3 className="font-bold text-gray-800 mb-3">ملاحظة</h3>
                        <p className="text-sm text-gray-700 leading-relaxed">
                            يمكنك استخدام هذا النموذج لإرسال روابط WhatsApp مباشرة إلى تطبيق WhatsApp Web أو جهازك المحمول. يدعم النظام إنشاء رسائل سريعة للتواصل مع العملاء والموردين.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};