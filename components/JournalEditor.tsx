"use client";

import { useState } from "react";
import { JournalEntry, saveJournalEntry } from "@/lib/storage";

const moods = [
  { emoji: "😊", label: "Happy" },
  { emoji: "😌", label: "Calm" },
  { emoji: "😤", label: "Frustrated" },
  { emoji: "😢", label: "Sad" },
  { emoji: "🔥", label: "Productive" },
  { emoji: "😴", label: "Tired" },
];

interface Props {
  entry?: JournalEntry;
  onSave: (entry: JournalEntry) => void;
  onCancel?: () => void;
}

export default function JournalEditor({ entry, onSave, onCancel }: Props) {
  const [content, setContent] = useState(entry?.content || "");
  const [mood, setMood] = useState(entry?.mood || "");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;

    const saved = saveJournalEntry({
      id: entry?.id,
      content: content.trim(),
      mood,
    });
    onSave(saved);
    if (!entry) {
      setContent("");
      setMood("");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-zinc-400 mb-2">
          How are you feeling?
        </label>
        <div className="flex gap-2 flex-wrap">
          {moods.map((m) => (
            <button
              key={m.label}
              type="button"
              onClick={() => setMood(m.label)}
              className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                mood === m.label
                  ? "bg-indigo-600 text-white"
                  : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
              }`}
            >
              {m.emoji} {m.label}
            </button>
          ))}
        </div>
      </div>

      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="What's on your mind today..."
        rows={6}
        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 resize-none"
      />

      <div className="flex gap-2 justify-end">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm text-zinc-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={!content.trim()}
          className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
        >
          {entry ? "Update" : "Save Entry"}
        </button>
      </div>
    </form>
  );
}
