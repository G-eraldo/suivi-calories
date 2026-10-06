import { createHash, createHmac, timingSafeEqual } from "node:crypto";

const sessionSeconds = 90 * 24 * 60 * 60;
const cookieName = "__Host-miametrie-session";

export function createAuth(username, password, now = () => Date.now()) {
  const expectedHash = createHash("sha256")
    .update(`${username}:${password}`)
    .digest();
  const signingKey = createHash("sha256")
    .update(`miametrie-session-v1:${username}:${password}`)
    .digest();

  function basicAuthorized(header) {
    if (!header?.startsWith("Basic ")) return false;
    const supplied = Buffer.from(header.slice(6), "base64").toString("utf8");
    const suppliedHash = createHash("sha256").update(supplied).digest();
    return timingSafeEqual(expectedHash, suppliedHash);
  }

  function signature(expiry) {
    return createHmac("sha256", signingKey).update(String(expiry)).digest("hex");
  }

  function sessionExpiry(cookieHeader) {
    const value = cookieHeader?.split(";").map((part) => part.trim())
      .find((part) => part.startsWith(`${cookieName}=`))?.slice(cookieName.length + 1);
    const match = /^(\d{10})\.([a-f0-9]{64})$/.exec(value || "");
    if (!match) return 0;
    const expiry = Number(match[1]);
    if (expiry <= Math.floor(now() / 1000)) return 0;
    const received = Buffer.from(match[2], "hex");
    return timingSafeEqual(received, Buffer.from(signature(expiry), "hex")) ? expiry : 0;
  }

  function sessionCookie() {
    const expiry = Math.floor(now() / 1000) + sessionSeconds;
    return `${cookieName}=${expiry}.${signature(expiry)}; Path=/; Max-Age=${sessionSeconds}; HttpOnly; Secure; SameSite=Lax`;
  }

  function authenticate(headers) {
    const expiry = sessionExpiry(headers.cookie);
    if (expiry) return {
      authorized: true,
      setCookie: expiry - Math.floor(now() / 1000) < sessionSeconds / 2 ? sessionCookie() : null,
    };
    if (basicAuthorized(headers.authorization)) return { authorized: true, setCookie: sessionCookie() };
    return { authorized: false, setCookie: null };
  }

  return { authenticate };
}
