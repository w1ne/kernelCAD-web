// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import type { JSX } from 'react';
import { Play, Pause } from 'lucide-react';
import { PLAYBACK_MODES, PLAYBACK_SPEEDS, type PlaybackMode, type PlaybackSpeed } from './useAnimationPlayback';

interface AnimationNotesProps {
    readonly canDrive: boolean;
    readonly bakeState: 'idle' | 'baking' | 'ready' | 'error';
    readonly bakeError: string | null;
}

export function AnimationNotes({ canDrive, bakeState, bakeError }: AnimationNotesProps): JSX.Element {
    return (
        <>
            {!canDrive && (
                <div
                    className="mx-3 mb-2 px-2 py-1.5 text-[10px] leading-tight text-amber-200/90 bg-amber-950/30 border border-amber-900/60 rounded"
                    data-testid="animation-editor-mode-note"
                >
                    Live playback drives the viewport only when the model is
                    opened from a script (?script=). In the editor the scrubber
                    previews sampled values but the mechanism won&apos;t move.
                </div>
            )}

            {canDrive && bakeState === 'baking' && (
                <div
                    className="mx-3 mb-2 px-2 py-1.5 text-[10px] leading-tight text-sky-200/90 bg-sky-950/30 border border-sky-900/60 rounded"
                    data-testid="animation-bake-status"
                >
                    Preparing animation…
                </div>
            )}
            {/* 'ready' shows no status — the mechanism just plays. */}
            {canDrive && bakeState === 'error' && (
                <div
                    className="mx-3 mb-2 px-2 py-1.5 text-[10px] leading-tight text-red-300/90 bg-red-950/30 border border-red-900/60 rounded"
                    data-testid="animation-bake-status"
                >
                    Animation unavailable: {bakeError ?? 'unknown error'}.
                </div>
            )}
        </>
    );
}

interface AnimationTransportProps {
    readonly isPlaying: boolean;
    readonly mode: PlaybackMode;
    readonly speed: PlaybackSpeed;
    readonly onToggle: () => void;
    readonly onMode: (mode: PlaybackMode) => void;
    readonly onSpeed: (speed: PlaybackSpeed) => void;
}

export function AnimationTransport({ isPlaying, mode, speed, onToggle, onMode, onSpeed }: AnimationTransportProps): JSX.Element {
    return (
        <div className="flex items-center gap-2 px-3 py-1">
            <button
                type="button"
                onClick={onToggle}
                className="flex items-center justify-center w-7 h-7 rounded bg-[#222] hover:bg-[#2c2c2c] text-gray-200 border border-[#333]"
                aria-label={isPlaying ? 'Pause' : 'Play'}
                data-testid="animation-play-pause"
            >
                {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            </button>

            <select
                value={mode}
                onChange={(e) => onMode(e.target.value as PlaybackMode)}
                aria-label="Playback mode"
                data-testid="animation-mode"
                className="text-[11px] bg-[#1a1a1a] text-gray-300 border border-[#333] rounded px-1 py-0.5"
            >
                {PLAYBACK_MODES.map((m) => (
                    <option key={m} value={m}>{m}</option>
                ))}
            </select>

            <select
                value={speed}
                onChange={(e) => onSpeed(Number(e.target.value) as PlaybackSpeed)}
                aria-label="Playback speed"
                data-testid="animation-speed"
                className="text-[11px] bg-[#1a1a1a] text-gray-300 border border-[#333] rounded px-1 py-0.5"
            >
                {PLAYBACK_SPEEDS.map((s) => (
                    <option key={s} value={s}>{s}×</option>
                ))}
            </select>
        </div>
    );
}

interface AnimationScrubberProps {
    readonly durationMs: number;
    readonly tMs: number;
    readonly onPause: () => void;
    readonly onScrubTo: (tMs: number) => void;
}

export function AnimationScrubber({ durationMs, tMs, onPause, onScrubTo }: AnimationScrubberProps): JSX.Element {
    return (
        <div className="px-3 py-1">
            <input
                type="range"
                min={0}
                max={durationMs}
                step={1}
                value={Math.round(tMs)}
                onPointerDown={onPause}
                onChange={(e) => onScrubTo(Number(e.target.value))}
                aria-label="Timeline position"
                data-testid="animation-scrubber"
                className="w-full accent-[#4a9eff]"
            />
            <div className="flex justify-between text-[10px] text-gray-500 tabular-nums">
                <span>{(tMs / 1000).toFixed(2)}s</span>
                <span>{(durationMs / 1000).toFixed(2)}s</span>
            </div>
        </div>
    );
}

interface AnimationTrackListProps {
    readonly trackValues: readonly { param: string; value: number }[];
}

export function AnimationTrackList({ trackValues }: AnimationTrackListProps): JSX.Element {
    return (
        <ul className="flex flex-col divide-y divide-[#1f1f1f] border-t border-[#1f1f1f] mt-1">
            {trackValues.map((t) => (
                <li
                    key={t.param}
                    className="flex items-center justify-between gap-3 h-6 px-3 text-xs text-gray-300"
                    data-testid={`animation-track-${t.param}`}
                >
                    <span className="flex-1 truncate" title={t.param}>{t.param}</span>
                    <span className="tabular-nums text-gray-400" data-testid={`animation-track-value-${t.param}`}>
                        {t.value.toFixed(2)}
                    </span>
                </li>
            ))}
        </ul>
    );
}
