import "server-only";

import type { XLogEntry } from "@/src/features/x-client/types";

declare global {
  var __xOperatorLogs: XLogEntry[] | undefined;
}

export function emitXLog(entry: XLogEntry) {
  const bucket = globalThis.__xOperatorLogs || [];
  bucket.push(entry);
  globalThis.__xOperatorLogs = bucket.slice(-200);
}

export function getRecentXLogs() {
  return globalThis.__xOperatorLogs || [];
}
