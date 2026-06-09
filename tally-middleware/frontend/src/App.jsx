import { useState, useEffect } from "react";
import { useConnection } from "./hooks/useConnection";
import { tallyAPI } from "./api/tallyAPI";
import { MiddlewareCheck } from "./pages/MiddlewareCheck";
import { QuickFetch } from "./pages/QuickFetch";
import { LiveLogs } from "./pages/LiveLogs";
import { BtpPush } from "./pages/BtpPush";
import { StatusDot } from "./components/StatusDot";

const TABS = [
  { id: "check",  icon: "⬡", label: "Data Check"  },
  { id: "btp",    icon: "☁", label: "Push to BTP" },
  { id: "fetch",  icon: "⬢", label: "Quick Fetch" },
  { id: "logs",   icon: "⬣", label: "Live Logs"   },
];

export default function App() {
  const [tab, setTab] = useState("check");
  const conn = useConnection();
  const [companies, setCompanies] = useState([]);

  useEffect(() => {
    if (!conn.tallyConnected) return;
    tallyAPI.companies().then((r) => setCompanies(r.data || [])).catch(() => {});
  }, [conn.tallyConnected]);

  const tallyStatus   = conn.loading ? "pending" : !conn.backendOk ? "fail" : conn.tallyConnected ? "ok" : "fail";
  const backendStatus = conn.loading ? "pending" : conn.backendOk ? "ok" : "fail";
  const btpStatus     = conn.loading ? "pending" : conn.btpConnected ? "ok" : conn.btpConfigured ? "warn" : "fail";

  return (
    <div className="min-h-screen bg-ink grid-bg font-sans">
      <div className="fixed top-0 left-0 w-[600px] h-[400px] pointer-events-none"
        style={{ background: "radial-gradient(ellipse at 0% 0%, rgba(0,212,255,0.06) 0%, transparent 70%)" }} />

      <div className="relative max-w-xl mx-auto px-4 py-6 pb-16">

        {/* Header */}
        <header className="mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative w-9 h-9 flex-shrink-0">
                <div className="absolute inset-0 rounded-lg bg-accent/10 border border-accent/20" />
                <div className="absolute inset-0 flex items-center justify-center font-mono text-sm font-bold text-accent">TM</div>
              </div>
              <div>
                <h1 className="font-mono font-bold text-base text-slate-100 leading-none">
                  Tally<span className="text-accent">Middleware</span>
                </h1>
                <p className="font-mono text-[10px] text-muted mt-0.5 tracking-widest uppercase">
                  Tally → SAP BTP
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <ConnPill label="Backend" status={backendStatus} />
              <ConnPill label="Tally"   status={tallyStatus}   extra={conn.tallyConnected ? `${conn.tallyLatency}ms` : null} />
              <ConnPill label="BTP"     status={btpStatus} />
              <button onClick={conn.refresh}
                className="w-7 h-7 rounded-lg border border-border bg-dim hover:bg-card transition-colors flex items-center justify-center text-muted hover:text-slate-300">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M1 6a5 5 0 0 1 9-3M11 6a5 5 0 0 1-9 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  <path d="M10 3l.5-2M1.5 11l.5-2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </button>
            </div>
          </div>

          {!conn.loading && !conn.backendOk && (
            <div className="mt-4 bg-red-500/8 border border-red-500/25 rounded-xl px-4 py-3 font-mono text-xs text-red-400">
              <p className="font-semibold mb-1">⚠ Backend not reachable</p>
              <p className="text-red-400/70">Run: <code className="bg-red-500/15 px-1.5 py-0.5 rounded">cd backend && npm run dev</code></p>
            </div>
          )}
          {!conn.loading && conn.backendOk && !conn.tallyConnected && (
            <div className="mt-4 bg-amber-400/6 border border-amber-400/20 rounded-xl px-4 py-3 font-mono text-xs text-amber-400">
              <p className="font-semibold mb-1">⚠ TallyPrime not reachable on port 9000</p>
              <p className="text-amber-400/70">TallyPrime → F12 Configure → Enable XML/HTTP Server → Port 9000</p>
            </div>
          )}
          {!conn.loading && conn.backendOk && !conn.btpConnected && conn.btpConfigured && (
            <div className="mt-3 bg-purple-400/6 border border-purple-400/20 rounded-xl px-4 py-3 font-mono text-xs text-purple-400">
              <p className="font-semibold mb-1">⚠ SAP BTP token failed — check BTP credentials in .env</p>
              <p className="text-purple-400/70">Make sure BTP_CLIENT_ID, BTP_CLIENT_SECRET, BTP_TOKEN_URL are set</p>
            </div>
          )}
          {!conn.loading && conn.tallyConnected && companies.length > 0 && (
            <div className="mt-3 flex items-center gap-2 flex-wrap">
              {companies.map((c) => (
                <span key={c.guid || c.name} className="font-mono text-xs bg-accent/8 border border-accent/20 text-accent rounded-full px-2.5 py-0.5">
                  {c.name}
                </span>
              ))}
            </div>
          )}
        </header>

        {/* Tabs */}
        <div className="flex gap-1 bg-panel border border-border rounded-xl p-1 mb-5">
          {TABS.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg font-mono text-xs font-semibold transition-all duration-150
                ${tab === t.id ? "bg-accent/15 text-accent border border-accent/25" : "text-muted hover:text-slate-300 border border-transparent"}`}>
              <span className="text-sm leading-none">{t.icon}</span>
              <span className="tracking-wider uppercase hidden sm:inline">{t.label}</span>
            </button>
          ))}
        </div>

        {tab === "check" && <MiddlewareCheck companies={companies} />}
        {tab === "btp"   && <BtpPush companies={companies} btpConnected={conn.btpConnected} />}
        {tab === "fetch" && <QuickFetch companies={companies} />}
        {tab === "logs"  && <LiveLogs />}
      </div>
    </div>
  );
}

function ConnPill({ label, status, extra }) {
  const colors = {
    ok:      "text-green-400 bg-green-400/8 border-green-400/25",
    warn:    "text-amber-400 bg-amber-400/8 border-amber-400/25",
    fail:    "text-red-400   bg-red-400/8   border-red-400/25",
    pending: "text-muted     bg-dim         border-border",
  };
  return (
    <div className={`flex items-center gap-1.5 font-mono text-[10px] px-2 py-1 rounded-lg border ${colors[status] || colors.pending}`}>
      <StatusDot status={status} />
      <span className="tracking-wider uppercase">{label}</span>
      {extra && <span className="opacity-60">{extra}</span>}
    </div>
  );
}