import bcrypt from "bcryptjs";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  CARD_COLOR_THEMES,
  type BalanceCard,
  type CardColorTheme,
} from "@/lib/types/finance";

export function isValidPin(pin: string) {
  return /^\d{6}$/.test(pin);
}

function mapCard(row: Record<string, unknown>): BalanceCard {
  return {
    ...row,
    balance: Number(row.balance ?? 0),
    pin_required: row.pin_required ?? true,
  } as BalanceCard;
}

export async function getBalanceCards(profileId: number) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("balance_cards")
    .select(
      "id, profile_id, name, balance, is_hidden, pin_hash, pin_required, sort_order, color_theme, created_at"
    )
    .eq("profile_id", profileId)
    .order("sort_order", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map(mapCard);
}

export async function getBalanceCard(profileId: number, cardId: number) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("balance_cards")
    .select(
      "id, profile_id, name, balance, is_hidden, pin_hash, pin_required, sort_order, color_theme, created_at"
    )
    .eq("profile_id", profileId)
    .eq("id", cardId)
    .single();

  if (error) {
    return { error: error.message };
  }

  return { card: mapCard(data) };
}

export async function ensureDefaultCards(profileId: number) {
  const cards = await getBalanceCards(profileId);
  if (cards.length > 0) {
    return cards;
  }

  const supabase = createAdminClient();
  const { error } = await supabase.from("balance_cards").insert([
    {
      profile_id: profileId,
      name: "Savings",
      balance: 0,
      is_hidden: true,
      pin_required: true,
      sort_order: 0,
      color_theme: "violet",
    },
    {
      profile_id: profileId,
      name: "Spending",
      balance: 0,
      is_hidden: false,
      pin_required: false,
      sort_order: 1,
      color_theme: "sky",
    },
  ]);

  if (error) {
    throw new Error(error.message);
  }

  return getBalanceCards(profileId);
}

export async function createBalanceCard(
  profileId: number,
  name: string,
  isHidden = false
) {
  const trimmed = name.trim();
  if (!trimmed) {
    return { error: "Card name is required." };
  }

  const cards = await ensureDefaultCards(profileId);
  const nextTheme =
    CARD_COLOR_THEMES[cards.length % CARD_COLOR_THEMES.length] ?? "sky";

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("balance_cards")
    .insert({
      profile_id: profileId,
      name: trimmed,
      balance: 0,
      is_hidden: isHidden,
      pin_required: isHidden,
      sort_order: cards.length,
      color_theme: nextTheme,
    })
    .select("id")
    .single();

  if (error) {
    return { error: error.message };
  }

  return { id: data.id as number };
}

export async function setCardHidden(
  profileId: number,
  cardId: number,
  isHidden: boolean
) {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("balance_cards")
    .update({
      is_hidden: isHidden,
      ...(isHidden ? {} : { pin_required: false }),
    })
    .eq("profile_id", profileId)
    .eq("id", cardId);

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}

