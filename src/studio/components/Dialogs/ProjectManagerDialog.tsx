// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// The Studio project switcher (opened from the project name in the header):
// the signed-in user's recent saved projects, the projects stored in this
// browser, and "New project".
import { useEffect, useId, useState, type ReactNode } from 'react';
import { ArrowRight, Box, Check, Link2, Lock, Pencil, Plus, Search, Trash2, X } from 'lucide-react';
import { Button, Dialog, IconButton, SkeletonList, cx } from '../../../ui';
import { useProject } from '../../context/ProjectContext';
import { useOptionalSession } from '../../../funnel/hooks/useSession';
import { isAuthConfigured } from '../../../funnel/lib/supabaseClient';
import { listMyProjects, type MyProjectRow } from '../../../funnel/lib/apiClient';
import type { ProjectMetadata } from '../../../authoring/projectService';
import { privacyKind, projectHref, projectRenderUrl, relativeTime, revisionsText } from '../projectCardModel';
import { filterProjects } from '../../routes/-meProjects';

interface ProjectManagerDialogProps {
    isOpen: boolean;
    onClose: () => void;
}

/** How many saved projects the switcher lists; the rest are on /me. */
export const SWITCHER_RECENT_LIMIT = 8;

const ROW = 'flex min-h-11 w-full min-w-0 items-center gap-3 rounded-control px-2 py-1.5 text-left text-fg no-underline transition-colors duration-80 hover:bg-surface-2 focus-ring';

function currentSlug(): string | null {
    if (typeof window === 'undefined') return null;
    const m = /^\/p\/([^/]+)/.exec(window.location.pathname);
    return m ? decodeURIComponent(m[1]) : null;
}

function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
    return (
        <div className="mb-1 mt-4 flex items-center justify-between gap-2 px-2 first:mt-0">
            <h3 className="text-2xs font-medium uppercase tracking-wide text-fg-3">{children}</h3>
            {action}
        </div>
    );
}

type Saved = { status: 'loading' } | { status: 'error' } | { status: 'ready'; rows: MyProjectRow[] };

function useSavedProjects(enabled: boolean): { saved: Saved; retry: () => void } {
    const [saved, setSaved] = useState<Saved>({ status: 'loading' });
    const [attempt, setAttempt] = useState(0);
    useEffect(() => {
        if (!enabled) return;
        let cancelled = false;
        listMyProjects({ limit: SWITCHER_RECENT_LIMIT })
            .then((rows) => { if (!cancelled) setSaved({ status: 'ready', rows }); })
            .catch(() => { if (!cancelled) setSaved({ status: 'error' }); });
        return () => { cancelled = true; };
    }, [enabled, attempt]);
    return {
        saved,
        retry: () => {
            setSaved({ status: 'loading' });
            setAttempt((a) => a + 1);
        },
    };
}

function SavedRow({ project, active }: { project: MyProjectRow; active: boolean }) {
    const isPrivate = privacyKind(project.privacy) === 'private';
    const [imgFailed, setImgFailed] = useState(false);
    return (
        <li>
            <a
                href={projectHref(project.slug)}
                aria-current={active ? 'page' : undefined}
                className={cx(ROW, active && 'bg-accent-soft hover:bg-accent-soft')}
                data-testid="switcher-saved-project"
            >
                <span aria-hidden="true" className="relative flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-control bg-surface-2 text-fg-3">
                    {isPrivate ? <Lock className="size-4" strokeWidth={1.5} /> : <Box className="size-4" strokeWidth={1.5} />}
                    {!isPrivate && !imgFailed && (
                        <img
                            src={projectRenderUrl(project.slug, project.updated_at)}
                            alt=""
                            loading="lazy"
                            onError={() => setImgFailed(true)}
                            className="absolute inset-0 size-full object-cover"
                        />
                    )}
                </span>
                <span className="min-w-0 flex-1">
                    <span className="block truncate text-ui font-medium">{project.title || 'Untitled'}</span>
                    <span className="flex items-center gap-1 text-2xs text-fg-3">
                        {isPrivate ? <Lock className="size-3" aria-label="Private" /> : <Link2 className="size-3" aria-label="Public by link" />}
                        {relativeTime(project.updated_at)} · {revisionsText(project.version)}
                    </span>
                </span>
                {active && <span className="shrink-0 text-2xs font-medium text-accent">Open now</span>}
            </a>
        </li>
    );
}

