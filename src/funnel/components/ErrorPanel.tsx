import { useState } from 'react';

export interface ErrorPanelProps {
  code: string;
  message: string;
  originalPrompt: string;
  onRefine: (refinedPrompt: string) => void;
  busy?: boolean;
}

export function ErrorPanel({ code, message, originalPrompt, onRefine, busy }: ErrorPanelProps) {
  const prefill = `${originalPrompt}\n\n— previous attempt failed: ${code}: ${message}`;
  const [value, setValue] = useState(prefill);

  return (
    <div className="rounded-xl border border-copper bg-vellum-soft p-4">
      <p className="font-serif text-xl font-medium text-ink">Generation didn't finish</p>
      <p className="font-mono text-xs text-copper mt-1 tracking-widest uppercase">{code}</p>
      <p className="text-sm text-ink-soft mt-2 break-words">{message}</p>
      <p className="font-mono text-xs text-ink-faint mt-3 tracking-wide">
        Tweak the prompt below and try again. (Failed gens don't count against your free quota.)
      </p>
      <textarea
        value={value}
        onChange={e => setValue(e.target.value)}
        rows={4}
        disabled={busy}
        className="mt-3 w-full rounded-lg bg-white border border-rule text-ink p-3 text-sm focus:border-blueprint focus:outline-none disabled:opacity-50 font-sans"
        onKeyDown={e => {
          if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') onRefine(value);
        }}
      />
      <div className="mt-2 flex justify-end">
        <button
          type="button"
          disabled={busy}
          onClick={() => onRefine(value)}
          className="rounded-lg bg-blueprint hover:bg-blueprint-hover text-white px-4 py-2 text-sm font-medium disabled:opacity-50 transition-colors"
        >
          {busy ? 'Retrying…' : 'Retry'}
        </button>
      </div>
    </div>
  );
}
