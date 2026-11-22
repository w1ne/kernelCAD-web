#!/usr/bin/env node
// Run the repository's catalog renderer only for this new wave, preserving
// already-rendered previews for the rest of the catalog.
import { readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '../../..');
const kitDir = resolve(root, 'catalog/kits/recycling-facility');
const ids = readdirSync(kitDir).filter((file) => file.endsWith('.kcad.ts')).map((file) => file.slice(0, -'.kcad.ts'.length)).sort();
if (ids.length !== 153) throw new Error(`expected 153 recycling-facility sources, found ${ids.length}`);
const result = spawnSync(process.execPath, [
  '--import', resolve(import.meta.dirname, 'node-preload.mjs'),
  '--import', 'tsx',
  'scripts/renderCatalogPreviews.ts',
  ...ids,
], { cwd: root, stdio: 'inherit' });
if (result.error) throw result.error;
if (result.status !== 0) process.exit(result.status ?? 1);
