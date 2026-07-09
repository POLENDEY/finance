"use client";

type PasswordStrengthHintProps = {
  password: string;
};

const CRITERIA = [
  {
    id: "length",
    label: "At least 8 characters",
    test: (value: string) => value.length >= 8,
  },
  {
    id: "upper",
    label: "One uppercase letter",
    test: (value: string) => /[A-Z]/.test(value),
  },
  {
    id: "lower",
    label: "One lowercase letter",
    test: (value: string) => /[a-z]/.test(value),
  },
  {
    id: "number",
    label: "One number",
    test: (value: string) => /\d/.test(value),
  },
  {
    id: "special",
    label: "One symbol (!@#$…)",
    test: (value: string) => /[^A-Za-z0-9]/.test(value),
  },
] as const;

export function isStrongPassword(password: string) {
  return CRITERIA.every((rule) => rule.test(password));
}

export function PasswordStrengthHint({ password }: PasswordStrengthHintProps) {
  const metCount = CRITERIA.filter((rule) => rule.test(password)).length;
  const strength =
    password.length === 0
      ? "empty"
      : metCount <= 2
        ? "weak"
        : metCount <= 4
          ? "fair"
          : "strong";

  return (
    <div className="rounded-lg border border-white/10 bg-white/5 px-3.5 py-3">
      <p className="text-xs font-medium text-slate-300">
        Use a strong password to keep your account safe
      </p>
      <p className="mt-1 text-[11px] text-slate-500">
        Mix uppercase and lowercase letters, numbers, and symbols.
      </p>

      {password.length > 0 && (
        <div className="mt-3">
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((segment) => (
              <span
                key={segment}
                className={`h-1 flex-1 rounded-full transition ${
                  segment <= metCount
                    ? strength === "strong"
                      ? "bg-emerald-500"
                      : strength === "fair"
                        ? "bg-amber-500"
                        : "bg-rose-500"
                    : "bg-white/10"
                }`}
              />
            ))}
          </div>
          <p
            className={`mt-1.5 text-[11px] font-medium ${
              strength === "strong"
                ? "text-emerald-400"
                : strength === "fair"
                  ? "text-amber-400"
                  : "text-rose-400"
            }`}
          >
            {strength === "strong"
              ? "Strong password"
              : strength === "fair"
                ? "Getting stronger — add more variety"
                : "Weak — try the tips below"}
          </p>
        </div>
      )}

      <ul className="mt-3 space-y-1.5">
        {CRITERIA.map((rule) => {
          const met = rule.test(password);
          return (
            <li
              key={rule.id}
              className={`flex items-center gap-2 text-[11px] ${
                met ? "text-emerald-400" : "text-slate-500"
              }`}
            >
              <span
                className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] ${
                  met ? "bg-emerald-500/20" : "bg-white/5"
                }`}
                aria-hidden="true"
              >
                {met ? "✓" : "·"}
              </span>
              {rule.label}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
