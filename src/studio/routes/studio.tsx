// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { createFileRoute } from '@tanstack/react-router';
import App from '../App';

export const Route = createFileRoute('/studio')({
  component: StudioRoute,
});

// Open to anonymous users; the cost-bearing agent is gated inside StudioShell.
function StudioRoute() {
  return <App />;
}
