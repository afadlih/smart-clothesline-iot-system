type LogScope =
  | "telegram"
  | "polling"
  | "mqtt"
  | "firestore"
  | "analytics"
  | "system";

type LogLevel = "debug" | "info" | "warn" | "error";

const isDev = process.env.NODE_ENV !== "production";
const debugEnabled = process.env.DEBUG_MODE === "true" || isDev;
const configuredLevel = (process.env.LOG_LEVEL ?? "info").toLowerCase() as LogLevel;
const levelOrder: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

function shouldLog(level: LogLevel): boolean {
  const threshold = levelOrder[configuredLevel] ?? levelOrder.info;
  return levelOrder[level] >= threshold;
}

function fmt(level: LogLevel, scope: LogScope, message: string): string {
  const ts = new Date().toISOString();
  return `${ts} [${level.toUpperCase()}][${scope.toUpperCase()}] ${message}`;
}

export const logger = {
  debug(scope: LogScope, message: string, meta?: unknown) {
    if (!debugEnabled || !shouldLog("debug")) return;
    console.debug(fmt("debug", scope, message), meta ?? "");
  },
  info(scope: LogScope, message: string, meta?: unknown) {
    if (!debugEnabled || !shouldLog("info")) return;
    console.info(fmt("info", scope, message), meta ?? "");
  },
  warn(scope: LogScope, message: string, meta?: unknown) {
    if (!shouldLog("warn")) return;
    console.warn(fmt("warn", scope, message), meta ?? "");
  },
  error(scope: LogScope, message: string, meta?: unknown) {
    if (!shouldLog("error")) return;
    console.error(fmt("error", scope, message), meta ?? "");
  },
};

