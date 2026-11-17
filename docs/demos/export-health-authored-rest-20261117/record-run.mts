// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// Record check_export_health on the three scripts in this directory.
// Run from the repo root:
//   TMPDIR=/tmp TMP=/tmp npx tsx docs/demos/export-health-authored-rest-20261117/record-run.mts
import { performance } from 'node:perf_hooks';
import { writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkExportHealthTool } from '../../../src/agent/mcp/tools/checkExportHealth.ts';
import { evaluateAndBuildScript } from '../../../src/agent/cli/commands/evaluate.ts';
import type { Assembly } from '../../../src/modeling/capture/assembly.ts';
import { assemblyToMjcf } from '../../../src/modeling/runtime/mjcfExport.ts';
import { loadMujocoSession } from '../../../src/modeling/runtime/mujocoSession.ts';

const HERE = dirname(fileURLToPath(import.meta.url));

function digest(report: Record<string, any>) {
  const inertia = Array.isArray(report.inertia) ? report.inertia : [];
  return {
    ok: report.ok,
    summary: report.summary,
    error: report.error ?? null,
    penetrating: report.restContacts?.penetrating ?? [],
    marginOnly: report.restContacts?.marginOnly ?? [],
    qposOutsideLimits: report.qposOutsideLimits ?? [],
    restQpos: report.restQpos ?? [],
    visualCount: report.visualFindings?.length ?? 0,
    inertiaCount: inertia.length,
    inertiaMismatch: inertia.filter((row: any) => row.mismatch).map((row: any) => ({
      body: row.body,
      fallback: row.fallback,
      regularized: row.regularized,
      notes: row.notes,
      cadMassKg: row.cad?.mjcf?.massKg ?? null,
      massSource: row.cad?.mjcf?.massSource ?? null,
      mjcfMassKg: row.mjcf?.massKg ?? null,
      mjcfMismatch: row.mjcf?.mismatch ?? null,
      urdfMassKg: row.urdf?.massKg ?? null,
      urdfMismatch: row.urdf?.mismatch ?? null,
    })),
    noteCount: report.inertiaNotes?.length ?? 0,
  };
}

async function timed(file: string) {
  const t0 = performance.now();
  const report = await checkExportHealthTool({ file });
  return { ms: performance.now() - t0, report: report as Record<string, any> };
}

async function zeroPosePenetration(file: string) {
  const { model } = await evaluateAndBuildScript({ file });
  const arm = [...(model!.session.assemblies as Map<string, Assembly>).values()][0]!;
  const exported = await assemblyToMjcf(arm);
  const session = await loadMujocoSession(exported.mjcf, exported.bodyOrder, exported.jointOrder);
  try {
    const qpos0 = session.getQpos().slice();
    session.setPose(new Array(session.nq).fill(0));
    session.forward();
    const hits = session.compiledContacts()
      .filter((contact) => {
        const pair = [contact.bodyA, contact.bodyB].sort().join(':');
        return pair === 'link:stop' && contact.distM < -1e-6;
      })
      .map((contact) => ({
        bodyA: contact.bodyA,
        bodyB: contact.bodyB,
        distM: contact.distM,
        penetrationM: -contact.distM,
      }));
    return { qpos0, hits };
  } finally {
    session.dispose();
  }
}

const swingFile = resolve(HERE, 'swing-clear.kcad.ts');
const massFile = resolve(HERE, 'declared-mass.kcad.ts');
const limitFile = resolve(HERE, 'limit-rest.kcad.ts');
const swing = await timed(swingFile);
const mass = await timed(massFile);
const limit = await timed(limitFile);
const row = mass.report.inertia?.[0];
const run = {
  recordedAt: new Date().toISOString(),
  command: 'TMPDIR=/tmp TMP=/tmp npx tsx docs/demos/export-health-authored-rest-20261117/record-run.mts',
  swing: { file: 'swing-clear.kcad.ts', ms: swing.ms, ...digest(swing.report), coordinateZero: await zeroPosePenetration(swingFile) },
  declaredMass: {
    file: 'declared-mass.kcad.ts',
    ms: mass.ms,
    ...digest(mass.report),
    block: {
      body: row?.body,
      cadMassKg: row?.cad?.mjcf?.massKg,
      massSource: row?.cad?.mjcf?.massSource,
      mjcfMassKg: row?.mjcf?.massKg,
      urdfMassKg: row?.urdf?.massKg,
      mjcfMismatch: row?.mjcf?.mismatch,
      urdfMismatch: row?.urdf?.mismatch,
    },
  },
  limitRest: { file: 'limit-rest.kcad.ts', ms: limit.ms, ...digest(limit.report) },
};
writeFileSync(resolve(HERE, 'run.json'), `${JSON.stringify(run, null, 2)}\n`);
console.log(JSON.stringify({ swing: run.swing.ok, mass: run.declaredMass.ok, limit: run.limitRest.ok, zero: run.swing.coordinateZero.hits[0]?.penetrationM }, null, 2));
