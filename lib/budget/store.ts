"use client";

import { db, type EncryptedRow } from "./db";
import { encryptRecord, decryptRecord } from "./crypto";
import { getDEK, resetLockTimer } from "./session";
import type {
  Transaction,
  Bucket,
  Counterparty,
  Loan,
  Conversion,
  Statement,
  RawEntry,
  Rule,
  WhoopWeek,
  Category,
} from "./types";
import type { Table } from "dexie";

function requireDEK(): CryptoKey {
  const dek = getDEK();
  if (!dek) throw new Error("Vault is locked");
  resetLockTimer();
  return dek;
}

export function newId(): string {
  return (
    Date.now().toString(36) +
    "-" +
    Array.from(crypto.getRandomValues(new Uint8Array(8)))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
  );
}

function nowISO(): string {
  return new Date().toISOString();
}

async function putRecord<T extends { id: string; createdAt: string; occurredAt?: string }>(
  table: Table<EncryptedRow, string>,
  record: T
): Promise<T> {
  const dek = requireDEK();
  const payload = await encryptRecord(record, dek);
  const row: EncryptedRow = {
    id: record.id,
    createdAt: record.createdAt,
    payload,
  };
  if (record.occurredAt) row.occurredAt = record.occurredAt;
  await table.put(row);
  return record;
}

async function listRecords<T>(table: Table<EncryptedRow, string>): Promise<T[]> {
  const dek = requireDEK();
  const rows = await table.toArray();
  const out: T[] = [];
  for (const row of rows) out.push(await decryptRecord<T>(row.payload, dek));
  return out;
}

async function getRecord<T>(
  table: Table<EncryptedRow, string>,
  id: string
): Promise<T | null> {
  const dek = requireDEK();
  const row = await table.get(id);
  if (!row) return null;
  return decryptRecord<T>(row.payload, dek);
}

async function deleteRecord(table: Table<EncryptedRow, string>, id: string): Promise<void> {
  requireDEK();
  await table.delete(id);
}

export const Transactions = {
  async create(input: Omit<Transaction, "id" | "createdAt" | "updatedAt">): Promise<Transaction> {
    const t: Transaction = {
      ...input,
      id: newId(),
      createdAt: nowISO(),
      updatedAt: nowISO(),
    };
    return putRecord(db().transactions, t);
  },
  async update(id: string, patch: Partial<Transaction>): Promise<Transaction | null> {
    const existing = await getRecord<Transaction>(db().transactions, id);
    if (!existing) return null;
    const updated: Transaction = { ...existing, ...patch, id, updatedAt: nowISO() };
    return putRecord(db().transactions, updated);
  },
  list: () => listRecords<Transaction>(db().transactions),
  get: (id: string) => getRecord<Transaction>(db().transactions, id),
  delete: (id: string) => deleteRecord(db().transactions, id),
};

export const Buckets = {
  async create(input: Omit<Bucket, "id" | "createdAt" | "updatedAt">): Promise<Bucket> {
    const b: Bucket = { ...input, id: newId(), createdAt: nowISO(), updatedAt: nowISO() };
    return putRecord(db().buckets, b);
  },
  async update(id: string, patch: Partial<Bucket>): Promise<Bucket | null> {
    const existing = await getRecord<Bucket>(db().buckets, id);
    if (!existing) return null;
    const updated: Bucket = { ...existing, ...patch, id, updatedAt: nowISO() };
    return putRecord(db().buckets, updated);
  },
  list: () => listRecords<Bucket>(db().buckets),
  get: (id: string) => getRecord<Bucket>(db().buckets, id),
  delete: (id: string) => deleteRecord(db().buckets, id),
};

export const Counterparties = {
  async create(input: Omit<Counterparty, "id" | "createdAt" | "updatedAt">): Promise<Counterparty> {
    const c: Counterparty = { ...input, id: newId(), createdAt: nowISO(), updatedAt: nowISO() };
    return putRecord(db().counterparties, c);
  },
  list: () => listRecords<Counterparty>(db().counterparties),
  get: (id: string) => getRecord<Counterparty>(db().counterparties, id),
  delete: (id: string) => deleteRecord(db().counterparties, id),
};

