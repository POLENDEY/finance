import Link from "next/link";
import { getSession } from "@/lib/auth/session";

export default async function NotFound() {
  const session = await getSession();

  return (
    <div className="flex min-h-full flex-1 items-center justify-center bg-zinc-50 px-4 py-12 dark:bg-zinc-950">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10 ring-1 ring-emerald-500/30 dark:bg-emerald-500/10">
          <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            404
          </span>
        </div>

        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Page not found
        </h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          The page you&apos;re looking for doesn&apos;t exist or may have been moved.
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href={session ? "/" : "/login"}
            className="rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-500"
          >
            {session ? "Back to dashboard" : "Back to sign in"}
          </Link>
          {session && (
            <Link
              href="/login"
              className="rounded-lg border border-zinc-200 px-5 py-2.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Sign in page
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
