import { GoogleGenAI, Type } from "@google/genai";
import { Lead, Interaction } from "../types";

// Inicialização preguiçosa (lazy) para evitar erro de "API key must be set" no carregamento
let aiInstance: GoogleGenAI | null = null;

const getAi = () => {
  if (!aiInstance) {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY || '';
    if (!apiKey) {
      console.warn("VITE_GEMINI_API_KEY não encontrada. As funções de IA estarão desativadas.");
      return null;
    }
    aiInstance = new GoogleGenAI({ apiKey });
  }
  return aiInstance;
};

export const aiService = {
  /**
   * Calculates a Lead Score based on lead data and history
   */
  async scoreLead(lead: Lead): Promise<{ score: number; reasoning: string }> {
    const ai = getAi();
    if (!ai) return { score: 0, reasoning: "AI Service not configured (Missing API Key)." };

    const prompt = `
      Analyze the following lead data and provide a sales score from 0 to 100.
      Consider company size, segment, interaction history, and current stage.
      
      Lead Data:
      - Company: ${lead.company}
      - Segment: ${lead.niche || 'N/A'}
      - Value: ${lead.value}
      - Notes: ${lead.notes}
      - History: ${lead.interactions?.map(i => `${i.type}: ${i.note}`).join(', ') || 'No history'}
      
      Return the result in JSON format with "score" (number) and "reasoning" (string).
    `;

    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [{ parts: [{ text: prompt }] }],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              score: { type: Type.NUMBER },
              reasoning: { type: Type.STRING }
            },
            required: ["score", "reasoning"]
          }
        }
      });

      const result = JSON.parse(response.text || '{}');
      return {
        score: result.score || 0,
        reasoning: result.reasoning || "Unable to analyze lead."
      };
    } catch (error) {
      console.error("AI Scoring Error:", error);
      return { score: 0, reasoning: "AI Service temporarily unavailable." };
    }
  },

  /**
   * Summarizes a long conversation or interaction history
   */
  async summarizeInteractions(interactions: Interaction[]): Promise<string> {
    const ai = getAi();
    if (!ai) return "AI Service not configured (Missing API Key).";

    if (!interactions || interactions.length === 0) return "No interactions to summarize.";

    const historyText = interactions
      .map(i => `[${i.created_at}] ${i.type.toUpperCase()}: ${i.note} (${i.success ? 'Success' : 'No Answer'})`)
      .join('\n');

    const prompt = `
      Summarize the following customer interaction history into a concise 3-line executive summary.
      Focus on the current status, main pain points, and next steps.
      
      History:
      ${historyText}
    `;

    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [{ parts: [{ text: prompt }] }],
      });

      return response.text || "Summary unavailable.";
    } catch (error) {
      console.error("AI Summary Error:", error);
      return "Error generating summary.";
    }
  },

  /**
   * Predicts sales forecast based on pipeline data
   */
  async predictForecast(leads: Lead[]): Promise<{ predictedRevenue: number; confidence: number }> {
    const ai = getAi();
    if (!ai) return { predictedRevenue: 0, confidence: 0 };

    const activeLeads = leads.filter(l => l.status === 'active');
    const data = activeLeads.map(l => ({
      value: l.value,
      probability: l.probability || 50,
      stage: l.stage
    }));

    const prompt = `
      Based on the following pipeline data, predict the total revenue expected to close this month.
      Consider the values and their current probabilities.
      
      Data: ${JSON.stringify(data)}
      
      Return JSON with "predictedRevenue" and "confidence" (0-1).
    `;

    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [{ parts: [{ text: prompt }] }],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              predictedRevenue: { type: Type.NUMBER },
              confidence: { type: Type.NUMBER }
            },
            required: ["predictedRevenue", "confidence"]
          }
        }
      });

      const result = JSON.parse(response.text || '{}');
      return {
        predictedRevenue: result.predictedRevenue || 0,
        confidence: result.confidence || 0.5
      };
    } catch (error) {
      console.error("AI Forecast Error:", error);
      return { predictedRevenue: 0, confidence: 0 };
    }
  }
};
