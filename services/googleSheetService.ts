// FILE: src/services/googleSheetService.ts
import { InventoryItem, InventoryFormData } from '../types';

// Pastikan Google Apps Script Anda memetakan nama kolom ini:
// partNumber, name, description, price, stok (awal), masuk, keluar, stokAhir, shelf, imageUrl
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
        shelf: item.shelf,
        imageUrl: item.imageUrl || '',
        lastUpdated: Date.now(),

        // --- MAPPING LOGIKA BARU ---
        // 'quantity' di App sekarang = Stok Ahir di Sheet
        quantity: Number(item.stokAhir) || 0, 
        
        // Simpan state kolom lainnya untuk perhitungan
        initialStock: Number(item.stok) || 0,   // Kolom D (Stok Awal)
        qtyIn: Number(item.masuk) || 0,         // Kolom G (Masuk)
        qtyOut: Number(item.keluar) || 0        // Kolom H (Keluar)
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
    // Saat tambah barang baru, quantity yang diinput masuk ke 'Masuk' atau 'Stok Awal'
    // Disini kita masukkan ke 'Stok' (Awal) agar bersih
    const payload = JSON.stringify({
      action: 'add',
      payload: {
          ...item,
          stok: item.quantity, // Masuk ke kolom Stok Awal
          masuk: 0,
          keluar: 0,
          stokAhir: item.quantity // Stok Ahir awal
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
    // Kirim data lengkap termasuk perubahan Masuk/Keluar
    const payload = JSON.stringify({
      action: 'update',
      payload: {
          partNumber: item.partNumber,
          name: item.name,
          description: item.description,
          price: item.price,
          shelf: item.shelf,
          imageUrl: item.imageUrl,
          
          // Kirim angka counter yang sudah diupdate App
          stok: item.initialStock,
          masuk: item.qtyIn,
          keluar: item.qtyOut,
          stokAhir: item.quantity // Kirim juga stok ahir hasil hitungan App agar sync cepat
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