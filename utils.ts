// FILE: src/utils.ts

export const formatRupiah = (amount: number): string => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
};

export const generateId = (): string => {
  return Math.random().toString(36).substr(2, 9);
};

// --- FUNGSI KOMPRESI GAMBAR ---
export const compressImage = (base64: string, maxWidth = 800, quality = 0.7): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = base64;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      // Hitung rasio aspek untuk resize
      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Gagal membuat context canvas'));
        return;
      }

      // Gambar ulang dengan ukuran baru
      ctx.drawImage(img, 0, 0, width, height);

      // Konversi kembali ke Base64
      const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
      resolve(compressedBase64);
    };
    img.onerror = (error) => reject(error);
  });
};

// --- FUNGSI PARSE CSV (DIPERBAIKI: Logic Lebih Aman) ---
export const parseCSV = (text: string) => {
  const lines = text.split('\n').filter(l => l.trim() !== '');
  if (lines.length === 0) return [];

  // Helper untuk memecah baris CSV dengan benar (menangani koma di dalam kutip)
  const parseLine = (line: string) => {
      const result = [];
      let startValueIndex = 0;
      let inQuotes = false;
      
      for (let i = 0; i < line.length; i++) {
          if (line[i] === '"') {
              inQuotes = !inQuotes;
          } else if (line[i] === ',' && !inQuotes) {
              let val = line.substring(startValueIndex, i).trim();
              // Bersihkan quotes pembungkus dan unescape double quotes
              if (val.startsWith('"') && val.endsWith('"')) {
                  val = val.slice(1, -1).replace(/""/g, '"');
              }
              result.push(val);
              startValueIndex = i + 1;
          }
      }
      // Push nilai terakhir
      let val = line.substring(startValueIndex).trim();
      if (val.startsWith('"') && val.endsWith('"')) {
          val = val.slice(1, -1).replace(/""/g, '"');
      }
      result.push(val);
      return result;
  };

  // Ambil Header
  const headers = parseLine(lines[0]);
  
  const result = [];

  for (let i = 1; i < lines.length; i++) {
    const currentLine = lines[i];
    if(!currentLine.trim()) continue;
    
    const matches = parseLine(currentLine);

    // Pastikan jumlah kolom valid
    if (matches.length > 0) {
        const obj: any = {};
        headers.forEach((header, index) => {
            // Bersihkan nama header
            const cleanHeader = header.replace(/^"|"$/g, '');
            obj[cleanHeader] = matches[index] || '';
        });
        result.push(obj);
    }
  }
  return result;
};