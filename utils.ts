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

// --- FUNGSI MEMBERSIHKAN ANGKA DARI STRING (BARU) ---
// Mengubah "2,600,000" atau "Rp 2.500" menjadi angka murni
export const parseNumber = (input: string | number | undefined): number => {
  if (!input) return 0;
  if (typeof input === 'number') return input;
  
  // Hapus semua karakter kecuali angka, titik, dan koma
  // Lalu ganti koma jadi titik (jika format US) atau hapus titik ribuan (jika format ID)
  // Untuk aman: Kita asumsikan input hanya angka & separator
  const cleanStr = input.replace(/[^0-9.,-]/g, '');
  
  // Cek apakah pakai format ribuan koma (US) atau titik (ID)
  // Cara sederhana: Hapus semua non-numeric lalu parse
  const numericOnly = cleanStr.replace(/[,.]/g, ''); 
  return parseFloat(numericOnly) || 0;
};

export const compressImage = (base64: string, maxWidth = 800, quality = 0.7): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = base64;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;
      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) { reject(new Error('Gagal context')); return; }
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = (error) => reject(error);
  });
};

export const parseCSV = (text: string) => {
  const lines = text.split('\n').filter(l => l.trim() !== '');
  if (lines.length === 0) return [];
  const parseLine = (line: string) => {
      const result = [];
      let startValueIndex = 0;
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
          if (line[i] === '"') { inQuotes = !inQuotes; } 
          else if (line[i] === ',' && !inQuotes) {
              let val = line.substring(startValueIndex, i).trim();
              if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1).replace(/""/g, '"');
              result.push(val);
              startValueIndex = i + 1;
          }
      }
      let val = line.substring(startValueIndex).trim();
      if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1).replace(/""/g, '"');
      result.push(val);
      return result;
  };
  const headers = parseLine(lines[0]);
  const result = [];
  for (let i = 1; i < lines.length; i++) {
    const currentLine = lines[i];
    if(!currentLine.trim()) continue;
    const matches = parseLine(currentLine);
    if (matches.length > 0) {
        const obj: any = {};
        headers.forEach((header, index) => {
            const cleanHeader = header.replace(/^"|"$/g, '');
            obj[cleanHeader] = matches[index] || '';
        });
        result.push(obj);
    }
  }
  return result;
};