export interface FriendlyNotification {
  title: string;
  summary: string;
  details: string; // The user-friendly description
  severity: "info" | "warning" | "critical";
  icon: string; // Lucide icon name
  displayColor: string; // color name for styles
}

export const NotificationTemplates: Record<string, FriendlyNotification> = {
  RAIN_ALERT: {
    title: "Hujan Terdeteksi",
    summary: "Sistem menarik jemuran secara otomatis.",
    details: "Hujan terdeteksi. Sistem telah menarik jemuran untuk melindungi pakaian.",
    severity: "warning",
    icon: "CloudRain",
    displayColor: "amber",
  },
  DEVICE_ONLINE: {
    title: "Alat Terhubung",
    summary: "Jemuran pintar kembali terhubung.",
    details: "Perangkat kembali terhubung dan siap digunakan.",
    severity: "info",
    icon: "CheckCircle",
    displayColor: "emerald",
  },
  DEVICE_OFFLINE: {
    title: "Alat Terputus",
    summary: "Jemuran tidak dapat dijangkau.",
    details: "Perangkat tidak dapat dijangkau. Silakan periksa koneksi atau daya perangkat.",
    severity: "critical",
    icon: "XCircle",
    displayColor: "rose",
  },
  CLOTHES_DRY: {
    title: "Pakaian Kering",
    summary: "Pakaian terdeteksi sudah kering.",
    details: "Pakaian diperkirakan sudah kering berdasarkan kondisi cuaca saat ini.",
    severity: "info",
    icon: "Sun",
    displayColor: "teal",
  },
  SYSTEM_HEALTH: {
    title: "Kesehatan Sistem",
    summary: "Semua sistem berjalan normal.",
    details: "Semua layanan berjalan normal.",
    severity: "info",
    icon: "Heart",
    displayColor: "blue",
  },
  TEST: {
    title: "Notifikasi Uji Coba",
    summary: "Ini adalah notifikasi uji coba.",
    details: "Pesan uji coba berhasil terkirim dari sistem jemuran pintar.",
    severity: "info",
    icon: "Bell",
    displayColor: "slate",
  },
};
