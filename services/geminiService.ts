import { GoogleGenAI } from "@google/genai";

const getClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key is missing. Please check your environment variables.");
  }
  return new GoogleGenAI({ apiKey });
};

export const generateEmbedding = async (text: string): Promise<number[]> => {
  const ai = getClient();
  
  // text-embedding-004 is optimized for semantic similarity tasks
  const result = await ai.models.embedContent({
    model: "text-embedding-004",
    contents: {
      parts: [{ text }]
    }
  });

  if (!result.embeddings?.[0]?.values) {
    throw new Error("Failed to generate embedding");
  }

  return result.embeddings[0].values;
};