import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import pg from "pg";
import dotenv from "dotenv";

dotenv.config({ path: resolve(process.cwd(), ".env.local") });

const projectRef = "mgmjawvtxmayhgqhucyb";
const password = process.env.SUPABASE_DB_PASSWORD;

if (!password) {
  console.error(
    "Missing SUPABASE_DB_PASSWORD in .env.local\n\n" +
      "Get it from Supabase Dashboard → Project Settings → Database → Reset database password\n" +
      "Then add: SUPABASE_DB_PASSWORD=your-password"
  );
  process.exit(1);
}

const connectionString =
  process.env.SUPABASE_DB_URL ??
  `postgresql://postgres.${projectRef}:${encodeURIComponent(password)}@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres`;

const migrationPath = resolve(
  process.cwd(),
  "supabase/migrations/20260706163000_create_profiles.sql"
);
const sql = readFileSync(migrationPath, "utf8");

const client = new pg.Client({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

async function main() {
  console.log("Connecting to Supabase database...");
  await client.connect();
  console.log("Applying migration...");
  await client.query(sql);
  console.log("Done. profiles table and auth triggers are ready.");
}

main()
  .catch((error) => {
    console.error("Migration failed:", error.message);
    process.exit(1);
  })
  .finally(() => client.end());
