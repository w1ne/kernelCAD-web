// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/modeling/export/srdf/srdfSerializer.ts
//
// Pure SRDF serializer. Reads planning groups, end-effectors, virtual joints,
// group states from the captured Assembly; auto-derives the ACM via
// acmDerive; emits the .srdf XML.

import type { Assembly } from '../../capture/assembly';
import type { CompilerDiagnostic } from '../../../shared/diagnostics/diagnostic';
import { deriveAcm } from './acmDerive';
import { NEXT_ACTIONS } from '../../../shared/diagnostics/registry';

export interface SrdfSerializeOptions {
  urdfPath?: string;
  samplesPerMate?: number;
  combinatorial?: boolean;
}

export interface SrdfSerializeResult {
  srdf: string;
  diagnostics: CompilerDiagnostic[];
}

export async function srdfSerialize(
  arm: Assembly,
  opts: SrdfSerializeOptions,
): Promise<SrdfSerializeResult> {
  const diagnostics: CompilerDiagnostic[] = [];
  const groups = arm.__planningGroups();
  if (groups.length === 0) {
    diagnostics.push({
      target: 'export-occt',
      code: 'export.srdf.planning-group-missing',
      severity: 'error',
      message: 'SRDF export requires at least one arm.planningGroup(...) declaration.',
      hint: 'Declare arm.planningGroup(\'main\', { chain: { baseLink, tipLink } }) before calling export_model({ format: \'srdf\' }).',
      nextAction: NEXT_ACTIONS['export.srdf.planning-group-missing'],
    });
    return { srdf: '', diagnostics };
  }
  const groupBlocks: string[] = [];
  for (const g of groups) {
    const inner: string[] = [];
    if (g.chain) inner.push(`    <chain base_link="${escapeXml(g.chain.baseLink)}" tip_link="${escapeXml(g.chain.tipLink)}"/>`);
    if (g.joints) for (const j of g.joints) inner.push(`    <joint name="${escapeXml(j)}"/>`);
    if (g.links) for (const l of g.links) inner.push(`    <link name="${escapeXml(l)}"/>`);
    groupBlocks.push([`  <group name="${escapeXml(g.name)}">`, ...inner, `  </group>`].join('\n'));
  }
  const eeBlocks = arm.__endEffectors().map(ee =>
    `  <end_effector name="${escapeXml(ee.name)}" parent_link="${escapeXml(ee.parentLink)}" group="${escapeXml(ee.group)}" parent_group="${escapeXml(ee.parentGroup)}"/>`,
  );
  const vjBlocks = arm.__virtualJoints().map(vj =>
    `  <virtual_joint name="${escapeXml(vj.name)}" type="${vj.type}" parent_frame="${escapeXml(vj.parentFrame)}" child_link="${escapeXml(vj.childLink)}"/>`,
  );
  const stateBlocks = arm.__groupStates().map(s => {
    const inner = Object.entries(s.values).map(([j, v]) => `    <joint name="${escapeXml(j)}" value="${v}"/>`).join('\n');
    return [`  <group_state name="${escapeXml(s.name)}" group="${escapeXml(s.group)}">`, inner, `  </group_state>`].join('\n');
  });

  const acm = await deriveAcm(arm, {
    samplesPerMate: opts.samplesPerMate,
    combinatorial: opts.combinatorial,
  });
  diagnostics.push(...acm.diagnostics);
  const acmBlocks = acm.pairs.map(p =>
    `  <disable_collisions link1="${escapeXml(p.link1)}" link2="${escapeXml(p.link2)}" reason="${p.reason}"/>`,
  );

  const srdf = [
    `<?xml version="1.0"?>`,
    `<robot name="${escapeXml(arm.name)}">`,
    ...groupBlocks,
    ...eeBlocks,
    ...vjBlocks,
    ...stateBlocks,
    ...acmBlocks,
    `</robot>`,
    ``,
  ].join('\n');
  return { srdf, diagnostics };
}

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
}
