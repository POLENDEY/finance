import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: resolve(process.cwd(), ".env.local") });

const anon = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);
const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const anonResult = await anon.from("profile").select("id").limit(1);
const adminResult = await admin.from("profile").select("id").limit(1);

console.log("anon access:", anonResult.error?.message ?? "allowed");
console.log("service role access:", adminResult.error?.message ?? "allowed");
