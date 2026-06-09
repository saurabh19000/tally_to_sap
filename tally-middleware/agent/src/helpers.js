/**
 * Utility functions for the Middleware Agent
 */

function istTimestamp() {
  const local = new Date().toLocaleString("sv-SE", { timeZone: "Asia/Kolkata" });
  return local.replace(" ", "T") + "+05:30";
}

function escapeXml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function val(v) {
  if (v === undefined || v === null) return null;
  if (Array.isArray(v)) return val(v[0]);
  if (typeof v === "object" && v.$ && v.$.NAME) return String(v.$.NAME);
  if (typeof v === "object" && v._) return String(v._);
  if (typeof v === "string" || typeof v === "number") return String(v);
  return null;
}

function parseTallyAmount(raw) {
  if (!raw) return 0;
  const str = String(raw).replace(/[, ]/g, "");
  const n = parseFloat(str);
  return isNaN(n) ? 0 : Math.abs(n);
}

module.exports = {
  istTimestamp,
  escapeXml,
  val,
  parseTallyAmount
};
