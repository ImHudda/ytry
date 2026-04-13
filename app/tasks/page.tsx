"use client";

import { useState, useEffect } from "react";
import { getTasks, Task } from "@/lib/storage";
import TaskItem from "@/components/TaskItem";
import TaskForm from "@/components/TaskForm";

type Filter = "all" | "todo" | "in_progress" | "done";

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [mounted, setMounted] = useState(false);

  function reload() {
    setTasks(getTasks());
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

  const filtered =
    filter === "all" ? tasks : tasks.filter((t) => t.status === filter);

  const counts = {
    all: tasks.length,
    todo: tasks.filter((t) => t.status === "todo").length,
    in_progress: tasks.filter((t) => t.status === "in_progress").length,
    done: tasks.filter((t) => t.status === "done").length,
  };

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Tasks</h1>
        <p className="text-zinc-500 text-sm mt-1">
          {counts.todo + counts.in_progress} remaining &middot; {counts.done}{" "}
          completed
        </p>
      </div>

      {/* Filters */}
      <div className="flex gap-1 mb-6 bg-zinc-900/50 border border-zinc-800 rounded-lg p-1 w-fit">
        {(["all", "todo", "in_progress", "done"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
              filter === f
                ? "bg-zinc-800 text-white"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            {f === "all"
              ? "All"
              : f === "todo"
              ? "To Do"
              : f === "in_progress"
              ? "In Progress"
              : "Done"}{" "}
            <span className="text-zinc-600">{counts[f]}</span>
          </button>
        ))}
      </div>

      {/* Add task */}
      <div className="mb-4">
        <TaskForm onSave={reload} />
      </div>

      {/* Task list */}
      <div className="space-y-2">
        {filtered.map((task) => (
          <TaskItem key={task.id} task={task} onUpdate={reload} />
        ))}

        {filtered.length === 0 && (
          <div className="text-center py-16">
            <p className="text-zinc-600 text-sm">
              {filter === "all"
                ? "No tasks yet. Add one above!"
                : `No ${filter.replace("_", " ")} tasks.`}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
