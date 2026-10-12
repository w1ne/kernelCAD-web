// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Front matter of a docs/guide/*.md page decides whether it is a blog post and
// where it goes. A wrong or missing field must stop the build with the file
// and the field, never publish a half-described post.

import { describe, it, expect } from 'vitest';
import { FrontMatterError, parseGuide } from '../../../site/scripts/blogFrontMatter';

const FILE = 'docs/guide/example.md';
const BASE = ['title: A title', 'summary: One line.', 'date: 2026-10-11', 'kind: guide'];

function source(lines: readonly string[], body = '\nThe lede.\n'): string {
  return `---\n${lines.join('\n')}\n---\n${body}`;
}

function errorOf(text: string): FrontMatterError {
  try {
    parseGuide(FILE, text);
  } catch (err) {
    if (err instanceof FrontMatterError) return err;
    throw err;
  }
  throw new Error('expected a FrontMatterError');
}

describe('parseGuide', () => {
  it('accepts opt-in meshopt only when a model is present', () => {
    expect(parseGuide(FILE,source([...BASE,'model: examples/a.kcad.ts','modelCompression: meshopt']))!.meta.modelCompression).toBe('meshopt');
    for(const lines of [['modelCompression: meshopt'],['model: examples/a.kcad.ts','modelCompression: draco']])
      expect(()=>parseGuide(FILE,source([...BASE,...lines]))).toThrow(/modelCompression/);
  });
  it('reads the required fields, the body and the line the body starts on', () => {
    const parsed = parseGuide(FILE, source(BASE));
    expect(parsed).not.toBeNull();
    expect(parsed!.meta).toEqual({
      title: 'A title',
      summary: 'One line.',
      date: '2026-10-11',
      kind: 'guide',
      status: 'published',
    });
    expect(parsed!.body).toBe('\nThe lede.\n');
    // Lines 1-6 are the fences and the four fields; the body starts on line 7.
    expect(parsed!.bodyLine).toBe(7);
    expect(parsed!.fieldLines).toEqual({ title: 2, summary: 3, date: 4, kind: 5 });
  });

  it('returns null for a page without front matter: it is not a post', () => {
    expect(parseGuide(FILE, '# A plain guide\n\nText.\n')).toBeNull();
  });

  it.each(['title', 'summary', 'date', 'kind'])('names the file and the field when %s is missing', (field) => {
    const err = errorOf(source(BASE.filter((line) => !line.startsWith(`${field}:`))));
    expect(err.file).toBe(FILE);
    expect(err.field).toBe(field);
    expect(err.message).toContain(FILE);
    expect(err.message).toContain(`"${field}"`);
  });

  it('accepts only use-case and guide as kind', () => {
    const err = errorOf(source([...BASE.slice(0, 3), 'kind: tutorial']));
    expect(err.field).toBe('kind');
    expect(err.message).toContain('use-case');
    expect(err.message).toContain('tutorial');
  });

  it('rejects an unknown key and names it', () => {
    const err = errorOf(source([...BASE, 'author: Someone']));
    expect(err.field).toBe('author');
    expect(err.message).toContain('"author"');
    expect(err.message).toContain(FILE);
  });

  it('requires model and video on a published use-case', () => {
    const useCase = [...BASE.slice(0, 3), 'kind: use-case'];
    expect(errorOf(source([...useCase, 'video: docs/demos/x/demo.mp4'])).field).toBe('model');
    expect(errorOf(source([...useCase, 'model: examples/x.kcad.ts'])).field).toBe('video');
    const ok = parseGuide(FILE, source([...useCase, 'model: examples/x.kcad.ts', 'video: docs/demos/x/demo.mp4']));
    expect(ok!.meta).toMatchObject({ kind: 'use-case', model: 'examples/x.kcad.ts', video: 'docs/demos/x/demo.mp4' });
  });

  it('lets a draft use-case leave out model and video', () => {
    const parsed = parseGuide(FILE, source([...BASE.slice(0, 3), 'kind: use-case', 'status: draft']));
    expect(parsed!.meta.status).toBe('draft');
  });

  it('keeps model on a guide and a note for reviewers', () => {
    const parsed = parseGuide(FILE, source([...BASE, 'model: examples/x.kcad.ts', 'note: The owner rewrites this.']));
    expect(parsed!.meta.model).toBe('examples/x.kcad.ts');
    expect(parsed!.meta.note).toBe('The owner rewrites this.');
  });

  it('rejects a status other than draft or published', () => {
    expect(errorOf(source([...BASE, 'status: wip'])).field).toBe('status');
  });

  it('rejects an empty status instead of publishing the post', () => {
    // `status:` with nothing after it is YAML null; it must not read as "published".
    const err = errorOf(source([...BASE, 'status:']));
    expect(err.field).toBe('status');
    expect(err.message).toContain('draft or published');
  });

  it.each([
    ['model', '../outside.kcad.ts'],
    ['model', 'examples/../../outside.kcad.ts'],
    ['video', '/tmp/clip.mp4'],
  ])('rejects a %s path that leaves the repository: %s', (field, value) => {
    const err = errorOf(source([...BASE, `${field}: ${value}`]));
    expect(err.field).toBe(field);
    expect(err.message).toContain('inside the repository');
  });

  it.each(['11.10.2026', '2026-13-01', '2026-02-30', '2026-1-5'])('rejects the date %s', (date) => {
    const err = errorOf(source([...BASE.slice(0, 2), `date: ${date}`, 'kind: guide']));
    expect(err.field).toBe('date');
    expect(err.message).toContain('YYYY-MM-DD');
  });

  it('rejects an empty or non-text title', () => {
    expect(errorOf(source(['title: ""', ...BASE.slice(1)])).field).toBe('title');
    expect(errorOf(source(['title: 12', ...BASE.slice(1)])).field).toBe('title');
  });

  it('rejects front matter that is never closed', () => {
    const err = errorOf(`---\n${BASE.join('\n')}\n\nThe lede.\n`);
    expect(err.message).toContain('closing ---');
  });

  it('rejects front matter that is not a list of keys', () => {
    expect(errorOf('---\n- title\n---\n').message).toContain('key: value');
    expect(errorOf('---\ntitle: [unclosed\n---\n').message).toContain(FILE);
  });
});
