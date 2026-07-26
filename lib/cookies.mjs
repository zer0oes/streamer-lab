/** Parse l'en-tete Cookie brut en objet { nom: valeur }. */
export function parseCookies(headerValue) {
  const cookies = {};
  if (!headerValue) return cookies;
  for (const pair of headerValue.split(";")) {
    const trimmed = pair.trim();
    if (!trimmed) continue;
    const separator = trimmed.indexOf("=");
    if (separator === -1) continue;
    const name = trimmed.slice(0, separator).trim();
    const value = trimmed.slice(separator + 1).trim();
    if (!name) continue;
    cookies[name] = decodeURIComponent(value);
  }
  return cookies;
}

/** Construit une valeur d'en-tete Set-Cookie. maxAgeSeconds absent = cookie de session (navigateur). */
export function serializeCookie(name, value, { maxAgeSeconds, secure = false, path = "/" } = {}) {
  const parts = [`${name}=${encodeURIComponent(value)}`, `Path=${path}`, "HttpOnly", "SameSite=Lax"];
  if (typeof maxAgeSeconds === "number") parts.push(`Max-Age=${Math.max(0, Math.floor(maxAgeSeconds))}`);
  if (secure) parts.push("Secure");
  return parts.join("; ");
}
