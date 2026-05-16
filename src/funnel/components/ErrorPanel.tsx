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
    <div className="rounded-xl border border-amber-700 bg-amber-950/40 p-4 text-amber-100">
      <p className="font-medium">Generation didn't succeed: {code}</p>
      <p className="text-sm text-amber-200/80 mt-1 break-words">{message}</p>
      <p className="text-xs text-amber-200/60 mt-3">
        Tweak the prompt below and try again. (Failed gens don't count against your free quota.)
      </p>
      <textarea
        value={value}
        onChange={e => setValue(e.target.value)}
        rows={4}
        disabled={busy}
        className="mt-3 w-full rounded-lg bg-neutral-900 border border-neutral-700 text-white p-3 text-sm focus:border-blue-500 focus:outline-none disabled:opacity-50"
        onKeyDown={e => {
          if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') onRefine(value);
        }}
      />
      <div className="mt-2 flex justify-end">
        <button
          type="button"
          disabled={busy}
          onClick={() => onRefine(value)}
          className="rounded-lg bg-white text-neutral-900 px-4 py-2 text-sm font-medium disabled:opacity-50"
        >
          {busy ? 'Retrying…' : 'Retry'}
        </button>
      </div>
    </div>
  );
}
