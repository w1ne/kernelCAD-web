import { useEffect, useRef, useState, type RefObject } from 'react';

interface GalleryAuthor {
  handle: string;
  url: string;
}

export interface GalleryEntry {
  slug: string;
  title: string;
  author: GalleryAuthor;
  version: string;
  prompt: string;
  source: string;
  code: string;
  tags: string[];
  featured: boolean;
  createdAt: string;
  appUrl: string | null;
  videoUrl: string;
  posterUrl: string;
  modelUrl: string;
}

interface GalleryJson {
  generatedAt: string;
  entries: GalleryEntry[];
}

const MODEL_VIEWER_CDN =
  'https://cdn.jsdelivr.net/npm/@google/model-viewer/dist/model-viewer.min.js';

/** Lazy-load the model-viewer web component only after a tile needs it. Match the
 * static landing page's CDN script-tag approach — keeps it out of the main
 * Vite bundle (the npm package is ~1MB minified) and shares the CDN cache
 * with any other page on kernelcad.com that loads it. */
function useModelViewer(enabled: boolean): void {
  useEffect(() => {
    if (!enabled) return;
    if (typeof window === 'undefined') return;
    if (window.customElements?.get('model-viewer')) return;
    if (document.querySelector(`script[src="${MODEL_VIEWER_CDN}"]`)) return;
    const script = document.createElement('script');
    script.type = 'module';
    script.src = MODEL_VIEWER_CDN;
    script.onerror = () => {
      // Graceful degrade — tiles fall back to the <model-viewer> poster
      // attribute, which renders as an <img> until the script registers
      // the custom element.
    };
    document.head.appendChild(script);
  }, [enabled]);
}

function useNearViewport<T extends Element>(): [RefObject<T | null>, boolean, () => void] {
  const ref = useRef<T>(null);
  const [nearViewport, setNearViewport] = useState(false);
  const upgrade = () => setNearViewport(true);

  useEffect(() => {
    if (nearViewport) return;
    if (typeof window === 'undefined') return;
    const node = ref.current;
    if (!node || !('IntersectionObserver' in window)) return;

    const observer = new IntersectionObserver(
      entries => {
        if (entries.some(entry => entry.isIntersecting)) {
          setNearViewport(true);
          observer.disconnect();
        }
      },
      { rootMargin: '500px 0px' },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [nearViewport]);

  return [ref, nearViewport, upgrade];
}

function GalleryTile({
  entry,
  onOpen,
}: {
  entry: GalleryEntry;
  onOpen: (entry: GalleryEntry) => void;
}) {
  const [tileRef, shouldUpgrade, upgrade] = useNearViewport<HTMLButtonElement>();
  const keepPosterOnly = entry.slug === 'royal-pop-pocket-watch';
  useModelViewer(shouldUpgrade && !keepPosterOnly);

  return (
    <button
      ref={tileRef}
      key={entry.slug}
      type="button"
      onClick={() => {
        upgrade();
        onOpen(entry);
      }}
      onPointerEnter={upgrade}
      onFocus={upgrade}
      className="group relative aspect-square rounded-lg overflow-hidden border border-rule bg-vellum-soft hover:border-blueprint transition-colors text-left"
      aria-label={`Open ${entry.title}`}
    >
      {shouldUpgrade && !keepPosterOnly ? (
        // @ts-expect-error — model-viewer is a registered web component, not in JSX.IntrinsicElements
        <model-viewer
          src={entry.modelUrl}
          poster={entry.posterUrl}
          auto-rotate
          auto-rotate-delay="0"
          rotation-per-second="20deg"
          touch-action="pan-y"
          interaction-prompt="none"
          reveal="auto"
          disable-zoom
          loading="lazy"
          style={{ width: '100%', height: '100%', backgroundColor: 'transparent' }}
        />
      ) : (
        <img
          src={entry.posterUrl}
          alt=""
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover bg-vellum-soft"
        />
      )}
    </button>
  );
}

export function GallerySection() {
  const [entries, setEntries] = useState<GalleryEntry[] | null>(null);
  const [open, setOpen] = useState<GalleryEntry | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/gallery.json')
      .then(r => (r.ok ? r.json() : null))
      .then((g: GalleryJson | null) => {
        if (cancelled) return;
        if (g && Array.isArray(g.entries) && g.entries.length > 0) {
          setEntries(g.entries);
        }
      })
      .catch(() => {
        // No gallery — section just doesn't render. Not a hard error.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const dlg = dialogRef.current;
    if (!dlg) return;
    if (open && !dlg.open) dlg.showModal();
    else if (!open && dlg.open) dlg.close();
  }, [open]);

  if (!entries || entries.length === 0) return null;

  return (
    <section className="mt-24 mb-12">
      <div className="flex items-baseline justify-between gap-4 mb-6">
        <div>
          <h2 className="font-serif text-3xl font-medium text-ink">Built with kernelCAD</h2>
          <p className="text-sm text-ink-soft mt-1">
            Every release ships with a build. Click any to see the prompt that built it.
          </p>
        </div>
        <a
          className="text-xs font-mono tracking-wide text-blueprint hover:underline whitespace-nowrap"
          href="https://github.com/w1ne/kernelCAD-web/issues/new?template=gallery-submission.md"
        >
          Submit your build →
        </a>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {entries.map(entry => (
          <GalleryTile
            key={entry.slug}
            entry={entry}
            onOpen={setOpen}
          />
        ))}
      </div>

      <dialog
        ref={dialogRef}
        onClose={() => setOpen(null)}
        onClick={e => {
          if (e.target === dialogRef.current) setOpen(null);
        }}
        className="max-w-3xl w-full rounded-xl border border-rule bg-vellum text-ink p-0 backdrop:bg-ink/40 backdrop:backdrop-blur-sm"
      >
        {open && (
          <div className="p-6 relative">
            <button
              type="button"
              onClick={() => setOpen(null)}
              aria-label="Close"
              className="absolute top-3 right-3 text-ink-faint hover:text-ink transition-colors text-2xl leading-none"
            >
              ×
            </button>
            <video
              autoPlay
              muted
              loop
              playsInline
              controls
              src={open.videoUrl}
              className="w-full rounded-lg border border-rule bg-vellum-soft mb-4"
            />
            <h3 className="font-serif text-xl font-medium">{open.title}</h3>
            <p className="text-xs font-mono text-ink-faint mt-1">
              by{' '}
              <a href={open.author.url} className="hover:text-blueprint">
                @{open.author.handle}
              </a>{' '}
              · {open.version} · {open.createdAt}
            </p>
            <pre className="mt-3 max-h-56 overflow-auto rounded bg-vellum-soft border border-rule p-3 text-xs whitespace-pre-wrap font-mono text-ink-soft">
              {open.prompt}
            </pre>
            <div className="mt-4 flex flex-wrap gap-3 text-xs font-mono">
              <a
                className="px-3 py-1.5 rounded border border-rule text-ink-soft hover:text-ink hover:border-blueprint transition-colors"
                href={open.code}
                target="_blank"
                rel="noopener noreferrer"
              >
                View source ↗
              </a>
              {open.appUrl && (
                <a
                  className="px-3 py-1.5 rounded bg-blueprint text-white hover:bg-blueprint-hover transition-colors"
                  href={open.appUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Open in app ↗
                </a>
              )}
            </div>
          </div>
        )}
      </dialog>
    </section>
  );
}
