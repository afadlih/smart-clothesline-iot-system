import { TelegramOpsService } from "@/services/TelegramOpsService";

export class TelegramAuditService {
  static async log(input: {
    userId?: number;
    username?: string;
    command: string;
    result: "success" | "failed" | "blocked" | "pending";
    detail: string;
    source: "telegram-webhook" | "telegram-bridge";
  }): Promise<void> {
    await TelegramOpsService.addAuditLog(input);
  }
}

