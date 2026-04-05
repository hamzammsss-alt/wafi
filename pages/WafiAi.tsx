import React, { useState, useEffect } from 'react';
import {
    Send, Mic, Paperclip, Sparkles, User, Bot,
    FileText, TrendingUp, AlertTriangle, Lightbulb
} from 'lucide-react';
import { authService } from '../services/authService';

// Mock Suggestions based on Role
const SUGGESTIONS: Record<string, string[]> = {
    'admin': [
        "حلل أداء المبيعات لهذا الشهر مقارنة بالسنة الماضية",
        "هل هناك أي مخاطر في التدفق النقدي القادم؟",
        "لخص لي أهم الأحداث في النظام اليوم",
        "أنشئ تقرير أرباح وخسائر تقديري للربع القادم"
    ],
    'sales': [
        "اكتب رسالة متابعة لأهم 5 عملاء لم يشتروا منذ شهر",
        "توقع المبيعات للأسبوع القادم بناءً على الاتجاهات",
        "ما هي الأصناف الأكثر طلباً في منطقة الشمال؟"
    ],
    'inventory': [
        "تنبأ بالنواقص المحتملة في المخزون للشهر القادم",
        "احسب معدل دوران المخزون للأصناف الرئيسية",
        "اقترح كميات إعادة الطلب المثالية لتقليل التكاليف"
    ],
    'financial': [
        "حلل مصاريف التشغيل واقترح مجالات للتوفير",
        "دقق في قيود اليوم بحثاً عن أي شذوذ",
        "قارن التحصيلات النقدية مع التوقعات"
    ]
};

const DEFAULT_SUGGESTIONS = [
    "كيف يمكنني مساعدتك اليوم؟",
    "شرح ميزة معينة في النظام",
    "البحث عن مستند محدد"
];

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
    attachments?: string[];
}

export const WafiAi: React.FC = () => {
    const [messages, setMessages] = useState<Message[]>([
        {
            id: '1',
            role: 'assistant',
            content: 'مرحباً بك في WAFI AI 👋 كيف يمكنني مساعدتك في إدارة أعمالك اليوم؟',
            timestamp: new Date()
        }
    ]);
    const [inputValue, setInputValue] = useState('');
    const [isRecording, setIsRecording] = useState(false);

    const userRole = authService.getDashboardType() || 'admin';
    const currentSuggestions = SUGGESTIONS[userRole] || DEFAULT_SUGGESTIONS;

    const handleSendMessage = (text: string = inputValue) => {
        if (!text.trim()) return;

        const newUserMsg: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: text,
            timestamp: new Date()
        };

        setMessages(prev => [...prev, newUserMsg]);
        setInputValue('');

        // Simulate AI Response
        setTimeout(() => {
            const aiResponse: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: `هذا رد تجريبي ذكي على: "${text}". \n\nبناءً على صلاحياتك كـ ${authService.getRoleDisplayName()}، يمكنني الوصول للبيانات وبناء التحليلات المطلوبة.`,
                timestamp: new Date()
            };
            setMessages(prev => [...prev, aiResponse]);
        }, 1500);
    };

    const handleSuggestionClick = (suggestion: string) => {
        handleSendMessage(suggestion);
    };

    return (
        <div className="h-[calc(100vh-2rem)] flex flex-col bg-white rounded-3xl overflow-hidden shadow-sm border border-slate-200">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-600 rounded-xl shadow-lg shadow-indigo-200 text-white">
                        <Sparkles size={24} />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-slate-800">WAFI AI Assistant</h1>
                        <p className="text-xs text-slate-500 font-medium">مساعدك الذكي المخصص</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <span className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-xs font-bold border border-indigo-100">
                        {authService.getRoleDisplayName()} Mode
                    </span>
                </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/30">
                {messages.map((msg) => (
                    <div key={msg.id} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                        <div className={`
                            w-10 h-10 rounded-full flex items-center justify-center shrink-0 shadow-sm
                            ${msg.role === 'user' ? 'bg-white border border-slate-200 text-slate-600' : 'bg-indigo-600 text-white'}
                        `}>
                            {msg.role === 'user' ? <User size={20} /> : <Bot size={20} />}
                        </div>
                        <div className={`
                            max-w-[70%] p-5 rounded-3xl text-sm leading-relaxed shadow-sm
                            ${msg.role === 'user'
                                ? 'bg-white border border-slate-200 text-slate-800 rounded-tr-none'
                                : 'bg-white border border-indigo-100 text-slate-800 rounded-tl-none shadow-indigo-100/50'}
                        `}>
                            <p className="whitespace-pre-wrap">{msg.content}</p>
                            <span className="text-[10px] text-slate-400 mt-2 block opacity-70">
                                {msg.timestamp.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Suggestions Area (if last message is mostly empty or specific state) */}
            <div className="px-6 py-2 bg-white">
                <p className="text-xs font-bold text-slate-400 mb-3 flex items-center gap-1">
                    <Lightbulb size={12} />
                    اقتراحات ذكية لك
                </p>
                <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                    {currentSuggestions.map((suggestion, idx) => (
                        <button
                            key={idx}
                            onClick={() => handleSuggestionClick(suggestion)}
                            className="whitespace-nowrap px-4 py-2 bg-slate-50 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 transition-all"
                        >
                            {suggestion}
                        </button>
                    ))}
                </div>
            </div>

            {/* Input Area */}
            <div className="p-4 bg-white border-t border-slate-100">
                <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-2xl p-2 focus-within:ring-2 focus-within:ring-indigo-100 focus-within:border-indigo-300 transition-all shadow-sm">
                    <button className="p-2 hover:bg-slate-200 rounded-xl text-slate-400 hover:text-slate-600 transition-colors" title="رفع ملف">
                        <Paperclip size={20} />
                    </button>

                    <input
                        type="text"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                        placeholder="اكتب رسالتك لـ WAFI AI... (أو استخدم المايك)"
                        className="flex-1 bg-transparent border-none outline-none text-slate-800 placeholder-slate-400 px-2 font-medium"
                    />

                    <button
                        className={`p-2 rounded-xl transition-colors ${isRecording ? 'bg-rose-100 text-rose-600 animate-pulse' : 'hover:bg-slate-200 text-slate-400 hover:text-slate-600'}`}
                        onClick={() => setIsRecording(!isRecording)}
                        title="تسجيل صوتي"
                    >
                        <Mic size={20} />
                    </button>

                    <button
                        onClick={() => handleSendMessage()}
                        disabled={!inputValue.trim()}
                        className="p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-lg shadow-indigo-200 disabled:opacity-50 disabled:shadow-none transition-all transform active:scale-95"
                    >
                        <Send size={20} />
                    </button>
                </div>
                <div className="text-center mt-2">
                    <p className="text-[10px] text-slate-400">WAFI AI يمكن أن يرتكب الأخطاء. يرجى التحقق من المعلومات الهامة.</p>
                </div>
            </div>
        </div>
    );
};
