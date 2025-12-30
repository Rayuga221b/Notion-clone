import { GoogleGenAI, Type } from "@google/genai";
import { Transaction } from '../types';

const getAiClient = () => {
  const apiKey = import.meta.env.VITE_API_KEY;
  if (!apiKey) {
    console.warn("VITE_API_KEY not found in environment variables");
    return null;
  }
  return new GoogleGenAI({ apiKey });
};

export const parseExpenseText = async (text: string): Promise<Partial<Transaction>[]> => {
  const ai = getAiClient();
  if (!ai) return [];

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Extract transaction details from the following text. If multiple transactions are present, list them all. Infer the category based on the merchant. If the date is missing, assume today (${new Date().toISOString().split('T')[0]}). Text: "${text}"`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              merchant: { type: Type.STRING },
              amount: { type: Type.NUMBER },
              date: { type: Type.STRING, description: "YYYY-MM-DD format" },
              category: { type: Type.STRING },
              paymentMethod: { type: Type.STRING },
              notes: { type: Type.STRING }
            },
            required: ["merchant", "amount", "category"]
          }
        }
      }
    });

    const result = response.text;
    if (!result) return [];
    return JSON.parse(result) as Partial<Transaction>[];
  } catch (error) {
    console.error("Gemini parse error:", error);
    return [];
  }
};

export const getSpendingInsights = async (transactions: Transaction[]): Promise<string> => {
  const ai = getAiClient();
  if (!ai) return "AI service unavailable.";

  try {
    // Simplify payload to avoid token limits with large datasets
    const simpleData = transactions.slice(0, 50).map(t => `${t.date}: ${t.merchant} $${t.amount} (${t.category})`).join('\n');

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Analyze these recent transactions and provide 3 short, bulleted insights about spending habits or anomalies. Be concise. Data:\n${simpleData}`,
      config: {
        maxOutputTokens: 200,
        thinkingConfig: { thinkingBudget: 0 }
      }
    });

    return response.text || "No insights available.";
  } catch (error) {
    console.error("Gemini insight error:", error);
    return "Could not generate insights.";
  }
};

export const suggestNextBlock = async (currentContext: string): Promise<string> => {
  const ai = getAiClient();
  if (!ai) return "";

  try {
    // Strip HTML tags from context to provide clean text to the model
    const cleanContext = currentContext.replace(/<[^>]*>?/gm, '');

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Continue the following document text naturally with one short paragraph or a list item. Context: "${cleanContext}"`,
      config: {
        maxOutputTokens: 100,
        thinkingConfig: { thinkingBudget: 0 }
      }
    });
    return response.text || "";
  } catch (e) {
    return "";
  }
}