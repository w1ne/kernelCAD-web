// Rebuild only the drafting tutorial's deliverables. The .kcad.ts files are source.
// Run: npx tsx examples/drafting-review/run.ts [output-directory]
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { getOC } from 'replicad';
import { evaluateAndBuildScript } from '../../src/composition/scriptEvaluation';
import { runAndExport, type ExportOptions, type ExportResult } from '../../src/agent/script-runtime/export';
import { initOcct, OcctBackend } from '../../src/kernel/backends/occt/occtBackend';
import { recogniseDrawingFeatures } from '../../src/kernel/backends/occt/drawingFeatures';
import type { SvgDrawingOptions } from '../../src/kernel/backends/occt/exportSvgDrawing';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '../..');
const RELEASE_DATE = '2026-10-11';
const output = resolve(process.argv[2] ?? resolve(ROOT, 'site/blog/drafting-review'));
const styles = ['baseline', 'chain', 'symmetry'] as const;

function check(result: ExportResult, name: string): void {
  const errors = result.diagnostics.filter(d => d.severity === 'error');
  if (result.bytes.length === 0 || errors.length > 0) {
    throw new Error(`${name}: export refused: ${JSON.stringify(result.diagnostics)}`);
  }
}

async function main(): Promise<void> {
  await initOcct();
  await mkdir(output, { recursive: true });
  const evidence: Array<Record<string, unknown>> = [];
  for (const model of ['mounting-plate', 'bearing-mount'] as const) {
    const file = resolve(HERE, `${model}.kcad.ts`);
    const code = await readFile(file, 'utf8');
    await writeFile(resolve(output, `${model}.kcad.ts`), code);
    const built = await evaluateAndBuildScript({ file });
    if (built.evaluation.exitCode !== 0 || built.evaluation.featureHealth.length > 0) throw new Error(`${model}: geometry evaluation failed`);
    const shape = built.model?.rootShape;
    if (!(shape instanceof OcctBackend)) throw new Error(`${model}: expected an OCCT solid`);
    const analyzer = new (getOC().BRepCheck_Analyzer)(shape.getReplicadShape().wrapped, true, false);
    let valid: boolean;
    try { valid = analyzer.IsValid_2(); } finally { analyzer.delete(); }
    const geometry = { boundingBox: shape.boundingBox({ exact: true }), volumeMm3: shape.volume(), solidCount: shape.solidComponents().length,
      brepValid: valid, evaluation: built.evaluation, holes: recogniseDrawingFeatures(shape).holes };
    if (!valid || geometry.solidCount !== 1) throw new Error(`${model}: not one connected valid solid`);
    await writeFile(resolve(output, `${model}.geometry.json`), `${JSON.stringify(geometry, null, 2)}\n`);
    for (const dimensioningStyle of model === 'mounting-plate' ? styles : ['baseline'] as const) {
      const name = model === 'mounting-plate' ? `${model}-${dimensioningStyle}` : model;
      const shared = {
        sheet: 'a3' as const, projection: 'third' as const,
        date: RELEASE_DATE, modelName: model,
        draftingProfile: {
          id: 'tutorial-machining', name: 'Tutorial machining review',
          sheet: 'a3' as const, projection: 'third' as const,
          dimensioningStyle, tolerance: 'ISO2768-m' as const,
          notes: ['ILLUSTRATIVE DESIGN - ENGINEERING REVIEW REQUIRED'],
        },
        autoAnnotate: { dimensioningStyle },
        ...(model === 'bearing-mount'
          ? { sections: [{ plane: { origin: [60, 40, 39] as [number, number, number], normal: [1, 0, 0] as [number, number, number] }, label: 'A' }] }
          : {}),
      };
      const titleBlock = {
        title: model === 'mounting-plate' ? `Mounting plate - ${dimensioningStyle}` : 'Bearing mount - review example',
        partName: model === 'mounting-plate' ? 'DEMO-MP-100' : 'DEMO-BM-120',
        material: 'Aluminium 6061-T6 (proposed)', revision: 'EXAMPLE',
      };
      const svgOptions: SvgDrawingOptions = { ...shared, format: 'svg-drawing', titleBlock };
      let svg = await runAndExport({ code, fileName: file, scriptDir: HERE, format: 'svg-drawing', options: svgOptions as ExportOptions });
      check(svg, `${name}.svg`);
      const annotationOverrides: Record<string, { text: string }> = {};
      if (model === 'bearing-mount') {
        // Demonstrate a real review: cutter overrun is not the source's nominal
        // counterbore depth. Resolve current report IDs rather than saving an index.
        await writeFile(resolve(output, 'bearing-mount-unreviewed.svg'), svg.bytes);
        await sharp(svg.bytes, { density: 144 }).resize({ width: 1680 }).png().toFile(resolve(output, 'bearing-mount-unreviewed.png'));
        const decisions = [];
        for (const a of svg.drawingReport?.annotations ?? []) {
          if (a.kind !== 'hole') continue;
          const before = a.text.split(' | ')[0];
          const after = before.startsWith('4× ⌀9 THRU')
            ? '4× ⌀9 THRU ⌴⌀15 ▾ 5'
            : before.startsWith('⌀32 THRU') ? '⌀32 THRU ⌴⌀44 ▾ 8' : undefined;
          if (after === undefined) throw new Error(`Unexpected bearing-mount hole group: ${a.text}`);
          annotationOverrides[a.id] = { text: after };
          decisions.push({ id: a.id, before, after, reason: 'Restore nominal depth from the source; recognised B-rep includes 0.01 mm boolean cutter allowance. Review does not alter geometry or the attached tolerance frame.' });
        }
        if (decisions.length !== 2) throw new Error('Expected exactly the mounting-hole and bearing-seat review decisions');
        await writeFile(resolve(output, 'bearing-mount-review.json'), `${JSON.stringify({ sourceSha256: createHash('sha256').update(code).digest('hex'), decisions, annotationOverrides }, null, 2)}\n`);
        svgOptions.annotationOverrides = annotationOverrides;
        svg = await runAndExport({ code, fileName: file, scriptDir: HERE, format: 'svg-drawing', options: svgOptions as ExportOptions });
        check(svg, `${name}.svg reviewed`);
      }
      await writeFile(resolve(output, `${name}.svg`), svg.bytes);
      await sharp(svg.bytes, { density: 144 }).resize({ width: 1680 }).png().toFile(resolve(output, `${name}.png`));
      const pdf = await runAndExport({ code, fileName: file, scriptDir: HERE, format: 'pdf-drawing', options: { ...shared, ...titleBlock, annotationOverrides, format: 'pdf-drawing' } });
      check(pdf, `${name}.pdf`);
      await writeFile(resolve(output, `${name}.pdf`), pdf.bytes);
      const report = { svg: svg.drawingReport, pdf: pdf.drawingReport, diagnostics: { svg: svg.diagnostics, pdf: pdf.diagnostics } };
      await writeFile(resolve(output, `${name}.report.json`), `${JSON.stringify(report, null, 2)}\n`);
      evidence.push({ name, source: `examples/drafting-review/${model}.kcad.ts`, sourceSha256: createHash('sha256').update(code).digest('hex'),
        options: { ...shared, titleBlock, annotationOverrides }, files: [`${name}.svg`, `${name}.pdf`, `${name}.png`, `${name}.report.json`, `${model}.geometry.json`,
          ...(model === 'bearing-mount' ? ['bearing-mount-unreviewed.svg', 'bearing-mount-unreviewed.png', 'bearing-mount-review.json'] : [])],
        annotationCount: svg.drawingReport?.annotations.length, overlapped: svg.drawingReport?.overlapped });
      console.log(`${name}: ${svg.bytes.length} SVG bytes, ${pdf.bytes.length} PDF bytes, ${svg.drawingReport?.placed} clear / ${svg.drawingReport?.overlapped} overlapping annotations`);
    }
  }
  await writeFile(resolve(output, 'manifest.json'), `${JSON.stringify({ command: 'npx tsx examples/drafting-review/run.ts', date: RELEASE_DATE, evidence,
    limits: ['Illustrative tolerances are not an engineer-approved specification.', 'No physical manufacture, fit, load or inspection acceptance is established.', 'Overlapping callouts require review; generation is not drawing release.'] }, null, 2)}\n`);
}

main().catch(error => { console.error(error); process.exitCode = 1; });
