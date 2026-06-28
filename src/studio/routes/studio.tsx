// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { createFileRoute } from '@tanstack/react-router';
import App from '../App';
import { StudioAuthGate } from '../StudioAuthGate';

export const Route = createFileRoute('/studio')({
  component: StudioRoute,
});

function StudioRoute() {
  return (
    <StudioAuthGate>
      <App />
    </StudioAuthGate>
  );
}
