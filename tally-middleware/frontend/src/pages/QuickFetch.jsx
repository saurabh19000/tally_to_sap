import { useState } from "react";
import { tallyAPI } from "../api/tallyAPI";
import { DataTable } from "../components/DataTable";

const TODAY = new Date().toISOString().slice(0, 10);
const YEAR_START = `${new Date().getFullYear()}-04-01`;

function JsonViewer({ data, depth = 0 }) {
  const [collapsed, setCollapsed] = useState(depth > 1);

  if (data === null || data === undefined) {
    return <span className="text-muted">null</span>;
  }
  if (typeof data === "boolean") {
    return <span className={data ? "text-green-400" : "text-red-400"}>{String(data)}</span>;
  }
  if (typeof data === "number") {
    return <span className="text-amber-300">{data.toLocaleString()}</span>;
  }
  if (typeof data === "string") {
    return <span className="text-sky-300">"{data}"</span>;
  }
  if (Array.isArray(data)) {
    if (data.length === 0) return <span className="text-muted">[]</span>;
    return (
      <span>
        <button onClick={() => setCollapsed(!collapsed)}
          className="text-purple-400 hover:text-purple-300 font-mono text-xs">
          {collapsed ? `▶ [ ${data.length} items ]` : "▼ ["}
        </button>
        {!collapsed && (
          <>
            <div className="ml-4 border-l border-border/40 pl-3 space-y-0.5">
              {data.map((item, i) => (
                <div key={i} className="flex gap-1.5">
                  <span className="text-muted text-[10px] mt-0.5 select-none min-w-[20px] text-right">{i}</span>
                  <JsonViewer data={item} depth={depth + 1} />
                </div>
              ))}
            </div>
            <span className="text-purple-400">]</span>
          </>
        )}
      </span>
    );
  }
  if (typeof data === "object") {
    const keys = Object.keys(data);
    if (keys.length === 0) return <span className="text-muted">{"{}"}</span>;
    return (
      <span>
        <button onClick={() => setCollapsed(!collapsed)}
          className="text-yellow-400 hover:text-yellow-300 font-mono text-xs">
          {collapsed ? `▶ { ${keys.length} keys }` : "▼ {"}
        </button>
        {!collapsed && (
          <>
            <div className="ml-4 border-l border-border/40 pl-3 space-y-0.5">
              {keys.map((k) => (
                <div key={k} className="flex gap-1.5 flex-wrap">
                  <span className="text-slate-400 font-mono text-xs">{k}:</span>
                  <JsonViewer data={data[k]} depth={depth + 1} />
                </div>
              ))}
            </div>
            <span className="text-yellow-400">{"}"}</span>
          </>
        )}
      </span>
    );
  }
  return <span className="text-muted">{String(data)}</span>;
}

