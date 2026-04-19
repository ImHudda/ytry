"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { lockVault } from "@/lib/budget/vault";

const tabs = [
  { href: "/budget", label: "Dashboard" },
  { href: "/budget/transactions", label: "Transactions" },
  { href: "/budget/statements", label: "Statements" },
  { href: "/budget/buckets", label: "Buckets" },
  { href: "/budget/rules", label: "Rules" },
];

export default function BudgetNav() {
  const pathname = usePathname();
  return (
    <div className="flex items-center justify-between border-b border-zinc-800 px-4 sm:px-6 py-3 bg-zinc-950/70 backdrop-blur-sm sticky top-0 z-10">
      <div className="flex gap-1 overflow-x-auto">
        {tabs.map((t) => {
          const active = pathname === t.href;
          return (
            <Link
              key={t.href}
              href={t.href}
              className={`px-3 py-1.5 rounded-md text-sm font-medium whitespace-nowrap transition-colors ${
                active
                  ? "text-white bg-zinc-800"
                  : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900"
              }`}
            >
              {t.label}
            </Link>
          );
        })}
      </div>
      <button
        onClick={lockVault}
        className="text-xs text-zinc-500 hover:text-zinc-300 px-2 py-1 rounded"
        title="Lock vault"
      >
        🔒 Lock
      </button>
    </div>
  );
}
