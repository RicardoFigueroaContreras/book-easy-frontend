// Cloudflare Worker to serve the built SPA from an R2 bucket
// - Looks up static assets by path in STATIC_BUCKET (R2 binding)
// - SPA fallback: serves index.html when a path isn't found
// - Sensible cache headers: long cache for hashed assets, short for HTML

const TEXT_TYPES = new Set([".html", ".css", ".js", ".json", ".svg", ".xml", ".txt", ".csv", ".map"]);

function contentTypeFromExt(pathname) {
  const lower = pathname.toLowerCase();
  const ext = lower.slice(lower.lastIndexOf("."));
  switch (ext) {
    case ".html": return "text/html; charset=utf-8";
    case ".css": return "text/css; charset=utf-8";
    case ".js": return "application/javascript; charset=utf-8";
    case ".json": return "application/json; charset=utf-8";
    case ".svg": return "image/svg+xml";
    case ".png": return "image/png";
    case ".jpg":
    case ".jpeg": return "image/jpeg";
    case ".gif": return "image/gif";
    case ".webp": return "image/webp";
    case ".ico": return "image/x-icon";
    case ".xml": return "application/xml; charset=utf-8";
    case ".txt": return "text/plain; charset=utf-8";
    case ".csv": return "text/csv; charset=utf-8";
    case ".mp4": return "video/mp4";
    case ".woff": return "font/woff";
    case ".woff2": return "font/woff2";
    default: return "application/octet-stream";
  }
}

function isHashedAsset(pathname) {
  // crude check for vite-style hashed files: name.[hash].ext
  // e.g., assets/index-ABC12345.js
  const base = pathname.split("/").pop() || "";
  const parts = base.split(".");
  return parts.length >= 3 && /[a-f0-9]{6,}/i.test(parts[parts.length - 2]);
}

function cacheHeaders(pathname) {
  // Long cache for hashed assets. Short/no cache for HTML and non-hashed.
  if (pathname.endsWith(".html")) {
    return {
      "Cache-Control": "no-cache, no-store, must-revalidate",
      Pragma: "no-cache",
      Expires: "0",
    };
  }
  if (isHashedAsset(pathname)) {
    return {
      "Cache-Control": "public, max-age=31536000, immutable",
    };
  }
  return {
    "Cache-Control": "public, max-age=300",
  };
}

async function getFromR2(bucket, key) {
  const object = await bucket.get(key);
  if (!object) return null;
  const headers = new Headers();
  headers.set("Content-Length", object.size.toString());
  headers.set("Content-Type", contentTypeFromExt(key));
  Object.entries(cacheHeaders(key)).forEach(([k, v]) => headers.set(k, v));
  // For text types, return as text to ensure charset; otherwise stream body
  const isText = TEXT_TYPES.has(key.slice(key.lastIndexOf(".")) || "");
  if (isText) {
    const text = await object.text();
    return new Response(text, { status: 200, headers });
  }
  return new Response(object.body, { status: 200, headers });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    let key = url.pathname;
    if (key === "/" || key === "") key = "/index.html";
    // strip leading slash for R2 object keys
    key = key.replace(/^\//, "");

    // Try exact match
    let res = await getFromR2(env.STATIC_BUCKET, key);
    if (res) return res;

    // For SPA routes, fall back to index.html
    res = await getFromR2(env.STATIC_BUCKET, "index.html");
    if (res) return res;

    return new Response("Not found", { status: 404 });
  },
};
