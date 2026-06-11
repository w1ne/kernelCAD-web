// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/agent/mcp/tools/validateUrdf.ts
//
// Parse-and-check the .urdf at urdf_path. Useful for round-trip
// verification after export, and for sanity-checking external URDFs
// the agent imports. Pure regex-based parser — sufficient for the
// structural checks listed below; not a full DTD validator.

import { readFile } from 'node:fs/promises';

export interface ValidateUrdfInput {
  urdf_path: string;
}

export interface ValidateUrdfOutput {
  ok: boolean;
  linkCount?: number;
  jointCount?: number;
  rootLinks?: string[];
  error?: string;
  errorCode?: string;
  errorHint?: string;
}

export async function validateUrdfTool(input: ValidateUrdfInput): Promise<ValidateUrdfOutput> {
  let text: string;
  try {
    text = await readFile(input.urdf_path, 'utf8');
  } catch (e) {
    return {
      ok: false,
      error: `Cannot read ${input.urdf_path}: ${e instanceof Error ? e.message : String(e)}`,
      errorCode: 'cli.file-read',
    };
  }
  const links = [...text.matchAll(/<link\s+name="([^"]+)"/g)].map(m => m[1]);
  const joints = [...text.matchAll(/<joint\s+name="([^"]+)"\s+type="([^"]+)"[\s\S]*?<\/joint>/g)].map(m => {
    const block = m[0];
    const parent = block.match(/<parent\s+link="([^"]+)"/)?.[1] ?? '';
    const child = block.match(/<child\s+link="([^"]+)"/)?.[1] ?? '';
    return { name: m[1], type: m[2], parent, child };
  });

  // Duplicate link names.
  const seen = new Set<string>();
  for (const name of links) {
    if (seen.has(name)) {
      return {
        ok: false,
        error: `Duplicate link name '${name}'.`,
        errorCode: 'validate.urdf.duplicate-link',
        errorHint: 'Every <link name="..."> must be unique within a <robot>. Rename one of the colliding links.',
      };
    }
    seen.add(name);
  }
  // Dangling joint -> link refs.
  const linkSet = new Set(links);
  for (const j of joints) {
    if (!linkSet.has(j.parent)) {
      return {
        ok: false,
        error: `Joint '${j.name}' references unknown parent link '${j.parent}'.`,
        errorCode: 'validate.urdf.dangling-link-ref',
        errorHint: `Add a <link name="${j.parent}"/> element, or change the joint's <parent link="..."> to a declared link.`,
      };
    }
    if (!linkSet.has(j.child)) {
      return {
        ok: false,
        error: `Joint '${j.name}' references unknown child link '${j.child}'.`,
        errorCode: 'validate.urdf.dangling-link-ref',
        errorHint: `Add a <link name="${j.child}"/> element, or change the joint's <child link="..."> to a declared link.`,
      };
    }
  }
  // Closed loop / multi-parent.
  const parentCount = new Map<string, number>();
  for (const j of joints) {
    parentCount.set(j.child, (parentCount.get(j.child) ?? 0) + 1);
  }
  for (const [name, count] of parentCount.entries()) {
    if (count > 1) {
      return {
        ok: false,
        error: `Link '${name}' has ${count} parent joints (closed loop or multi-parent).`,
        errorCode: 'validate.urdf.closed-loop',
        errorHint: 'URDF requires a tree topology. Remove the redundant joint, or switch to SDFormat which supports closed loops natively.',
      };
    }
  }
  const childLinks = new Set(joints.map(j => j.child));
  const rootLinks = links.filter(l => !childLinks.has(l));
  return { ok: true, linkCount: links.length, jointCount: joints.length, rootLinks };
}
