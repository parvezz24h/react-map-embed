import type { MapEmbedErrorCode, MapEmbedErrorInfo } from "../types/index.js";

export class MapEmbedError extends Error implements MapEmbedErrorInfo {
  readonly code: MapEmbedErrorCode;

  constructor(code: MapEmbedErrorCode, message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "MapEmbedError";
    this.code = code;
  }
}

export function toErrorInfo(error: unknown): MapEmbedErrorInfo {
  if (error instanceof MapEmbedError) return { code: error.code, message: error.message };
  const message = error instanceof Error ? error.message : String(error);
  return { code: "MAP_LOAD_FAILED", message: `[react-map-embed] ${message}` };
}

const warned = new Set<string>();

/** Logs a console warning once per unique message. */
export function warnOnce(message: string): void {
  if (warned.has(message)) return;
  warned.add(message);
  console.warn(`[react-map-embed] ${message}`);
}
