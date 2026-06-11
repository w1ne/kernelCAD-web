// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, it, expect } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadSnippets } from './loader';

function makeFixture(files: Record<string, string>): { rootDir: string; tagsPath: string } {
  const root = mkdtempSync(join(tmpdir(), 'cookbook-'));
  mkdirSync(join(root, 'snippets'), { recursive: true });
  writeFileSync(join(root, 'tags.json'), JSON.stringify(['fillet', 'subtract', 'face-ref', 'edge-features', 'boolean']));
  for (const [name, content] of Object.entries(files)) {
    writeFileSync(join(root, 'snippets', name), content);
  }
  return { rootDir: join(root, 'snippets'), tagsPath: join(root, 'tags.json') };
}

const goodSnippet = `---
id: fillet-face-after-subtract
title: Fillet only the top face after subtract
tags: [fillet, subtract, face-ref]
keywords:
  - round the rim of a hole
  - fillet the top edge after cutting
when_to_use: After subtracting a hole or pocket, you want to round only the rim.
---

\`\`\`typescript
return box(50, 50, 8).subtract(cylinder(10, 6).translate(25, 25, -1)).fillet(1.5, { face: 'top' });
\`\`\`
`;

describe('loadSnippets', () => {
  it('parses a well-formed snippet', () => {
    const { rootDir, tagsPath } = makeFixture({ 'fillet-face-after-subtract.md': goodSnippet });
    const snippets = loadSnippets(rootDir, tagsPath);
    expect(snippets).toHaveLength(1);
    const s = snippets[0];
    expect(s.id).toBe('fillet-face-after-subtract');
    expect(s.title).toBe('Fillet only the top face after subtract');
    expect(s.tags).toEqual(['fillet', 'subtract', 'face-ref']);
    expect(s.keywords).toContain('round the rim of a hole');
    expect(s.when_to_use).toMatch(/^After subtracting/);
    expect(s.body).toMatch(/return box\(50, 50, 8\)/);
    expect(s.body).not.toContain('```');
  });

  it('rejects snippets whose filename does not match the id', () => {
    const { rootDir, tagsPath } = makeFixture({ 'wrong-name.md': goodSnippet });
    expect(() => loadSnippets(rootDir, tagsPath)).toThrow(/filename.*id/i);
  });

  it('rejects snippets with unknown tags', () => {
    const bad = goodSnippet.replace('tags: [fillet, subtract, face-ref]', 'tags: [fillet, mystery]');
    const { rootDir, tagsPath } = makeFixture({ 'fillet-face-after-subtract.md': bad });
    expect(() => loadSnippets(rootDir, tagsPath)).toThrow(/unknown tag.*mystery/i);
  });

  it('rejects snippets without a body code fence', () => {
    const bad = goodSnippet.replace(/```typescript[\s\S]*```/, 'just prose, no fence');
    const { rootDir, tagsPath } = makeFixture({ 'fillet-face-after-subtract.md': bad });
    expect(() => loadSnippets(rootDir, tagsPath)).toThrow(/code fence/i);
  });

  it('rejects snippets with two code fences', () => {
    const bad = goodSnippet.replace(/```\n$/, "```\n\n```typescript\nreturn cylinder(1,1);\n```\n");
    const { rootDir, tagsPath } = makeFixture({ 'fillet-face-after-subtract.md': bad });
    expect(() => loadSnippets(rootDir, tagsPath)).toThrow(/exactly one.*fence/i);
  });

  it('rejects snippets missing frontmatter', () => {
    const { rootDir, tagsPath } = makeFixture({ 'naked.md': '```typescript\nreturn box(1,1,1);\n```' });
    expect(() => loadSnippets(rootDir, tagsPath)).toThrow(/frontmatter/i);
  });

  it('returns snippets sorted by id (alphabetical, stable)', () => {
    const a = goodSnippet
      .replace('id: fillet-face-after-subtract', 'id: alpha-snippet')
      .replace('title: Fillet only the top face after subtract', 'title: Alpha');
    const b = goodSnippet
      .replace('id: fillet-face-after-subtract', 'id: beta-snippet')
      .replace('title: Fillet only the top face after subtract', 'title: Beta');
    const { rootDir, tagsPath } = makeFixture({ 'beta-snippet.md': b, 'alpha-snippet.md': a });
    const snippets = loadSnippets(rootDir, tagsPath);
    expect(snippets.map((s) => s.id)).toEqual(['alpha-snippet', 'beta-snippet']);
  });
});
