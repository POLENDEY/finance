import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import dotenv from "dotenv";

dotenv.config({ path: resolve(process.cwd(), ".env.local") });

const projectRef = "mgmjawvtxmayhgqhucyb";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!serviceRoleKey) {
  console.error("Missing SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const migrationPath = resolve(
  process.cwd(),
  "supabase/migrations/20260706163000_create_profiles.sql"
);
const sql = readFileSync(migrationPath, "utf8");

async function runQuery(query) {
  const response = await fetch(
    `https://api.supabase.com/v1/projects/${projectRef}/database/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${serviceRoleKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query }),
    }
  );

  const text = await response.text();
  return { ok: response.ok, status: response.status, text };
}

async function main() {
  console.log("Testing Supabase Management API...");
  const test = await runQuery("SELECT 1 AS ok");
  console.log(`Test response (${test.status}):`, test.text);

  if (!test.ok) {
    process.exit(1);
  }

  console.log("Applying migration...");
  const result = await runQuery(sql);
  console.log(`Migration response (${result.status}):`, result.text);

  if (!result.ok) {
    process.exit(1);
  }

  console.log("Migration applied successfully.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
