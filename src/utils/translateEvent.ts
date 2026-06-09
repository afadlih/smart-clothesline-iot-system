export function translateEventTitle(title: string, lang: "en" | "id"): string {
  if (lang !== "id") return title;

  const lower = title.toLowerCase();
  if (lower.includes("status changed (sensor)")) return "Status Berubah (Sensor)";
  if (lower.includes("device is online")) return "Alat Terhubung";
  if (lower.includes("status changed")) return "Status Berubah";
  if (lower.includes("command sent")) return "Perintah Dikirim";
  if (lower.includes("command blocked")) return "Perintah Diblokir";
  if (lower.includes("command rate limited")) return "Pengiriman Perintah Dibatasi";
  if (lower.includes("config sync failed")) return "Sinkronisasi Konfigurasi Gagal";
  if (lower.includes("config publish")) return "Publikasi Konfigurasi";
  if (lower.includes("no fresh telemetry (stale)")) return "Tidak Ada Telemetri Baru (Usang)";
  if (lower.includes("rain detected while clothesline is open")) return "Hujan Terdeteksi Saat Jemuran Terbuka";
  if (lower.includes("sensor update")) return "Pembaruan Sensor";
  if (lower.includes("config synced")) return "Konfigurasi Tersinkronisasi";
  if (lower.includes("rain detected")) return "Hujan Terdeteksi";
  if (lower.includes("rain cleared")) return "Hujan Reda";
  if (lower.includes("clothes likely dry")) return "Pakaian Diperkirakan Kering";
  if (lower.includes("manual open request")) return "Permintaan Buka Manual";
  if (lower.includes("manual close request")) return "Permintaan Tutup Manual";
  if (lower.includes("manual auto request")) return "Permintaan Otomatis Manual";
  if (lower.includes("manual status mismatch")) return "Ketidakcocokan Status Manual";
  if (lower.includes("manual mode mismatch")) return "Ketidakcocokan Mode Manual";
  if (lower.includes("telemetry sync")) return "Sinkronisasi Telemetri";
  if (lower.includes("connection sync")) return "Sinkronisasi Koneksi";
  if (lower.includes("telemetry stale alert")) return "Peringatan Telemetri Usang";
  if (lower.includes("firestore sync error")) return "Kesalahan Sinkronisasi Firestore";
  if (lower.includes("schedule open")) return "Jadwal Buka Terpicu";
  if (lower.includes("schedule close")) return "Jadwal Tutup Terpicu";
  
  return title;
}

