// import { useState } from "react";
// import { tallyAPI } from "../api/tallyAPI";
// import { StatusDot } from "../components/StatusDot";

// const TODAY      = new Date().toISOString().slice(0, 10);
// const YEAR_START = `${new Date().getFullYear()}-04-01`;

// // ── Tiny JSON tree viewer ─────────────────────────────────────────────────────
// function JsonViewer({ data, depth = 0 }) {
//   const [collapsed, setCollapsed] = useState(depth > 1);

//   if (data === null || data === undefined) {
//     return <span className="text-muted">null</span>;
//   }
//   if (typeof data === "boolean") {
//     return <span className={data ? "text-green-400" : "text-red-400"}>{String(data)}</span>;
//   }
//   if (typeof data === "number") {
//     return <span className="text-amber-300">{data.toLocaleString()}</span>;
//   }
//   if (typeof data === "string") {
//     return <span className="text-sky-300">"{data}"</span>;
//   }
//   if (Array.isArray(data)) {
//     if (data.length === 0) return <span className="text-muted">[]</span>;
//     return (
//       <span>
//         <button onClick={() => setCollapsed(!collapsed)}
//           className="text-purple-400 hover:text-purple-300 font-mono text-xs">
//           {collapsed ? `▶ [ ${data.length} items ]` : "▼ ["}
//         </button>
//         {!collapsed && (
//           <>
//             <div className="ml-4 border-l border-border/40 pl-3 space-y-0.5">
//               {data.map((item, i) => (
//                 <div key={i} className="flex gap-1.5">
//                   <span className="text-muted text-[10px] mt-0.5 select-none min-w-[20px] text-right">{i}</span>
//                   <JsonViewer data={item} depth={depth + 1} />
//                 </div>
//               ))}
//             </div>
//             <span className="text-purple-400">]</span>
//           </>
//         )}
//       </span>
//     );
//   }
//   if (typeof data === "object") {
//     const keys = Object.keys(data);
//     if (keys.length === 0) return <span className="text-muted">{"{}"}</span>;
//     return (
//       <span>
//         <button onClick={() => setCollapsed(!collapsed)}
//           className="text-yellow-400 hover:text-yellow-300 font-mono text-xs">
//           {collapsed ? `▶ { ${keys.length} keys }` : "▼ {"}
//         </button>
//         {!collapsed && (
//           <>
//             <div className="ml-4 border-l border-border/40 pl-3 space-y-0.5">
//               {keys.map((k) => (
//                 <div key={k} className="flex gap-1.5 flex-wrap">
//                   <span className="text-slate-400 font-mono text-xs">{k}:</span>
//                   <JsonViewer data={data[k]} depth={depth + 1} />
//                 </div>
//               ))}
//             </div>
//             <span className="text-yellow-400">{"}"}</span>
//           </>
//         )}
//       </span>
//     );
//   }
//   return <span className="text-muted">{String(data)}</span>;
// }

// // ── Full data table (for arrays of objects) ───────────────────────────────────
// function DataTable({ data }) {
//   const [page, setPage] = useState(0);
//   const PAGE_SIZE = 20;

//   if (!Array.isArray(data) || data.length === 0) return null;

//   const cols      = Object.keys(data[0] || {}).filter(
//     (k) => !Array.isArray(data[0][k]) && typeof data[0][k] !== "object"
//   );
//   const totalPages = Math.ceil(data.length / PAGE_SIZE);
//   const pageData   = data.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

//   return (
//     <div className="space-y-2">
//       <div className="flex items-center justify-between">
//         <span className="font-mono text-[10px] text-muted">
//           Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, data.length)} of {data.length.toLocaleString()} records
//         </span>
//         <div className="flex gap-1">
//           <button onClick={() => setPage(0)} disabled={page === 0}
//             className="px-2 py-0.5 font-mono text-[10px] border border-border rounded hover:border-accent/50 disabled:opacity-30">
//             «
//           </button>
//           <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
//             className="px-2 py-0.5 font-mono text-[10px] border border-border rounded hover:border-accent/50 disabled:opacity-30">
//             ‹
//           </button>
//           <span className="px-2 py-0.5 font-mono text-[10px] text-muted">
//             {page + 1}/{totalPages}
//           </span>
//           <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
//             className="px-2 py-0.5 font-mono text-[10px] border border-border rounded hover:border-accent/50 disabled:opacity-30">
//             ›
//           </button>
//           <button onClick={() => setPage(totalPages - 1)} disabled={page >= totalPages - 1}
//             className="px-2 py-0.5 font-mono text-[10px] border border-border rounded hover:border-accent/50 disabled:opacity-30">
//             »
//           </button>
//         </div>
//       </div>
//       <div className="overflow-x-auto rounded-lg border border-border">
//         <table className="w-full font-mono text-[11px]">
//           <thead>
//             <tr className="border-b border-border bg-dim">
//               <th className="px-3 py-2 text-left text-muted font-semibold">#</th>
//               {cols.map((c) => (
//                 <th key={c} className="px-3 py-2 text-left text-muted font-semibold whitespace-nowrap">
//                   {c}
//                 </th>
//               ))}
//             </tr>
//           </thead>
//           <tbody>
//             {pageData.map((row, i) => (
//               <tr key={i} className="border-b border-border/30 hover:bg-dim/50 transition-colors">
//                 <td className="px-3 py-1.5 text-muted">{page * PAGE_SIZE + i + 1}</td>
//                 {cols.map((c) => (
//                   <td key={c} className="px-3 py-1.5 text-slate-300 max-w-[200px] truncate">
//                     {row[c] === null || row[c] === undefined
//                       ? <span className="text-muted">—</span>
//                       : typeof row[c] === "boolean"
//                         ? <span className={row[c] ? "text-green-400" : "text-red-400"}>{String(row[c])}</span>
//                         : typeof row[c] === "number"
//                           ? <span className="text-amber-300">{row[c].toLocaleString()}</span>
//                           : String(row[c])}
//                   </td>
//                 ))}
//               </tr>
//             ))}
//           </tbody>
//         </table>
//       </div>
//     </div>
//   );
// }

