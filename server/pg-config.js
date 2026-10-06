import { readFileSync } from "node:fs";

export function createPgConfig(connectionString, caFile, caValue) {
  const url = new URL(connectionString);
  if (caFile && caValue) {
    throw new Error("Définis SUPABASE_CA ou SUPABASE_CA_FILE, pas les deux.");
  }
  for (const option of ["sslmode", "sslcert", "sslkey", "sslrootcert"]) {
    if (url.searchParams.has(option)) {
      throw new Error(
        `Retire ${option} de SUPABASE_DATABASE_URL : TLS est configuré par l'application.`,
      );
    }
  }
  return {
    connectionString,
    ssl: {
      rejectUnauthorized: Boolean(caFile || caValue),
      ...(caValue
        ? { ca: caValue }
        : caFile
          ? { ca: readFileSync(caFile, "utf8") }
          : {}),
    },
    max: 3,
    connectionTimeoutMillis: 10000,
    idleTimeoutMillis: 30000,
  };
}
