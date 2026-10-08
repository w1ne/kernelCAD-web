// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import App from '../App';
import { StudioCommandPalette } from '../components/CommandPalette';
import { clearWordsGeometry, peekWordsGeometry, type WordsGeometry } from '../wordsToGeometry';

export const Route = createFileRoute('/')({
  component: StudioHome,
});

function StudioHome() {
  const [handoff] = useState<WordsGeometry | null>(() => peekWordsGeometry());
  useEffect(() => {
    if (handoff) clearWordsGeometry();
  }, [handoff]);
  if (!handoff) return <App headerRight={<StudioCommandPalette />} />;
  return <App initialCode={handoff.source} headerRight={<StudioCommandPalette />} />;
}
