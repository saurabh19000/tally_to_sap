export function StatusDot({ status }) {
  // status: "ok" | "warn" | "fail" | "pending" | "running"
  const map = {
    ok:      "bg-green-400",
    warn:    "bg-amber-400",
    fail:    "bg-red-500",
    pending: "bg-muted",
    running: "bg-accent animate-ping",
  };
  const color = map[status] || "bg-muted";
  return (
    <span className="relative inline-flex items-center justify-center w-2.5 h-2.5 flex-shrink-0">
      {status === "running" && (
        <span className="absolute inline-flex w-full h-full rounded-full bg-accent opacity-40 animate-ping" />
      )}
      <span className={`relative inline-flex rounded-full w-2.5 h-2.5 ${color}`} />
    </span>
  );
}