import { NextRequest } from "next/server";
import { TelegramBotApiService } from "@/services/TelegramBotApiService";
import { TelegramEnvConfigService } from "@/services/telegram/TelegramEnvConfigService";
import {
  resolveTelegramWebhookUrl,
  resolveAppBaseUrl,
  isTelegramWebhookEnabled,
} from "@/services/telegram/TelegramWebhookUrlResolver";
import { TelegramOpsService } from "@/services/TelegramOpsService";
import { logger } from "@/lib/logger";

export type TelegramWebhookSyncOptions = {
  repair?: boolean;
  force?: boolean;
  dropPendingUpdates?: boolean;
  source?: "setup-route" | "sync-route" | "diagnostics" | "script" | "ui";
};

type TelegramWebhookInfoSnapshot = {
  pending_update_count?: number;
  last_error_date?: number;
  last_error_message?: string;
  last_synchronization_error_date?: number;
  max_connections?: number;
  ip_address?: string;
  allowed_updates?: string[];
};

export type TelegramWebhookSyncResult = {
  ok: boolean;
  botConfigured: boolean;
  webhookEnabled: boolean;
  appBaseUrl: string | null;
  expectedWebhookUrl: string | null;
  actualTelegramWebhookUrl: string | null;
  webhookUrlMatch: boolean;
  webhookStatus: "ok" | "missing" | "mismatch" | "disabled" | "unconfigured" | "failed";
  telegramWebhookInfo?: TelegramWebhookInfoSnapshot | null;
  telegramPendingUpdateCount?: number;
  telegramLastErrorDate?: number;
  telegramLastErrorMessage?: string;
  telegramLastSynchronizationErrorDate?: number;
  commandRegistered?: boolean;
  setWebhookOk?: boolean;
  setWebhookDescription?: string;
  deleteWebhookOk?: boolean;
  deleteWebhookDescription?: string;
  droppedPendingUpdates?: boolean;
  nextAction: string;
  warnings: string[];
};

function hostFromUrl(url: string): string {
  try {
    return new URL(url).host.toLowerCase();
  } catch {
    return "";
  }
}

function isLikelyEphemeralVercelUrl(url: string): boolean {
  const host = hostFromUrl(url);
  if (!host.endsWith(".vercel.app")) return false;
  return host.includes("-git-") || /[a-z0-9-]+-[a-z0-9]{8,}\.vercel\.app$/.test(host);
}

function applyWebhookInfo(result: Partial<TelegramWebhookSyncResult>, webhookInfo: Awaited<ReturnType<typeof TelegramBotApiService.getWebhookInfo>>) {
  if (!webhookInfo.ok || !webhookInfo.result) {
    result.telegramWebhookInfo = null;
    if (webhookInfo.description) {
      result.telegramLastErrorMessage = webhookInfo.description;
    }
    return null;
  }

  const info = webhookInfo.result as TelegramWebhookInfoSnapshot & { url?: string };
  result.telegramWebhookInfo = {
    pending_update_count: info.pending_update_count,
    last_error_date: info.last_error_date,
    last_error_message: info.last_error_message,
    last_synchronization_error_date: info.last_synchronization_error_date,
    max_connections: info.max_connections,
    ip_address: info.ip_address,
    allowed_updates: info.allowed_updates,
  };
  result.telegramPendingUpdateCount = info.pending_update_count;
  result.telegramLastErrorDate = info.last_error_date;
  result.telegramLastErrorMessage = info.last_error_message;
  result.telegramLastSynchronizationErrorDate = info.last_synchronization_error_date;
  return info.url || null;
}

export class TelegramWebhookSyncService {
  static async getStatus(request?: NextRequest): Promise<TelegramWebhookSyncResult> {
    return this.sync({ repair: false, source: "diagnostics" }, request);
  }

