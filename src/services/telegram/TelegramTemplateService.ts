import { NotificationFormatter } from "@/features/notification/presenters/NotificationFormatter";

export type TemplateType = "RAIN_ALERT" | "CLOTHES_DRY" | "DEVICE_OFFLINE" | "DEVICE_ONLINE" | "SYSTEM_HEALTH" | "TEST";

export class TelegramTemplateService {
  static formatMessage(type: TemplateType | string, customMessage?: string, timestamp?: number): string {
    return NotificationFormatter.formatForTelegram(type, customMessage, timestamp);
  }
}

