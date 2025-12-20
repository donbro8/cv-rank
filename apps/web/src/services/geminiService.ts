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

export const generateSummary = async (text: string, style: 'bullet' | 'narrative'): Promise<string> => {
  const ai = getClient();

  const prompt = style === 'bullet'
    ? `Please provide a concise, bulleted summary of the following candidate resume text. Focus on key skills, experience, and potential fit. \n\nResume Text:\n${text}`
    : `Please write a narrative, paragraph-style summary of the following candidate resume. Tell the story of their career progression and main strengths. \n\nResume Text:\n${text}`;

  const result = await ai.models.generateContent({
    model: "gemini-1.5-flash",
    contents: {
      parts: [{ text: prompt }]
    }
  });

  return result.text ? result.text : "No summary generated.";
};