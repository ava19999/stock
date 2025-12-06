// FILE: src/services/googleSheetService.ts
import { InventoryItem, InventoryFormData } from '../types';

// LINK APP SCRIPT ANDA (SUDAH DIMASUKKAN)
const API_URL = 'https://script.google.com/macros/s/AKfycbwvb0F5BdmwgCbMHmpZR-KbRUSXl2iWL1z0TdhlgkJVoPlTgCptpjPmhpuH-TJ43YFX/exec';

export const fetchInventoryFromSheet = async (): Promise<InventoryItem[]> => {
  try {
    console.log("Fetching data from API...");
    const response = await fetch(API_URL);
    const result = await response.json();
    
    if (result.status === 'success') {
      console.log("Data loaded:", result.data.length, "items");
      return result.data.map((item: any) => ({
        id: String(item.partNumber), // ID = Part Number
        partNumber: String(item.partNumber),
        name: item.name,
        description: item.description,
        price: Number(item.price),
        quantity: Number(item.quantity),
        shelf: item.shelf,
        // --- BAGIAN INI YANG DIPERBAIKI ---
        imageUrl: item.imageUrl || '', // Sekarang membaca kolom gambar dari Sheet
        // ----------------------------------
        lastUpdated: Date.now()
      }));
    }
    return [];
  } catch (error) {
    console.error("Error fetching data:", error);
    return [];
  }
};

export const addInventoryToSheet = async (item: InventoryFormData): Promise<boolean> => {
  try {
    const payload = JSON.stringify({
      action: 'add',
      payload: item
    });

    await fetch(API_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body: payload
    });
    return true;
  } catch (e) {
    console.error("Error adding item:", e);
    return false;
  }
};

export const updateInventoryInSheet = async (item: InventoryItem): Promise<boolean> => {
  try {
    const payload = JSON.stringify({
      action: 'update',
      payload: item
    });

    await fetch(API_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body: payload
    });
    return true;
  } catch (e) {
    console.error("Error updating item:", e);
    return false;
  }
};

export const deleteInventoryFromSheet = async (partNumber: string): Promise<boolean> => {
  try {
    const payload = JSON.stringify({
      action: 'delete',
      payload: partNumber
    });

    await fetch(API_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body: payload
    });
    return true;
  } catch (e) {
    console.error("Error deleting item:", e);
    return false;
  }
};