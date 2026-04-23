export type EventLog = {
  type: "USER" | "DEVICE" | "SYSTEM";
  action: string;
  status?: "OPEN" | "CLOSED";
  mode?: "AUTO" | "MANUAL";
  reason?: string;
  timestamp: number;
};

