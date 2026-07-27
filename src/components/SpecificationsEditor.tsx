"use client";

import { Plus, Trash2 } from "lucide-react";

interface Props {
  value: { key: string; val: string }[];
  onChange: (rows: { key: string; val: string }[]) => void;
}

export default function SpecificationsEditor({ value, onChange }: Props) {
  const update = (i: number, field: "key" | "val", v: string) => {
    const next = value.map((r, idx) => (idx === i ? { ...r, [field]: v } : r));
    onChange(next);
  };

  const add = () => onChange([...value, { key: "", val: "" }]);
  const remove = (i: number) => onChange(value.filter((_, idx) => idx !== i));

  return (
    <div className="space-y-2">
      {value.map((row, i) => (
        <div key={i} className="flex gap-2 items-center">
          <input
            value={row.key}
            onChange={(e) => update(i, "key", e.target.value)}
            placeholder="e.g. Brand"
            className="input-field flex-1"
          />
          <input
            value={row.val}
            onChange={(e) => update(i, "val", e.target.value)}
            placeholder="e.g. Apple"
            className="input-field flex-1"
          />
          <button
            type="button"
            onClick={() => remove(i)}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors shrink-0"
          >
            <Trash2 size={14} />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={add}
        className="flex items-center gap-1.5 text-sm text-orange-500 hover:text-orange-600 font-medium mt-1"
      >
        <Plus size={14} /> Add specification
      </button>
    </div>
  );
}
