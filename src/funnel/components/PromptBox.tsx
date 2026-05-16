import { useState } from 'react';

export interface PromptBoxProps {
  onSubmit: (prompt: string) => void;
  disabled?: boolean;
  examples?: string[];
}

const DEFAULT_EXAMPLES = [
  '60x40x5 mm bracket with 4 M3 mounting holes',
  'Hex-cap bolt M8x30',
  'L-bracket 100x60x2 mm, 90° fold along x=50',
];

export function PromptBox({ onSubmit, disabled, examples = DEFAULT_EXAMPLES }: PromptBoxProps) {
  const [value, setValue] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSubmit(trimmed);
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-2xl mx-auto">
      <label htmlFor="prompt" className="sr-only">CAD prompt</label>
      <textarea
        id="prompt"
        value={value}
        onChange={e => setValue(e.target.value)}
        rows={3}
        disabled={disabled}
        placeholder="Describe the part you want…"
        className="w-full rounded-lg bg-white border border-rule text-ink p-4 text-base placeholder:text-ink-faint focus:border-blueprint focus:outline-none disabled:opacity-50 font-sans"
      />
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2">
          {examples.map(ex => (
            <button
              key={ex}
              type="button"
              onClick={() => setValue(ex)}
              disabled={disabled}
              className="font-mono text-[11px] text-ink-soft hover:text-ink hover:border-ink px-2.5 py-1 rounded border border-rule disabled:opacity-50 tracking-wide transition-colors"
            >
              {ex}
            </button>
          ))}
        </div>
        <button
          type="submit"
          disabled={disabled || !value.trim()}
          className="rounded-lg bg-blueprint hover:bg-blueprint-hover text-white px-6 py-3 text-base font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {disabled ? 'Generating…' : 'Generate →'}
        </button>
      </div>
    </form>
  );
}
