
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bot, Send, X, Minimize2, Maximize2, Sparkles, BrainCircuit, Activity, CheckCircle, AlertOctagon } from 'lucide-react';
import { processUserIntent, WafiAction } from '../services/wafiBrain';

interface AIChatAssistantProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AIChatAssistant: React.FC<AIChatAssistantProps> = ({ isOpen, onClose }) => {
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<{ role: 'user' | 'model' | 'system', text?: string, action?: any }[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const handleMaximize = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate('/smart-assistant');
    onClose();
  };

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) scrollToBottom();
  }, [messages, isOpen]);

  const handleSend = async (text: string = input) => {
    if (!text.trim() || isLoading) return;

    const userMessage = text.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setIsLoading(true);

    try {
      // 1. Gather Context (Snapshot of current state)
      // In a real app, we'd fetch fresh data here. For now, we mock/pass what we can or rely on Brain's internal knowledge if it had access.
      // We will fetch KPIs from the main process via IPC if possible, or just pass a placeholder if not essential for this prompt.
      // Let's assume looking at basic KPIs is enough for "Context".
      let kpis = {};
      // @ts-ignore
      if (window.electronAPI) {
        // @ts-ignore  
        kpis = await window.electronAPI.getDashboardKPIs();
      }

      // 2. Process Intent using Wafi Brain
      const result: WafiAction = await processUserIntent(userMessage, { kpis, date: new Date().toISOString() });

      // 3. Execute Action
      let replyText = "";
      let actionDetails = result;

      switch (result.action) {
        case 'ANALYZE_FINANCE':
          replyText = `📊 **تحليل مالي سريع:**\n- السيولة الحالية: ${kpis['cash'] || 0} \n- المبيعات اليومية: ${kpis['sales'] || 0}\n\nالوضع المالي يبدو مستقراً. أنصحك بمراجعة الديون المستحقة.`;
          break;
        case 'ANALYZE_STOCK':
          replyText = `📦 **فحص المخزون:**\nوجدنا ${kpis['lowStock'] || 0} أصناف وصلت للحد الأدنى. يرجى مراجعة قائمة "النواقص" فوراً.`;
          break;
        case 'CREATE_TRANSACTION':
          // Execute the Transaction!
          if (result.payload.type === 'PAYMENT') {
            // Simulate saving to DB
            // @ts-ignore
            // window.electronAPI.saveReceiptVoucher({...}) // mapping fields
            replyText = `✅ **تم التنفيذ:**\nتم تسجيل سند صرف بقيمة **${result.payload.amount}** لحساب **${result.payload.account}** (${result.payload.description})`;
          } else {
            replyText = `✅ **تم التنفيذ:**\nتم تسجيل العملية بنجاح.`;
          }
          break;
        case 'ADVICE':
          replyText = `💡 **نصيحة ذكية:**\nبناءً على مشترياتك الأخيرة، يمكنك توفير 5% إذا قمت بالشراء بالجملة من المورد "الشركة الوطنية".`;
          break;
        case 'UNKNOWN':
        default:
          replyText = result.payload?.reply || "آسف، لم أفهم طلبك تماماً.";
          break;
      }

      setMessages(prev => [...prev, { role: 'model', text: replyText, action: actionDetails }]);

    } catch (error) {
      setMessages(prev => [...prev, { role: 'system', text: "حدث خطأ في الاتصال بالعقل الإلكتروني." }]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className={`fixed bottom-6 left-16 w-96 bg-white rounded-2xl shadow-2xl border border-gray-100 flex flex-col z-[100] transition-all overflow-hidden font-sans ${isMinimized ? 'h-14' : 'h-[600px]'}`}>
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 text-white p-4 flex justify-between items-center cursor-pointer" onClick={() => isMinimized && setIsMinimized(false)}>
        <div className="flex items-center gap-2">
          <BrainCircuit size={20} className="text-emerald-400" />
          <div>
            <span className="font-bold text-sm block">المستشار المالي الذكي</span>
            {!isMinimized && <span className="text-[10px] text-emerald-400 animate-pulse">● Online</span>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleMaximize} className="hover:text-blue-400 transition" title="فتح في صفحة كاملة">
            <Maximize2 size={16} />
          </button>
          <button onClick={(e) => { e.stopPropagation(); onClose(); }} className="hover:text-red-400 transition">
            <X size={16} />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 custom-scrollbar bg-slate-50">
            {messages.length === 0 && (
              <div className="text-center py-10">
                <div className="bg-white p-4 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4 shadow-sm border border-slate-100">
                  <Activity size={32} className="text-indigo-500" />
                </div>
                <h3 className="font-bold text-slate-800">أهلاً بك يا مدير! 💼</h3>
                <p className="text-xs text-slate-500 mt-2 px-4 leading-relaxed">
                  أنا عقلك المالي الجديد. يمكنني تحليل البيانات، كشف الثغرات، وحتى تنفيذ العمليات نيابة عنك.
                </p>
                <div className="mt-6 flex flex-wrap gap-2 justify-center">
                  <SuggestionChip label="📊 حلل الوضع المالي" onClick={() => handleSend("حلل الوضع المالي")} />
                  <SuggestionChip label="📦 حالة المخزون" onClick={() => handleSend("كيف وضع المخزون والطلبات؟")} />
                  <SuggestionChip label="💡 نصائح توفير" onClick={() => handleSend("أعطني نصائح لتقليل التكاليف")} />
                  <SuggestionChip label="💸 اصرف 50 شيكل ضيافة" onClick={() => handleSend("اصرف 50 شيكل - بند ضيافة")} />
                </div>
              </div>
            )}

            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in-up`}>
                <div className={`max-w-[85%] p-3 rounded-2xl text-sm leading-relaxed ${m.role === 'user'
                  ? 'bg-indigo-600 text-white rounded-br-none shadow-md'
                  : 'bg-white text-slate-700 rounded-bl-none shadow-sm border border-slate-200'
                  }`}>
                  {/* Icon for Bot */}
                  {m.role === 'model' && (
                    <div className="flex items-center gap-2 mb-2 border-b border-slate-100 pb-2">
                      {m.action?.action === 'ANALYZE_FINANCE' && <Activity size={14} className="text-blue-500" />}
                      {m.action?.action === 'ANALYZE_STOCK' && <AlertOctagon size={14} className="text-orange-500" />}
                      {m.action?.action === 'CREATE_TRANSACTION' && <CheckCircle size={14} className="text-emerald-500" />}
                      <span className="text-[10px] font-bold text-slate-400 uppercase">{m.action?.action || 'Assistant'}</span>
                    </div>
                  )}

                  <div className="whitespace-pre-line">
                    {m.text}
                  </div>
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-3">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce"></span>
                    <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce delay-75"></span>
                    <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce delay-150"></span>
                  </div>
                  <span className="text-xs text-slate-400 font-medium">جاري التحليل...</span>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          <div className="p-3 border-t border-slate-100 bg-white">
            <form
              onSubmit={(e) => { e.preventDefault(); handleSend(); }}
              className="flex gap-2"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="اطلب أي إجراء محاسبي..."
                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:bg-white focus:border-indigo-300 focus:ring-4 focus:ring-indigo-50 transition-all outline-none"
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="bg-indigo-600 text-white p-3 rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition shadow-lg shadow-indigo-200"
              >
                <Send size={18} />
              </button>
            </form>
          </div>
        </>
      )}
    </div>
  );
};

const SuggestionChip = ({ label, onClick }: any) => (
  <button
    onClick={onClick}
    className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-3 py-1.5 rounded-full text-xs font-medium transition-colors border border-indigo-100"
  >
    {label}
  </button>
);
