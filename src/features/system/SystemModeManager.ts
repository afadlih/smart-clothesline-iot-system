export type SystemMode = "AUTO" | "MANUAL" | "SCHEDULE";

export type SystemState = {
  mode: SystemMode;
  lastCommand: "OPEN" | "CLOSE" | null;
};

class SystemModeManager {
  private state: SystemState;

  constructor() {
    this.state = {
      mode: "AUTO",
      lastCommand: null,
    };
  }

  getMode(): SystemMode {
    return this.state.mode;
  }

  setMode(mode: SystemMode): void {
    this.state = {
      ...this.state,
      mode,
    };
  }

  setLastCommand(cmd: "OPEN" | "CLOSE"): void {
    this.state = {
      ...this.state,
      lastCommand: cmd,
    };
  }

  getState(): SystemState {
    return { ...this.state };
  }
}

export const systemModeManager = new SystemModeManager();

