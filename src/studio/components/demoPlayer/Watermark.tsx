import React from 'react';

export function Watermark({ version }: { version: string }): React.JSX.Element {
  return (
    <div
      style={{
        position: 'absolute',
        bottom: 12,
        right: 16,
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: 14,
        color: 'rgba(255,255,255,0.6)',
        pointerEvents: 'none',
        userSelect: 'none',
        zIndex: 10,
      }}
    >
      kernelCAD {version}
    </div>
  );
}
