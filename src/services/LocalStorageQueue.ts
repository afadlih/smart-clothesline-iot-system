/**
 * LocalStorageQueue
 * Persists data to localStorage when primary services are unavailable.
 * Automatically syncs when services are back online.
 */

export type QueueItem<T> = {
  id: string;
  data: T;
  timestamp: number;
  retryCount: number;
  lastRetryAt: number | null;
};

export class LocalStorageQueue<T> {
  private readonly key: string;
  private readonly maxItems: number;
  private readonly maxRetries: number;
  private syncing = false;

  constructor(queueName: string, maxItems: number = 100, maxRetries: number = 5) {
    this.key = `smart-clothesline-queue-${queueName}`;
    this.maxItems = maxItems;
    this.maxRetries = maxRetries;
  }

  /**
   * Add item to queue
   */
  add(data: T): string {
    try {
      const items = this.getAll();

      // Check if full
      if (items.length >= this.maxItems) {
        console.warn(`[Queue] ${this.key} is full (${this.maxItems} items), dropping oldest`);
        items.pop(); // Remove oldest
      }

      const id = this.generateId();
      const item: QueueItem<T> = {
        id,
        data,
        timestamp: Date.now(),
        retryCount: 0,
        lastRetryAt: null,
      };

      const updated = [item, ...items];
      localStorage.setItem(this.key, JSON.stringify(updated));

      console.info(`[Queue] Added to ${this.key}:`, { id, itemCount: updated.length });
      return id;
    } catch (error) {
      console.error(`[Queue] Failed to add item to ${this.key}:`, error);
      throw error;
    }
  }

  /**
   * Get all queued items
   */
  getAll(): QueueItem<T>[] {
    try {
      const raw = localStorage.getItem(this.key);
      if (!raw) return [];
      return JSON.parse(raw) as QueueItem<T>[];
    } catch (error) {
      console.error(`[Queue] Failed to read ${this.key}:`, error);
      return [];
    }
  }

  /**
   * Get items ready to retry (respecting backoff)
   */
  getReadyToRetry(backoffMs: number = 5000): QueueItem<T>[] {
    const now = Date.now();
    return this.getAll().filter((item) => {
      if (item.retryCount >= this.maxRetries) {
        return false; // Max retries exceeded
      }

      if (item.lastRetryAt === null) {
        return true; // Never retried
      }

      // Exponential backoff: 5s, 10s, 20s, 40s, 80s
      const delay = backoffMs * Math.pow(2, item.retryCount - 1);
      return now - item.lastRetryAt >= delay;
    });
  }

  /**
   * Mark item as retried
   */
  markRetried(id: string): void {
    try {
      const items = this.getAll();
      const item = items.find((i) => i.id === id);
      if (item) {
        item.retryCount += 1;
        item.lastRetryAt = Date.now();
        localStorage.setItem(this.key, JSON.stringify(items));
      }
    } catch (error) {
      console.error(`[Queue] Failed to mark retry for ${id}:`, error);
    }
  }

  /**
   * Remove item from queue (success case)
   */
  remove(id: string): void {
    try {
      const items = this.getAll().filter((i) => i.id !== id);
      localStorage.setItem(this.key, JSON.stringify(items));
      console.info(`[Queue] Removed from ${this.key}:`, { id, remaining: items.length });
    } catch (error) {
      console.error(`[Queue] Failed to remove from ${this.key}:`, error);
    }
  }

  /**
   * Clear entire queue
   */
  clear(): void {
    try {
      localStorage.removeItem(this.key);
      console.info(`[Queue] Cleared ${this.key}`);
    } catch (error) {
      console.error(`[Queue] Failed to clear ${this.key}:`, error);
    }
  }

  /**
   * Get queue stats
   */
  getStats(): {
    total: number;
    readyToSync: number;
    failed: number;
    oldestItemAge: number | null;
  } {
    const items = this.getAll();
    const now = Date.now();

    return {
      total: items.length,
      readyToSync: this.getReadyToRetry().length,
      failed: items.filter((i) => i.retryCount >= this.maxRetries).length,
      oldestItemAge: items.length > 0 ? now - items[items.length - 1].timestamp : null,
    };
  }

  /**
   * Get syncing status
   */
  isSyncing(): boolean {
    return this.syncing;
  }

  /**
   * Attempt to sync queue with callback
   * Returns count of successful syncs
   */
  async syncWith(
    handler: (item: QueueItem<T>) => Promise<void>,
  ): Promise<{ synced: number; failed: number }> {
    if (this.syncing) {
      console.warn(`[Queue] Sync already in progress for ${this.key}`);
      return { synced: 0, failed: 0 };
    }

    this.syncing = true;
    let synced = 0;
    let failed = 0;

    try {
      const readyItems = this.getReadyToRetry();

      for (const item of readyItems) {
        try {
          await handler(item);
          this.remove(item.id);
          synced++;
        } catch (error) {
          this.markRetried(item.id);
          console.error(`[Queue] Sync failed for ${item.id}:`, error);
          failed++;
        }
      }

      if (synced > 0 || failed > 0) {
        console.info(`[Queue] Sync complete:`, {
          queue: this.key,
          synced,
          failed,
          stats: this.getStats(),
        });
      }
    } finally {
      this.syncing = false;
    }

    return { synced, failed };
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }
}