// // ── Result panel ──────────────────────────────────────────────────────────────
// function ResultPanel({ res, label }) {
//   const [view, setView] = useState("summary"); // "summary" | "table" | "raw"

//   if (!res) return null;

//   const isError   = !!(res.error || res.errors?.length);
//   const hasData   = Array.isArray(res.data) && res.data.length > 0;
//   const hasSummary = res.summary || res.totalRecords !== undefined;

//   return (
//     <div className={`rounded-xl border overflow-hidden
//       ${isError
//         ? "border-red-400/25 bg-red-400/5"
//         : "border-green-400/25 bg-green-400/5"}`}>

//       {/* Header */}
//       <div className={`flex items-center justify-between px-3 py-2 border-b
//         ${isError ? "border-red-400/15" : "border-green-400/15"}`}>
//         <div className="flex items-center gap-2">
//           <span className={`font-mono text-xs font-bold ${isError ? "text-red-400" : "text-green-400"}`}>
//             {isError ? "✗ Failed" : "✓ Pushed"}
//           </span>
//           {res.totalRecords !== undefined && !isError && (
//             <span className="font-mono text-[10px] text-muted bg-dim border border-border rounded px-2 py-0.5">
//               {res.totalRecords.toLocaleString()} records
//             </span>
//           )}
//           {res.dataType && (
//             <span className="font-mono text-[10px] text-accent bg-accent/10 border border-accent/20 rounded px-2 py-0.5">
//               {res.dataType}
//             </span>
//           )}
//         </div>

//         {/* View switcher — only when data exists */}
//         {!isError && (
//           <div className="flex gap-1">
//             {hasSummary && (
//               <button onClick={() => setView("summary")}
//                 className={`font-mono text-[10px] px-2 py-0.5 rounded border transition-colors
//                   ${view === "summary" ? "border-accent/50 text-accent bg-accent/10" : "border-border text-muted hover:border-accent/30"}`}>
//                 Summary
//               </button>
//             )}
//             {hasData && (
//               <button onClick={() => setView("table")}
//                 className={`font-mono text-[10px] px-2 py-0.5 rounded border transition-colors
//                   ${view === "table" ? "border-accent/50 text-accent bg-accent/10" : "border-border text-muted hover:border-accent/30"}`}>
//                 Table ({res.data.length.toLocaleString()})
//               </button>
//             )}
//             <button onClick={() => setView("raw")}
//               className={`font-mono text-[10px] px-2 py-0.5 rounded border transition-colors
//                 ${view === "raw" ? "border-accent/50 text-accent bg-accent/10" : "border-border text-muted hover:border-accent/30"}`}>
//               JSON
//             </button>
//           </div>
//         )}
//       </div>

//       {/* Body */}
//       <div className="p-3 font-mono text-xs">

//         {/* Error state */}
//         {isError && (
//           <div className="space-y-1">
//             {res.error && <p className="text-red-400 break-all">{res.error}</p>}
//             {res.errors?.map((e, i) => (
//               <p key={i} className="text-amber-400 break-all">⚠ {e}</p>
//             ))}
//           </div>
//         )}

//         {/* Summary view */}
//         {!isError && view === "summary" && (
//           <div className="space-y-3">
//             {/* Stats grid */}
//             {res.summary && (
//               <div className="grid grid-cols-2 gap-2">
//                 {Object.entries(res.summary)
//                   .filter(([, v]) => typeof v !== "object")
//                   .map(([k, v]) => (
//                     <div key={k} className="bg-dim border border-border rounded-lg px-3 py-2">
//                       <p className="text-[10px] text-muted uppercase tracking-wider">{k.replace(/([A-Z])/g, " $1")}</p>
//                       <p className="text-slate-200 font-semibold mt-0.5">
//                         {typeof v === "number" ? v.toLocaleString() : String(v)}
//                       </p>
//                     </div>
//                   ))}
//               </div>
//             )}

//             {/* topGroups / byType table */}
//             {res.summary?.topGroups && (
//               <div>
//                 <p className="text-[10px] text-muted uppercase tracking-wider mb-1">Top Groups</p>
//                 <div className="space-y-1">
//                   {res.summary.topGroups.map((g) => (
//                     <div key={g.group} className="flex items-center gap-2">
//                       <div className="flex-1 h-1.5 bg-dim rounded-full overflow-hidden">
//                         <div className="h-full bg-accent/60 rounded-full"
//                           style={{ width: `${Math.min(100, (g.count / (res.summary?.totalLedgers || 1)) * 100)}%` }} />
//                       </div>
//                       <span className="text-slate-300 min-w-[30px] text-right">{g.count}</span>
//                       <span className="text-muted truncate max-w-[160px]">{g.group}</span>
//                     </div>
//                   ))}
//                 </div>
//               </div>
//             )}

