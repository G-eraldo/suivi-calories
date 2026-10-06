import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { createPgConfig } from "../server/pg-config.js";

test("chiffre la connexion sans certificat CA à fournir", () => {
  const config = createPgConfig(
    "postgresql://user:secret@pooler.example.com:5432/postgres",
  );
  assert.deepEqual(config.ssl, { rejectUnauthorized: false });
});

test("charge le certificat CA sans désactiver la vérification TLS", () => {
  const directory = mkdtempSync(join(tmpdir(), "miametrie-ca-"));
  try {
    const certificate = join(directory, "ca.crt");
    writeFileSync(certificate, "certificat de test");
    const config = createPgConfig(
      "postgresql://user:secret@pooler.example.com:5432/postgres",
      certificate,
    );
    assert.equal(config.ssl.ca, "certificat de test");
    assert.equal(config.ssl.rejectUnauthorized, true);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("accepte le certificat CA directement depuis une variable d'environnement", () => {
  const config = createPgConfig(
    "postgresql://user:secret@pooler.example.com:5432/postgres",
    undefined,
    "-----BEGIN CERTIFICATE-----\ncertificat de test\n-----END CERTIFICATE-----",
  );
  assert.match(config.ssl.ca, /BEGIN CERTIFICATE/);
  assert.equal(config.ssl.rejectUnauthorized, true);
});

test("refuse deux sources de certificat simultanées", () => {
  assert.throws(
    () => createPgConfig("postgresql://user:secret@pooler.example.com/postgres", "ca.crt", "ca"),
    /pas les deux/,
  );
});

test("refuse les options URL qui écraseraient le certificat CA", () => {
  assert.throws(
    () => createPgConfig("postgresql://user:secret@pooler.example.com/postgres?sslmode=require"),
    /Retire sslmode/,
  );
});
