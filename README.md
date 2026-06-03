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

## Public Landing Page

The root route `/` introduces Smart Clothesline for common users with English and Indonesian copy. It explains the rain-monitoring benefit, dashboard control, Telegram notification-only model, and a visual rain simulation.

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

## Landing Page Performance

The public landing page at `/` is intentionally isolated from runtime systems. It does not initialize MQTT, Firebase, Telegram, dashboard hooks, or analytics data fetching. For Lighthouse testing, run a production build and audit in Incognito because stored IndexedDB data from dashboard testing can affect local results.

---

## 📄 License
This project is developed for educational and research purposes (PBL).

