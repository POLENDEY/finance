import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: resolve(process.cwd(), ".env.local") });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const tables = [
  "profile",
  "balance_cards",
  "transactions",
  "fund_transfers",
  "password_reset_otps",
];

let ok = true;
for (const table of tables) {
  const { error, count } = await supabase
    .from(table)
    .select("*", { count: "exact", head: true });
  if (error) {
    ok = false;
    console.log(`FAIL ${table}: ${error.message}`);
  } else {
    console.log(`OK   ${table} (rows: ${count})`);
  }
}

process.exit(ok ? 0 : 1);
