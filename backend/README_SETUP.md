# Panduan Backend 100% Otomatis (Zero Manual Setup)

Dengan versi 1 kode `backend/Code.gs` ini, Anda **TIDAK PERLU** membuat file Google Sheets atau folder Google Drive secara manual lagi! Semua dibuat dan diolah otomatis oleh script.

---

## ⚡ Cara Pasang 1-Klik di Google Apps Script

### Langkah 1: Buka Google Apps Script
1. Buka [script.google.com](https://script.google.com) di peramban Anda.
2. Klik **Proyek Baru (New Project)** di pojok kiri atas.

### Langkah 2: Tempelkan Kode
1. Hapus semua kode bawaan editor.
2. Salin seluruh isi kode dari berkas **`backend/Code.gs`** lalu tempelkan di editor.

### Langkah 3: Deploy Sebagai Web App API
1. Klik tombol **Terapkan (Deploy)** -> **Penerapan Baru (New deployment)**.
2. Pilih jenis penerapan: **Aplikasi Web (Web App)**.
3. Atur:
   - **Jalankan sebagai (Execute as)**: `Saya (Me)`
   - **Yang memiliki akses (Who has access)**: `Siapa saja (Anyone)`
4. Klik **Terapkan (Deploy)** dan berikan izin otorisasi (*Review Permissions* -> *Allow*).
5. Salin **URL Aplikasi Web (Web App URL)** yang dihasilkan.

---

## 🪄 Apa Yang Terjadi Secara Otomatis?

1. **Membuat File Google Sheets Otomatis**:
   - Berkas spreadsheet bernama **`Laksanasoft_Corporate_Database`** akan otomatis dibuat di Google Drive Anda saat request pertama masuk.
   - Otomatis membuat 4 tabel (`Users`, `Invoices`, `Transactions`, `Notifications`) beserta header dan data bawaannya.

2. **Membuat Folder Google Drive Otomatis**:
   - Folder bernama **`Laksanasoft_Payment_Receipts`** otomatis dibuat di Google Drive Anda untuk menampung file resi pembayaran resmi.

3. **Menghubungkan ke Frontend Portal**:
   - Tempelkan Web App URL yang disalin ke variabel `GOOGLE_WEB_APP_URL` di berkas `backend_service.js`:
   ```javascript
   const GOOGLE_WEB_APP_URL = "PASANG_WEB_APP_URL_ANDA_DI_SINI";
   ```