export async function renameBalanceCard(
  profileId: number,
  cardId: number,
  name: string
) {
  const trimmed = name.trim();
  if (!trimmed) {
    return { error: "Card name is required." };
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("balance_cards")
    .update({ name: trimmed })
    .eq("profile_id", profileId)
    .eq("id", cardId);

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}

export async function deleteBalanceCard(profileId: number, cardId: number) {
  const cards = await getBalanceCards(profileId);
  if (cards.length <= 1) {
    return { error: "You must keep at least one balance card." };
  }

  const card = cards.find((c) => c.id === cardId);
  if (!card) {
    return { error: "Card not found." };
  }

  if (card.balance > 0) {
    return {
      error: "Transfer or spend the remaining balance before deleting this card.",
    };
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("balance_cards")
    .delete()
    .eq("profile_id", profileId)
    .eq("id", cardId);

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}

export async function verifyCardPin(
  profileId: number,
  cardId: number,
  pin: string
) {
  const result = await getBalanceCard(profileId, cardId);
  if ("error" in result && result.error) {
    return { error: result.error };
  }

  const card = result.card;
  if (!card) {
    return { error: "Card not found." };
  }

  if (!card.pin_hash) {
    return { error: "PIN not set for this card." };
  }

  const valid = await bcrypt.compare(pin, card.pin_hash);
  if (!valid) {
    return { error: "Incorrect PIN." };
  }

  return { success: true };
}

export async function setCardPin(
  profileId: number,
  cardId: number,
  pin: string
) {
  if (!isValidPin(pin)) {
    return { error: "PIN must be exactly 6 digits." };
  }

  const result = await getBalanceCard(profileId, cardId);
  if ("error" in result && result.error) {
    return { error: result.error };
  }

  const card = result.card;
  if (!card) {
    return { error: "Card not found." };
  }

  if (card.pin_hash) {
    return { error: "PIN is already set for this card." };
  }

  const hash = await bcrypt.hash(pin, 10);
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("balance_cards")
    .update({ pin_hash: hash, is_hidden: true })
    .eq("profile_id", profileId)
    .eq("id", cardId);

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}

export async function setCardPinRequired(
  profileId: number,
  cardId: number,
  pinRequired: boolean
) {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("balance_cards")
    .update({ pin_required: pinRequired })
    .eq("profile_id", profileId)
    .eq("id", cardId);

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}

export async function adjustCardBalance(
  profileId: number,
  cardId: number,
  delta: number
) {
  const result = await getBalanceCard(profileId, cardId);
  if ("error" in result && result.error) {
    return { error: result.error };
  }

  const card = result.card;
  if (!card) {
    return { error: "Card not found." };
  }

  const next = card.balance + delta;
  if (next < 0) {
    return { error: "Insufficient balance on this card." };
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("balance_cards")
    .update({ balance: next })
    .eq("profile_id", profileId)
    .eq("id", cardId);

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}

export async function transferBetweenCards(
  profileId: number,
  fromCardId: number,
  toCardId: number,
  amount: number
) {
  if (fromCardId === toCardId) {
    return { error: "Choose a different destination card." };
  }

  if (!Number.isFinite(amount) || amount <= 0) {
    return { error: "Enter a valid amount greater than zero." };
  }

  const fromResult = await getBalanceCard(profileId, fromCardId);
  const toResult = await getBalanceCard(profileId, toCardId);

  if ("error" in fromResult && fromResult.error) {
    return { error: fromResult.error };
  }
  if ("error" in toResult && toResult.error) {
    return { error: toResult.error };
  }

  const fromCard = fromResult.card;
  const toCard = toResult.card;
  if (!fromCard || !toCard) {
    return { error: "Invalid card selection." };
  }

  if (amount > fromCard.balance) {
    return { error: "Insufficient balance on the source card." };
  }

  const supabase = createAdminClient();
  const { error: fromError } = await supabase
    .from("balance_cards")
    .update({ balance: fromCard.balance - amount })
    .eq("profile_id", profileId)
    .eq("id", fromCardId);

  if (fromError) {
    return { error: fromError.message };
  }

  const { error: toError } = await supabase
    .from("balance_cards")
    .update({ balance: toCard.balance + amount })
    .eq("profile_id", profileId)
    .eq("id", toCardId);

  if (toError) {
    await supabase
      .from("balance_cards")
      .update({ balance: fromCard.balance })
      .eq("profile_id", profileId)
      .eq("id", fromCardId);
    return { error: toError.message };
  }

  return { success: true };
}

export async function canAccessHiddenCard(
  profileId: number,
  card: BalanceCard,
  unlockedCardIds: number[]
) {
  if (!card.is_hidden) {
    return true;
  }
  if (!card.pin_required) {
    return true;
  }
  return unlockedCardIds.includes(card.id);
}

export function getGrandNetWorth(cards: BalanceCard[]) {
  return cards.reduce((sum, card) => sum + card.balance, 0);
}

export function getVisibleGrandNetWorth(
  cards: BalanceCard[],
  unlockedCardIds: number[]
) {
  return cards.reduce((sum, card) => {
    if (!card.is_hidden || unlockedCardIds.includes(card.id)) {
      return sum + card.balance;
    }
    return sum;
  }, 0);
}

export function countVisibleCards(
  cards: BalanceCard[],
  unlockedCardIds: number[]
) {
  return cards.filter(
    (card) => !card.is_hidden || unlockedCardIds.includes(card.id)
  ).length;
}

export function cardThemeClasses(theme: CardColorTheme) {
  const themes: Record<
    CardColorTheme,
    { border: string; bg: string; text: string; subtext: string; button: string }
  > = {
    violet: {
      border: "border-violet-200 dark:border-violet-900",
      bg: "from-violet-50 to-indigo-100 dark:from-violet-950/60 dark:to-indigo-950/40",
      text: "text-violet-700 dark:text-violet-300",
      subtext: "text-violet-600/80 dark:text-violet-400/80",
      button:
        "border-violet-300/60 bg-white/70 text-violet-700 dark:border-violet-700 dark:bg-violet-950/50 dark:text-violet-300",
    },
    sky: {
      border: "border-sky-200 dark:border-sky-900",
      bg: "from-sky-50 to-cyan-100 dark:from-sky-950/60 dark:to-cyan-950/40",
      text: "text-sky-700 dark:text-sky-300",
      subtext: "text-sky-600/80 dark:text-sky-400/80",
      button:
        "border-sky-300/60 bg-white/70 text-sky-700 dark:border-sky-700 dark:bg-sky-950/50 dark:text-sky-300",
    },
    emerald: {
      border: "border-emerald-200 dark:border-emerald-900",
      bg: "from-emerald-50 to-teal-100 dark:from-emerald-950/60 dark:to-teal-950/40",
      text: "text-emerald-700 dark:text-emerald-300",
      subtext: "text-emerald-600/80 dark:text-emerald-400/80",
      button:
        "border-emerald-300/60 bg-white/70 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
    },
    amber: {
      border: "border-amber-200 dark:border-amber-900",
      bg: "from-amber-50 to-orange-100 dark:from-amber-950/60 dark:to-orange-950/40",
      text: "text-amber-700 dark:text-amber-300",
      subtext: "text-amber-600/80 dark:text-amber-400/80",
      button:
        "border-amber-300/60 bg-white/70 text-amber-700 dark:border-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
    },
    rose: {
      border: "border-rose-200 dark:border-rose-900",
      bg: "from-rose-50 to-pink-100 dark:from-rose-950/60 dark:to-pink-950/40",
      text: "text-rose-700 dark:text-rose-300",
      subtext: "text-rose-600/80 dark:text-rose-400/80",
      button:
        "border-rose-300/60 bg-white/70 text-rose-700 dark:border-rose-700 dark:bg-rose-950/50 dark:text-rose-300",
    },
  };

  return themes[theme] ?? themes.sky;
}
