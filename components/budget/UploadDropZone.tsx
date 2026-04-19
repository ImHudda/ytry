"use client";

import { useState, useRef } from "react";

export default function UploadDropZone({ onFile }: { onFile: (file: File) => void }) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) onFile(file);
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      className={`rounded-xl border-2 border-dashed p-8 text-center cursor-pointer transition-colors ${
        dragging
          ? "border-indigo-500 bg-indigo-950/20"
          : "border-zinc-700 hover:border-zinc-500 bg-zinc-900/30"
      }`}
    >
      <div className="text-sm text-zinc-300">Drop a file or click to browse</div>
      <div className="text-xs text-zinc-500 mt-1">
        WHOOP CSV, bank/CC/UPI CSV. PDF coming when you share a sample.
      </div>
      <div className="text-[10px] text-zinc-600 mt-3 uppercase tracking-wider">
        parsed in browser · never uploaded
      </div>
      <input
        ref={inputRef}
        type="file"
        accept=".csv,.tsv,.txt,.pdf"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFile(file);
          e.target.value = "";
        }}
      />
    </div>
  );
}
