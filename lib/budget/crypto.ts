"use client";

import { argon2id } from "hash-wasm";

const ARGON2_MEMORY_KIB = 65536;
const ARGON2_ITERATIONS = 3;
const ARGON2_PARALLELISM = 1;
const KEY_BYTES = 32;
const SALT_BYTES = 16;
const IV_BYTES = 12;

export interface WrappedDEK {
  wrapped: Uint8Array<ArrayBuffer>;
  iv: Uint8Array<ArrayBuffer>;
  salt: Uint8Array<ArrayBuffer>;
  kdf: "argon2id";
  kdfParams: { m: number; t: number; p: number };
  version: 1;
}

function freshBytes(n: number): Uint8Array<ArrayBuffer> {
  return new Uint8Array(new ArrayBuffer(n));
}

function randomBytes(n: number): Uint8Array<ArrayBuffer> {
  const b = freshBytes(n);
  crypto.getRandomValues(b);
  return b;
}

function bytesToHex(b: Uint8Array): string {
  return Array.from(b).map((x) => x.toString(16).padStart(2, "0")).join("");
}

function hexToBytes(h: string): Uint8Array<ArrayBuffer> {
  const b = freshBytes(h.length / 2);
  for (let i = 0; i < b.length; i++) b[i] = parseInt(h.slice(i * 2, i * 2 + 2), 16);
  return b;
}

function concatBytes(...parts: Uint8Array[]): Uint8Array<ArrayBuffer> {
  const total = parts.reduce((s, p) => s + p.length, 0);
  const out = freshBytes(total);
  let off = 0;
  for (const p of parts) {
    out.set(p, off);
    off += p.length;
  }
  return out;
}

function encodeToBuffer(s: string): Uint8Array<ArrayBuffer> {
  const src = new TextEncoder().encode(s);
  const out = freshBytes(src.byteLength);
  out.set(src);
  return out;
}

async function deriveKEK(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const hashHex = await argon2id({
    password,
    salt,
    parallelism: ARGON2_PARALLELISM,
    iterations: ARGON2_ITERATIONS,
    memorySize: ARGON2_MEMORY_KIB,
    hashLength: KEY_BYTES,
    outputType: "hex",
  });
  const raw = hexToBytes(hashHex);
  return crypto.subtle.importKey("raw", raw.buffer, { name: "AES-GCM" }, false, [
    "wrapKey",
    "unwrapKey",
    "encrypt",
    "decrypt",
  ]);
}

async function generateDEK(): Promise<CryptoKey> {
  return crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, [
    "encrypt",
    "decrypt",
  ]);
}

export async function createVault(password: string): Promise<{
  wrapped: WrappedDEK;
  dek: CryptoKey;
  recoveryCode: string;
  recoveryWrapped: WrappedDEK;
}> {
  const salt = randomBytes(SALT_BYTES);
  const kek = await deriveKEK(password, salt);
  const dek = await generateDEK();
  const iv = randomBytes(IV_BYTES);
  const exported = await crypto.subtle.exportKey("raw", dek);
  const rawDek = freshBytes(exported.byteLength);
  rawDek.set(new Uint8Array(exported));
  const wrappedBuf = await crypto.subtle.encrypt({ name: "AES-GCM", iv: iv.buffer }, kek, rawDek.buffer);
  const wrappedBytes = freshBytes(wrappedBuf.byteLength);
  wrappedBytes.set(new Uint8Array(wrappedBuf));

  const recoveryCode = generateRecoveryCode();
  const recoverySalt = randomBytes(SALT_BYTES);
  const recoveryKek = await deriveKEK(recoveryCode, recoverySalt);
  const recoveryIv = randomBytes(IV_BYTES);
  const recoveryWrappedBuf = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: recoveryIv.buffer },
    recoveryKek,
    rawDek.buffer
  );
  const recoveryWrappedBytes = freshBytes(recoveryWrappedBuf.byteLength);
  recoveryWrappedBytes.set(new Uint8Array(recoveryWrappedBuf));

  rawDek.fill(0);

  return {
    wrapped: {
      wrapped: wrappedBytes,
      iv,
      salt,
      kdf: "argon2id",
      kdfParams: { m: ARGON2_MEMORY_KIB, t: ARGON2_ITERATIONS, p: ARGON2_PARALLELISM },
      version: 1,
    },
    dek,
    recoveryCode,
    recoveryWrapped: {
      wrapped: recoveryWrappedBytes,
      iv: recoveryIv,
      salt: recoverySalt,
      kdf: "argon2id",
      kdfParams: { m: ARGON2_MEMORY_KIB, t: ARGON2_ITERATIONS, p: ARGON2_PARALLELISM },
      version: 1,
    },
  };
}

