"use server";

import {
  addTransaction,
  deleteTransaction,
  getTransactions,
} from "@/lib/finance/transactions";
import {
  addToNetWorth,
  adjustAllowanceBalance,
  deductFromNetWorth,
  getFinanceProfile,
  getFinanceProfileSafe,
  isValidPin,
  setNetWorthPin,
  setNetWorthPinRequired,
  transferToAllowance,
  transferToNetWorth,
  verifyNetWorthPin,
} from "@/lib/finance/balances";
import {
  clearNetWorthUnlock,
  isNetWorthUnlocked,
  setNetWorthUnlock,
} from "@/lib/auth/net-worth-unlock";
import { getSession } from "@/lib/auth/session";
import { revalidatePath } from "next/cache";
import type { DeductFrom, TransactionType } from "@/lib/types/finance";

export type FinanceActionState = {
  error?: string;
  success?: string;
};

export type PinActionState = {
  error?: string;
  success?: string;
  unlocked?: boolean;
};

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

  let fundTarget: DeductFrom = "allowance";

  if (type === "deposit") {
    const dest = formData.get("depositTo") as string;
    if (dest !== "allowance" && dest !== "net_worth") {
      return { error: "Please select where to deposit." };
    }
    fundTarget = dest;
  }

  if (type === "expense") {
    const source = formData.get("deductFrom") as string;
    if (source !== "allowance" && source !== "net_worth") {
      return { error: "Please select where to deduct from." };
    }
    fundTarget = source;

    if (fundTarget === "net_worth") {
      const pin = (formData.get("pin") as string | null)?.trim() ?? "";
      if (!isValidPin(pin)) {
        return { error: "Enter your 6-digit PIN to deduct from net worth." };
      }
      const pinResult = await verifyNetWorthPin(session.profileId, pin);
      if ("error" in pinResult && pinResult.error) {
        return { error: pinResult.error };
      }
    }
  }

  let balanceResult: { error?: string; success?: boolean };
  if (type === "deposit") {
    balanceResult =
      fundTarget === "net_worth"
        ? await addToNetWorth(session.profileId, amount)
        : await adjustAllowanceBalance(session.profileId, amount);
  } else if (fundTarget === "net_worth") {
    balanceResult = await deductFromNetWorth(session.profileId, amount);
  } else {
    balanceResult = await adjustAllowanceBalance(session.profileId, -amount);
  }

  if ("error" in balanceResult && balanceResult.error) {
    return { error: balanceResult.error };
  }

  const result = await addTransaction({
    profileId: session.profileId,
    type,
    amount,
    description,
    category: type === "expense" ? category : null,
    deductFrom: fundTarget,
  });

  if ("error" in result && result.error) {
    if (type === "deposit") {
      if (fundTarget === "net_worth") {
        await deductFromNetWorth(session.profileId, amount);
      } else {
        await adjustAllowanceBalance(session.profileId, -amount);
      }
    } else if (fundTarget === "net_worth") {
      await addToNetWorth(session.profileId, amount);
    } else {
      await adjustAllowanceBalance(session.profileId, amount);
    }
    return { error: result.error };
  }

  revalidatePath("/");
  return {
    success:
      type === "deposit"
        ? fundTarget === "net_worth"
          ? "Deposit added to net worth."
          : "Deposit added to allowance."
        : fundTarget === "net_worth"
          ? "Expense deducted from net worth."
          : "Expense deducted from allowance.",
  };
}

export async function deleteTransactionAction(transactionId: number) {
  const session = await getSession();
  if (!session) {
    return { error: "You must be signed in." };
  }

  const result = await deleteTransaction(session.profileId, transactionId);
  if ("error" in result && result.error) {
    return { error: result.error };
  }

  revalidatePath("/");
  return { success: true };
}

export async function setupPinAction(
  _prev: PinActionState | null,
  formData: FormData
): Promise<PinActionState | null> {
  const session = await getSession();
  if (!session) {
    return { error: "You must be signed in." };
  }

  const pin = (formData.get("pin") as string).trim();
  const confirmPin = (formData.get("confirmPin") as string).trim();

  if (!isValidPin(pin)) {
    return { error: "PIN must be exactly 6 digits." };
  }

  if (pin !== confirmPin) {
    return { error: "PINs do not match." };
  }

  const result = await setNetWorthPin(session.profileId, pin);
  if ("error" in result && result.error) {
    return { error: result.error };
  }

  await setNetWorthUnlock(session.profileId);
  revalidatePath("/");
  return { success: "PIN created. Net worth is now visible.", unlocked: true };
}

export async function verifyPinAction(
  _prev: PinActionState | null,
  formData: FormData
): Promise<PinActionState | null> {
  const session = await getSession();
  if (!session) {
    return { error: "You must be signed in." };
  }

  const pin = (formData.get("pin") as string).trim();
  if (!isValidPin(pin)) {
    return { error: "PIN must be exactly 6 digits." };
  }

  const result = await verifyNetWorthPin(session.profileId, pin);
  if ("error" in result && result.error) {
    return { error: result.error };
  }

  await setNetWorthUnlock(session.profileId);
  revalidatePath("/");
  return { success: "Net worth unlocked.", unlocked: true };
}

