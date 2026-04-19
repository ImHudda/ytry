"use client";

import {
  createVault as cryptoCreateVault,
  unlockVault as cryptoUnlockVault,
  serializeWrapped,
  deserializeWrapped,
} from "./crypto";
import { db, readMeta, writeMeta, isVaultInitialized } from "./db";
import { setDEK, lock as sessionLock } from "./session";
import { Buckets } from "./store";

export { isVaultInitialized };

export async function createNewVault(password: string): Promise<{ recoveryCode: string }> {
  const { wrapped, dek, recoveryCode, recoveryWrapped } = await cryptoCreateVault(password);
  await writeMeta("wrappedDEK", serializeWrapped(wrapped));
  await writeMeta("recoveryWrappedDEK", serializeWrapped(recoveryWrapped));
  await writeMeta("vaultCreatedAt", new Date().toISOString());
  setDEK(dek);
  await seedDefaultBuckets();
  return { recoveryCode };
}

export async function unlockWithPassword(password: string): Promise<boolean> {
  const serialized = await readMeta("wrappedDEK");
  if (!serialized) throw new Error("Vault not initialized");
  try {
    const wrapped = deserializeWrapped(serialized);
    const dek = await cryptoUnlockVault(password, wrapped);
    setDEK(dek);
    return true;
  } catch {
    return false;
  }
}

export async function unlockWithRecoveryCode(code: string): Promise<boolean> {
  const serialized = await readMeta("recoveryWrappedDEK");
  if (!serialized) return false;
  try {
    const wrapped = deserializeWrapped(serialized);
    const dek = await cryptoUnlockVault(code.trim().toUpperCase(), wrapped);
    setDEK(dek);
    return true;
  } catch {
    return false;
  }
}

export function lockVault(): void {
  sessionLock();
}

export async function destroyVault(): Promise<void> {
  sessionLock();
  await db().delete();
}

async function seedDefaultBuckets(): Promise<void> {
  const existing = await Buckets.list();
  if (existing.length > 0) return;
  await Buckets.create({
    name: "Lavish Lifestyle",
    kind: "lavish",
    monthlyCapINR: null,
    weeklyCapINR: null,
    locked: false,
    color: "#f59e0b",
    orderIndex: 0,
  });
  await Buckets.create({
    name: "Investment",
    kind: "investment",
    monthlyCapINR: null,
    weeklyCapINR: null,
    locked: true,
    color: "#10b981",
    orderIndex: 1,
  });
  await Buckets.create({
    name: "Essentials",
    kind: "custom",
    monthlyCapINR: null,
    weeklyCapINR: null,
    locked: false,
    color: "#6366f1",
    orderIndex: 2,
  });
}
