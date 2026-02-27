import { GoogleGenAI, Type } from "@google/genai";
import { Lead, Interaction } from "../types";

const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY || '' });

export const aiService = {
  /**
   * Calculates a Lead Score based on lead data and history
   */
  async scoreLead(lead: Lead): Promise<{ score: number; reasoning: string }> {
    const prompt = `
      Analyze the following lead data and provide a sales score from 0 to 100.
      Consider company size, segment, interaction history, and current stage.
      
      Lead Data:
      - Company: ${lead.company}
      - Segment: ${lead.segment || 'N/A'}
      - Value: ${lead.value}
      - Notes: ${lead.notes}
      - History: ${lead.interactions?.map(i => `${i.type}: ${i.title}`).join(', ') || 'No history'}
      
      Return the result in JSON format with "score" (number) and "reasoning" (string).
    `;

    try {
      const response = await ai.models.generateContent({
        model: "gemini-1.5-flash",
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
    if (!interactions || interactions.length === 0) return "No interactions to summarize.";

    const historyText = interactions
      .map(i => `[${i.createdAt}] ${i.type.toUpperCase()}: ${i.title} - ${i.content}`)
      .join('\n');

    const prompt = `
      Summarize the following customer interaction history into a concise 3-line executive summary.
      Focus on the current status, main pain points, and next steps.
      
      History:
      ${historyText}
    `;

    try {
      const response = await ai.models.generateContent({
        model: "gemini-1.5-flash",
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
    const activeLeads = leads.filter(l => l.status === 'active');
    const data = activeLeads.map(l => ({
      value: l.value,
      probability: l.probability || 50,
      stage: l.stageId
    }));

    const prompt = `
      Based on the following pipeline data, predict the total revenue expected to close this month.
      Consider the values and their current probabilities.
      
      Data: ${JSON.stringify(data)}
      
      Return JSON with "predictedRevenue" and "confidence" (0-1).
    `;

    try {
      const response = await ai.models.generateContent({
        model: "gemini-1.5-flash",
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
