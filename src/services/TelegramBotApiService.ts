import { logger } from "@/lib/logger";

type TelegramApiResponse<T> = {
  ok: boolean;
  result?: T;
  description?: string;
};

type BotCommand = { command: string; description: string };

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
  max_connections?: number;
  ip_address?: string;
};

function endpoint(token: string, method: string): string {
  return `https://api.telegram.org/bot${token}/${method}`;
}

export class TelegramBotApiService {
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

  static async deleteWebhookWithResult(
    token: string,
    options?: { dropPendingUpdates?: boolean },
  ): Promise<TelegramApiResponse<unknown>> {
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
}

