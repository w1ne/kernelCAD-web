// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// The Roadster gate: real evaluate, real body-likeness, real dynamics runner.
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { evaluateAndBuildScript } from '../composition/scriptEvaluation';
import { evaluateBodyLikeness } from '../agent/likeness/bodyLikeness';
import { sectionLoops } from '../kernel/backends/occt/sketchFromShapeOps';
import { readRoadsterFacts } from '../../examples/roadster/modelFacts';
import { bottleGasVolumeM3, hopScenarioFromFacts, TANK_MASS_KG } from '../../examples/roadster/hopScenario';
import { airborneFrame, hopFilmstripSvg } from '../../examples/roadster/animateHop';
import { traceSidePhoto } from '../../examples/roadster/photoTrace';
import { runScenario } from './run';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const scriptPath = resolve(root, 'examples/roadster/roadster.kcad.ts');
const measuredPath = resolve(root, 'examples/roadster/stations.measured.json');
const imagePath = resolve(root, 'examples/roadster/reference/official-01.jpg');
const tracePath = resolve(root, 'examples/roadster/photo-trace.json');
const scenarioPath = resolve(root, 'examples/roadster/hop.scenario.json');
const animationPath = resolve(root, 'examples/roadster/hop.svg');

interface Station {
  s: number;
  zSill: number;
  halfBottom: number;
  zTop: number;
  halfTop: number;
}

