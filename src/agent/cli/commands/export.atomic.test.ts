// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const publicationRace = vi.hoisted(() => ({
  attackerOwnedStickyAncestor: undefined as string | undefined,
  untrustedFinalParent: undefined as string | undefined,
  untrustedOwnerAncestor: undefined as string | undefined,
  enabled: false,
}));

// Deterministically create a final path after the writer's preflight but at
// its publish syscall. It models a concurrent writer without timing races.
vi.mock('node:fs/promises', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs/promises')>();
  async function createLateDestination(destination: string): Promise<void> {
    if (!publicationRace.enabled) return;
    await actual.writeFile(destination, 'late manifest from concurrent writer', { flag: 'wx' });
  }
  return {
    ...actual,
    link: async (existingPath: string, destination: string) => {
      await createLateDestination(destination);
      return actual.link(existingPath, destination);
    },
    rename: async (existingPath: string, destination: string) => {
      await createLateDestination(destination);
      return actual.rename(existingPath, destination);
    },
    stat: async (path: string) => {
      const info = await actual.stat(path);
      if (
        path !== publicationRace.attackerOwnedStickyAncestor
        && path !== publicationRace.untrustedFinalParent
        && path !== publicationRace.untrustedOwnerAncestor
      ) return info;
      return Object.assign(Object.create(info), { uid: info.uid + 1 });
    },
  };
});

import { writeManifestSidecarAtomically } from './export';

const temporaryDirectories: string[] = [];

afterEach(() => {
  publicationRace.attackerOwnedStickyAncestor = undefined;
  publicationRace.untrustedFinalParent = undefined;
  publicationRace.untrustedOwnerAncestor = undefined;
  publicationRace.enabled = false;
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe('writeManifestSidecarAtomically', () => {
  it('does not replace an existing sidecar destination', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'kcad-manifest-exclusive-sidecar-'));
    temporaryDirectories.push(directory);
    const destination = join(directory, 'servo.connector-manifest.json');
    writeFileSync(destination, 'existing manifest');

    await expect(writeManifestSidecarAtomically(destination, '{"partId":"servo"}\n'))
      .rejects.toMatchObject({ code: 'EEXIST' });

    expect(readFileSync(destination, 'utf8')).toBe('existing manifest');
  });

  it('rejects a sidecar directory writable by group or other users', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'kcad-manifest-insecure-parent-'));
    temporaryDirectories.push(directory);
    const destination = join(directory, 'servo.connector-manifest.json');
    chmodSync(directory, 0o777);

    await expect(writeManifestSidecarAtomically(destination, '{"partId":"servo"}\n'))
      .rejects.toThrow(/must not be writable by group or other users/i);

    expect(existsSync(destination)).toBe(false);
  });

  it('rejects a safe-looking parent nested below a writable ancestor', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'kcad-manifest-writable-ancestor-'));
    temporaryDirectories.push(directory);
    const writableAncestor = join(directory, 'writable-ancestor');
    const safeParent = join(writableAncestor, 'safe-parent');
    mkdirSync(safeParent, { recursive: true });
    chmodSync(writableAncestor, 0o777);
    chmodSync(safeParent, 0o700);
    const destination = join(safeParent, 'servo.connector-manifest.json');

    await expect(writeManifestSidecarAtomically(destination, '{"partId":"servo"}\n'))
      .rejects.toThrow(/ancestry.*writable by group or other users/i);

    expect(existsSync(destination)).toBe(false);
  });

  it('rejects a current-user child below a sticky ancestor owned by another user', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'kcad-manifest-sticky-ancestor-'));
    temporaryDirectories.push(directory);
    const stickyAncestor = join(directory, 'sticky-ancestor');
    const safeParent = join(stickyAncestor, 'safe-parent');
    mkdirSync(safeParent, { recursive: true });
    chmodSync(stickyAncestor, 0o1777);
    chmodSync(safeParent, 0o700);
    publicationRace.attackerOwnedStickyAncestor = realpathSync(stickyAncestor);
    const destination = join(safeParent, 'servo.connector-manifest.json');

    await expect(writeManifestSidecarAtomically(destination, '{"partId":"servo"}\n'))
      .rejects.toThrow(/ancestry.*sticky.*trusted/i);

    expect(existsSync(destination)).toBe(false);
  });

  it('rejects a safe-looking parent below a non-sticky ancestor owned by another user', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'kcad-manifest-foreign-ancestor-'));
    temporaryDirectories.push(directory);
    const foreignAncestor = join(directory, 'foreign-ancestor');
    const safeParent = join(foreignAncestor, 'safe-parent');
    mkdirSync(safeParent, { recursive: true });
    chmodSync(foreignAncestor, 0o755);
    chmodSync(safeParent, 0o700);
    publicationRace.untrustedOwnerAncestor = realpathSync(foreignAncestor);
    const destination = join(safeParent, 'servo.connector-manifest.json');

    await expect(writeManifestSidecarAtomically(destination, '{"partId":"servo"}\n'))
      .rejects.toThrow(/ancestry.*owned by the current user or root/i);

    expect(existsSync(destination)).toBe(false);
  });

  it('rejects a final manifest parent owned by another user', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'kcad-manifest-foreign-parent-'));
    temporaryDirectories.push(directory);
    chmodSync(directory, 0o700);
    publicationRace.untrustedFinalParent = realpathSync(directory);
    const destination = join(directory, 'servo.connector-manifest.json');

    await expect(writeManifestSidecarAtomically(destination, '{"partId":"servo"}\n'))
      .rejects.toThrow(/ancestry.*owned by the current user or root/i);

    expect(existsSync(destination)).toBe(false);
  });

  it('publishes a sidecar without group or other write permission', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'kcad-manifest-private-file-'));
    temporaryDirectories.push(directory);
    const destination = join(directory, 'servo.connector-manifest.json');
    const previousUmask = process.umask(0);
    try {
      await writeManifestSidecarAtomically(destination, '{"partId":"servo"}\n');
    } finally {
      process.umask(previousUmask);
    }

    expect(statSync(destination).mode & 0o022).toBe(0);
  });

  it('does not replace a sidecar that appears at the publication boundary', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'kcad-manifest-publication-race-'));
    temporaryDirectories.push(directory);
    const destination = join(directory, 'servo.connector-manifest.json');
    publicationRace.enabled = true;

    await expect(writeManifestSidecarAtomically(destination, '{"partId":"servo"}\n'))
      .rejects.toMatchObject({ code: 'EEXIST' });

    expect(readFileSync(destination, 'utf8')).toBe('late manifest from concurrent writer');
  });
});
