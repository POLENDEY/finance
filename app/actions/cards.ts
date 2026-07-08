"use server";

import {
  createBalanceCard,
  deleteBalanceCard,
  ensureDefaultCards,
  getBalanceCards,
  renameBalanceCard,
  setCardHidden,
  transferBetweenCards,
} from "@/lib/finance/balance-cards";
import {
  changeFinancePin,
  isValidPin,
  setFinancePin,
  setFinancePinRequired,
  verifyFinancePin,
} from "@/lib/finance/finance-pin";
import { recordFundTransfer } from "@/lib/finance/fund-transfers";
import {
  clearFinanceUnlock,
  getUnlockedCardIds,
  isCardUnlocked,
  isGrandNetWorthVisible,
  lockCard,
  setGrandNetWorthVisible,
  unlockCard,
} from "@/lib/auth/card-unlock";
import { getSession } from "@/lib/auth/session";
import { revalidatePath } from "next/cache";

export type CardActionState = {
  error?: string;
  success?: string;
  unlocked?: boolean;
};

async function requireSession() {
  const session = await getSession();
  if (!session) {
    return { error: "You must be signed in." as const, session: null };
  }
  return { session };
}

export async function createCardAction(
  _prev: CardActionState | null,
  formData: FormData
): Promise<CardActionState | null> {
  const auth = await requireSession();
  if ("error" in auth && auth.error) {
    return { error: auth.error };
  }

  const name = (formData.get("name") as string) ?? "";
  const isHidden = formData.get("hideBalance") === "true";
  const result = await createBalanceCard(auth.session!.profileId, name, isHidden);
  if ("error" in result && result.error) {
    return { error: result.error };
  }

  revalidatePath("/");
  return { success: "Card added." };
}

export async function updateCardHiddenAction(
  _prev: CardActionState | null,
  formData: FormData
): Promise<CardActionState | null> {
  const auth = await requireSession();
  if ("error" in auth && auth.error) {
    return { error: auth.error };
  }

  const cardId = Number.parseInt(formData.get("cardId") as string, 10);
  const isHidden = formData.get("isHidden") === "true";

  if (!isHidden) {
    const pin = (formData.get("pin") as string)?.trim() ?? "";
    const pinResult = await verifyFinancePin(auth.session!.profileId, pin);
    if ("error" in pinResult && pinResult.error) {
      return { error: pinResult.error };
    }
  }

  const result = await setCardHidden(auth.session!.profileId, cardId, isHidden);
  if ("error" in result && result.error) {
    return { error: result.error };
  }

  if (isHidden) {
    await lockCard(auth.session!.profileId, cardId);
  }

  revalidatePath("/");
  return {
    success: isHidden
      ? "Balance is now hidden on this card."
      : "Balance is now visible on this card.",
  };
}

export async function renameCardAction(
  _prev: CardActionState | null,
  formData: FormData
): Promise<CardActionState | null> {
  const auth = await requireSession();
  if ("error" in auth && auth.error) {
    return { error: auth.error };
  }

  const cardId = Number.parseInt(formData.get("cardId") as string, 10);
  const name = (formData.get("name") as string) ?? "";
  const result = await renameBalanceCard(auth.session!.profileId, cardId, name);
  if ("error" in result && result.error) {
    return { error: result.error };
  }

  revalidatePath("/");
  return { success: "Card renamed." };
}

export async function deleteCardAction(
  _prev: CardActionState | null,
  formData: FormData
): Promise<CardActionState | null> {
  const auth = await requireSession();
  if ("error" in auth && auth.error) {
    return { error: auth.error };
  }

  const cardId = Number.parseInt(formData.get("cardId") as string, 10);
  const result = await deleteBalanceCard(auth.session!.profileId, cardId);
  if ("error" in result && result.error) {
    return { error: result.error };
  }

  revalidatePath("/");
  return { success: "Card deleted." };
}

export async function setupFinancePinAction(
  _prev: CardActionState | null,
  formData: FormData
): Promise<CardActionState | null> {
  const auth = await requireSession();
  if ("error" in auth && auth.error) {
    return { error: auth.error };
  }

  const pin = (formData.get("pin") as string).trim();
  const confirmPin = (formData.get("confirmPin") as string).trim();

  if (!isValidPin(pin)) {
    return { error: "PIN must be exactly 6 digits." };
  }
  if (pin !== confirmPin) {
    return { error: "PINs do not match." };
  }

  const unlockCardId = formData.get("unlockCardId");
  const unlockGrand = formData.get("unlockGrand") === "true";

  const result = await setFinancePin(auth.session!.profileId, pin);
  if ("error" in result && result.error) {
    return { error: result.error };
  }

  if (unlockCardId) {
    await unlockCard(
      auth.session!.profileId,
      Number.parseInt(unlockCardId as string, 10)
    );
  } else if (unlockGrand) {
    await setGrandNetWorthVisible(auth.session!.profileId, true);
  }

  revalidatePath("/");
  return { success: "PIN saved.", unlocked: true };
}

export async function verifyFinancePinAction(
  _prev: CardActionState | null,
  formData: FormData
): Promise<CardActionState | null> {
  const auth = await requireSession();
  if ("error" in auth && auth.error) {
    return { error: auth.error };
  }

  const pin = (formData.get("pin") as string).trim();
  if (!isValidPin(pin)) {
    return { error: "PIN must be exactly 6 digits." };
  }

  const unlockCardId = formData.get("unlockCardId");
  const unlockGrand = formData.get("unlockGrand") === "true";

  const result = await verifyFinancePin(auth.session!.profileId, pin);
  if ("error" in result && result.error) {
    return { error: result.error };
  }

  if (unlockCardId) {
    await unlockCard(
      auth.session!.profileId,
      Number.parseInt(unlockCardId as string, 10)
    );
  } else if (unlockGrand) {
    await setGrandNetWorthVisible(auth.session!.profileId, true);
  }

  revalidatePath("/");
  return { success: "Unlocked.", unlocked: true };
}

