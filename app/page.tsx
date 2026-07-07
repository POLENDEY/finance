import { loadFinanceData } from "@/app/actions/finance";
import { FinanceDashboard } from "@/app/components/finance-dashboard";
import { getProfileById } from "@/lib/auth/profile";
import { getSession } from "@/lib/auth/session";
import { signOut } from "@/app/login/actions";
import { redirect } from "next/navigation";

export default async function Home() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const profile = await getProfileById(session.profileId);
  const displayName = profile?.full_name ?? profile?.username ?? "User";
  const { transactions, fundTransfers, financeProfile, netWorthUnlocked, error } =
    await loadFinanceData();

  return (
    <div className="flex min-h-full flex-1 flex-col bg-zinc-50 dark:bg-zinc-950">
      <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-600 text-white">
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z"
                />
              </svg>
            </div>
            <span className="font-semibold text-zinc-900 dark:text-zinc-50">
              Finance Monitoring
            </span>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                {displayName}
              </p>
              <p className="text-xs text-zinc-500">@{profile?.username}</p>
            </div>
            <form action={signOut}>
              <button
                type="submit"
                className="rounded-lg border border-zinc-200 px-3 py-1.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Dashboard
          </h1>
          <p className="mt-1 text-zinc-600 dark:text-zinc-400">
            Welcome back, {displayName}. Track your deposits and expenses here.
          </p>
        </div>

        <FinanceDashboard
          transactions={transactions}
          fundTransfers={fundTransfers}
          financeProfile={financeProfile}
          netWorthUnlocked={netWorthUnlocked}
          loadError={error}
        />
      </main>
    </div>
  );
}
