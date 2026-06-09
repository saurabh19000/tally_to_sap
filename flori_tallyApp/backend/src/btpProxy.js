const https = require("https");
const { getGlobalCreds } = require("./routes/auth");

const ENV_CLIENT_ID = process.env.BTP_CLIENT_ID;
const ENV_CLIENT_SECRET = process.env.BTP_CLIENT_SECRET;
const ENV_TOKEN_URL = process.env.BTP_TOKEN_URL;
const ENV_CPI_API_BASE = process.env.BTP_CPI_API_BASE;

let cachedToken = null;
let tokenExpiry = 0;

function resolveCreds(overrides) {
    if (overrides) return overrides;
    const gc = getGlobalCreds();
    if (gc) return gc;
    return {
        clientId: ENV_CLIENT_ID,
        clientSecret: ENV_CLIENT_SECRET,
        tokenUrl: ENV_TOKEN_URL,
        cpiApiBase: ENV_CPI_API_BASE,
    };
}

function fetchToken(overrides) {
    return new Promise((resolve, reject) => {
        const now = Date.now();
        const creds = resolveCreds(overrides);
        const { clientId, clientSecret, tokenUrl } = creds;

        if (!overrides && !getGlobalCreds() && cachedToken && now < tokenExpiry - 60000) {
            return resolve(cachedToken);
        }

        if (!tokenUrl) {
            return reject(new Error("BTP Token URL not configured. Set it in BTP Settings."));
        }
        if (!clientId || !clientSecret) {
            return reject(new Error("BTP credentials not configured. Set them in BTP Settings."));
        }

        const auth = Buffer.from(clientId + ":" + clientSecret).toString("base64");
        const body = "grant_type=client_credentials";
        const url = new URL(tokenUrl);

        const opts = {
            hostname: url.hostname,
            port: 443,
            path: url.pathname + url.search,
            method: "POST",
            headers: {
                Authorization: "Basic " + auth,
                "Content-Type": "application/x-www-form-urlencoded",
                "Content-Length": Buffer.byteLength(body),
                Accept: "application/json",
            },
        };

        const req = https.request(opts, (res) => {
            let data = "";
            res.on("data", (c) => (data += c));
            res.on("end", () => {
                let p;
                try {
                    p = JSON.parse(data);
                } catch {
                    return reject(new Error("UAA non-JSON: " + data));
                }
                if (res.statusCode !== 200)
                    return reject(
                        new Error(
                            "UAA [" +
                                res.statusCode +
                                "]: " +
                                (p.error_description || p.error || data)
                        )
                    );
                if (!p.access_token)
                    return reject(new Error("UAA missing access_token"));
                cachedToken = p;
                tokenExpiry =
                    now + ((p.expires_in - 60) * 1000 || 55 * 60 * 1000);
                resolve(p);
            });
        });
        req.on("error", (e) => reject(new Error("UAA network: " + e.message)));
        req.write(body);
        req.end();
    });
}

function cpiRequest(
    apiPath,
    method = "GET",
    body = null,
    extraHeaders = {},
    overrides = null
) {
    const creds = resolveCreds(overrides);
    if (!creds.cpiApiBase) {
        return Promise.reject(new Error("BTP CPI API Base URL not configured. Set it in BTP Settings."));
    }
    const cpiHost = new URL(creds.cpiApiBase).hostname;

    return fetchToken(overrides).then((token) => {
        const headers = {
            Authorization: "Bearer " + token.access_token,
            Accept: "application/json",
            ...extraHeaders,
        };
        if (body) {
            headers["Content-Type"] = "application/json";
            headers["Content-Length"] = Buffer.byteLength(body);
        }

        return new Promise((resolve, reject) => {
            const opts = {
                hostname: cpiHost,
                port: 443,
                path: apiPath,
                method,
                headers,
            };
            const req = https.request(opts, (res) => {
                let data = "";
                res.on("data", (c) => (data += c));
                res.on("end", () =>
                    resolve({
                        status: res.statusCode,
                        body: data,
                        headers: res.headers,
                        cpiMessageId:
                            res.headers["sap_messageprocessinglogid"] ||
                            res.headers["sap-message-id"],
                        cpiDataStoreId: res.headers["sapdatastoreid"],
                    })
                );
            });
            req.on("error", reject);
            if (body) req.write(body);
            req.end();
        });
    });
}

function pushToCpi(body, overrides = null) {
    const creds = resolveCreds(overrides);
    if (!creds.cpiApiBase) {
        return Promise.reject(new Error("BTP CPI API Base URL not configured. Set it in BTP Settings."));
    }
    const cpiBase = creds.cpiApiBase;

    return fetchToken(overrides).then((token) => {
        const url = new URL(cpiBase + "/http/tally-write");
        return new Promise((resolve, reject) => {
            const opts = {
                hostname: url.hostname,
                port: 443,
                path: url.pathname + url.search,
                method: "POST",
                headers: {
                    Authorization: "Bearer " + token.access_token,
                    "Content-Type": "application/json",
                    "Content-Length": Buffer.byteLength(body),
                    Accept: "application/json",
                    SapDataStoreId: "ALL_RECORDS",
                },
            };
            const req = https.request(opts, (res) => {
                let data = "";
                res.on("data", (c) => (data += c));
                res.on("end", () =>
                    resolve({
                        status: res.statusCode,
                        body: data,
                        cpiMessageId:
                            res.headers["sap_messageprocessinglogid"] ||
                            res.headers["sap-message-id"],
                        cpiDataStoreId: res.headers["sapdatastoreid"],
                    })
                );
            });
            req.on("error", reject);
            req.write(body);
            req.end();
        });
    });
}

module.exports = { fetchToken, cpiRequest, pushToCpi, resolveCreds };
