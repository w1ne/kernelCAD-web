// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { fetchDataset, loadTask, loadTasks, pickTaskIds, remoteTasks, selectTasks } from './dataset';

function fixtureDir(): string {
  const root = mkdtempSync(join(tmpdir(), 'cgb-data-'));
  const put = (rel: string, body: string) => {
    mkdirSync(join(root, rel, '..'), { recursive: true });
    writeFileSync(join(root, rel), body);
  };
  // Generation: task_type omitted (as in the published dataset), two drawings.
  put('127/description.yaml', 'description: >\n  Reproduce the geometry from the drawings.\n\ninput_files:\n  - input.png\n  - input2.png\n\ninput_type: text+image\n');
  put('127/input.png', 'png1');
  put('127/input2.png', 'png2');
  put('101/description.yaml', 'description: Reproduce it.\ninput_files:\n  - input.png\n');
  put('101/input.png', 'png');
  // Editing: the edit_description.txt text is the change request.
  put('201/description.yaml', 'description: >\n  Folded yaml copy.\ntask_type: editing\ninput_files:\n  - input.step\ninput_type: text+step\n');
  put('201/edit_description.txt', 'Bring the pocket walls inward by 6mm.\n');
  put('201/input.step', 'ISO-10303-21;');
  put('201/renders/top.png', 't');
  put('201/renders/iso.png', 'i');
  put('README.md', 'not a task');
  return root;
}

describe('loadTask / loadTasks', () => {
  it('loads generation and editing tasks in numeric order', () => {
    const root = fixtureDir();
    const tasks = loadTasks(root);
    expect(tasks.map((t) => [t.id, t.type])).toEqual([
      ['101', 'generation'],
      ['127', 'generation'],
      ['201', 'editing'],
    ]);
    const multi = tasks[1];
    expect(multi.description).toBe('Reproduce the geometry from the drawings.');
    expect(multi.images.map((p) => p.split('/').pop())).toEqual(['input.png', 'input2.png']);
    const edit = tasks[2];
    expect(edit.description).toBe('Bring the pocket walls inward by 6mm.');
    expect(edit.inputStep).toBe(join(root, '201', 'input.step'));
    expect(edit.images.map((p) => p.split('/').pop())).toEqual(['iso.png', 'top.png']);
  });

  it('refuses a generation task whose declared drawing is missing', () => {
    const root = fixtureDir();
    writeFileSync(join(root, '101/description.yaml'), 'description: x\ninput_files:\n  - gone.png\n');
    expect(() => loadTask(join(root, '101'))).toThrow(/gone\.png is missing/);
  });
});

describe('task selection', () => {
  const tasks = [
    { id: '101', type: 'generation' as const },
    { id: '102', type: 'generation' as const },
    { id: '201', type: 'editing' as const },
    { id: '202', type: 'editing' as const },
  ];

  it('samples the first N of each type', () => {
    expect(selectTasks(tasks, { generation: 1, editing: 2 }).map((t) => t.id)).toEqual(['101', '201', '202']);
  });

  it('explicit ids win and unknown ids throw', () => {
    expect(selectTasks(tasks, { ids: ['202', '101'], generation: 0 }).map((t) => t.id)).toEqual(['101', '202']);
    expect(() => selectTasks(tasks, { ids: ['999'] })).toThrow(/unknown task id\(s\): 999/);
  });

  it('no selection runs everything', () => {
    expect(selectTasks(tasks, {})).toHaveLength(4);
  });

  it('classifies remote tasks from the file listing (input.step ⇒ editing)', () => {
    const remote = remoteTasks(['README.md', '201/input.step', '201/description.yaml', '101/input.png', '11/input.png']);
    expect(remote).toEqual([
      { id: '11', type: 'generation' },
      { id: '101', type: 'generation' },
      { id: '201', type: 'editing' },
    ]);
    expect(pickTaskIds(remote, { generation: 1, editing: 1 })).toEqual(['11', '201']);
  });
});

describe('fetchDataset', () => {
  const SHA = 'a'.repeat(40);
  const FILES: Record<string, string> = {
    'README.md': 'readme',
    'sanity_check_submission.py': 'print()',
    '.gitattributes': 'x',
    '101/description.yaml': 'description: d\ninput_files:\n  - input.png\n',
    '101/input.png': 'PNGDATA',
    '201/description.yaml': 'description: e\ntask_type: editing\n',
    '201/input.step': 'STEP',
    '201/input.mesh.npz': 'NPZ',
  };

  function fakeFetch(calls: string[]): typeof fetch {
    return (async (input: string | URL | Request) => {
      const url = String(input);
      calls.push(url);
      if (url.includes('/api/datasets/') && url.includes('/tree/')) {
        const body = Object.entries(FILES).map(([path, v]) => ({ type: 'file', path, size: v.length }));
        return new Response(JSON.stringify(body), { status: 200 });
      }
      const m = /\/resolve\/([0-9a-f]{40})\/(.+)$/.exec(url);
      if (m && m[1] === SHA && FILES[decodeURIComponent(m[2])] !== undefined) {
        return new Response(FILES[decodeURIComponent(m[2])], { status: 200 });
      }
      return new Response('nope', { status: 404 });
    }) as typeof fetch;
  }

  it('downloads the selected tasks at a pinned revision, skips sidecars, and resumes', async () => {
    const cacheDir = mkdtempSync(join(tmpdir(), 'cgb-cache-'));
    const calls: string[] = [];
    const { dir, manifest } = await fetchDataset({
      cacheDir,
      revision: SHA,
      selection: { editing: 1, generation: 0 },
      fetchImpl: fakeFetch(calls),
    });
    expect(dir).toBe(join(cacheDir, SHA));
    expect(manifest).toMatchObject({ repo: 'HuggingAI4Engineering/cadgenbench-data', revision: SHA, license: 'ODC-BY-1.0' });
    expect(manifest.files.map((f) => f.path).sort()).toEqual([
      '201/description.yaml',
      '201/input.step',
      'README.md',
      'sanity_check_submission.py',
    ]);
    expect(existsSync(join(dir, '101'))).toBe(false);
    expect(existsSync(join(dir, '201/input.mesh.npz'))).toBe(false);
    expect(readFileSync(join(dir, '201/input.step'), 'utf8')).toBe('STEP');

    // A truncated file is fetched again; complete files are not.
    writeFileSync(join(dir, '201/input.step'), 'ST');
    const again: string[] = [];
    await fetchDataset({ cacheDir, revision: SHA, selection: { editing: 1, generation: 0 }, fetchImpl: fakeFetch(again) });
    const downloads = again.filter((u) => u.includes('/resolve/'));
    expect(downloads).toHaveLength(1);
    expect(downloads[0]).toMatch(/201\/input\.step$/);
    expect(readFileSync(join(dir, '201/input.step'), 'utf8')).toBe('STEP');
  });
});
