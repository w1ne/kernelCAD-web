// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// scripts/ingestFreecadLibrary.ts
//
// Seed a self-hosted parts catalog from the CC-BY FreeCAD parts_library
// (github.com/FreeCAD/FreeCAD-library) — a license-clean STEP source you own,
// instead of a third-party API. Sparse-clones only the requested subtree's STEP
// files (the full repo is large), then runs the shared ingestDirectory pipeline
// (measured attributes + synthesized connectors + sha256 + /v1/parts tree).
//
// Operational tool (network + git); no CI test — the ingest core is covered by
// scripts/ingestParts.test.ts.
//
// Usage:
//   npx tsx scripts/ingestFreecadLibrary.ts --out <dir> \
//     [--subdir "Mechanical Parts/Bearings"] [--base-url https://parts.example.com]

import { execFileSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ingestDirectory } from './ingestParts';

const REPO = 'https://github.com/FreeCAD/FreeCAD-library';
const ATTRIBUTION = 'FreeCAD parts_library (CC-BY-3.0)';

function parseArgs(argv: string[]): Record<string, string> {
  const flags: Record<string, string> = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith('--')) flags[argv[i].slice(2)] = argv[++i];
  }
  return flags;
}

async function main(): Promise<void> {
  const flags = parseArgs(process.argv.slice(2));
  const outDir = flags['out'];
  if (!outDir) {
    console.error('usage: ingestFreecadLibrary --out <dir> [--subdir "<path>"] [--base-url <url>]');
    process.exit(2);
  }
  const subdir = flags['subdir'] ?? '';

  const cloneDir = mkdtempSync(join(tmpdir(), 'fclib-'));
  console.log(`sparse-cloning ${subdir || 'STEP files'} from FreeCAD-library …`);
  execFileSync(
    'git',
    ['clone', '--depth', '1', '--filter=blob:none', '--sparse', REPO, cloneDir],
    { stdio: 'inherit' },
  );
  // Cone-mode sparse set pulls only the requested directory's blobs.
  if (subdir) {
    execFileSync('git', ['-C', cloneDir, 'sparse-checkout', 'set', subdir], { stdio: 'inherit' });
  }

  const srcDir = subdir ? join(cloneDir, subdir) : cloneDir;
  // The FreeCAD library is a bulk community catalog that repeats some parts
  // across folders (e.g. LM8UU under both Bearings/ and Mountings/). Skip such
  // duplicate ids rather than aborting the whole ingest when upstream drifts.
  const records = await ingestDirectory(
    srcDir,
    outDir,
    {
      baseUrl: flags['base-url'] ?? '',
      license: 'CC-BY-3.0',
      attribution: ATTRIBUTION,
    },
    { onDuplicate: 'skip' },
  );
  console.log(`ingested ${records.length} FreeCAD parts into ${outDir}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
