"use client";

import { useEffect, useState } from "react";
import UploadDropZone from "@/components/budget/UploadDropZone";
import ParsePreview from "@/components/budget/ParsePreview";
import { detectFile, type DetectedFile } from "@/lib/budget/parsers";
import { Statements, RawEntries, WhoopWeeks } from "@/lib/budget/store";
import type { Statement } from "@/lib/budget/types";

interface StmtSummary {
  stmt: Statement;
  entryCount: number;
}

export default function StatementsPage() {
  const [stagedFile, setStagedFile] = useState<File | null>(null);
  const [detected, setDetected] = useState<DetectedFile | null>(null);
  const [loadingDetect, setLoadingDetect] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const [statements, setStatements] = useState<StmtSummary[]>([]);
  const [whoopWeekCount, setWhoopWeekCount] = useState(0);

  async function refreshList() {
    const [sts, entries, weeks] = await Promise.all([
      Statements.list(),
      RawEntries.list(),
      WhoopWeeks.list(),
    ]);
    sts.sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));
    const byStmt = new Map<string, number>();
    for (const e of entries) {
      byStmt.set(e.statementId, (byStmt.get(e.statementId) ?? 0) + 1);
    }
    setStatements(sts.map((s) => ({ stmt: s, entryCount: byStmt.get(s.id) ?? 0 })));
    setWhoopWeekCount(weeks.length);
  }

  useEffect(() => {
    refreshList();
  }, []);

  async function handleFile(file: File) {
    setLoadingDetect(true);
    setToast(null);
    try {
      const d = await detectFile(file);
      setStagedFile(file);
      setDetected(d);
    } finally {
      setLoadingDetect(false);
    }
  }

  function handleCancel() {
    setStagedFile(null);
    setDetected(null);
  }

  function handleDone(summary: string) {
    setStagedFile(null);
    setDetected(null);
    setToast(summary);
    refreshList();
  }

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-xl font-bold text-white">Statements & data imports</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Drop bank / credit card / UPI statements or WHOOP exports here. Everything parses in your
          browser and encrypts into your vault before being saved.
        </p>
      </div>

      {toast && (
        <div className="p-3 rounded-lg border border-emerald-900/50 bg-emerald-950/20 text-sm text-emerald-200">
          {toast}
        </div>
      )}

      {!stagedFile && (
        <>
          <UploadDropZone onFile={handleFile} />
          {loadingDetect && <p className="text-xs text-zinc-600">detecting…</p>}
        </>
      )}

      {stagedFile && detected && (
        <div className="p-5 rounded-xl border border-zinc-800 bg-zinc-900/40 space-y-4">
          <div className="text-sm font-medium text-white">{stagedFile.name}</div>
          <ParsePreview file={stagedFile} detected={detected} onDone={handleDone} onCancel={handleCancel} />
        </div>
      )}

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-wider">
          Imported statements
        </h2>
        {statements.length === 0 ? (
          <p className="text-sm text-zinc-600">No statements imported yet.</p>
        ) : (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 divide-y divide-zinc-900">
            {statements.map(({ stmt, entryCount }) => (
              <div key={stmt.id} className="px-4 py-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-white truncate">
                    {stmt.issuer}{" "}
                    <span className="text-[10px] text-zinc-500 uppercase ml-1">
                      {stmt.source}
                    </span>
                  </div>
                  <div className="text-xs text-zinc-500">
                    {stmt.periodStart} → {stmt.periodEnd} · {entryCount} row(s)
                  </div>
                </div>
                <div className="text-[10px] text-zinc-600 font-mono">
                  {new Date(stmt.uploadedAt).toLocaleString("en-IN", {
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-wider">
          WHOOP weeks ingested
        </h2>
        <p className="text-sm text-zinc-500">
          {whoopWeekCount === 0
            ? "No WHOOP data yet. Drop your `physiological_cycles.csv` above to seed weekly scores."
            : `${whoopWeekCount} week(s) ingested. Cap logic + narrative view ships next.`}
        </p>
      </section>
    </div>
  );
}
