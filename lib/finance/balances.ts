import bcrypt from "bcryptjs";
import { recordFundTransfer } from "@/lib/finance/fund-transfers";
import { createAdminClient } from "@/lib/supabase/admin";

export type FinanceProfile = {
  id: number;
  username: string;
  full_name: string | null;
  net_worth: number;
  allowance_balance: number;
  net_worth_pin_hash: string | null;
  net_worth_pin_required: boolean;
};

export function isValidPin(pin: string) {
  return /^\d{6}$/.test(pin);
}

export async function getFinanceProfile(profileId: number) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("profile")
    .select(
      "id, username, full_name, net_worth, allowance_balance, net_worth_pin_hash, net_worth_pin_required"
    )
    .eq("id", profileId)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return {
    ...data,
    net_worth: Number(data.net_worth ?? 0),
    allowance_balance: Number(data.allowance_balance ?? 0),
    net_worth_pin_required: data.net_worth_pin_required ?? true,
  } as FinanceProfile;
}

export async function getFinanceProfileSafe(profileId: number) {
  try {
    return await getFinanceProfile(profileId);
  } catch {
    return null;
  }
}

export async function verifyNetWorthPin(profileId: number, pin: string) {
  const profile = await getFinanceProfile(profileId);
  if (!profile.net_worth_pin_hash) {
    return { error: "PIN not set." };
  }
  const valid = await bcrypt.compare(pin, profile.net_worth_pin_hash);
  if (!valid) {
    return { error: "Incorrect PIN." };
  }
  return { success: true };
}

export async function setNetWorthPin(profileId: number, pin: string) {
  if (!isValidPin(pin)) {
    return { error: "PIN must be exactly 6 digits." };
  }

  const profile = await getFinanceProfile(profileId);
  if (profile.net_worth_pin_hash) {
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

export async function setNetWorthPinRequired(
  profileId: number,
  pinRequired: boolean
) {
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

export async function transferToNetWorth(profileId: number, amount: number) {
  if (!Number.isFinite(amount) || amount <= 0) {
    return { error: "Enter a valid amount greater than zero." };
  }

  const profile = await getFinanceProfile(profileId);
  if (amount > profile.allowance_balance) {
    return { error: "Insufficient allowance balance." };
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("profile")
    .update({
      net_worth: profile.net_worth + amount,
      allowance_balance: profile.allowance_balance - amount,
    })
    .eq("id", profileId);

  if (error) {
    return { error: error.message };
  }

  const recorded = await recordFundTransfer(profileId, "to_net_worth", amount);
  if ("error" in recorded && recorded.error) {
    return { error: recorded.error };
  }

  return { success: true };
}

export async function transferToAllowance(profileId: number, amount: number) {
  if (!Number.isFinite(amount) || amount <= 0) {
    return { error: "Enter a valid amount greater than zero." };
  }

  const profile = await getFinanceProfile(profileId);
  if (amount > profile.net_worth) {
    return { error: "Insufficient net worth balance." };
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("profile")
    .update({
      net_worth: profile.net_worth - amount,
      allowance_balance: profile.allowance_balance + amount,
    })
    .eq("id", profileId);

  if (error) {
    return { error: error.message };
  }

  const recorded = await recordFundTransfer(profileId, "to_allowance", amount);
  if ("error" in recorded && recorded.error) {
    return { error: recorded.error };
  }

  return { success: true };
}

export async function adjustAllowanceBalance(
  profileId: number,
  delta: number
) {
  const profile = await getFinanceProfile(profileId);
  const next = profile.allowance_balance + delta;
  if (next < 0) {
    return { error: "Insufficient allowance balance." };
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("profile")
    .update({ allowance_balance: next })
    .eq("id", profileId);

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}

export async function deductFromNetWorth(profileId: number, amount: number) {
  if (!Number.isFinite(amount) || amount <= 0) {
    return { error: "Enter a valid amount greater than zero." };
  }

  const profile = await getFinanceProfile(profileId);
  if (amount > profile.net_worth) {
    return { error: "Insufficient net worth balance." };
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("profile")
    .update({ net_worth: profile.net_worth - amount })
    .eq("id", profileId);

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}

export async function addToNetWorth(profileId: number, amount: number) {
  if (!Number.isFinite(amount) || amount <= 0) {
    return { error: "Enter a valid amount greater than zero." };
  }

  const profile = await getFinanceProfile(profileId);
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("profile")
    .update({ net_worth: profile.net_worth + amount })
    .eq("id", profileId);

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}
