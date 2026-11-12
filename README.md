# Kopi & Kondisi

Aplikasi web sederhana untuk memprediksi tingkat kesehatan peminum kopi
(Sehat / Cukup Sehat / Kurang Sehat) berdasarkan kebiasaan konsumsi kopi
dan faktor gaya hidup, menggunakan model machine learning hasil penelitian
(Random Forest / SVM / Gradient Boosting).

## 1. Siapkan berkas model

Dari hasil menjalankan notebook `deal_kopi_lengkap.ipynb` (bagian
"Menyimpan Model Terbaik untuk Deployment"), kamu akan mendapat tiga berkas:

- `model_terbaik.pkl`
- `scaler_terbaik.pkl`
- `feature_names.pkl`

Salin ketiganya ke folder yang sama dengan `app.py` (folder utama aplikasi ini,
sejajar dengan `templates/` dan `static/`).

## 2. Pasang dependensi

```bash
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

## 3. Jalankan aplikasi

```bash
python app.py
```

Buka **http://127.0.0.1:5000** di browser.

Jika berkas model belum ada, halaman akan tetap terbuka dengan pesan
peringatan di bagian atas dan tombol prediksi akan menampilkan pesan error
sampai ketiga berkas di atas ditempatkan dengan benar.

## 4. Cara pakai

**Satu Cangkir (input manual)**
Isi seluruh kolom pada form, lalu tekan "Seduh Prediksi". Kolom Kafein dan
BMI dihitung otomatis (dari jumlah cangkir kopi, serta dari tinggi/berat
badan) tapi tetap bisa diedit manual bila perlu.

**Seduh Banyak (input CSV/batch)**
Unggah berkas CSV dengan kolom wajib berikut (urutan bebas):

```
Age, Gender, Coffee_Intake, Sleep_Hours, Sleep_Quality, BMI, Heart_Rate,
Stress_Level, Physical_Activity_Hours, Smoking, Alcohol_Consumption
```

Kolom `Caffeine_mg` opsional — bila kosong/tidak ada, dihitung otomatis
dari `Coffee_Intake x 95`. Contoh format tersedia lewat tombol
"Unduh Templat CSV" pada halaman aplikasi (`static/templat_input.csv`).

Nilai yang diterima untuk beberapa kolom:
- `Gender`: `Male`, `Female`, atau `Other`
- `Sleep_Quality`: `Poor`, `Fair`, `Good`, atau `Excellent`
- `Stress_Level`: `Low`, `Medium`, atau `High`
- `Smoking` / `Alcohol_Consumption`: `1`/`0`, atau `Ya`/`Tidak`

Setelah diproses, halaman menampilkan ringkasan jumlah per kategori, pratinjau
50 baris pertama, dan tombol untuk mengunduh hasil lengkap (seluruh baris +
kolom prediksi + probabilitas tiap kelas) sebagai CSV.

## 5. Struktur berkas

```
coffee_health_app/
├── app.py                    # backend Flask + logika preprocessing & prediksi
├── requirements.txt
├── model_terbaik.pkl         # (kamu tambahkan sendiri, hasil notebook)
├── scaler_terbaik.pkl        # (kamu tambahkan sendiri, hasil notebook)
├── feature_names.pkl         # (kamu tambahkan sendiri, hasil notebook)
├── templates/
│   └── index.html
└── static/
    ├── css/style.css
    ├── js/main.js
    └── templat_input.csv
```

## Catatan penting

- Preprocessing di `app.py` (diskretisasi usia, one-hot encoding, mapping
  ordinal) sengaja ditulis ulang mengikuti persis tahapan Data Preparation
  pada Bab III skripsi, supaya konsisten dengan cara model dilatih. Kalau
  urutan/aturan preprocessing di notebook berubah, sesuaikan juga fungsi
  `preprocess_row()` di `app.py`.
- Aplikasi ini adalah alat skrining ringan berbasis pola data, **bukan**
  alat diagnosis medis. Kalimat ini sengaja ditampilkan di footer halaman.