export async function lockCardAction(cardId: number) {
  const auth = await requireSession();
  if ("error" in auth && auth.error) {
    return { error: auth.error };
  }

  await lockCard(auth.session!.profileId, cardId);
  revalidatePath("/");
  return { success: true };
}

export async function hideGrandNetWorthAction() {
  const auth = await requireSession();
  if ("error" in auth && auth.error) {
    return { error: auth.error };
  }

  await setGrandNetWorthVisible(auth.session!.profileId, false);
  revalidatePath("/");
  return { success: true };
}

export async function updateFinancePinRequiredAction(
  _prev: CardActionState | null,
  formData: FormData
): Promise<CardActionState | null> {
  const auth = await requireSession();
  if ("error" in auth && auth.error) {
    return { error: auth.error };
  }

  const pinRequired = formData.get("pinRequired") === "true";

  if (!pinRequired) {
    const pin = (formData.get("pin") as string)?.trim() ?? "";
    const confirmPin = (formData.get("confirmPin") as string)?.trim() ?? "";
    const { getFinancePinSettings } = await import("@/lib/finance/finance-pin");
    const settings = await getFinancePinSettings(auth.session!.profileId);

    if (!settings.pin_hash) {
      if (!isValidPin(pin)) {
        return { error: "PIN must be exactly 6 digits." };
      }
      if (pin !== confirmPin) {
        return { error: "PINs do not match." };
      }
      const setupResult = await setFinancePin(auth.session!.profileId, pin);
      if ("error" in setupResult && setupResult.error) {
        return { error: setupResult.error };
      }
    } else {
      if (!isValidPin(pin)) {
        return { error: "Enter your PIN to disable protection." };
      }
      const pinResult = await verifyFinancePin(auth.session!.profileId, pin);
      if ("error" in pinResult && pinResult.error) {
        return { error: pinResult.error };
      }
    }
  }

  const result = await setFinancePinRequired(auth.session!.profileId, pinRequired);
  if ("error" in result && result.error) {
    return { error: result.error };
  }

  if (pinRequired) {
    await clearFinanceUnlock();
  }

  revalidatePath("/");
  return {
    success: pinRequired
      ? "PIN is now required to view protected balances."
      : "Protected balances can be viewed without PIN.",
  };
}

export async function changeFinancePinAction(
  _prev: CardActionState | null,
  formData: FormData
): Promise<CardActionState | null> {
  const auth = await requireSession();
  if ("error" in auth && auth.error) {
    return { error: auth.error };
  }

  const currentPin = (formData.get("currentPin") as string).trim();
  const newPin = (formData.get("newPin") as string).trim();
  const confirmPin = (formData.get("confirmPin") as string).trim();

  if (!isValidPin(currentPin)) {
    return { error: "Enter your current 6-digit PIN." };
  }
  if (!isValidPin(newPin)) {
    return { error: "New PIN must be exactly 6 digits." };
  }
  if (newPin !== confirmPin) {
    return { error: "New PINs do not match." };
  }
  if (currentPin === newPin) {
    return { error: "New PIN must be different from your current PIN." };
  }

  const result = await changeFinancePin(auth.session!.profileId, currentPin, newPin);
  if ("error" in result && result.error) {
    return { error: result.error };
  }

  await clearFinanceUnlock();
  revalidatePath("/");
  return { success: "PIN updated. Hidden balances were locked again for security." };
}

export async function transferBetweenCardsAction(
  _prev: CardActionState | null,
  formData: FormData
): Promise<CardActionState | null> {
  const auth = await requireSession();
  if ("error" in auth && auth.error) {
    return { error: auth.error };
  }

  const fromCardId = Number.parseInt(formData.get("fromCardId") as string, 10);
  const toCardId = Number.parseInt(formData.get("toCardId") as string, 10);
  const amount = Number.parseFloat(formData.get("amount") as string);
  const pin = (formData.get("pin") as string | null)?.trim() ?? "";

  const cards = await getBalanceCards(auth.session!.profileId);
  const fromCard = cards.find((c) => c.id === fromCardId);
  const toCard = cards.find((c) => c.id === toCardId);

  if (!fromCard || !toCard) {
    return { error: "Invalid card selection." };
  }

  const unlockedCardIds = await getUnlockedCardIds(auth.session!.profileId);
  const needsPin = [fromCard, toCard].some(
    (c) => c.is_hidden && !unlockedCardIds.includes(c.id)
  );

  if (needsPin) {
    if (!isValidPin(pin)) {
      return { error: "Enter your 6-digit PIN." };
    }
    const pinResult = await verifyFinancePin(auth.session!.profileId, pin);
    if ("error" in pinResult && pinResult.error) {
      return { error: pinResult.error };
    }
    await unlockCard(auth.session!.profileId, fromCardId);
    if (toCard.is_hidden) {
      await unlockCard(auth.session!.profileId, toCardId);
    }
  }

  const result = await transferBetweenCards(
    auth.session!.profileId,
    fromCardId,
    toCardId,
    amount
  );
  if ("error" in result && result.error) {
    return { error: result.error };
  }

  const recorded = await recordFundTransfer(
    auth.session!.profileId,
    fromCardId,
    toCardId,
    amount
  );
  if ("error" in recorded && recorded.error) {
    return { error: recorded.error };
  }

  revalidatePath("/");
  return { success: `Transferred to ${toCard.name}.` };
}

export async function loadBalanceCards(profileId: number) {
  try {
    return await ensureDefaultCards(profileId);
  } catch {
    return [];
  }
}
