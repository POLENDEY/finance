import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import dotenv from "dotenv";
import pg from "pg";

dotenv.config({ path: resolve(process.cwd(), ".env.local") });

const file = process.argv[2] ?? "20260707090000_add_balances_and_pin.sql";
const password = process.env.SUPABASE_DB_PASSWORD;
const url = process.env.SUPABASE_DB_URL;

if (!password || !url) {
  console.error("Missing SUPABASE_DB_PASSWORD or SUPABASE_DB_URL");
  process.exit(1);
}

const sql = readFileSync(
  resolve(process.cwd(), "supabase/migrations", file),
  "utf8"
);

const client = new pg.Client({
  connectionString: url,
  ssl: { rejectUnauthorized: false },
});

try {
  await client.connect();
  await client.query(sql);
  console.log("Applied:", file);
} catch (e) {
  console.error("Failed:", e.message);
  process.exit(1);
} finally {
  await client.end();
}
