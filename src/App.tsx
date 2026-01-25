import { useEffect, useState } from 'react';
import { defaultCode, executeCode, init as initEngine, type GeometryResult } from './lib/geometryEngine';
import CodeEditor from './components/Editor';
import Viewer from './components/Viewer';
import { Loader2, AlertCircle } from 'lucide-react';

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
          {isComputing && <Loader2 className="w-3 h-3 animate-spin text-gray-500" />}
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

export default App;
