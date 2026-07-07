import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: resolve(process.cwd(), ".env.local") });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const { data, error } = await supabase.from("profile").select("*").limit(1);
console.log("profile table:", { data, error });

const { data: profiles, error: profilesError } = await supabase
  .from("profiles")
  .select("*")
  .limit(1);
console.log("profiles table:", { profiles, error: profilesError });
