export type LogLevel = "info" | "warn" | "error";

const logMethods: Record<LogLevel, (message: string) => void> = {
  info: (message) => console.info(message),
  warn: (message) => console.warn(message),
  error: (message) => console.error(message),
};

export function log(level: LogLevel, message: string): void {
  queueMicrotask(() => logMethods[level](`[Clinic] ${message}`));
}