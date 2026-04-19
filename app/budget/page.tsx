"use client";

import { useEffect, useState } from "react";
import { Transactions, Buckets } from "@/lib/budget/store";
import type { Bucket, Transaction } from "@/lib/budget/types";
import TransactionForm from "@/components/budget/TransactionForm";
import TransactionList from "@/components/budget/TransactionList";
import BucketCards from "@/components/budget/BucketCards";

function startOfWeek(): Date {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.getFullYear(), d.getMonth(), diff);
}

export default function BudgetDashboard() {
  const [refresh, setRefresh] = useState(0);
  const [summary, setSummary] = useState<{
    safeToday: number;
    weekSpent: number;
    lavishCap: number | null;
  }>({ safeToday: 0, weekSpent: 0, lavishCap: null });

  useEffect(() => {
    (async () => {
      const [ts, bs] = await Promise.all([Transactions.list(), Buckets.list()]);
      const lavish = bs.find((b) => b.kind === "lavish");
      const weekStart = startOfWeek();
      const weekTxns = ts.filter(
        (t: Transaction) =>
          t.bucketId === lavish?.id && new Date(t.occurredAt) >= weekStart
      );
      const weekSpent = weekTxns.reduce((s, t) => s + t.baseAmountINR, 0);
      const lavishCap = lavish?.weeklyCapINR ?? null;
      const daysLeft = Math.max(1, 7 - ((new Date().getTime() - weekStart.getTime()) / 86400000));
      const remaining = lavishCap != null ? Math.max(0, lavishCap - weekSpent) : 0;
      const safeToday = lavishCap != null ? Math.floor(remaining / daysLeft) : 0;
      setSummary({ safeToday, weekSpent, lavishCap });
    })();
  }, [refresh]);

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-5xl mx-auto">
      <section className="p-6 rounded-2xl border border-zinc-800 bg-gradient-to-br from-zinc-900 to-zinc-900/50">
        <div className="text-xs uppercase tracking-wider text-zinc-500">Safe to spend today</div>
        <div className="mt-1 text-4xl sm:text-5xl font-mono text-white">
          {summary.lavishCap != null ? (
            <>₹{summary.safeToday.toLocaleString("en-IN")}</>
          ) : (
            <span className="text-zinc-600 text-xl">Set a weekly Lavish cap to enable</span>
          )}
        </div>
        {summary.lavishCap != null && (
          <div className="mt-1 text-xs text-zinc-500">
            ₹{summary.weekSpent.toLocaleString("en-IN")} / ₹
            {summary.lavishCap.toLocaleString("en-IN")} spent this week
          </div>
        )}
        <div className="mt-3 text-xs text-zinc-600 italic">
          WHOOP-driven dynamic cap lands in M3. For now, set weekly caps manually in the Buckets tab.
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-wider">Buckets</h2>
        <BucketCards refreshKey={refresh} />
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-wider">
            Recent transactions
          </h2>
        </div>
        <TransactionForm onSaved={() => setRefresh((n) => n + 1)} />
        <TransactionList limit={10} refreshKey={refresh} />
      </section>
    </div>
  );
}
