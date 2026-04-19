"use client";

import Dexie, { type Table } from "dexie";

export interface EncryptedRow {
  id: string;
  occurredAt?: string;
  createdAt: string;
  payload: Uint8Array;
}

export interface MetaRow {
  key: string;
  value: string;
  updatedAt: string;
}

export class BudgetDB extends Dexie {
  transactions!: Table<EncryptedRow, string>;
  buckets!: Table<EncryptedRow, string>;
  counterparties!: Table<EncryptedRow, string>;
  loans!: Table<EncryptedRow, string>;
  conversions!: Table<EncryptedRow, string>;
  statements!: Table<EncryptedRow, string>;
  rawEntries!: Table<EncryptedRow, string>;
  rules!: Table<EncryptedRow, string>;
  whoopWeeks!: Table<EncryptedRow, string>;
  categories!: Table<EncryptedRow, string>;
  meta!: Table<MetaRow, string>;

  constructor() {
    super("abdul_budget");
    this.version(1).stores({
      transactions: "id, occurredAt, createdAt",
      buckets: "id, createdAt",
      counterparties: "id, createdAt",
      loans: "id, createdAt",
      conversions: "id, occurredAt, createdAt",
      statements: "id, createdAt",
      rawEntries: "id, statementId, createdAt",
      rules: "id, createdAt",
      whoopWeeks: "id, weekStart, createdAt",
      categories: "id, createdAt",
      meta: "key",
    });
  }
}

let _db: BudgetDB | null = null;
export function db(): BudgetDB {
  if (!_db) _db = new BudgetDB();
  return _db;
}

export async function readMeta(key: string): Promise<string | null> {
  const row = await db().meta.get(key);
  return row?.value ?? null;
}

export async function writeMeta(key: string, value: string): Promise<void> {
  await db().meta.put({ key, value, updatedAt: new Date().toISOString() });
}

export async function isVaultInitialized(): Promise<boolean> {
  return (await readMeta("wrappedDEK")) !== null;
}

export async function wipeVault(): Promise<void> {
  await db().delete();
  _db = null;
}
