# Smart Clothesline IoT System

Dashboard IoT berbasis Next.js untuk monitoring dan kontrol jemuran pintar secara realtime.

## Ringkasan

Project ini berfokus pada:

- Monitoring sensor: suhu, kelembapan, cahaya, dan rain detection.
- Kontrol perangkat: `OPEN`, `CLOSE`, `AUTO`.
- Integrasi MQTT untuk stream data realtime.
- Persistensi data ke Firestore dengan fallback queue saat offline.
- Analitik dan riwayat operasional untuk evaluasi penggunaan perangkat.

## Fitur Utama

- Dashboard operasional (`/dashboard`):
  - status koneksi, status perangkat, command sync state, event timeline.
- Sensor monitor (`/sensor`):
  - nilai sensor realtime + serial log stream.
- Analytics (`/analytics`):
  - grafik tren, health score perangkat, smart alerts, export CSV/JSON.
- History (`/history`):
  - ringkasan harian, filter status/cuaca, detail harian, daftar pembacaan terbaru.
- Schedule (`/schedule`):
  - manajemen jadwal buka/tutup berbasis jam.
- Settings (`/settings`):
  - konfigurasi perangkat, notifikasi, pairing, dan data management.

## Tech Stack

- Next.js 14 (App Router), React 18, TypeScript
- Tailwind CSS
- MQTT (`mqtt` package)
- Firebase Firestore
- Recharts
- Zod

## Struktur Singkat

```text
src/
  app/                # halaman route Next.js
  components/         # komponen UI reusable
  features/           # modul fitur per domain
  hooks/              # state + orchestration logic
  services/           # service layer (MQTT, Firestore, analytics, validation)
  models/             # tipe/model data
  utils/              # utilitas
```

## Menjalankan Project

Prasyarat:

- Node.js 20+ disarankan
- npm

Install dan jalankan:

```bash
npm install
npm run dev
```

Build production:

```bash
npm run lint
npm run build
npm run start
```

## Konfigurasi Environment

Project membaca konfigurasi Firebase dari environment variable `NEXT_PUBLIC_*`.
Jika tidak diset, project memakai fallback value dari `src/lib/firebase.ts`.

Contoh variable yang umum dipakai:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
```

## MQTT

Default broker:

- URL: `wss://broker.hivemq.com:8884/mqtt`
- Topic sensor: `smart-clothesline/sensor`
- Topic status: `smart-clothesline/status`
- Topic command: `smart-clothesline/command`
- Topic config: `smart-clothesline/config`

## CI

Workflow CI ada di `.github/workflows/ci.yml` dan menjalankan:

1. `npm ci --no-audit --no-fund`
2. `npm run lint`
3. `npm run build`

Catatan: `next build` sudah mencakup linting types Next.js dan validasi TypeScript untuk app.

Trigger:

- `push` ke `main`
- `pull_request` ke `main`
- manual (`workflow_dispatch`)

## Catatan Operasional

- Halaman history dirancang untuk pemantauan operasional harian, bukan hanya log mentah.
- Untuk hasil build konsisten di lokal, bersihkan cache `.next` jika pernah terjadi error bundling sementara.
