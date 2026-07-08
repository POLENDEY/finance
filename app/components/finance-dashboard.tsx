"use client";

import { useActionState, useEffect, useState } from "react";
import type { BalanceCard, FundTransfer, TransactionWithCard } from "@/lib/types/finance";
import {
  createTransactionAction,
  deleteTransactionAction,
  deleteTransactionFormAction,
  type FinanceActionState,
} from "@/app/actions/finance";
import { BalanceCards } from "@/app/components/balance-cards";
import { TransferHistory } from "@/app/components/transfer-history";
import { cardThemeClasses } from "@/lib/finance/balance-cards";
import {
  EXPENSE_CATEGORIES,
  type TransactionType,
} from "@/lib/types/finance";

type FinanceDashboardProps = {
  transactions: TransactionWithCard[];
  fundTransfers: FundTransfer[];
  balanceCards: BalanceCard[];
  unlockedCardIds: number[];
  grandNetWorthVisible: boolean;
  hasPin: boolean;
  pinRequired: boolean;
  loadError: string | null;
};

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
  }).format(value);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

const TRANSACTIONS_PAGE_SIZE = 5;

export function FinanceDashboard({
  transactions,
  fundTransfers,
  balanceCards,
  unlockedCardIds,
  grandNetWorthVisible,
  hasPin,
  pinRequired,
  loadError,
}: FinanceDashboardProps) {
  const [mode, setMode] = useState<TransactionType>("deposit");
  const [selectedCardId, setSelectedCardId] = useState<number>(
    balanceCards[0]?.id ?? 0
  );
  const [state, formAction, isPending] = useActionState(
    createTransactionAction,
    null as FinanceActionState | null
  );
  const [transactionPage, setTransactionPage] = useState(0);

  useEffect(() => {
    if (balanceCards.length > 0 && !balanceCards.some((c) => c.id === selectedCardId)) {
      setSelectedCardId(balanceCards[0].id);
    }
  }, [balanceCards, selectedCardId]);

  const totalTransactionPages = Math.max(
    1,
    Math.ceil(transactions.length / TRANSACTIONS_PAGE_SIZE)
  );
  const pagedTransactions = transactions.slice(
    transactionPage * TRANSACTIONS_PAGE_SIZE,
    transactionPage * TRANSACTIONS_PAGE_SIZE + TRANSACTIONS_PAGE_SIZE
  );

  useEffect(() => {
    const lastPage = Math.max(
      0,
      Math.ceil(transactions.length / TRANSACTIONS_PAGE_SIZE) - 1
    );
    if (transactionPage > lastPage) {
      setTransactionPage(lastPage);
    }
  }, [transactions.length, transactionPage]);

  return (
    <div className="space-y-8">
      {loadError && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
          {loadError}
        </div>
      )}

      <BalanceCards
        cards={balanceCards}
        unlockedCardIds={unlockedCardIds}
        grandNetWorthVisible={grandNetWorthVisible}
        hasPin={hasPin}
        pinRequired={pinRequired}
      />

      <TransferHistory transfers={fundTransfers} />

      <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          Add transaction
        </h2>
        <p className="mt-1 text-sm text-zinc-500">
          Use <span className="font-medium text-emerald-600">+</span> for deposit
          or <span className="font-medium text-rose-600">−</span> for expense.
        </p>

        <div className="mt-5 flex gap-2">
          <TypeToggle active={mode === "deposit"} type="deposit" onClick={() => setMode("deposit")} />
          <TypeToggle active={mode === "expense"} type="expense" onClick={() => setMode("expense")} />
        </div>

        <form action={formAction} className="mt-6 space-y-4">
          <input type="hidden" name="type" value={mode} />
          <input type="hidden" name="cardId" value={selectedCardId} />

          {state?.error && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-300">
              {state.error}
            </div>
          )}
          {state?.success && (
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">
              {state.success}
            </div>
          )}

          <Field label={mode === "deposit" ? "Deposit to" : "Deduct from"}>
            <div className="flex flex-wrap gap-2">
              {balanceCards.map((card) => {
                const theme = cardThemeClasses(card.color_theme);
                return (
                  <button
                    key={card.id}
                    type="button"
                    onClick={() => setSelectedCardId(card.id)}
                    className={`rounded-xl border px-4 py-3 text-left text-sm transition ${
                      selectedCardId === card.id
                        ? `ring-2 ring-emerald-500 ${theme.border} bg-white dark:bg-zinc-950`
                        : "border-zinc-200 dark:border-zinc-700"
                    }`}
                  >
                    <span className={`font-medium ${theme.text}`}>{card.name}</span>
                  </button>
                );
              })}
            </div>
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Amount">
              <input name="amount" type="number" min="0.01" step="0.01" required placeholder="0.00" className={inputClass} />
            </Field>
            <Field label={mode === "deposit" ? "Reason / source" : "Expense name / reason"}>
              <input
                name="description"
                type="text"
                required
                placeholder={mode === "deposit" ? "e.g. Salary, refund" : "e.g. Groceries, rent"}
                className={inputClass}
              />
            </Field>
          </div>

          {mode === "expense" && (
            <>
              <Field label="Category">
                <select name="category" required className={inputClass}>
                  <option value="">Select category</option>
                  {EXPENSE_CATEGORIES.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </Field>
            </>
          )}

          <button
            type="submit"
            disabled={isPending || balanceCards.length === 0}
            className={`rounded-lg px-5 py-2.5 text-sm font-medium text-white transition disabled:opacity-60 ${
              mode === "deposit" ? "bg-emerald-600 hover:bg-emerald-500" : "bg-rose-600 hover:bg-rose-500"
            }`}
          >
            {isPending ? "Saving…" : mode === "deposit" ? "Add deposit" : "Add expense"}
          </button>
        </form>
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            Recent transactions
          </h2>
        </div>

        {transactions.length === 0 ? (
          <p className="px-6 py-10 text-center text-sm text-zinc-500">
            No transactions yet. Add your first deposit or expense above.
          </p>
        ) : (
          <>
            <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {pagedTransactions.map((transaction) => (
                <li key={transaction.id} className="flex items-center justify-between gap-4 px-6 py-4">
                  <div className="flex items-start gap-3">
                    <span
                      className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-lg font-bold ${
                        transaction.type === "deposit"
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400"
                          : "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400"
                      }`}
                    >
                      {transaction.type === "deposit" ? "+" : "−"}
                    </span>
                    <div>
                      <p className="font-medium text-zinc-900 dark:text-zinc-50">
                        {transaction.description}
                      </p>
                      <p className="text-xs text-zinc-500">
                        {transaction.category && (
                          <span className="mr-2 rounded-full bg-zinc-100 px-2 py-0.5 dark:bg-zinc-800">
                            {transaction.category}
                          </span>
                        )}
                        {transaction.card_name && (
                          <span className="mr-2 rounded-full bg-violet-100 px-2 py-0.5 text-violet-700 dark:bg-violet-950 dark:text-violet-300">
                            {transaction.card_name}
                          </span>
                        )}
                        {formatDate(transaction.created_at)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={`text-sm font-semibold ${
                        transaction.type === "deposit"
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-rose-600 dark:text-rose-400"
                      }`}
                    >
                      {transaction.type === "deposit" ? "+" : "−"}
                      {formatMoney(transaction.amount)}
                    </span>
                    <DeleteButton transactionId={transaction.id} />
                  </div>
                </li>
              ))}
            </ul>
            <div className="flex items-center justify-between border-t border-zinc-200 px-6 py-3 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => setTransactionPage((p) => Math.max(0, p - 1))}
                disabled={transactionPage === 0}
                className="rounded-lg border border-zinc-200 px-3 py-1.5 text-sm font-medium disabled:opacity-40 dark:border-zinc-700"
              >
                Prev
              </button>
              <p className="text-xs text-zinc-500">
                Page {transactionPage + 1} of {totalTransactionPages}
              </p>
              <button
                type="button"
                onClick={() => setTransactionPage((p) => Math.min(totalTransactionPages - 1, p + 1))}
                disabled={transactionPage >= totalTransactionPages - 1}
                className="rounded-lg border border-zinc-200 px-3 py-1.5 text-sm font-medium disabled:opacity-40 dark:border-zinc-700"
              >
                Next
              </button>
            </div>
          </>
        )}
      </section>
    </div>
  );
}

function TypeToggle({
  active,
  type,
  onClick,
}: {
  active: boolean;
  type: TransactionType;
  onClick: () => void;
}) {
  const isDeposit = type === "deposit";
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 rounded-xl border px-4 py-3 text-sm font-semibold transition ${
        active
          ? isDeposit
            ? "border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
            : "border-rose-500 bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300"
          : "border-zinc-200 text-zinc-600 dark:border-zinc-700 dark:text-zinc-400"
      }`}
    >
      {isDeposit ? "+ Deposit" : "− Expense"}
    </button>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
        {label}
      </span>
      {children}
    </label>
  );
}

function DeleteButton({ transactionId }: { transactionId: number }) {
  return (
    <form action={deleteTransactionFormAction}>
      <input type="hidden" name="transactionId" value={transactionId} />
      <button
        type="submit"
        className="rounded-lg p-1.5 text-zinc-400 transition hover:bg-zinc-100 hover:text-red-600 dark:hover:bg-zinc-800"
        aria-label="Delete transaction"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
        </svg>
      </button>
    </form>
  );
}

const inputClass =
  "w-full rounded-lg border border-zinc-200 bg-white px-3.5 py-2.5 text-sm text-zinc-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50";
