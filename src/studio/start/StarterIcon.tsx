// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import type { StarterId } from './starterModels';

export function StarterIcon({ id }: { id: StarterId }) {
  return (
    <svg viewBox="0 0 140 100" className="h-20 w-full" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden="true">
      {id === 'box' ? <>
        <path d="M25 35 80 15 120 35 65 57Z" fill="#e1edf7" />
        <path d="M25 35v35l40 20V57m0 33 55-22V35" fill="#adcbe2" />
        <path d="M34 38 80 22 110 36 65 51Z" fill="#f4ecd7" />
        <path d="M80 22v22M50 46l30-10 16 7" />
      </> : id === 'bracket' ? <>
        <path d="M30 30 85 12v48l30 15-55 18-30-15Z" fill="#adcbe2" />
        <path d="M30 30v48l55-18M60 93v-7l55-18M30 78l30 15" />
        <ellipse cx="57" cy="40" rx="4" ry="6" transform="rotate(15 57 40)" fill="#f4ecd7" />
        <ellipse cx="64" cy="75" rx="4" ry="2" fill="#f4ecd7" />
        <ellipse cx="91" cy="66" rx="4" ry="2" fill="#f4ecd7" />
      </> : <>
        <path d="M25 75 80 54l40 20-55 20Z" fill="#adcbe2" />
        <path d="M49 66 42 22 90 8l8 43Z" fill="#d6e7f4" />
        <path d="M43 73v-9l35-13v9Z" fill="#5c91bd" />
        <path d="M25 75v5l40 19 55-20v-5M65 94v5" />
      </>}
    </svg>
  );
}
