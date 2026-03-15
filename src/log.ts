/**
 * Logger interface: you pass your logger (pino, winston, etc.); the library
 * formats reactive-specific messages and calls logger.log(message, meta).
 */
export interface ReactiveLogger {
  log(message: string, meta?: object): void;
}

export const PREFIX = "[reactive]";
