// Client-side storage utilities using localStorage
// Can be swapped to API calls when Vercel Postgres is set up

export interface JournalEntry {
  id: string;
  content: string;
  mood: string;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: "todo" | "in_progress" | "done";
  priority: "low" | "medium" | "high";
  due_date: string | null;
  created_at: string;
  updated_at: string;
}

const JOURNAL_KEY = "ytry_journal";
const TASKS_KEY = "ytry_tasks";

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

// Journal operations
export function getJournalEntries(): JournalEntry[] {
  if (typeof window === "undefined") return [];
  const data = localStorage.getItem(JOURNAL_KEY);
  return data ? JSON.parse(data) : [];
}

export function getJournalEntry(id: string): JournalEntry | undefined {
  return getJournalEntries().find((e) => e.id === id);
}

export function getTodayJournalEntry(): JournalEntry | undefined {
  const today = new Date().toISOString().split("T")[0];
  return getJournalEntries().find(
    (e) => e.created_at.split("T")[0] === today
  );
}

export function saveJournalEntry(
  entry: Partial<JournalEntry> & { content: string }
): JournalEntry {
  const entries = getJournalEntries();
  const now = new Date().toISOString();

  if (entry.id) {
    const idx = entries.findIndex((e) => e.id === entry.id);
    if (idx >= 0) {
      entries[idx] = { ...entries[idx], ...entry, updated_at: now };
      localStorage.setItem(JOURNAL_KEY, JSON.stringify(entries));
      return entries[idx];
    }
  }

  const newEntry: JournalEntry = {
    id: generateId(),
    content: entry.content,
    mood: entry.mood || "",
    created_at: now,
    updated_at: now,
  };
  entries.unshift(newEntry);
  localStorage.setItem(JOURNAL_KEY, JSON.stringify(entries));
  return newEntry;
}

export function deleteJournalEntry(id: string): void {
  const entries = getJournalEntries().filter((e) => e.id !== id);
  localStorage.setItem(JOURNAL_KEY, JSON.stringify(entries));
}

// Task operations
export function getTasks(): Task[] {
  if (typeof window === "undefined") return [];
  const data = localStorage.getItem(TASKS_KEY);
  return data ? JSON.parse(data) : [];
}

export function getTask(id: string): Task | undefined {
  return getTasks().find((t) => t.id === id);
}

export function getTodayTasks(): Task[] {
  const today = new Date().toISOString().split("T")[0];
  return getTasks().filter(
    (t) => t.status !== "done" || t.updated_at.split("T")[0] === today
  );
}

export function saveTask(task: Partial<Task> & { title: string }): Task {
  const tasks = getTasks();
  const now = new Date().toISOString();

  if (task.id) {
    const idx = tasks.findIndex((t) => t.id === task.id);
    if (idx >= 0) {
      tasks[idx] = { ...tasks[idx], ...task, updated_at: now };
      localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
      return tasks[idx];
    }
  }

  const newTask: Task = {
    id: generateId(),
    title: task.title,
    description: task.description || "",
    status: task.status || "todo",
    priority: task.priority || "medium",
    due_date: task.due_date || null,
    created_at: now,
    updated_at: now,
  };
  tasks.unshift(newTask);
  localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
  return newTask;
}

export function deleteTask(id: string): void {
  const tasks = getTasks().filter((t) => t.id !== id);
  localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
}
