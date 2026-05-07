import { useEffect, useState } from "react";
import type { EventToast, SystemEvent } from "@/models/SystemEvent";
import { useNotificationStore } from "@/stores/notificationStore";

const STORAGE_KEY = "smart-clothesline-events-v1";
const MAX_EVENTS = 100;
const MAX_EVENT_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const ALERT_DEBOUNCE_MS = 10_000;
const TOAST_DURATION_MS = 5_000;

type EngineState = {
  events: SystemEvent[];
  toasts: EventToast[];
  lastAlertAtByKey: Record<string, number>;
  hydrated: boolean;
};

const sharedState: EngineState = {
  events: [],
  toasts: [],
  lastAlertAtByKey: {},
  hydrated: false,
};

const listeners = new Set<(state: EngineState) => void>();

function cloneState(): EngineState {
  return {
    events: [...sharedState.events],
    toasts: [...sharedState.toasts],
    lastAlertAtByKey: { ...sharedState.lastAlertAtByKey },
    hydrated: sharedState.hydrated,
  };
}

function notify(): void {
  const snapshot = cloneState();
  for (const listener of listeners) {
    listener(snapshot);
  }
}

function persist(): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(sharedState.events));
}

function pruneOldEvents(): void {
  const threshold = Date.now() - MAX_EVENT_AGE_MS;
  sharedState.events = sharedState.events
    .filter((event) => event.timestamp >= threshold)
    .slice(0, MAX_EVENTS);
}

function hydrate(): void {
  if (sharedState.hydrated || typeof window === "undefined") {
    return;
  }

  sharedState.hydrated = true;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return;
    }

    const parsed = JSON.parse(raw) as Partial<SystemEvent>[];
    if (!Array.isArray(parsed)) {
      return;
    }

    sharedState.events = parsed
      .filter(
        (event) =>
          event &&
          typeof event.id === "string" &&
          typeof event.type === "string" &&
          typeof event.title === "string" &&
          typeof event.description === "string" &&
          typeof event.timestamp === "number",
      )
      .slice(0, MAX_EVENTS) as SystemEvent[];
  } catch {
    window.localStorage.removeItem(STORAGE_KEY);
  }
}

export function pushSystemEvent(
  event: Omit<SystemEvent, "id">,
  options?: { alertKey?: string },
): void {
  hydrate();
  const now = Date.now();
  const alertKey = options?.alertKey ?? `${event.type}:${event.title}`;

  if (event.type === "ALERT") {
    const lastAlertAt = sharedState.lastAlertAtByKey[alertKey] ?? 0;
    if (now - lastAlertAt < ALERT_DEBOUNCE_MS) {
      return;
    }
    sharedState.lastAlertAtByKey[alertKey] = now;
  }

  const nextEvent: SystemEvent = {
    ...event,
    id: `${event.type}-${event.timestamp}-${Math.random().toString(36).slice(2, 8)}`,
  };
  sharedState.events = [nextEvent, ...sharedState.events].slice(0, MAX_EVENTS);
  pruneOldEvents();

  if (nextEvent.type === "ALERT") {
    sharedState.toasts = [
      {
        id: nextEvent.id,
        title: nextEvent.title,
        description: nextEvent.description,
        timestamp: nextEvent.timestamp,
        expiresAt: now + TOAST_DURATION_MS,
      },
      ...sharedState.toasts,
    ].slice(0, 5);
  }

  persist();
  notify();
}

export function useNotificationEngine() {
  const unreadCount = useNotificationStore((state) => state.unreadCount);
  const lastSeenAt = useNotificationStore((state) => state.lastSeenAt);
  const setUnreadCount = useNotificationStore((state) => state.setUnreadCount);
  const markRead = useNotificationStore((state) => state.markRead);
  const [state, setState] = useState<EngineState>(() => {
    hydrate();
    return cloneState();
  });

  useEffect(() => {
    const listener = (nextState: EngineState) => {
      setState(nextState);
    };
    listeners.add(listener);
    listener(cloneState());

    return () => {
      listeners.delete(listener);
    };
  }, []);

  useEffect(() => {
    const nextUnread = state.events.filter((event) => event.timestamp > lastSeenAt).length;
    setUnreadCount(nextUnread);
  }, [lastSeenAt, setUnreadCount, state.events]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      const now = Date.now();
      const nextToasts = sharedState.toasts.filter((toast) => toast.expiresAt > now);
      const beforeLen = sharedState.events.length;
      pruneOldEvents();
      if (nextToasts.length !== sharedState.toasts.length) {
        sharedState.toasts = nextToasts;
        notify();
      } else if (beforeLen !== sharedState.events.length) {
        persist();
        notify();
      }
    }, 500);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  const dismissToast = (id: string) => {
    sharedState.toasts = sharedState.toasts.filter((toast) => toast.id !== id);
    notify();
  };

  return {
    events: state.events,
    alerts: state.events.filter((event) => event.type === "ALERT"),
    latestAlert: state.events.find((event) => event.type === "ALERT") ?? null,
    toasts: state.toasts,
    unreadCount,
    markAllRead: markRead,
    dismissToast,
  };
}
