"use client";

import { useEffect, useState } from "react";
import { Transactions, Buckets } from "@/lib/budget/store";
import type { Bucket, Transaction } from "@/lib/budget/types";

export default function TransactionList({
  limit,
  refreshKey = 0,
}: {
  limit?: number;
  refreshKey?: number;
}) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [buckets, setBuckets] = useState<Record<string, Bucket>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [ts, bs] = await Promise.all([Transactions.list(), Buckets.list()]);
      ts.sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
      setTransactions(limit ? ts.slice(0, limit) : ts);
      setBuckets(Object.fromEntries(bs.map((b) => [b.id, b])));
      setLoading(false);
    })();
  }, [limit, refreshKey]);

  if (loading) return <p className="text-sm text-zinc-600">loading…</p>;
  if (transactions.length === 0) {
    return <p className="text-sm text-zinc-600">No transactions yet.</p>;
  }

  return (
    <div className="divide-y divide-zinc-900 rounded-xl border border-zinc-800 bg-zinc-900/30 overflow-hidden">
      {transactions.map((t) => {
        const bucket = t.bucketId ? buckets[t.bucketId] : null;
        return (
          <div key={t.id} className="flex items-center gap-3 px-4 py-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm text-white truncate">{t.payee}</span>
                {bucket && (
                  <span
                    className="text-[10px] px-1.5 py-0.5 rounded-full"
                    style={{
                      backgroundColor: `${bucket.color}25`,
                      color: bucket.color,
                    }}
                  >
                    {bucket.name}
                  </span>
                )}
              </div>
              {t.notes && <p className="text-xs text-zinc-500 truncate mt-0.5">{t.notes}</p>}
            </div>
            <div className="text-right">
              <div className="text-sm font-mono text-white">
                ₹{t.baseAmountINR.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
              </div>
              {t.originalCurrency !== "INR" && (
                <div className="text-[10px] text-zinc-600 font-mono">
                  {t.originalAmount.toFixed(2)} {t.originalCurrency}
                </div>
              )}
              <div className="text-[10px] text-zinc-600">
                {new Date(t.occurredAt).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                })}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
