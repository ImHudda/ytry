"use client";

import { useEffect, useState } from "react";
import { Buckets } from "@/lib/budget/store";
import type { Bucket } from "@/lib/budget/types";

const PRESET_COLORS = ["#f59e0b", "#10b981", "#6366f1", "#ec4899", "#ef4444", "#14b8a6", "#8b5cf6", "#f97316"];

export default function BucketsPage() {
  const [buckets, setBuckets] = useState<Bucket[]>([]);
  const [draft, setDraft] = useState<{ name: string; color: string }>({ name: "", color: PRESET_COLORS[0] });
  const [editing, setEditing] = useState<Record<string, { weeklyCapINR: string; monthlyCapINR: string }>>({});

  async function refresh() {
    const bs = await Buckets.list();
    bs.sort((a, b) => a.orderIndex - b.orderIndex);
    setBuckets(bs);
    const state: typeof editing = {};
    for (const b of bs) {
      state[b.id] = {
        weeklyCapINR: b.weeklyCapINR?.toString() ?? "",
        monthlyCapINR: b.monthlyCapINR?.toString() ?? "",
      };
    }
    setEditing(state);
  }

  useEffect(() => {
    refresh();
  }, []);

  async function handleAdd() {
    if (!draft.name.trim()) return;
    await Buckets.create({
      name: draft.name.trim(),
      kind: "custom",
      monthlyCapINR: null,
      weeklyCapINR: null,
      locked: false,
      color: draft.color,
      orderIndex: buckets.length,
    });
    setDraft({ name: "", color: PRESET_COLORS[0] });
    refresh();
  }

  async function handleSaveCap(b: Bucket) {
    const state = editing[b.id];
    await Buckets.update(b.id, {
      weeklyCapINR: state.weeklyCapINR ? parseFloat(state.weeklyCapINR) : null,
      monthlyCapINR: state.monthlyCapINR ? parseFloat(state.monthlyCapINR) : null,
    });
    refresh();
  }

  async function handleDelete(b: Bucket) {
    if (b.kind === "investment") {
      if (!confirm(`Delete the Investment bucket? This is padlocked and should stay. Type "DELETE INVESTMENT" to confirm.`)) return;
      const v = prompt(`Type "DELETE INVESTMENT" to confirm:`);
      if (v !== "DELETE INVESTMENT") return;
    } else if (!confirm(`Delete "${b.name}"?`)) return;
    await Buckets.delete(b.id);
    refresh();
  }

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-3xl mx-auto">
      <h1 className="text-xl font-bold text-white">Buckets</h1>

      <div className="space-y-3">
        {buckets.map((b) => (
          <div key={b.id} className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/40 space-y-3">
            <div className="flex items-center gap-3">
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: b.color }} />
              <span className="text-white font-medium">{b.name}</span>
              {b.locked && <span className="text-xs">🔒</span>}
              <span className="text-xs text-zinc-600 uppercase ml-2">{b.kind}</span>
              <div className="flex-1" />
              <button
                onClick={() => handleDelete(b)}
                className="text-xs text-zinc-600 hover:text-red-400"
              >
                delete
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <label className="flex flex-col gap-1">
                <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Weekly cap (INR)</span>
                <input
                  type="number"
                  value={editing[b.id]?.weeklyCapINR ?? ""}
                  onChange={(e) =>
                    setEditing((prev) => ({
                      ...prev,
                      [b.id]: { ...prev[b.id], weeklyCapINR: e.target.value },
                    }))
                  }
                  placeholder="e.g. 5000"
                  className="bg-zinc-900 border border-zinc-800 rounded px-2 py-1.5 text-white text-sm focus:outline-none focus:border-indigo-500"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Monthly cap (INR)</span>
                <input
                  type="number"
                  value={editing[b.id]?.monthlyCapINR ?? ""}
                  onChange={(e) =>
                    setEditing((prev) => ({
                      ...prev,
                      [b.id]: { ...prev[b.id], monthlyCapINR: e.target.value },
                    }))
                  }
                  placeholder="e.g. 20000"
                  className="bg-zinc-900 border border-zinc-800 rounded px-2 py-1.5 text-white text-sm focus:outline-none focus:border-indigo-500"
                />
              </label>
            </div>
            <button
              onClick={() => handleSaveCap(b)}
              className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white text-xs rounded-lg"
            >
              Save caps
            </button>
          </div>
        ))}
      </div>

      <div className="p-4 rounded-xl border border-dashed border-zinc-700 space-y-3">
        <h2 className="text-sm font-medium text-zinc-300">Add bucket</h2>
        <input
          type="text"
          value={draft.name}
          onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          placeholder="Bucket name"
          className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
        />
        <div className="flex gap-1.5 flex-wrap">
          {PRESET_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setDraft({ ...draft, color: c })}
              className={`w-6 h-6 rounded-full ${draft.color === c ? "ring-2 ring-white" : ""}`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
        <button
          onClick={handleAdd}
          disabled={!draft.name.trim()}
          className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-sm rounded-lg"
        >
          Add bucket
        </button>
      </div>
    </div>
  );
}
