import { createFileRoute } from '@tanstack/react-router';
import { DemoPlayerPage } from '../components/demoPlayer/DemoPlayerPage';

export const Route = createFileRoute('/demo-player')({
  component: DemoPlayerRoute,
});

function DemoPlayerRoute() {
  return <DemoPlayerPage />;
}