function SavedProjects({ query }: { query: string }) {
    const { session, loading } = useOptionalSession();
    const { saved, retry } = useSavedProjects(!!session);
    const slug = currentSlug();

    if (!isAuthConfigured() || loading) return null;
    const allLink = (
        <a href="/me" className="focus-ring inline-flex items-center gap-1 rounded-control text-2xs font-medium text-accent no-underline hover:underline">
            All projects <ArrowRight className="size-3" aria-hidden="true" />
        </a>
    );
    if (!session) {
        const next = typeof window === 'undefined' ? '/me' : window.location.pathname + window.location.search;
        return (
            <section aria-label="Saved projects">
                <SectionTitle>Saved projects</SectionTitle>
                <p className="px-2 text-ui text-fg-2">
                    <a href={`/signin?next=${encodeURIComponent(next)}`} className="text-accent underline">Sign in</a>{' '}
                    to see the projects you and your agent saved.
                </p>
            </section>
        );
    }
    const rows = saved.status === 'ready' ? filterProjects(saved.rows, query) : [];
    return (
        <section aria-label="Saved projects">
            <SectionTitle action={allLink}>Saved projects</SectionTitle>
            {saved.status === 'loading' && <SkeletonList rows={3} label="Loading saved projects" className="px-2 py-1" />}
            {saved.status === 'error' && (
                <p role="alert" className="flex items-center gap-2 px-2 text-ui text-danger">
                    Could not load your saved projects.
                    <Button size="sm" variant="ghost" onClick={retry}>Retry</Button>
                </p>
            )}
            {saved.status === 'ready' && saved.rows.length === 0 && (
                <p className="px-2 text-ui text-fg-2">Nothing saved yet. Projects your agent saves show up here.</p>
            )}
            {saved.status === 'ready' && saved.rows.length > 0 && rows.length === 0 && (
                <p className="px-2 text-ui text-fg-2">No saved project matches.</p>
            )}
            {rows.length > 0 && (
                <ul className="flex flex-col gap-0.5">
                    {rows.map((p) => <SavedRow key={p.id} project={p} active={p.slug === slug} />)}
                </ul>
            )}
        </section>
    );
}

interface LocalRowProps {
    project: ProjectMetadata;
    active: boolean;
    onOpen: () => void;
    onRename: ((name: string) => void) | null;
    onDelete: () => void;
}

