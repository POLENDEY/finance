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

export type FundTransferDirection = "to_allowance" | "to_net_worth";

export type FundTransfer = {
  id: number;
  profile_id: number;
  direction: FundTransferDirection;
  amount: number;
  created_at: string;
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
