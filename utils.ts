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

// --- FUNGSI KOMPRESI GAMBAR (PENTING) ---
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

      // Konversi kembali ke Base64 dengan kualitas (quality) yang diturunkan (0.0 - 1.0)
      // 'image/jpeg' lebih kecil ukurannya dibanding png untuk foto
      const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
      resolve(compressedBase64);
    };
    img.onerror = (error) => reject(error);
  });
};