function LocalRow({ project, active, onOpen, onRename, onDelete }: LocalRowProps) {
    const [mode, setMode] = useState<'view' | 'rename' | 'confirm-delete'>('view');
    const [name, setName] = useState(project.name);
    const inputId = useId();

    if (mode === 'rename' && onRename) {
        const save = () => {
            if (name.trim()) onRename(name.trim());
            setMode('view');
        };
        return (
            <li className="flex items-center gap-2 px-2 py-1">
                <label htmlFor={inputId} className="sr-only">Project name</label>
                <input
                    id={inputId}
                    autoFocus
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') save();
                        if (e.key === 'Escape') { e.stopPropagation(); setMode('view'); }
                    }}
                    className="focus-ring h-control-md min-w-0 flex-1 rounded-control border border-border-strong bg-surface-1 px-2 text-ui text-fg"
                />
                <IconButton label="Save name" icon={<Check className="size-4" />} onClick={save} />
                <IconButton label="Cancel" icon={<X className="size-4" />} onClick={() => setMode('view')} />
            </li>
        );
    }
    if (mode === 'confirm-delete') {
        return (
            <li className="flex flex-wrap items-center gap-2 rounded-control bg-danger-soft px-2 py-1.5" role="group" aria-label={`Delete ${project.name}?`}>
                <span className="min-w-0 flex-1 truncate text-ui text-fg">Delete “{project.name}” from this browser?</span>
                <Button size="sm" onClick={() => setMode('view')} autoFocus>Keep</Button>
                <Button size="sm" variant="danger" onClick={onDelete}>Delete</Button>
            </li>
        );
    }
    return (
        <li className="group flex items-center gap-1">
            <button type="button" onClick={onOpen} aria-current={active ? 'true' : undefined} className={cx(ROW, 'flex-1', active && 'bg-accent-soft hover:bg-accent-soft')}>
                <span className="min-w-0 flex-1">
                    <span className="block truncate text-ui font-medium">{project.name}</span>
                    <span className="block text-2xs text-fg-3">{relativeTime(project.lastUpdated)}</span>
                </span>
                {active && <span className="shrink-0 text-2xs font-medium text-accent">Open now</span>}
            </button>
            {onRename && (
                <IconButton label="Rename" icon={<Pencil className="size-4" strokeWidth={1.75} />} onClick={() => setMode('rename')} />
            )}
            <IconButton label="Delete" icon={<Trash2 className="size-4" strokeWidth={1.75} />} onClick={() => setMode('confirm-delete')} />
        </li>
    );
}

function LocalProjects({ query, onClose }: { query: string; onClose: () => void }) {
    const { projects, activeProjectId, openProject, deleteProject, renameActiveProject } = useProject();
    const q = query.trim().toLowerCase();
    const rows = [...projects]
        .sort((a, b) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime())
        .filter((p) => !q || p.name.toLowerCase().includes(q));
    if (projects.length === 0) return null;
    return (
        <section aria-label="In this browser">
            <SectionTitle>In this browser</SectionTitle>
            {rows.length === 0 && <p className="px-2 text-ui text-fg-2">No project in this browser matches.</p>}
            <ul className="flex flex-col gap-0.5">
                {rows.map((p) => (
                    <LocalRow
                        key={p.id}
                        project={p}
                        active={p.id === activeProjectId}
                        onOpen={() => { openProject(p.id); onClose(); }}
                        // The context renames the active project only.
                        onRename={p.id === activeProjectId ? renameActiveProject : null}
                        onDelete={() => deleteProject(p.id)}
                    />
                ))}
            </ul>
        </section>
    );
}

export default function ProjectManagerDialog({ isOpen, onClose }: ProjectManagerDialogProps) {
    const { createProject } = useProject();
    const [query, setQuery] = useState('');
    const searchId = useId();

    return (
        <Dialog
            open={isOpen}
            onClose={onClose}
            title="Projects"
            theme="dark"
            width={560}
            testId="project-switcher"
            footer={(
                <>
                    <a href="/me" className="focus-ring mr-auto inline-flex min-h-11 items-center rounded-control text-ui text-fg-2 no-underline hover:text-fg md:min-h-0">Manage all projects</a>
                    <Button
                        variant="primary"
                        className="max-md:h-touch"
                        leadingIcon={<Plus className="size-4" strokeWidth={2} aria-hidden="true" />}
                        onClick={() => { createProject(); onClose(); }}
                    >
                        New project
                    </Button>
                </>
            )}
        >
            <div className="relative">
                <label htmlFor={searchId} className="sr-only">Search projects</label>
                <Search aria-hidden="true" className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-fg-3" strokeWidth={1.75} />
                <input
                    id={searchId}
                    type="search"
                    data-autofocus
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search projects"
                    className="focus-ring h-control-lg w-full rounded-control border border-border-strong bg-surface-2 pl-8 pr-2 text-ui text-fg placeholder:text-fg-3"
                />
            </div>
            <div className="-mx-2 mt-3 max-h-[min(52vh,480px)] overflow-y-auto px-0">
                <SavedProjects query={query} />
                <LocalProjects query={query} onClose={onClose} />
            </div>
        </Dialog>
    );
}
