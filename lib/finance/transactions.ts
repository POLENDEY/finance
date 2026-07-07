import { createAdminClient } from "@/lib/supabase/admin";
import type { DeductFrom, FinanceSummary, Transaction, TransactionType } from "@/lib/types/finance";

export async function getTransactions(profileId: number) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("transactions")
    .select(
      "id, profile_id, type, amount, description, category, deduct_from, created_at"
    )
    .eq("profile_id", profileId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => ({
    ...row,
    amount: Number(row.amount),
  })) as Transaction[];
}

export function getFinanceSummary(transactions: Transaction[]): FinanceSummary {
  const totalDeposits = transactions
    .filter((t) => t.type === "deposit")
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpenses = transactions
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + t.amount, 0);

  return {
    totalDeposits,
    totalExpenses,
    balance: totalDeposits - totalExpenses,
  };
}

export async function addTransaction(input: {
  profileId: number;
  type: TransactionType;
  amount: number;
  description: string;
  category: string | null;
  deductFrom?: DeductFrom | null;
}) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("transactions")
    .insert({
      profile_id: input.profileId,
      type: input.type,
      amount: input.amount,
      description: input.description,
      category: input.category,
      deduct_from: input.deductFrom ?? "allowance",
    })
    .select("id")
    .single();

  if (error) {
    return { error: error.message };
  }

  return { id: data.id as number };
}

export async function deleteTransaction(profileId: number, transactionId: number) {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("transactions")
    .delete()
    .eq("id", transactionId)
    .eq("profile_id", profileId);

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}
