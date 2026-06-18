// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// scripts/parts/sources.ts
//
// The Phase-1 parts-ingestion SOURCE REGISTRY: the machine-readable form of the
// open-STEP source sweep. Each entry is an upstream collection kernelCAD can
// ingest at scale, pinned to a real commit for reproducible runs.
//
// Only MIRRORABLE sources live here:
//   - redistribution:'mirror' + licenseClass:'permissive'  — re-hosted freely
//     (attribution kept).
//   - redistribution:'mirror' + licenseClass:'share-alike'  — re-hosted with
//     copyleft obligations; kept in an attributed partition, served behind a
//     legal gate (legalHold:true).
//
// Sources whose license forbids re-hosting (NC/ND/unlicensed/vendor-ToS, i.e.
// licenseClass:'fetch-only') are NOT registered here — they are reached on
// demand through the `fetch_part` MCP tool (fetch-by-URL only, never mirrored).
//
// The `commit` field is pinned to the upstream HEAD SHA at sweep time
// (resolved via `git ls-remote <repo> HEAD`). A `// TODO: pin` comment marks
// any entry whose SHA could not be resolved and fell back to a branch name.

import type { PartSourceEntry } from './contracts';

export const SOURCES: PartSourceEntry[] = [
  // ── PERMISSIVE / mirror ────────────────────────────────────────────────
  {
    id: 'step-parts',
    repo: 'github.com/earthtojake/step.parts',
    commit: 'c6113328a5695b976a010a203a90fe86191769bf',
    licenseClass: 'permissive',
    redistribution: 'mirror',
    license: 'mixed-per-part',
    attribution: 'step.parts catalog (earthtojake/step.parts) + per-part upstream notices',
    adapter: 'step-parts',
    include: ['**/*.step', '**/*.stp'],
    perPartLicense: 'third-party-notices',
  },
  {
    id: 'freecad-library',
    repo: 'github.com/FreeCAD/FreeCAD-library',
    commit: '27c1d48e2b33a29d11ac7cfb323294b295cd20a2',
    licenseClass: 'permissive',
    redistribution: 'mirror',
    license: 'CC-BY-3.0',
    attribution: 'FreeCAD parts_library contributors',
    adapter: 'github-glob',
    include: ['**/*.stp', '**/*.step'],
  },
  {
    id: 'adafruit-cad',
    repo: 'github.com/adafruit/Adafruit_CAD_Parts',
    commit: '73a62d82d74c7d089ab5f6234f503a6bdb67d2c4',
    licenseClass: 'permissive',
    redistribution: 'mirror',
    license: 'MIT',
    attribution: 'Adafruit Industries',
    adapter: 'github-glob',
    include: ['**/*.step', '**/*.stp'],
  },
  {
    id: 'geez0x1-cycloidal-2022',
    repo: 'github.com/geez0x1/2022-cycloidal-drive',
    commit: '5867f4673b544a0b0c721aea170dc02019e066bc',
    licenseClass: 'permissive',
    redistribution: 'mirror',
    license: 'MIT',
    attribution: 'geez0x1 — 2022 cycloidal drive',
    adapter: 'github-glob',
    include: ['**/*.step', '**/*.stp'],
    categoryMap: {
      actuator: 'actuator',
      motor: 'actuator',
      drive: 'actuator',
      gears: 'gear',
      gear: 'gear',
    },
  },
  {
    id: 'geez0x1-cycloidal-2023',
    repo: 'github.com/geez0x1/2023-cycloidal-drive-nonpinwheel',
    commit: '841a92efa222cc1516e224704f9dd6606b64f9c7',
    licenseClass: 'permissive',
    redistribution: 'mirror',
    license: 'MIT',
    attribution: 'geez0x1 — 2023 cycloidal drive (non-pinwheel)',
    adapter: 'github-glob',
    include: ['**/*.step', '**/*.stp'],
  },
  {
    id: 'xrobots-opendog-v3',
    repo: 'github.com/XRobots/openDogV3',
    commit: '537aa0db8539bf255b072e4a1d7da38d08084ba8',
    licenseClass: 'permissive',
    redistribution: 'mirror',
    license: 'MIT',
    attribution: 'XRobots — openDog V3',
    adapter: 'github-glob',
    include: ['**/*.step', '**/*.stp'],
    categoryMap: {
      frame: 'structural-frame',
      chassis: 'structural-frame',
      body: 'structural-frame',
    },
  },
  {
    id: 'xrobots-cycloidal',
    repo: 'github.com/XRobots/CycloidalDrive',
    commit: '9a63c95a69e1a59809ac7a033b4f1fc796f0a157',
    licenseClass: 'permissive',
    redistribution: 'mirror',
    license: 'MIT',
    attribution: 'XRobots — Cycloidal Drive',
    adapter: 'github-glob',
    include: ['**/*.step', '**/*.stp'],
    categoryMap: {
      drive: 'actuator',
      actuator: 'actuator',
      motor: 'actuator',
    },
  },
  {
    id: 'jetbot',
    repo: 'github.com/NVIDIA-AI-IOT/jetbot',
    commit: 'ecf840baf644412771524a7806e6bbb7e0219509',
    licenseClass: 'permissive',
    redistribution: 'mirror',
    license: 'MIT',
    attribution: 'NVIDIA AI-IOT — JetBot',
    adapter: 'github-glob',
    include: ['**/*.step', '**/*.stp'],
  },
  {
    id: 'so-arm100',
    repo: 'github.com/TheRobotStudio/SO-ARM100',
    commit: 'fda892cba81032c46c40976a48c9ceadbf40a9ca',
    licenseClass: 'permissive',
    redistribution: 'mirror',
    license: 'Apache-2.0',
    attribution: 'The Robot Studio — SO-ARM100',
    adapter: 'github-glob',
    include: ['**/*.step', '**/*.stp'],
    categoryMap: {
      frame: 'structural-frame',
      arm: 'structural-frame',
      link: 'structural-frame',
      base: 'structural-frame',
    },
  },
  {
    id: 'koch-v1-1',
    repo: 'github.com/jess-moss/koch-v1-1',
    commit: '1a553e1fa7d5404b51bbd83b99b0f7eba54888e0',
    licenseClass: 'permissive',
    redistribution: 'mirror',
    license: 'Apache-2.0',
    attribution: 'Jess Moss — Koch v1.1',
    adapter: 'github-glob',
    include: ['**/*.step', '**/*.stp'],
    // SLDPRT is a Phase-2 (proprietary CAD) ingest path; STEP only for now.
    exclude: ['**/*.SLDPRT', '**/*.sldprt'],
  },
  {
    id: 'niryo-ned2',
    repo: 'github.com/NiryoRobotics/ned2',
    commit: '2814a5c9141b3e013b67bf1c2f165dc006a5aa28',
    licenseClass: 'permissive',
    redistribution: 'mirror',
    license: 'CC0-1.0',
    attribution: 'Niryo — Ned2',
    adapter: 'github-glob',
    include: ['**/*.step', '**/*.stp'],
    // 'needs-decomposition': ships as a monolithic arm STEP — the ingest engine
    // should split it into per-link parts before cataloging.
  },
  {
    id: 'compliantfinray',
    repo: 'github.com/richardhartisch/compliantfinray',
    commit: 'b9e5a0bdb31f63e706849e120c61c500e31f80a5',
    licenseClass: 'permissive',
    redistribution: 'mirror',
    license: 'BSD-3-Clause',
    attribution: 'Richard Hartisch — compliant Fin Ray',
    adapter: 'github-glob',
    include: ['**/*.step', '**/*.stp'],
    categoryMap: {
      finger: 'gripper',
      finray: 'gripper',
      gripper: 'gripper',
    },
  },
  {
    id: 'ssg-48',
    repo: 'github.com/PCrnjak/SSG-48-adaptive-electric-gripper',
    commit: 'fc4433fb178058b2020d5c6f90e7941439830a30',
    licenseClass: 'permissive',
    redistribution: 'mirror',
    license: 'Apache-2.0',
    attribution: 'Petar Crnjak — SSG-48 adaptive electric gripper',
    adapter: 'github-glob',
    include: ['**/*.step', '**/*.stp'],
    categoryMap: {
      gripper: 'gripper',
      finger: 'gripper',
      jaw: 'gripper',
    },
  },

  // ── SHARE-ALIKE / mirror / legalHold ───────────────────────────────────
  // CC-BY-SA / GPL collections: re-hosted only behind the legal gate.
  {
    id: 'kicad-packages3d',
    repo: 'gitlab.com/kicad/libraries/kicad-packages3D',
    commit: '0bc64e922178140eb6890377646efd45e15011bd',
    licenseClass: 'share-alike',
    redistribution: 'mirror',
    license: 'CC-BY-SA-4.0',
    attribution: 'KiCad Libraries — kicad-packages3D contributors',
    adapter: 'github-glob',
    include: ['**/*.step', '**/*.stp'],
    exclude: ['**/*.wrl'],
    legalHold: true,
  },
  {
    id: 'sparkfun-3d-models',
    repo: 'github.com/sparkfun/3D_Models',
    commit: '53d298c3b8202cf8fce9ab61885855720c84c012',
    licenseClass: 'share-alike',
    redistribution: 'mirror',
    license: 'CC-BY-SA-4.0',
    attribution: 'SparkFun Electronics — 3D_Models',
    adapter: 'github-glob',
    include: ['**/*.step', '**/*.stp'],
    legalHold: true,
  },
  {
    id: 'thor',
    repo: 'github.com/AngelLM/Thor',
    commit: '286b081fe6f056d87c379b884781ef77ff6a0159',
    licenseClass: 'share-alike',
    redistribution: 'mirror',
    license: 'CC-BY-SA-4.0',
    attribution: 'Ángel L. M. — Thor open-source robotic arm',
    adapter: 'github-glob',
    include: ['**/*.step', '**/*.stp'],
    legalHold: true,
  },
  {
    id: 'e3d-toolchanger',
    repo: 'github.com/e3donline/ToolChanger',
    commit: 'd36e0c769d69dac384e7e89e62ec0254aefb45b1',
    licenseClass: 'share-alike',
    redistribution: 'mirror',
    license: 'GPL-3.0',
    attribution: 'E3D Online — ToolChanger',
    adapter: 'github-glob',
    include: ['**/*.step', '**/*.stp'],
    legalHold: true,
  },
];
