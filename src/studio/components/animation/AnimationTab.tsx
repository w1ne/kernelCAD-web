import type { JSX } from 'react';
import { Play, Pause } from 'lucide-react';
import { useRecomputeResult } from '../../hooks/useRecomputeResult';
import { useWorkbench } from '../../context/WorkbenchContext';
import { selectAnimationMetadata } from '../../logic/animationRecord';
import {
    useAnimationPlayback,
    PLAYBACK_MODES,
    PLAYBACK_SPEEDS,
    type PlaybackMode,
    type PlaybackSpeed,
} from './useAnimationPlayback';

/**
 * Inspector Animation tab — a review cockpit for the script's
 * `animationView(...)` timeline. Scrub or play the timeline and the viewport
 * mechanism moves: each scrub/tick samples every track (shared
 * `sampleTrackAt`, identical to the offline MP4 capture) and emits ONE
 * param-edit batch through the SAME params pipeline the Params/Joints tabs
 * drive (`updateParam` → POST /__kernelcad/params → SSE relower → mesh
 * refetch). There is no client-side mesh interpolation; every pose is a real
 * kernel re-solve, so playback is honestly capped by re-solve speed.
 *
 * Live drive needs the server-pool session (`?script=`). In editor/local mode
 * `updateParam` has no session token, so the scrubber still reads sampled
 * values but the viewport does not move — an inline note says so.
 */
export function AnimationTab(): JSX.Element {
    const { features, updateParam } = useRecomputeResult();
    const { sessionToken } = useWorkbench() as { sessionToken?: string | null };
    const metadata = selectAnimationMetadata(features);

    // Live drive requires both the updateParam plumbing AND a session token
    // (the server-pool path); editor mode lacks the latter.
    const liveUpdateParam = sessionToken ? updateParam : undefined;

    const playback = useAnimationPlayback({ metadata, updateParam: liveUpdateParam });

    if (!metadata) {
        return (
            <div
                className="px-4 py-3 text-sm text-gray-500"
                data-testid="animation-empty-state"
            >
                No animationView() declared
            </div>
        );
    }

    const { durationMs, fps, name, tMs, isPlaying, mode, speed, trackValues, canDrive } = playback;

    return (
        <div className="flex flex-col" data-testid="animation-tab">
            <div className="flex items-baseline justify-between px-3 pt-2 pb-1">
                <span className="text-xs text-gray-200 truncate" title={name}>{name}</span>
                <span className="text-[10px] text-gray-500">
                    {(durationMs / 1000).toFixed(2)}s · {fps} fps
                </span>
            </div>

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

            {/* Transport */}
            <div className="flex items-center gap-2 px-3 py-1">
                <button
                    type="button"
                    onClick={playback.toggle}
                    className="flex items-center justify-center w-7 h-7 rounded bg-[#222] hover:bg-[#2c2c2c] text-gray-200 border border-[#333]"
                    aria-label={isPlaying ? 'Pause' : 'Play'}
                    data-testid="animation-play-pause"
                >
                    {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                </button>

                <select
                    value={mode}
                    onChange={(e) => playback.setMode(e.target.value as PlaybackMode)}
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
                    onChange={(e) => playback.setSpeed(Number(e.target.value) as PlaybackSpeed)}
                    aria-label="Playback speed"
                    data-testid="animation-speed"
                    className="text-[11px] bg-[#1a1a1a] text-gray-300 border border-[#333] rounded px-1 py-0.5"
                >
                    {PLAYBACK_SPEEDS.map((s) => (
                        <option key={s} value={s}>{s}×</option>
                    ))}
                </select>
            </div>

            {/* Scrubber */}
            <div className="px-3 py-1">
                <input
                    type="range"
                    min={0}
                    max={durationMs}
                    step={1}
                    value={Math.round(tMs)}
                    onPointerDown={playback.pause}
                    onChange={(e) => playback.scrubTo(Number(e.target.value))}
                    aria-label="Timeline position"
                    data-testid="animation-scrubber"
                    className="w-full accent-[#4a9eff]"
                />
                <div className="flex justify-between text-[10px] text-gray-500 tabular-nums">
                    <span>{(tMs / 1000).toFixed(2)}s</span>
                    <span>{(durationMs / 1000).toFixed(2)}s</span>
                </div>
            </div>

            {/* Per-track readout */}
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

            <p className="px-3 py-2 text-[10px] leading-tight text-gray-500 border-t border-[#1f1f1f]">
                Playback rate is limited by kernel re-solve speed — each frame
                is a real solve, not interpolated. For full-fidelity motion use
                the offline MP4 capture.
            </p>
        </div>
    );
}
