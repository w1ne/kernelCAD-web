// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/render-player/components/MassPropertiesPanel.tsx
//
// Compact Properties readout for the one selected solid or assembly part.
// The hosted Inspector mounts this with the current selection ids. This
// repository does not contain the Studio shell (src/studio is outside the
// public kernel boundary), so the panel is a leaf the shell can render.
import type { CSSProperties, JSX } from 'react';
import { massReadoutForIds, type MassTarget } from '../../kinematic/massReadout';

export interface MassPropertiesPanelProps {
  readonly selectedIds: readonly string[];
  readonly resolve: (id: string) => MassTarget | undefined;
}

const text: CSSProperties = {
  margin: 0,
  color: 'var(--color-fg)',
  font: '12px/1.45 ui-sans-serif, system-ui, sans-serif',
};

/**
 * Mass, center of mass, principal moments, and volume for a single selection.
 * No selection, several selections, or a non-solid render an empty sentence.
 */
export function MassPropertiesPanel({ selectedIds, resolve }: MassPropertiesPanelProps): JSX.Element {
  const readout = massReadoutForIds(selectedIds, resolve);
  if (readout.status !== 'ready') {
    return (
      <p data-testid="mass-properties-empty" style={{ ...text, color: 'var(--color-fg-3)' }}>
        {readout.message}
      </p>
    );
  }

  return (
    <section data-testid="mass-properties-panel" aria-label={`Properties for ${readout.label}`} style={text}>
      <h2 style={{ margin: '0 0 6px', fontSize: 12, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
        Properties
      </h2>
      <p style={{ margin: '0 0 8px' }}>{readout.label}</p>
      {readout.densityDefaulted && readout.warning !== undefined ? (
        <p
          data-testid="mass-properties-water-default"
          role="note"
          style={{
            margin: '0 0 8px',
            padding: '6px 8px',
            border: '1px solid var(--color-warn)',
            borderRadius: 4,
            background: 'var(--color-warn-soft)',
            color: 'var(--color-warn)',
          }}
        >
          {readout.warning}
        </p>
      ) : null}
      <dl style={{ margin: 0, display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '4px 10px' }}>
        {readout.lines.map((line) => (
          <div
            key={line.id}
            data-testid={`mass-properties-${line.id}`}
            data-flag={line.flag}
            style={{ display: 'contents', color: line.flag === 'water-default' ? 'var(--color-warn)' : undefined }}
          >
            <dt style={{ color: 'var(--color-fg-3)' }}>{line.label}</dt>
            <dd style={{ margin: 0, fontVariantNumeric: 'tabular-nums' }}>{line.value}</dd>
          </div>
        ))}
      </dl>
      <details data-testid="mass-properties-tensor" style={{ marginTop: 8 }}>
        <summary>Inertia tensor</summary>
        <p style={{ margin: '4px 0 0', fontVariantNumeric: 'tabular-nums' }}>{readout.inertiaTensorText}</p>
      </details>
    </section>
  );
}
