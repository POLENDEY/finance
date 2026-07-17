"use server";

import {
  adjustCardBalance,
  getBalanceCards,
} from "@/lib/finance/balance-cards";
import { getFinancePinSettings } from "@/lib/finance/finance-pin";
import { getFundTransfers } from "@/lib/finance/fund-transfers";
import {
  addTransaction,
  deleteTransaction,
  getTransaction,
  getTransactions,
  updateTransaction,
} from "@/lib/finance/transactions";
import {
  dateInputToTransactionTimestamp,
  toDateInputValue,
} from "@/lib/finance/transaction-date";
import { getFinanceUnlockState } from "@/lib/auth/card-unlock";
import { loadBalanceCards } from "@/app/actions/cards";
import { getSession } from "@/lib/auth/session";
import { revalidatePath } from "next/cache";
import type { TransactionType } from "@/lib/types/finance";

export type FinanceActionState = {
  error?: string;
  success?: string;
};

function parseTransactionDate(formData: FormData) {
  const dateInput = ((formData.get("transactionDate") as string | null) ?? "").trim();
  const createdAt = dateInputToTransactionTimestamp(dateInput);
  if (!createdAt) {
    return { error: "Choose a valid transaction date." };
  }

  if (dateInput && dateInput > toDateInputValue(new Date())) {
    return { error: "Transaction date cannot be in the future." };
  }

  return { createdAt };
}

export async function createTransactionAction(
  _prev: FinanceActionState | null,
  formData: FormData
): Promise<FinanceActionState | null> {
  const session = await getSession();
  if (!session) {
    return { error: "You must be signed in." };
  }

  const type = formData.get("type") as TransactionType;
  const amountRaw = formData.get("amount") as string;
  const description = (formData.get("description") as string).trim();
  const category = (formData.get("category") as string | null)?.trim() || null;
  const cardId = Number.parseInt(formData.get("cardId") as string, 10);
  const dateResult = parseTransactionDate(formData);
  if ("error" in dateResult) {
    return { error: dateResult.error };
  }

  if (type !== "deposit" && type !== "expense") {
    return { error: "Invalid transaction type." };
  }

  const amount = Number.parseFloat(amountRaw);
  if (!Number.isFinite(amount) || amount <= 0) {
    return { error: "Enter a valid amount greater than zero." };
  }

  if (!description) {
    return { error: "Please enter a name or reason." };
  }

  if (type === "expense" && !category) {
    return { error: "Please select an expense category." };
  }

  if (!Number.isFinite(cardId)) {
    return { error: "Please select a balance card." };
  }

  const cards = await getBalanceCards(session.profileId);
  const card = cards.find((c) => c.id === cardId);
  if (!card) {
    return { error: "Invalid balance card." };
  }

  const delta = type === "deposit" ? amount : -amount;
  const balanceResult = await adjustCardBalance(session.profileId, cardId, delta);
  if ("error" in balanceResult && balanceResult.error) {
    return { error: balanceResult.error };
  }

  const result = await addTransaction({
    profileId: session.profileId,
    type,
    amount,
    description,
    category: type === "expense" ? category : null,
    cardId,
    createdAt: dateResult.createdAt,
  });

  if ("error" in result && result.error) {
    await adjustCardBalance(session.profileId, cardId, -delta);
    return { error: result.error };
  }

  revalidatePath("/");
  return {
    success:
      type === "deposit"
        ? `Deposit added to ${card.name}.`
        : `Expense deducted from ${card.name}.`,
  };
}

