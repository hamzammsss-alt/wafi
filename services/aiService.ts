
import { GoogleGenAI, Type } from "@google/genai";
import { TransactionLine } from "../types";

export const getJournalFromAI = async (prompt: string): Promise<Partial<TransactionLine>[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `حول الوصف التالي لعملية مالية إلى قائمة قيود محاسبية بصيغة JSON. 
               يجب أن يكون مجموع المدين مساوياً للدائن.
               استخدم هذا الهيكل: [{"account_name": "اسم الحساب", "debit": 0, "credit": 0, "description": "شرح القيد"}].
               الوصف: ${prompt}`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            account_name: { type: Type.STRING },
            debit: { type: Type.NUMBER },
            credit: { type: Type.NUMBER },
            description: { type: Type.STRING },
          },
          required: ["account_name", "debit", "credit"]
        }
      }
    }
  });

  try {
    const jsonStr = response.text || "[]";
    return JSON.parse(jsonStr);
  } catch (e) {
    console.error("AI Response Parsing Error:", e);
    return [];
  }
};

export const chatWithAssistant = async (history: { role: string, parts: { text: string }[] }[], message: string) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: [...history, { role: 'user', parts: [{ text: message }] }],
    config: {
      systemInstruction: "أنت مساعد ذكي لنظام المحاسبة 'WAFI ERP'. ساعد المستخدمين في الأسئلة المحاسبية والتقنية حول النظام. رد دائماً باللغة العربية بأسلوب مهني وودود."
    }
  });
  return response.text;
};
