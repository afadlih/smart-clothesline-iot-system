type LogScope =
  | "telegram"
  | "polling"
  | "mqtt"
  | "firestore"
  | "analytics"
  | "system";

const isDev = process.env.NODE_ENV !== "production";
const debugEnabled = process.env.DEBUG_MODE === "true" || isDev;

function fmt(scope: LogScope, message: string): string {
  return `[${scope.toUpperCase()}] ${message}`;
}

export const logger = {
  info(scope: LogScope, message: string, meta?: unknown) {
    if (!debugEnabled) return;
    console.info(fmt(scope, message), meta ?? "");
  },
  warn(scope: LogScope, message: string, meta?: unknown) {
    console.warn(fmt(scope, message), meta ?? "");
  },
  error(scope: LogScope, message: string, meta?: unknown) {
    console.error(fmt(scope, message), meta ?? "");
  },
};

