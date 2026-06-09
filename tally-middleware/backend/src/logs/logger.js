const logs = [];
const MAX_LOGS = 1000;

function addLog(level, message, meta = {}) {
  const entry = {
    id: Date.now() + Math.random(),
    ts: new Date().toISOString(),
    level,
    message,
    meta,
  };
  logs.unshift(entry);
  if (logs.length > MAX_LOGS) logs.splice(MAX_LOGS);
  const tag = level === "error" ? "✗" : level === "warn" ? "⚠" : level === "success" ? "✓" : "·";
  console.log(`[${entry.ts.slice(11, 19)}] ${tag} ${message}`, Object.keys(meta).length ? meta : "");
  return entry;
}

export const logger = {
  info: (msg, meta) => addLog("info", msg, meta),
  warn: (msg, meta) => addLog("warn", msg, meta),
  error: (msg, meta) => addLog("error", msg, meta),
  success: (msg, meta) => addLog("success", msg, meta),
  getLogs: (limit = 200) => logs.slice(0, limit),
  clear: () => logs.splice(0),
};