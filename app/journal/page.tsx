"use client";

import { useState, useEffect } from "react";
import {
  getJournalEntries,
  deleteJournalEntry,
  JournalEntry,
} from "@/lib/storage";
import JournalEditor from "@/components/JournalEditor";

export default function JournalPage() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [mounted, setMounted] = useState(false);

  function reload() {
    setEntries(getJournalEntries());
  }

  useEffect(() => {
    setMounted(true);
    reload();
  }, []);

  if (!mounted) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Journal</h1>
          <p className="text-zinc-500 text-sm mt-1">
            {entries.length} {entries.length === 1 ? "entry" : "entries"}
          </p>
        </div>
        {!showNew && (
          <button
            onClick={() => setShowNew(true)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors"
          >
            New Entry
          </button>
        )}
      </div>

      {showNew && (
        <div className="mb-8 p-4 bg-zinc-900/50 border border-zinc-800 rounded-xl">
          <JournalEditor
            onSave={() => {
              reload();
              setShowNew(false);
            }}
            onCancel={() => setShowNew(false)}
          />
        </div>
      )}

      <div className="space-y-4">
        {entries.map((entry) => (
          <div
            key={entry.id}
            className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5 group"
          >
            {editingId === entry.id ? (
              <JournalEditor
                entry={entry}
                onSave={() => {
                  reload();
                  setEditingId(null);
                }}
                onCancel={() => setEditingId(null)}
              />
            ) : (
              <>
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-zinc-500">
                      {new Date(entry.created_at).toLocaleDateString("en-US", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                    {entry.mood && (
                      <span className="text-xs bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full">
                        {entry.mood}
                      </span>
                    )}
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => setEditingId(entry.id)}
                      className="text-zinc-500 hover:text-zinc-300 p-1"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
                      </svg>
                    </button>
                    <button
                      onClick={() => {
                        deleteJournalEntry(entry.id);
                        reload();
                      }}
                      className="text-zinc-500 hover:text-red-400 p-1"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
                <p className="text-sm text-zinc-300 whitespace-pre-wrap leading-relaxed">
                  {entry.content}
                </p>
              </>
            )}
          </div>
        ))}

        {entries.length === 0 && !showNew && (
          <div className="text-center py-16">
            <p className="text-zinc-600 text-sm">No journal entries yet.</p>
            <button
              onClick={() => setShowNew(true)}
              className="mt-3 text-indigo-400 hover:text-indigo-300 text-sm"
            >
              Write your first entry &rarr;
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
