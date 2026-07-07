import { createAdminClient } from "@/lib/supabase/admin";
import type { FundTransfer, FundTransferDirection } from "@/lib/types/finance";

export async function getFundTransfers(profileId: number) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("fund_transfers")
    .select("id, profile_id, direction, amount, created_at")
    .eq("profile_id", profileId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => ({
    ...row,
    amount: Number(row.amount),
  })) as FundTransfer[];
}

export async function recordFundTransfer(
  profileId: number,
  direction: FundTransferDirection,
  amount: number
) {
  const supabase = createAdminClient();
  const { error } = await supabase.from("fund_transfers").insert({
    profile_id: profileId,
    direction,
    amount,
  });

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}
