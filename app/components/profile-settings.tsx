"use client";

import { useActionState, useEffect } from "react";
import { updateProfileAction, type ProfileActionState } from "@/app/actions/profile";
import type { PublicProfile } from "@/lib/auth/profile";

type ProfileSettingsProps = {
  profile: PublicProfile;
  onClose: () => void;
};

export function ProfileSettings({ profile, onClose }: ProfileSettingsProps) {
  const [state, formAction, isPending] = useActionState(
    updateProfileAction,
    null as ProfileActionState | null
  );

  useEffect(() => {
    if (state?.success) {
      onClose();
    }
  }, [state?.success, onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-700 dark:bg-zinc-900">
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          Edit profile
        </h3>
        <p className="mt-1 text-sm text-zinc-500">
          Update your username, full name, and email.
        </p>

        <form action={formAction} className="mt-5 space-y-4">
          {state?.error && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-300">
              {state.error}
            </div>
          )}
          {state?.success && (
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-300">
              {state.success}
            </div>
          )}

          <Field label="Username" name="username" defaultValue={profile.username} required />
          <Field label="Full name" name="fullName" defaultValue={profile.full_name ?? ""} />
          <Field
            label="Email"
            name="email"
            type="email"
            defaultValue={profile.email ?? ""}
            required
          />

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-zinc-200 px-4 py-2.5 text-sm font-medium dark:border-zinc-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60"
            >
              {isPending ? "Saving…" : "Save changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({
  label,
  name,
  defaultValue,
  type = "text",
  required,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
        {label}
      </span>
      <input
        name={name}
        type={type}
        defaultValue={defaultValue}
        required={required}
        className="w-full rounded-lg border border-zinc-200 bg-white px-3.5 py-2.5 text-sm dark:border-zinc-700 dark:bg-zinc-950"
      />
    </label>
  );
}
