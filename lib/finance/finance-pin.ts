import bcrypt from "bcryptjs";
import { createAdminClient } from "@/lib/supabase/admin";

export type FinancePinSettings = {
  pin_hash: string | null;
  pin_required: boolean;
};

export function isValidPin(pin: string) {
  return /^\d{6}$/.test(pin);
}

export async function getFinancePinSettings(profileId: number) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("profile")
    .select("net_worth_pin_hash, net_worth_pin_required")
    .eq("id", profileId)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return {
    pin_hash: data.net_worth_pin_hash as string | null,
    pin_required: data.net_worth_pin_required ?? true,
  } as FinancePinSettings;
}

export async function verifyFinancePin(profileId: number, pin: string) {
  const settings = await getFinancePinSettings(profileId);
  if (!settings.pin_hash) {
    return { error: "PIN not set." };
  }
  const valid = await bcrypt.compare(pin, settings.pin_hash);
  if (!valid) {
    return { error: "Incorrect PIN." };
  }
  return { success: true };
}

export async function setFinancePin(profileId: number, pin: string) {
  if (!isValidPin(pin)) {
    return { error: "PIN must be exactly 6 digits." };
  }

  const settings = await getFinancePinSettings(profileId);
  if (settings.pin_hash) {
    return { error: "PIN is already set." };
  }

  const hash = await bcrypt.hash(pin, 10);
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("profile")
    .update({ net_worth_pin_hash: hash })
    .eq("id", profileId);

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}

export async function changeFinancePin(
  profileId: number,
  currentPin: string,
  newPin: string
) {
  if (!isValidPin(newPin)) {
    return { error: "New PIN must be exactly 6 digits." };
  }

  const verifyResult = await verifyFinancePin(profileId, currentPin);
  if ("error" in verifyResult && verifyResult.error) {
    return { error: verifyResult.error };
  }

  const hash = await bcrypt.hash(newPin, 10);
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("profile")
    .update({ net_worth_pin_hash: hash })
    .eq("id", profileId);

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}

export async function setFinancePinRequired(profileId: number, pinRequired: boolean) {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("profile")
    .update({ net_worth_pin_required: pinRequired })
    .eq("id", profileId);

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}
