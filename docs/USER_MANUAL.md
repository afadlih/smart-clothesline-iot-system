# Smart Clothesline IoT System - User Manual / Panduan Pengguna

Welcome to the user guide for the **Smart Clothesline IoT System**. This manual will help you understand and control your smart clothesline.

Selamat datang di panduan pengguna **Smart Clothesline IoT System**. Panduan ini akan membantu Anda memahami dan mengontrol jemuran pintar Anda.

---

## Table of Contents / Daftar Isi

1. [Introduction / Pendahuluan](#1-introduction--pendahuluan)
2. [Getting Started / Memulai Penggunaan](#2-getting-started--memulai-penggunaan)
3. [Real-time Control / Kontrol Real-time](#3-real-time-control--kontrol-real-time)
4. [Schedules / Pengaturan Jadwal](#4-schedules--pengaturan-jadwal)
5. [Analytics & Logs / Analisis & Log Data](#5-analytics--logs--analisis--log-data)
6. [Telegram Notifications / Notifikasi Telegram](#6-telegram-notifications--notifikasi-telegram)
7. [Troubleshooting / Pemecahan Masalah](#7-troubleshooting--pemecahan-masalah)

---

## 1. Introduction / Pendahuluan

### English
The Smart Clothesline IoT System monitors local weather conditions (rain, light, temperature, humidity) and automates your clothesline to keep your laundry dry and safe.

### Indonesian
Smart Clothesline IoT System memantau kondisi cuaca setempat (hujan, cahaya, suhu, kelembaban) dan mengotomatiskan jemuran Anda agar cucian tetap kering dan aman.

---

## 2. Getting Started / Memulai Penggunaan

### A. Accessing the Web Portal / Mengakses Portal Web
- Open the landing page. Choose your preferred language (English or Indonesian) via the language selector in the header.
- *Buka halaman utama. Pilih bahasa yang Anda sukai (Inggris atau Indonesia) melalui pemilih bahasa di bagian atas.*

### B. Account Setup & Password Recovery / Pembuatan Akun & Pemulihan Kata Sandi
- **Sign In / Up:** Use your email and password to log in, or click "Create Free Account" to register.
- **Forgot Password:** If you cannot log in, click "Forgot Password?" on the login page. Enter your email address to receive a secure password reset link.
- ***Masuk / Daftar:** Gunakan email dan kata sandi Anda untuk masuk, atau klik "Buat Akun Gratis" untuk mendaftar.*
- ***Lupa Kata Sandi:** Jika Anda lupa kata sandi, klik "Lupa Kata Sandi?" pada halaman masuk. Masukkan email Anda untuk menerima tautan atur ulang kata sandi.*

---

## 3. Real-time Control / Kontrol Real-time

Once logged into the **Dashboard**, you can monitor sensor telemetry and control your clothesline.
*Setelah masuk ke **Dasbor**, Anda dapat memantau telemetri sensor dan mengontrol jemuran Anda.*

### A. Operational Modes / Mode Operasional
- **AUTOMATIC (Otomatis):** The system automatically pulls/retracts the clothesline when rain is detected or when light levels drop (night/dusk).
- **MANUAL (Manual):** Disables automatic sensors. The clothesline will only move when you click **OPEN (Buka)** or **CLOSE (Tutup)**.
- ***OTOMATIS:** Sistem akan secara otomatis menarik/menutup jemuran ketika mendeteksi hujan atau ketika tingkat cahaya redup (malam hari).*
- ***MANUAL:** Menonaktifkan sensor otomatis. Jemuran hanya akan bergerak ketika Anda mengeklik **Buka** atau **Tutup**.*

### B. Weather Status Indicators / Indikator Cuaca
- **Monitoring (Memantau):** Clear weather; clothesline is extended.
- **Rain Alert (Peringatan Hujan):** Rain detected; clothesline retracts automatically for protection.
- **Low Light (Kurang Cahaya):** Low ambient light detected; clothesline retracts automatically.
- ***Memantau:** Cuaca cerah; jemuran terbuka.*
- ***Peringatan Hujan:** Terdeteksi hujan; jemuran ditarik otomatis untuk perlindungan.*
- ***Kurang Cahaya:** Cahaya redup terdeteksi; jemuran ditarik otomatis.*

---

## 4. Schedules / Pengaturan Jadwal

Set timer windows to automatically open or close the clothesline during specific hours.
*Atur waktu jadwal untuk membuka atau menutup jemuran secara otomatis pada jam-jam tertentu.*

- Go to the **Schedule (Jadwal)** page.
- Create a schedule (e.g. Open at 08:00 AM, Close at 05:00 PM).
- **Safety Priority:** Even if a schedule attempts to open the clothesline, the system will keep it closed if it detects rain.
- *Buka halaman **Jadwal**.*
- *Buat jadwal baru (misalnya: Buka jam 08:00 pagi, Tutup jam 05:00 sore).*
- ***Prioritas Keamanan:** Meskipun jadwal mencoba membuka jemuran, sistem akan tetap menutupnya jika mendeteksi hujan.*

---

## 5. Analytics & Logs / Analisis & Log Data

View historical logs and sensor trends over the past hours or days.
*Lihat riwayat log dan tren sensor selama beberapa jam atau hari terakhir.*

- Go to the **Analytics (Analisis)** page to view charts showing temperature, humidity, and light changes.
- Click **Export (Ekspor)** to download your logs in CSV or JSON format.
- *Buka halaman **Analisis** untuk melihat grafik perubahan suhu, kelembaban, dan tingkat cahaya.*
- *Klik **Ekspor** untuk mengunduh log Anda dalam format CSV atau JSON.*

---

## 6. Telegram Notifications / Notifikasi Telegram

The system integrates with a Telegram Bot to keep you notified.
*Sistem ini terintegrasi dengan Bot Telegram untuk terus memberi tahu Anda.*

- **Notification-Only:** The Telegram bot only sends alerts (e.g., when rain starts, or if the device goes offline). 
- **No Direct Commands:** You cannot control the clothesline from Telegram. To open or close it, click the link inside the message to open the Web Dashboard.
- ***Hanya Notifikasi:** Bot Telegram hanya mengirimkan peringatan (misalnya, saat mulai hujan, atau jika alat mati).*
- ***Tidak Ada Kontrol Langsung:** Anda tidak dapat mengontrol jemuran dari Telegram. Untuk membuka atau menutupnya, klik tautan di dalam pesan untuk membuka Dasbor Web.*

---

## 7. Troubleshooting / Pemecahan Masalah

### English
1. **Device shows Offline / Delayed:** Check if the physical hardware (ESP32) is powered on and connected to the Wi-Fi.
2. **Dashboard values not updating:** Refresh the browser. If using local Firestore, ensure your browser's ad-blocker is disabled for `localhost`.
3. **Cannot open clothesline in Automatic mode:** Ensure there is no rain detected and light levels are sufficient. Otherwise, switch to **Manual** mode to override.

### Indonesian
1. **Alat menunjukkan Offline / Tertunda:** Periksa apakah perangkat fisik (ESP32) menyala dan terhubung ke Wi-Fi.
2. **Nilai Dasbor tidak diperbarui:** Muat ulang (refresh) peramban Anda. Jika menggunakan Firestore lokal, pastikan ad-blocker dinonaktifkan untuk `localhost`.
3. **Jemuran tidak bisa dibuka dalam mode Otomatis:** Pastikan tidak ada hujan yang terdeteksi dan cahaya cukup. Jika ingin memotong sistem, alihkan ke mode **Manual**.
