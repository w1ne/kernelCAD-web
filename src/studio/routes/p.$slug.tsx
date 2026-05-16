import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/p/$slug')({
  component: () => (
    <div className="p-8 text-neutral-400">Loading project… (Task 5 fills this in)</div>
  ),
});
