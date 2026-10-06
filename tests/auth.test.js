import assert from "node:assert/strict";
import test from "node:test";
import { createAuth } from "../server/auth.js";

test("a Basic login creates a durable cookie accepted on later requests", () => {
  let now = Date.UTC(2026, 9, 6);
  const auth = createAuth("owner", "secret", () => now);
  const basic = `Basic ${Buffer.from("owner:secret").toString("base64")}`;
  const first = auth.authenticate({ authorization: basic });
  assert.equal(first.authorized, true);
  assert.match(first.setCookie, /Max-Age=7776000; HttpOnly; Secure; SameSite=Lax/);
  const cookie = first.setCookie.split(";")[0];
  assert.equal(auth.authenticate({ cookie }).authorized, true);
  assert.equal(auth.authenticate({ cookie }).setCookie, null);

  now += 46 * 24 * 60 * 60 * 1000;
  assert.ok(auth.authenticate({ cookie }).setCookie);
  now += 45 * 24 * 60 * 60 * 1000;
  assert.equal(auth.authenticate({ cookie }).authorized, false);
});

test("invalid or password-rotated sessions are rejected", () => {
  const auth = createAuth("owner", "secret", () => Date.UTC(2026, 9, 6));
  const cookie = auth.authenticate({ authorization: `Basic ${Buffer.from("owner:secret").toString("base64")}` }).setCookie.split(";")[0];
  assert.equal(auth.authenticate({ authorization: "Basic eDp5" }).authorized, false);
  assert.equal(auth.authenticate({ cookie: cookie.slice(0, -1) + "0" }).authorized, false);
  assert.equal(createAuth("owner", "changed", () => Date.UTC(2026, 9, 6)).authenticate({ cookie }).authorized, false);
});