  static async sync(
    options: TelegramWebhookSyncOptions,
    request?: NextRequest
  ): Promise<TelegramWebhookSyncResult> {
    const token = TelegramEnvConfigService.getBotToken();
    const webhookEnabled = isTelegramWebhookEnabled();
    const appBaseUrl = resolveAppBaseUrl(request);
    const expectedWebhookUrl = resolveTelegramWebhookUrl(request);
    const allowEphemeral = TelegramEnvConfigService.shouldAllowEphemeralWebhook();
    const envDropOnSetup = TelegramEnvConfigService.shouldDropPendingUpdatesOnWebhookSetup();
    const repair = options.repair === true;
    const force = options.force === true;
    const dropPendingUpdates = options.dropPendingUpdates ?? (repair || force || envDropOnSetup);
    const warnings: string[] = [];
    const result: Partial<TelegramWebhookSyncResult> = {
      botConfigured: Boolean(token),
      webhookEnabled,
      appBaseUrl,
      expectedWebhookUrl,
      warnings,
    };

    if (!token) {
      return {
        ...result,
        ok: false,
        webhookUrlMatch: false,
        webhookStatus: "unconfigured",
        nextAction: "Set TELEGRAM_BOT_TOKEN in environment variables.",
        warnings: ["Bot token is missing"],
      } as TelegramWebhookSyncResult;
    }

    if (!webhookEnabled) {
      return {
        ...result,
        ok: true,
        webhookUrlMatch: false,
        webhookStatus: "disabled",
        nextAction: "Enable TELEGRAM_WEBHOOK_ENABLED=true if you want to receive commands via webhook.",
        warnings: ["Webhook mode is disabled in environment"],
      } as TelegramWebhookSyncResult;
    }

    if (!appBaseUrl || appBaseUrl.includes("localhost")) {
      warnings.push(!appBaseUrl ? "APP_BASE_URL is missing" : "APP_BASE_URL is localhost; webhook registration usually requires a public HTTPS URL.");
    }

    if (!allowEphemeral && appBaseUrl && isLikelyEphemeralVercelUrl(appBaseUrl)) {
      return {
        ...result,
        ok: false,
        webhookUrlMatch: false,
        webhookStatus: "failed",
        nextAction: "Use a stable domain or set TELEGRAM_ALLOW_EPHEMERAL_WEBHOOK=true.",
        warnings: ["APP_BASE_URL is an ephemeral Vercel deployment URL."],
      } as TelegramWebhookSyncResult;
    }

    const webhookInfo = await TelegramBotApiService.getWebhookInfo(token);
    let actualUrl = applyWebhookInfo(result, webhookInfo);
    result.actualTelegramWebhookUrl = actualUrl;

    const getMatch = (actual: string | null) => Boolean(actual && actual === expectedWebhookUrl);
    result.webhookUrlMatch = getMatch(actualUrl);

    if (result.telegramPendingUpdateCount && result.telegramPendingUpdateCount > 0) {
      warnings.push(`Telegram has ${result.telegramPendingUpdateCount} pending webhook update(s).`);
    }
    if (result.telegramLastErrorMessage) {
      warnings.push(`Telegram delivery error: ${result.telegramLastErrorMessage}`);
    }

    if (repair) {
      logger.info("telegram", "Starting webhook sync repair", { source: options.source, force, dropPendingUpdates });
      let deleteOk = true;
      let deleteDesc = "";

      if (force) {
        const delRes = await TelegramBotApiService.deleteWebhookWithResult(token, { dropPendingUpdates: true });
        deleteOk = delRes.ok;
        deleteDesc = delRes.description || "";
        result.deleteWebhookOk = deleteOk;
        result.deleteWebhookDescription = deleteDesc;
        result.droppedPendingUpdates = true;
      }

      if (deleteOk) {
        const setRes = await TelegramBotApiService.setWebhookWithResult(token, expectedWebhookUrl, {
          secretToken: TelegramEnvConfigService.getWebhookSecret() || undefined,
          dropPendingUpdates,
        });
        result.setWebhookOk = setRes.ok;
        result.setWebhookDescription = setRes.description;
        if (setRes.ok) result.droppedPendingUpdates = dropPendingUpdates;
      }

      const webhookInfoAfter = await TelegramBotApiService.getWebhookInfo(token);
      actualUrl = applyWebhookInfo(result, webhookInfoAfter);
      result.actualTelegramWebhookUrl = actualUrl;
      result.webhookUrlMatch = getMatch(actualUrl);

      await TelegramOpsService.addAuditLog({
        command: "webhook_sync",
        result: result.webhookUrlMatch ? "success" : "failed",
        detail: `Source: ${options.source}. Match: ${result.webhookUrlMatch}. Desc: ${result.setWebhookDescription || "n/a"}. LastError: ${result.telegramLastErrorMessage || "n/a"}`,
        source: "telegram-setup",
      });
    }

    let webhookStatus: TelegramWebhookSyncResult["webhookStatus"] = "ok";
    if (!actualUrl) webhookStatus = "missing";
    else if (!result.webhookUrlMatch) webhookStatus = "mismatch";

    let nextAction = "Webhook is synchronized.";
    if (webhookStatus === "missing") nextAction = "Telegram has no webhook registered. Inbound commands will fail. Click 'Repair' to register.";
    else if (webhookStatus === "mismatch") nextAction = "Telegram webhook URL differs from this deployment. Click 'Repair' to sync.";
    else if (result.telegramLastErrorMessage) nextAction = "Webhook URL is registered, but Telegram reports delivery errors. Repair webhook and inspect telegramLastErrorMessage.";

    return {
      ...result,
      ok: webhookStatus === "ok" && !result.telegramLastErrorMessage,
      webhookStatus,
      nextAction,
    } as TelegramWebhookSyncResult;
  }

  static async isWebhookInSync(request?: NextRequest): Promise<boolean> {
    const status = await this.getStatus(request);
    return status.webhookUrlMatch;
  }
}