export interface ExportButtonsProps {
  slug: string;
  signedIn: boolean;
}

export function ExportButtons({ slug, signedIn }: ExportButtonsProps) {
  return (
    <div className="flex gap-2">
      <button
        type="button"
        disabled
        title={`STL export for ${slug} — server-side endpoint wiring is Phase 4`}
        className="rounded-lg border border-rule text-ink-soft px-3 py-1.5 font-mono text-[11px] tracking-wide hover:bg-vellum-soft disabled:opacity-50 transition-colors"
      >
        Export STL
      </button>
      <button
        type="button"
        disabled={!signedIn}
        title={signedIn ? `STEP export for ${slug} — Phase 4` : 'Sign in to export STEP'}
        className="rounded-lg border border-rule text-ink-soft px-3 py-1.5 font-mono text-[11px] tracking-wide hover:bg-vellum-soft disabled:opacity-50 transition-colors"
      >
        Export STEP
      </button>
    </div>
  );
}
