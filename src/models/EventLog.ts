export type EventLog = {
  type: "USER" | "DEVICE" | "SYSTEM";
  action: string;
  status?: "OPEN" | "CLOSED" | "RESTARTING";
  mode?: "AUTO" | "MANUAL";
  reason?: string;
  timestamp: number;
};

