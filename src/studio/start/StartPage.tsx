// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { lazy, Suspense, useState } from 'react';
import { Download, Undo2 } from 'lucide-react';
import { PromptBox } from '../../funnel/components/PromptBox';
import { inAppAgentEnabled } from '../agentAvailability';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { SIZE_LIMITS, STARTERS, type Dimension } from './starterModels';
import { StarterIcon } from './StarterIcon';
import { useStarterModel } from './useStarterModel';

const StarterPreview = lazy(() => import('./StarterPreview'));
const buttonStyle = 'inline-flex items-center justify-center gap-2 rounded-lg border border-rule px-4 py-3 text-sm font-medium hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed';

export default function StartPage() {
  const starter = useStarterModel();
  const agentEnabled = inAppAgentEnabled();
  const [downloading, setDownloading] = useState(false);
  const [downloadMessage, setDownloadMessage] = useState('');
  const download = async (format: 'stl' | 'step') => {
    setDownloading(true);
    setDownloadMessage('');
    try {
      const blob = await starter.exportModel(format);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${starter.model?.id ?? 'model'}.${format}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
      setDownloadMessage('Downloaded.');
    } catch {
      setDownloadMessage('Could not download. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <main className="min-h-screen bg-vellum text-ink font-sans">
      <div className="mx-auto max-w-5xl px-5 py-6 sm:px-8">
        <nav className="mb-12 flex items-center justify-between gap-4" aria-label="Main">
          <a href="/" className="text-lg font-semibold">kernel<span className="text-blueprint">CAD</span></a>
          <a href="/studio" className="text-sm text-ink-soft hover:underline">Advanced</a>
        </nav>
        <header className="mx-auto max-w-2xl text-center">
          <h1 className="mb-3 font-serif text-4xl sm:text-5xl">What would you like to make?</h1>
          <p className="mb-6 text-ink-soft">{agentEnabled ? 'Describe it, or try an example below.' : 'Pick a part. Change its size. Download it.'}</p>
          {agentEnabled && <>
          <PromptBox examples={[]} onSubmit={prompt => { window.location.href = `/generate?prompt=${encodeURIComponent(prompt)}`; }} />
          <p className="mt-2 text-xs text-ink-soft">Custom AI designs need sign-in. Examples are free.</p>
          </>}
        </header>
        <section className="mt-10" aria-label="Free examples">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-medium">Try an example</h2>
            <p className="text-sm text-ink-soft">No account needed.</p>
          </div>
          <div className="grid grid-cols-3 gap-2 sm:gap-4">
            {STARTERS.map(model => (
              <button key={model.id} type="button" aria-pressed={starter.model?.id === model.id} disabled={downloading}
                onClick={() => { starter.select(model.id); setDownloadMessage(''); }}
                className={`rounded-xl border p-3 text-blueprint transition-colors sm:p-4 ${starter.model?.id === model.id ? 'border-blueprint bg-white ring-1 ring-blueprint' : 'border-rule bg-white/40 hover:bg-white'}`}>
                <StarterIcon id={model.id} />
                <span className="text-sm font-medium text-ink">{model.name}</span>
              </button>
            ))}
          </div>
        </section>
        {starter.model && (
          <section className="mt-5 overflow-hidden rounded-xl border border-rule bg-white/40" aria-label="Edit your example">
            <div className="grid md:grid-cols-[1fr_240px]">
              <div className="relative h-72 min-w-0 sm:h-96" data-testid="starter-preview">
                <ErrorBoundary>
                  <Suspense fallback={<p className="p-6 text-sm">Opening preview…</p>}>
                    {starter.geometries.length > 0 && <StarterPreview geometries={starter.geometries} />}
                  </Suspense>
                </ErrorBoundary>
                <p role="status" className="pointer-events-none absolute left-4 top-4 rounded bg-vellum/90 px-3 py-2 text-xs" data-testid="starter-status">
                  {starter.error ?? (starter.ready ? 'Drag to turn · Scroll to zoom' : 'Updating…')}
                </p>
              </div>
              <div className="border-t border-rule p-5 md:border-l md:border-t-0">
                <h2 className="mb-5 font-medium">Make it fit</h2>
                {(Object.keys(SIZE_LIMITS) as Dimension[]).map(dimension => (
                  <label key={dimension} className="mb-5 block text-sm">
                    <span className="mb-2 flex justify-between"><span className="capitalize">{dimension}</span><span>{starter.model!.sizes[dimension]} mm</span></span>
                    <input type="range" aria-label={dimension} {...SIZE_LIMITS[dimension]} step={1} value={starter.model!.sizes[dimension]}
                      disabled={downloading} onChange={event => { starter.resize(dimension, Number(event.target.value)); setDownloadMessage(''); }}
                      className="h-6 w-full accent-blueprint" />
                  </label>
                ))}
                <button type="button" className={buttonStyle} disabled={!starter.canUndo || downloading} onClick={() => { starter.undo(); setDownloadMessage(''); }}><Undo2 size={16} />Undo</button>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3 border-t border-rule p-4">
              <button type="button" className={`${buttonStyle} bg-blueprint text-white hover:bg-blueprint-hover`} disabled={!starter.ready || downloading} onClick={() => void download('stl')}><Download size={16} />Download for 3D printing</button>
              <button type="button" className={buttonStyle} disabled={!starter.ready || downloading} onClick={() => void download('step')}>Download STEP</button>
              <span role="status" className="text-xs text-ink-soft">{downloading ? 'Preparing file…' : downloadMessage}</span>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
