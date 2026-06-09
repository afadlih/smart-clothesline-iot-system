import { NotificationFormatter } from "./NotificationFormatter";
import { FriendlyNotification } from "./NotificationTemplates";

export interface PresentedNotification {
  id: string;
  chatId: string;
  status: "PENDING" | "SUCCESS" | "FAILED";
  createdAt: any;
  deliveredAt?: any;
  error?: string;
  
  // Layer B: User Notification
  userNotification: FriendlyNotification & {
    formattedTimeEn: string;
    formattedTimeId: string;
  };
  
  // Layer A: Technical Payload
  technicalPayload: {
    deviceId: string;
    rawMessage: string;
    rawType: string;
    rawTimestamp: string;
    errorDetails?: string;
    mqttMetadata?: {
      topic: string;
      broker: string;
    };
    sensorValues: {
      temperature: string;
      humidity: string;
      light: string;
      rain: string;
    };
    debugInfo: {
      firestoreId: string;
      chatId: string;
      telegramMessageId?: string | number;
      localhostUrls: string[];
      rawPayloadJson: string;
    };
  };
}

export class NotificationPresenter {
  static present(log: any): PresentedNotification {
    const rawType = log.type || "TEST";
    const template = NotificationFormatter.resolveTemplate(rawType);
    
    // Format timestamp
    let rawTimestamp = "-";
    let formattedTimeEn = "-";
    let formattedTimeId = "-";
    if (log.createdAt) {
      const ms = typeof log.createdAt.toMillis === "function" 
        ? log.createdAt.toMillis() 
        : Number(log.createdAt);
      if (!isNaN(ms)) {
        rawTimestamp = new Date(ms).toISOString();
        formattedTimeEn = NotificationFormatter.formatDateTimeByLocale(ms, "en");
        formattedTimeId = NotificationFormatter.formatDateTimeByLocale(ms, "id");
      }
    }

    // Extract deviceId and sensor values
    let deviceId = log.deviceId || "ESP32-01";
    let temperature = "-";
    let humidity = "-";
    let light = "-";
    let rain = "-";
    
    // Use structured telemetryContext if available
    if (log.telemetryContext) {
      const tc = log.telemetryContext;
      if (tc.deviceId && tc.deviceId !== "-") deviceId = tc.deviceId;
      if (tc.temperature && tc.temperature !== "-") temperature = tc.temperature;
      if (tc.humidity && tc.humidity !== "-") humidity = tc.humidity;
      if (tc.light && tc.light !== "-") light = tc.light;
      if (tc.rain && tc.rain !== "-") rain = tc.rain;
    } else {
      // Fallback: Parse from raw message
      const msg = log.message || "";
      
      const devMatch = msg.match(/(?:Device|Alat):\s*([^\n\r]+)/i);
      if (devMatch) deviceId = devMatch[1].trim();
      
      const tempMatch = msg.match(/(?:Temp|Temperature)=([0-9.]+)|(?:Temp|Temperature):\s*([0-9.]+)/i);
      if (tempMatch) temperature = `${tempMatch[1] || tempMatch[2]} °C`;
      
      const humMatch = msg.match(/(?:Hum|Humidity)=([0-9.]+)|(?:Hum|Humidity):\s*([0-9.]+)/i);
      if (humMatch) humidity = `${humMatch[1] || humMatch[2]} %`;
      
      const lightMatch = msg.match(/(?:Light)=([0-9.]+)|(?:Light):\s*([0-9.]+)/i);
      if (lightMatch) light = lightMatch[1] || lightMatch[2];
      
      const rainMatch = msg.match(/(?:rain)=([a-zA-Z0-9]+)/i);
      if (rainMatch) rain = rainMatch[1].toUpperCase();
    }

    // Extract localhost URLs to make sure they are removed/hidden from Layer B
    const localhostUrls: string[] = [];
    const msgText = log.message || "";
    const urlRegex = /(https?:\/\/(?:localhost|127\.0\.0\.1|0\.0\.0\.0)(?::\d+)?\S*)/gi;
    let match;
    while ((match = urlRegex.exec(msgText)) !== null) {
      localhostUrls.push(match[1]);
    }

    // Prepare JSON representation of the Firestore document for Debug Info
    const rawPayloadJson = JSON.stringify(
      {
        id: log.id,
        chatId: log.chatId,
        type: log.type,
        status: log.status,
        error: log.error,
        createdAt: log.createdAt ? (typeof log.createdAt.toMillis === "function" ? log.createdAt.toMillis() : log.createdAt) : null,
        deliveredAt: log.deliveredAt ? (typeof log.deliveredAt.toMillis === "function" ? log.deliveredAt.toMillis() : log.deliveredAt) : null,
        telegramMessageId: log.telegramMessageId,
        deviceId: log.deviceId,
        telemetryContext: log.telemetryContext,
      },
      null,
      2
    );

    const presented: PresentedNotification = {
      id: log.id,
      chatId: log.chatId,
      status: log.status,
      createdAt: log.createdAt,
      deliveredAt: log.deliveredAt,
      error: log.error,
      userNotification: {
        title_en: template.title_en,
        title_id: template.title_id,
        summary_en: template.summary_en,
        summary_id: template.summary_id,
        details_en: template.details_en,
        details_id: template.details_id,
        severity: template.severity,
        icon: template.icon,
        displayColor: template.displayColor,
        formattedTimeEn,
        formattedTimeId,
      },
      technicalPayload: {
        deviceId,
        rawMessage: msgText,
        rawType: rawType,
        rawTimestamp,
        errorDetails: log.error,
        mqttMetadata: {
          topic: `esp32/clothesline/${deviceId}/telemetry`,
          broker: "mqtt.eclipseprojects.io:1883",
        },
        sensorValues: {
          temperature,
          humidity,
          light,
          rain,
        },
        debugInfo: {
          firestoreId: log.id,
          chatId: log.chatId,
          telegramMessageId: log.telegramMessageId,
          localhostUrls,
          rawPayloadJson,
        },
      },
    };

    return presented;
  }
}
