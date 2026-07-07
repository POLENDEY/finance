export type TransactionType = "deposit" | "expense";

export type DeductFrom = "allowance" | "net_worth";

export type Transaction = {
  id: number;
  profile_id: number;
  type: TransactionType;
  amount: number;
  description: string;
  category: string | null;
  deduct_from: DeductFrom | null;
  created_at: string;
};

export type FinanceSummary = {
  totalDeposits: number;
  totalExpenses: number;
  balance: number;
};

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
