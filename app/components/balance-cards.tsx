"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import {
  hideNetWorthAction,
  setupPinAction,
  transferToAllowanceAction,
  transferToNetWorthAction,
  updatePinRequiredAction,
  verifyPinAction,
  type FinanceActionState,
  type PinActionState,
} from "@/app/actions/finance";
import type { FinanceProfile } from "@/lib/finance/balances";

type BalanceCardsProps = {
  financeProfile: FinanceProfile | null;
  netWorthUnlocked: boolean;
};

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
  }).format(value);
}

export function BalanceCards({
  financeProfile,
  netWorthUnlocked: initialUnlocked,
}: BalanceCardsProps) {
  const [unlocked, setUnlocked] = useState(initialUnlocked);
  const [pinModal, setPinModal] = useState<"setup" | "verify" | null>(null);
  const [showTransferToAllowance, setShowTransferToAllowance] = useState(false);
  const [showTransferToNetWorth, setShowTransferToNetWorth] = useState(false);

  useEffect(() => {
    setUnlocked(initialUnlocked);
  }, [initialUnlocked]);

  const allowance = financeProfile?.allowance_balance ?? 0;
  const netWorth = financeProfile?.net_worth ?? 0;
  const hasPin = Boolean(financeProfile?.net_worth_pin_hash);
  const pinRequired = financeProfile?.net_worth_pin_required ?? true;

  function handleHide() {
    hideNetWorthAction().then(() => {
      setUnlocked(false);
      setShowTransferToAllowance(false);
    });
  }

  function handleToggleVisibility() {
    if (unlocked) {
      handleHide();
      return;
    }

    if (!pinRequired) {
      setUnlocked(true);
      return;
    }

    setPinModal(hasPin ? "verify" : "setup");
  }

  function handlePinSuccess() {
    setUnlocked(true);
    setPinModal(null);
  }

  return (
    <>
      <section className="grid gap-4 lg:grid-cols-2">
        <div className="relative overflow-hidden rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50 to-indigo-100 p-5 dark:border-violet-900 dark:from-violet-950/60 dark:to-indigo-950/40">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-violet-700 dark:text-violet-300">
                Net Worth
              </p>
              <p className="mt-2 text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                {unlocked ? formatMoney(netWorth) : "••••••"}
              </p>
              <p className="mt-1 text-xs text-violet-600/80 dark:text-violet-400/80">
                {unlocked
                  ? "Protected balance — hide when done"
                  : pinRequired
                    ? "Hidden — enter PIN to view"
                    : "Hidden — tap eye to view"}
              </p>
            </div>
            <button
              type="button"
              onClick={handleToggleVisibility}
              className="rounded-xl border border-violet-300/60 bg-white/70 p-2.5 text-violet-700 transition hover:bg-white dark:border-violet-700 dark:bg-violet-950/50 dark:text-violet-300 dark:hover:bg-violet-900/60"
              aria-label={unlocked ? "Hide net worth" : "Show net worth"}
            >
              {unlocked ? <EyeOffIcon /> : <EyeIcon />}
            </button>
          </div>

          {unlocked && (
            <div className="mt-4 space-y-3 border-t border-violet-200/70 pt-4 dark:border-violet-800/70">
              <PinRequiredSetting pinRequired={pinRequired} hasPin={hasPin} />
              <button
                type="button"
                onClick={() => setShowTransferToAllowance((v) => !v)}
                className="text-sm font-medium text-violet-700 underline-offset-2 hover:underline dark:text-violet-300"
              >
                {showTransferToAllowance
                  ? "Cancel transfer"
                  : "Transfer to allowance →"}
              </button>
              {showTransferToAllowance && (
                <TransferToAllowanceForm
                  hasPin={hasPin}
                  onSuccess={() => setShowTransferToAllowance(false)}
                />
              )}
            </div>
          )}

          {!unlocked && (
            <div className="mt-4 border-t border-violet-200/70 pt-4 dark:border-violet-800/70">
              <PinRequiredSetting pinRequired={pinRequired} hasPin={hasPin} />
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-sky-200 bg-gradient-to-br from-sky-50 to-cyan-100 p-5 dark:border-sky-900 dark:from-sky-950/60 dark:to-cyan-950/40">
          <p className="text-sm font-medium text-sky-700 dark:text-sky-300">
            Allowance Balance
          </p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            {formatMoney(allowance)}
          </p>
          <p className="mt-1 text-xs text-sky-600/80 dark:text-sky-400/80">
            Your spending balance for deposits & expenses
          </p>

          <div className="mt-4 space-y-3 border-t border-sky-200/70 pt-4 dark:border-sky-800/70">
            <button
              type="button"
              onClick={() => setShowTransferToNetWorth((v) => !v)}
              className="text-sm font-medium text-sky-700 underline-offset-2 hover:underline dark:text-sky-300"
            >
              {showTransferToNetWorth
                ? "Cancel transfer"
                : "← Transfer to net worth"}
            </button>
            {showTransferToNetWorth && (
              <TransferToNetWorthForm
                hasPin={hasPin}
                onNeedPin={() => setPinModal(hasPin ? "verify" : "setup")}
                onSuccess={() => setShowTransferToNetWorth(false)}
              />
            )}
          </div>
        </div>
      </section>

      {pinModal && (
        <PinModal
          mode={pinModal}
          onClose={() => setPinModal(null)}
          onSuccess={handlePinSuccess}
        />
      )}
    </>
  );
}

function PinModal({
  mode,
  onClose,
  onSuccess,
}: {
  mode: "setup" | "verify";
  onClose: () => void;
  onSuccess: () => void;
}) {
  const action = mode === "setup" ? setupPinAction : verifyPinAction;
  const [state, formAction, isPending] = useActionState(
    action,
    null as PinActionState | null
  );

  useEffect(() => {
    if (state?.unlocked) {
      onSuccess();
    }
  }, [state?.unlocked, onSuccess]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-700 dark:bg-zinc-900">
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          {mode === "setup" ? "Create your 6-digit PIN" : "Enter your PIN"}
        </h3>
        <p className="mt-1 text-sm text-zinc-500">
          {mode === "setup"
            ? "Set a PIN to protect and view your net worth."
            : "Enter your PIN to reveal net worth."}
        </p>

        <form action={formAction} className="mt-5 space-y-4">
          {state?.error && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-300">
              {state.error}
            </div>
          )}

          <PinInput
            id="pin"
            name="pin"
            label={mode === "setup" ? "New PIN" : "PIN"}
          />

          {mode === "setup" && (
            <PinInput id="confirmPin" name="confirmPin" label="Confirm PIN" />
          )}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-zinc-200 px-4 py-2.5 text-sm font-medium text-zinc-700 dark:border-zinc-700 dark:text-zinc-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-60"
            >
              {isPending ? "Checking…" : mode === "setup" ? "Save PIN" : "Unlock"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function PinInput({
  id,
  name,
  label,
}: {
  id: string;
  name: string;
  label: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
        {label}
      </span>
      <input
        id={id}
        name={name}
        type="password"
        inputMode="numeric"
        pattern="\d{6}"
        maxLength={6}
        required
        placeholder="••••••"
        className="w-full rounded-lg border border-zinc-200 bg-white px-3.5 py-2.5 text-center text-lg tracking-[0.4em] text-zinc-900 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
      />
    </label>
  );
}

function PinRequiredSetting({
  pinRequired,
  hasPin,
}: {
  pinRequired: boolean;
  hasPin: boolean;
}) {
  const [state, formAction, isPending] = useActionState(
    updatePinRequiredAction,
    null as FinanceActionState | null
  );
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.success) {
      setShowConfirmModal(false);
    }
  }, [state?.success]);

  function handleToggleClick() {
    if (pinRequired) {
      setShowConfirmModal(true);
      return;
    }

    formRef.current?.requestSubmit();
  }

  return (
    <>
      <form ref={formRef} action={formAction} className="space-y-2">
        <input type="hidden" name="pinRequired" value={pinRequired ? "false" : "true"} />
        <div className="flex items-center justify-between gap-3 rounded-xl bg-white/60 px-3 py-2 dark:bg-violet-950/30">
          <div>
            <p className="text-xs font-medium text-violet-800 dark:text-violet-200">
              Require PIN to view
            </p>
            <p className="text-[11px] text-violet-600/80 dark:text-violet-400/80">
              {pinRequired ? "PIN needed to unhide" : "No PIN needed to unhide"}
            </p>
          </div>
          <button
            type="button"
            onClick={handleToggleClick}
            disabled={isPending}
            className={`relative h-6 w-11 rounded-full transition disabled:opacity-60 ${
              pinRequired ? "bg-violet-600" : "bg-zinc-300 dark:bg-zinc-600"
            }`}
            aria-label="Toggle PIN requirement"
          >
            <span
              className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition ${
                pinRequired ? "left-5" : "left-0.5"
              }`}
            />
          </button>
        </div>
        {state?.success && !showConfirmModal && (
          <p className="text-xs text-emerald-600 dark:text-emerald-300">{state.success}</p>
        )}
        {state?.error && !showConfirmModal && (
          <p className="text-xs text-red-600 dark:text-red-300">{state.error}</p>
        )}
      </form>

      {showConfirmModal && (
        <DisablePinRequiredModal
          hasPin={hasPin}
          formAction={formAction}
          isPending={isPending}
          error={state?.error}
          onClose={() => setShowConfirmModal(false)}
        />
      )}
    </>
  );
}

function DisablePinRequiredModal({
  hasPin,
  formAction,
  isPending,
  error,
  onClose,
}: {
  hasPin: boolean;
  formAction: (payload: FormData) => void;
  isPending: boolean;
  error?: string;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-700 dark:bg-zinc-900">
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          {hasPin ? "Enter your PIN" : "Create a PIN to confirm"}
        </h3>
        <p className="mt-1 text-sm text-zinc-500">
          {hasPin
            ? "Enter your PIN to turn off PIN protection for net worth."
            : "Set a PIN first, then protection can be turned off."}
        </p>

        <form action={formAction} className="mt-5 space-y-4">
          <input type="hidden" name="pinRequired" value="false" />

          {error && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-300">
              {error}
            </div>
          )}

          <PinInput
            id="disable-pin"
            name="pin"
            label={hasPin ? "PIN" : "New PIN"}
          />

          {!hasPin && (
            <PinInput id="disable-confirm-pin" name="confirmPin" label="Confirm PIN" />
          )}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-zinc-200 px-4 py-2.5 text-sm font-medium text-zinc-700 dark:border-zinc-700 dark:text-zinc-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-60"
            >
              {isPending ? "Confirming…" : "Confirm"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function TransferToAllowanceForm({
  hasPin,
  onSuccess,
}: {
  hasPin: boolean;
  onSuccess: () => void;
}) {
  const [state, formAction, isPending] = useActionState(
    transferToAllowanceAction,
    null as FinanceActionState | null
  );

  useEffect(() => {
    if (state?.success) {
      onSuccess();
    }
  }, [state?.success, onSuccess]);

  return (
    <form action={formAction} className="space-y-3 rounded-xl bg-white/60 p-3 dark:bg-violet-950/30">
      {state?.error && (
        <p className="text-xs text-red-600 dark:text-red-300">{state.error}</p>
      )}
      {state?.success && (
        <p className="text-xs text-emerald-600 dark:text-emerald-300">
          {state.success}
        </p>
      )}
      <div className={`grid gap-2 ${hasPin ? "sm:grid-cols-2" : ""}`}>
        <input
          name="amount"
          type="number"
          min="0.01"
          step="0.01"
          required
          placeholder="Amount"
          className={inputClass}
        />
        {hasPin && (
          <input
            name="pin"
            type="password"
            inputMode="numeric"
            pattern="\d{6}"
            maxLength={6}
            required
            placeholder="PIN"
            className={inputClass}
          />
        )}
      </div>
      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-60"
      >
        {isPending ? "Transferring…" : "Transfer to allowance"}
      </button>
    </form>
  );
}

function TransferToNetWorthForm({
  hasPin,
  onSuccess,
}: {
  hasPin: boolean;
  onNeedPin: () => void;
  onSuccess: () => void;
}) {
  const [state, formAction, isPending] = useActionState(
    transferToNetWorthAction,
    null as FinanceActionState | null
  );

  useEffect(() => {
    if (state?.success) {
      onSuccess();
    }
  }, [state?.success, onSuccess]);

  return (
    <form action={formAction} className="space-y-3 rounded-xl bg-white/60 p-3 dark:bg-sky-950/30">
      {state?.error && (
        <p className="text-xs text-red-600 dark:text-red-300">{state.error}</p>
      )}
      {state?.success && (
        <p className="text-xs text-emerald-600 dark:text-emerald-300">
          {state.success}
        </p>
      )}
      <div className={`grid gap-2 ${hasPin ? "sm:grid-cols-2" : ""}`}>
        <input
          name="amount"
          type="number"
          min="0.01"
          step="0.01"
          required
          placeholder="Amount"
          className={inputClass}
        />
        {hasPin && (
          <input
            name="pin"
            type="password"
            inputMode="numeric"
            pattern="\d{6}"
            maxLength={6}
            required
            placeholder="PIN"
            className={inputClass}
          />
        )}
      </div>
      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-60"
      >
        {isPending ? "Transferring…" : "Transfer to net worth"}
      </button>
    </form>
  );
}

function EyeIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.964-7.178Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
    </svg>
  );
}

const inputClass =
  "w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50";
