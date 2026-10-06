import { readFileSync, readdirSync } from "node:fs";
import { createServer } from "node:http";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { createD1Adapter } from "./postgres.js";
import { createPgConfig } from "./pg-config.js";
import { createHandler } from "./worker.js";
import { createAuth } from "./auth.js";

const publicRoot = fileURLToPath(new URL("../.output/public/", import.meta.url));
const assets = {};
function collectAssets(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) collectAssets(path);
    else assets[relative(publicRoot, path).replaceAll("\\", "/")] =
      readFileSync(path).toString("base64");
  }
}
collectAssets(publicRoot);
const handler = createHandler(assets);

const username = process.env.APP_USERNAME;
const password = process.env.APP_PASSWORD;
if (!username || !password)
  throw new Error(
    "Définis APP_USERNAME et APP_PASSWORD dans les variables Dokploy.",
  );
const auth = createAuth(username, password);
const databaseUrl = process.env.SUPABASE_DATABASE_URL;
if (!databaseUrl)
  throw new Error("Définis SUPABASE_DATABASE_URL dans les variables Dokploy.");
let parsedDatabaseUrl;
try {
  parsedDatabaseUrl = new URL(databaseUrl);
} catch {
  throw new Error("SUPABASE_DATABASE_URL doit être une URL PostgreSQL valide.");
}
if (
  !["postgres:", "postgresql:"].includes(parsedDatabaseUrl.protocol) ||
  /POOLER_HOST|PROJECT_REF|YOUR-PASSWORD|PASSWORD/i.test(databaseUrl)
) {
  throw new Error(
    "SUPABASE_DATABASE_URL contient une valeur d'exemple. Copie l'URL Session pooler complète depuis Supabase > Connect, avec ton vrai mot de passe de base de données.",
  );
}
const pool = new pg.Pool(
  createPgConfig(
    databaseUrl,
    process.env.SUPABASE_CA_FILE,
    process.env.SUPABASE_CA,
  ),
);
pool.on("error", (error) =>
  console.error("Connexion Supabase interrompue", error),
);
await pool.query("SELECT 1 FROM miametrie.settings LIMIT 0");
const DB = createD1Adapter(pool);

const server = createServer(async (req, res) => {
  if (req.url === "/health") {
    res.writeHead(200).end("ok");
    return;
  }
  const publicAsset = (req.method === "GET" || req.method === "HEAD") &&
    ["/apple-touch-icon.png", "/icon-192.png", "/icon-512.png", "/favicon.svg", "/site.webmanifest"].includes(req.url?.split("?")[0]);
  const access = publicAsset ? { authorized: true, setCookie: null } : auth.authenticate(req.headers);
  if (!access.authorized) {
    res
      .writeHead(401, {
        "WWW-Authenticate": 'Basic realm="Miamétrie", charset="UTF-8"',
      })
      .end("Authentification requise.");
    return;
  }
  try {
    const chunks = [];
    let size = 0;
    for await (const chunk of req) {
      size += chunk.length;
      if (size > 1024 * 1024) {
        res.writeHead(413).end("Requête trop volumineuse.");
        return;
      }
      chunks.push(chunk);
    }
    const headers = new Headers(req.headers);
    headers.set("oai-authenticated-user-id", "owner");
    const request = new Request(`http://localhost${req.url}`, {
      method: req.method,
      headers,
      body: chunks.length ? Buffer.concat(chunks) : undefined,
      duplex: "half",
    });
    const response = await handler.fetch(request, { DB });
    const responseHeaders = Object.fromEntries(response.headers);
    if (access.setCookie) responseHeaders["Set-Cookie"] = access.setCookie;
    res.writeHead(response.status, responseHeaders);
    res.end(Buffer.from(await response.arrayBuffer()));
  } catch (error) {
    console.error("Request failed", error);
    if (!res.headersSent) res.writeHead(500).end("Erreur du serveur.");
  }
});

const port = Number(process.env.PORT || 3000);
server.listen(port, "0.0.0.0", () =>
  console.log(`Miamétrie écoute sur le port ${port}`),
);
