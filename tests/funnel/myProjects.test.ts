// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';

// A chainable stand-in for the supabase-js query builder: records every call
// and resolves to `result` when awaited.
let result: { data: unknown; error: { message: string } | null } = { data: [], error: null };
const calls: Array<[string, unknown[]]> = [];
function builder(): unknown {
  const b: Record<string, unknown> = {};
  for (const m of ['select', 'eq', 'order', 'limit', 'update', 'delete', 'single']) {
    b[m] = (...args: unknown[]) => { calls.push([m, args]); return b; };
  }
  b.then = (ok: (v: unknown) => unknown, bad: (e: unknown) => unknown) => Promise.resolve(result).then(ok, bad);
  return b;
}
const getSession = vi.fn();
const from = vi.fn((table: string) => { calls.push(['from', [table]]); return builder(); });

vi.mock('../../src/funnel/lib/supabaseClient', () => ({
  getSupabase: () => ({ auth: { getSession }, from }),
}));

import { deleteProject, listMyProjects, renameProject } from '../../src/funnel/lib/apiClient';

beforeEach(() => {
  calls.length = 0;
  from.mockClear();
  result = { data: [], error: null };
  getSession.mockResolvedValue({ data: { session: { user: { id: 'user-1' } } } });
});

describe('listMyProjects', () => {
  it('lists only the signed-in owner\'s projects, newest first, without code', async () => {
    result = { data: [{ id: 'a', slug: 'a', title: 'A' }], error: null };
    const rows = await listMyProjects();
    expect(rows).toEqual([{ id: 'a', slug: 'a', title: 'A' }]);
    // The read policy also returns other users' public-by-link projects, so
    // the owner filter is what keeps them off /me.
    expect(calls).toContainEqual(['eq', ['owner_id', 'user-1']]);
    expect(calls).toContainEqual(['order', ['updated_at', { ascending: false }]]);
    const select = calls.find(c => c[0] === 'select')![1][0] as string;
    expect(select).not.toContain('current_code');
    expect(select).toContain('version');
  });

  it('applies a limit when asked', async () => {
    await listMyProjects({ limit: 8 });
    expect(calls).toContainEqual(['limit', [8]]);
  });

  it('returns [] without a query when signed out', async () => {
    getSession.mockResolvedValueOnce({ data: { session: null } });
    expect(await listMyProjects()).toEqual([]);
    expect(from).not.toHaveBeenCalledWith('projects');
  });

  it('throws the database error', async () => {
    result = { data: null, error: { message: 'boom' } };
    await expect(listMyProjects()).rejects.toThrow('boom');
  });
});

describe('renameProject', () => {
  it('updates the trimmed title of one project and returns the saved row', async () => {
    result = { data: { title: 'New', updated_at: 't' }, error: null };
    expect(await renameProject('id-1', '  New  ')).toEqual({ title: 'New', updated_at: 't' });
    expect(calls).toContainEqual(['update', [{ title: 'New' }]]);
    expect(calls).toContainEqual(['eq', ['id', 'id-1']]);
  });

  it('refuses an empty name without a request', async () => {
    await expect(renameProject('id-1', '   ')).rejects.toThrow(/name/);
    expect(calls).toEqual([]);
  });

  it('caps the title at 80 characters like the server', async () => {
    result = { data: { title: 'x', updated_at: 't' }, error: null };
    await renameProject('id-1', 'y'.repeat(200));
    const update = calls.find(c => c[0] === 'update')![1][0] as { title: string };
    expect(update.title).toHaveLength(80);
  });
});

describe('deleteProject', () => {
  it('deletes one project by id', async () => {
    result = { data: [{ id: 'id-1' }], error: null };
    await deleteProject('id-1');
    expect(calls.map(c => c[0])).toContain('delete');
    expect(calls).toContainEqual(['eq', ['id', 'id-1']]);
  });

  it('fails when no row was deleted (not the owner)', async () => {
    result = { data: [], error: null };
    await expect(deleteProject('id-1')).rejects.toThrow(/not found or not yours/);
  });
});
