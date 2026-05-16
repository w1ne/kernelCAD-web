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
        className="rounded-lg border border-neutral-700 text-neutral-300 px-3 py-1.5 text-xs hover:bg-neutral-800 disabled:opacity-50"
      >
        Export STL
      </button>
      <button
        type="button"
        disabled={!signedIn}
        title={signedIn ? `STEP export for ${slug} — Phase 4` : 'Sign in to export STEP'}
        className="rounded-lg border border-neutral-700 text-neutral-300 px-3 py-1.5 text-xs hover:bg-neutral-800 disabled:opacity-50"
      >
        Export STEP
      </button>
    </div>
  );
}
