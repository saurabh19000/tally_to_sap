const { Pool } = require("pg");

const rawUrl = process.env.DATABASE_URL;
const maskedUrl = rawUrl ? rawUrl.replace(/\/\/.*?@/, "//USER:PASS@") : "(not set)";
console.log("[db] DATABASE_URL:", maskedUrl);

let pool = null;
let dbAvailable = false;

function getPool() {
  if (pool) return pool;
  if (!rawUrl) {
    console.warn("[db] No DATABASE_URL in environment. Credentials will not persist.");
    return null;
  }
  console.log("[db] Creating pool...");
  pool = new Pool({
    connectionString: rawUrl,
    ssl: { rejectUnauthorized: false },
    max: 2,
    connectionTimeoutMillis: 10000,
    idleTimeoutMillis: 30000,
  });
  pool.on("error", function (err) {
    console.error("[db] Pool error event:", err.message, err.code, err.stack);
    dbAvailable = false;
  });
  return pool;
}

async function initDb() {
  const p = getPool();
  if (!p) return;
  try {
    console.log("[db] Attempting to connect...");
    const client = await p.connect();
    console.log("[db] Connected. Running CREATE TABLE...");
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS user_credentials (
          id SERIAL PRIMARY KEY,
          email VARCHAR(255) UNIQUE NOT NULL,
          client_id TEXT NOT NULL,
          client_secret TEXT NOT NULL,
          token_url TEXT NOT NULL,
          cpi_api_base TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `);
      dbAvailable = true;
      console.log("[db] Database initialized (user_credentials table ready).");
    } finally {
      client.release();
    }
  } catch (err) {
    console.warn("[db] Database unavailable:", err.message);
    console.warn("[db] Error code:", err.code);
    console.warn("[db] Error detail:", err.detail || "(none)");
    console.warn("[db] Error stack:", err.stack ? err.stack.split("\n")[0] : "(none)");
    dbAvailable = false;
  }
}

function isAvailable() {
  return dbAvailable;
}

async function saveCredentials(email, creds) {
  console.log("[db] saveCredentials called for email:", email);
  const p = getPool();
  if (!p) { console.warn("[db] saveCredentials: no pool"); throw new Error("Database not configured"); }
  console.log("[db] saveCredentials: connecting...");
  const client = await p.connect();
  console.log("[db] saveCredentials: connected, running query...");
  try {
    await client.query(
      `INSERT INTO user_credentials (email, client_id, client_secret, token_url, cpi_api_base)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (email)
       DO UPDATE SET client_id = $2, client_secret = $3, token_url = $4, cpi_api_base = $5, updated_at = NOW()`,
      [email, creds.clientId, creds.clientSecret, creds.tokenUrl, creds.cpiApiBase]
    );
    return true;
  } finally {
    client.release();
  }
}

async function getCredentials(email) {
  console.log("[db] getCredentials called for email:", email);
  const p = getPool();
  if (!p) { console.warn("[db] getCredentials: no pool"); throw new Error("Database not configured"); }
  console.log("[db] getCredentials: connecting...");
  const client = await p.connect();
  console.log("[db] getCredentials: connected, running query...");
  try {
    const result = await client.query(
      "SELECT client_id, client_secret, token_url, cpi_api_base FROM user_credentials WHERE email = $1",
      [email]
    );
    if (result.rows.length === 0) return null;
    const row = result.rows[0];
    return {
      clientId: row.client_id,
      clientSecret: row.client_secret,
      tokenUrl: row.token_url,
      cpiApiBase: row.cpi_api_base,
    };
  } finally {
    client.release();
  }
}

module.exports = { initDb, saveCredentials, getCredentials, isAvailable };
