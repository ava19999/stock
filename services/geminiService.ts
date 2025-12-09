// FILE: src/services/geminiService.ts
import { GoogleGenAI, Type } from "@google/genai";
import { AIAnalysisResult } from "../types";

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

const MODEL_NAME = '// FILE: src/services/geminiService.ts
import { GoogleGenAI, Type } from "@google/genai";
import { AIAnalysisResult } from "../types";

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

const MODEL_NAME = 'gemini-2.0-flash-exp'; // Atau gunakan 'gemini-1.5-flash' jika 2.0 belum tersedia

// --- INTERFACE BARU UNTUK HASIL SCAN RESI ---
export interface ResiAnalysisResult {
  date?: string;
  resi?: string;
  ecommerce?: string;
  customerName?: string;
  items?: {
    sku?: string;      // FOKUS: SKU Induk
    name?: string;
    qty?: number;
    price?: number;
    total?: number;
  }[];
}

/**
 * Analyzes an image to suggest details for the inventory item.
 */
export const analyzeInventoryImage = async (base64Data: string): Promise<AIAnalysisResult> => {
  if (!process.env.API_KEY) {
    console.warn("API Key is missing.");
    return {};
  }

  try {
    const cleanBase64 = base64Data.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, '');
    const prompt = "Analisis gambar stok barang industri/gudang ini. Identifikasi nama barang, buat deskripsi singkat yang teknis, dan saran kategori rak penyimpanan yang umum (contoh: RAK A01, RAK B02). Jangan gunakan tanda hubung (-) pada nama rak.";

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: {
        parts: [
          { inlineData: { mimeType: 'image/jpeg', data: cleanBase64 } },
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
    console.error("Error analyzing image:", error);
    return {};
  }
};

/**
 * Generates description.
 */
export const generateDescription = async (name: string, partNumber: string): Promise<string> => {
   if (!process.env.API_KEY) return "";
   try {
     const prompt = `Buatkan deskripsi produk ringkas. Nama: ${name}, No Part: ${partNumber}. Bahasa Indonesia.`;
     const response = await ai.models.generateContent({
       model: MODEL_NAME,
       contents: {
        parts: [{ text: prompt }]
       },
     });
     return response.text || "";
   } catch (error) {
     return "";
   }
};

// --- FUNGSI BARU YANG HILANG (WAJIB ADA) ---
export const analyzeResiImage = async (base64Data: string): Promise<ResiAnalysisResult> => {
  if (!process.env.API_KEY) {
    console.warn("API Key is missing.");
    return {};
  }

  try {
    const cleanBase64 = base64Data.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, '');

    // PROMPT KHUSUS PENCARIAN SKU INDUK
    const prompt = `Analisis gambar resi pengiriman marketplace (Shopee, Tokopedia, dll) ini.
    Tujuan utama: Ekstrak Data Pesanan untuk stok.
    
    Cari informasi berikut dan format ke JSON:
    1. "date": Tanggal pesanan/pengiriman (DD/MM/YYYY).
    2. "resi": Nomor Resi / No. Pesanan / Order ID.
    3. "ecommerce": Nama Marketplace (Shopee/Tokopedia/dll).
    4. "customerName": Nama Penerima / Username Pembeli.
    5. "items": Array daftar barang. Untuk setiap barang cari:
       - "sku": Cari KODE SKU INDUK atau SKU UTAMA yang tertera (PENTING!). Jika ada tulisan "SKU Induk", ambil itu. Jika tidak, ambil kode variasi.
       - "name": Nama Produk.
       - "qty": Jumlah barang (angka).
       - "price": Harga satuan (angka, tanpa Rp/titik).
       - "total": Total harga per item (qty * price).
    
    Hanya kembalikan JSON valid.`;

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: {
        parts: [
          { inlineData: { mimeType: 'image/jpeg', data: cleanBase64 } },
          { text: prompt }
        ]
      },
      config: { responseMimeType: "application/json" }
    });

    if (response.text) {
      return JSON.parse(response.text) as ResiAnalysisResult;
    }
    return {};
  } catch (error) {
    console.error("Error scan resi:", error);
    return {};
  }
};'; // Atau gunakan 'gemini-1.5-flash' jika 2.0 belum tersedia

