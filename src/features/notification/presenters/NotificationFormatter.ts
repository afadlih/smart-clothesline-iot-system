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
    const timeStr = this.formatIndonesianDateTime(timestamp || Date.now());
    
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
    let detailsText = template.details;
    if ((template.key === "TEST" || type.toUpperCase() === "CUSTOM") && customDetails) {
      detailsText = customDetails;
    } else if (customDetails && customDetails !== "-") {
      // If we have custom details but it's a known template, we can keep the template details
      // or optionally append/override. But prompt says: "use the same templates".
      // Let's use template.details as priority for user friendliness.
      detailsText = template.details;
    }
    
    return `Smart Clothesline Assistant\n
${emoji} ${template.title}

${detailsText}

Status: ${template.title.split(" ")[0]}
Waktu: ${timeStr}`;
  }

  static formatIndonesianDateTime(timestamp: number): string {
    const date = new Date(timestamp);
    const day = String(date.getDate()).padStart(2, '0');
    const standardMonths = [
      "Januari", "Februari", "Maret", "April", "Mei", "Juni",
      "Juli", "Agustus", "September", "Oktober", "November", "Desember"
    ];
    const resolvedMonth = standardMonths[date.getMonth()] || "Juni";
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${day} ${resolvedMonth} ${year} • ${hours}:${minutes}`;
  }
}
