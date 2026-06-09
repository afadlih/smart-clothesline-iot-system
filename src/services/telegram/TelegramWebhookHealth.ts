import { NextRequest } from "next/server";
import { TelegramBotApiService } from "@/services/TelegramBotApiService";
import { TelegramEnvConfigService } from "@/services/telegram/TelegramEnvConfigService";
import {
  resolveTelegramWebhookUrl,
  isTelegramWebhookEnabled,
} from "@/services/telegram/TelegramWebhookUrlResolver";

export type WebhookHealthStatus = {
  healthy: boolean;
  expectedUrl: string;
  actualUrl: string;
  mismatchReason?: string;
  status: "Connected" | "Disconnected" | "Webhook Mismatch" | "Webhook Not Registered";
};

export class TelegramWebhookHealth {
  static async check(request?: NextRequest): Promise<WebhookHealthStatus> {
    const token = TelegramEnvConfigService.getBotToken();
    const expectedUrl = resolveTelegramWebhookUrl(request);

    if (!token) {
      return {
        healthy: false,
        expectedUrl,
        actualUrl: "",
        mismatchReason: "Bot token is not configured",
        status: "Disconnected",
      };
    }

    try {
      const webhookInfo = await TelegramBotApiService.getWebhookInfo(token);
      if (!webhookInfo.ok) {
        return {
          healthy: false,
          expectedUrl,
          actualUrl: "",
          mismatchReason: webhookInfo.description || "Failed to get webhook info from Telegram",
          status: "Disconnected",
        };
      }

      const actualUrl = webhookInfo.result?.url || "";

      if (!isTelegramWebhookEnabled()) {
        return {
          healthy: false,
          expectedUrl,
          actualUrl,
          mismatchReason: "Webhook mode is disabled",
          status: "Disconnected",
        };
      }

      if (!actualUrl) {
        return {
          healthy: false,
          expectedUrl,
          actualUrl,
          mismatchReason: expectedUrl.includes("localhost")
            ? "Local test mode: Webhook synchronization requires a public HTTPS URL."
            : "Webhook is not registered",
          status: "Webhook Not Registered",
        };
      }

      if (actualUrl !== expectedUrl) {
        return {
          healthy: false,
          expectedUrl,
          actualUrl,
          mismatchReason: expectedUrl.includes("localhost")
            ? "Local test mode: Webhook synchronization requires a public HTTPS URL."
            : "Webhook URL mismatch",
          status: "Webhook Mismatch",
        };
      }

      return {
        healthy: true,
        expectedUrl,
        actualUrl,
        status: "Connected",
      };
    } catch (error) {
      return {
        healthy: false,
        expectedUrl,
        actualUrl: "",
        mismatchReason: String(error),
        status: "Disconnected",
      };
    }
  }
}
