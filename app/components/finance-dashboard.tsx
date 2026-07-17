"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import type { BalanceCard, FundTransfer, TransactionWithCard } from "@/lib/types/finance";
import {
  createTransactionAction,
  deleteTransactionFormAction,
  updateTransactionAction,
  type FinanceActionState,
} from "@/app/actions/finance";
import { BalanceCards } from "@/app/components/balance-cards";
import { TransferHistory } from "@/app/components/transfer-history";
import { cardThemeClasses } from "@/lib/finance/balance-cards";
import {
  EXPENSE_CATEGORIES,
  type TransactionType,
} from "@/lib/types/finance";
import {
  toDateInputValue,
  transactionTimestampToDateInput,
} from "@/lib/finance/transaction-date";

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

function transactionDateKey(value: string) {
  return transactionTimestampToDateInput(value);
}

function formatDisplayDate(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Intl.DateTimeFormat("en-PH", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(year, month - 1, day));
}

function shiftDateKey(dateKey: string, days: number) {
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + days);
  return toDateInputValue(date);
}

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
  const [selectedDate, setSelectedDate] = useState(() => toDateInputValue(new Date()));
  const [transactionDate, setTransactionDate] = useState(selectedDate);
  const [editingTransactionId, setEditingTransactionId] = useState<number | null>(null);

  const todayKey = toDateInputValue(new Date());
  const datedTransactions = transactions.filter(
    (transaction) => transactionDateKey(transaction.created_at) === selectedDate
  );
  const dailyExpenseTotal = datedTransactions
    .filter((transaction) => transaction.type === "expense")
    .reduce((sum, transaction) => sum + transaction.amount, 0);
  const dailyDepositTotal = datedTransactions
    .filter((transaction) => transaction.type === "deposit")
    .reduce((sum, transaction) => sum + transaction.amount, 0);

  const availableDates = Array.from(
    new Set(transactions.map((transaction) => transactionDateKey(transaction.created_at)))
  ).sort((a, b) => b.localeCompare(a));

  const effectiveSelectedCardId = balanceCards.some((card) => card.id === selectedCardId)
    ? selectedCardId
    : balanceCards[0]?.id ?? 0;

  const totalTransactionPages = Math.max(1, Math.ceil(datedTransactions.length / TRANSACTIONS_PAGE_SIZE));
  const safeTransactionPage = Math.min(transactionPage, totalTransactionPages - 1);
  const pagedTransactions = datedTransactions.slice(
    safeTransactionPage * TRANSACTIONS_PAGE_SIZE,
    safeTransactionPage * TRANSACTIONS_PAGE_SIZE + TRANSACTIONS_PAGE_SIZE
  );

  function handleSelectedDateChange(dateKey: string) {
    setSelectedDate(dateKey);
    setTransactionPage(0);
    setTransactionDate(dateKey);
  }

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

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field label={mode === "deposit" ? "Deposit to" : "Deduct from"}>
              <CardSelectDropdown
                cards={balanceCards}
                value={effectiveSelectedCardId}
                onChange={setSelectedCardId}
                disabled={balanceCards.length === 0}
              />
              <input type="hidden" name="cardId" value={effectiveSelectedCardId} />
            </Field>

            <Field label="Transaction date">
              <input
                name="transactionDate"
                type="date"
                max={todayKey}
                value={transactionDate}
                onChange={(event) => setTransactionDate(event.target.value)}
                required
                className={inputClass}
              />
            </Field>

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
        <div className="border-b border-zinc-200 px-4 py-4 sm:px-6 dark:border-zinc-800">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                Recent transactions
              </h2>
              <p className="mt-1 text-sm text-zinc-500">
                {selectedDate === todayKey
                  ? "Showing today's activity"
                  : `Showing ${formatDisplayDate(selectedDate)}`}
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleSelectedDateChange(shiftDateKey(selectedDate, -1))}
                  className="rounded-lg border border-zinc-200 p-2 text-zinc-600 transition hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                  aria-label="Previous day"
                >
                  <ChevronLeftIcon />
                </button>
                <input
                  type="date"
                  value={selectedDate}
                  max={todayKey}
                  onChange={(event) => handleSelectedDateChange(event.target.value)}
                  className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
                />
                <button
                  type="button"
                  onClick={() =>
                    handleSelectedDateChange(
                      shiftDateKey(selectedDate, 1) > todayKey
                        ? todayKey
                        : shiftDateKey(selectedDate, 1)
                    )
                  }
                  disabled={selectedDate >= todayKey}
                  className="rounded-lg border border-zinc-200 p-2 text-zinc-600 transition hover:bg-zinc-50 disabled:opacity-40 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                  aria-label="Next day"
                >
                  <ChevronRightIcon />
                </button>
              </div>
              <button
                type="button"
                onClick={() => handleSelectedDateChange(todayKey)}
                disabled={selectedDate === todayKey}
                className="rounded-lg border border-zinc-200 px-3 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-40 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                Today
              </button>
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 dark:border-rose-900/50 dark:bg-rose-950/30">
              <p className="text-xs font-medium uppercase tracking-wide text-rose-600 dark:text-rose-400">
                Expenses this day
              </p>
              <p className="mt-1 text-xl font-semibold text-rose-700 dark:text-rose-300">
                {formatMoney(dailyExpenseTotal)}
              </p>
            </div>
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 dark:border-emerald-900/50 dark:bg-emerald-950/30">
              <p className="text-xs font-medium uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
                Deposits this day
              </p>
              <p className="mt-1 text-xl font-semibold text-emerald-700 dark:text-emerald-300">
                {formatMoney(dailyDepositTotal)}
              </p>
            </div>
          </div>

          {availableDates.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {availableDates.slice(0, 7).map((dateKey) => (
                <button
                  key={dateKey}
                  type="button"
                  onClick={() => handleSelectedDateChange(dateKey)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                    selectedDate === dateKey
                      ? "bg-emerald-600 text-white"
                      : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                  }`}
                >
                  {dateKey === todayKey ? "Today" : formatDisplayDate(dateKey)}
                </button>
              ))}
            </div>
          )}
        </div>

        {transactions.length === 0 ? (
          <p className="px-6 py-10 text-center text-sm text-zinc-500">
            No transactions yet. Add your first deposit or expense above.
          </p>
        ) : datedTransactions.length === 0 ? (
          <p className="px-6 py-10 text-center text-sm text-zinc-500">
            No transactions on {formatDisplayDate(selectedDate)}. Pick another date to view
            history.
          </p>
        ) : (
          <>
            <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {pagedTransactions.map((transaction) => (
                <li key={transaction.id} className="px-4 py-4 sm:px-6">
                  {editingTransactionId === transaction.id ? (
                    <TransactionEditForm
                      transaction={transaction}
                      cards={balanceCards}
                      todayKey={todayKey}
                      onCancel={() => setEditingTransactionId(null)}
                      onSaved={() => setEditingTransactionId(null)}
                    />
                  ) : (
                  <div className="flex items-center justify-between gap-4">
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
                    <button
                      type="button"
                      onClick={() => setEditingTransactionId(transaction.id)}
                      className="rounded-lg p-1.5 text-zinc-400 transition hover:bg-zinc-100 hover:text-emerald-600 dark:hover:bg-zinc-800"
                      aria-label="Edit transaction"
                    >
                      <PencilIcon />
                    </button>
                    <DeleteButton transactionId={transaction.id} />
                  </div>
                  </div>
                  )}
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
                Page {safeTransactionPage + 1} of {totalTransactionPages}
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

function CardSelectDropdown({
  cards,
  value,
  onChange,
  disabled,
}: {
  cards: BalanceCard[];
  value: number;
  onChange: (cardId: number) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const selectedCard = cards.find((card) => card.id === value);
  const selectedTheme = selectedCard
    ? cardThemeClasses(selectedCard.color_theme)
    : null;

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        disabled={disabled || cards.length === 0}
        onClick={() => setOpen((current) => !current)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`${inputClass} flex w-full items-center justify-between gap-2 text-left disabled:cursor-not-allowed disabled:opacity-60`}
      >
        <span className={`truncate font-medium ${selectedTheme?.text ?? "text-zinc-900 dark:text-zinc-50"}`}>
          {selectedCard?.name ?? "Select balance card"}
        </span>
        <ChevronDownIcon className={`shrink-0 text-zinc-500 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && cards.length > 0 && (
        <ul
          role="listbox"
          className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-zinc-200 bg-white py-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-950"
        >
          {cards.map((card) => {
            const theme = cardThemeClasses(card.color_theme);
            const isSelected = card.id === value;

            return (
              <li key={card.id} role="option" aria-selected={isSelected}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(card.id);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center justify-between px-3.5 py-2.5 text-left text-sm transition hover:bg-zinc-50 dark:hover:bg-zinc-900 ${
                    isSelected ? "bg-emerald-50 dark:bg-emerald-950/30" : ""
                  }`}
                >
                  <span className={`font-medium ${theme.text}`}>{card.name}</span>
                  {isSelected && (
                    <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                      Selected
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function TransactionEditForm({
  transaction,
  cards,
  todayKey,
  onCancel,
  onSaved,
}: {
  transaction: TransactionWithCard;
  cards: BalanceCard[];
  todayKey: string;
  onCancel: () => void;
  onSaved: () => void;
}) {
  async function saveTransaction(
    previousState: FinanceActionState | null,
    formData: FormData
  ) {
    const result = await updateTransactionAction(previousState, formData);
    if (result?.success) {
      onSaved();
    }
    return result;
  }

  const [state, formAction, isPending] = useActionState(
    saveTransaction,
    null as FinanceActionState | null
  );
  const [mode, setMode] = useState<TransactionType>(transaction.type);
  const [selectedCardId, setSelectedCardId] = useState<number>(
    transaction.card_id ?? cards[0]?.id ?? 0
  );

  return (
    <form action={formAction} className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 dark:border-emerald-900/50 dark:bg-emerald-950/20">
      <input type="hidden" name="transactionId" value={transaction.id} />
      <input type="hidden" name="type" value={mode} />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            Edit transaction
          </p>
          <p className="text-xs text-zinc-500">
            Changes will update the selected card balance automatically.
          </p>
        </div>
        <div className="flex gap-2">
          <TypeToggle active={mode === "deposit"} type="deposit" onClick={() => setMode("deposit")} />
          <TypeToggle active={mode === "expense"} type="expense" onClick={() => setMode("expense")} />
        </div>
      </div>

      {state?.error && (
        <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-300">
          {state.error}
        </div>
      )}

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Field label={mode === "deposit" ? "Deposit to" : "Deduct from"}>
          <CardSelectDropdown
            cards={cards}
            value={selectedCardId}
            onChange={setSelectedCardId}
            disabled={cards.length === 0}
          />
          <input type="hidden" name="cardId" value={selectedCardId} />
        </Field>

        <Field label="Transaction date">
          <input
            name="transactionDate"
            type="date"
            max={todayKey}
            defaultValue={transactionTimestampToDateInput(transaction.created_at)}
            required
            className={inputClass}
          />
        </Field>

        <Field label="Amount">
          <input
            name="amount"
            type="number"
            min="0.01"
            step="0.01"
            required
            defaultValue={transaction.amount}
            className={inputClass}
          />
        </Field>

        <Field label={mode === "deposit" ? "Reason / source" : "Expense name / reason"}>
          <input
            name="description"
            type="text"
            required
            defaultValue={transaction.description}
            className={inputClass}
          />
        </Field>
      </div>

      {mode === "expense" && (
        <div className="mt-4">
          <Field label="Category">
            <select
              name="category"
              required
              defaultValue={transaction.category ?? ""}
              className={inputClass}
            >
              <option value="">Select category</option>
              {EXPENSE_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </Field>
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={isPending || cards.length === 0}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-500 disabled:opacity-60"
        >
          {isPending ? "Saving..." : "Save changes"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-white dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

function ChevronDownIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      className={`h-4 w-4 ${className}`}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
    </svg>
  );
}

function PencilIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125" />
    </svg>
  );
}

function ChevronLeftIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
    </svg>
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