export async function hideNetWorthAction() {
  const session = await getSession();
  if (!session) {
    return { error: "You must be signed in." };
  }

  await clearNetWorthUnlock();
  revalidatePath("/");
  return { success: true };
}

export async function updatePinRequiredAction(
  _prev: FinanceActionState | null,
  formData: FormData
): Promise<FinanceActionState | null> {
  const session = await getSession();
  if (!session) {
    return { error: "You must be signed in." };
  }

  const pinRequired = formData.get("pinRequired") === "true";

  if (!pinRequired) {
    const profile = await getFinanceProfile(session.profileId);
    const pin = (formData.get("pin") as string)?.trim() ?? "";
    const confirmPin = (formData.get("confirmPin") as string)?.trim() ?? "";

    if (!profile.net_worth_pin_hash) {
      if (!isValidPin(pin)) {
        return { error: "PIN must be exactly 6 digits." };
      }
      if (pin !== confirmPin) {
        return { error: "PINs do not match." };
      }
      const setupResult = await setNetWorthPin(session.profileId, pin);
      if ("error" in setupResult && setupResult.error) {
        return { error: setupResult.error };
      }
    } else {
      if (!isValidPin(pin)) {
        return { error: "Enter your PIN to disable protection." };
      }
      const pinResult = await verifyNetWorthPin(session.profileId, pin);
      if ("error" in pinResult && pinResult.error) {
        return { error: pinResult.error };
      }
    }
  }

  const result = await setNetWorthPinRequired(session.profileId, pinRequired);
  if ("error" in result && result.error) {
    return { error: result.error };
  }

  if (pinRequired) {
    await clearNetWorthUnlock();
  }

  revalidatePath("/");
  return {
    success: pinRequired
      ? "PIN is now required to view net worth."
      : "Net worth can be viewed without PIN.",
  };
}

async function canAccessNetWorthFeatures(profileId: number) {
  const profile = await getFinanceProfile(profileId);
  if (!profile.net_worth_pin_required) {
    return true;
  }
  return isNetWorthUnlocked(profileId);
}

export async function transferToAllowanceAction(
  _prev: FinanceActionState | null,
  formData: FormData
): Promise<FinanceActionState | null> {
  const session = await getSession();
  if (!session) {
    return { error: "You must be signed in." };
  }

  const unlocked = await canAccessNetWorthFeatures(session.profileId);
  if (!unlocked) {
    return { error: "Unlock net worth first." };
  }

  const profile = await getFinanceProfile(session.profileId);
  if (profile.net_worth_pin_hash) {
    const pin = (formData.get("pin") as string).trim();
    const pinResult = await verifyNetWorthPin(session.profileId, pin);
    if ("error" in pinResult && pinResult.error) {
      return { error: pinResult.error };
    }
  }

  const amount = Number.parseFloat(formData.get("amount") as string);
  const result = await transferToAllowance(session.profileId, amount);
  if ("error" in result && result.error) {
    return { error: result.error };
  }

  revalidatePath("/");
  return { success: "Transfer to allowance completed." };
}

export async function transferToNetWorthAction(
  _prev: FinanceActionState | null,
  formData: FormData
): Promise<FinanceActionState | null> {
  const session = await getSession();
  if (!session) {
    return { error: "You must be signed in." };
  }

  const pin = (formData.get("pin") as string | null)?.trim() ?? "";
  const profile = await getFinanceProfile(session.profileId);

  if (profile.net_worth_pin_hash) {
    if (!isValidPin(pin)) {
      return { error: "Enter your 6-digit PIN." };
    }
    const pinResult = await verifyNetWorthPin(session.profileId, pin);
    if ("error" in pinResult && pinResult.error) {
      return { error: pinResult.error };
    }
  }

  const amount = Number.parseFloat(formData.get("amount") as string);
  const result = await transferToNetWorth(session.profileId, amount);
  if ("error" in result && result.error) {
    return { error: result.error };
  }

  revalidatePath("/");
  return { success: "Transfer to net worth completed." };
}

export async function loadFinanceData() {
  const session = await getSession();
  if (!session) {
    return {
      transactions: [],
      financeProfile: null,
      netWorthUnlocked: false,
      error: "Not signed in.",
    };
  }

  try {
    const [transactions, financeProfile, netWorthUnlocked] = await Promise.all([
      getTransactions(session.profileId),
      getFinanceProfileSafe(session.profileId),
      isNetWorthUnlocked(session.profileId),
    ]);

    return {
      transactions,
      financeProfile,
      netWorthUnlocked,
      error: financeProfile ? null : "Balance columns not set up yet. Run database setup.",
    };
  } catch (error) {
    return {
      transactions: [],
      financeProfile: null,
      netWorthUnlocked: false,
      error:
        error instanceof Error ? error.message : "Failed to load finance data.",
    };
  }
}
