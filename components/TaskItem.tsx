"use client";

import { Task, saveTask, deleteTask } from "@/lib/storage";

const statusColors: Record<string, string> = {
  todo: "bg-zinc-700 text-zinc-300",
  in_progress: "bg-amber-900/60 text-amber-300",
  done: "bg-emerald-900/60 text-emerald-300",
};

const priorityColors: Record<string, string> = {
  low: "text-zinc-500",
  medium: "text-amber-500",
  high: "text-red-500",
};

const statusLabels: Record<string, string> = {
  todo: "To Do",
  in_progress: "In Progress",
  done: "Done",
};

const nextStatus: Record<string, Task["status"]> = {
  todo: "in_progress",
  in_progress: "done",
  done: "todo",
};

interface Props {
  task: Task;
  onUpdate: () => void;
}

export default function TaskItem({ task, onUpdate }: Props) {
  function handleStatusToggle() {
    saveTask({ ...task, status: nextStatus[task.status] });
    onUpdate();
  }

  function handleDelete() {
    deleteTask(task.id);
    onUpdate();
  }

  return (
    <div
      className={`group flex items-start gap-3 p-4 rounded-xl border border-zinc-800 bg-zinc-900/50 hover:bg-zinc-900 transition-colors ${
        task.status === "done" ? "opacity-60" : ""
      }`}
    >
      <button
        onClick={handleStatusToggle}
        className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
          task.status === "done"
            ? "border-emerald-500 bg-emerald-500"
            : task.status === "in_progress"
            ? "border-amber-500"
            : "border-zinc-600 hover:border-zinc-400"
        }`}
      >
        {task.status === "done" && (
          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
        {task.status === "in_progress" && (
          <div className="w-2 h-2 rounded-full bg-amber-500" />
        )}
      </button>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span
            className={`text-sm font-medium ${
              task.status === "done" ? "line-through text-zinc-500" : "text-white"
            }`}
          >
            {task.title}
          </span>
          <span className={`text-xs ${priorityColors[task.priority]}`}>
            {task.priority === "high" ? "!!!" : task.priority === "medium" ? "!!" : "!"}
          </span>
        </div>
        {task.description && (
          <p className="text-xs text-zinc-500 mt-1 truncate">{task.description}</p>
        )}
        <div className="flex items-center gap-2 mt-2">
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${statusColors[task.status]}`}>
            {statusLabels[task.status]}
          </span>
          {task.due_date && (
            <span className="text-[10px] text-zinc-500">
              Due {new Date(task.due_date).toLocaleDateString()}
            </span>
          )}
        </div>
      </div>

      <button
        onClick={handleDelete}
        className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-red-400 transition-all"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
