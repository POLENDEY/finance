import { resolve } from "node:path";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import { createClient } from "@supabase/supabase-js";

dotenv.config({ path: resolve(process.cwd(), ".env.local") });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const testUsername = `testuser_${Date.now()}`;
const testPassword = "testpass123";
const hash = await bcrypt.hash(testPassword, 10);

const { data, error } = await supabase
  .from("profile")
  .insert({
    username: testUsername,
    full_name: "Test User",
    password: hash,
  })
  .select("id, username")
  .single();

if (error) {
  console.error("Insert failed:", error.message);
  process.exit(1);
}

console.log("Created test user:", data);

const { data: found } = await supabase
  .from("profile")
  .select("password")
  .eq("username", testUsername)
  .single();

const valid = await bcrypt.compare(
  testPassword,
  found.password.replace(/^\$2y\$/, "$2a$")
);
console.log("Password verify:", valid);

await supabase.from("profile").delete().eq("id", data.id);
console.log("Cleaned up test user.");
