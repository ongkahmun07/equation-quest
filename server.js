const http = require("http");
const fs = require("fs");
const path = require("path");

const rootDir = __dirname;
const port = process.env.PORT || 3000;
const env = loadEnvFile(path.join(rootDir, ".env"));
const apiKey = process.env.GEMINI_API_KEY || env.GEMINI_API_KEY;
const rateLimitWindowMs = 60 * 1000;
const maxRequestsPerWindow = 20;
const maxPromptLength = 4000;
const maxInlineImageBytes = 5 * 1024 * 1024;
const maxRequestBodyLength = 8 * 1024 * 1024;
const ipRequestLog = new Map();

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
};

const server = http.createServer(async (req, res) => {
  if (req.method === "POST" && req.url === "/api/generate") {
    await handleGenerate(req, res);
    return;
  }

  if (req.method !== "GET") {
    sendJson(res, 405, { error: "Method not allowed." });
    return;
  }

  const requestedPath = req.url === "/" ? "/index.html" : req.url;
  const safePath = path.normalize(requestedPath).replace(/^\\+|^\/+/, "");
  const filePath = path.join(rootDir, safePath);

  if (!filePath.startsWith(rootDir)) {
    sendJson(res, 403, { error: "Forbidden." });
    return;
  }

  fs.readFile(filePath, (error, content) => {
    if (error) {
      sendJson(res, 404, { error: "File not found." });
      return;
    }

    const extension = path.extname(filePath);
    res.writeHead(200, { "Content-Type": mimeTypes[extension] || "application/octet-stream" });
    res.end(content);
  });
});

async function handleGenerate(req, res) {
  if (!apiKey || apiKey === "your_gemini_api_key_here") {
    sendJson(res, 500, { error: "Missing GEMINI_API_KEY in .env." });
    return;
  }

  const clientIp = getClientIp(req);
  if (!allowRequestForIp(clientIp)) {
    sendJson(res, 429, {
      error: "Too many requests. Please wait a moment and try again.",
    });
    return;
  }

  let rawBody = "";
  for await (const chunk of req) {
    rawBody += chunk;

    if (rawBody.length > maxRequestBodyLength) {
      sendJson(res, 413, { error: "Request body is too large." });
      return;
    }
  }

  let body;
  try {
    body = JSON.parse(rawBody || "{}");
  } catch {
    sendJson(res, 400, { error: "Invalid JSON body." });
    return;
  }

  const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
  const imageData = typeof body.imageData === "string" ? body.imageData.trim() : "";
  const imageMimeType = typeof body.imageMimeType === "string" ? body.imageMimeType.trim() : "";

  if (!prompt) {
    sendJson(res, 400, { error: "Prompt is required." });
    return;
  }

  if (prompt.length > maxPromptLength) {
    sendJson(res, 400, { error: "Prompt is too long." });
    return;
  }

  if (imageData) {
    if (!imageMimeType.startsWith("image/")) {
      sendJson(res, 400, { error: "Unsupported image type." });
      return;
    }

    const approxBytes = Math.ceil((imageData.length * 3) / 4);
    if (approxBytes > maxInlineImageBytes) {
      sendJson(res, 400, { error: "Image is too large." });
      return;
    }
  }

  try {
    const parts = [{ text: prompt }];
    if (imageData) {
      parts.unshift({
        inline_data: {
          mime_type: imageMimeType,
          data: imageData,
        },
      });
    }

    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts,
          },
        ],
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      const message = data?.error?.message || "Gemini request failed.";
      sendJson(res, response.status, { error: message });
      return;
    }

    const text = extractText(data);
    sendJson(res, 200, { text });
  } catch {
    sendJson(res, 500, { error: "Unable to reach the Gemini API from this server." });
  }
}

function extractText(data) {
  const parts = data?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) {
    return "";
  }

  return parts
    .map((part) => part.text || "")
    .join("\n")
    .trim();
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload));
}

function getClientIp(req) {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.trim()) {
    return forwarded.split(",")[0].trim();
  }

  return req.socket.remoteAddress || "unknown";
}

function allowRequestForIp(ip) {
  const now = Date.now();
  const recentRequests = (ipRequestLog.get(ip) || []).filter((time) => now - time < rateLimitWindowMs);

  if (recentRequests.length >= maxRequestsPerWindow) {
    ipRequestLog.set(ip, recentRequests);
    return false;
  }

  recentRequests.push(now);
  ipRequestLog.set(ip, recentRequests);
  cleanupOldIps(now);
  return true;
}

function cleanupOldIps(now) {
  for (const [ip, times] of ipRequestLog.entries()) {
    const freshTimes = times.filter((time) => now - time < rateLimitWindowMs);
    if (freshTimes.length === 0) {
      ipRequestLog.delete(ip);
      continue;
    }

    ipRequestLog.set(ip, freshTimes);
  }
}

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  const result = {};
  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim();
    result[key] = value;
  }

  return result;
}

server.listen(port, "0.0.0.0", () => {
  console.log(`Equation Quest running on port ${port}`);
});
