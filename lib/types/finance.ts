export type TransactionType = "deposit" | "expense";

export type CardColorTheme = "violet" | "sky" | "emerald" | "amber" | "rose";

export type BalanceCard = {
  id: number;
  profile_id: number;
  name: string;
  balance: number;
  is_hidden: boolean;
  pin_hash: string | null;
  pin_required: boolean;
  sort_order: number;
  color_theme: CardColorTheme;
  created_at: string;
};

export type Transaction = {
  id: number;
  profile_id: number;
  type: TransactionType;
  amount: number;
  description: string;
  category: string | null;
  card_id: number | null;
  deduct_from: string | null;
  created_at: string;
};

export type FinanceSummary = {
  totalDeposits: number;
  totalExpenses: number;
  balance: number;
};

export type FundTransfer = {
  id: number;
  profile_id: number;
  from_card_id: number | null;
  to_card_id: number | null;
  amount: number;
  created_at: string;
  from_card?: { name: string } | null;
  to_card?: { name: string } | null;
};

export type TransactionWithCard = Transaction & { card_name?: string };

export const EXPENSE_CATEGORIES = [
  "Food",
  "Transport",
  "Bills",
  "Shopping",
  "Entertainment",
  "Health",
  "Salary",
  "Other",
] as const;

export const CARD_COLOR_THEMES: CardColorTheme[] = [
  "violet",
  "sky",
  "emerald",
  "amber",
  "rose",
];