export async function unlockVault(password: string, wrapped: WrappedDEK): Promise<CryptoKey> {
  const kek = await deriveKEK(password, wrapped.salt);
  const rawDekBuf = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: wrapped.iv.buffer },
    kek,
    wrapped.wrapped.buffer
  );
  return crypto.subtle.importKey("raw", rawDekBuf, { name: "AES-GCM" }, false, [
    "encrypt",
    "decrypt",
  ]);
}

export async function encryptRecord(plaintext: unknown, dek: CryptoKey): Promise<Uint8Array> {
  const iv = randomBytes(IV_BYTES);
  const bytes = encodeToBuffer(JSON.stringify(plaintext));
  const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv: iv.buffer }, dek, bytes.buffer);
  const ctBytes = freshBytes(ct.byteLength);
  ctBytes.set(new Uint8Array(ct));
  return concatBytes(iv, ctBytes);
}

export async function decryptRecord<T = unknown>(payload: Uint8Array, dek: CryptoKey): Promise<T> {
  const ivView = payload.slice(0, IV_BYTES);
  const ctView = payload.slice(IV_BYTES);
  const iv = freshBytes(ivView.byteLength);
  iv.set(ivView);
  const ct = freshBytes(ctView.byteLength);
  ct.set(ctView);
  const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv: iv.buffer }, dek, ct.buffer);
  return JSON.parse(new TextDecoder().decode(pt)) as T;
}

function generateRecoveryCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const chars: string[] = [];
  const randomVals = randomBytes(24);
  for (let i = 0; i < 24; i++) chars.push(alphabet[randomVals[i] % alphabet.length]);
  return `${chars.slice(0, 6).join("")}-${chars.slice(6, 12).join("")}-${chars
    .slice(12, 18)
    .join("")}-${chars.slice(18, 24).join("")}`;
}

export function validatePassword(pw: string): { ok: boolean; reason?: string } {
  if (pw.length < 10) return { ok: false, reason: "Must be at least 10 characters." };
  return { ok: true };
}

export function passwordStrength(pw: string): { score: 0 | 1 | 2 | 3 | 4; label: string } {
  let score = 0;
  if (pw.length >= 10) score++;
  if (pw.length >= 14) score++;
  if (pw.length >= 20) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw) && /[0-9]/.test(pw)) score++;
  const labels = ["too short", "weak", "ok", "strong", "excellent"] as const;
  return { score: Math.min(score, 4) as 0 | 1 | 2 | 3 | 4, label: labels[Math.min(score, 4)] };
}

export function serializeWrapped(w: WrappedDEK): string {
  return JSON.stringify({
    version: w.version,
    kdf: w.kdf,
    kdfParams: w.kdfParams,
    salt: bytesToHex(w.salt),
    iv: bytesToHex(w.iv),
    wrapped: bytesToHex(w.wrapped),
  });
}

export function deserializeWrapped(s: string): WrappedDEK {
  const o = JSON.parse(s);
  return {
    version: o.version,
    kdf: o.kdf,
    kdfParams: o.kdfParams,
    salt: hexToBytes(o.salt),
    iv: hexToBytes(o.iv),
    wrapped: hexToBytes(o.wrapped),
  } as WrappedDEK;
}
