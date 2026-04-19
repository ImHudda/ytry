"use client";

import { useEffect, useMemo, useState } from "react";
import type { DetectedFile } from "@/lib/budget/parsers";
import { labelForKind } from "@/lib/budget/parsers";
import {
  parseCSV,
  applyMapping,
  autoSuggestMapping,
  type ColumnMapping,
  type GenericCSVResult,
} from "@/lib/budget/parsers/csv-generic";
import { ingestGenericCSV, ingestWhoopCyclesCSV } from "@/lib/budget/ingest";
import type { StatementSource } from "@/lib/budget/types";

export default function ParsePreview({
  file,
  detected,
  onDone,
  onCancel,
}: {
  file: File;
  detected: DetectedFile;
  onDone: (summary: string) => void;
  onCancel: () => void;
}) {
  const [csv, setCsv] = useState<GenericCSVResult | null>(null);
  const [mapping, setMapping] = useState<ColumnMapping>({});
  const [source, setSource] = useState<StatementSource>("bank");
  const [issuer, setIssuer] = useState("");
  const [defaultCurrency, setDefaultCurrency] = useState("INR");
  const [defaultDirection, setDefaultDirection] = useState<"debit" | "credit">("debit");
  const [busy, setBusy] = useState(false);

  const isWhoopCycles = detected.kind === "whoop_cycles";
  const isCsv = detected.kind === "csv_generic" || detected.kind.startsWith("whoop_");

  useEffect(() => {
    if (!isCsv) return;
    parseCSV(file).then((r) => {
      setCsv(r);
      setMapping(autoSuggestMapping(r.headers));
    });
  }, [file, isCsv]);

  const preview = useMemo(() => {
    if (!csv || isWhoopCycles) return [];
    return applyMapping(csv.rows.slice(0, 8), mapping, {
      currency: defaultCurrency,
      direction: defaultDirection,
    });
  }, [csv, mapping, defaultCurrency, defaultDirection, isWhoopCycles]);

  async function handleImport() {
    setBusy(true);
    try {
      if (isWhoopCycles) {
        const text = await file.text();
        const r = await ingestWhoopCyclesCSV({
          filename: file.name,
          fileHash: detected.hash,
          csvText: text,
        });
        onDone(`WHOOP: ${r.weeksImported} week(s) imported, ${r.weeksSkipped} skipped (dup).`);
        return;
      }
      if (!csv) return;
      if (!mapping.amount || !mapping.date) {
        alert("Please map at least Amount and Date columns.");
        return;
      }
      const entries = applyMapping(csv.rows, mapping, {
        currency: defaultCurrency,
        direction: defaultDirection,
      });
      const r = await ingestGenericCSV({
        filename: file.name,
        fileHash: detected.hash,
        source,
        issuer: issuer.trim() || "(unspecified)",
        entries,
      });
      onDone(
        `${source.toUpperCase()} ${issuer || ""}: ${r.rowsImported} row(s) imported, ${r.duplicates} duplicate(s), ${r.rowsSkipped} skipped.`
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-xs uppercase tracking-wider text-zinc-500">Detected as</span>
        <span className="text-sm text-white">{labelForKind(detected.kind)}</span>
        <span className="text-[10px] text-zinc-600">· {(detected.sizeBytes / 1024).toFixed(1)} KB</span>
        <span className="text-[10px] text-zinc-600 font-mono truncate">hash:{detected.hash.slice(0, 12)}</span>
      </div>

      {detected.kind === "pdf_unparsed" && (
        <div className="p-4 rounded-xl border border-amber-900/50 bg-amber-950/20 text-sm text-amber-200">
          PDF parsing isn't wired yet. Tell me the issuer (HDFC/ICICI/SBI/Axis/Kotak/etc.) and I'll
          build a parser for it once you share a sample. For now, try CSV export from the bank/card
          portal — it's usually there.
        </div>
      )}

      {detected.kind === "unknown" && (
        <div className="p-4 rounded-xl border border-red-900/50 bg-red-950/20 text-sm text-red-200">
          Unsupported file type. Try CSV.
        </div>
      )}

      {isWhoopCycles && (
        <div className="p-4 rounded-xl border border-emerald-900/50 bg-emerald-950/20 text-sm text-emerald-200">
          Recognized as WHOOP cycles export. Will aggregate into weekly health scores and derive
          default Lavish caps via the current formula (editable later).
        </div>
      )}

      {isCsv && !isWhoopCycles && csv && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <LabeledSelect
              label="Source"
              value={source}
              onChange={(v) => setSource(v as StatementSource)}
              options={[
                { value: "bank", label: "Bank statement" },
                { value: "credit_card", label: "Credit card" },
                { value: "upi", label: "UPI app" },
              ]}
            />
            <LabeledInput
              label="Issuer"
              value={issuer}
              onChange={setIssuer}
              placeholder="HDFC / ICICI / SBI / GPay / PhonePe"
            />
            <LabeledSelect
              label="Default currency"
              value={defaultCurrency}
              onChange={setDefaultCurrency}
              options={[
                { value: "INR", label: "INR" },
                { value: "USD", label: "USD" },
                { value: "THB", label: "THB" },
                { value: "SGD", label: "SGD" },
                { value: "EUR", label: "EUR" },
                { value: "GBP", label: "GBP" },
              ]}
            />
            <LabeledSelect
              label="Default direction"
              value={defaultDirection}
              onChange={(v) => setDefaultDirection(v as "debit" | "credit")}
              options={[
                { value: "debit", label: "debit (money out)" },
                { value: "credit", label: "credit (money in)" },
              ]}
            />
          </div>

          <div>
            <div className="text-xs uppercase tracking-wider text-zinc-500 mb-2">
              Column mapping ({csv.headers.length} columns detected)
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <ColumnPick
                label="Amount"
                value={mapping.amount}
                headers={csv.headers}
                onChange={(v) => setMapping({ ...mapping, amount: v })}
              />
              <ColumnPick
                label="Date"
                value={mapping.date}
                headers={csv.headers}
                onChange={(v) => setMapping({ ...mapping, date: v })}
              />
              <ColumnPick
                label="Payee"
                value={mapping.payee}
                headers={csv.headers}
                onChange={(v) => setMapping({ ...mapping, payee: v })}
              />
              <ColumnPick
                label="Reference (optional)"
                value={mapping.ref}
                headers={csv.headers}
                onChange={(v) => setMapping({ ...mapping, ref: v })}
              />
              <ColumnPick
                label="Direction (optional)"
                value={mapping.direction}
                headers={csv.headers}
                onChange={(v) => setMapping({ ...mapping, direction: v })}
              />
              <ColumnPick
                label="Currency (optional)"
                value={mapping.currency}
                headers={csv.headers}
                onChange={(v) => setMapping({ ...mapping, currency: v })}
              />
            </div>
          </div>

          {preview.length > 0 && (
            <div>
              <div className="text-xs uppercase tracking-wider text-zinc-500 mb-2">
                Preview (first 8 rows after mapping)
              </div>
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 divide-y divide-zinc-900">
                {preview.map((p, i) => (
                  <div key={i} className="px-3 py-2 flex items-center gap-2 text-xs">
                    <span className="text-zinc-500 w-20">{p.extractedDate}</span>
                    <span className="flex-1 truncate text-zinc-300">{p.extractedPayee}</span>
                    <span className="text-zinc-600">{p.direction}</span>
                    <span className="font-mono text-white">
                      {p.extractedCurrency} {p.extractedAmount.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <div className="flex items-center gap-2 pt-2 border-t border-zinc-800">
        <button
          onClick={onCancel}
          className="px-3 py-1.5 text-sm text-zinc-400 hover:text-zinc-200"
        >
          Cancel
        </button>
        <div className="flex-1" />
        <button
          onClick={handleImport}
          disabled={
            busy ||
            detected.kind === "pdf_unparsed" ||
            detected.kind === "unknown" ||
            (isCsv && !isWhoopCycles && (!mapping.amount || !mapping.date))
          }
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-sm font-medium rounded-lg"
        >
          {busy ? "Encrypting & saving…" : "Import"}
        </button>
      </div>
    </div>
  );
}

function LabeledInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[10px] uppercase tracking-wider text-zinc-500">{label}</span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="bg-zinc-900 border border-zinc-800 rounded px-2 py-1.5 text-white text-sm focus:outline-none focus:border-indigo-500"
      />
    </label>
  );
}

function LabeledSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[10px] uppercase tracking-wider text-zinc-500">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-zinc-900 border border-zinc-800 rounded px-2 py-1.5 text-white text-sm focus:outline-none focus:border-indigo-500"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function ColumnPick({
  label,
  value,
  headers,
  onChange,
}: {
  label: string;
  value: string | undefined;
  headers: string[];
  onChange: (v: string | undefined) => void;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[10px] uppercase tracking-wider text-zinc-500">{label}</span>
      <select
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value || undefined)}
        className="bg-zinc-900 border border-zinc-800 rounded px-2 py-1.5 text-white text-sm focus:outline-none focus:border-indigo-500"
      >
        <option value="">(none)</option>
        {headers.map((h) => (
          <option key={h} value={h}>
            {h}
          </option>
        ))}
      </select>
    </label>
  );
}
