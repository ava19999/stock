import { GoogleGenAI, Type } from "@google/genai";
import { AIAnalysisResult } from "../types";

// Initialize Gemini Client
// Note: In a real production app, you might proxy this through a backend to hide the key,
// but for this client-side demo, we use the env variable directly.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

const MODEL_NAME = 'gemini-2.5-flash';

/**
 * Analyzes an image to suggest details for the inventory item.
 */
export const analyzeInventoryImage = async (base64Data: string): Promise<AIAnalysisResult> => {
  if (!process.env.API_KEY) {
    console.warn("API Key is missing.");
    return {};
  }

  try {
    // Clean base64 string if it contains metadata header
    const cleanBase64 = base64Data.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, '');

    const prompt = "Analisis gambar stok barang industri/gudang ini. Identifikasi nama barang, buat deskripsi singkat yang teknis, dan saran kategori rak penyimpanan yang umum (contoh: RAK A01, RAK B02, RAK ELEKTRONIK, dll). Jangan gunakan tanda hubung (-) pada nama rak.";

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/jpeg', // Assuming JPEG for simplicity, or detect from header
              data: cleanBase64
            }
          },
          { text: prompt }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            suggestedName: { type: Type.STRING },
            suggestedDescription: { type: Type.STRING },
            suggestedShelfCategory: { type: Type.STRING }
          }
        }
      }
    });

    if (response.text) {
      return JSON.parse(response.text) as AIAnalysisResult;
    }
    return {};
  } catch (error) {
    console.error("Error analyzing image with Gemini:", error);
    throw error;
  }
};

/**
 * Generates a polished description based on partial inputs.
 */
export const generateDescription = async (name: string, partNumber: string): Promise<string> => {
   if (!process.env.API_KEY) return "";

   try {
     const prompt = `Buatkan deskripsi produk yang profesional dan ringkas untuk sistem inventaris. 
     Nama Barang: ${name}
     Nomor Part: ${partNumber}
     Bahasa: Indonesia.`;

     const response = await ai.models.generateContent({
       model: MODEL_NAME,
       contents: prompt,
     });

     return response.text || "";
   } catch (error) {
     console.error("Error generating description:", error);
     return "";
   }
};