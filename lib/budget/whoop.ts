"use client";

export interface WhoopCycleRow {
  cycleStart: string;
  cycleEnd: string | null;
  timezone: string;
  recoveryPct: number | null;
  restingHR: number | null;
  hrvMs: number | null;
  skinTempC: number | null;
  spo2Pct: number | null;
  dayStrain: number | null;
  sleepPerformancePct: number | null;
  sleepEfficiencyPct: number | null;
  sleepConsistencyPct: number | null;
  asleepMin: number | null;
  sleepDebtMin: number | null;
}

const WHOOP_COLUMNS: Record<string, keyof WhoopCycleRow> = {
  "Cycle start time": "cycleStart",
  "Cycle end time": "cycleEnd",
  "Cycle timezone": "timezone",
  "Recovery score %": "recoveryPct",
  "Resting heart rate (bpm)": "restingHR",
  "Heart rate variability (ms)": "hrvMs",
  "Skin temp (celsius)": "skinTempC",
  "Blood oxygen %": "spo2Pct",
  "Day Strain": "dayStrain",
  "Sleep performance %": "sleepPerformancePct",
  "Sleep efficiency %": "sleepEfficiencyPct",
  "Sleep consistency %": "sleepConsistencyPct",
  "Asleep duration (min)": "asleepMin",
  "Sleep debt (min)": "sleepDebtMin",
};

export function parseWhoopCyclesCSV(csvText: string): WhoopCycleRow[] {
  const lines = csvText.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];
  const header = splitCSVLine(lines[0]);
  const idx: Record<keyof WhoopCycleRow, number> = {} as Record<keyof WhoopCycleRow, number>;
  for (const [col, field] of Object.entries(WHOOP_COLUMNS)) {
    const i = header.indexOf(col);
    if (i >= 0) idx[field] = i;
  }

  const rows: WhoopCycleRow[] = [];
  for (let r = 1; r < lines.length; r++) {
    const cells = splitCSVLine(lines[r]);
    if (cells.length < 3) continue;
    const get = (field: keyof WhoopCycleRow): string => cells[idx[field]] ?? "";
    const getNum = (field: keyof WhoopCycleRow): number | null => {
      const v = get(field);
      if (v === "" || v === null) return null;
      const n = Number(v);
      return Number.isFinite(n) ? n : null;
    };

    rows.push({
      cycleStart: get("cycleStart"),
      cycleEnd: get("cycleEnd") || null,
      timezone: get("timezone"),
      recoveryPct: getNum("recoveryPct"),
      restingHR: getNum("restingHR"),
      hrvMs: getNum("hrvMs"),
      skinTempC: getNum("skinTempC"),
      spo2Pct: getNum("spo2Pct"),
      dayStrain: getNum("dayStrain"),
      sleepPerformancePct: getNum("sleepPerformancePct"),
      sleepEfficiencyPct: getNum("sleepEfficiencyPct"),
      sleepConsistencyPct: getNum("sleepConsistencyPct"),
      asleepMin: getNum("asleepMin"),
      sleepDebtMin: getNum("sleepDebtMin"),
    });
  }
  return rows;
}

function splitCSVLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQuote && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuote = !inQuote;
      }
    } else if (c === "," && !inQuote) {
      out.push(cur);
      cur = "";
    } else {
      cur += c;
    }
  }
  out.push(cur);
  return out;
}

export interface HealthScoreFormula {
  recoveryWeight: number;
  sleepWeight: number;
  baseLavishCapINR: number;
  capPerScorePoint: number;
  minCapINR: number;
  maxCapINR: number;
}

export const DEFAULT_FORMULA: HealthScoreFormula = {
  recoveryWeight: 0.6,
  sleepWeight: 0.4,
  baseLavishCapINR: 5000,
  capPerScorePoint: 200,
  minCapINR: 1000,
  maxCapINR: 25000,
};

export interface WeeklyAggregate {
  weekStart: string;
  weekEnd: string;
  cycles: number;
  avgRecovery: number | null;
  avgSleep: number | null;
  healthScore: number | null;
  derivedLavishCapINR: number | null;
}

function weekBounds(ref: Date): { start: Date; end: Date } {
  const day = ref.getDay();
  const diff = ref.getDate() - day + (day === 0 ? -6 : 1);
  const start = new Date(ref.getFullYear(), ref.getMonth(), diff);
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  return { start, end };
}

export function aggregateByWeek(
  rows: WhoopCycleRow[],
  formula: HealthScoreFormula = DEFAULT_FORMULA
): WeeklyAggregate[] {
  const buckets = new Map<string, WhoopCycleRow[]>();
  for (const row of rows) {
    if (!row.cycleStart) continue;
    const d = new Date(row.cycleStart.replace(" ", "T") + "Z");
    if (isNaN(d.getTime())) continue;
    const { start } = weekBounds(d);
    const key = start.toISOString().slice(0, 10);
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key)!.push(row);
  }

  const out: WeeklyAggregate[] = [];
  for (const [key, bucket] of buckets.entries()) {
    const start = new Date(key);
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    const recoveries = bucket.map((r) => r.recoveryPct).filter((v): v is number => v != null);
    const sleeps = bucket
      .map((r) => r.sleepPerformancePct)
      .filter((v): v is number => v != null);
    const avgRecovery = recoveries.length ? avg(recoveries) : null;
    const avgSleep = sleeps.length ? avg(sleeps) : null;
    const healthScore = computeHealthScore(avgRecovery, avgSleep, formula);
    const cap = healthScore != null ? deriveLavishCap(healthScore, formula) : null;
    out.push({
      weekStart: key,
      weekEnd: end.toISOString().slice(0, 10),
      cycles: bucket.length,
      avgRecovery,
      avgSleep,
      healthScore,
      derivedLavishCapINR: cap,
    });
  }
  out.sort((a, b) => b.weekStart.localeCompare(a.weekStart));
  return out;
}

function avg(xs: number[]): number {
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

export function computeHealthScore(
  avgRecovery: number | null,
  avgSleep: number | null,
  formula: HealthScoreFormula = DEFAULT_FORMULA
): number | null {
  if (avgRecovery == null && avgSleep == null) return null;
  const r = avgRecovery ?? avgSleep ?? 0;
  const s = avgSleep ?? avgRecovery ?? 0;
  return formula.recoveryWeight * r + formula.sleepWeight * s;
}

export function deriveLavishCap(
  healthScore: number,
  formula: HealthScoreFormula = DEFAULT_FORMULA
): number {
  const raw = formula.baseLavishCapINR + formula.capPerScorePoint * (healthScore - 50);
  return Math.round(Math.max(formula.minCapINR, Math.min(formula.maxCapINR, raw)));
}

export function describeFormula(f: HealthScoreFormula = DEFAULT_FORMULA): string {
  return `healthScore = ${f.recoveryWeight} * avgRecovery + ${f.sleepWeight} * avgSleep\nlavishCap = clamp(${f.baseLavishCapINR} + ${f.capPerScorePoint} * (healthScore - 50), ${f.minCapINR}, ${f.maxCapINR})`;
}