export const Loans = {
  async create(input: Omit<Loan, "id" | "createdAt" | "updatedAt">): Promise<Loan> {
    const l: Loan = { ...input, id: newId(), createdAt: nowISO(), updatedAt: nowISO() };
    return putRecord(db().loans, l);
  },
  async update(id: string, patch: Partial<Loan>): Promise<Loan | null> {
    const existing = await getRecord<Loan>(db().loans, id);
    if (!existing) return null;
    const updated: Loan = { ...existing, ...patch, id, updatedAt: nowISO() };
    return putRecord(db().loans, updated);
  },
  list: () => listRecords<Loan>(db().loans),
  get: (id: string) => getRecord<Loan>(db().loans, id),
  delete: (id: string) => deleteRecord(db().loans, id),
};

export const Conversions = {
  async create(input: Omit<Conversion, "id" | "createdAt" | "updatedAt">): Promise<Conversion> {
    const c: Conversion = { ...input, id: newId(), createdAt: nowISO(), updatedAt: nowISO() };
    return putRecord(db().conversions, c);
  },
  list: () => listRecords<Conversion>(db().conversions),
};

export const Statements = {
  async create(input: Omit<Statement, "id">): Promise<Statement> {
    const s: Statement = { ...input, id: newId() };
    return putRecord(db().statements, { ...s, createdAt: s.uploadedAt });
  },
  list: () => listRecords<Statement>(db().statements),
};

export const RawEntries = {
  async create(input: Omit<RawEntry, "id">): Promise<RawEntry> {
    const r: RawEntry = { ...input, id: newId() };
    return putRecord(db().rawEntries, { ...r, createdAt: nowISO() });
  },
  list: () => listRecords<RawEntry>(db().rawEntries),
};

export const Rules = {
  async create(input: Omit<Rule, "id" | "createdAt" | "updatedAt">): Promise<Rule> {
    const r: Rule = { ...input, id: newId(), createdAt: nowISO(), updatedAt: nowISO() };
    return putRecord(db().rules, r);
  },
  async update(id: string, patch: Partial<Rule>): Promise<Rule | null> {
    const existing = await getRecord<Rule>(db().rules, id);
    if (!existing) return null;
    const updated: Rule = { ...existing, ...patch, id, updatedAt: nowISO() };
    return putRecord(db().rules, updated);
  },
  list: () => listRecords<Rule>(db().rules),
  delete: (id: string) => deleteRecord(db().rules, id),
};

export const WhoopWeeks = {
  async create(input: Omit<WhoopWeek, "id" | "createdAt">): Promise<WhoopWeek> {
    const w: WhoopWeek = { ...input, id: newId(), createdAt: nowISO() };
    return putRecord(db().whoopWeeks, w);
  },
  list: () => listRecords<WhoopWeek>(db().whoopWeeks),
};

export const Categories = {
  async create(input: Omit<Category, "id" | "createdAt">): Promise<Category> {
    const c: Category = { ...input, id: newId(), createdAt: nowISO() };
    return putRecord(db().categories, c);
  },
  list: () => listRecords<Category>(db().categories),
};

export function applyRulesToTransaction(t: Transaction, rules: Rule[]): Transaction {
  const enabled = rules.filter((r) => r.enabled).sort((a, b) => a.priority - b.priority);
  for (const r of enabled) {
    let hit = false;
    const payeeLower = t.payee.toLowerCase();
    if (r.matchType === "payee_contains" && payeeLower.includes(r.matchValue.toLowerCase())) hit = true;
    if (r.matchType === "payee_equals" && payeeLower === r.matchValue.toLowerCase()) hit = true;
    if (r.matchType === "amount_range") {
      const [lo, hi] = r.matchValue.split("-").map(Number);
      if (t.baseAmountINR >= lo && t.baseAmountINR <= hi) hit = true;
    }
    if (hit) {
      return {
        ...t,
        bucketId: r.setBucketId ?? t.bucketId,
        categoryId: r.setCategoryId ?? t.categoryId,
        ruleHitId: r.id,
      };
    }
  }
  return t;
}
