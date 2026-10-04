// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// "Your projects" list on /me: the Continue row, search and sort, the card
// grid, and each card's actions.
import { useId, useMemo, useState, type ReactNode } from 'react';
import { Box, EyeOff, Link2, LayoutGrid, Lock, Pencil, Search, Star, Trash2, X } from 'lucide-react';
import { Badge, Button, EmptyState, useToast, type MenuEntry } from '../../ui';
import { PRIVATE_REQUIRES_PAID, type MyProjectRow } from '../../funnel/lib/apiClient';
import {
  CopyResumePromptButton,
  OpenProjectButton,
  ProjectCard,
} from '../components/ProjectCard';
import {
  PRIVACY_LABEL,
  privacyKind,
  projectRenderUrl,
  relativeTime,
  revisionsText,
  type PrivacyKind,
} from '../components/projectCardModel';
import {
  continueProjects,
  filterProjects,
  PROJECT_SORTS,
  sortProjects,
  type ProjectSort,
} from './-meProjects';
import {
  DeleteProjectDialog,
  GalleryProjectDialog,
  RenameProjectDialog,
  type ProjectDialogKind,
} from './-MeProjectDialogs';
import type { ProjectActions } from './-useMePageData';

const PRIVACY_ICON: Record<PrivacyKind, ReactNode> = {
  private: <Lock strokeWidth={2} />,
  link: <Link2 strokeWidth={2} />,
  featured: <Star strokeWidth={2} />,
};

function PrivacyBadge({ project }: { project: MyProjectRow }): ReactNode {
  const kind = privacyKind(project.privacy);
  return (
    <Badge tone={kind === 'featured' ? 'accent' : 'neutral'} icon={PRIVACY_ICON[kind]}>
      {PRIVACY_LABEL[kind]}
    </Badge>
  );
}

function renderFor(p: MyProjectRow): string | null {
  return privacyKind(p.privacy) === 'private' ? null : projectRenderUrl(p.slug, p.updated_at);
}

