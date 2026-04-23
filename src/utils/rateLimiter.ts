/**
 * RateLimiter
 * Prevents command spam and device overwhelm
 */

export class RateLimiter {
  private globalLastAttempt: number = 0;
  private commandLastAttempt: Map<string, number> = new Map();
  private readonly globalMinIntervalMs: number;
  private readonly commandMinIntervalMs: number;

  constructor(globalMinIntervalMs: number = 1000, commandMinIntervalMs: number = 5000) {
    this.globalMinIntervalMs = globalMinIntervalMs;
    this.commandMinIntervalMs = commandMinIntervalMs;
  }

  /**
   * Check if command can be sent
   * Returns { allowed: boolean, waitMs?: number }
   */
  canSend(commandId: string): { allowed: boolean; waitMs?: number } {
    const now = Date.now();

    // Check global rate limit (1 second between ANY command)
    const globalWait = now - this.globalLastAttempt;
    if (globalWait < this.globalMinIntervalMs) {
      const waitMs = Math.ceil(this.globalMinIntervalMs - globalWait);
      return { allowed: false, waitMs };
    }

    // Check command-specific rate limit (5 seconds between SAME command)
    const lastAttempt = this.commandLastAttempt.get(commandId) ?? 0;
    const commandWait = now - lastAttempt;
    if (commandWait < this.commandMinIntervalMs && lastAttempt > 0) {
      const waitMs = Math.ceil(this.commandMinIntervalMs - commandWait);
      return { allowed: false, waitMs };
    }

    return { allowed: true };
  }

  /**
   * Record that command was sent
   */
  recordSend(commandId: string): void {
    const now = Date.now();
    this.globalLastAttempt = now;
    this.commandLastAttempt.set(commandId, now);

    console.debug("[RateLimiter] Command sent:", {
      command: commandId,
      timestamp: new Date(now).toISOString(),
    });
  }

  /**
   * Reset all limits
   */
  reset(): void {
    this.globalLastAttempt = 0;
    this.commandLastAttempt.clear();
    console.debug("[RateLimiter] All limits reset");
  }

  /**
   * Reset specific command
   */
  resetCommand(commandId: string): void {
    this.commandLastAttempt.delete(commandId);
    console.debug("[RateLimiter] Reset command:", commandId);
  }

  /**
   * Get stats
   */
  getStats(): {
    globalLastAttemptAgo: number;
    commandLastAttempts: Record<string, number>;
  } {
    const now = Date.now();
    const stats: Record<string, number> = {};

    for (const [command, lastTime] of this.commandLastAttempt.entries()) {
      stats[command] = now - lastTime;
    }

    return {
      globalLastAttemptAgo: now - this.globalLastAttempt,
      commandLastAttempts: stats,
    };
  }
}

/**
 * Global rate limiter instance
 */
export const commandRateLimiter = new RateLimiter(1000, 5000);
