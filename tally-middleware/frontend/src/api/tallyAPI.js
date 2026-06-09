const BASE = "/api";

async function get(path) {
  const res = await fetch(BASE + path);
  if (!res.ok) {
    // Try to surface the actual error message from the server body
    let errMsg = `${res.status} ${res.statusText}`;
    try {
      const body = await res.json();
      if (body?.error) errMsg = body.error;
      else if (typeof body === "string") errMsg = body;
    } catch (_) { /* body wasn't JSON */ }
    throw new Error(errMsg);
  }
  return res.json();
}

async function post(path, body = {}) {
  const res = await fetch(BASE + path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    let errMsg = `${res.status} ${res.statusText}`;
    try {
      const b = await res.json();
      if (b?.error) errMsg = b.error;
      else if (typeof b === "string") errMsg = b;
    } catch (_) { /* body wasn't JSON */ }
    throw new Error(errMsg);
  }
  return res.json();
}

const q = (company) => `?company=${encodeURIComponent(company)}`;

export const tallyAPI = {
  health:     () => get("/health"),
  ping:       () => get("/tally/ping"),
  btpPing:    () => get("/btp/ping"),
  btpToken:   () => get("/btp/token"),

  companies:  () => get("/tally/companies"),
  ledgers:    (company) => get(`/tally/ledgers${q(company)}`),
  vouchers:   (company, from, to) =>
    get(`/tally/vouchers${q(company)}${from ? `&from=${from}` : ""}${to ? `&to=${to}` : ""}`),
  stock:      (company) => get(`/tally/stock${q(company)}`),

  middlewareCheck: (company, fromDate, toDate, pushToBtp = false) =>
    post("/middleware/check", { company, fromDate, toDate, pushToBtp }),

  // BTP push endpoints
  btpPushLedgers:  (company) => post("/btp/push/ledgers", { company }),
  btpPushVouchers: (company, fromDate, toDate) => post("/btp/push/vouchers", { company, fromDate, toDate }),
  btpPushStock:    (company) => post("/btp/push/stock", { company }),
  btpPushAll:      (company, fromDate, toDate) => post("/btp/push/all", { company, fromDate, toDate }),

  // Dashboard push endpoints (called AFTER CPI upload succeeds)
  pushLedgers:  (payload) => post("/push/ledgers", payload),
  pushVouchers: (payload) => post("/push/vouchers", payload),
  pushStock:    (payload) => post("/push/stock-items", payload),
  pushGeneric:  (payload) => post("/push", payload),

  logs: (limit = 100) => get(`/logs?limit=${limit}`),
};