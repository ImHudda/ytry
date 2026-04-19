"use client";

export type FileKind =
  | "whoop_cycles"
  | "whoop_sleeps"
  | "whoop_workouts"
  | "csv_generic"
  | "pdf_unparsed"
  | "unknown";

export interface DetectedFile {
  kind: FileKind;
  confidence: "high" | "medium" | "low";
  filename: string;
  sizeBytes: number;
  hash: string;
  previewText: string;
}

const WHOOP_CYCLE_MARKERS = [
  "Cycle start time",
  "Cycle end time",
  "Recovery score",
  "Sleep performance",
];

const WHOOP_SLEEP_MARKERS = ["Sleep onset", "Wake onset", "Asleep duration", "Nap"];

const WHOOP_WORKOUT_MARKERS = ["Workout start time", "Workout end time", "Activity Strain"];

export async function hashFile(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function detectFile(file: File): Promise<DetectedFile> {
  const hash = await hashFile(file);
  const ext = file.name.toLowerCase().split(".").pop() ?? "";

  if (ext === "pdf") {
    return {
      kind: "pdf_unparsed",
      confidence: "low",
      filename: file.name,
      sizeBytes: file.size,
      hash,
      previewText: "(PDF — parser lands when you share a sample statement)",
    };
  }

  if (ext === "csv" || ext === "tsv" || ext === "txt") {
    const previewText = await readFirstBytes(file, 4096);
    const firstLine = previewText.split(/\r?\n/)[0] ?? "";

    if (WHOOP_CYCLE_MARKERS.every((m) => firstLine.includes(m))) {
      return { kind: "whoop_cycles", confidence: "high", filename: file.name, sizeBytes: file.size, hash, previewText };
    }
    if (WHOOP_SLEEP_MARKERS.every((m) => firstLine.includes(m))) {
      return { kind: "whoop_sleeps", confidence: "high", filename: file.name, sizeBytes: file.size, hash, previewText };
    }
    if (WHOOP_WORKOUT_MARKERS.every((m) => firstLine.includes(m))) {
      return { kind: "whoop_workouts", confidence: "high", filename: file.name, sizeBytes: file.size, hash, previewText };
    }
    return { kind: "csv_generic", confidence: "medium", filename: file.name, sizeBytes: file.size, hash, previewText };
  }

  return {
    kind: "unknown",
    confidence: "low",
    filename: file.name,
    sizeBytes: file.size,
    hash,
    previewText: "(unsupported file type — try CSV export from your bank/UPI app, or share the file for parser work)",
  };
}

async function readFirstBytes(file: File, n: number): Promise<string> {
  const slice = file.slice(0, Math.min(n, file.size));
  const buf = await slice.arrayBuffer();
  return new TextDecoder("utf-8", { fatal: false }).decode(buf);
}

export function labelForKind(k: FileKind): string {
  switch (k) {
    case "whoop_cycles":
      return "WHOOP — physiological cycles";
    case "whoop_sleeps":
      return "WHOOP — sleeps";
    case "whoop_workouts":
      return "WHOOP — workouts";
    case "csv_generic":
      return "CSV — generic (map columns)";
    case "pdf_unparsed":
      return "PDF — not yet parsed";
    default:
      return "Unknown";
  }
}
