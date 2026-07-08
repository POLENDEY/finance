import { createAdminClient } from "@/lib/supabase/admin";
import type { FundTransfer } from "@/lib/types/finance";

export async function getFundTransfers(profileId: number) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("fund_transfers")
    .select(
      "id, profile_id, from_card_id, to_card_id, amount, created_at, from_card:from_card_id(name), to_card:to_card_id(name)"
    )
    .eq("profile_id", profileId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => ({
    ...row,
    amount: Number(row.amount),
    from_card: Array.isArray(row.from_card) ? row.from_card[0] : row.from_card,
    to_card: Array.isArray(row.to_card) ? row.to_card[0] : row.to_card,
  })) as FundTransfer[];
}

export async function recordFundTransfer(
  profileId: number,
  fromCardId: number,
  toCardId: number,
  amount: number
) {
  const supabase = createAdminClient();
  const { error } = await supabase.from("fund_transfers").insert({
    profile_id: profileId,
    from_card_id: fromCardId,
    to_card_id: toCardId,
    amount,
  });

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}
