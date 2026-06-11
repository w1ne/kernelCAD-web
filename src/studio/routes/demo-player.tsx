// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { createFileRoute } from '@tanstack/react-router';
import { Suspense, lazy } from 'react';

const LazyDemoPlayerPage = lazy(() =>
  import('../components/demoPlayer/DemoPlayerPage').then(({ DemoPlayerPage }) => ({
    default: DemoPlayerPage,
  })),
);

export const Route = createFileRoute('/demo-player')({
  component: DemoPlayerRoute,
});

function DemoPlayerRoute() {
  return (
    <Suspense fallback={null}>
      <LazyDemoPlayerPage />
    </Suspense>
  );
}
