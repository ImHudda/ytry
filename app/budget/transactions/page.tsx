"use client";

import { useState } from "react";
import TransactionForm from "@/components/budget/TransactionForm";
import TransactionList from "@/components/budget/TransactionList";

export default function TransactionsPage() {
  const [refresh, setRefresh] = useState(0);
  return (
    <div className="p-4 sm:p-6 space-y-4 max-w-4xl mx-auto">
      <h1 className="text-xl font-bold text-white">Transactions</h1>
      <TransactionForm onSaved={() => setRefresh((n) => n + 1)} />
      <TransactionList refreshKey={refresh} />
    </div>
  );
}