//             {res.summary?.byType && (
//               <div>
//                 <p className="text-[10px] text-muted uppercase tracking-wider mb-1">By Type</p>
//                 <div className="space-y-1">
//                   {Object.entries(res.summary.byType).map(([type, count]) => (
//                     <div key={type} className="flex items-center justify-between">
//                       <span className="text-slate-300">{type}</span>
//                       <span className="text-amber-300 font-semibold">{count.toLocaleString()}</span>
//                     </div>
//                   ))}
//                 </div>
//               </div>
//             )}

//             {/* BTP response */}
//             {res.response && (
//               <div className="bg-dim border border-border rounded-lg p-2">
//                 <p className="text-[10px] text-muted mb-1">BTP Response</p>
//                 <p className="text-slate-300 break-all">{typeof res.response === "string" ? res.response : JSON.stringify(res.response)}</p>
//               </div>
//             )}
//           </div>
//         )}

//         {/* Table view — paginated, all records */}
//         {!isError && view === "table" && hasData && (
//           <DataTable data={res.data} />
//         )}

//         {/* Raw JSON view — full tree */}
//         {!isError && view === "raw" && (
//           <div className="bg-dim border border-border rounded-lg p-3 overflow-auto max-h-[500px]">
//             <JsonViewer data={res} depth={0} />
//           </div>
//         )}
//       </div>
//     </div>
//   );
// }

// // ── Main component ────────────────────────────────────────────────────────────
// export function BtpPush({ companies, btpConnected }) {
//   const [company,   setCompany]   = useState(companies?.[0]?.name || "");
//   const [fromDate,  setFromDate]  = useState(YEAR_START);
//   const [toDate,    setToDate]    = useState(TODAY);
//   const [results,   setResults]   = useState({});
//   const [loading,   setLoading]   = useState({});

//   async function run(key, fn) {
//     setLoading((l) => ({ ...l, [key]: true }));
//     setResults((r) => ({ ...r, [key]: null }));
//     try {
//       const res = await fn();
//       if (res && !res.ok && !res.error) {
//         res.error = res.errorDetail || res.errors?.join(" | ") || "Push failed — check logs";
//       }
//       setResults((r) => ({ ...r, [key]: res }));
//     } catch (e) {
//       setResults((r) => ({ ...r, [key]: { error: e.message } }));
//     } finally {
//       setLoading((l) => ({ ...l, [key]: false }));
//     }
//   }

//   const co = company.trim();

//   const actions = [
//     {
//       key:      "all",
//       icon:     "🚀",
//       label:    "Push All to BTP",
//       sublabel: "Ledgers + Vouchers + Stock",
//       variant:  "accent",
//       fn:       () => run("all", () => tallyAPI.btpPushAll(co, fromDate, toDate)),
//     },
//     {
//       key:      "ledgers",
//       icon:     "📒",
//       label:    "Push Ledgers",
//       sublabel: "All accounts → BTP",
//       variant:  "green",
//       fn:       () => run("ledgers", () => tallyAPI.btpPushLedgers(co)),
//     },
//     {
//       key:      "vouchers",
//       icon:     "🧾",
//       label:    "Push Vouchers",
//       sublabel: "Transactions → BTP",
//       variant:  "amber",
//       fn:       () => run("vouchers", () => tallyAPI.btpPushVouchers(co, fromDate, toDate)),
//     },
//     {
//       key:      "stock",
//       icon:     "📦",
//       label:    "Push Stock",
//       sublabel: "Inventory → BTP",
//       variant:  "purple",
//       fn:       () => run("stock", () => tallyAPI.btpPushStock(co)),
//     },
//   ];

//   const variantClass = {
//     accent: "border-accent/30 bg-accent/8 hover:bg-accent/15 text-accent",
//     green:  "border-green-400/30 bg-green-400/8 hover:bg-green-400/15 text-green-400",
//     amber:  "border-amber-400/30 bg-amber-400/8 hover:bg-amber-400/15 text-amber-400",
//     purple: "border-purple-400/30 bg-purple-400/8 hover:bg-purple-400/15 text-purple-400",
//   };

//   return (
//     <div className="space-y-5 animate-fade-up">

//       {/* BTP connection banner */}
//       <div className={`rounded-xl border px-4 py-3 flex items-center gap-3
//         ${btpConnected
//           ? "border-green-400/25 bg-green-400/5"
//           : "border-amber-400/25 bg-amber-400/5"}`}>
//         <StatusDot status={btpConnected ? "ok" : "warn"} />
//         <div>
//           <p className={`font-mono text-xs font-semibold ${btpConnected ? "text-green-400" : "text-amber-400"}`}>
//             {btpConnected ? "SAP BTP Connected — Full data push enabled" : "SAP BTP not connected — check .env credentials"}
//           </p>
//           <p className="font-mono text-[10px] text-muted mt-0.5">
//             690a9d08trial.it-cpitrial03-rt.cfapps.ap21.hana.ondemand.com/http/tally-trigger
//           </p>
//         </div>
//       </div>

