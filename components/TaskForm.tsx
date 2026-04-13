"use client";

import { useState } from "react";
import { Task, saveTask } from "@/lib/storage";

interface Props {
  onSave: (task: Task) => void;
}

export default function TaskForm({ onSave }: Props) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<Task["priority"]>("medium");
  const [dueDate, setDueDate] = useState("");
  const [expanded, setExpanded] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;

    const task = saveTask({
      title: title.trim(),
      description: description.trim(),
      priority,
      due_date: dueDate || null,
    });
    onSave(task);
    setTitle("");
    setDescription("");
    setPriority("medium");
    setDueDate("");
    setExpanded(false);
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
        Add a task
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/50 space-y-3">
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Task title"
        autoFocus
        className="w-full bg-transparent text-white placeholder:text-zinc-600 text-sm font-medium focus:outline-none"
      />
      <input
        type="text"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Description (optional)"
        className="w-full bg-transparent text-zinc-400 placeholder:text-zinc-700 text-xs focus:outline-none"
      />
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex gap-1">
          {(["low", "medium", "high"] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPriority(p)}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                priority === p
                  ? p === "high"
                    ? "bg-red-900/60 text-red-300"
                    : p === "medium"
                    ? "bg-amber-900/60 text-amber-300"
                    : "bg-zinc-700 text-zinc-300"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
        <input
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-400 focus:outline-none focus:border-indigo-500"
        />
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
          disabled={!title.trim()}
          className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-xs font-medium rounded-lg transition-colors"
        >
          Add
        </button>
      </div>
    </form>
  );
}
