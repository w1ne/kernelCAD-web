import React, { useEffect, useState } from 'react';
import { defaultCode, executeCode, init as initEngine, type GeometryResult } from './lib/geometryEngine';
import { exportSTEP, exportSTL } from './lib/geometryExports';
import CodeEditor from './components/Editor';
import Viewer from './components/Viewer';
import { Loader2, AlertCircle, Download, FileDown } from 'lucide-react';




function App() {
  const [code, setCode] = useState(defaultCode);
  const [geometries, setGeometries] = useState<GeometryResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isComputing, setIsComputing] = useState(false);

  useEffect(() => {
    initEngine().then(() => setIsReady(true));
  }, []);

  useEffect(() => {
    if (!isReady) return;

    const run = async () => {
      setIsComputing(true);
      try {
        const shapes = await executeCode(code);
        setGeometries(shapes);
        setError(null);
      } catch (err: unknown) {
        console.error(err);
        const message = err instanceof Error ? err.message : String(err);
        setError(message || "Unknown error");
      } finally {
        setIsComputing(false);
      }
    };

    // Simple debounce
    const timer = setTimeout(run, 600);
    return () => clearTimeout(timer);
  }, [code, isReady]);

  const handleExport = async (type: 'step' | 'stl') => {
    try {
      let blob: Blob;
      if (type === 'step') {
        blob = await exportSTEP(code);
      } else {
        blob = await exportSTL(code);
      }

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `model.${type}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      setError("Export failed: " + (err instanceof Error ? err.message : String(err)));
    }
  };

  if (!isReady) {
    return (
      <div className="w-screen h-screen flex items-center justify-center bg-black text-white">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="animate-spin" />
          <span>Initializing Kernel...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex w-screen h-screen bg-black text-white font-sans overflow-hidden">
      {/* Left Pane: Editor */}
      <div className="w-[40%] h-full flex flex-col border-r border-[#333]">
        <div className="h-10 bg-[#111] border-b border-[#333] flex items-center px-4 justify-between select-none">
          <span className="text-sm font-medium text-gray-300 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-500"></span>
            script.js
          </span>

          <div className="flex gap-2">
            <button
              onClick={() => handleExport('step')}
              disabled={isComputing}
              className="p-1 hover:bg-[#333] rounded text-gray-400 hover:text-white transition-colors"
              title="Export STEP"
            >
              <FileDown className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleExport('stl')}
              disabled={isComputing}
              className="p-1 hover:bg-[#333] rounded text-gray-400 hover:text-white transition-colors"
              title="Export STL"
            >
              <Download className="w-4 h-4" />
            </button>
            {isComputing && <Loader2 className="w-3 h-3 animate-spin text-gray-500" />}
          </div>
        </div>

        <div className="flex-1 relative overflow-hidden">
          <CodeEditor value={code} onChange={(v) => setCode(v || '')} />

          {/* Error Toast */}
          {error && (
            <div className="absolute bottom-4 left-4 right-4 bg-red-900/90 text-red-100 p-3 rounded-lg border border-red-700/50 shadow-xl backdrop-blur-md text-xs font-mono flex gap-2 items-start">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <pre className="whitespace-pre-wrap">{error}</pre>
            </div>
          )}
        </div>
      </div>

      {/* Right Pane: 3D Viewport */}
      <div className="w-[60%] h-full relative bg-[#0a0a0a]">
        <Viewer geometries={geometries} />
      </div>
    </div>
  );
}

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

export default function AppWrapper() {
  return (
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  )
}

