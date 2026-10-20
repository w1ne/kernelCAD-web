// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

export const MARKUP_NOTE_MAX_LENGTH = 280;
export const MARKUP_NOTE_MAX_STROKE_POINTS = 512;
export const MARKUP_SNAPSHOT_MAX_TOPOLOGY_REFS = 256;
export const MARKUP_SNAPSHOT_MAX_MEASUREMENTS = 128;
export const MARKUP_SNAPSHOT_MAX_NOTES = 128;
export const MARKUP_SNAPSHOT_MAX_REFS_PER_ITEM = 32;

/** Shared with the composer so the appended Studio context fits the API text budget. */
export const STUDIO_AGENT_PROMPT_MAX_CHARS = 63_000;
export const STUDIO_AGENT_PROMPT_TOO_LARGE_MESSAGE =
  'The prompt plus Studio markup exceeds 63,000 characters. Remove some notes, measurements, or picked topology, or shorten the prompt.';