test('the McGregor Roadster matches its measured stations, passes likeness, and hops', async () => {
  const measured = JSON.parse(readFileSync(measuredPath, 'utf8')) as {
    widthMm: number;
    lengthMm: number;
    stations: Station[];
  };
  const built = await evaluateAndBuildScript({ file: scriptPath });
  assert.equal(built.evaluation.exitCode, 0, JSON.stringify(built.evaluation.diagnostics));
  assert.ok(built.model, 'evaluate returned no model');

  const facts = readRoadsterFacts(built.model);
  const width = facts.body.max[1] - facts.body.min[1];
  assert.ok(Math.abs(width - measured.widthMm) < 1, `body width ${width}`);

  const chassisId = (built.model.session.assemblies.get('roadster') as {
    __parts(): Array<{ name: string; originalShape: { id: string } }>;
  }).__parts().find((part) => part.name === 'chassis')!.originalShape.id;
  const chassis = built.model.shapes.get(chassisId);
  assert.ok(chassis, 'chassis shape missing');

  const tolerance = 0.04 * measured.lengthMm;
  const photo = await traceSidePhoto(imagePath, measured.stations.map((station) => station.s), measured.lengthMm);
  assert.equal(photo.width, 1260);
  assert.equal(photo.height, 840);
  assert.ok(Math.abs(photo.noseX - 184) <= 2, `nose x ${photo.noseX}`);
  assert.ok(photo.tailX >= 960 && photo.tailX <= 980, `tail x ${photo.tailX}`);
  assert.ok(photo.groundRow >= 580 && photo.groundRow <= 620, `ground row ${photo.groundRow}`);

  const traceRows: Array<Record<string, number | string>> = [];
  for (const station of measured.stations) {
    const s = station.s <= 0 ? 2 : station.s >= measured.lengthMm ? measured.lengthMm - 2 : station.s;
    const loops = sectionLoops(chassis as never, {
      origin: [s, 0, 0],
      normal: [1, 0, 0],
      u: [0, 1, 0],
      v: [0, 0, 1],
    });
    const box = loops.bboxes[0];
    assert.ok(box, `no section at s=${station.s}`);
    const half = Math.max(Math.abs(box.min[0]), Math.abs(box.max[0]));
    const err = Math.max(
      Math.abs(half - Math.max(station.halfBottom, station.halfTop)),
      Math.abs(box.max[1] - station.zTop),
      Math.abs(box.min[1] - station.zSill),
    );
    assert.ok(err <= tolerance, `station s=${station.s} err ${err} mm > ${tolerance}`);

    const shot = photo.stations.find((row) => row.s === station.s);
    assert.ok(shot, `no photo row at s=${station.s}`);
    const photoTopErr = Math.abs(shot.photoZTop - station.zTop);
    const photoBottomErr = Math.abs(shot.photoZBottom - station.zSill);
    const modelTopErr = Math.abs(shot.photoZTop - box.max[1]);
    const modelBottomErr = Math.abs(shot.photoZBottom - box.min[1]);
    // The nose and the hood ahead of the door are single bright runs. Later
    // columns include the open door and the raised wing, which are not the loft.
    if (station.s === 0 || station.s === 700) {
      assert.ok(photoTopErr <= tolerance, `photo s=${station.s} top ${shot.photoZTop} vs station ${station.zTop}`);
      assert.ok(photoBottomErr <= tolerance, `photo s=${station.s} bottom ${shot.photoZBottom} vs sill ${station.zSill}`);
      assert.ok(modelTopErr <= tolerance, `photo s=${station.s} top ${shot.photoZTop} vs section ${box.max[1]}`);
      assert.ok(modelBottomErr <= tolerance, `photo s=${station.s} bottom ${shot.photoZBottom} vs section ${box.min[1]}`);
    }
    traceRows.push({
      s: station.s,
      pixelX: shot.x,
      photoZTop: Number(shot.photoZTop.toFixed(2)),
      photoZBottom: Number(shot.photoZBottom.toFixed(2)),
      stationZTop: station.zTop,
      stationZSill: station.zSill,
      modelZTop: Number(box.max[1].toFixed(2)),
      modelZSill: Number(box.min[1].toFixed(2)),
      photoTopErrMm: Number(photoTopErr.toFixed(2)),
      photoBottomErrMm: Number(photoBottomErr.toFixed(2)),
      modelTopErrMm: Number(modelTopErr.toFixed(2)),
      modelBottomErrMm: Number(modelBottomErr.toFixed(2)),
    });
  }
  const traceLog = {
    image: imagePath,
    pixelSize: `${photo.width}x${photo.height}`,
    luminance: 'Rec.709 > 48',
    pixelSpan: { noseX: photo.noseX, tailX: photo.tailX },
    groundRow: photo.groundRow,
    mmPerPx: photo.mmPerPx,
    lengthMm: photo.lengthMm,
    toleranceMm: tolerance,
    assertedStationsMm: [0, 700],
    stations: traceRows,
  };
  writeFileSync(tracePath, JSON.stringify(traceLog, null, 2));
  if (process.env.ROADSTER_TRACE_LOG) {
    writeFileSync(process.env.ROADSTER_TRACE_LOG, JSON.stringify(traceLog, null, 2));
  }

  const likeness = evaluateBodyLikeness({
    requireStills: false,
    body: { min: facts.body.min, max: facts.body.max },
    wheels: facts.wheels,
  });
  assert.equal(likeness.ok, true, likeness.summary);
  for (const name of ['light-front', 'light-rear', 'door-left', 'door-right', 'diffuser', 'noz-rear-1', 'noz-down-fl']) {
    assert.ok(facts.parts.some((part) => part.name === name), name);
  }

  const scenario = hopScenarioFromFacts(facts);
  assert.ok(Math.abs((scenario.tank?.volumeM3 ?? 0) - bottleGasVolumeM3()) < 1e-9);
  assert.equal(scenario.tank?.massKg, TANK_MASS_KG);
  assert.equal(scenario.dryMassKg, facts.dryMassKg);
  writeFileSync(scenarioPath, JSON.stringify(scenario, null, 2));

  const first = runScenario(scenario);
  const second = runScenario(JSON.parse(readFileSync(scenarioPath, 'utf8')));
  assert.equal(first.analysis, 'floating');
  assert.equal(second.analysis, 'floating');
  if (first.analysis !== 'floating' || second.analysis !== 'floating') return;
  assert.ok(first.result.peakHeightM > 1, `peak ${first.result.peakHeightM}`);
  assert.ok(first.result.maxTiltDeg < 30, `tilt ${first.result.maxTiltDeg}`);
  assert.ok(first.result.propellantLeftKg < first.result.propellantInitialKg);
  assert.equal(first.result.peakHeightM, second.result.peakHeightM);
  assert.equal(first.result.maxTiltDeg, second.result.maxTiltDeg);
  assert.equal(first.result.propellantLeftKg, second.result.propellantLeftKg);

  const rest = scenario.positionM?.[2] ?? 0;
  const svg = hopFilmstripSvg(first.result.samples, rest, measured.lengthMm / 1000);
  writeFileSync(animationPath, svg);
  const frame = airborneFrame(first.result.samples, rest);
  assert.ok(frame.heightM > 1);
  assert.ok(frame.tiltDeg < 30);
  assert.match(svg, new RegExp(`data-height="${frame.heightM.toFixed(4)}"`));
  assert.ok(svg.length > 200);
});
