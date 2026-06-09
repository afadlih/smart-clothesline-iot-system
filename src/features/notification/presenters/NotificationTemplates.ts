export interface FriendlyNotification {
  title_en: string;
  title_id: string;
  summary_en: string;
  summary_id: string;
  details_en: string;
  details_id: string;
  severity: "info" | "warning" | "critical";
  icon: string; // Lucide icon name
  displayColor: string; // color name for styles
}

export const NotificationTemplates: Record<string, FriendlyNotification> = {
  RAIN_ALERT: {
    title_en: "Rain Detected",
    title_id: "Hujan Terdeteksi",
    summary_en: "System automatically retracted the clothesline.",
    summary_id: "Sistem menarik jemuran secara otomatis.",
    details_en: "Rain has been detected. The system has automatically retracted the clothesline to protect your clothes.",
    details_id: "Hujan terdeteksi. Sistem telah menarik jemuran untuk melindungi pakaian.",
    severity: "warning",
    icon: "CloudRain",
    displayColor: "amber",
  },
  DEVICE_ONLINE: {
    title_en: "Device Connected",
    title_id: "Alat Terhubung",
    summary_en: "Smart clothesline is back online.",
    summary_id: "Jemuran pintar kembali terhubung.",
    details_en: "The device has reconnected to the network and is ready to use.",
    details_id: "Perangkat kembali terhubung dan siap digunakan.",
    severity: "info",
    icon: "CheckCircle",
    displayColor: "emerald",
  },
  DEVICE_OFFLINE: {
    title_en: "Device Offline",
    title_id: "Alat Terputus",
    summary_en: "Clothesline is unreachable.",
    summary_id: "Jemuran tidak dapat dijangkau.",
    details_en: "The device is unreachable. Please check the power supply and network connection.",
    details_id: "Perangkat tidak dapat dijangkau. Silakan periksa koneksi atau daya perangkat.",
    severity: "critical",
    icon: "XCircle",
    displayColor: "rose",
  },
  CLOTHES_DRY: {
    title_en: "Clothes Dry",
    title_id: "Pakaian Kering",
    summary_en: "Clothes are detected to be dry.",
    summary_id: "Pakaian terdeteksi sudah kering.",
    details_en: "Clothes are estimated to be dry based on current weather conditions.",
    details_id: "Pakaian diperkirakan sudah kering berdasarkan kondisi cuaca saat ini.",
    severity: "info",
    icon: "Sun",
    displayColor: "teal",
  },
  SYSTEM_HEALTH: {
    title_en: "System Health",
    title_id: "Kesehatan Sistem",
    summary_en: "All systems running normally.",
    summary_id: "Semua sistem berjalan normal.",
    details_en: "All background services and endpoints are operating normally.",
    details_id: "Semua layanan berjalan normal.",
    severity: "info",
    icon: "Heart",
    displayColor: "blue",
  },
  TEST: {
    title_en: "Test Notification",
    title_id: "Notifikasi Uji Coba",
    summary_en: "This is a test notification.",
    summary_id: "Ini adalah notifikasi uji coba.",
    details_en: "A test message has been successfully sent from the smart clothesline system.",
    details_id: "Pesan uji coba berhasil terkirim dari sistem jemuran pintar.",
    severity: "info",
    icon: "Bell",
    displayColor: "slate",
  },
};
