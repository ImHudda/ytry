"use client";

import { useEffect, useState } from "react";
import { isVaultInitialized } from "@/lib/budget/vault";
import { isUnlocked, subscribe } from "@/lib/budget/session";
import SetupFlow from "@/components/budget/SetupFlow";
import UnlockFlow from "@/components/budget/UnlockFlow";
import BudgetNav from "@/components/budget/BudgetNav";

type State = "loading" | "needs-setup" | "needs-unlock" | "ready";

export default function BudgetLayout({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<State>("loading");

  async function refresh() {
    const initialized = await isVaultInitialized();
    if (!initialized) {
      setState("needs-setup");
      return;
    }
    setState(isUnlocked() ? "ready" : "needs-unlock");
  }

  useEffect(() => {
    refresh();
    return subscribe((unlocked) => {
      setState((prev) => {
        if (prev === "needs-setup") return prev;
        return unlocked ? "ready" : "needs-unlock";
      });
    });
  }, []);

  if (state === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-zinc-600 text-sm">loading…</div>
      </div>
    );
  }

  if (state === "needs-setup") {
    return (
      <div className="min-h-screen flex items-center">
        <SetupFlow onDone={refresh} />
      </div>
    );
  }

  if (state === "needs-unlock") {
    return (
      <div className="min-h-screen flex items-center">
        <UnlockFlow onUnlocked={refresh} />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <BudgetNav />
      {children}
    </div>
  );
}
