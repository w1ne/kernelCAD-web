// SPDX-License-Identifier: MIT
import { useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useFocusTrap } from '../../ui/useFocusTrap';
import { ExportStatus } from './Shared/ExportStatus';
import { useDraftingReview, type DraftingReviewProps, type DraftingReviewState } from './useDraftingReview';
import { DrawingPreviewPane, ProfileControls, AnnotationControls } from './DraftingReviewPanels';
import { BUTTON } from './draftingReviewStyles';

export type { DraftingReviewProps };

function ReviewFooter({ state }: { state: DraftingReviewState }) {
  const { error, drawing: { busy, preview, current, reviewed, generatePreview, markReviewed }, annotations: { missing }, task, exportPdf } = state;
  return <footer className="flex shrink-0 flex-wrap items-center gap-2 border-t border-border px-4 py-3">
    {error && <p role="alert" className="w-full text-ui text-danger">{error}</p>}
    <button type="button" className={BUTTON} disabled={busy} onClick={() => void generatePreview()}>{busy ? 'Generating preview…' : preview ? 'Refresh preview' : 'Generate preview'}</button>
    <button type="button" className={BUTTON} disabled={!current || busy || !preview?.drawingReport || missing.length > 0} onClick={markReviewed}>Mark reviewed</button>
    <button type="button" className={`${BUTTON} ml-auto`} disabled={!reviewed || busy || task.state.running !== null} onClick={() => void exportPdf()}>Export reviewed PDF</button>
    <ExportStatus task={task} testId="drafting-export-status" />
  </footer>;
}

/** Review a server-rendered sheet; edits go through the same exporter as PDF. */
export function DraftingReview(props: DraftingReviewProps) {
  const { onClose } = props;
  const state = useDraftingReview(props);
  const panel = useRef<HTMLDivElement>(null);
  useFocusTrap(panel, true, onClose);
  const { current, reviewed } = state.drawing;
  return createPortal(
    <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/60 p-2 sm:p-5" data-theme="dark">
      <div ref={panel} role="dialog" aria-modal="true" aria-labelledby="drafting-review-title" tabIndex={-1}
        className="flex max-h-full w-full max-w-6xl flex-col overflow-hidden rounded-panel border border-border bg-surface-1 text-fg shadow-2xl">
        <header className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3">
          <div><h2 id="drafting-review-title" className="text-ui font-semibold">Drawing review</h2>
            <p className="text-2xs text-fg-3">{reviewed ? 'Reviewed preview' : current ? 'Preview ready for review' : 'Draft — generate a fresh preview'}</p></div>
          <button type="button" className={BUTTON} onClick={onClose} aria-label="Close drawing review"><X size={16} /></button>
        </header>
        <div className="grid min-h-0 flex-1 overflow-auto lg:grid-cols-[1fr_340px]">
          <DrawingPreviewPane state={state} />
          <div className="flex flex-col gap-3 border-l border-border p-4 text-ui">
            <ProfileControls state={state.profiles} />
            <AnnotationControls state={state.annotations} />
          </div>
        </div>
        <ReviewFooter state={state} />
      </div>
    </div>, document.body,
  );
}
