import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import dotenv from "dotenv";
import pg from "pg";

dotenv.config({ path: resolve(process.cwd(), ".env.local") });

const password = process.env.SUPABASE_DB_PASSWORD;
if (!password) {
  console.error("Missing SUPABASE_DB_PASSWORD");
  process.exit(1);
}

const encoded = encodeURIComponent(password);
const projectRef = "mgmjawvtxmayhgqhucyb";
const urls = [
  process.env.SUPABASE_DB_URL,
  `postgresql://postgres.${projectRef}:${encoded}@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres`,
].filter(Boolean);

const migrationsDir = resolve(process.cwd(), "supabase/migrations");
const files = readdirSync(migrationsDir)
  .filter((f) => f.endsWith(".sql"))
  .sort();

for (const url of urls) {
  const client = new pg.Client({
    connectionString: url,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    for (const file of files) {
      const sql = readFileSync(resolve(migrationsDir, file), "utf8");
      await client.query(sql);
      console.log("Applied:", file);
    }
    await client.end();
    process.exit(0);
  } catch (e) {
    console.log("fail:", e.message?.slice(0, 100));
    try {
      await client.end();
    } catch {}
  }
}

process.exit(1);
