"use client";

import { useEffect, useState } from "react";
import { Rules, Buckets } from "@/lib/budget/store";
import type { Rule, Bucket } from "@/lib/budget/types";

export default function RulesPage() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [buckets, setBuckets] = useState<Bucket[]>([]);
  const [draft, setDraft] = useState({
    matchType: "payee_contains" as Rule["matchType"],
    matchValue: "",
    setBucketId: "",
  });

  async function refresh() {
    const [rs, bs] = await Promise.all([Rules.list(), Buckets.list()]);
    rs.sort((a, b) => a.priority - b.priority);
    setRules(rs);
    setBuckets(bs);
  }

  useEffect(() => {
    refresh();
  }, []);

  async function handleAdd() {
    if (!draft.matchValue.trim() || !draft.setBucketId) return;
    const bucket = buckets.find((b) => b.id === draft.setBucketId);
    await Rules.create({
      description:
        draft.matchType === "payee_contains"
          ? `If payee contains "${draft.matchValue}" → ${bucket?.name ?? "bucket"}`
          : draft.matchType === "payee_equals"
          ? `If payee equals "${draft.matchValue}" → ${bucket?.name ?? "bucket"}`
          : `If amount in range ${draft.matchValue} → ${bucket?.name ?? "bucket"}`,
      matchType: draft.matchType,
      matchValue: draft.matchValue.trim(),
      setBucketId: draft.setBucketId,
      setCategoryId: null,
      priority: rules.length,
      enabled: true,
    });
    setDraft({ matchType: "payee_contains", matchValue: "", setBucketId: "" });
    refresh();
  }

  async function toggle(r: Rule) {
    await Rules.update(r.id, { enabled: !r.enabled });
    refresh();
  }

  async function remove(r: Rule) {
    if (!confirm(`Delete rule "${r.description}"?`)) return;
    await Rules.delete(r.id);
    refresh();
  }

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-xl font-bold text-white">Rules</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Rules auto-categorize transactions at create time. Processed in priority order; first
          match wins.
        </p>
      </div>

      <div className="space-y-2">
        {rules.length === 0 && (
          <p className="text-sm text-zinc-600">No rules yet. Add one below.</p>
        )}
        {rules.map((r) => (
          <div
            key={r.id}
            className="flex items-center gap-3 p-3 rounded-xl border border-zinc-800 bg-zinc-900/40"
          >
            <button
              onClick={() => toggle(r)}
              className={`w-2.5 h-2.5 rounded-full ${r.enabled ? "bg-emerald-500" : "bg-zinc-600"}`}
              title={r.enabled ? "enabled" : "disabled"}
            />
            <span className="text-sm text-white flex-1">{r.description}</span>
            <button
              onClick={() => remove(r)}
              className="text-xs text-zinc-600 hover:text-red-400"
            >
              delete
            </button>
          </div>
        ))}
      </div>

      <div className="p-4 rounded-xl border border-dashed border-zinc-700 space-y-3">
        <h2 className="text-sm font-medium text-zinc-300">Add rule</h2>
        <div className="flex gap-2 items-center">
          <span className="text-xs text-zinc-500">If</span>
          <select
            value={draft.matchType}
            onChange={(e) =>
              setDraft({ ...draft, matchType: e.target.value as Rule["matchType"] })
            }
            className="bg-zinc-900 border border-zinc-800 rounded px-2 py-1.5 text-white text-sm focus:outline-none focus:border-indigo-500"
          >
            <option value="payee_contains">payee contains</option>
            <option value="payee_equals">payee equals</option>
            <option value="amount_range">amount in range (lo-hi)</option>
          </select>
          <input
            type="text"
            value={draft.matchValue}
            onChange={(e) => setDraft({ ...draft, matchValue: e.target.value })}
            placeholder={draft.matchType === "amount_range" ? "100-500" : "swiggy"}
            className="flex-1 bg-zinc-900 border border-zinc-800 rounded px-2 py-1.5 text-white text-sm focus:outline-none focus:border-indigo-500"
          />
        </div>
        <div className="flex gap-2 items-center">
          <span className="text-xs text-zinc-500">Then set bucket to</span>
          <select
            value={draft.setBucketId}
            onChange={(e) => setDraft({ ...draft, setBucketId: e.target.value })}
            className="flex-1 bg-zinc-900 border border-zinc-800 rounded px-2 py-1.5 text-white text-sm focus:outline-none focus:border-indigo-500"
          >
            <option value="">(select bucket)</option>
            {buckets.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
        <button
          onClick={handleAdd}
          disabled={!draft.matchValue.trim() || !draft.setBucketId}
          className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-sm rounded-lg"
        >
          Add rule
        </button>
      </div>
    </div>
  );
}
