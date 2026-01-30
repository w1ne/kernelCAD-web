import { WorkbenchProvider } from './context/WorkbenchContext';
import { WorkbenchLayout } from './components/Layout/WorkbenchLayout';
import { ErrorBoundary } from './components/ErrorBoundary';

export default function App() {
  return (
    <WorkbenchProvider>
      <ErrorBoundary>
        <WorkbenchLayout />
      </ErrorBoundary>
    </WorkbenchProvider>
  );
}
