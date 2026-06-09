import { useState, useRef, useEffect } from "react";
import { tallyAPI } from "../api/tallyAPI";
import { CheckRow } from "../components/CheckRow";
import { DataTable } from "../components/DataTable";
import { StatusDot } from "../components/StatusDot";

const TODAY = new Date().toISOString().slice(0, 10);
const YEAR_START = `${new Date().getFullYear()}-04-01`;

export function MiddlewareCheck({ companies }) {
  const [company, setCompany] = useState(companies?.[0]?.name || "");
  const [fromDate, setFromDate] = useState(YEAR_START);
  const [toDate, setToDate] = useState(TODAY);
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState(null);
  const [rawResponse, setRawResponse] = useState(null);
  const [error, setError] = useState(null);
  const [showRaw, setShowRaw] = useState(false);
  const resultsRef = useRef(null);

  // Auto-scroll to results when they arrive
  useEffect(() => {
    if (report && resultsRef.current) {
      setTimeout(() => {
        resultsRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    }
  }, [report]);

  // Update company when companies list loads
  useEffect(() => {
    if (companies?.length > 0 && !company) {
      setCompany(companies[0].name);
    }
  }, [companies]);

  async function runCheck() {
    if (!company.trim()) { setError("Enter a company name"); return; }
    setLoading(true);
    setReport(null);
    setRawResponse(null);
    setError(null);
    setShowRaw(false);
    try {
      const res = await tallyAPI.middlewareCheck(company, fromDate, toDate);
      setRawResponse(res); // always save raw response for debug
      if (res.ok && res.report) {
        setReport(res.report);
      } else {
        setError(res.error || "Check returned no report. See raw response below.");
        setShowRaw(true);
      }
    } catch (e) {
      setError(`Network/fetch error: ${e.message}`);
      setRawResponse({ fetchError: e.message });
      setShowRaw(true);
    } finally {
      setLoading(false);
    }
  }

  // Treat "failed" as warning if we have data — only truly fail on connection errors
  const effectiveStatus = report
    ? (report.checks?.ping?.status === "fail" || report.checks?.companies?.status === "fail")
      ? "fail"
      : report.checks?.ledgers?.count > 0
        ? "ok"
        : report.status === "ok" ? "ok" : report.status === "warning" ? "warn" : "fail"
    : null;

  const overallStatus = effectiveStatus;

  return (
    <div className="space-y-5 animate-fade-up">
      {/* Config Panel */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <h2 className="font-mono text-xs text-muted uppercase tracking-widest">Check Configuration</h2>

        <div className="space-y-3">
          <div>
            <label className="block font-mono text-xs text-muted mb-1.5">TALLY COMPANY</label>
            {companies && companies.length > 0 ? (
              <select
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                className="w-full bg-dim border border-border rounded-lg px-3 py-2.5 font-mono text-sm text-slate-200 focus:outline-none focus:border-accent/60 transition-colors"
              >
                <option value="">— select company —</option>
                {companies.map((c) => (
                  <option key={c.guid || c.name} value={c.name}>{c.name}</option>
                ))}
              </select>
            ) : (
              <input
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="e.g. ABC Private Limited"
                className="w-full bg-dim border border-border rounded-lg px-3 py-2.5 font-mono text-sm text-slate-200 placeholder-muted focus:outline-none focus:border-accent/60 transition-colors"
              />
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-mono text-xs text-muted mb-1.5">FROM DATE</label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-full bg-dim border border-border rounded-lg px-3 py-2.5 font-mono text-sm text-slate-200 focus:outline-none focus:border-accent/60 transition-colors"
              />
            </div>
            <div>
              <label className="block font-mono text-xs text-muted mb-1.5">TO DATE</label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-full bg-dim border border-border rounded-lg px-3 py-2.5 font-mono text-sm text-slate-200 focus:outline-none focus:border-accent/60 transition-colors"
              />
            </div>
          </div>
        </div>

        <button
          onClick={runCheck}
          disabled={loading}
          className={`w-full py-3 rounded-xl font-mono font-semibold text-sm tracking-wider transition-all duration-200
            ${loading
              ? "bg-accent/20 text-accent/50 cursor-not-allowed border border-accent/20"
              : "bg-accent text-ink hover:bg-accent/90 glow-accent border border-accent/50"
            }`}
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
              FETCHING DATA FROM TALLY…
            </span>
          ) : (
            "▶  RUN MIDDLEWARE CHECK"
          )}
        </button>

        {error && (
          <p className="font-mono text-xs text-red-400 bg-red-400/8 border border-red-400/20 rounded-lg px-3 py-2 whitespace-pre-wrap">
            ✗ {error}
          </p>
        )}
      </div>

      {/* ── RESULTS ── */}
      {(report || rawResponse) && (
        <div ref={resultsRef} className="space-y-4">

          {/* Raw response toggle — always visible after a run */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <button
              onClick={() => setShowRaw((s) => !s)}
              className="w-full flex items-center justify-between px-5 py-3 hover:bg-dim/60 transition-colors"
            >
              <span className="font-mono text-xs text-muted uppercase tracking-widest">
                {showRaw ? "▼" : "▶"} Raw API Response
              </span>
              <span className="font-mono text-xs text-accent">
                {showRaw ? "Hide" : "Show"}
              </span>
            </button>
            {showRaw && (
              <div className="border-t border-border">
                <pre className="p-4 text-xs font-mono text-green-400 bg-ink overflow-auto max-h-64 leading-relaxed">
                  {JSON.stringify(rawResponse, null, 2)}
                </pre>
              </div>
            )}
          </div>

          {report && (
            <>
              {/* Overall status banner */}
              <div className={`rounded-xl border p-4 flex items-center gap-4
                ${overallStatus === "ok"   ? "border-green-400/30 bg-green-400/5"
                : overallStatus === "warn" ? "border-amber-400/30 bg-amber-400/5"
                : "border-red-500/30 bg-red-500/5"}`}>
                <StatusDot status={overallStatus} />
                <div className="flex-1">
                  <p className="font-mono font-bold text-sm">
                    {overallStatus === "ok"
                      ? "✓ Data fetched — ready to sync"
                      : overallStatus === "warn"
                      ? "⚠ Fetched with warnings — check details below"
                      : "✗ Critical check failed — see errors below"}
                  </p>
                  {report.summary && (
                    <p className="font-mono text-xs text-muted mt-1">
                      {report.summary.companies} {report.summary.companies === 1 ? "company" : "companies"}
                      {" · "}{report.summary.ledgers.toLocaleString()} ledgers
                      {" · "}{report.summary.vouchers.toLocaleString()} vouchers
                      {" · "}{report.summary.stockItems} stock items
                    </p>
                  )}
                </div>
                {overallStatus !== "fail" && (
                  <span className="font-mono text-xs bg-green-400/15 border border-green-400/30 text-green-400 px-3 py-1 rounded-full font-semibold flex-shrink-0">
                    SYNC READY
                  </span>
                )}
              </div>

              {/* Individual check rows */}
              <div className="bg-card border border-border rounded-xl overflow-hidden">
                <div className="px-5 py-3 bg-dim flex items-center justify-between">
                  <h3 className="font-mono text-xs text-muted uppercase tracking-widest">Check Results</h3>
                  <span className="font-mono text-xs text-muted">
                    {report.finishedAt
                      ? `${new Date(report.startedAt).toLocaleTimeString("en-IN")} → ${new Date(report.finishedAt).toLocaleTimeString("en-IN")}`
                      : ""}
                  </span>
                </div>
                <div className="px-5">
                  <CheckRow icon="🔌" label="Connection (port 9000)" check={report.checks?.ping} />
                  <CheckRow icon="🏢" label="Companies" check={report.checks?.companies} />
                  <CheckRow icon="📒" label="Ledgers / Accounts" check={report.checks?.ledgers}>
                    <DataTable
                      rows={report.checks?.ledgers?.sample}
                      columns={[
                        { key: "name",           label: "Name" },
                        { key: "parentGroup",    label: "Group" },
                        { key: "type",           label: "Type" },
                        { key: "closingBalance", label: "Closing Bal",
                          render: (v) => v ? `₹${Number(v).toLocaleString("en-IN")}` : "—" },
                        { key: "gstin",          label: "GSTIN" },
                      ]}
                    />
                  </CheckRow>
                  <CheckRow icon="🧾" label="Vouchers / Transactions" check={report.checks?.vouchers}>
                    {report.checks?.vouchers?.count === 0 && (
                      <p className="ml-9 font-mono text-xs text-amber-400/70 mt-1">
                        ⚠ No vouchers in this date range. Try a wider range (e.g. full financial year).
                      </p>
                    )}
                    <DataTable
                      rows={report.checks?.vouchers?.sample}
                      columns={[
                        { key: "voucherDate",   label: "Date" },
                        { key: "voucherType",   label: "Type" },
                        { key: "voucherNumber", label: "No." },
                        { key: "partyName",     label: "Party" },
                        { key: "netAmount",     label: "Amount",
                          render: (v) => v ? `₹${Number(v).toLocaleString("en-IN")}` : "—" },
                      ]}
                    />
                  </CheckRow>
                  <CheckRow icon="📦" label="Stock Items" check={report.checks?.stockItems}>
                    <DataTable
                      rows={report.checks?.stockItems?.sample}
                      columns={[
                        { key: "name",         label: "Item" },
                        { key: "group",        label: "Group" },
                        { key: "baseUnit",     label: "Unit" },
                        { key: "closingQty",   label: "Qty" },
                        { key: "closingValue", label: "Value",
                          render: (v) => v ? `₹${Number(v).toLocaleString("en-IN")}` : "—" },
                      ]}
                    />
                  </CheckRow>
                </div>
              </div>

              {/* Errors list */}
              {report.errors && report.errors.length > 0 && (
                <div className="bg-red-500/5 border border-red-500/20 rounded-xl px-5 py-4 space-y-1.5">
                  <p className="font-mono text-xs text-muted uppercase tracking-widest mb-2">Issues</p>
                  {report.errors.map((e, i) => (
                    <p key={i} className="font-mono text-xs text-red-400">✗ {e}</p>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}