import { createFileRoute } from '@tanstack/react-router';
import App from '../App';

export const Route = createFileRoute('/studio')({
  component: StudioRoute,
});

function StudioRoute() {
  return <App />;
}
