# Smart Clothesline IoT System

Smart Clothesline IoT System is a Next.js 14 dashboard for realtime monitoring, automation, and Telegram notifications.

---

## 🚀 System Status: v1.0.0 Ready
The system has been stabilized and validated for production release. 
- [Staging Validation Runbook](./docs/STAGING_VALIDATION_RUNBOOK.md)
- [Telegram Notification Only Docs](./docs/TELEGRAM_NOTIFICATION_ONLY.md)

---

## 🛠 Features

- **Realtime Dashboard:** Live telemetry, device health, and operational summary.
- **Automation Engine:** Thresholds, schedules, and safety logic.
- **Telegram Integration:** Outbound operational event notifications.
- **Analytics:** Historical trends and data export (CSV/JSON).
- **IoT Hub:** Device pairing, diagnostics, and sync management.
 
---

## 🌐 Public Landing Page

The root route `/` introduces the Smart Clothesline IoT System for users and demo visitors. It explains the product, features, IoT/cloud architecture, dashboard access, notification model, and analytics capabilities.

---

## 🏗 Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **Database:** Firebase Firestore
- **Protocol:** MQTT (HiveMQ)
- **Integration:** Telegram Bot API
- **Styling:** Tailwind CSS

---

## ⚙️ Setup & Development

### Local Setup
1.  **Install:** `npm install`
2.  **Env:** `cp .env.local.example .env.local` (Fill in credentials)
3.  **Run:** `npm run dev`

For detailed contribution rules and branching strategy, see **[DEVELOPMENT.md](./DEVELOPMENT.md)**.

### Deployment
The system is optimized for Vercel. See **[DEPLOYMENT.md](./DEPLOYMENT.md)** for:
- Environment variable configuration.
- Telegram Webhook sync instructions.
- Security ACL recommendations.

---

## 📡 IoT Contracts & Data

- **MQTT Guide:** Canonical topics and payload schemas (see **[MQTT_GUIDE.md](./docs/MQTT_GUIDE.md)**).
- **Telemetry:** Normalized light (0-10000) and authoritative rain state.

---

## 📄 License
This project is developed for educational and research purposes (PBL).
