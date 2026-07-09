"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { signIn, signUp, type AuthState } from "./actions";
import { PasswordField } from "./password-field";
import { PasswordStrengthHint } from "./password-strength-hint";

type AuthMode = "signin" | "signup";

export function LoginForm() {
  const [mode, setMode] = useState<AuthMode>("signin");
  const [signupPassword, setSignupPassword] = useState("");
  const [signInState, signInAction, signInPending] = useActionState(signIn, null);
  const [signUpState, signUpAction, signUpPending] = useActionState(signUp, null);

  const isSignUp = mode === "signup";
  const state: AuthState | null = isSignUp ? signUpState : signInState;
  const formAction = isSignUp ? signUpAction : signInAction;
  const isPending = isSignUp ? signUpPending : signInPending;

  return (
    <div>
      <div className="mb-6 flex rounded-lg border border-white/10 bg-white/5 p-1">
        <ModeButton active={!isSignUp} onClick={() => { setMode("signin"); setSignupPassword(""); }}>
          Sign in
        </ModeButton>
        <ModeButton active={isSignUp} onClick={() => setMode("signup")}>
          Sign up
        </ModeButton>
      </div>

      <form key={mode} action={formAction} className="space-y-5">
        {state?.error && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300" role="alert">
            {state.error}
          </div>
        )}

        {state?.success && (
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300" role="status">
            {state.success}
          </div>
        )}

        {isSignUp ? (
          <>
            <TextField
              id="username"
              label="Username"
              type="text"
              name="username"
              autoComplete="username"
              required
              placeholder="your_username"
            />
            <TextField
              id="signupEmail"
              label="Email address"
              type="email"
              name="signupEmail"
              autoComplete="email"
              required
              placeholder="you@company.com"
            />
            <TextField
              id="fullName"
              label="Full name"
              type="text"
              name="fullName"
              autoComplete="name"
              placeholder="Jane Doe"
            />
          </>
        ) : (
          <TextField
            id="email"
            label="Email or username"
            type="text"
            name="email"
            autoComplete="username"
            required
            placeholder="you@company.com or username"
          />
        )}

        {isSignUp ? (
          <SignupPasswordField
            value={signupPassword}
            onChange={setSignupPassword}
          />
        ) : (
          <PasswordField
            id="password"
            label="Password"
            name="password"
            autoComplete="current-password"
            required
            placeholder="••••••••"
          />
        )}

        {isSignUp && <PasswordStrengthHint password={signupPassword} />}

        {isSignUp && (
          <PasswordField
            id="confirmPassword"
            label="Confirm password"
            name="confirmPassword"
            autoComplete="new-password"
            required
            placeholder="••••••••"
          />
        )}

        {!isSignUp && (
          <div className="text-right">
            <Link
              href="/login/forgot"
              className="text-sm text-emerald-400 transition hover:text-emerald-300"
            >
              Forgot password?
            </Link>
          </div>
        )}

        <button
          type="submit"
          disabled={isPending}
          className="mt-2 w-full rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-500 disabled:opacity-60"
        >
          {isPending
            ? isSignUp
              ? "Creating account…"
              : "Signing in…"
            : isSignUp
              ? "Create account"
              : "Sign in"}
        </button>
      </form>
    </div>
  );
}

function ModeButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition ${
        active ? "bg-emerald-600 text-white shadow-sm" : "text-slate-400 hover:text-slate-200"
      }`}
    >
      {children}
    </button>
  );
}

function SignupPasswordField({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-slate-300">
        Password
      </label>
      <input
        id="password"
        name="password"
        type="password"
        autoComplete="new-password"
        required
        minLength={6}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="••••••••"
        className="w-full rounded-lg border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 outline-none transition focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20"
      />
    </div>
  );
}

function TextField({
  id,
  label,
  ...props
}: React.ComponentProps<"input"> & { label: string }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-slate-300">
        {label}
      </label>
      <input
        id={id}
        className="w-full rounded-lg border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 outline-none transition focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20"
        {...props}
      />
    </div>
  );
}
