"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  getTodayJournalEntry,
  getTasks,
  JournalEntry,
  Task,
} from "@/lib/storage";

export default function Dashboard() {
  const [todayEntry, setTodayEntry] = useState<JournalEntry | undefined>();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setTodayEntry(getTodayJournalEntry());
    setTasks(getTasks());
  }, []);

  if (!mounted) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const activeTasks = tasks.filter((t) => t.status !== "done");
  const doneTodayCount = tasks.filter(
    (t) =>
      t.status === "done" &&
      t.updated_at.split("T")[0] === new Date().toISOString().split("T")[0]
  ).length;

  const today = new Date();
  const greeting =
    today.getHours() < 12
      ? "Good morning"
      : today.getHours() < 18
      ? "Good afternoon"
      : "Good evening";

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">{greeting}</h1>
        <p className="text-zinc-500 text-sm mt-1">
          {today.toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
          })}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-8">
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
          <p className="text-2xl font-bold text-white">{activeTasks.length}</p>
          <p className="text-xs text-zinc-500">Active tasks</p>
        </div>
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
          <p className="text-2xl font-bold text-emerald-400">{doneTodayCount}</p>
          <p className="text-xs text-zinc-500">Done today</p>
        </div>
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
          <p className="text-2xl font-bold text-white">
            {todayEntry ? "1" : "0"}
          </p>
          <p className="text-xs text-zinc-500">Journal today</p>
        </div>
      </div>

      {/* Today's Journal */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">
            Today&apos;s Journal
          </h2>
          <Link
            href="/journal"
            className="text-xs text-indigo-400 hover:text-indigo-300"
          >
            {todayEntry ? "Edit" : "Write"} &rarr;
          </Link>
        </div>
        {todayEntry ? (
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
            {todayEntry.mood && (
              <span className="text-xs bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full mb-2 inline-block">
                {todayEntry.mood}
              </span>
            )}
            <p className="text-sm text-zinc-300 line-clamp-3">
              {todayEntry.content}
            </p>
          </div>
        ) : (
          <Link
            href="/journal"
            className="block bg-zinc-900/30 border border-dashed border-zinc-800 rounded-xl p-6 text-center hover:bg-zinc-900/50 hover:border-zinc-700 transition-colors"
          >
            <p className="text-zinc-500 text-sm">
              No journal entry yet today. Start writing?
            </p>
          </Link>
        )}
      </div>

      {/* Active Tasks */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">
            Active Tasks
          </h2>
          <Link
            href="/tasks"
            className="text-xs text-indigo-400 hover:text-indigo-300"
          >
            View all &rarr;
          </Link>
        </div>
        {activeTasks.length > 0 ? (
          <div className="space-y-2">
            {activeTasks.slice(0, 5).map((task) => (
              <div
                key={task.id}
                className="flex items-center gap-3 bg-zinc-900/50 border border-zinc-800 rounded-xl px-4 py-3"
              >
                <div
                  className={`w-2 h-2 rounded-full shrink-0 ${
                    task.priority === "high"
                      ? "bg-red-500"
                      : task.priority === "medium"
                      ? "bg-amber-500"
                      : "bg-zinc-500"
                  }`}
                />
                <span className="text-sm text-zinc-300 truncate flex-1">
                  {task.title}
                </span>
                <span className="text-[10px] text-zinc-600">
                  {task.status === "in_progress" ? "In Progress" : "To Do"}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <Link
            href="/tasks"
            className="block bg-zinc-900/30 border border-dashed border-zinc-800 rounded-xl p-6 text-center hover:bg-zinc-900/50 hover:border-zinc-700 transition-colors"
          >
            <p className="text-zinc-500 text-sm">No active tasks. Add one?</p>
          </Link>
        )}
      </div>
    </div>
  );
}
