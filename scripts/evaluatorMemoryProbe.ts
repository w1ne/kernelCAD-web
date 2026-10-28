// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Samples wasm heap and process RSS across repeated param edits and across
// solids that carry an analysis envelope. Not part of the vitest PR path.
//
//   npx tsx scripts/evaluatorMemoryProbe.ts

import { initOcct, occtHeapBytes, OcctBackend } from '../src/kernel/backends/occt/occtBackend';
import { buildModel } from '../src/modeling/buildModel';
import { createWarmDocumentStore } from '../src/modeling/warm/documentSession';

function mb(n: number): string {
  return (n / (1024 * 1024)).toFixed(1);
}

function sample(label: string): { heap: number; rss: number } {
  const heap = occtHeapBytes();
  const rss = process.memoryUsage().rss;
  console.log(`${label}\theapMb=${mb(heap)}\trssMb=${mb(rss)}`);
  return { heap, rss };
}

function bulky(): OcctBackend {
  let solid = OcctBackend.box(10, 8, 6);
  for (let i = 0; i < 6; i += 1) {
    const tool = OcctBackend.box(4, 4, 4).translate(i * 2, 0, 2);
    const next = solid.union(tool);
    tool.dispose();
    solid.dispose();
    solid = next;
  }
  return solid;
}

async function envelopeLoop(): Promise<void> {
  const held: OcctBackend[] = [];
  sample('envelope-start');
  for (let i = 0; i < 12; i += 1) {
    const main = bulky();
    main.analysisBody = bulky();
    main.dispose();
    held.push(main);
    if (i === 0 || i === 5 || i === 11) sample(`envelope-${i + 1}`);
  }
}

async function paramEdits(): Promise<void> {
  const code = `
    const h = param('h', 8, { min: 1, max: 40 });
    let body = box(24, 16, 4);
    body = body.union(box(6, 6, h).translate(-6, 0, 4));
    body = body.union(box(6, 6, h).translate(6, 0, 4));
    body = body.subtract(cylinder(h.add(6), 1.5).translate(0, 0, 2));
    return body;
  `;
  const store = createWarmDocumentStore({ build: (input) => buildModel(input) });
  await store.open({ id: 'doc', code, fileName: 'mem.kcad.ts' });
  sample('edit-open');
  const heaps: number[] = [];
  const rss: number[] = [];
  for (let i = 0; i < 40; i += 1) {
    const edited = await store.edit('doc', [{ name: 'h', value: 5 + (i % 12) }]);
    edited.document.model.rootShape?.volume();
    heaps.push(occtHeapBytes());
    rss.push(process.memoryUsage().rss);
    if (i === 0 || i === 9 || i === 19 || i === 29 || i === 39) sample(`edit-${i + 1}`);
  }
  const warmHeap = heaps.slice(5);
  const warmRss = rss.slice(5);
  console.log(`warm-heap-bandMb=${mb(Math.min(...warmHeap))}..${mb(Math.max(...warmHeap))} span=${mb(Math.max(...warmHeap) - Math.min(...warmHeap))}`);
  console.log(`warm-rss-bandMb=${mb(Math.min(...warmRss))}..${mb(Math.max(...warmRss))} span=${mb(Math.max(...warmRss) - Math.min(...warmRss))}`);
  console.log(`peakHeapMb=${mb(Math.max(...heaps))} finalHeapMb=${mb(heaps.at(-1) ?? 0)}`);
  console.log(`peakRssMb=${mb(Math.max(...rss))} finalRssMb=${mb(rss.at(-1) ?? 0)}`);
}

await initOcct();
sample('start');
await envelopeLoop();
await paramEdits();
