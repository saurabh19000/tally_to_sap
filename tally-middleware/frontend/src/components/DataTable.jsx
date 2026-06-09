import { useState } from "react";

export function DataTable({ title, rows, columns }) {
  const [open, setOpen] = useState(false);
  if (!rows || rows.length === 0) return null;

  return (
    <div className="ml-9 mt-1">
      <button
        onClick={() => setOpen((o) => !o)}
        className="font-mono text-xs text-muted hover:text-accent transition-colors flex items-center gap-1"
      >
        <span className={`transition-transform ${open ? "rotate-90" : ""}`}>▶</span>
        {open ? "Hide" : "Preview"} sample ({Math.min(rows.length, 5)} rows)
      </button>

      {open && (
        <div className="mt-2 overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-xs font-mono">
            <thead>
              <tr className="border-b border-border bg-dim">
                {columns.map((c) => (
                  <th key={c.key} className="text-left px-3 py-2 text-muted font-semibold tracking-wider uppercase text-[10px]">
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, 5).map((row, i) => (
                <tr key={i} className="border-b border-border/50 hover:bg-dim/50 transition-colors">
                  {columns.map((c) => (
                    <td key={c.key} className="px-3 py-2 text-slate-300 max-w-[160px] truncate">
                      {c.render ? c.render(row[c.key], row) : (row[c.key] ?? "—")}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}