function ResultPanel({ res, label }) {
  const [view, setView] = useState("raw");
  const [copied, setCopied] = useState(false);

  function copyToClipboard() {
    navigator.clipboard.writeText(JSON.stringify(res, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  if (!res) return null;

  const isError = !!(res.error || res.errors?.length);
  const hasData = Array.isArray(res.data) && res.data.length > 0;

  return (
    <div className={`rounded-xl border overflow-hidden
      ${isError
        ? "border-red-400/25 bg-red-400/5"
        : "border-accent/25 bg-accent/5"}`}>
      <div className={`flex items-center justify-between px-3 py-2 border-b
        ${isError ? "border-red-400/15" : "border-accent/15"}`}>
        <div className="flex items-center gap-2">
          <span className={`font-mono text-xs font-bold ${isError ? "text-red-400" : "text-accent"}`}>
            {isError ? "✗ Error" : "✓ Data"}
          </span>
          {hasData && (
            <span className="font-mono text-[10px] text-muted bg-dim border border-border rounded px-2 py-0.5">
              {res.data.length.toLocaleString()} records
            </span>
          )}
        </div>
        {!isError && (
          <div className="flex gap-1">
            <button onClick={() => setView("table")}
              className={`font-mono text-[10px] px-2 py-0.5 rounded border transition-colors
                ${view === "table" ? "border-accent/50 text-accent bg-accent/10" : "border-border text-muted hover:border-accent/30"}`}>
              Table
            </button>
            <button onClick={() => setView("raw")}
              className={`font-mono text-[10px] px-2 py-0.5 rounded border transition-colors
                ${view === "raw" ? "border-accent/50 text-accent bg-accent/10" : "border-border text-muted hover:border-accent/30"}`}>
              JSON
            </button>
            <button onClick={copyToClipboard}
              className="font-mono text-[10px] px-2 py-0.5 rounded border border-border text-muted hover:border-accent/30 transition-colors">
              {copied ? "✓ Copied" : "Copy"}
            </button>
          </div>
        )}
      </div>
      <div className="p-3 font-mono text-xs">
        {isError && (
          <div className="space-y-1">
            {res.error && <p className="text-red-400 break-all">{res.error}</p>}
            {res.errors?.map((e, i) => (
              <p key={i} className="text-amber-400 break-all">⚠ {e}</p>
            ))}
          </div>
        )}
        {!isError && view === "table" && hasData && (
          <DataTable rows={res.data} columns={Object.keys(res.data[0] || {}).map(k => ({ key: k, label: k }))} title={label} />
        )}
        {!isError && view === "raw" && (
          <div className="bg-dim border border-border rounded-lg p-3 overflow-auto max-h-[600px]">
            <JsonViewer data={res} depth={0} />
          </div>
        )}
      </div>
    </div>
  );
}

export function QuickFetch({ companies }) {
  const [company, setCompany] = useState(companies?.[0]?.name || "");
  const [fromDate, setFromDate] = useState(YEAR_START);
  const [toDate, setToDate] = useState(TODAY);
  const [results, setResults] = useState({});
  const [loading, setLoading] = useState({});

  async function fetch(key, apiFn) {
    setLoading((l) => ({ ...l, [key]: true }));
    setResults((r) => ({ ...r, [key]: null }));
    try {
      const res = await apiFn();
      setResults((r) => ({ ...r, [key]: res }));
    } catch (e) {
      setResults((r) => ({ ...r, [key]: { error: e.message } }));
    } finally {
      setLoading((l) => ({ ...l, [key]: false }));
    }
  }

  const co = company.trim();

  const actions = [
    {
      key: "companies",
      icon: "🏢",
      label: "Companies",
      fn: () => fetch("companies", () => tallyAPI.companies()),
      columns: [
        { key: "name",        label: "Company" },
        { key: "startingFrom", label: "Start Date" },
        { key: "booksFrom",   label: "Books From" },
      ],
    },
    {
      key: "ledgers",
      icon: "📒",
      label: "Ledgers",
      fn: () => fetch("ledgers", () => tallyAPI.ledgers(co)),
      columns: [
        { key: "name",           label: "Ledger" },
        { key: "parentGroup",    label: "Group" },
        { key: "type",           label: "Type" },
        { key: "closingBalance", label: "Closing Bal",
          render: (v) => v ? `₹${Number(v).toLocaleString("en-IN")}` : "—" },
        { key: "gstin",          label: "GSTIN" },
      ],
    },
    {
      key: "vouchers",
      icon: "🧾",
      label: "Vouchers",
      fn: () => fetch("vouchers", () => tallyAPI.vouchers(co, fromDate, toDate)),
      columns: [
        { key: "voucherDate",   label: "Date" },
        { key: "voucherType",   label: "Type" },
        { key: "voucherNumber", label: "No." },
        { key: "partyName",     label: "Party" },
        { key: "netAmount",     label: "Amount",
          render: (v) => v ? `₹${Number(v).toLocaleString("en-IN")}` : "—" },
      ],
    },
    {
      key: "stock",
      icon: "📦",
      label: "Stock Items",
      fn: () => fetch("stock", () => tallyAPI.stock(co)),
      columns: [
        { key: "name",         label: "Item" },
        { key: "group",        label: "Group" },
        { key: "baseUnit",     label: "Unit" },
        { key: "closingQty",   label: "Qty" },
        { key: "closingValue", label: "Value",
          render: (v) => v ? `₹${Number(v).toLocaleString("en-IN")}` : "—" },
      ],
    },
  ];

  return (
    <div className="space-y-5 animate-fade-up">
      {/* Config */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-3">
        <h2 className="font-mono text-xs text-muted uppercase tracking-widest">Quick Fetch</h2>

        {companies?.length > 0 ? (
          <select value={company} onChange={(e) => setCompany(e.target.value)}
            className="w-full bg-dim border border-border rounded-lg px-3 py-2.5 font-mono text-sm text-slate-200 focus:outline-none focus:border-accent/60">
            <option value="">— select company —</option>
            {companies.map((c) => (
              <option key={c.guid || c.name} value={c.name}>{c.name}</option>
            ))}
          </select>
        ) : (
          <input
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            placeholder="Company name"
            className="w-full bg-dim border border-border rounded-lg px-3 py-2.5 font-mono text-sm text-slate-200 placeholder-muted focus:outline-none focus:border-accent/60 transition-colors"
          />
        )}
        <div className="grid grid-cols-2 gap-3">
          <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)}
            className="bg-dim border border-border rounded-lg px-3 py-2 font-mono text-sm text-slate-200 focus:outline-none focus:border-accent/60" />
          <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)}
            className="bg-dim border border-border rounded-lg px-3 py-2 font-mono text-sm text-slate-200 focus:outline-none focus:border-accent/60" />
        </div>
      </div>

      {/* Action buttons */}
      <div className="grid grid-cols-2 gap-3">
        {actions.map((a) => {
          const res = results[a.key];
          const busy = loading[a.key];
          return (
            <div key={a.key} className="bg-card border border-border rounded-xl overflow-hidden">
              <button
                onClick={a.fn}
                disabled={busy || !co}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-all
                  ${busy || !co ? "opacity-50 cursor-not-allowed" : "hover:bg-dim/60"}`}
              >
                <span className="text-xl">{a.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-mono text-sm font-semibold text-slate-200">{a.label}</p>
                  {res && !res.error && (
                    <p className="font-mono text-xs text-green-400">{res.count} records</p>
                  )}
                  {res?.error && (
                    <p className="font-mono text-xs text-red-400 truncate">{res.error}</p>
                  )}
                </div>
                {busy ? (
                  <span className="w-4 h-4 border-2 border-accent/30 border-t-accent rounded-full animate-spin flex-shrink-0" />
                ) : (
                  <span className="text-muted text-xs font-mono">FETCH</span>
                )}
              </button>

              {res && !res.error && res.data?.length > 0 && (
                <div className="border-t border-border px-4 pb-3 pt-2">
                  <ResultPanel res={res} label={a.label} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}