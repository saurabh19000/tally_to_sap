import { StatusDot } from "./StatusDot";

const STATUS_LABEL = { ok: "PASS", warn: "WARN", fail: "FAIL", pending: "...", running: "RUNNING" };
const STATUS_COLOR = {
  ok:      "text-green-400 bg-green-400/10 border-green-400/20",
  warn:    "text-amber-400 bg-amber-400/10 border-amber-400/20",
  fail:    "text-red-400  bg-red-400/10  border-red-400/20",
  pending: "text-muted    bg-muted/10    border-muted/20",
  running: "text-accent   bg-accent/10   border-accent/20",
};

export function CheckRow({ icon, label, check, children }) {
  const status = check?.status ?? "pending";
  return (
    <div className="flex flex-col gap-2 py-3 border-b border-border last:border-0">
      <div className="flex items-center gap-3">
        <span className="text-base w-6 text-center flex-shrink-0">{icon}</span>
        <span className="font-mono text-sm text-slate-300 flex-1">{label}</span>
        <span className={`font-mono text-xs px-2 py-0.5 rounded border font-semibold tracking-wider ${STATUS_COLOR[status]}`}>
          {STATUS_LABEL[status] || status.toUpperCase()}
        </span>
        <StatusDot status={status} />
      </div>

      {/* Count pill */}
      {check?.count !== undefined && (
        <div className="ml-9 flex flex-wrap gap-2">
          <Pill label="Total" value={check.count} color="accent" />
          {check.partyCount !== undefined && <Pill label="Party" value={check.partyCount} color="green" />}
          {check.withGstin !== undefined && <Pill label="GST" value={check.withGstin} color="amber" />}
          {check.withEmail !== undefined && <Pill label="Email" value={check.withEmail} color="accent" />}
          {check.totalAmount !== undefined && (
            <Pill label="Amount" value={"₹" + check.totalAmount.toLocaleString("en-IN", { maximumFractionDigits: 0 })} color="green" />
          )}
          {check.latencyMs !== undefined && <Pill label="Ping" value={`${check.latencyMs}ms`} color="accent" />}
        </div>
      )}

      {/* Type breakdown for vouchers */}
      {check?.byType && Object.keys(check.byType).length > 0 && (
        <div className="ml-9 flex flex-wrap gap-1.5">
          {Object.entries(check.byType).map(([type, count]) => (
            <span key={type} className="font-mono text-xs bg-dim border border-border rounded px-2 py-0.5 text-slate-400">
              {type}: <span className="text-slate-200">{count}</span>
            </span>
          ))}
        </div>
      )}

      {/* Company list */}
      {check?.data && check.data.length > 0 && check.data[0]?.name && (
        <div className="ml-9 flex flex-wrap gap-1.5">
          {check.data.map((c) => (
            <span key={c.guid || c.name} className="font-mono text-xs bg-dim border border-border rounded px-2 py-0.5 text-accent">
              {c.name}
            </span>
          ))}
        </div>
      )}

      {/* Error */}
      {check?.error && (
        <p className="ml-9 font-mono text-xs text-red-400 bg-red-400/5 border border-red-400/20 rounded px-3 py-2 leading-relaxed">
          {check.error}
        </p>
      )}

      {children}
    </div>
  );
}

function Pill({ label, value, color }) {
  const colors = {
    accent: "text-accent border-accent/20",
    green:  "text-green-400 border-green-400/20",
    amber:  "text-amber-400 border-amber-400/20",
  };
  return (
    <span className={`font-mono text-xs border rounded px-2 py-0.5 bg-dim ${colors[color] || colors.accent}`}>
      {label}: <span className="font-semibold">{value}</span>
    </span>
  );
}