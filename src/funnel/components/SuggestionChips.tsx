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
          className="text-xs text-neutral-200 hover:text-white px-3 py-1.5 rounded-full border border-neutral-700 hover:border-blue-500 hover:bg-blue-950 disabled:opacity-50"
        >
          {s}
        </button>
      ))}
    </div>
  );
}
