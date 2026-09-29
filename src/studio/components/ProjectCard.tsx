// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// One project as a card: render, title, a meta line and actions. Used by
// "Your projects" (/me); the gallery uses the same card.
import { useId, useState, type JSX, type ReactNode } from 'react';
import { Box, Check, Lock, MessageSquareText, MoreHorizontal } from 'lucide-react';
import { Button, IconButton, Menu, cx, type MenuEntry } from '../../ui';
import { projectHref, resumePrompt, type ProjectRef } from './projectCardModel';
import { useCopyText } from './useCopyText';

export interface ProjectCardProps {
    readonly slug: string;
    readonly title: string;
    /** Render image; null (or a failed load) shows the placeholder. */
    readonly renderUrl: string | null;
    /** Placeholder text when there is no render. */
    readonly placeholder?: 'none' | 'private';
    /** Small line under the title: badges, time, revision count. */
    readonly meta?: ReactNode;
    /** Buttons at the bottom of the card. */
    readonly actions?: ReactNode;
    /** Entries of the ⋯ menu; no menu when empty. */
    readonly menu?: readonly MenuEntry[];
    /** Dims the card while a rename, delete or privacy change runs. */
    readonly busy?: boolean;
    readonly testId?: string;
}

export function ProjectCard({
    slug,
    title,
    renderUrl,
    placeholder = 'none',
    meta,
    actions,
    menu,
    busy,
    testId,
}: ProjectCardProps): JSX.Element {
    const titleId = useId();
    const href = projectHref(slug);
    const name = title.trim() || 'Untitled';
    return (
        <article
            aria-labelledby={titleId}
            aria-busy={busy || undefined}
            data-testid={testId}
            data-slug={slug}
            className={cx(
                'group flex w-full min-w-0 flex-col overflow-hidden rounded-panel border border-border bg-surface-1 transition-[border-color,box-shadow,opacity] duration-80',
                'hover:border-border-strong hover:shadow-e1',
                busy && 'pointer-events-none opacity-60',
            )}
        >
            {/* The image repeats the title link; keep it out of the tab order. */}
            <a href={href} tabIndex={-1} aria-hidden="true" className="relative block aspect-[16/10] overflow-hidden bg-surface-2 sm:aspect-[4/3]">
                <ProjectRender url={renderUrl} placeholder={placeholder} />
            </a>
            <div className="flex flex-1 flex-col gap-1.5 p-4">
                <div className="flex items-start justify-between gap-2">
                    <h3 id={titleId} className="min-w-0 text-body font-medium text-fg">
                        <a href={href} className="focus-ring line-clamp-2 break-words rounded-control no-underline hover:underline">
                            {name}
                        </a>
                    </h3>
                    {menu && menu.length > 0 && (
                        <Menu
                            items={menu}
                            align="end"
                            label={`Actions for ${name}`}
                            trigger={(props) => (
                                <IconButton
                                    {...props}
                                    label="More actions"
                                    icon={<MoreHorizontal className="size-4" strokeWidth={1.75} />}
                                    className="-mr-2 -mt-1 shrink-0 max-md:size-touch"
                                />
                            )}
                        />
                    )}
                </div>
                {meta && <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-2xs text-fg-3">{meta}</div>}
                {actions && <div className="mt-auto flex flex-wrap items-center gap-2 pt-3">{actions}</div>}
            </div>
        </article>
    );
}

function ProjectRender({ url, placeholder }: { readonly url: string | null; readonly placeholder: 'none' | 'private' }): JSX.Element {
    const [failed, setFailed] = useState<string | null>(null);
    if (url && failed !== url) {
        return (
            <img
                src={url}
                alt=""
                loading="lazy"
                decoding="async"
                onError={() => setFailed(url)}
                className="size-full object-cover transition-transform duration-160 group-hover:scale-[1.02] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
            />
        );
    }
    const isPrivate = placeholder === 'private';
    return (
        <div className="flex size-full flex-col items-center justify-center gap-2 bg-[radial-gradient(var(--kc-border)_1px,transparent_1px)] bg-[length:16px_16px] text-fg-3">
            {isPrivate ? <Lock className="size-6" strokeWidth={1.5} /> : <Box className="size-6" strokeWidth={1.5} />}
            <span className="text-2xs">{isPrivate ? 'Private: no preview' : 'No preview yet'}</span>
        </div>
    );
}

/** Link-styled "Open" action: the card's primary action. */
export function OpenProjectButton({ slug, label = 'Open' }: { readonly slug: string; readonly label?: string }): JSX.Element {
    return (
        <a
            href={projectHref(slug)}
            className="focus-ring inline-flex h-control-md items-center justify-center rounded-control bg-accent px-3 text-ui font-medium text-on-accent no-underline transition-colors duration-80 hover:bg-accent-hover max-md:h-touch max-md:px-4"
        >
            {label}
        </a>
    );
}

/** Copies the resume prompt for the user's chat agent. */
export function CopyResumePromptButton({
    project,
    compact,
}: {
    readonly project: ProjectRef;
    /** Short label ("Copy prompt") for narrow rows. */
    readonly compact?: boolean;
}): JSX.Element {
    const { state, copy } = useCopyText();
    const label = state === 'copied' ? 'Copied' : state === 'failed' ? 'Copy failed' : compact ? 'Copy prompt' : 'Copy resume prompt';
    return (
        <Button
            variant="ghost"
            onClick={() => void copy(resumePrompt(project))}
            leadingIcon={state === 'copied'
                ? <Check className="size-4 text-ok" strokeWidth={1.75} aria-hidden="true" />
                : <MessageSquareText className="size-4" strokeWidth={1.75} aria-hidden="true" />}
            title="Copy a prompt to paste into your chat agent. It continues this project."
            className="max-md:h-touch"
            data-testid="copy-resume-prompt"
        >
            <span aria-live="polite">{label}</span>
        </Button>
    );
}
