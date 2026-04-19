"use client";

const AUTO_LOCK_MS = 15 * 60 * 1000;

let _dek: CryptoKey | null = null;
let _lockTimer: ReturnType<typeof setTimeout> | null = null;
let _listeners: Array<(unlocked: boolean) => void> = [];

export function setDEK(dek: CryptoKey): void {
  _dek = dek;
  resetLockTimer();
  for (const fn of _listeners) fn(true);
}

export function getDEK(): CryptoKey | null {
  return _dek;
}

export function isUnlocked(): boolean {
  return _dek !== null;
}

export function lock(): void {
  _dek = null;
  if (_lockTimer) {
    clearTimeout(_lockTimer);
    _lockTimer = null;
  }
  for (const fn of _listeners) fn(false);
}

export function resetLockTimer(): void {
  if (_lockTimer) clearTimeout(_lockTimer);
  _lockTimer = setTimeout(lock, AUTO_LOCK_MS);
}

export function subscribe(fn: (unlocked: boolean) => void): () => void {
  _listeners.push(fn);
  return () => {
    _listeners = _listeners.filter((x) => x !== fn);
  };
}
