// FILE: src/services/googleSheetService.ts
import { InventoryItem, InventoryFormData } from '../types';

const API_URL = 'https://script.google.com/macros/s/AKfycbzsDozdZKtZw-Duhg1-A_A_6vTQgm1y0sGw1iN-2ecgLdBOLkviJsqkEAdacmgx17Cv/exec';

export const fetchInventoryFromSheet = async (): Promise<InventoryItem[]> => {
  try {
    console.log("Fetching data from API...");
    const response = await fetch(API_URL);
    const result = await response.json();
    
    if (result.status === 'success') {
      console.log("Data loaded:", result.data.length, "items");
      return result.data.map((item: any) => ({
        id: String(item.partNumber),
        partNumber: String(item.partNumber),
        name: item.name,
        description: item.description,
        price: Number(item.price) || 0,
        // Mapping kolom baru (Pastikan di Sheet Anda ada kolomnya atau API handle ini)
        costPrice: Number(item.costPrice) || 0, 
        ecommerce: item.ecommerce || '',
        
        shelf: item.shelf,
        imageUrl: item.imageUrl || '',
        lastUpdated: Date.now(),

        // Mapping Stok Lengkap
        quantity: Number(item.stokAhir) || 0, // Stok Akhir
        initialStock: Number(item.stok) || 0, // Stok Awal
        qtyIn: Number(item.masuk) || 0,       // Penambahan
        qtyOut: Number(item.keluar) || 0      // Pengurangan
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
    // Saat tambah baru, kita asumsikan quantity masuk ke Stok Awal
    // Dan user mungkin input detail lain
    const payload = JSON.stringify({
      action: 'add',
      payload: {
          ...item,
          stok: item.initialStock || item.quantity, 
          masuk: item.qtyIn || 0,
          keluar: item.qtyOut || 0,
          stokAhir: item.quantity,
          // Field baru
          costPrice: item.costPrice,
          ecommerce: item.ecommerce
      }
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
      payload: {
          partNumber: item.partNumber,
          name: item.name,
          description: item.description,
          price: item.price,
          shelf: item.shelf,
          imageUrl: item.imageUrl,
          
          // Update Stok Lengkap
          stok: item.initialStock,
          masuk: item.qtyIn,
          keluar: item.qtyOut,
          stokAhir: item.quantity,

          // Field baru
          costPrice: item.costPrice,
          ecommerce: item.ecommerce
      }
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