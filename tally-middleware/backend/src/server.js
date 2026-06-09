import express from "express";
import cors from "cors";
import { config } from "./config/config.js";
import router from "./routes/index.js";
import { logger } from "./logs/logger.js";

const app = express();

// ── CORS — allow all origins (ngrok + localhost) ──────────────────────────────
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Forwarded-For"],
}));

// ── Body parsers ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: "50mb" }));
app.use(express.text({ type: "text/*", limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// ── Request logger (helps debug ngrok 404s) ───────────────────────────────────
app.use((req, _res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.headers["x-forwarded-for"] || req.ip,
    ua: (req.headers["user-agent"] || "").slice(0, 60),
  });
  next();
});

// ── API routes ────────────────────────────────────────────────────────────────
app.use("/api", router);

// ── Root health (for ngrok/BTP to verify the tunnel is alive) ─────────────────
app.get("/", (_req, res) => {
  res.json({ ok: true, service: "tally-middleware", ts: new Date().toISOString() });
});

// ── 404 catch-all — log every unknown route so we can debug BTP callbacks ─────
app.use((req, res) => {
  logger.warn(`404 — unmatched route: ${req.method} ${req.originalUrl}`);
  res.status(404).json({
    ok: false,
    error: `Route not found: ${req.method} ${req.originalUrl}`,
    availableRoutes: [
      "GET  /api/health",
      "GET  /api/tally/ping",
      "GET  /api/btp/ping",
      "GET  /api/tally/companies",
      "GET  /api/tally/ledgers?company=...",
      "GET  /api/tally/vouchers?company=...",
      "GET  /api/tally/stock?company=...",
      "POST /api/middleware/check",
      "POST /api/btp/push/ledgers",
      "POST /api/btp/push/vouchers",
      "POST /api/btp/push/stock",
      "POST /api/btp/push/all",
      "POST /api/push/ledgers",
      "POST /api/push/vouchers",
      "POST /api/push/stock-items",
      "POST /api/push",
      "GET  /api/logs",
    ],
  });
});

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(config.port, async () => {
  logger.info(`Tally Middleware running on http://localhost:${config.port}`);
  logger.info(`Tally URL: ${config.tally.url}`);
  // logger.info(`BTP configured: ${!!(config.btp.clientId && config.btp.tokenUrl)}`);

  const effectiveUrl = config.btp.runtimeUrl || config.btp.ngrokUrl;
  if (effectiveUrl) {
    logger.info(`BTP push target: ${effectiveUrl.replace(/\/+$/, "")}/http/tally-write`);
  } else {
    // logger.warn("BTP_RUNTIME_URL not set in .env — pushes to BTP will fail");
  }
});