import { createAdminClient } from "@/lib/supabase/admin";
import type { FinanceSummary, Transaction, TransactionType } from "@/lib/types/finance";

export type TransactionWithCard = Transaction & { card_name?: string };

export async function getTransactions(profileId: number) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("transactions")
    .select(
      "id, profile_id, type, amount, description, category, card_id, deduct_from, created_at, balance_cards(name)"
    )
    .eq("profile_id", profileId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => {
    const cardRelation = row.balance_cards as { name: string } | { name: string }[] | null;
    const cardName = Array.isArray(cardRelation)
      ? cardRelation[0]?.name
      : cardRelation?.name;

    return {
      id: row.id,
      profile_id: row.profile_id,
      type: row.type,
      amount: Number(row.amount),
      description: row.description,
      category: row.category,
      card_id: row.card_id,
      deduct_from: row.deduct_from,
      created_at: row.created_at,
      card_name: cardName,
    } as TransactionWithCard;
  });
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
  cardId: number;
  createdAt: string;
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
      card_id: input.cardId,
      created_at: input.createdAt,
    })
    .select("id")
    .single();

  if (error) {
    return { error: error.message };
  }

  return { id: data.id as number };
}

export async function getTransaction(profileId: number, transactionId: number) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("transactions")
    .select("id, type, amount, description, category, card_id, created_at")
    .eq("profile_id", profileId)
    .eq("id", transactionId)
    .single();

  if (error) {
    return { error: error.message };
  }

  return {
    transaction: {
      ...data,
      amount: Number(data.amount),
    },
  };
}

export async function updateTransaction(
  profileId: number,
  transactionId: number,
  input: {
    type: TransactionType;
    amount: number;
    description: string;
    category: string | null;
    cardId: number;
    createdAt: string;
  }
) {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("transactions")
    .update({
      type: input.type,
      amount: input.amount,
      description: input.description,
      category: input.category,
      card_id: input.cardId,
      created_at: input.createdAt,
    })
    .eq("profile_id", profileId)
    .eq("id", transactionId);

  if (error) {
    return { error: error.message };
  }

  return { success: true };
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
