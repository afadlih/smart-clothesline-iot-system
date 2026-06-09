import { NotificationTemplates, FriendlyNotification } from "./NotificationTemplates";

export class NotificationFormatter {
  static resolveTemplateType(type: string): string {
    let resolvedType = type.toUpperCase();
    if (resolvedType === "RAIN_DETECTED") resolvedType = "RAIN_ALERT";
    if (resolvedType === "TELEMETRY_STALE") resolvedType = "DEVICE_OFFLINE";
    if (resolvedType === "DRY_CANDIDATE") resolvedType = "CLOTHES_DRY";
    if (resolvedType === "CONFIG_SYNC_FAILED") resolvedType = "SYSTEM_HEALTH";
    if (resolvedType === "SYSTEM_HEALTH_REPORT") resolvedType = "SYSTEM_HEALTH";
    return resolvedType;
  }

  static resolveTemplate(type: string): FriendlyNotification & { key: string } {
    const resolvedType = this.resolveTemplateType(type);
    const template = NotificationTemplates[resolvedType] || NotificationTemplates.TEST;
    return {
      ...template,
      key: resolvedType,
    };
  }

  static formatForTelegram(type: string, customDetails?: string, timestamp?: number): string {
    const template = this.resolveTemplate(type);
    const timeStr = this.formatDateTimeByLocale(timestamp || Date.now(), "id");
    
    const emojiMap: Record<string, string> = {
      RAIN_ALERT: "🌧",
      DEVICE_ONLINE: "❇️",
      DEVICE_OFFLINE: "⚠️",
      CLOTHES_DRY: "👕",
      SYSTEM_HEALTH: "❤️",
      TEST: "🤖",
    };
    
    const emoji = emojiMap[template.key] || "🔔";
    
    // For TEST or CUSTOM type, if a custom message is provided, use it
    let detailsText = template.details_id;
    if ((template.key === "TEST" || type.toUpperCase() === "CUSTOM") && customDetails) {
      detailsText = customDetails;
    }

    const statusMap: Record<string, string> = {
      RAIN_ALERT: "Hujan",
      DEVICE_ONLINE: "Terhubung",
      DEVICE_OFFLINE: "Terputus",
      CLOTHES_DRY: "Kering",
      SYSTEM_HEALTH: "Normal",
      TEST: "Uji Coba",
    };
    const statusText = statusMap[template.key] || template.title_id.split(" ")[0];
    
    return `Smart Clothesline Assistant\n
${emoji} ${template.title_id}

${detailsText}

Status: ${statusText}
Waktu: ${timeStr}`;
  }

  static formatIndonesianDateTime(timestamp: number): string {
    return this.formatDateTimeByLocale(timestamp, "id");
  }

  static formatDateTimeByLocale(timestamp: number, lang: "en" | "id"): string {
    const offsetMs = 7 * 60 * 60 * 1000;
    const date = new Date(timestamp + offsetMs);
    
    const day = String(date.getUTCDate()).padStart(2, '0');
    const year = String(date.getUTCFullYear());
    const hours = String(date.getUTCHours()).padStart(2, '0');
    const minutes = String(date.getUTCMinutes()).padStart(2, '0');
    
    const monthsEn = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const monthsId = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
    
    const monthIndex = date.getUTCMonth();
    const month = lang === "id" ? monthsId[monthIndex] : monthsEn[monthIndex];
    
    return `${day} ${month} ${year} • ${hours}:${minutes}`;
  }
}
