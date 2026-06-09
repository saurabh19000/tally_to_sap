import { useLogs } from "../hooks/useLogs";

const LEVEL_STYLE = {
  info:    "text-slate-400",
  success: "text-green-400",
  warn:    "text-amber-400",
  error:   "text-red-400",
};

const LEVEL_TAG = {
  info:    "·",
  success: "✓",
  warn:    "⚠",
  error:   "✗",
};

export function LiveLogs() {
  const logs = useLogs(true, 2000);

  return (
    <div className="animate-fade-up space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-mono text-xs text-muted uppercase tracking-widest">Live Logs</h2>
        <span className="flex items-center gap-1.5 font-mono text-xs text-accent">
          <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
          LIVE
        </span>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="h-[420px] overflow-y-auto p-4 space-y-1 font-mono text-xs">
          {logs.length === 0 ? (
            <p className="text-muted text-center mt-16">No logs yet. Run a middleware check.</p>
          ) : (
            logs.map((log) => (
              <div key={log.id} className="flex gap-3 items-start hover:bg-dim/40 px-1 py-0.5 rounded transition-colors">
                <span className="text-muted flex-shrink-0 tabular-nums">
                  {new Date(log.ts).toLocaleTimeString("en-IN", { hour12: false })}
                </span>
                <span className={`flex-shrink-0 w-3 ${LEVEL_STYLE[log.level] || "text-slate-400"}`}>
                  {LEVEL_TAG[log.level] || "·"}
                </span>
                <span className={`flex-1 leading-relaxed break-all ${LEVEL_STYLE[log.level] || "text-slate-300"}`}>
                  {log.message}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}