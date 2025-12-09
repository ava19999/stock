import { initializeApp } from "firebase/app";
import { getFirestore, collection, doc, setDoc } from "firebase/firestore";
import fs from 'fs';
import csv from 'csv-parser';

// Config MJM CREW
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
      // Ambil Part Number (Primary Key)
      const partNum = (data.part_number || '').trim();
      
      // Hanya proses jika ada Nomor Part
      if (partNum) { 
        results.push({
          partNumber: partNum,
          name: (data.name || 'Tanpa Nama').toUpperCase(), // Paksa Huruf Besar agar search konsisten
          description: data.description || '',
          price: Number(data.price) || 0,
          costPrice: Number(data.cost_price) || 0, 
          quantity: Number(data.quantity) || 0,
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
      console.log(`Mulai upload ke Firebase...`);
      
      let count = 0;
      for (const item of results) {
        try {
          // ID Dokumen = Part Number (ganti karakter miring jadi strip)
          const docId = item.partNumber.replace(/\//g, '-');
          const docRef = doc(db, "inventory", docId);
          await setDoc(docRef, item);
          
          count++;
          if (count % 50 === 0) process.stdout.write(`.`); 
        } catch (error) {
          console.error(`\nGagal: ${item.partNumber}`, error);
        }
      }
      console.log(`\n\nSUKSES! Total ${count} item terupload.`);
      process.exit(0);
    });
};

uploadData();