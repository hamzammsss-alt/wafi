
import { GoogleGenAI } from "@google/genai";

// 1. Tool Definitions (The Capabilities)
const TOOLS_DEFINITIONS = `
أنت "عقل وافي"، المحاسب الذكي المستقل.
لديك القدرة على تنفيذ الأوامر التالية. يجب أن يكون ردك *دائماً* بصيغة JSON فقط.

الأدوات المتاحة (ACTIONS):

1. ANALYZE_FINANCE
   - الوصف: يحلل الوضع المالي العام (السيولة، الأرباح، الديون).
   - المعطيات المطلوبة: لا يوجد.
   
2. ANALYZE_STOCK
   - الوصف: يحلل حالة المخزون (النواقص، الأكثر مبيعاً) والتنبؤ بالاحتياجات.
   - المعطيات المطلوبة: 
     - query: (اختياري) صنف محدد أو مجموعة.

3. CREATE_TRANSACTION
   - الوصف: تسجيل عملية مالية (صرف/قبض/قيد).
   - الحقول:
     - type: "PAYMENT" (صرف) | "RECEIPT" (قبض)
     - amount: رقم (المبلغ)
     - account: اسم الحساب (مثل: ضيافة، تاكسي، مبيعات)
     - description: شرح العملية

4. PARSE_INVOICE_IMAGE
    - الوصف: استخراج بيانات فاتورة من صورة.
    - الاستخدام: عندما يرسل المستخدم صورة فاتورة.

5. ADVICE
   - الوصف: تقديم نصائح عامة لتوفير التكاليف أو زيادة الأرباح.
   - المعطيات المطلوبة: لا يوجد.

6. UNKNOWN
   - الوصف: إذا كان طلب المستخدم غير واضح أو خارج تخصصك.
   - الحقول: 
     - reply: نص الرد المناسب للمستخدم.

--------------------------------------------------
سياق النظام الحالي (Context):
{{CONTEXT_JSON}}
--------------------------------------------------
رد بصيغة JSON فقط بهذا الشكل:
{
  "action": "ACTION_NAME",
  "payload": { ... }
}
`;

export interface WafiAction {
    action: 'ANALYZE_FINANCE' | 'ANALYZE_STOCK' | 'CREATE_TRANSACTION' | 'ADVICE' | 'UNKNOWN';
    payload: any;
    narrative?: string; // الشرح النصي من الذكاء
}

export const processUserIntent = async (userMessage: string, contextSnapshot: any): Promise<WafiAction> => {
    try {
        const apiKey = process.env.API_KEY;
        console.log("🔑 API Key status:", apiKey ? `Present (${apiKey.substring(0, 10)}...)` : "MISSING!");

        if (!apiKey) {
            console.error("❌ API Key is not configured!");
            return {
                action: 'UNKNOWN',
                payload: { reply: "خطأ في الإعدادات: مفتاح API غير موجود. يرجى التحقق من ملف .env.local" }
            };
        }

        const ai = new GoogleGenAI({ apiKey });

        // Inject Context into Prompt
        const systemPrompt = TOOLS_DEFINITIONS.replace('{{CONTEXT_JSON}}', JSON.stringify(contextSnapshot));

        console.log("🧠 Sending request to Gemini AI...");
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: [
                { role: 'user', parts: [{ text: `System Instructions: ${systemPrompt}` }] },
                { role: 'user', parts: [{ text: `User Request: ${userMessage}` }] }
            ],
            config: {
                responseMimeType: "application/json"
            }
        });

        console.log("✅ Received response from Gemini AI");
        const text = response.text || "{}";
        const result = JSON.parse(text);

        // If it's an analysis request, we might want the AI to generate the 'narrative' text too right here, 
        // or let the frontend render it. Let's ask AI to add 'narrative' field for complex replies.

        if (!result.action) {
            return { action: 'UNKNOWN', payload: { reply: "لم أفهم الطلب بدقة." } };
        }

        return result as WafiAction;

    } catch (e: any) {
        console.error("❌ Brain Error:", e);
        console.error("Error details:", {
            message: e.message,
            name: e.name,
            stack: e.stack
        });

        let errorMessage = "حدث خطأ في معالجة طلبك.";

        // Provide more specific error messages
        if (e.message?.includes('API key')) {
            errorMessage = "خطأ في مفتاح API. يرجى التحقق من صحة المفتاح.";
        } else if (e.message?.includes('quota')) {
            errorMessage = "تم تجاوز حد الاستخدام. يرجى المحاولة لاحقاً.";
        } else if (e.message?.includes('network') || e.message?.includes('fetch')) {
            errorMessage = "خطأ في الاتصال بالإنترنت. يرجى التحقق من اتصالك.";
        }

        return { action: 'UNKNOWN', payload: { reply: errorMessage } };
    }
};
