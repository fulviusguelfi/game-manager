import { GoogleGenAI } from "@google/genai";
import { Character, CharacterType } from "../types";

// Helper to safely get the API key
const getApiKey = (): string | undefined => {
  return process.env.API_KEY;
};

export const generateNPC = async (systemName: string, ownerId: string): Promise<Partial<Character> | null> => {
  const apiKey = getApiKey();
  if (!apiKey) {
    console.warn("API Key not found. NPC generation disabled.");
    return null;
  }

  const ai = new GoogleGenAI({ apiKey });
  
  const prompt = `
    Gere um personagem NPC para um RPG de mesa usando o sistema "${systemName}".
    O NPC deve ser interessante, ter um nome, e uma breve descrição (máximo 2 frases) focada em horror ou mistério.
    
    Retorne APENAS um objeto JSON com o seguinte formato, sem markdown:
    {
      "name": "Nome do NPC",
      "description": "Descrição curta e misteriosa.",
      "hpMax": 20,
      "sanMax": 10
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json'
      }
    });

    const text = response.text;
    if (!text) return null;

    const data = JSON.parse(text);
    
    return {
      id: crypto.randomUUID(),
      name: data.name,
      description: data.description,
      type: CharacterType.NPC,
      ownerId: ownerId,
      hp: { current: data.hpMax, max: data.hpMax },
      san: { current: data.sanMax, max: data.sanMax },
      attributes: [
        { name: "Força", value: 1 },
        { name: "Agilidade", value: 2 },
        { name: "Intelecto", value: 3 },
        { name: "Presença", value: 2 },
        { name: "Vigor", value: 1 }
      ]
    };
  } catch (error) {
    console.error("Error generating NPC:", error);
    return null;
  }
};