"use client";

import { useEffect, useState } from "react";
import { Transactions, Buckets, Rules, applyRulesToTransaction } from "@/lib/budget/store";
import type { Bucket, Transaction, Currency } from "@/lib/budget/types";

const CURRENCIES: Currency[] = ["INR", "USD", "EUR", "GBP", "THB", "SGD", "AED", "JPY"];

export default function TransactionForm({ onSaved }: { onSaved: (t: Transaction) => void }) {
  const [buckets, setBuckets] = useState<Bucket[]>([]);
  const [expanded, setExpanded] = useState(false);
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState<Currency>("INR");
  const [rate, setRate] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [bucketId, setBucketId] = useState<string>("");
  const [payee, setPayee] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    Buckets.list().then((bs) => {
      setBuckets(bs);
      const lavish = bs.find((b) => b.kind === "lavish");
      if (lavish) setBucketId(lavish.id);
    });
  }, []);

  const amountNum = parseFloat(amount) || 0;
  const rateNum = currency === "INR" ? 1 : parseFloat(rate) || 0;
  const inrAmount = amountNum * rateNum;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!amountNum || !payee.trim() || !bucketId) return;
    if (currency !== "INR" && !rateNum) return;
    setBusy(true);
    try {
      const rules = await Rules.list();
      let draft: Omit<Transaction, "id" | "createdAt" | "updatedAt"> = {
        occurredAt: new Date(date).toISOString(),
        bucketId,
        categoryId: null,
        payee: payee.trim(),
        notes: notes.trim(),
        originalCurrency: currency,
        originalAmount: amountNum,
        baseAmountINR: inrAmount,
        rateUsed: rateNum,
        counterpartyId: null,
        conversionId: null,
        loanId: null,
        sourceEntryIds: [],
        primarySourceEntryId: null,
        ruleHitId: null,
      };
      const draftT = {
        ...draft,
        id: "",
        createdAt: "",
        updatedAt: "",
      } as Transaction;
      const afterRules = applyRulesToTransaction(draftT, rules);
      draft = {
        ...draft,
        bucketId: afterRules.bucketId,
        categoryId: afterRules.categoryId,
        ruleHitId: afterRules.ruleHitId,
      };
      const saved = await Transactions.create(draft);
      setAmount("");
      setRate("");
      setPayee("");
      setNotes("");
      setExpanded(false);
      onSaved(saved);
    } finally {
      setBusy(false);
    }
  }

  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="w-full flex items-center gap-2 px-4 py-3 rounded-xl border border-dashed border-zinc-700 text-zinc-500 hover:text-zinc-300 hover:border-zinc-500 transition-colors text-sm"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
        Add transaction
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/50 space-y-3">
      <div className="flex gap-2">
        <input
          type="number"
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Amount"
          autoFocus
          required
          className="flex-1 bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
        />
        <select
          value={currency}
          onChange={(e) => setCurrency(e.target.value as Currency)}
          className="bg-zinc-900 border border-zinc-800 rounded px-2 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
        >
          {CURRENCIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>
      {currency !== "INR" && (
        <div className="flex gap-2 items-center text-sm">
          <label className="text-zinc-500 text-xs">Rate</label>
          <input
            type="number"
            step="0.0001"
            value={rate}
            onChange={(e) => setRate(e.target.value)}
            placeholder={`1 ${currency} = ? INR`}
            required
            className="flex-1 bg-zinc-900 border border-zinc-800 rounded px-2 py-1.5 text-white text-xs focus:outline-none focus:border-indigo-500"
          />
          {inrAmount > 0 && (
            <span className="text-zinc-400 text-xs">≈ ₹{inrAmount.toFixed(2)}</span>
          )}
        </div>
      )}
      <input
        type="text"
        value={payee}
        onChange={(e) => setPayee(e.target.value)}
        placeholder="Payee"
        required
        className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
      />
      <div className="flex gap-2">
        <select
          value={bucketId}
          onChange={(e) => setBucketId(e.target.value)}
          required
          className="flex-1 bg-zinc-900 border border-zinc-800 rounded px-2 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
        >
          {buckets.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="bg-zinc-900 border border-zinc-800 rounded px-2 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
        />
      </div>
      <input
        type="text"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Notes (optional)"
        className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-zinc-400 placeholder:text-zinc-600 text-xs focus:outline-none focus:border-indigo-500"
      />
      <div className="flex items-center gap-2">
        <div className="flex-1" />
        <button
          type="button"
          onClick={() => setExpanded(false)}
          className="text-xs text-zinc-500 hover:text-zinc-300"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={busy || !amountNum || !payee.trim() || !bucketId}
          className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-xs font-medium rounded-lg transition-colors"
        >
          {busy ? "Saving…" : "Add"}
        </button>
      </div>
    </form>
  );
}
