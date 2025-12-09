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

// --- FUNGSI BARU YANG HILANG (PARSE CSV) ---
export const parseCSV = (text: string) => {
  const lines = text.split('\n').filter(l => l.trim() !== '');
  if (lines.length === 0) return [];

  // Ambil Header
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  
  const result = [];

  for (let i = 1; i < lines.length; i++) {
    const currentLine = lines[i];
    // Regex untuk handle koma di dalam tanda kutip (contoh: "Baut, Mur")
    const regex = /(?:,|\n|^)("(?:(?("")""|[^"])*)"|[^",\n]*|(?:\n|$))/g;
    const matches = [];
    let match;
    while ((match = regex.exec(currentLine)) !== null) {
        // Hapus delimiter dan tanda kutip
        let val = match[1].replace(/^"|"$/g, '').replace(/""/g, '"');
        if (match[0].startsWith(',')) matches.push(val);
        else if (matches.length === 0) matches.push(val); // Item pertama
    }

    // Pastikan jumlah kolom sesuai (atau mendekati)
    if (matches.length > 0) {
        const obj: any = {};
        headers.forEach((header, index) => {
            obj[header] = matches[index] || '';
        });
        result.push(obj);
    }
  }
  return result;
};