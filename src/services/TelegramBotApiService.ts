import { logger } from "@/lib/logger";
import { processTelegramCommand } from "@/services/telegramCommandService";

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
    chat?: { id?: number };
    from?: { id?: number; username?: string };
  };
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

  static async sendMessage(token: string, chatId: string | number, text: string): Promise<boolean> {
    const data = await this.safeRequest<unknown>(endpoint(token, "sendMessage"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
      }),
    });
    return data.ok;
  }

  static async getMe(token: string): Promise<{ ok: boolean; description?: string }> {
    const data = await this.safeRequest<unknown>(endpoint(token, "getMe"), {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });
    return { ok: data.ok, description: data.description };
  }

  static async setWebhook(token: string, webhookUrl: string, secret: string): Promise<boolean> {
    const data = await this.safeRequest<unknown>(endpoint(token, "setWebhook"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: webhookUrl,
        secret_token: secret,
      }),
    });
    return data.ok;
  }

  static async deleteWebhook(token: string): Promise<boolean> {
    const data = await this.safeRequest<unknown>(endpoint(token, "deleteWebhook"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ drop_pending_updates: false }),
    });
    return data.ok;
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

  private static async pollOnce(token: string): Promise<void> {
    const data = await this.safeRequest<TelegramUpdate[]>(endpoint(token, "getUpdates"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        timeout: 25,
        offset: this.offset,
        allowed_updates: ["message"],
      }),
    });

    if (!data.ok) {
      throw new Error(data.description ?? "Polling request failed");
    }

    const updates = Array.isArray(data.result) ? data.result : [];
    for (const update of updates) {
      this.offset = Math.max(this.offset, update.update_id + 1);
      this.lastUpdateAt = Date.now();
      this.processed += 1;
      logger.info("polling", "Update received", { updateId: update.update_id });

      const text = typeof update.message?.text === "string" ? update.message.text : undefined;
      const chatId = typeof update.message?.chat?.id === "number" ? update.message.chat.id : undefined;
      const userId = typeof update.message?.from?.id === "number" ? update.message.from.id : undefined;
      const username = typeof update.message?.from?.username === "string" ? update.message.from.username : undefined;

      if (!text || !chatId || !userId) {
        continue;
      }

      await processTelegramCommand({
        text,
        chatId,
        userId,
        username,
      });
      logger.info("polling", "Reply sent", { command: text });
    }
  }

  static async startPolling(token: string): Promise<void> {
    if (this.polling) return;
    this.polling = true;
    this.stopRequested = false;
    this.pollingStatus = "running";
    this.startedAt = Date.now();
    this.lastError = null;

    logger.info("telegram", "Service initialized");
    logger.info("polling", "Polling started");

    while (!this.stopRequested) {
      try {
        await this.pollOnce(token);
        this.pollingStatus = "running";
      } catch (error) {
        this.lastError = String(error);
        this.pollingStatus = "retrying";
        logger.error("polling", "Polling crash", error);
        logger.warn("polling", "Retrying polling in 3s");
        await this.sleep(3000);
      }
    }

    this.polling = false;
    this.pollingStatus = "stopped";
  }
}