// --- INTERFACE BARU UNTUK HASIL SCAN RESI ---
export interface ResiAnalysisResult {
  date?: string;
  resi?: string;
  ecommerce?: string;
  customerName?: string;
  items?: {
    sku?: string;      // FOKUS: SKU Induk
    name?: string;
    qty?: number;
    price?: number;
    total?: number;
  }[];
}

/**
 * Analyzes an image to suggest details for the inventory item.
 */
export const analyzeInventoryImage = async (base64Data: string): Promise<AIAnalysisResult> => {
  if (!process.env.API_KEY) {
    console.warn("API Key is missing.");
    return {};
  }

  try {
    const cleanBase64 = base64Data.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, '');
    const prompt = "Analisis gambar stok barang industri/gudang ini. Identifikasi nama barang, buat deskripsi singkat yang teknis, dan saran kategori rak penyimpanan yang umum (contoh: RAK A01, RAK B02). Jangan gunakan tanda hubung (-) pada nama rak.";

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: {
        parts: [
          { inlineData: { mimeType: 'image/jpeg', data: cleanBase64 } },
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
    console.error("Error analyzing image:", error);
    return {};
  }
};

/**
 * Generates description.
 */
export const generateDescription = async (name: string, partNumber: string): Promise<string> => {
   if (!process.env.API_KEY) return "";
   try {
     const prompt = `Buatkan deskripsi produk ringkas. Nama: ${name}, No Part: ${partNumber}. Bahasa Indonesia.`;
     const response = await ai.models.generateContent({
       model: MODEL_NAME,
       contents: {
        parts: [{ text: prompt }]
       },
     });
     return response.text || "";
   } catch (error) {
     return "";
   }
};

// --- FUNGSI BARU YANG HILANG (WAJIB ADA) ---
export const analyzeResiImage = async (base64Data: string): Promise<ResiAnalysisResult> => {
  if (!process.env.API_KEY) {
    console.warn("API Key is missing.");
    return {};
  }

  try {
    const cleanBase64 = base64Data.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, '');

    // PROMPT KHUSUS PENCARIAN SKU INDUK
    const prompt = `Analisis gambar resi pengiriman marketplace (Shopee, Tokopedia, dll) ini.
    Tujuan utama: Ekstrak Data Pesanan untuk stok.
    
    Cari informasi berikut dan format ke JSON:
    1. "date": Tanggal pesanan/pengiriman (DD/MM/YYYY).
    2. "resi": Nomor Resi / No. Pesanan / Order ID.
    3. "ecommerce": Nama Marketplace (Shopee/Tokopedia/dll).
    4. "customerName": Nama Penerima / Username Pembeli.
    5. "items": Array daftar barang. Untuk setiap barang cari:
       - "sku": Cari KODE SKU INDUK atau SKU UTAMA yang tertera (PENTING!). Jika ada tulisan "SKU Induk", ambil itu. Jika tidak, ambil kode variasi.
       - "name": Nama Produk.
       - "qty": Jumlah barang (angka).
       - "price": Harga satuan (angka, tanpa Rp/titik).
       - "total": Total harga per item (qty * price).
    
    Hanya kembalikan JSON valid.`;

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: {
        parts: [
          { inlineData: { mimeType: 'image/jpeg', data: cleanBase64 } },
          { text: prompt }
        ]
      },
      config: { responseMimeType: "application/json" }
    });

    if (response.text) {
      return JSON.parse(response.text) as ResiAnalysisResult;
    }
    return {};
  } catch (error) {
    console.error("Error scan resi:", error);
    return {};
  }
};