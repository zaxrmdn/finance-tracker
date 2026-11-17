# 💰 Personal & Business Finance Tracker

Aplikasi web *Custom* Manajemen Keuangan Pribadi & Bisnis yang dirancang untuk mencatat, mengelola, serta menganalisis arus kas masuk dan keluar secara aman, interaktif, dan terisolasi. 

Aplikasi ini dibangun dengan fokus pada keamanan data, arsitektur kontainerisasi modern, dan otomatisasi *CI/CD*.

---

## 🚀 Fitur Utama

- **🔐 Autentikasi Aman & Proteksi Single-User**: Menggunakan enkripsi *bcrypt* untuk perlindungan kata sandi serta pembatasan pendaftaran (*single-user limit*) di tingkat backend agar aplikasi hanya dapat digunakan secara eksklusif oleh pemilik.
- **📊 Visualisasi Grafik Interaktif**: Dilengkapi dengan diagram donat (*Chart.js*) untuk memantau perbandingan persentase antara pemasukan dan pengeluaran secara visual.
- **📝 Manajemen Transaksi Lengkap (CRUD)**: Fitur untuk menambah, memperbarui (edit), dan menghapus catatan transaksi keuangan.
- **🏷️ Kategori Sektor Terstruktur**: Pemisahan kategori pencatatan yang mencakup sektor pribadi maupun bisnis (Gaji, Makanan, Penjualan, Operasional, dll).
- **📅 Filter Berdasarkan Periode (Bulan)**: Memudahkan pengguna untuk menyaring riwayat transaksi dan memantau saldo berdasarkan bulan tertentu.
- **📥 Ekspor Laporan CSV**: Fitur unduh data transaksi secara instan ke dalam format CSV untuk arsip dan analisis lanjutan.

---

## 🛠️ Tech Stack

- **Backend**: Node.js, Express.js
- **Database**: SQLite3 (dengan manajemen penyimpanan persisten via Docker)
- **Frontend**: HTML5, Tailwind CSS (Responsive UI), Chart.js
- **Keamanan**: Bcrypt (Password Hashing)
- **DevOps & Infrastructure**: Docker, Docker Compose, Nginx Proxy Manager, GitHub Actions (CI/CD Auto-Deploy)

---

## ⚙️ Panduan Instalasi & Menjalankan (Lokal / VPS)

1. **Clone Repositori**
   ```Bash
   git clone [https://github.com/username-anda/nama-repositori.git](https://github.com/username-anda/nama-repositori.git)
   cd nama-repositori/finance-app
   ```
   
2. **Jalankan Menggunakan Docker Compose**
Pastikan Anda sudah menginstal Docker dan Docker Compose di server atau komputer lokal Anda, lalu jalankan:

   ```Bash
   docker compose -f docker-compose.finance.yml up --build -d
   ```
3. **Akses Aplikasi**
Buka browser dan akses http://localhost:3000 (atau melalui domain VPS yang terhubung ke Nginx Proxy Manager).

👨‍💻 Author & Maintainer
Zakaria - Initial Work, Backend, Frontend & DevOps Infrastructure - Profil GitHub

📄 License
Proyek ini dilisensikan di bawah MIT License - silakan digunakan untuk referensi, pembelajaran, atau pengembangan pribadi.
