import { logger } from "@/lib/logger";
import { TelegramCommandRouter } from "@/services/telegram/TelegramCommandRouter";

type TelegramApiResponse<T> = {
  ok: boolean;
  result?: T;
  description?: string;
};

type BotCommand = { command: string; description: string };
type PollingStatus = "stopped" | "running" | "retrying";
type TelegramUpdate = {
  update_id: number;
  message?: {
    text?: string;
    date: number;
    chat?: { id?: number; type?: "private" | "group" | "supergroup"; title?: string };
    from?: { id?: number; username?: string };
  };
};

type TelegramBotInfo = {
  id: number;
  first_name: string;
  username?: string;
  can_join_groups?: boolean;
};

type TelegramWebhookInfo = {
  url: string;
  has_custom_certificate?: boolean;
  pending_update_count?: number;
  last_error_date?: number;
  last_error_message?: string;
  last_synchronization_error_date?: number;
  max_connections?: number;
  ip_address?: string;
  allowed_updates?: string[];
};

function endpoint(token: string, method: string): string {
  return `https://api.telegram.org/bot${token}/${method}`;
}

export class TelegramBotApiService {
  private static polling = false;
  private static pollingStatus: PollingStatus = "stopped";
  private static offset = 0;
  private static processed = 0;
  private static startedAt: number | null = null;
  private static pollingStartedAtSec = 0;
  private static ignoredStaleUpdates = 0;
  private static lastIgnoredUpdateAt: number | null = null;
  private static lastUpdateAt: number | null = null;
  private static lastError: string | null = null;
  private static stopRequested = false;

  private static sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private static async safeRequest<T>(url: string, init: RequestInit): Promise<TelegramApiResponse<T>> {
    try {
      const response = await fetch(url, init);
      const data = (await response.json()) as TelegramApiResponse<T>;
      return data;
    } catch (error) {
      return {
        ok: false,
        description: String(error),
      };
    }
  }

