import React from 'react';
import { WorkbenchProvider } from './context/WorkbenchContext';
import { WorkbenchLayout } from './components/Layout/WorkbenchLayout';

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error: Error | null }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="w-screen h-screen flex items-center justify-center bg-red-900 text-white p-10">
          <div className="max-w-2xl">
            <h1 className="text-3xl font-bold mb-4">Something went wrong</h1>
            <pre className="bg-black/50 p-4 rounded overflow-auto border border-red-500">
              {this.state.error?.toString()}
              {this.state.error?.stack}
            </pre>
            <button
              onClick={() => window.location.reload()}
              className="mt-6 px-4 py-2 bg-white text-black rounded hover:bg-gray-200"
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default function App() {
  return (
    <ErrorBoundary>
      <WorkbenchProvider>
        <WorkbenchLayout />
      </WorkbenchProvider>
    </ErrorBoundary>
  );
}
