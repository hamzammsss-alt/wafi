
import { GoogleGenAI, Type } from "@google/genai";

/**
 * OCRService
 * Handles extracting structured data from invoice images using Gemini 2.5 Flash.
 */
export const OCRService = {
    /**
     * Parses an invoice image (Base64) and returns structured JSON.
     * @param base64Image The image data in base64 format (without data:image/... prefix preferably, or handle it)
     * @returns Structured Invoice Object
     */
    parseInvoiceImage: async (base64Image: string) => {
        try {
            // @ts-ignore
            const apiKey = import.meta.env.VITE_GOOGLE_API_KEY || process.env.API_KEY;

            if (!apiKey) {
                throw new Error("API Key is missing. Check .env.local");
            }

            const ai = new GoogleGenAI({ apiKey });

            // Clean base64 if it has header
            const cleanBase64 = base64Image.replace(/^data:image\/(png|jpg|jpeg|webp);base64,/, "");

            console.log("OCR: Sending image to Gemini...");

            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash",
                contents: [
                    {
                        role: "user",
                        parts: [
                            { text: "Extract invoice data from this image exactly into this JSON structure: { invoice_number, date, vendor_name, total_amount, currency, items: [{ description, qty, unit_price, total }] }." },
                            {
                                inlineData: {
                                    mimeType: "image/jpeg", // Assuming JPEG or PNG, Gemini is flexible usually
                                    data: cleanBase64
                                }
                            }
                        ]
                    }
                ],
                config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            invoice_number: { type: Type.STRING },
                            date: { type: Type.STRING },
                            vendor_name: { type: Type.STRING },
                            total_amount: { type: Type.NUMBER },
                            currency: { type: Type.STRING },
                            items: {
                                type: Type.ARRAY,
                                items: {
                                    type: Type.OBJECT,
                                    properties: {
                                        description: { type: Type.STRING },
                                        qty: { type: Type.NUMBER },
                                        unit_price: { type: Type.NUMBER },
                                        total: { type: Type.NUMBER }
                                    }
                                }
                            }
                        }
                    }
                }
            });

            const text = response.text || "{}";
            console.log("OCR Result:", text);
            return JSON.parse(text);

        } catch (error: any) {
            console.error("OCR Failed:", error);
            throw new Error(error.message || "Failed to parse invoice image.");
        }
    }
};
