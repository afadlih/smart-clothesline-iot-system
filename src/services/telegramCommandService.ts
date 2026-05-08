import { TelegramCommandRouter, type TelegramInboundContext } from "@/services/telegram/TelegramCommandRouter";

export type TelegramInboundMessage = TelegramInboundContext;

export type TelegramCommandResult = {
  ok: boolean;
  blocked?: boolean;
  queued?: boolean;
  /** Command was accepted and queued for bridge execution */
  accepted?: boolean;
  /** Command was dispatched directly (future: HTTP MQTT) */
  dispatched?: boolean;
  /** Command is delayed — device/MQTT not ready */
  delayed?: boolean;
  /** Command failed to enqueue or execute */
  failed?: boolean;
  /** Reference ID for tracking (Firestore command doc ID) */
  commandId?: string;
  detail: string;
};

export async function processTelegramCommand(message: TelegramInboundMessage): Promise<TelegramCommandResult> {
  return TelegramCommandRouter.handle(message);
}
