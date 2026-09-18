// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { useEffect, useRef, useState } from 'react';

export function useMarkingIntent() {
  // Intent: a one-line note + preset tags carried with the stroke so the agent
  // reads WHAT is wrong, not just where. State drives the UI; refs let the
  // unmount-time / debounced persistMark read the latest values without being
  // re-created on every keystroke.
  const [note, setNote] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const noteRef = useRef('');
  const tagsRef = useRef<string[]>([]);
  useEffect(() => {
    noteRef.current = note;
    tagsRef.current = tags;
  });

  function toggleTag(tag: string) {
    setTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  }

  return { note, setNote, tags, noteRef, tagsRef, toggleTag };
}
