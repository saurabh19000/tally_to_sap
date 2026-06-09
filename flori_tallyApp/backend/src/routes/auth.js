const { Router } = require("express");
const https = require("https");
const crypto = require("crypto");
const { initDb, saveCredentials, getCredentials } = require("../db");

const LICENSE_API_BASE = process.env.LICENSE_API_BASE_URL || "https://license-system-v6ht.onrender.com";
const LICENSE_API_KEY = process.env.LICENSE_API_KEY || "my-secret-key-123";
const PRODUCT_ID = process.env.PRODUCT_ID || "6a23c744247319b4b7bf702a";

const sessions = new Map();
let globalCreds = null;

function setGlobalCreds(creds) {
  globalCreds = creds;
  process.env.BTP_CLIENT_ID = creds.clientId;
  process.env.BTP_CLIENT_SECRET = creds.clientSecret;
  process.env.BTP_TOKEN_URL = creds.tokenUrl;
  process.env.BTP_CPI_API_BASE = creds.cpiApiBase;
}

function getGlobalCreds() {
  return globalCreds;
}

function httpsGet(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { "x-api-key": LICENSE_API_KEY } }, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, body: data });
        }
      });
    }).on("error", reject);
  });
}

function httpsPost(url, payload) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(payload);
    const u = new URL(url);
    const opts = {
      hostname: u.hostname,
      port: u.port,
      path: u.pathname + u.search,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": LICENSE_API_KEY,
        "Content-Length": Buffer.byteLength(body),
      },
    };
    const req = https.request(opts, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

const router = Router();

router.post("/verify-email", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, message: "Email is required." });
    if (!email.includes("@") || !email.toLowerCase().endsWith(".com")) {
      return res.status(400).json({ success: false, message: "Invalid email format." });
    }

    const url = `${LICENSE_API_BASE}/api/external/actve-license/${encodeURIComponent(email)}?productId=${PRODUCT_ID}`;
    const result = await httpsGet(url);

    if (result.status === 404) {
      return res.json({ success: false, message: "Email not found in our database." });
    }
    if (result.status === 403) {
      return res.json({ success: false, message: "No valid license. Please upgrade your plan." });
    }

    const activeLicense = result.body?.activeLicense;
    if (activeLicense && activeLicense.status === "active") {
      return res.json({
        success: true,
        message: "License verified.",
        license: {
          plan: activeLicense.licenseTypeId?.name || "Active",
          endDate: activeLicense.endDate,
        },
      });
    }

    return res.json({ success: false, message: "License is not active." });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Verification failed. Check network." });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: "Email and password are required." });
    }

    const pwdRes = await httpsPost(
      `${LICENSE_API_BASE}/api/external/customer-login`,
      { email, password }
    );

    if (pwdRes.body?.success) {
      const token = crypto.randomBytes(32).toString("hex");
      sessions.set(token, { email, loginAt: new Date().toISOString() });

      // Auto-load stored credentials from database
      let credentialsConfigured = false;
      try {
        const storedCreds = await getCredentials(email);
        if (storedCreds) {
          setGlobalCreds(storedCreds);
          console.log(`[auth] Loaded stored credentials for ${email}`);
          credentialsConfigured = true;
        }
      } catch (dbErr) {
        console.warn("[auth] Could not load credentials from DB:", dbErr.message);
      }

      return res.json({ success: true, message: "Login successful.", token, credentialsConfigured });
    }

    return res.status(401).json({ success: false, message: "Incorrect password." });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Login failed. Check network." });
  }
});

router.post("/verify-token", (req, res) => {
  const { token } = req.body;
  if (!token || !sessions.has(token)) {
    return res.json({ valid: false });
  }
  return res.json({ valid: true, email: sessions.get(token).email });
});

router.post("/logout", (req, res) => {
  const { token } = req.body;
  if (token) {
    const session = sessions.get(token);
    sessions.delete(token);
  }
  return res.json({ success: true });
});

router.post("/credentials", async (req, res) => {
  const { token, clientId, clientSecret, tokenUrl, cpiApiBase } = req.body;
  if (!token || !sessions.has(token)) {
    return res.status(401).json({ success: false, message: "Not authenticated." });
  }
  if (!clientId || !clientSecret || !tokenUrl || !cpiApiBase) {
    return res.status(400).json({ success: false, message: "All four fields are required." });
  }

  const session = sessions.get(token);
  const creds = { clientId, clientSecret, tokenUrl, cpiApiBase };
  setGlobalCreds(creds);

  let dbPersisted = false;
  try {
    await saveCredentials(session.email, creds);
    console.log(`[auth] Credentials saved to DB for ${session.email}`);
    dbPersisted = true;
  } catch (dbErr) {
    console.warn("[auth] Could not save credentials to DB:", dbErr.message);
  }

  return res.json({ success: true, message: "Credentials saved.", dbPersisted });
});

router.get("/credentials", async (req, res) => {
  const token = req.query.token;
  if (!token || !sessions.has(token)) {
    return res.status(401).json({ success: false, message: "Not authenticated." });
  }
  const session = sessions.get(token);

  if (globalCreds) {
    return res.json({
      configured: true,
      clientId: globalCreds.clientId,
      clientSecret: globalCreds.clientSecret,
      tokenUrl: globalCreds.tokenUrl,
      cpiApiBase: globalCreds.cpiApiBase,
    });
  }

  try {
    const storedCreds = await getCredentials(session.email);
    if (storedCreds) {
      setGlobalCreds(storedCreds);
      return res.json({
        configured: true,
        clientId: storedCreds.clientId,
        clientSecret: storedCreds.clientSecret,
        tokenUrl: storedCreds.tokenUrl,
        cpiApiBase: storedCreds.cpiApiBase,
      });
    }
  } catch (dbErr) {
    console.warn("[auth] Could not load credentials from DB:", dbErr.message);
  }

  return res.json({ configured: false });
});

router.post("/credentials-status", (req, res) => {
  const { token } = req.body;
  if (!token || !sessions.has(token)) {
    return res.json({ configured: false });
  }
  return res.json({ configured: globalCreds !== null });
});

async function initAuthDb() {
  try {
    await initDb();
  } catch (err) {
    console.warn("[auth] Database unavailable, credentials will not persist:", err.message);
  }
}

module.exports = { authRouter: router, sessions, getGlobalCreds, initAuthDb };
