export type SystemEventType = "SENSOR" | "STATUS" | "COMMAND" | "CONFIG" | "ALERT";

export type SystemEvent = {
  id: string;
  type: SystemEventType;
  title: string;
  description: string;
  timestamp: number;
};

export type EventToast = {
  id: string;
  title: string;
  description: string;
  timestamp: number;
  expiresAt: number;
};