/** The three most recent projects, one line each, with Open and the resume prompt. */
function ContinueRow({ projects }: { projects: MyProjectRow[] }): ReactNode {
  if (projects.length === 0) return null;
  return (
    <section aria-labelledby="me-continue" className="mt-8" data-testid="me-continue">
      <h2 id="me-continue" className="text-2xs font-medium uppercase tracking-wide text-fg-3">Continue where you left off</h2>
      <ul className="mt-3 grid gap-3 lg:grid-cols-3">
        {projects.map(p => {
          const url = renderFor(p);
          return (
            <li key={p.id} className="flex min-w-0 items-center gap-3 rounded-panel border border-border bg-surface-1 p-2.5 pr-3">
              <div aria-hidden="true" className="relative flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-control bg-surface-2 text-fg-3">
                {privacyKind(p.privacy) === 'private' ? <Lock className="size-5" strokeWidth={1.5} /> : <Box className="size-5" strokeWidth={1.5} />}
                {url && <img src={url} alt="" loading="lazy" className="absolute inset-0 size-full object-cover" onError={e => { e.currentTarget.style.display = 'none'; }} />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-ui font-medium text-fg" title={p.title}>{p.title || 'Untitled'}</p>
                <p className="mt-0.5 text-2xs text-fg-3">{relativeTime(p.updated_at)}</p>
                <div className="mt-1.5 flex flex-wrap items-center gap-1">
                  <OpenProjectButton slug={p.slug} />
                  <CopyResumePromptButton project={p} compact />
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function ListToolbar({ query, onQuery, sort, onSort, shown, total }: {
  query: string;
  onQuery: (q: string) => void;
  sort: ProjectSort;
  onSort: (s: ProjectSort) => void;
  shown: number;
  total: number;
}): ReactNode {
  const searchId = useId();
  const sortId = useId();
  return (
    <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="relative min-w-0 flex-1 sm:max-w-sm">
        <label htmlFor={searchId} className="sr-only">Search projects</label>
        <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-fg-3" strokeWidth={1.75} />
        <input
          id={searchId}
          type="search"
          value={query}
          onChange={e => onQuery(e.target.value)}
          placeholder="Search projects"
          className="focus-ring h-control-lg w-full rounded-control border border-border-strong bg-surface-1 pl-9 pr-9 text-body text-fg placeholder:text-fg-3 max-md:h-touch [&::-webkit-search-cancel-button]:hidden"
        />
        {query && (
          <button
            type="button"
            onClick={() => onQuery('')}
            aria-label="Clear search"
            className="focus-ring absolute right-1 top-1/2 inline-flex size-8 -translate-y-1/2 items-center justify-center rounded-control text-fg-3 hover:bg-surface-2 hover:text-fg"
          >
            <X className="size-4" strokeWidth={1.75} aria-hidden="true" />
          </button>
        )}
      </div>
      <div className="flex items-center justify-between gap-3 sm:ml-auto sm:justify-end">
        <p className="text-ui text-fg-3" aria-live="polite">
          {shown === total ? `${total} ${total === 1 ? 'project' : 'projects'}` : `${shown} of ${total}`}
        </p>
        <div className="flex items-center gap-2">
          <label htmlFor={sortId} className="text-ui text-fg-2">Sort</label>
          <select
            id={sortId}
            value={sort}
            onChange={e => onSort(e.target.value as ProjectSort)}
            className="focus-ring h-control-lg rounded-control border border-border-strong bg-surface-1 px-2 text-ui text-fg max-md:h-touch"
          >
            {PROJECT_SORTS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
        </div>
      </div>
    </div>
  );
}

function useCardMenu(actions: ProjectActions, open: (p: MyProjectRow, kind: ProjectDialogKind) => void) {
  const toast = useToast();
  const changePrivacy = (p: MyProjectRow, makePrivate: boolean) => {
    actions.setPrivacy(p, makePrivate ? 'private' : 'public_unlisted')
      .then(() => toast.show({
        tone: 'success',
        title: makePrivate ? 'Project is private' : 'Project is public by link',
      }))
      .catch((e: unknown) => {
        const text = e instanceof Error ? e.message : String(e);
        if (text.includes(PRIVATE_REQUIRES_PAID)) {
          toast.show({
            tone: 'error',
            title: 'Private projects need a paid plan',
            description: 'On the free plan, projects are public by link.',
            action: { label: 'See plans', onClick: () => window.location.assign('/pricing') },
          });
        } else {
          toast.show({ tone: 'error', title: 'Could not change who can see it', description: text });
        }
      });
  };
  return (p: MyProjectRow): MenuEntry[] => {
    const isPrivate = privacyKind(p.privacy) === 'private';
    return [
      { id: 'rename', label: 'Rename…', icon: <Pencil />, onSelect: () => open(p, 'rename') },
      isPrivate
        ? { id: 'privacy', label: 'Make public by link', icon: <Link2 />, onSelect: () => changePrivacy(p, false) }
        : { id: 'privacy', label: 'Make private', icon: <EyeOff />, onSelect: () => changePrivacy(p, true) },
      { id: 'gallery', label: 'Publish to gallery…', icon: <LayoutGrid />, onSelect: () => open(p, 'gallery') },
      { id: 'sep', separator: true },
      { id: 'delete', label: 'Delete…', icon: <Trash2 />, danger: true, onSelect: () => open(p, 'delete') },
    ];
  };
}

function ProjectDialogs({ dialog, actions, onClose }: {
  dialog: { project: MyProjectRow; kind: ProjectDialogKind } | null;
  actions: ProjectActions;
  onClose: () => void;
}): ReactNode {
  const toast = useToast();
  if (!dialog) return null;
  const { project, kind } = dialog;
  if (kind === 'rename') {
    return <RenameProjectDialog project={project} onClose={onClose} onRename={title => actions.rename(project, title)} />;
  }
  if (kind === 'delete') {
    const onDelete = async () => {
      await actions.remove(project);
      toast.show({ tone: 'success', title: `Deleted “${project.title || 'Untitled'}”` });
    };
    return <DeleteProjectDialog project={project} onClose={onClose} onDelete={onDelete} />;
  }
  return <GalleryProjectDialog project={project} onClose={onClose} />;
}

export function MeProjectList({ projects, actions }: { projects: MyProjectRow[]; actions: ProjectActions }): ReactNode {
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<ProjectSort>('recent');
  const [dialog, setDialog] = useState<{ project: MyProjectRow; kind: ProjectDialogKind } | null>(null);
  const menuFor = useCardMenu(actions, (project, kind) => setDialog({ project, kind }));

  const shown = useMemo(() => sortProjects(filterProjects(projects, query), sort), [projects, query, sort]);
  const recent = useMemo(() => (query ? [] : continueProjects(projects)), [projects, query]);

  return (
    <>
      <ContinueRow projects={recent} />
      <ListToolbar query={query} onQuery={setQuery} sort={sort} onSort={setSort} shown={shown.length} total={projects.length} />
      {shown.length === 0 ? (
        <EmptyState
          icon={<Search strokeWidth={1.75} />}
          title={`No projects match “${query.trim()}”`}
          description="Search looks at project names and links."
          action={<Button onClick={() => setQuery('')}>Clear search</Button>}
        />
      ) : (
        <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3" data-testid="me-project-grid">
          {shown.map(p => (
            <li key={p.id} className="flex min-w-0">
              <ProjectCard
                slug={p.slug}
                title={p.title}
                renderUrl={renderFor(p)}
                placeholder={privacyKind(p.privacy) === 'private' ? 'private' : 'none'}
                busy={actions.busyId === p.id}
                testId="me-project-card"
                meta={(
                  <>
                    <PrivacyBadge project={p} />
                    <span>
                      <time dateTime={p.updated_at} title={new Date(p.updated_at).toLocaleString()}>
                        Edited {relativeTime(p.updated_at)}
                      </time>
                      {' · '}
                      {revisionsText(p.version)}
                    </span>
                  </>
                )}
                actions={(
                  <>
                    <OpenProjectButton slug={p.slug} />
                    <CopyResumePromptButton project={p} />
                  </>
                )}
                menu={menuFor(p)}
              />
            </li>
          ))}
        </ul>
      )}
      <ProjectDialogs dialog={dialog} actions={actions} onClose={() => setDialog(null)} />
    </>
  );
}
