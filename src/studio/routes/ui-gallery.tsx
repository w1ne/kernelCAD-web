// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { createFileRoute } from '@tanstack/react-router';
import { Suspense, lazy } from 'react';

// Design review page for the shared src/ui primitives. Dev builds show it at
// /ui-gallery; production needs ?ui=gallery so visitors never land on it.
const UiGallery = lazy(() => import('../../ui/gallery/UiGallery').then((m) => ({ default: m.UiGallery })));

function galleryEnabled(): boolean {
    if (import.meta.env.DEV) return true;
    if (typeof window === 'undefined') return false;
    return new URLSearchParams(window.location.search).get('ui') === 'gallery';
}

export const Route = createFileRoute('/ui-gallery')({
    component: UiGalleryPage,
});

function UiGalleryPage() {
    if (!galleryEnabled()) {
        return (
            <main className="flex min-h-screen items-center justify-center bg-bg font-sans text-fg">
                <p className="text-body text-fg-2">Not found.</p>
            </main>
        );
    }
    return (
        <Suspense fallback={null}>
            <UiGallery />
        </Suspense>
    );
}