//       {/* Config */}
//       <div className="bg-card border border-border rounded-xl p-5 space-y-3">
//         <h2 className="font-mono text-xs text-muted uppercase tracking-widest">Push Configuration</h2>

//         {companies?.length > 0 ? (
//           <select value={company} onChange={(e) => setCompany(e.target.value)}
//             className="w-full bg-dim border border-border rounded-lg px-3 py-2.5 font-mono text-sm text-slate-200 focus:outline-none focus:border-accent/60">
//             <option value="">— select company —</option>
//             {companies.map((c) => (
//               <option key={c.guid || c.name} value={c.name}>{c.name}</option>
//             ))}
//           </select>
//         ) : (
//           <input value={company} onChange={(e) => setCompany(e.target.value)}
//             placeholder="Company name"
//             className="w-full bg-dim border border-border rounded-lg px-3 py-2.5 font-mono text-sm text-slate-200 placeholder-muted focus:outline-none focus:border-accent/60" />
//         )}

//         <div className="grid grid-cols-2 gap-3">
//           <div>
//             <label className="block font-mono text-[10px] text-muted mb-1">FROM DATE</label>
//             <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)}
//               className="w-full bg-dim border border-border rounded-lg px-3 py-2 font-mono text-sm text-slate-200 focus:outline-none focus:border-accent/60" />
//           </div>
//           <div>
//             <label className="block font-mono text-[10px] text-muted mb-1">TO DATE</label>
//             <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)}
//               className="w-full bg-dim border border-border rounded-lg px-3 py-2 font-mono text-sm text-slate-200 focus:outline-none focus:border-accent/60" />
//           </div>
//         </div>
//       </div>

//       {/* Action buttons */}
//       <div className="grid grid-cols-2 gap-3">
//         {actions.map((action) => {
//           const busy     = loading[action.key];
//           const disabled = busy || !co;
//           return (
//             <button
//               key={action.key}
//               onClick={action.fn}
//               disabled={disabled}
//               className={`w-full rounded-xl border px-4 py-4 text-left transition-all
//                 ${disabled
//                   ? "opacity-40 cursor-not-allowed bg-dim border-border"
//                   : variantClass[action.variant]}`}
//             >
//               <div className="flex items-center gap-3">
//                 <span className="text-xl">{action.icon}</span>
//                 <div className="flex-1 min-w-0">
//                   <p className="font-mono text-sm font-bold">{action.label}</p>
//                   <p className="font-mono text-[10px] opacity-70">{action.sublabel}</p>
//                 </div>
//                 {busy && (
//                   <span className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin flex-shrink-0" />
//                 )}
//               </div>
//             </button>
//           );
//         })}
//       </div>

//       {/* Results — one panel per action, shown below buttons */}
//       {actions.map((action) =>
//         results[action.key] ? (
//           <div key={action.key} className="space-y-2">
//             <p className="font-mono text-xs text-muted uppercase tracking-widest">
//               {action.icon} {action.label} — Result
//             </p>
//             <ResultPanel res={results[action.key]} label={action.label} />
//           </div>
//         ) : null
//       )}

//       {/* Flow diagram */}
//       <div className="bg-card border border-border rounded-xl p-4">
//         <p className="font-mono text-xs text-muted uppercase tracking-widest mb-3">Data Flow</p>
//         <div className="flex items-center gap-2 font-mono text-xs text-slate-400 flex-wrap">
//           <span className="bg-dim border border-border rounded px-2 py-1">TallyPrime :9000</span>
//           <span className="text-muted">→</span>
//           <span className="bg-dim border border-border rounded px-2 py-1">Middleware :4000</span>
//           <span className="text-muted">→</span>
//           <span className="bg-dim border border-border rounded px-2 py-1">ngrok tunnel</span>
//           <span className="text-muted">→</span>
//           <span className="bg-accent/10 border border-accent/20 rounded px-2 py-1 text-accent">SAP BTP iFlow</span>
//         </div>
//         <p className="font-mono text-[10px] text-muted mt-3">
//           Full dataset (all records) pushed — not just summary counts.
//           ngrok-skip-browser-warning header auto-added.
//         </p>
//       </div>
//     </div>
//   );
// }

import { useState } from "react";
import { tallyAPI } from "../api/tallyAPI";
import { StatusDot } from "../components/StatusDot";

const TODAY      = new Date().toISOString().slice(0, 10);
const YEAR_START = `${new Date().getFullYear()}-04-01`;

// ── Tiny JSON tree viewer ─────────────────────────────────────────────────────
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

