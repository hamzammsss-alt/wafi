import React, { useMemo, useState } from 'react';
import { Mail, Send, Link2 } from 'lucide-react';

export const EmailService = () => {
    const [to, setTo] = useState('');
    const [cc, setCc] = useState('');
    const [subject, setSubject] = useState('');
    const [body, setBody] = useState('');
    const [smtpHost, setSmtpHost] = useState('smtp.example.com');
    const [smtpPort, setSmtpPort] = useState('587');
    const [smtpUser, setSmtpUser] = useState('user@example.com');
    const [smtpPassword, setSmtpPassword] = useState('');
    const [sendStatus, setSendStatus] = useState('');
    const [isSending, setIsSending] = useState(false);

    const mailtoLink = useMemo(() => {
        const params = new URLSearchParams();
        if (cc.trim()) params.set('cc', cc.trim());
        if (subject.trim()) params.set('subject', subject.trim());
        if (body.trim()) params.set('body', body.trim());
        return `mailto:${to.trim() || ''}?${params.toString()}`;
    }, [to, cc, subject, body]);

    return (
        <div className="app-page h-full flex flex-col" dir="rtl">
            <h1 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                <Mail className="text-indigo-600" /> دمج البريد الإلكتروني
            </h1>

            <div className="grid grid-cols-3 gap-6">
                <div className="col-span-2 card p-6">
                    <h2 className="font-bold text-gray-800 mb-4 border-b pb-2">إرسال بريد إلكتروني</h2>
                    <div className="space-y-5">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">إلى</label>
                            <input
                                className="w-full border rounded-lg p-3 bg-gray-50"
                                placeholder="email@example.com"
                                value={to}
                                onChange={e => setTo(e.target.value)}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">نسخة إلى (CC)</label>
                            <input
                                className="w-full border rounded-lg p-3 bg-gray-50"
                                placeholder="cc@example.com"
                                value={cc}
                                onChange={e => setCc(e.target.value)}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">الموضوع</label>
                            <input
                                className="w-full border rounded-lg p-3 bg-gray-50"
                                placeholder="موضوع البريد"
                                value={subject}
                                onChange={e => setSubject(e.target.value)}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">نص البريد</label>
                            <textarea
                                className="w-full border rounded-lg p-3 bg-gray-50 h-40"
                                placeholder="اكتب نص البريد هنا..."
                                value={body}
                                onChange={e => setBody(e.target.value)}
                            />
                        </div>

                        <button
                            className="bg-indigo-600 text-white px-8 py-3 rounded-lg font-bold hover:bg-indigo-700 shadow-sm flex items-center gap-2 w-fit"
                            onClick={async () => {
                                if (!(window as any)?.electronAPI?.email?.sendEmail) {
                                    window.open(mailtoLink, '_blank');
                                    return;
                                }
                                setIsSending(true);
                                setSendStatus('');
                                try {
                                    await (window as any).electronAPI.email.sendEmail({
                                        host: smtpHost,
                                        port: smtpPort,
                                        secure: smtpPort === '465',
                                        user: smtpUser,
                                        pass: smtpPassword,
                                        to,
                                        cc,
                                        subject,
                                        text: body,
                                        html: `<p>${body.replace(/\n/g, '<br/>')}</p>`,
                                    });
                                    setSendStatus('تم إرسال البريد بنجاح عبر SMTP.');
                                } catch (error: any) {
                                    setSendStatus(`فشل الإرسال: ${error?.message || 'حدث خطأ'}`);
                                } finally {
                                    setIsSending(false);
                                }
                            }}
                            disabled={isSending}
                        >
                            <Send size={18} /> {isSending ? 'جاري الإرسال...' : 'إرسال عبر SMTP'}
                        </button>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="card p-6">
                        <h3 className="font-bold text-gray-700 mb-4">معاينة الرابط</h3>
                        <div className="bg-gray-50 rounded-lg border p-4 text-sm text-gray-700 break-all">{mailtoLink}</div>
                        <button
                            className="mt-4 w-full bg-white border border-gray-200 text-gray-700 py-2 rounded-lg font-bold hover:bg-gray-100"
                            onClick={() => navigator.clipboard.writeText(mailtoLink)}
                        >
                            <Link2 size={16} className="inline-block mr-2" /> نسخ الرابط
                        </button>
                    </div>

                    <div className="card p-6 bg-white border border-gray-200">
                        <h3 className="font-bold text-gray-800 mb-4">إعدادات SMTP</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">خادم SMTP</label>
                                <input
                                    className="w-full border rounded-lg p-3 bg-gray-50"
                                    placeholder="smtp.example.com"
                                    value={smtpHost}
                                    onChange={e => setSmtpHost(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">المنفذ</label>
                                <input
                                    className="w-full border rounded-lg p-3 bg-gray-50"
                                    placeholder="587"
                                    value={smtpPort}
                                    onChange={e => setSmtpPort(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">اسم المستخدم</label>
                                <input
                                    className="w-full border rounded-lg p-3 bg-gray-50"
                                    placeholder="user@example.com"
                                    value={smtpUser}
                                    onChange={e => setSmtpUser(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">كلمة المرور</label>
                                <input
                                    className="w-full border rounded-lg p-3 bg-gray-50"
                                    type="password"
                                    value={smtpPassword}
                                    onChange={e => setSmtpPassword(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="card p-6 bg-indigo-50 border-indigo-100">
                        <h3 className="font-bold text-gray-800 mb-3">حالة الإرسال</h3>
                        <p className="text-sm text-gray-700 leading-relaxed min-h-[4rem]">{sendStatus || 'استخدم إعدادات SMTP لإرسال البريد مباشرة من النظام.'}</p>
                    </div>
                </div>
            </div>
        </div>
    );
};