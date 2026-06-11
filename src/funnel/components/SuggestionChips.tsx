// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
export interface SuggestionChipsProps {
  suggestions: string[];
  onSelect: (suggestion: string) => void;
  disabled?: boolean;
}

export function SuggestionChips({ suggestions, onSelect, disabled }: SuggestionChipsProps) {
  if (suggestions.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {suggestions.map(s => (
        <button
          key={s}
          type="button"
          onClick={() => onSelect(s)}
          disabled={disabled}
          className="font-mono text-[11px] text-ink-soft hover:text-ink px-3 py-1.5 rounded-full border border-rule hover:border-blueprint hover:bg-vellum-soft disabled:opacity-50 tracking-wide transition-colors"
        >
          {s}
        </button>
      ))}
    </div>
  );
}