  static async sendMessageWithResult(
    token: string,
    chatId: string | number,
    text: string,
  ): Promise<{ ok: boolean; description?: string }> {
    const data = await this.safeRequest<unknown>(endpoint(token, "sendMessage"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
      }),
    });
    return { ok: data.ok, description: data.description };
  }

  static async sendMessage(token: string, chatId: string | number, text: string): Promise<boolean> {
    const result = await this.sendMessageWithResult(token, chatId, text);
    return result.ok;
  }

  static async getMe(token: string): Promise<TelegramApiResponse<TelegramBotInfo>> {
    return this.safeRequest<TelegramBotInfo>(endpoint(token, "getMe"), {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });
  }

  static async getWebhookInfo(token: string): Promise<TelegramApiResponse<TelegramWebhookInfo>> {
    return this.safeRequest<TelegramWebhookInfo>(endpoint(token, "getWebhookInfo"), {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });
  }

  static async setWebhookWithResult(
    token: string,
    webhookUrl: string,
    options?: { secretToken?: string; dropPendingUpdates?: boolean },
  ): Promise<TelegramApiResponse<unknown>> {
    return this.safeRequest<unknown>(endpoint(token, "setWebhook"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: webhookUrl,
        secret_token: options?.secretToken || undefined,
        drop_pending_updates: options?.dropPendingUpdates ?? false,
        allowed_updates: ["message"],
      }),
    });
  }

  static async setWebhook(
    token: string,
    webhookUrl: string,
    options?: { secretToken?: string; dropPendingUpdates?: boolean },
  ): Promise<boolean> {
    const res = await this.setWebhookWithResult(token, webhookUrl, options);
    return res.ok;
  }

  static async deleteWebhookWithResult(token: string, options?: { dropPendingUpdates?: boolean }): Promise<TelegramApiResponse<unknown>> {
    return this.safeRequest<unknown>(endpoint(token, "deleteWebhook"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ drop_pending_updates: options?.dropPendingUpdates ?? false }),
    });
  }

  static async deleteWebhook(token: string, options?: { dropPendingUpdates?: boolean }): Promise<boolean> {
    const res = await this.deleteWebhookWithResult(token, options);
    return res.ok;
  }

  static async setMyCommands(token: string, commands: BotCommand[]): Promise<boolean> {
    const data = await this.safeRequest<unknown>(endpoint(token, "setMyCommands"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ commands }),
    });
    return data.ok;
  }

  static getPollingDiagnostics() {
    return {
      status: this.pollingStatus,
      isRunning: this.polling,
      offset: this.offset,
      lastUpdateAt: this.lastUpdateAt,
      updatesProcessed: this.processed,
      ignoredStaleUpdates: this.ignoredStaleUpdates,
      lastIgnoredUpdateAt: this.lastIgnoredUpdateAt,
      uptimeMs: this.startedAt ? Date.now() - this.startedAt : 0,
      lastError: this.lastError,
    };
  }

  static stopPolling() {
    this.stopRequested = true;
    this.pollingStatus = "stopped";
  }

  static async testTelegramConnection(input: {
    token: string;
    chatId?: string;
  }): Promise<{
    ok: boolean;
    tokenValid: boolean;
    apiReachable: boolean;
    canSendMessage: boolean;
    error?: string;
  }> {
    const me = await this.getMe(input.token);
    const tokenValid = me.ok;
    const apiReachable = me.ok || Boolean(me.description);
    let canSendMessage = false;

    if (tokenValid && input.chatId) {
      canSendMessage = await this.sendMessage(input.token, input.chatId, "Telegram connection test succeeded.");
    }

    return {
      ok: tokenValid && apiReachable,
      tokenValid,
      apiReachable,
      canSendMessage,
      error: me.ok ? undefined : me.description,
    };
  }

  private static async pollOnce(token: string, config: { ignoreBeforeStart: boolean; maxUpdates: number }): Promise<void> {
    const data = await this.safeRequest<TelegramUpdate[]>(endpoint(token, "getUpdates"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        timeout: 25,
        offset: this.offset,
        limit: config.maxUpdates,
        allowed_updates: ["message"],
      }),
    });

    if (!data.ok) {
      throw new Error(data.description ?? "Polling request failed");
    }

    const updates = Array.isArray(data.result) ? data.result : [];
    for (const update of updates) {
      this.offset = Math.max(this.offset, update.update_id + 1);
      const messageDate = update.message?.date ?? 0;
      if (config.ignoreBeforeStart && messageDate > 0 && messageDate < this.pollingStartedAtSec - 30) {
        this.ignoredStaleUpdates += 1;
        this.lastIgnoredUpdateAt = Date.now();
        logger.info("polling", "Ignored stale Telegram update", {
          updateId: update.update_id,
          messageDate,
          pollingStartedAtSec: this.pollingStartedAtSec,
        });
        continue;
      }

      this.lastUpdateAt = Date.now();
      this.processed += 1;
      logger.info("polling", "Update received", { updateId: update.update_id });

      const text = typeof update.message?.text === "string" ? update.message.text.trim() : undefined;
      const chatId = typeof update.message?.chat?.id === "number" ? update.message.chat.id : undefined;
      const chatType = update.message?.chat?.type;
      const chatTitle = update.message?.chat?.title;
      const userId = typeof update.message?.from?.id === "number" ? update.message.from.id : undefined;
      const username = typeof update.message?.from?.username === "string" ? update.message.from.username : undefined;

      if (!text || !chatId || !userId) continue;

      await TelegramCommandRouter.handle({ text, chatId, chatType, chatTitle, userId, username });
      logger.info("polling", "Reply sent", { command: text });
    }
  }

  static async startPolling(token: string, config: { ignoreBeforeStart: boolean; maxUpdates: number }): Promise<void> {
    if (this.polling) return;
    this.polling = true;
    this.stopRequested = false;
    this.pollingStatus = "running";
    this.startedAt = Date.now();
    this.pollingStartedAtSec = Math.floor(this.startedAt / 1000);
    this.ignoredStaleUpdates = 0;
    this.lastIgnoredUpdateAt = null;
    this.lastError = null;

    logger.info("telegram", "Service initialized");
    logger.info("polling", "Polling started", { config });

    while (!this.stopRequested) {
      try {
        await this.pollOnce(token, config);
        this.pollingStatus = "running";
      } catch (error) {
        this.pollingStatus = "retrying";
        this.lastError = String(error);
        logger.error("polling", "Polling error", error);
        await this.sleep(3000);
      }
    }

    this.polling = false;
    this.pollingStatus = "stopped";
  }
}
