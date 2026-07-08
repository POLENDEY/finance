"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ProfileSettings } from "@/app/components/profile-settings";
import type { PublicProfile } from "@/lib/auth/profile";

export function ProfileMenu({ profile }: { profile: PublicProfile }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const displayName = profile.full_name ?? profile.username;

  function handleClose() {
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="hidden text-right sm:block"
      >
        <p className="text-sm font-medium text-zinc-900 transition hover:text-emerald-600 dark:text-zinc-50 dark:hover:text-emerald-400">
          {displayName}
        </p>
        <p className="text-xs text-zinc-500">@{profile.username} · Edit profile</p>
      </button>

      {open && <ProfileSettings profile={profile} onClose={handleClose} />}
    </>
  );
}
