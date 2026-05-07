import { create } from "zustand";

type NotificationState = {
  unreadCount: number;
  lastSeenAt: number;
  setUnreadCount: (count: number) => void;
  markRead: () => void;
};

export const useNotificationStore = create<NotificationState>((set) => ({
  unreadCount: 0,
  lastSeenAt: 0,
  setUnreadCount: (count) => set({ unreadCount: Math.max(0, count) }),
  markRead: () =>
    set({
      unreadCount: 0,
      lastSeenAt: Date.now(),
    }),
}));

