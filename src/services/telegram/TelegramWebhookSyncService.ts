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

export type TelegramWebhookSyncResult = {
  ok: boolean;
  botConfigured: boolean;
  webhookEnabled: boolean;
  appBaseUrl: string | null;
  expectedWebhookUrl: string | null;
  actualTelegramWebhookUrl: string | null;
  webhookUrlMatch: boolean;
  webhookStatus: "ok" | "missing" | "mismatch" | "disabled" | "unconfigured" | "failed";
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
        nextAction: "Enable TELEGRAM_WEBHOOK_ENABLED=true if you want to track inbound messages and send notification-only auto-replies.",
        warnings: ["Webhook mode is disabled in environment"],
      } as TelegramWebhookSyncResult;
    }

    if (!appBaseUrl || appBaseUrl.includes("localhost")) {
      if (!appBaseUrl) {
        warnings.push("APP_BASE_URL is missing");
      } else {
        warnings.push("APP_BASE_URL is localhost; webhook registration usually requires a public HTTPS URL.");
      }
    }

    if (appBaseUrl && isLikelyEphemeralVercelUrl(appBaseUrl)) {
      return {
        ...result,
        ok: false,
        webhookUrlMatch: false,
        webhookStatus: "failed",
        nextAction: "Use a stable domain for Telegram webhooks.",
        warnings: ["APP_BASE_URL is an ephemeral Vercel deployment URL."],
      } as TelegramWebhookSyncResult;
    }

    // Phase 1: Get current state from Telegram
    const webhookInfo = await TelegramBotApiService.getWebhookInfo(token);
    let actualUrl = webhookInfo.ok ? webhookInfo.result?.url || null : null;
    result.actualTelegramWebhookUrl = actualUrl;

    const getMatch = (actual: string | null) => Boolean(actual && actual === expectedWebhookUrl);
    result.webhookUrlMatch = getMatch(actualUrl);

    // Phase 2: Perform Repair if requested
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
        if (setRes.ok) {
          result.droppedPendingUpdates = dropPendingUpdates;
        }
      }

      // Re-verify after repair
      const webhookInfoAfter = await TelegramBotApiService.getWebhookInfo(token);
      actualUrl = webhookInfoAfter.ok ? webhookInfoAfter.result?.url || null : null;
      result.actualTelegramWebhookUrl = actualUrl;
      result.webhookUrlMatch = getMatch(actualUrl);

      // Audit Log
      await TelegramOpsService.addAuditLog({
        command: "webhook_sync",
        result: result.webhookUrlMatch ? "success" : "failed",
        detail: `Source: ${options.source}. Match: ${result.webhookUrlMatch}. Desc: ${result.setWebhookDescription || "n/a"}`,
        source: "telegram-setup",
      });
    }

    // Phase 3: Final Status mapping
    let webhookStatus: TelegramWebhookSyncResult["webhookStatus"] = "ok";
    if (!actualUrl) {
      webhookStatus = "missing";
    } else if (!result.webhookUrlMatch) {
      webhookStatus = "mismatch";
    }

    let nextAction = "Webhook is synchronized.";
    if (webhookStatus === "missing") {
      nextAction = "Telegram has no webhook registered. Inbound tracking will not work. Click 'Repair' to register.";
    } else if (webhookStatus === "mismatch") {
      nextAction = "Telegram webhook URL differs from this deployment. Click 'Repair' to sync.";
    }

    return {
      ...result,
      ok: webhookStatus === "ok",
      webhookStatus,
      nextAction,
    } as TelegramWebhookSyncResult;

  }

  static async isWebhookInSync(request?: NextRequest): Promise<boolean> {
    const status = await this.getStatus(request);
    return status.webhookUrlMatch;
  }
}
