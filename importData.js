import { initializeApp } from "firebase/app";
import { getFirestore, collection, doc, setDoc } from "firebase/firestore";
import fs from 'fs';
import csv from 'csv-parser';

// --- 1. KONFIGURASI FIREBASE ---
// Pastikan ini sesuai dengan config di src/lib/firebase.ts Anda
const firebaseConfig = {
  apiKey: "AIzaSyAG3CPRjBmVDCWQX72QyRWYXNhNJAgrSQo",
  authDomain: "mjm-crew-85df8.firebaseapp.com",
  projectId: "mjm-crew-85df8",
  storageBucket: "mjm-crew-85df8.firebasestorage.app",
  messagingSenderId: "673359026558",
  appId: "1:673359026558:web:193e28e7219907b516fb2f",
  measurementId: "G-XNEX8CMTQD"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const CSV_FILE = 'data_stok.csv'; 

const uploadData = async () => {
  const results = [];
  console.log(`Membaca file ${CSV_FILE}...`);

  fs.createReadStream(CSV_FILE)
    .pipe(csv())
    .on('data', (data) => {
      // --- LOGIKA PEMBERSIHAN DATA ---
      // Jika kosong di CSV, otomatis diisi 0 agar aplikasi tidak error
      
      const partNum = (data.part_number || '').trim(); // Ambil part_number
      
      // Hanya proses jika ada Nomor Part (jika baris kosong total, dilewati)
      if (partNum) { 
        results.push({
          // Mapping nama kolom CSV (snake_case) ke Aplikasi (camelCase)
          partNumber: partNum,
          name: data.name || 'Tanpa Nama', // Jika nama kosong, isi 'Tanpa Nama'
          description: data.description || '', // Jika deskripsi kosong, biarkan kosong
          
          // Konversi angka (Jika kosong otomatis jadi 0)
          price: Number(data.price) || 0,
          costPrice: Number(data.cost_price) || 0, 
          quantity: Number(data.quantity) || 0,
          
          // Stok awal = quantity saat ini (jika initial_stock kosong)
          initialStock: Number(data.initial_stock) || Number(data.quantity) || 0,
          
          qtyIn: Number(data.qty_in) || 0,
          qtyOut: Number(data.qty_out) || 0,
          
          shelf: data.shelf || '',
          ecommerce: data.ecommerce || '',
          imageUrl: '', 
          lastUpdated: Date.now()
        });
      }
    })
    .on('end', async () => {
      console.log(`Ditemukan ${results.length} baris data.`);
      console.log(`Mulai upload ke Firebase... Mohon tunggu.`);
      
      let count = 0;
      for (const item of results) {
        try {
          // Gunakan partNumber sebagai ID Dokumen (ganti karakter aneh jika ada)
          // Tanda '/' diganti '-' agar valid di URL
          const docId = item.partNumber.replace(/\//g, '-');
          
          const docRef = doc(db, "inventory", docId);
          await setDoc(docRef, item);
          
          count++;
          if (count % 50 === 0) process.stdout.write(`.`); // Tanda titik per 50 item
        } catch (error) {
          console.error(`\nGagal upload: ${item.partNumber}`, error);
        }
      }

      console.log(`\n\nSUKSES! Total ${count} item berhasil dimasukkan ke database.`);
      console.log(`Silakan refresh website aplikasi Anda sekarang.`);
      process.exit(0);
    });
};

uploadData();