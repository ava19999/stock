// Ganti fungsi handleFileUpload di dalam src/components/OrderManagement.tsx dengan ini:

const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    
    // ... (Logika fetch inventory tetap sama) ...
    let inventoryMap = new Map<string, string>(); 
    let allPartNumbers: string[] = [];
    try {
        const inventoryData = await fetchInventory();
        inventoryData.forEach(item => {
            if(item.name) inventoryMap.set(item.name.toLowerCase().trim(), item.partNumber);
            if(item.partNumber) allPartNumbers.push(item.partNumber);
        });
        allPartNumbers.sort((a, b) => b.length - a.length);
    } catch (err) { console.error("Gagal ambil inventory:", err); }

    const reader = new FileReader();
    reader.onload = async (evt) => {
        try {
            const bstr = evt.target?.result;
            const wb = XLSX.read(bstr, { type: 'binary' });
            const wsname = wb.SheetNames[0];
            const ws = wb.Sheets[wsname];
            const data: any[] = XLSX.utils.sheet_to_json(ws, { raw: false });

            const updates = data.map((row: any) => {
                // ... (Mapping data tetap sama) ...
                const getVal = (keys: string[]) => { for (let k of keys) { if (row[k] !== undefined) return row[k]; const lowerKey = Object.keys(row).find(rk => rk.toLowerCase() === k.toLowerCase()); if (lowerKey) return row[lowerKey]; } return null; };
                const resi = getVal(['No. Resi', 'No. Pesanan', 'Resi', 'Order ID']);
                const username = getVal(['Username (Pembeli)', 'Username Pembeli', 'Username', 'Pembeli', 'Nama Penerima']);
                let partNo = getVal(['No. Referensi', 'Part Number', 'Part No', 'Kode Barang']);
                const produk = getVal(['Nama Produk', 'Nama Barang', 'Product Name']);
                const qty = getVal(['Jumlah', 'Qty', 'Quantity']);
                const harga = getVal(['Harga Awal', 'Harga Satuan', 'Price', 'Harga', 'Harga Variasi']);
                const produkNameClean = String(produk || '').trim();
                const produkLower = produkNameClean.toLowerCase();

                if ((!partNo || partNo === '-' || partNo === '') && produkNameClean) {
                    const foundByExactName = inventoryMap.get(produkLower);
                    if (foundByExactName) partNo = foundByExactName;
                    else {
                        const foundInText = allPartNumbers.find(pn => produkLower.includes(pn.toLowerCase()));
                        if (foundInText) partNo = foundInText;
                        else {
                            const regexPartNo = /\b[A-Z0-9]{5,}-[A-Z0-9]{4,}\b/i;
                            const match = produkNameClean.match(regexPartNo);
                            if (match) partNo = match[0].toUpperCase();
                        }
                    }
                }

                if (resi) {
                    return {
                        resi: String(resi).trim(),
                        toko: selectedStore,
                        ecommerce: selectedMarketplace,
                        customer: username || '-', 
                        part_number: partNo || null,
                        nama_barang: produk || '-',
                        quantity: parseIndonesianNumber(qty),
                        harga_satuan: parseIndonesianNumber(harga),
                        harga_total: parseIndonesianNumber(qty) * parseIndonesianNumber(harga) 
                    };
                }
                return null;
            }).filter(item => item !== null);

            if (updates.length > 0) {
                // PANGGIL IMPORT EXCEL BARU
                const result = await importScanResiFromExcel(updates);
                if (result.success) {
                    let msg = "";
                    const newCount = updates.length - result.skippedCount - result.updatedCount;
                    if (newCount > 0) msg += `✅ ${newCount} Data Baru (Pending). `;
                    if (result.updatedCount > 0) msg += `🔄 ${result.updatedCount} Data Dilengkapi (Siap Kirim). `;
                    if (result.skippedCount > 0) msg += `⏭️ ${result.skippedCount} Duplikat Dilewati.`;
                    
                    if(!msg) msg = "Tidak ada perubahan data.";
                    showToast(msg, 'success');
                    await loadScanLogs();
                } else {
                    showToast("Gagal mengupdate database.", 'error');
                }
            } else {
                showToast("Tidak ditemukan data valid di file Excel.", 'error');
            }

        } catch (error) {
            console.error("Parse Error:", error);
            showToast("Gagal membaca file Excel.", 'error');
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };
    reader.readAsBinaryString(file);
};