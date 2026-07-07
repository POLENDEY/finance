"use client";

import { useEffect, useState } from "react";
import type { FundTransfer } from "@/lib/types/finance";

const PAGE_SIZE = 5;

type TransferHistoryProps = {
  transfers: FundTransfer[];
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

function transferLabel(direction: FundTransfer["direction"]) {
  if (direction === "to_allowance") {
    return { from: "Net Worth", to: "Allowance", arrow: "→" };
  }
  return { from: "Allowance", to: "Net Worth", arrow: "→" };
}

export function TransferHistory({ transfers }: TransferHistoryProps) {
  const [showHistory, setShowHistory] = useState(false);
  const [page, setPage] = useState(0);

  const totalPages = Math.max(1, Math.ceil(transfers.length / PAGE_SIZE));
  const pagedTransfers = transfers.slice(
    page * PAGE_SIZE,
    page * PAGE_SIZE + PAGE_SIZE
  );

  useEffect(() => {
    const lastPage = Math.max(0, Math.ceil(transfers.length / PAGE_SIZE) - 1);
    if (page > lastPage) {
      setPage(lastPage);
    }
  }, [transfers.length, page]);

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-center justify-between gap-4 px-6 py-4">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            Transfer history
          </h2>
          <p className="mt-1 text-sm text-zinc-500">
            Moves between Net Worth and Allowance Balance
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowHistory((v) => !v)}
          className="shrink-0 rounded-lg border border-zinc-200 px-3 py-1.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          {showHistory ? "Hide" : "Show"}
        </button>
      </div>

      {showHistory && (
        <>
          <div className="border-t border-zinc-200 dark:border-zinc-800" />

          {transfers.length === 0 ? (
            <p className="px-6 py-10 text-center text-sm text-zinc-500">
              No transfers yet. Use the links on the balance cards above.
            </p>
          ) : (
            <>
              <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {pagedTransfers.map((transfer) => {
              const { from, to, arrow } = transferLabel(transfer.direction);
              const isToAllowance = transfer.direction === "to_allowance";

              return (
                <li
                  key={transfer.id}
                  className="flex items-center justify-between gap-4 px-6 py-4"
                >
                  <div className="flex items-start gap-3">
                    <span
                      className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                        isToAllowance
                          ? "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300"
                          : "bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300"
                      }`}
                    >
                      {arrow}
                    </span>
                    <div>
                      <p className="font-medium text-zinc-900 dark:text-zinc-50">
                        <span
                          className={
                            isToAllowance
                              ? "text-violet-700 dark:text-violet-300"
                              : "text-sky-700 dark:text-sky-300"
                          }
                        >
                          {from}
                        </span>
                        <span className="mx-1.5 text-zinc-400">{arrow}</span>
                        <span
                          className={
                            isToAllowance
                              ? "text-sky-700 dark:text-sky-300"
                              : "text-violet-700 dark:text-violet-300"
                          }
                        >
                          {to}
                        </span>
                      </p>
                      <p className="text-xs text-zinc-500">
                        {formatDate(transfer.created_at)}
                      </p>
                    </div>
                  </div>

                  <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                    {formatMoney(transfer.amount)}
                  </span>
                </li>
              );
            })}
          </ul>

          <div className="flex items-center justify-between border-t border-zinc-200 px-6 py-3 dark:border-zinc-800">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="rounded-lg border border-zinc-200 px-3 py-1.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Prev
            </button>
            <p className="text-xs text-zinc-500">
              Page {page + 1} of {totalPages}
            </p>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="rounded-lg border border-zinc-200 px-3 py-1.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Next
            </button>
          </div>
            </>
          )}
        </>
      )}
    </section>
  );
}
