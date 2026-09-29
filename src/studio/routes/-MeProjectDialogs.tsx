// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Rename, delete and publish-to-gallery dialogs of a /me project card.
import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { Button, Dialog } from '../../ui';
import {
  fetchProjectGalleryState,
  PROJECT_TITLE_MAX,
  setProjectGalleryListed,
  type MyProjectRow,
  type ProjectGalleryState,
} from '../../funnel/lib/apiClient';
import { revisionsText } from '../components/projectCardModel';
import { galleryBlocker, galleryErrorText } from './-meProjects';

export type ProjectDialogKind = 'rename' | 'delete' | 'gallery';

interface DialogBaseProps {
  project: MyProjectRow;
  onClose: () => void;
}

function ErrorLine({ text }: { text: string | null }): ReactNode {
  if (!text) return null;
  return <p role="alert" className="mt-3 text-ui text-danger">{text}</p>;
}

export function RenameProjectDialog({ project, onClose, onRename }: DialogBaseProps & {
  onRename: (title: string) => Promise<void>;
}): ReactNode {
  const [title, setTitle] = useState(project.title);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const clean = title.trim();
  const unchanged = clean === project.title.trim();

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!clean || unchanged) return;
    setBusy(true);
    setError(null);
    try {
      await onRename(clean);
      onClose();
    } catch (err) {
      setError(`Could not rename the project. ${err instanceof Error ? err.message : ''}`.trim());
      setBusy(false);
    }
  };

  return (
    <Dialog
      open
      onClose={onClose}
      title="Rename project"
      testId="rename-project-dialog"
      footer={(
        <>
          <Button onClick={onClose} className="max-md:h-touch">Cancel</Button>
          <Button variant="primary" type="submit" form="rename-project-form" className="max-md:h-touch" loading={busy} disabled={!clean || unchanged}>
            Save name
          </Button>
        </>
      )}
    >
      <form id="rename-project-form" onSubmit={e => void submit(e)}>
        <label htmlFor="rename-project-input" className="text-ui font-medium text-fg">Name</label>
        <input
          id="rename-project-input"
          data-autofocus
          value={title}
          maxLength={PROJECT_TITLE_MAX}
          onChange={e => setTitle(e.target.value)}
          onFocus={e => e.currentTarget.select()}
          className="focus-ring mt-1.5 h-control-lg w-full rounded-control border border-border-strong bg-surface-1 px-3 text-body text-fg"
        />
        <p className="mt-1.5 text-2xs text-fg-3">Your agent can still find it by its link: /p/{project.slug}</p>
        <ErrorLine text={error} />
      </form>
    </Dialog>
  );
}

export function DeleteProjectDialog({ project, onClose, onDelete }: DialogBaseProps & {
  onDelete: () => Promise<void>;
}): ReactNode {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const confirm = async () => {
    setBusy(true);
    setError(null);
    try {
      await onDelete();
      onClose();
    } catch (err) {
      setError(`Could not delete the project. ${err instanceof Error ? err.message : ''}`.trim());
      setBusy(false);
    }
  };

  return (
    <Dialog
      open
      onClose={onClose}
      title={`Delete “${project.title || 'Untitled'}”?`}
      description={`This deletes the project, its ${revisionsText(project.version)} and its link. You cannot undo this.`}
      testId="delete-project-dialog"
      footer={(
        <>
          <Button onClick={onClose} className="max-md:h-touch">Cancel</Button>
          <Button variant="danger" onClick={() => void confirm()} loading={busy} className="max-md:h-touch">Delete project</Button>
        </>
      )}
    >
      {error ? <ErrorLine text={error} /> : null}
    </Dialog>
  );
}

type GalleryLoad = { status: 'loading' } | { status: 'error' } | { status: 'ready'; state: ProjectGalleryState };

export function GalleryProjectDialog({ project, onClose }: DialogBaseProps): ReactNode {
  const [load, setLoad] = useState<GalleryLoad>({ status: 'loading' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchProjectGalleryState(project.slug)
      .then(state => { if (!cancelled) setLoad({ status: 'ready', state }); })
      .catch(() => { if (!cancelled) setLoad({ status: 'error' }); });
    return () => { cancelled = true; };
  }, [project.slug]);

  const state = load.status === 'ready' ? load.state : null;
  const blocker = state ? galleryBlocker(project, state) : null;

  const toggle = async () => {
    if (!state) return;
    setBusy(true);
    setError(null);
    try {
      const res = await setProjectGalleryListed(project.slug, !state.listed);
      setLoad({ status: 'ready', state: { ...state, listed: res.listed, listedAt: res.listedAt } });
      onClose();
    } catch (err) {
      setError(galleryErrorText(err instanceof Error ? err.message : String(err)));
      setBusy(false);
    }
  };

  const listed = state?.listed ?? false;
  return (
    <Dialog
      open
      onClose={onClose}
      title={listed ? 'Remove from the gallery?' : 'Publish to the gallery'}
      description={listed
        ? 'The project leaves the public gallery. Its link keeps working.'
        : 'Anyone can find it in the public gallery, open it and remix it.'}
      testId="gallery-project-dialog"
      footer={(
        <>
          <Button onClick={onClose} className="max-md:h-touch">{blocker ? 'Close' : 'Cancel'}</Button>
          {state && !blocker && (
            <Button variant={listed ? 'secondary' : 'primary'} onClick={() => void toggle()} loading={busy} className="max-md:h-touch">
              {listed ? 'Remove from gallery' : 'Publish'}
            </Button>
          )}
        </>
      )}
    >
      <div aria-live="polite" className="text-ui text-fg-2">
        {load.status === 'loading' && <p>Checking whether it can be published…</p>}
        {load.status === 'error' && <p className="text-danger">Could not check the gallery status. Try again later.</p>}
        {blocker && <p className="text-fg">{blocker}</p>}
      </div>
      <ErrorLine text={error} />
    </Dialog>
  );
}
