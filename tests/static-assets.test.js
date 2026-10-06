import assert from "node:assert/strict";
import test from "node:test";
import { createHandler } from "../server/worker.js";

test("home screen metadata can refresh while fingerprinted bundles stay cached", async () => {
  const content = Buffer.from("ok").toString("base64");
  const handler = createHandler({ "index.html": content, "apple-touch-icon.png": content, "site.webmanifest": content, "_nuxt/entry.abcdefgh.js": content });
  for (const path of ["/", "/apple-touch-icon.png", "/site.webmanifest"]) {
    const response = await handler.fetch(new Request(`http://localhost${path}`), {});
    assert.equal(response.headers.get("Cache-Control"), "no-cache");
  }
  const bundle = await handler.fetch(new Request("http://localhost/_nuxt/entry.abcdefgh.js"), {});
  assert.match(bundle.headers.get("Cache-Control"), /immutable/);
});
