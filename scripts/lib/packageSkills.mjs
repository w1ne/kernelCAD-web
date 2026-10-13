// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { copyFileSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseDocument } from 'yaml';

/** Copy the release skill tree, stamping each skill with the package version. */
export function copyPackageSkills(source, destination, version) {
  rmSync(destination, { recursive: true, force: true });
  function copyTree(src, dst) {
    mkdirSync(dst, { recursive: true });
    for (const entry of readdirSync(src, { withFileTypes: true })) {
      const from = join(src, entry.name);
      const to = join(dst, entry.name);
      if (entry.isDirectory()) {
        copyTree(from, to);
      } else if (entry.name === 'SKILL.md') {
        const text = readFileSync(from, 'utf8');
        const frontmatter = /^---\r?\n([\s\S]*?)\r?\n---(?=\r?\n|$)/.exec(text);
        if (!frontmatter) throw new Error(`Missing skill frontmatter: ${from}`);
        const doc = parseDocument(frontmatter[1]);
        if (doc.errors.length) throw new Error(`Invalid skill frontmatter: ${from}: ${doc.errors[0].message}`);
        doc.setIn(['metadata', 'version'], version);
        writeFileSync(to, `---\n${doc.toString()}---${text.slice(frontmatter[0].length)}`);
      } else {
        copyFileSync(from, to);
      }
    }
  }
  copyTree(source, destination);
}
