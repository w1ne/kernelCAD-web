import { useEffect } from 'react';
import type { FeatureEvent } from '../../compute/featureEvents';

export interface DemoPlayerWindow {
  isFrameReady(): boolean;
  onEvent(event: FeatureEvent): void;
  setRotatePhase(durationMs: number): void;
}

declare global {
  interface Window {
    __demoPlayer?: DemoPlayerWindow;
  }
}

export function DemoPlayerPage(): React.JSX.Element {
  useEffect(() => {
    // Minimal driver API stub; sub-tasks fill behavior.
    window.__demoPlayer = {
      isFrameReady: () => true,
      onEvent: () => {},
      setRotatePhase: () => {},
    };
    return () => {
      delete window.__demoPlayer;
    };
  }, []);

  return (
    <div
      data-testid="demo-player"
      style={{
        position: 'fixed',
        inset: 0,
        background: '#000',
        color: '#fff',
        fontFamily: 'JetBrains Mono, monospace',
      }}
    >
      <div style={{ padding: 16 }}>demo-player ready</div>
    </div>
  );
}
