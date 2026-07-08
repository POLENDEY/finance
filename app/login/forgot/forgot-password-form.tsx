"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import {
  requestPasswordResetOtpAction,
  resetPasswordWithOtpAction,
  type ProfileActionState,
} from "@/app/actions/profile";
import { PasswordField } from "../password-field";

export function ForgotPasswordForm() {
  const [step, setStep] = useState<"request" | "reset">("request");
  const [account, setAccount] = useState({ username: "", email: "" });

  const [requestState, requestAction, requestPending] = useActionState(
    requestPasswordResetOtpAction,
    null as ProfileActionState | null
  );
  const [resetState, resetAction, resetPending] = useActionState(
    resetPasswordWithOtpAction,
    null as ProfileActionState | null
  );

  function handleRequestSubmit(formData: FormData) {
    const username = (formData.get("username") as string).trim();
    const email = (formData.get("email") as string).trim();
    setAccount({ username, email });
    requestAction(formData);
  }

  useEffect(() => {
    if (requestState?.otpSent) {
      setStep("reset");
    }
  }, [requestState?.otpSent]);

  const state = step === "request" ? requestState : resetState;
  const isPending = step === "request" ? requestPending : resetPending;

  return (
    <div className="space-y-5">
      {state?.error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {state.error}
        </div>
      )}
      {state?.success && (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
          {state.success}
        </div>
      )}
      {requestState?.devOtp && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          <p className="font-medium">Your reset code (local testing)</p>
          <p className="mt-1 text-2xl font-bold tracking-[0.4em] text-amber-100">
            {requestState.devOtp}
          </p>
          <p className="mt-2 text-xs text-amber-300/80">
            {requestState.devOtpReason && requestState.devOtpReason !== "unconfigured"
              ? `Gmail could not send the email: ${requestState.devOtpReason} Use this code below to continue resetting your password.`
              : "No mail sender is configured yet. Use this code below to continue resetting your password."}
          </p>
        </div>
      )}

      {step === "request" ? (
        <form action={handleRequestSubmit} className="space-y-5">
          <p className="text-sm text-slate-400">
            Enter your username and recovery email. We&apos;ll send a one-time 6-digit code to
            verify your account.
          </p>
          <TextField id="username" label="Username" name="username" required placeholder="your_username" />
          <TextField id="email" label="Recovery email" name="email" type="email" required placeholder="you@company.com" />
          <button
            type="submit"
            disabled={requestPending}
            className="w-full rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60"
          >
            {requestPending ? "Sending code…" : "Send OTP code"}
          </button>
        </form>
      ) : (
        <form action={resetAction} className="space-y-5">
          <p className="text-sm text-slate-400">
            Enter the 6-digit code sent to <span className="text-slate-200">{account.email}</span>,
            then choose a new password. If you don&apos;t see the email, check your spam or junk
            folder too.
          </p>
          <input type="hidden" name="username" value={account.username} />
          <input type="hidden" name="email" value={account.email} />
          <TextField
            id="otp"
            label="6-digit code"
            name="otp"
            inputMode="numeric"
            pattern="\d{6}"
            maxLength={6}
            required
            placeholder="••••••"
            className="text-center tracking-[0.4em]"
          />
          <PasswordField id="password" label="New password" name="password" autoComplete="new-password" required placeholder="••••••••" />
          <PasswordField id="confirmPassword" label="Confirm new password" name="confirmPassword" autoComplete="new-password" required placeholder="••••••••" />
          <button
            type="submit"
            disabled={resetPending}
            className="w-full rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60"
          >
            {resetPending ? "Updating…" : "Reset password"}
          </button>
        </form>
      )}

      {step === "reset" && (
        <form action={requestAction} className="text-center">
          <input type="hidden" name="username" value={account.username} />
          <input type="hidden" name="email" value={account.email} />
          <button
            type="submit"
            disabled={requestPending}
            className="text-sm text-slate-400 hover:text-slate-200"
          >
            {requestPending ? "Sending…" : "Resend code"}
          </button>
        </form>
      )}

      <p className="text-center text-sm text-slate-500">
        <Link href="/login" className="text-emerald-400 hover:text-emerald-300">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}

function TextField({
  id,
  label,
  className,
  ...props
}: React.ComponentProps<"input"> & { label: string }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-slate-300">
        {label}
      </label>
      <input
        id={id}
        className={`w-full rounded-lg border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 ${className ?? ""}`}
        {...props}
      />
    </div>
  );
}
