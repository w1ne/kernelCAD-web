// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { createFileRoute } from '@tanstack/react-router';
import { GalleryView } from './-GalleryView';

// Public community gallery; kernelcad.com/gallery redirects here.
export const Route = createFileRoute('/gallery')({
  component: GalleryView,
});
