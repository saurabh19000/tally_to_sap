import dotenv from "dotenv";
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT) || 4000,

  tally: {
    url: process.env.TALLY_URL || "http://localhost:9000",
    companyName: process.env.TALLY_COMPANY_NAME || "",
    timeoutMs: 600_000,
  },

  // Dashboard backend URL (for CPI message GUID registration after push)
  dashboardUrl: process.env.DASHBOARD_URL || "http://localhost:8080",

  // SAP BTP Integration Suite credentials
  btp: {
    clientId:     process.env.BTP_CLIENT_ID     || "",
    clientSecret: process.env.BTP_CLIENT_SECRET || "",
    tokenUrl:     process.env.BTP_TOKEN_URL     || "",
    // runtimeUrl is the primary push target; falls back to ngrokUrl if blank
    runtimeUrl:   process.env.BTP_RUNTIME_URL   || "",
    ngrokUrl:     process.env.NGROK_URL         || "",
    // Effective URL used for logging at startup
    get effectiveUrl() {
      return this.runtimeUrl || this.ngrokUrl || "";
    },
  },
};