// ── Stock batch summary (stock-only) ─────────────────────────────────────────
function StockBatchSummary({ res }) {
  if (!res || !res.totalBatches) return null;
  const successCount = res.btpResult?.successCount ?? res.results?.filter((r) => r.success).length ?? 0;
  const batchResults = res.btpResult?.results ?? [];
  const allOk = successCount === res.totalBatches;

  return (
    <div className="rounded-xl border border-accent/25 bg-accent/5 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-accent/15 bg-accent/8">
        <span className="font-mono text-xs font-bold text-accent uppercase tracking-widest">
          📦 Stock Batch Push Summary
        </span>
        <span className={`font-mono text-[10px] px-2 py-0.5 rounded border font-semibold
          ${allOk ? "text-green-400 border-green-400/30 bg-green-400/10" : "text-amber-400 border-amber-400/30 bg-amber-400/10"}`}>
          {successCount}/{res.totalBatches} batches OK
        </span>
      </div>

      {/* Meta grid */}
      <div className="grid grid-cols-2 gap-2 p-3">
        {[
          ["Correlation ID",  res.correlationId  ?? "—"],
          ["Total Records",   res.count != null ? res.count.toLocaleString() : (res.btpResult?.totalRecords ?? "—")],
          ["Batch Size",      res.batchSize  ?? "—"],
          ["Total Batches",   res.totalBatches ?? "—"],
        ].map(([label, value]) => (
          <div key={label} className="bg-dim border border-border rounded-lg px-3 py-2">
            <p className="font-mono text-[10px] text-muted uppercase tracking-wider">{label}</p>
            <p className="font-mono text-xs text-slate-200 font-semibold mt-0.5 break-all">{String(value)}</p>
          </div>
        ))}
      </div>

      {/* Per-batch list */}
      {batchResults.length > 0 && (
        <div className="px-3 pb-3 space-y-1">
          <p className="font-mono text-[10px] text-muted uppercase tracking-widest mb-1.5">Per-Batch Status</p>
          {batchResults.map((b) => (
            <div key={b.entryId}
              className={`flex items-center gap-3 rounded-lg border px-3 py-1.5
                ${b.success
                  ? "border-green-400/20 bg-green-400/5"
                  : "border-red-400/20 bg-red-400/5"}`}>
              <span className={`font-mono text-xs font-bold flex-shrink-0 ${b.success ? "text-green-400" : "text-red-400"}`}>
                {b.success ? "✓" : "✗"}
              </span>
              <span className="font-mono text-[10px] text-muted flex-shrink-0">
                b{String(b.batchIndex).padStart(2, "0")}
              </span>
              <span className="font-mono text-xs text-slate-300 flex-1 truncate">{b.entryId}</span>
              <span className="font-mono text-[10px] text-amber-300 flex-shrink-0">
                {b.records} rec
              </span>
              {!b.success && b.error && (
                <span className="font-mono text-[10px] text-red-400 truncate max-w-[120px]">{b.error}</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Full data table (for arrays of objects) ───────────────────────────────────
function DataTable({ data }) {
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 20;

  if (!Array.isArray(data) || data.length === 0) return null;

  const cols      = Object.keys(data[0] || {}).filter(
    (k) => !Array.isArray(data[0][k]) && typeof data[0][k] !== "object"
  );
  const totalPages = Math.ceil(data.length / PAGE_SIZE);
  const pageData   = data.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[10px] text-muted">
          Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, data.length)} of {data.length.toLocaleString()} records
        </span>
        <div className="flex gap-1">
          <button onClick={() => setPage(0)} disabled={page === 0}
            className="px-2 py-0.5 font-mono text-[10px] border border-border rounded hover:border-accent/50 disabled:opacity-30">
            «
          </button>
          <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
            className="px-2 py-0.5 font-mono text-[10px] border border-border rounded hover:border-accent/50 disabled:opacity-30">
            ‹
          </button>
          <span className="px-2 py-0.5 font-mono text-[10px] text-muted">
            {page + 1}/{totalPages}
          </span>
          <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
            className="px-2 py-0.5 font-mono text-[10px] border border-border rounded hover:border-accent/50 disabled:opacity-30">
            ›
          </button>
          <button onClick={() => setPage(totalPages - 1)} disabled={page >= totalPages - 1}
            className="px-2 py-0.5 font-mono text-[10px] border border-border rounded hover:border-accent/50 disabled:opacity-30">
            »
          </button>
        </div>
      </div>
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full font-mono text-[11px]">
          <thead>
            <tr className="border-b border-border bg-dim">
              <th className="px-3 py-2 text-left text-muted font-semibold">#</th>
              {cols.map((c) => (
                <th key={c} className="px-3 py-2 text-left text-muted font-semibold whitespace-nowrap">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageData.map((row, i) => (
              <tr key={i} className="border-b border-border/30 hover:bg-dim/50 transition-colors">
                <td className="px-3 py-1.5 text-muted">{page * PAGE_SIZE + i + 1}</td>
                {cols.map((c) => (
                  <td key={c} className="px-3 py-1.5 text-slate-300 max-w-[200px] truncate">
                    {row[c] === null || row[c] === undefined
                      ? <span className="text-muted">—</span>
                      : typeof row[c] === "boolean"
                        ? <span className={row[c] ? "text-green-400" : "text-red-400"}>{String(row[c])}</span>
                        : typeof row[c] === "number"
                          ? <span className="text-amber-300">{row[c].toLocaleString()}</span>
                          : String(row[c])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Result panel ──────────────────────────────────────────────────────────────
function ResultPanel({ res, label }) {
  const [view, setView] = useState("summary"); // "summary" | "table" | "raw"

  if (!res) return null;

  const isError   = !!(res.error || res.errors?.length);
  const hasData   = Array.isArray(res.data) && res.data.length > 0;
  const hasSummary = res.summary || res.totalRecords !== undefined;

  return (
    <div className={`rounded-xl border overflow-hidden
      ${isError
        ? "border-red-400/25 bg-red-400/5"
        : "border-green-400/25 bg-green-400/5"}`}>

      {/* Header */}
      <div className={`flex items-center justify-between px-3 py-2 border-b
        ${isError ? "border-red-400/15" : "border-green-400/15"}`}>
        <div className="flex items-center gap-2">
          <span className={`font-mono text-xs font-bold ${isError ? "text-red-400" : "text-green-400"}`}>
            {isError ? "✗ Failed" : "✓ Pushed"}
          </span>
          {res.totalRecords !== undefined && !isError && (
            <span className="font-mono text-[10px] text-muted bg-dim border border-border rounded px-2 py-0.5">
              {res.totalRecords.toLocaleString()} records
            </span>
          )}
          {res.dataType && (
            <span className="font-mono text-[10px] text-accent bg-accent/10 border border-accent/20 rounded px-2 py-0.5">
              {res.dataType}
            </span>
          )}
        </div>

        {/* View switcher — only when data exists */}
        {!isError && (
          <div className="flex gap-1">
            {hasSummary && (
              <button onClick={() => setView("summary")}
                className={`font-mono text-[10px] px-2 py-0.5 rounded border transition-colors
                  ${view === "summary" ? "border-accent/50 text-accent bg-accent/10" : "border-border text-muted hover:border-accent/30"}`}>
                Summary
              </button>
            )}
            {hasData && (
              <button onClick={() => setView("table")}
                className={`font-mono text-[10px] px-2 py-0.5 rounded border transition-colors
                  ${view === "table" ? "border-accent/50 text-accent bg-accent/10" : "border-border text-muted hover:border-accent/30"}`}>
                Table ({res.data.length.toLocaleString()})
              </button>
            )}
            <button onClick={() => setView("raw")}
              className={`font-mono text-[10px] px-2 py-0.5 rounded border transition-colors
                ${view === "raw" ? "border-accent/50 text-accent bg-accent/10" : "border-border text-muted hover:border-accent/30"}`}>
              JSON
            </button>
          </div>
        )}
      </div>

      {/* Body */}
      <div className="p-3 font-mono text-xs">

        {/* Error state */}
        {isError && (
          <div className="space-y-1">
            {res.error && <p className="text-red-400 break-all">{res.error}</p>}
            {res.errors?.map((e, i) => (
              <p key={i} className="text-amber-400 break-all">⚠ {e}</p>
            ))}
          </div>
        )}

        {/* Summary view */}
        {!isError && view === "summary" && (
          <div className="space-y-3">
            {/* Stats grid */}
            {res.summary && (
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(res.summary)
                  .filter(([, v]) => typeof v !== "object")
                  .map(([k, v]) => (
                    <div key={k} className="bg-dim border border-border rounded-lg px-3 py-2">
                      <p className="text-[10px] text-muted uppercase tracking-wider">{k.replace(/([A-Z])/g, " $1")}</p>
                      <p className="text-slate-200 font-semibold mt-0.5">
                        {typeof v === "number" ? v.toLocaleString() : String(v)}
                      </p>
                    </div>
                  ))}
              </div>
            )}

            {/* topGroups / byType table */}
            {res.summary?.topGroups && (
              <div>
                <p className="text-[10px] text-muted uppercase tracking-wider mb-1">Top Groups</p>
                <div className="space-y-1">
                  {res.summary.topGroups.map((g) => (
                    <div key={g.group} className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-dim rounded-full overflow-hidden">
                        <div className="h-full bg-accent/60 rounded-full"
                          style={{ width: `${Math.min(100, (g.count / (res.summary?.totalLedgers || 1)) * 100)}%` }} />
                      </div>
                      <span className="text-slate-300 min-w-[30px] text-right">{g.count}</span>
                      <span className="text-muted truncate max-w-[160px]">{g.group}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {res.summary?.byType && (
              <div>
                <p className="text-[10px] text-muted uppercase tracking-wider mb-1">By Type</p>
                <div className="space-y-1">
                  {Object.entries(res.summary.byType).map(([type, count]) => (
                    <div key={type} className="flex items-center justify-between">
                      <span className="text-slate-300">{type}</span>
                      <span className="text-amber-300 font-semibold">{count.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* BTP response */}
            {res.response && (
              <div className="bg-dim border border-border rounded-lg p-2">
                <p className="text-[10px] text-muted mb-1">BTP Response</p>
                <p className="text-slate-300 break-all">{typeof res.response === "string" ? res.response : JSON.stringify(res.response)}</p>
              </div>
            )}
          </div>
        )}

        {/* Table view — paginated, all records */}
        {!isError && view === "table" && hasData && (
          <DataTable data={res.data} />
        )}

        {/* Raw JSON view — full tree */}
        {!isError && view === "raw" && (
          <div className="bg-dim border border-border rounded-lg p-3 overflow-auto max-h-[500px]">
            <JsonViewer data={res} depth={0} />
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export function BtpPush({ companies, btpConnected }) {
  const [company,     setCompany]     = useState(companies?.[0]?.name || "");
  const [fromDate,    setFromDate]    = useState(YEAR_START);
  const [toDate,      setToDate]      = useState(TODAY);
  const [results,     setResults]     = useState({});
  const [loading,     setLoading]     = useState({});
  const [syncId,      setSyncId]      = useState("");
  const [dashResults, setDashResults] = useState(null);

  async function run(key, fn) {
    setLoading((l) => ({ ...l, [key]: true }));
    setResults((r) => ({ ...r, [key]: null }));
    try {
      const res = await fn();
      if (res && !res.ok && !res.error) {
        res.error = res.errorDetail || res.errors?.join(" | ") || "Push failed — check logs";
      }
      setResults((r) => ({ ...r, [key]: res }));
    } catch (e) {
      setResults((r) => ({ ...r, [key]: { error: e.message } }));
    } finally {
      setLoading((l) => ({ ...l, [key]: false }));
    }
  }

  async function dashboardPush(dataType) {
    const key = `dash_${dataType}`;
    setLoading((l) => ({ ...l, [key]: true }));
    setDashResults(null);
    try {
      const body = {
        syncId: syncId.trim(),
        company: co,
        totalRecords: results[key]?.count || results[key]?.totalRecords || 0,
        summary: results[key]?.summary || {},
        data: results[key]?.data || [],
      };

      let res;
      if (dataType === "custom") {
        body.dataType = dataType;
        res = await tallyAPI.pushGeneric(body);
      } else if (dataType === "stockItems") {
        res = await tallyAPI.pushStock(body);
      } else if (dataType === "vouchers") {
        res = await tallyAPI.pushVouchers(body);
      } else {
        res = await tallyAPI.pushLedgers(body);
      }
      setDashResults(res);
    } catch (e) {
      setDashResults({ ok: false, error: e.message });
    } finally {
      setLoading((l) => ({ ...l, [key]: false }));
    }
  }

  const co = company.trim();

  const actions = [
    {
      key:      "all",
      icon:     "🚀",
      label:    "Push All to BTP",
      sublabel: "Ledgers + Vouchers + Stock",
      variant:  "accent",
      fn:       () => run("all", () => tallyAPI.btpPushAll(co, fromDate, toDate)),
    },
    {
      key:      "ledgers",
      icon:     "📒",
      label:    "Push Ledgers",
      sublabel: "All accounts → BTP",
      variant:  "green",
      fn:       () => run("ledgers", () => tallyAPI.btpPushLedgers(co)),
    },
    {
      key:      "vouchers",
      icon:     "🧾",
      label:    "Push Vouchers",
      sublabel: "Transactions → BTP",
      variant:  "amber",
      fn:       () => run("vouchers", () => tallyAPI.btpPushVouchers(co, fromDate, toDate)),
    },
    {
      key:      "stock",
      icon:     "📦",
      label:    "Push Stock",
      sublabel: "Inventory → BTP",
      variant:  "purple",
      fn:       () => run("stock", () => tallyAPI.btpPushStock(co)),
    },
  ];

  const variantClass = {
    accent: "border-accent/30 bg-accent/8 hover:bg-accent/15 text-accent",
    green:  "border-green-400/30 bg-green-400/8 hover:bg-green-400/15 text-green-400",
    amber:  "border-amber-400/30 bg-amber-400/8 hover:bg-amber-400/15 text-amber-400",
    purple: "border-purple-400/30 bg-purple-400/8 hover:bg-purple-400/15 text-purple-400",
  };

  return (
    <div className="space-y-5 animate-fade-up">

      {/* BTP connection banner */}
      <div className={`rounded-xl border px-4 py-3 flex items-center gap-3
        ${btpConnected
          ? "border-green-400/25 bg-green-400/5"
          : "border-amber-400/25 bg-amber-400/5"}`}>
        <StatusDot status={btpConnected ? "ok" : "warn"} />
        <div>
          <p className={`font-mono text-xs font-semibold ${btpConnected ? "text-green-400" : "text-amber-400"}`}>
            {btpConnected ? "SAP BTP Connected — Full data push enabled" : "SAP BTP not connected — check .env credentials"}
          </p>
          <p className="font-mono text-[10px] text-muted mt-0.5">
            {/* 690a9d08trial.it-cpitrial03-rt.cfapps.ap21.hana.ondemand.com/http/tally-write */}
            44d032a6trial.it-cpitrial05-rt.cfapps.us10-001.hana.ondemand.com/http/tally-write
          </p>
        </div>
      </div>

      {/* Config */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-3">
        <h2 className="font-mono text-xs text-muted uppercase tracking-widest">Push Configuration</h2>

        {companies?.length > 0 ? (
          <select value={company} onChange={(e) => setCompany(e.target.value)}
            className="w-full bg-dim border border-border rounded-lg px-3 py-2.5 font-mono text-sm text-slate-200 focus:outline-none focus:border-accent/60">
            <option value="">— select company —</option>
            {companies.map((c) => (
              <option key={c.guid || c.name} value={c.name}>{c.name}</option>
            ))}
          </select>
        ) : (
          <input value={company} onChange={(e) => setCompany(e.target.value)}
            placeholder="Company name"
            className="w-full bg-dim border border-border rounded-lg px-3 py-2.5 font-mono text-sm text-slate-200 placeholder-muted focus:outline-none focus:border-accent/60" />
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block font-mono text-[10px] text-muted mb-1">FROM DATE</label>
            <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)}
              className="w-full bg-dim border border-border rounded-lg px-3 py-2 font-mono text-sm text-slate-200 focus:outline-none focus:border-accent/60" />
          </div>
          <div>
            <label className="block font-mono text-[10px] text-muted mb-1">TO DATE</label>
            <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)}
              className="w-full bg-dim border border-border rounded-lg px-3 py-2 font-mono text-sm text-slate-200 focus:outline-none focus:border-accent/60" />
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="grid grid-cols-2 gap-3">
        {actions.map((action) => {
          const busy     = loading[action.key];
          const disabled = busy || !co;
          return (
            <button
              key={action.key}
              onClick={action.fn}
              disabled={disabled}
              className={`w-full rounded-xl border px-4 py-4 text-left transition-all
                ${disabled
                  ? "opacity-40 cursor-not-allowed bg-dim border-border"
                  : variantClass[action.variant]}`}
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">{action.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-mono text-sm font-bold">{action.label}</p>
                  <p className="font-mono text-[10px] opacity-70">{action.sublabel}</p>
                </div>
                {busy && (
                  <span className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin flex-shrink-0" />
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Results — one panel per action, shown below buttons */}
      {actions.map((action) =>
        results[action.key] ? (
          <div key={action.key} className="space-y-2">
            <p className="font-mono text-xs text-muted uppercase tracking-widest">
              {action.icon} {action.label} — Result
            </p>
            {action.key === "stock" && results[action.key].totalBatches && (
              <StockBatchSummary res={results[action.key]} />
            )}
            <ResultPanel res={results[action.key]} label={action.label} />
          </div>
        ) : null
      )}

      {/* Dashboard Push — register CPI message GUID after successful BTP push */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-3">
        <h2 className="font-mono text-xs text-muted uppercase tracking-widest">
          📊 Push to Dashboard
        </h2>
        <p className="font-mono text-[10px] text-muted">
          After CPI upload succeeds, register the CPI Message GUID here to cross-reference in the dashboard.
        </p>

        <div className="flex gap-2">
          <input
            value={syncId}
            onChange={(e) => setSyncId(e.target.value)}
            placeholder="CPI Message GUID (e.g. 8507b297-a635-45fd-996f-aaf9a9650fb6)"
            className="flex-1 bg-dim border border-border rounded-lg px-3 py-2 font-mono text-xs text-slate-200 placeholder-muted focus:outline-none focus:border-accent/60"
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          {[
            { key: "ledgers",    label: "Ledgers",    icon: "📒", variant: "green" },
            { key: "vouchers",   label: "Vouchers",   icon: "🧾", variant: "amber" },
            { key: "stockItems", label: "Stock Items", icon: "📦", variant: "purple" },
            { key: "custom",     label: "Generic",    icon: "📋", variant: "accent" },
          ].map((btn) => {
            const busy = loading[`dash_${btn.key}`];
            return (
              <button key={btn.key}
                onClick={() => dashboardPush(btn.key)}
                disabled={busy || !syncId.trim() || !co}
                className={`w-full rounded-lg border px-3 py-2.5 text-left transition-all flex items-center gap-2
                  ${busy || !syncId.trim() || !co
                    ? "opacity-40 cursor-not-allowed bg-dim border-border"
                    : variantClass[btn.variant]}`}>
                <span className="text-lg">{btn.icon}</span>
                <span className="font-mono text-xs font-semibold flex-1">{btn.label}</span>
                {busy && (
                  <span className="w-3.5 h-3.5 border-2 border-current/30 border-t-current rounded-full animate-spin flex-shrink-0" />
                )}
              </button>
            );
          })}
        </div>

        {dashResults && (
          <div className={`rounded-lg border p-3 font-mono text-xs ${
            dashResults.ok
              ? "border-green-400/25 bg-green-400/5 text-green-400"
              : "border-red-400/25 bg-red-400/5 text-red-400"
          }`}>
            {dashResults.ok
              ? `✓ Dashboard updated — syncId: ${dashResults.syncId}`
              : `✗ ${dashResults.error || "Dashboard push failed"}`}
          </div>
        )}
      </div>

      {/* Flow diagram */}
      <div className="bg-card border border-border rounded-xl p-4">
        <p className="font-mono text-xs text-muted uppercase tracking-widest mb-3">Data Flow</p>
        <div className="flex items-center gap-2 font-mono text-xs text-slate-400 flex-wrap">
          <span className="bg-dim border border-border rounded px-2 py-1">TallyPrime :9000</span>
          <span className="text-muted">→</span>
          <span className="bg-dim border border-border rounded px-2 py-1">Middleware :4000</span>
          <span className="text-muted">→</span>
          <span className="bg-dim border border-border rounded px-2 py-1">ngrok tunnel</span>
          <span className="text-muted">→</span>
          <span className="bg-accent/10 border border-accent/20 rounded px-2 py-1 text-accent">SAP BTP iFlow</span>
        </div>
        <p className="font-mono text-[10px] text-muted mt-3">
          Full dataset (all records) pushed — not just summary counts.
          ngrok-skip-browser-warning header auto-added.
        </p>
      </div>
    </div>
  );
}
