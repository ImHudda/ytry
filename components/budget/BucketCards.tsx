"use client";

import { useEffect, useState } from "react";
import { Buckets, Transactions } from "@/lib/budget/store";
import type { Bucket, Transaction } from "@/lib/budget/types";

function startOfMonth(): Date {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function startOfWeek(): Date {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.getFullYear(), d.getMonth(), diff);
}

export default function BucketCards({ refreshKey = 0 }: { refreshKey?: number }) {
  const [buckets, setBuckets] = useState<Bucket[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  useEffect(() => {
    (async () => {
      const [bs, ts] = await Promise.all([Buckets.list(), Transactions.list()]);
      bs.sort((a, b) => a.orderIndex - b.orderIndex);
      setBuckets(bs);
      setTransactions(ts);
    })();
  }, [refreshKey]);

  const monthStart = startOfMonth();
  const weekStart = startOfWeek();

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {buckets.map((b) => {
        const bucketTxns = transactions.filter((t) => t.bucketId === b.id);
        const monthSpent = bucketTxns
          .filter((t) => new Date(t.occurredAt) >= monthStart)
          .reduce((s, t) => s + t.baseAmountINR, 0);
        const weekSpent = bucketTxns
          .filter((t) => new Date(t.occurredAt) >= weekStart)
          .reduce((s, t) => s + t.baseAmountINR, 0);
        const cap = b.weeklyCapINR ?? b.monthlyCapINR;
        const spent = b.weeklyCapINR != null ? weekSpent : monthSpent;
        const pct = cap ? Math.min(100, (spent / cap) * 100) : 0;
        return (
          <div
            key={b.id}
            className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/40"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: b.color }}
                />
                <span className="text-sm font-medium text-white">{b.name}</span>
                {b.locked && <span className="text-xs">🔒</span>}
              </div>
              <span className="text-[10px] text-zinc-600 uppercase">
                {b.weeklyCapINR != null ? "week" : "month"}
              </span>
            </div>
            <div className="mt-2 text-xl font-mono text-white">
              ₹{spent.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
              {cap && (
                <span className="text-xs text-zinc-600 ml-1">
                  / ₹{cap.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                </span>
              )}
            </div>
            {cap && (
              <div className="mt-2 h-1.5 rounded bg-zinc-800 overflow-hidden">
                <div
                  className="h-full rounded transition-all"
                  style={{
                    width: `${pct}%`,
                    backgroundColor: pct > 90 ? "#ef4444" : pct > 70 ? "#f59e0b" : b.color,
                  }}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
