// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useOptionalSession } from '../funnel/hooks/useSession';
import { saveProject } from '../funnel/lib/apiClient';

/** Owns the toolbar's "Publish & Share" flow: sign-in gate, save, clipboard
 *  copy, and the transient success/error state. */
export function usePublishAction(code: string, projectName: string | undefined) {
    const { session } = useOptionalSession();
    const navigate = useNavigate();
    const [publishState, setPublishState] = useState<'idle' | 'saving' | 'done' | 'error'>('idle');
    const [publishedLink, setPublishedLink] = useState<string | null>(null);

    async function handlePublish() {
        if (!session) {
            void navigate({ to: '/signin', search: { next: window.location.pathname } });
            return;
        }
        setPublishState('saving');
        setPublishedLink(null);
        try {
            const title = projectName?.slice(0, 60) || code.slice(0, 60) || 'Untitled';
            const result = await saveProject({
                title,
                code,
                parameters: [],
                privacy: 'public_unlisted',
            });
            const link = `${window.location.origin}/p/${result.slug}`;
            await navigator.clipboard.writeText(link).catch(() => {});
            setPublishedLink(link);
            setPublishState('done');
            window.setTimeout(() => {
                setPublishState('idle');
                setPublishedLink(null);
            }, 4000);
        } catch {
            setPublishState('error');
        }
    }

    return { session, publishState, publishedLink, handlePublish };
}
