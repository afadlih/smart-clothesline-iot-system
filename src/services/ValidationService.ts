import { z } from "zod";

// ===== VALIDATION SCHEMAS =====

export const SensorPayloadSchema = z.object({
  temperature: z.number().min(-50).max(100, "Temperature out of range"),
  humidity: z.number().min(0).max(100, "Humidity must be 0-100%"),
  light: z.number().min(0).max(10000, "Light value out of range"),
  rain: z.boolean(),
  deviceId: z.string().optional(),
  timestamp: z.number().optional(),
});

export const DeviceConfigSchema = z.object({
  rainThreshold: z.number().min(0).max(10000, "Rain threshold out of range"),
  lightThreshold: z.number().min(0).max(10000, "Light threshold out of range"),
  autoCloseOnRain: z.boolean(),
  autoCloseOnDark: z.boolean(),
});

export const CommandSchema = z.enum(["OPEN", "CLOSE", "AUTO"]);

// ===== TYPES =====

export type SensorPayload = z.infer<typeof SensorPayloadSchema>;
export type DeviceConfig = z.infer<typeof DeviceConfigSchema>;
export type DeviceCommand = z.infer<typeof CommandSchema>;

export class ValidationError extends Error {
  constructor(public code: string, message: string, public details?: Record<string, unknown>) {
    super(message);
    this.name = "ValidationError";
  }
}

// ===== VALIDATOR CLASS =====

export class SensorValidator {
  static validate(data: unknown): SensorPayload {
    try {
      return SensorPayloadSchema.parse(data);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const details = error.issues.map((e) => ({
          field: e.path.join("."),
          message: e.message,
          code: e.code,
        }));

        throw new ValidationError(
          "INVALID_SENSOR_DATA",
          `Sensor data validation failed: ${error.issues.map((e) => e.message).join(", ")}`,
          { errors: details, raw: data },
        );
      }
      throw error;
    }
  }

  static validateConfig(data: unknown): DeviceConfig {
    try {
      return DeviceConfigSchema.parse(data);
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new ValidationError(
          "INVALID_CONFIG",
          `Config validation failed: ${error.issues.map((e) => e.message).join(", ")}`,
          { errors: error.issues },
        );
      }
      throw error;
    }
  }

  static validateCommand(data: unknown): DeviceCommand {
    try {
      return CommandSchema.parse(data);
    } catch {
      throw new ValidationError("INVALID_COMMAND", "Command must be OPEN, CLOSE, or AUTO");
    }
  }

  static logValidationError(error: ValidationError): void {
    console.warn("[VALIDATION]", {
      code: error.code,
      message: error.message,
      details: error.details,
      timestamp: new Date().toISOString(),
    });
  }
}
