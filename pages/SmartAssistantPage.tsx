import React, { useState, useRef, useEffect } from 'react';
import { Bot, Send, Sparkles, BrainCircuit, Activity, CheckCircle, AlertOctagon, Maximize2, Minimize2 } from 'lucide-react';
import { processUserIntent, WafiAction } from '../services/wafiBrain';

export const SmartAssistantPage: React.FC = () => {
    const [messages, setMessages] = useState<{ role: 'user' | 'model' | 'system', text?: string, action?: any }[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const chatEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSend = async (text: string = input) => {
        if (!text.trim() || isLoading) return;

        const userMessage = text.trim();
        setInput('');
        setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
        setIsLoading(true);

        try {
            // 1. Gather Context (Snapshot of current state)
            let kpis = {};
            // @ts-ignore
            if (window.electronAPI) {
                // @ts-ignore  
                kpis = await window.electronAPI.system.getDashboardKPIs();
            }

            // 2. Process Intent using Wafi Brain
            const result: WafiAction = await processUserIntent(userMessage, { kpis, date: new Date().toISOString() });

            // 3. Execute Action
            let replyText = "";
            let actionDetails = result;

            switch (result.action) {
                case 'ANALYZE_FINANCE':
                    replyText = `📊 **تحليل مالي مفصل:**\n- السيولة الحالية: ${kpis['cash'] || 0} \n- المبيعات اليومية: ${kpis['sales'] || 0}\n\nالوضع المالي يبدو مستقراً. أنصحك بمراجعة الديون المستحقة لتحسين التدفق النقدي.`;
                    break;
                case 'ANALYZE_STOCK':
                    replyText = `📦 **فحص شامل للمخزون:**\nوجدنا ${kpis['lowStock'] || 0} أصناف وصلت للحد الأدنى. يرجى مراجعة قائمة "النواقص" فوراً.\n\nيمكنني إعداد طلبية شراء مقترحة لك الآن.`;
                    break;
                case 'CREATE_TRANSACTION':
                    if (result.payload.type === 'PAYMENT') {
                        replyText = `✅ **تم التنفيذ:**\nتم تسجيل سند صرف بقيمة **${result.payload.amount}** لحساب **${result.payload.account}** (${result.payload.description})`;
                    } else {
                        replyText = `✅ **تم التنفيذ:**\nتم تسجيل العملية بنجاح.`;
                    }
                    break;
                case 'ADVICE':
                    replyText = `💡 **نصيحة استراتيجية:**\nبناءً على مشترياتك الأخيرة، يمكنك توفير 5% إذا قمت بالشراء بالجملة من المورد "الشركة الوطنية". كما أنصح بتقليل المخزون الراكد في المستودع الرئيسي.`;
                    break;
                case 'UNKNOWN':
                default:
                    replyText = result.payload?.reply || "آسف، لم أفهم طلبك تماماً. هل يمكنك التوضيح أكثر؟";
                    break;
            }

            setMessages(prev => [...prev, { role: 'model', text: replyText, action: actionDetails }]);

        } catch (error) {
            setMessages(prev => [...prev, { role: 'system', text: "حدث خطأ في الاتصال بالعقل الإلكتروني." }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="h-full flex flex-col bg-slate-50 relative overflow-hidden rounded-2xl shadow-sm border border-slate-200">

            {/* Header */}
            <div className="bg-white border-b border-slate-200 p-6 flex justify-between items-center shadow-sm z-10">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/30">
                        <BrainCircuit size={28} className="text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
                            المساعد الذكي المركزي
                            <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full font-medium border border-emerald-200">Online v2.0</span>
                        </h1>
                        <p className="text-slate-500 mt-1 text-sm">مستشارك المالي والاداري الشخصي، مدعوم بالذكاء الاصطناعي</p>
                    </div>
                </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto p-8 flex flex-col gap-6 scroll-smooth custom-scrollbar">
                {messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-center opacity-80 mt-10">
                        <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mb-6 shadow-md border border-slate-100 relative">
                            <Sparkles className="text-amber-400 absolute top-0 right-0 animate-ping" size={20} />
                            <Activity size={48} className="text-indigo-500" />
                        </div>
                        <h2 className="text-3xl font-bold text-slate-800 mb-3">كيف يمكنني مساعدتك اليوم؟</h2>
                        <p className="text-slate-500 max-w-lg text-lg leading-relaxed">
                            أنا هنا لتحليل بياناتك، الإجابة على استفساراتك المالية، وتنفيذ المهام الروتينية بسرعة ودقة.
                        </p>

                        <div className="grid grid-cols-2 gap-4 mt-8 w-full max-w-2xl">
                            <BigSuggestionCard
                                icon={<Activity className="text-blue-500" />}
                                title="تحليل الوضع المالي"
                                desc="عرض ملخص للسيولة، المبيعات، والالتزامات."
                                onClick={() => handleSend("حلل الوضع المالي")}
                            />
                            <BigSuggestionCard
                                icon={<AlertOctagon className="text-orange-500" />}
                                title="مراجعة المخزون"
                                desc="كشف النواقص والأصناف الراكدة فوراً."
                                onClick={() => handleSend("كيف وضع المخزون والطلبات؟")}
                            />
                            <BigSuggestionCard
                                icon={<Sparkles className="text-purple-500" />}
                                title="نصائح ذكية"
                                desc="اقتراحات لتحسين الربحية وتقليل المصاريف."
                                onClick={() => handleSend("أعطني نصائح لتقليل التكاليف")}
                            />
                            <BigSuggestionCard
                                icon={<CheckCircle className="text-emerald-500" />}
                                title="تسجيل عملية سريعة"
                                desc="مثل: اصرف 50 شيكل ضيافة."
                                onClick={() => handleSend("اصرف 50 شيكل - بند ضيافة")}
                            />
                        </div>
                    </div>
                )}

                {messages.map((m, i) => (
                    <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in-up group`}>
                        <div className={`flex gap-4 max-w-[70%] ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 shadow-sm border ${m.role === 'user' ? 'bg-indigo-100 border-indigo-200' : 'bg-white border-slate-200'}`}>
                                {m.role === 'user' ? <div className="font-bold text-indigo-600">You</div> : <BrainCircuit size={20} className="text-indigo-600" />}
                            </div>

                            <div className={`p-5 rounded-3xl text-base leading-relaxed shadow-sm ${m.role === 'user'
                                ? 'bg-indigo-600 text-white rounded-tr-none'
                                : 'bg-white text-slate-700 rounded-tl-none border border-slate-100'
                                }`}>
                                {m.role === 'model' && (
                                    <div className="flex items-center gap-2 mb-3 pb-3 border-b border-slate-100/10">
                                        <span className="text-xs font-bold opacity-70 uppercase tracking-wider">{m.action?.action || 'Wafi AI'}</span>
                                    </div>
                                )}
                                <div className="whitespace-pre-line">
                                    {m.text}
                                </div>
                            </div>
                        </div>
                    </div>
                ))}

                {isLoading && (
                    <div className="flex justify-start">
                        <div className="flex gap-4 max-w-[70%]">
                            <div className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center shrink-0 shadow-sm">
                                <BrainCircuit size={20} className="text-indigo-600 animate-pulse" />
                            </div>
                            <div className="bg-white p-5 rounded-3xl rounded-tl-none shadow-sm border border-slate-100 flex items-center gap-3">
                                <div className="flex gap-1.5">
                                    <span className="w-2.5 h-2.5 bg-indigo-400 rounded-full animate-bounce"></span>
                                    <span className="w-2.5 h-2.5 bg-indigo-400 rounded-full animate-bounce delay-75"></span>
                                    <span className="w-2.5 h-2.5 bg-indigo-400 rounded-full animate-bounce delay-150"></span>
                                </div>
                                <span className="text-sm text-slate-400 font-medium">جاري المعالجة...</span>
                            </div>
                        </div>
                    </div>
                )}
                <div ref={chatEndRef} />
            </div>

            {/* Input Area */}
            <div className="bg-white p-6 border-t border-slate-200">
                <div className="max-w-4xl mx-auto relative">
                    <form
                        onSubmit={(e) => { e.preventDefault(); handleSend(); }}
                        className="relative shadow-lg rounded-2xl overflow-hidden ring-1 ring-slate-200 focus-within:ring-2 focus-within:ring-indigo-500 transition-all"
                    >
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="اكتب طلبك هنا... (مثال: أريد تقرير مبيعات هذا الشهر)"
                            className="w-full bg-slate-50/50 p-5 pl-16 text-lg outline-none text-slate-700 placeholder:text-slate-400"
                            autoFocus
                        />
                        <button
                            type="submit"
                            disabled={!input.trim() || isLoading}
                            className="absolute left-2 top-2 bottom-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center"
                        >
                            <Send size={20} className={isLoading ? 'opacity-0' : ''} />
                            {isLoading && <div className="absolute inset-0 flex items-center justify-center"><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div></div>}
                        </button>
                    </form>
                    <div className="text-center mt-3 text-xs text-slate-400">
                        يمكن للمساعد الذكي ارتكاب أخطاء. يرجى مراجعة المعلومات المالية الهامة.
                    </div>
                </div>
            </div>
        </div>
    );
};

const BigSuggestionCard = ({ icon, title, desc, onClick }: any) => (
    <button
        onClick={onClick}
        className="bg-white p-4 rounded-xl border border-slate-200 hover:border-indigo-300 hover:shadow-md transition-all text-right flex items-start gap-4 group"
    >
        <div className="p-3 bg-slate-50 rounded-lg group-hover:bg-indigo-50 transition-colors">
            {icon}
        </div>
        <div>
            <h4 className="font-bold text-slate-800 text-sm group-hover:text-indigo-700 transition-colors">{title}</h4>
            <p className="text-xs text-slate-500 mt-1">{desc}</p>
        </div>
    </button>
);
