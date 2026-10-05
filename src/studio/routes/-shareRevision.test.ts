// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it } from 'vitest';
import type { ProjectRow } from '../../funnel/lib/apiClient';
import {
  isHistoricalPin,
  readRequestedVersion,
  revisionTitleFromSource,
  shareProjectView,
} from './-shareRevision';

const row = (version: number, title: string): ProjectRow => ({
  id: 'p',
  slug: 'V4P2zJTm',
  title,
  privacy: 'public_unlisted',
  current_code: 'latest();',
  parameters: [],
  version,
  updated_at: '2026-10-05T22:47:21.000Z',
  owner_id: null,
});

describe('readRequestedVersion', () => {
  it('reads a positive pin and ignores anything else', () => {
    expect(readRequestedVersion('?version=1')).toBe(1);
    expect(readRequestedVersion('version=6&view=studio')).toBe(6);
    expect(readRequestedVersion('')).toBeNull();
    expect(readRequestedVersion('?version=0')).toBeNull();
    expect(readRequestedVersion('?version=nope')).toBeNull();
  });
});

describe('revisionTitleFromSource', () => {
  it('uses the first sentence of the leading comment', () => {
    const code = `// Compact GT2 belt-driven rotary actuator. Cord + rounded nubs are a
// clearance loop, NOT tooth mesh.
const length = 80;
`;
    expect(revisionTitleFromSource(code)).toBe('Compact GT2 belt-driven rotary actuator');
  });
});

describe('shareProjectView', () => {
  it('keeps the saved title when the link is the current revision', () => {
    const project = row(6, 'T-slot frame corner — two rails');
    expect(shareProjectView(project, 6, null)).toBe(project);
    expect(shareProjectView(project, null, null)).toBe(project);
    expect(isHistoricalPin(project, 1)).toBe(true);
    expect(isHistoricalPin(project, 6)).toBe(false);
  });

  it('shows an older revision’s source, title and revision label', () => {
    const project = row(6, 'T-slot frame corner — two rails');
    const view = shareProjectView(project, 1, {
      version: 1,
      code: '// Compact GT2 belt-driven rotary actuator. Not a transmission.\nconst x = 1;\n',
      parameters: [],
      createdAt: '2026-10-05T22:39:10.000Z',
    });
    expect(view.title).toBe('Compact GT2 belt-driven rotary actuator');
    expect(view.version).toBe(1);
    expect(view.current_code).toContain('GT2');
    expect(view.updated_at).toBe('2026-10-05T22:39:10.000Z');
  });
});
