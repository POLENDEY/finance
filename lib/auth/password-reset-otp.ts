import bcrypt from "bcryptjs";
import { createAdminClient } from "@/lib/supabase/admin";

const OTP_TTL_MINUTES = 10;

function generateOtpCode() {
  const code = Math.floor(100000 + Math.random() * 900000);
  return String(code);
}

export async function createPasswordResetOtp(profileId: number) {
  const code = generateOtpCode();
  const codeHash = await bcrypt.hash(code, 10);
  const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);

  const supabase = createAdminClient();

  await supabase
    .from("password_reset_otps")
    .delete()
    .eq("profile_id", profileId)
    .is("used_at", null);

  const { error } = await supabase.from("password_reset_otps").insert({
    profile_id: profileId,
    code_hash: codeHash,
    expires_at: expiresAt.toISOString(),
  });

  if (error) {
    return { error: error.message };
  }

  return { code, expiresAt };
}

export async function verifyPasswordResetOtp(profileId: number, otp: string) {
  if (!/^\d{6}$/.test(otp.trim())) {
    return { error: "Enter the 6-digit code from your email." };
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("password_reset_otps")
    .select("id, code_hash, expires_at, used_at")
    .eq("profile_id", profileId)
    .is("used_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    return { error: error.message };
  }

  if (!data) {
    return { error: "No active reset code. Request a new one." };
  }

  if (data.used_at) {
    return { error: "This code has already been used." };
  }

  if (new Date(data.expires_at) < new Date()) {
    return { error: "This code has expired. Request a new one." };
  }

  const valid = await bcrypt.compare(otp.trim(), data.code_hash);
  if (!valid) {
    return { error: "Invalid code. Check your email and try again." };
  }

  await supabase
    .from("password_reset_otps")
    .update({ used_at: new Date().toISOString() })
    .eq("id", data.id);

  return { success: true };
}
