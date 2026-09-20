// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { createFileRoute } from '@tanstack/react-router';
import App from '../App';
import StartPage from '../start/StartPage';
import { StudioAuthGate } from '../StudioAuthGate';

export const Route = createFileRoute('/')({
  component: StudioHome,
});

function StudioHome() {
  const query = new URLSearchParams(window.location.search);
  const hasStudioLink = ['script', 'gallery', 'headless'].some(key => query.has(key));
  if (!hasStudioLink) return <StartPage />;
  return (
    <StudioAuthGate>
      <App />
    </StudioAuthGate>
  );
}
