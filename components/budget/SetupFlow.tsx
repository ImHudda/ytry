"use client";

import { useState } from "react";
import { createNewVault } from "@/lib/budget/vault";
import { validatePassword, passwordStrength } from "@/lib/budget/crypto";

type Stage = "password" | "recovery" | "done";

export default function SetupFlow({ onDone }: { onDone: () => void }) {
  const [stage, setStage] = useState<Stage>("password");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [recoveryCode, setRecoveryCode] = useState<string | null>(null);
  const [recoveryAck, setRecoveryAck] = useState(false);

  const strength = passwordStrength(password);
  const mismatch = confirm.length > 0 && confirm !== password;
  const valid = validatePassword(password).ok && password === confirm;

  async function handleCreate() {
    setBusy(true);
    setErr(null);
    try {
      const { recoveryCode } = await createNewVault(password);
      setRecoveryCode(recoveryCode);
      setPassword("");
      setConfirm("");
      setStage("recovery");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to create vault");
    } finally {
      setBusy(false);
    }
  }

  if (stage === "recovery" && recoveryCode) {
    return (
      <div className="max-w-lg w-full mx-auto p-6 space-y-5">
        <div>
          <h1 className="text-2xl font-bold text-white">Save your recovery code</h1>
          <p className="text-sm text-zinc-400 mt-2">
            This code can unlock your vault if you forget the password. Store it somewhere safe — a
            password manager, printout in a drawer, encrypted note. Lose both and your data is
            unrecoverable.
          </p>
        </div>
        <div className="p-5 rounded-xl border border-indigo-800/60 bg-indigo-950/30 font-mono text-lg text-indigo-200 tracking-wider break-all select-all text-center">
          {recoveryCode}
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              navigator.clipboard.writeText(recoveryCode);
            }}
            className="px-3 py-2 rounded-lg border border-zinc-700 text-zinc-300 hover:border-zinc-500 text-sm"
          >
            Copy to clipboard
          </button>
          <button
            onClick={() => window.print()}
            className="px-3 py-2 rounded-lg border border-zinc-700 text-zinc-300 hover:border-zinc-500 text-sm"
          >
            Print
          </button>
        </div>
        <label className="flex items-start gap-2 text-sm text-zinc-300 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={recoveryAck}
            onChange={(e) => setRecoveryAck(e.target.checked)}
            className="mt-1"
          />
          <span>I've saved this code. I understand losing both the password and this code means my data is permanently gone.</span>
        </label>
        <button
          disabled={!recoveryAck}
          onClick={onDone}
          className="w-full px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-sm font-medium rounded-lg"
        >
          Continue
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-lg w-full mx-auto p-6 space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-white">Create your vault</h1>
        <p className="text-sm text-zinc-400 mt-2">
          Your budget data is encrypted in your browser with a master password. The password
          never leaves this device. Minimum 10 characters — longer is much better.
        </p>
      </div>
      <div className="space-y-3">
        <div>
          <label className="text-xs text-zinc-500 uppercase tracking-wider">Master password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
            placeholder="at least 10 characters"
            className="mt-1 w-full px-3 py-2.5 bg-zinc-900 border border-zinc-800 rounded-lg text-white placeholder:text-zinc-600 text-sm focus:outline-none focus:border-indigo-500"
          />
          {password.length > 0 && (
            <div className="mt-1.5 flex items-center gap-2 text-xs">
              <div className="flex-1 flex gap-1 h-1">
                {[0, 1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className={`flex-1 rounded ${
                      strength.score > i
                        ? strength.score === 4
                          ? "bg-emerald-500"
                          : strength.score === 3
                          ? "bg-lime-500"
                          : strength.score === 2
                          ? "bg-amber-500"
                          : "bg-red-500"
                        : "bg-zinc-800"
                    }`}
                  />
                ))}
              </div>
              <span className="text-zinc-500 w-20 text-right">{strength.label}</span>
            </div>
          )}
        </div>
        <div>
          <label className="text-xs text-zinc-500 uppercase tracking-wider">Confirm</label>
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="repeat the password"
            className="mt-1 w-full px-3 py-2.5 bg-zinc-900 border border-zinc-800 rounded-lg text-white placeholder:text-zinc-600 text-sm focus:outline-none focus:border-indigo-500"
          />
          {mismatch && <p className="mt-1 text-xs text-red-400">Passwords don't match.</p>}
        </div>
      </div>
      {err && <p className="text-sm text-red-400">{err}</p>}
      <button
        disabled={!valid || busy}
        onClick={handleCreate}
        className="w-full px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-sm font-medium rounded-lg"
      >
        {busy ? "Creating vault (this takes a moment)…" : "Create vault"}
      </button>
      <p className="text-xs text-zinc-600">
        Under the hood: Argon2id key derivation, AES-256-GCM encryption, per-record ciphertext in
        IndexedDB. Vercel sees nothing.
      </p>
    </div>
  );
}
