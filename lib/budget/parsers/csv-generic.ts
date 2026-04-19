"use client";

import Papa from "papaparse";

export interface GenericCSVResult {
  headers: string[];
  rows: Record<string, string>[];
  errors: string[];
}

export async function parseCSV(file: File): Promise<GenericCSVResult> {
  const text = await file.text();
  return new Promise((resolve) => {
    Papa.parse<Record<string, string>>(text, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim(),
      complete: (result) => {
        const headers = result.meta.fields ?? [];
        const errors = result.errors.map((e) => `${e.type}: ${e.message} (row ${e.row ?? "?"})`);
        resolve({ headers, rows: result.data, errors });
      },
    });
  });
}

export type ColumnMapping = {
  amount?: string;
  date?: string;
  payee?: string;
  ref?: string;
  direction?: string;
  currency?: string;
};

export interface MappedEntry {
  extractedAmount: number;
  extractedCurrency: string;
  extractedDate: string;
  extractedPayee: string;
  extractedRef: string | null;
  direction: "debit" | "credit";
  rawRow: string;
  dedupKey: string;
}

export function applyMapping(
  rows: Record<string, string>[],
  mapping: ColumnMapping,
  defaults: { currency: string; direction: "debit" | "credit" }
): MappedEntry[] {
  const out: MappedEntry[] = [];
  for (const row of rows) {
    const amountStr = mapping.amount ? (row[mapping.amount] ?? "") : "";
    const amount = parseAmount(amountStr);
    if (!Number.isFinite(amount) || amount === 0) continue;

    const dateStr = mapping.date ? (row[mapping.date] ?? "") : "";
    const iso = normalizeDate(dateStr);
    if (!iso) continue;

    const payee = mapping.payee ? (row[mapping.payee] ?? "").trim() : "";
    const ref = mapping.ref ? ((row[mapping.ref] ?? "").trim() || null) : null;

    let direction: "debit" | "credit" = defaults.direction;
    if (mapping.direction) {
      const v = (row[mapping.direction] ?? "").toLowerCase();
      if (v.includes("cr") || v.includes("credit") || v.includes("deposit")) direction = "credit";
      else if (v.includes("dr") || v.includes("debit") || v.includes("withdraw")) direction = "debit";
    } else if (amount < 0) {
      direction = "debit";
    }

    const currency = mapping.currency ? ((row[mapping.currency] ?? "").trim() || defaults.currency) : defaults.currency;

    const dedupKey = ref
      ? `ref:${ref}`
      : `amt:${Math.abs(amount).toFixed(2)}|date:${iso}|payee:${normalizePayee(payee)}`;

    out.push({
      extractedAmount: Math.abs(amount),
      extractedCurrency: currency,
      extractedDate: iso,
      extractedPayee: payee,
      extractedRef: ref,
      direction,
      rawRow: JSON.stringify(row),
      dedupKey,
    });
  }
  return out;
}

function parseAmount(s: string): number {
  if (!s) return NaN;
  const cleaned = s.replace(/[,₹$€£¥\s]/g, "").replace(/[()]/g, "-");
  return Number(cleaned);
}

function normalizeDate(s: string): string | null {
  if (!s) return null;
  const trimmed = s.trim();
  const direct = new Date(trimmed);
  if (!isNaN(direct.getTime())) return direct.toISOString().slice(0, 10);

  const dmy = trimmed.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})$/);
  if (dmy) {
    const [, d, m, y] = dmy;
    const year = y.length === 2 ? 2000 + parseInt(y, 10) : parseInt(y, 10);
    const parsed = new Date(year, parseInt(m, 10) - 1, parseInt(d, 10));
    if (!isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
  }
  return null;
}

function normalizePayee(p: string): string {
  return p
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[^a-z0-9 ]/g, "")
    .trim()
    .slice(0, 40);
}

const AMOUNT_HINTS = ["amount", "debit", "credit", "withdrawal", "deposit", "value", "inr", "sum"];
const DATE_HINTS = ["date", "txn date", "transaction date", "posted", "value date"];
const PAYEE_HINTS = ["payee", "description", "narration", "details", "merchant", "particulars", "remark"];
const REF_HINTS = ["ref", "reference", "utr", "txn id", "transaction id", "upi ref", "rrn"];

export function autoSuggestMapping(headers: string[]): ColumnMapping {
  const lower = headers.map((h) => h.toLowerCase());
  const pick = (hints: string[]): string | undefined => {
    for (const hint of hints) {
      const idx = lower.findIndex((h) => h.includes(hint));
      if (idx >= 0) return headers[idx];
    }
    return undefined;
  };
  return {
    amount: pick(AMOUNT_HINTS),
    date: pick(DATE_HINTS),
    payee: pick(PAYEE_HINTS),
    ref: pick(REF_HINTS),
  };
}