export function translateEventDescription(desc: string, lang: "en" | "id"): string {
  if (lang !== "id") return desc;

  const lower = desc.toLowerCase();
  
  // Schedule runners
  if (lower.includes("extend clothesline for schedule:")) {
    return desc.replace("Extend clothesline for schedule:", "Membuka jemuran untuk jadwal:");
  }
  if (lower.includes("retract clothesline for schedule:")) {
    return desc.replace("Retract clothesline for schedule:", "Menarik jemuran untuk jadwal:");
  }

  // Config sync & publish
  if (lower.includes("rainthreshold=") || lower.includes("lightthreshold=")) {
    return desc
      .replace("rainThreshold", "Ambang Hujan")
      .replace("lightThreshold", "Ambang Cahaya")
      .replace("updateIntervalSec", "Interval Update (Detik)");
  }
  if (lower.includes("target=") && lower.includes("rain=")) {
    return desc
      .replace("target=", "target=")
      .replace("rain=", "hujan=")
      .replace("light=", "cahaya=")
      .replace("interval=", "interval=");
  }

  // Mismatches
  if (lower.includes("clothesline is closed but wokwi requested open in auto mode")) {
    return "Jemuran tertutup tetapi Wokwi meminta BUKA dalam mode OTOMATIS";
  }
  if (lower.includes("clothesline is open but wokwi requested close in auto mode")) {
    return "Jemuran terbuka tetapi Wokwi meminta TUTUP dalam mode OTOMATIS";
  }
  if (lower.includes("device is in manual but wokwi requested auto")) {
    return "Perangkat dalam mode MANUAL tetapi Wokwi meminta OTOMATIS";
  }

  // Telemetry sync
  if (lower.includes("synced sensor data for device:")) {
    return desc.replace("Synced sensor data for device:", "Data sensor tersinkronisasi untuk alat:");
  }
  if (lower.includes("device has reconnected and telemetry sync is restored.")) {
    return "Perangkat telah terhubung kembali dan sinkronisasi telemetri dipulihkan.";
  }

  // Connection sync & states
  if (lower.includes("connectivity status changed to")) {
    return desc
      .replace("Device", "Alat")
      .replace("connectivity status changed to", "status konektivitas berubah menjadi")
      .replace("ONLINE", "TERHUBUNG")
      .replace("OFFLINE", "TERPUTUS")
      .replace("DELAYED", "TERLAMBAT")
      .replace("UNKNOWN", "TIDAK DIKETAHUI");
  }

  // Stale alert & Offline
  if (lower.includes("telemetry data for") && lower.includes("is stale:")) {
    return desc
      .replace("Telemetry data for", "Data telemetri untuk")
      .replace("is stale: delay=", "usang: keterlambatan=")
      .replace("s", " detik");
  }
  if (lower.includes("no mqtt data for more than 15 seconds")) {
    return "Tidak ada data MQTT selama lebih dari 15 detik. Perangkat mungkin terlambat atau tidak dapat dijangkau.";
  }
  if (lower === "mqtt disconnected or telemetry exceeded offline threshold.") {
    return "MQTT terputus atau telemetri melampaui ambang batas offline.";
  }
  if (lower === "telemetry exceeded stale threshold.") {
    return "Telemetri melampaui ambang batas usang.";
  }

  // Rain alerts / dry
  if (lower.includes("sensor reading:") && lower.includes("threshold:")) {
    return desc
      .replace("Sensor reading:", "Nilai sensor:")
      .replace("threshold:", "ambang batas:");
  }
  if (lower.includes("rain sensor is dry again")) {
    return desc.replace("Rain sensor is dry again:", "Sensor hujan kembali kering:");
  }
  if (lower.includes("humidity is") && lower.includes("and temperature is")) {
    return desc
      .replace("Humidity is", "Kelembapan")
      .replace("and temperature is", "dan suhu");
  }
  if (lower.includes("device remains open while rain=true")) {
    return desc
      .replace("Device remains OPEN while rain=true", "Alat tetap TERBUKA saat hujan terdeteksi")
      .replace("Temp=", "Suhu=")
      .replace("Hum=", "Kelembapan=")
      .replace("Light=", "Cahaya=");
  }

  // Sensor Update details
  if (lower.includes("temp ") && lower.includes("hum ") && lower.includes("light ") && lower.includes("rain ")) {
    return desc
      .replace("Temp", "Suhu")
      .replace("Hum", "Kelembapan")
      .replace("Light", "Cahaya")
      .replace("Rain", "Hujan")
      .replace("yes", "ya")
      .replace("no", "tidak");
  }

  // Status transitions
  if (lower.includes("->") && lower.includes("(fallback)")) {
    return desc
      .replace("OPEN", "TERBUKA")
      .replace("CLOSED", "TERTUTUP")
      .replace("MOVING", "BERGERAK")
      .replace("(fallback)", "(cadangan)");
  }
  if (lower.includes("->") && (lower.includes("(auto)") || lower.includes("(manual)"))) {
    return desc
      .replace("OPEN", "TERBUKA")
      .replace("CLOSED", "TERTUTUP")
      .replace("MOVING", "BERGERAK")
      .replace("(AUTO)", "(OTOMATIS)")
      .replace("(MANUAL)", "(MANUAL)");
  }

  // Manual actions / user commands
  if (lower.includes("opening clothesline via manual mode command")) {
    return "Membuka jemuran melalui perintah mode manual";
  }
  if (lower.includes("closing clothesline via manual mode command")) {
    return "Menutup jemuran melalui perintah mode manual";
  }
  if (lower.includes("switching to automatic mode")) {
    return "Beralih ke mode otomatis";
  }
  if (lower.includes("user ->")) {
    return desc
      .replace("USER ->", "PENGGUNA ->")
      .replace("OPEN", "BUKA")
      .replace("CLOSE", "TUTUP")
      .replace("AUTO", "OTOMATIS")
      .replace("MANUAL", "MANUAL")
      .replace("RESTART", "MULAI ULANG");
  }

  // General errors & limits
  if (lower === "mqtt disconnected") {
    return "MQTT terputus";
  }
  if (lower === "no active device selected") {
    return "Tidak ada perangkat aktif yang dipilih";
  }
  if (lower === "device is offline, cannot send command") {
    return "Perangkat offline, tidak dapat mengirimkan perintah";
  }
  if (lower === "mqtt disconnected, cannot send command") {
    return "MQTT terputus, tidak dapat mengirimkan perintah";
  }
  if (lower.includes("please wait") && lower.includes("before sending another command")) {
    return desc
      .replace("Please wait", "Silakan tunggu")
      .replace("before sending another command", "sebelum mengirim perintah lain");
  }
  if (lower === "device remains open while rain is true.") {
    return "Alat tetap terbuka saat hujan terdeteksi.";
  }
  if (lower === "device movement is in progress.") {
    return "Pergerakan motor jemuran sedang berlangsung.";
  }
  if (lower === "clothesline is retracted.") {
    return "Jemuran telah ditarik masuk.";
  }
  if (lower === "clothesline is extended and rain is not detected.") {
    return "Jemuran terbuka dan tidak ada hujan yang terdeteksi.";
  }
  if (lower === "fault flag is active.") {
    return "Indikator kesalahan aktif.";
  }

  return desc;
}
