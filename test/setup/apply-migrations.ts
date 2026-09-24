import { applyD1Migrations } from "cloudflare:test";
import { env } from "cloudflare:workers";

// Setup-Dateien laufen außerhalb der Speicher-Isolation pro Testdatei und evtl. mehrfach.
// applyD1Migrations() wendet nur noch nicht angewandte Migrationen an.
await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);
