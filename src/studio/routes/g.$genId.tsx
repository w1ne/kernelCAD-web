import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/g/$genId')({
  component: () => <div className="p-8 text-neutral-400">Loading generation… (Task 4 fills this in)</div>,
});
