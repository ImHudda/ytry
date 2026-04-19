"use client";

import { Statements, RawEntries, WhoopWeeks, newId } from "./store";
import type { StatementSource, Currency } from "./types";
import type { MappedEntry } from "./parsers/csv-generic";
import { parseWhoopCyclesCSV, aggregateByWeek, DEFAULT_FORMULA } from "./whoop";

export interface IngestSummary {
  statementId: string;
  rowsImported: number;
  rowsSkipped: number;
  duplicates: number;
}

export async function ingestGenericCSV(opts: {
  filename: string;
  fileHash: string;
  source: StatementSource;
  issuer: string;
  entries: MappedEntry[];
}): Promise<IngestSummary> {
  const existing = await RawEntries.list();
  const existingKeys = new Set(existing.map((e) => e.dedupKey));

  const periodStart = minDate(opts.entries.map((e) => e.extractedDate));
  const periodEnd = maxDate(opts.entries.map((e) => e.extractedDate));

  const stmt = await Statements.create({
    source: opts.source,
    issuer: opts.issuer,
    fileHash: opts.fileHash,
    periodStart: periodStart ?? new Date().toISOString().slice(0, 10),
    periodEnd: periodEnd ?? new Date().toISOString().slice(0, 10),
    parseStatus: "parsed",
    uploadedAt: new Date().toISOString(),
  });

  let imported = 0;
  let duplicates = 0;
  let skipped = 0;

  for (const entry of opts.entries) {
    if (existingKeys.has(entry.dedupKey)) {
      duplicates++;
      continue;
    }
    if (!entry.extractedDate || !entry.extractedAmount) {
      skipped++;
      continue;
    }
    await RawEntries.create({
      statementId: stmt.id,
      extractedAmount: entry.extractedAmount,
      extractedCurrency: entry.extractedCurrency as Currency,
      extractedDate: entry.extractedDate,
      extractedPayee: entry.extractedPayee,
      extractedRef: entry.extractedRef,
      direction: entry.direction,
      rawRow: entry.rawRow,
      dedupKey: entry.dedupKey,
      matchedTransactionId: null,
    });
    existingKeys.add(entry.dedupKey);
    imported++;
  }

  return { statementId: stmt.id, rowsImported: imported, rowsSkipped: skipped, duplicates };
}

export async function ingestWhoopCyclesCSV(opts: {
  filename: string;
  fileHash: string;
  csvText: string;
}): Promise<{ weeksImported: number; weeksSkipped: number }> {
  const rows = parseWhoopCyclesCSV(opts.csvText);
  const weekly = aggregateByWeek(rows, DEFAULT_FORMULA);
  const existing = await WhoopWeeks.list();
  const existingKeys = new Set(existing.map((w) => w.weekStart));

  let imported = 0;
  let skipped = 0;

  await Statements.create({
    source: "bank",
    issuer: "WHOOP (cycles)",
    fileHash: opts.fileHash,
    periodStart: weekly.at(-1)?.weekStart ?? new Date().toISOString().slice(0, 10),
    periodEnd: weekly[0]?.weekEnd ?? new Date().toISOString().slice(0, 10),
    parseStatus: "parsed",
    uploadedAt: new Date().toISOString(),
  });

  for (const w of weekly) {
    if (existingKeys.has(w.weekStart)) {
      skipped++;
      continue;
    }
    await WhoopWeeks.create({
      weekStart: w.weekStart,
      avgRecovery: w.avgRecovery,
      avgSleepPerformance: w.avgSleep,
      aggregateHealthScore: w.healthScore,
      derivedLavishCapINR: w.derivedLavishCapINR,
      source: "csv",
    });
    imported++;
  }

  return { weeksImported: imported, weeksSkipped: skipped };
}

function minDate(xs: string[]): string | null {
  const valid = xs.filter(Boolean).sort();
  return valid[0] ?? null;
}

function maxDate(xs: string[]): string | null {
  const valid = xs.filter(Boolean).sort();
  return valid.at(-1) ?? null;
}
