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
        placeholder="Describe the part you want..."
        className="w-full rounded-xl bg-neutral-900 border border-neutral-700 text-white p-4 text-base focus:border-blue-500 focus:outline-none disabled:opacity-50"
      />
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2">
          {examples.map(ex => (
            <button
              key={ex}
              type="button"
              onClick={() => setValue(ex)}
              disabled={disabled}
              className="text-xs text-neutral-400 hover:text-white px-2 py-1 rounded-md border border-neutral-700 hover:border-neutral-500 disabled:opacity-50"
            >
              {ex}
            </button>
          ))}
        </div>
        <button
          type="submit"
          disabled={disabled || !value.trim()}
          className="rounded-lg bg-white text-neutral-900 px-5 py-2 text-sm font-medium hover:bg-neutral-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {disabled ? 'Generating…' : 'Generate'}
        </button>
      </div>
    </form>
  );
}
