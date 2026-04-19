"use client";

import { useState } from "react";
import { unlockWithPassword, unlockWithRecoveryCode } from "@/lib/budget/vault";

export default function UnlockFlow({ onUnlocked }: { onUnlocked: () => void }) {
  const [mode, setMode] = useState<"password" | "recovery">("password");
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function handleUnlock() {
    setBusy(true);
    setErr(null);
    try {
      const ok =
        mode === "password"
          ? await unlockWithPassword(value)
          : await unlockWithRecoveryCode(value);
      if (ok) {
        setValue("");
        onUnlocked();
      } else {
        setErr(mode === "password" ? "Wrong password." : "Wrong recovery code.");
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Unlock failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-md w-full mx-auto p-6 space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-white">Unlock your vault</h1>
        <p className="text-sm text-zinc-400 mt-2">
          {mode === "password"
            ? "Enter your master password to decrypt this session."
            : "Enter your recovery code exactly as shown at setup."}
        </p>
      </div>
      <div>
        <input
          type={mode === "password" ? "password" : "text"}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && value && !busy) handleUnlock();
          }}
          autoFocus
          placeholder={mode === "password" ? "master password" : "XXXXXX-XXXXXX-XXXXXX-XXXXXX"}
          className="w-full px-3 py-2.5 bg-zinc-900 border border-zinc-800 rounded-lg text-white placeholder:text-zinc-600 text-sm font-mono focus:outline-none focus:border-indigo-500"
        />
      </div>
      {err && <p className="text-sm text-red-400">{err}</p>}
      <button
        disabled={!value || busy}
        onClick={handleUnlock}
        className="w-full px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-sm font-medium rounded-lg"
      >
        {busy ? "Unlocking…" : "Unlock"}
      </button>
      <button
        onClick={() => {
          setMode(mode === "password" ? "recovery" : "password");
          setValue("");
          setErr(null);
        }}
        className="w-full text-xs text-zinc-500 hover:text-zinc-300"
      >
        {mode === "password" ? "Use recovery code instead" : "Use password instead"}
      </button>
    </div>
  );
}
