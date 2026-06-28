// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { createFileRoute } from '@tanstack/react-router';
import App from '../App';

export const Route = createFileRoute('/')({
  component: StudioHome,
});

// The Studio editor is open to anonymous users (viewing and hand-editing cost
// us nothing). The cost-bearing in-app agent is gated behind sign-in inside
// StudioShell; the header UserMenu offers the sign-in entry point.
function StudioHome() {
  return <App />;
}