export async function updateTransactionAction(
  _prev: FinanceActionState | null,
  formData: FormData
): Promise<FinanceActionState | null> {
  const session = await getSession();
  if (!session) {
    return { error: "You must be signed in." };
  }

  const transactionId = Number.parseInt(
    formData.get("transactionId") as string,
    10
  );
  const type = formData.get("type") as TransactionType;
  const amountRaw = formData.get("amount") as string;
  const description = (formData.get("description") as string).trim();
  const category = (formData.get("category") as string | null)?.trim() || null;
  const cardId = Number.parseInt(formData.get("cardId") as string, 10);
  const dateResult = parseTransactionDate(formData);
  if ("error" in dateResult) {
    return { error: dateResult.error };
  }

  if (!Number.isFinite(transactionId)) {
    return { error: "Invalid transaction." };
  }

  if (type !== "deposit" && type !== "expense") {
    return { error: "Invalid transaction type." };
  }

  const amount = Number.parseFloat(amountRaw);
  if (!Number.isFinite(amount) || amount <= 0) {
    return { error: "Enter a valid amount greater than zero." };
  }

  if (!description) {
    return { error: "Please enter a name or reason." };
  }

  if (type === "expense" && !category) {
    return { error: "Please select an expense category." };
  }

  if (!Number.isFinite(cardId)) {
    return { error: "Please select a balance card." };
  }

  const txResult = await getTransaction(session.profileId, transactionId);
  if ("error" in txResult && txResult.error) {
    return { error: txResult.error };
  }

  const oldTx = txResult.transaction;
  if (!oldTx?.card_id) {
    return { error: "Transaction has no linked card." };
  }

  const cards = await getBalanceCards(session.profileId);
  const newCard = cards.find((c) => c.id === cardId);
  if (!newCard) {
    return { error: "Invalid balance card." };
  }

  const oldDelta = oldTx.type === "deposit" ? -oldTx.amount : oldTx.amount;
  const newDelta = type === "deposit" ? amount : -amount;

  const reverseResult = await adjustCardBalance(
    session.profileId,
    oldTx.card_id,
    oldDelta
  );
  if ("error" in reverseResult && reverseResult.error) {
    return { error: reverseResult.error };
  }

  const applyResult = await adjustCardBalance(session.profileId, cardId, newDelta);
  if ("error" in applyResult && applyResult.error) {
    await adjustCardBalance(session.profileId, oldTx.card_id, -oldDelta);
    return { error: applyResult.error };
  }

  const result = await updateTransaction(session.profileId, transactionId, {
    type,
    amount,
    description,
    category: type === "expense" ? category : null,
    cardId,
    createdAt: dateResult.createdAt,
  });

  if ("error" in result && result.error) {
    await adjustCardBalance(session.profileId, cardId, -newDelta);
    await adjustCardBalance(session.profileId, oldTx.card_id, -oldDelta);
    return { error: result.error };
  }

  revalidatePath("/");
  return { success: "Transaction updated." };
}

export async function deleteTransactionFormAction(formData: FormData) {
  const transactionId = Number.parseInt(formData.get("transactionId") as string, 10);
  if (!Number.isFinite(transactionId)) {
    return;
  }
  await deleteTransactionAction(transactionId);
}

export async function deleteTransactionAction(transactionId: number) {
  const session = await getSession();
  if (!session) {
    return { error: "You must be signed in." };
  }

  const txResult = await getTransaction(session.profileId, transactionId);
  if ("error" in txResult && txResult.error) {
    return { error: txResult.error };
  }

  const tx = txResult.transaction;
  if (!tx) {
    return { error: "Transaction not found." };
  }

  if (!tx.card_id) {
    return { error: "Transaction has no linked card." };
  }

  const delta = tx.type === "deposit" ? -tx.amount : tx.amount;
  const balanceResult = await adjustCardBalance(
    session.profileId,
    tx.card_id,
    delta
  );
  if ("error" in balanceResult && balanceResult.error) {
    return { error: balanceResult.error };
  }

  const result = await deleteTransaction(session.profileId, transactionId);
  if ("error" in result && result.error) {
    await adjustCardBalance(session.profileId, tx.card_id, -delta);
    return { error: result.error };
  }

  revalidatePath("/");
  return { success: true };
}

export async function loadFinanceData() {
  const session = await getSession();
  if (!session) {
    return {
      transactions: [],
      fundTransfers: [],
      balanceCards: [],
      unlockedCardIds: [] as number[],
      grandNetWorthVisible: false,
      hasPin: false,
      pinRequired: true,
      error: "Not signed in.",
    };
  }

  try {
    const [
      transactions,
      fundTransfers,
      balanceCards,
      unlockState,
      pinSettings,
    ] = await Promise.all([
      getTransactions(session.profileId),
      getFundTransfers(session.profileId),
      loadBalanceCards(session.profileId),
      getFinanceUnlockState(session.profileId),
      getFinancePinSettings(session.profileId),
    ]);

    return {
      transactions,
      fundTransfers,
      balanceCards,
      unlockedCardIds: unlockState.unlockedCardIds,
      grandNetWorthVisible: unlockState.grandNetWorthVisible,
      hasPin: Boolean(pinSettings.pin_hash),
      pinRequired: pinSettings.pin_required,
      error: null,
    };
  } catch (error) {
    return {
      transactions: [],
      fundTransfers: [],
      balanceCards: [],
      unlockedCardIds: [] as number[],
      grandNetWorthVisible: false,
      hasPin: false,
      pinRequired: true,
      error:
        error instanceof Error ? error.message : "Failed to load finance data.",
    };
  }
}
