// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildSystemPrompt, SKILLS_ROOT, SWEEP_SKILLS } from './systemPrompt';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DEFAULT_CONFIG_PATH = resolve(__dirname, '../prompts/sweep-prompt-presets.json');

export interface PresetConfig {
  skills: string[];
  sections: Record<string, string[] | '*'>;
}

export interface BuiltSweepPrompt {
  text: string;
  bytes: number;
  preset: string;
  skills: string[];
}

export function extractSections(md: string): Map<string, string> {
  const out = new Map<string, string>();
  let current: string | null = null;
  let buf: string[] = [];
  let inFence = false;
  for (const line of md.split(/\r?\n/)) {
    if (/^\s*(```|~~~)/.test(line)) {
      inFence = !inFence;
      if (current !== null) buf.push(line);
      continue;
    }
    if (!inFence) {
      const m = /^## (?!#)(.*)$/.exec(line);
      if (m) {
        if (current !== null) {
          if (out.has(current)) throw new Error(`duplicate section heading '${current}' in SKILL.md`);
          out.set(current, buf.join('\n'));
        }
        current = m[1].trim();
        buf = [line];
        continue;
      }
    }
    if (current !== null) buf.push(line);
  }
  if (current !== null) {
    if (out.has(current)) throw new Error(`duplicate section heading '${current}' in SKILL.md`);
    out.set(current, buf.join('\n'));
  }
  return out;
}

export function loadPresets(configPath: string = DEFAULT_CONFIG_PATH): Record<string, PresetConfig | null> {
  const raw = JSON.parse(readFileSync(configPath, 'utf8')) as { presets?: Record<string, PresetConfig | null> };
  if (!raw.presets) throw new Error(`presets config missing 'presets' key: ${configPath}`);
  return raw.presets;
}

export function buildSweepPrompt(opts: {
  preset: string;
  root?: string;
  configPath?: string;
}): BuiltSweepPrompt {
  const root = opts.root ?? SKILLS_ROOT;
  const presets = loadPresets(opts.configPath);
  if (!(opts.preset in presets)) {
    throw new Error(`unknown prompt preset '${opts.preset}' (available: ${Object.keys(presets).join(', ')})`);
  }
  const cfg = presets[opts.preset];
  if (cfg === null) {
    const text = buildSystemPrompt(SWEEP_SKILLS, root);
    return { text, bytes: Buffer.byteLength(text), preset: opts.preset, skills: [...SWEEP_SKILLS] };
  }
  const parts: string[] = [];
  for (const skill of cfg.skills) {
    const skillPath = join(root, skill, 'SKILL.md');
    if (!existsSync(skillPath)) {
      throw new Error(`SKILL.md not found for skill '${skill}' at ${skillPath}`);
    }
    const md = readFileSync(skillPath, 'utf8');
    const wanted = cfg.sections[skill];
    if (wanted === undefined) {
      throw new Error(`preset '${opts.preset}' has no sections entry for skill '${skill}'`);
    }
    if (wanted === '*') {
      parts.push(md);
      continue;
    }
    const sections = extractSections(md);
    for (const heading of wanted) {
      const body = sections.get(heading);
      if (body === undefined) {
        throw new Error(`heading '${heading}' not found in skill '${skill}' (preset '${opts.preset}')`);
      }
      parts.push(body);
    }
  }
  const text = parts.join('\n\n---\n\n');
  return { text, bytes: Buffer.byteLength(text), preset: opts.preset, skills: [...cfg.skills] };
}
