// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { useEffect, useRef, useState } from 'react';
import type { MutableRefObject } from 'react';
import { apiCall, rewritePath } from '../../api/apiBase';
import type { TerminalLine } from './TerminalPane';
import type { BuildRecord, BuildRecordStep, DevMeshPayload } from './demoPlayerGeometry';

function linesForStep(record: BuildRecord, step: BuildRecordStep, index: number): TerminalLine[] {
    const status = step.status === 'passed' ? 'PASS' : 'FAIL';
    const reasons = step.review.blockingReasons ?? [];
    return [
        { text: `$ kernelcad loop --goal "${record.goal}"`, fullyTypedAtMs: 450 },
        { text: `iteration ${index + 1}/${record.steps.length}: ${step.title}`, fullyTypedAtMs: 1050 },
        { text: `script: ${step.script}`, fullyTypedAtMs: 1600 },
        { text: `review_cad: ${status} - ${step.review.summary}`, fullyTypedAtMs: 2300 },
        ...reasons.slice(0, 3).map((reason, reasonIndex) => ({
            text: `blocking: ${reason}`,
            fullyTypedAtMs: 3050 + reasonIndex * 650,
        })),
    ];
}

/**
 * Owns the two demo-player auto-load paths gated on `isDemoApiReady`:
 * loading a single `?script=` mesh, or stepping through a `?record=`
 * build-loop JSON. Mutually exclusive by URL param, same as the original
 * inline effects.
 */
export function useDemoAutoLoad(isDemoApiReady: boolean, elapsedMsRef: MutableRefObject<number>) {
    const [scriptLoadStatus, setScriptLoadStatus] = useState<
        { kind: 'idle' | 'loading' | 'error'; message?: string }
    >({ kind: 'idle' });
    const [buildRecord, setBuildRecord] = useState<BuildRecord | null>(null);
    const [buildRecordStep, setBuildRecordStep] = useState<BuildRecordStep | null>(null);
    const autoLoadedScriptRef = useRef<string | null>(null);
    const autoLoadedRecordRef = useRef<string | null>(null);

    useEffect(() => {
        if (!isDemoApiReady || autoLoadedScriptRef.current !== null || autoLoadedRecordRef.current !== null) return;

        const script = new URLSearchParams(window.location.search).get('script');
        if (!script) return;

        autoLoadedScriptRef.current = script;
        let cancelled = false;
        // Synchronous setState, matching the original inline effect
        // byte-for-byte (zero-behavior-change outranks the lint rule here —
        // this file is only linted as a "hook" because it's named `use*`;
        // the identical code was invisible to
        // react-hooks/set-state-in-effect inside the original
        // DemoPlayerPage).
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setScriptLoadStatus({ kind: 'loading', message: `Loading ${script}` });

        apiCall()
            .then(({ base, headers }) =>
                fetch(
                    rewritePath(`/__kernelcad/mesh?script=${encodeURIComponent(script)}`, base),
                    { headers },
                ),
            )
            .then(async (response) => {
                const payload = await response.json();
                if (!response.ok) {
                    const message = typeof payload?.error === 'string' ? payload.error : response.statusText;
                    throw new Error(message);
                }
                return payload as DevMeshPayload;
            })
            .then((payload) => {
                if (cancelled) return;
                if (!window.__demoPlayer) throw new Error('demo-player API disappeared while loading script');
                window.__demoPlayer.loadFeatureMeshes(payload.features, payload.bounds);
                window.__demoPlayer.forceFullOpacity();
                window.__demoPlayer.setVersion('dev');
                setScriptLoadStatus({ kind: 'idle' });
            })
            .catch((error) => {
                if (cancelled) return;
                setScriptLoadStatus({
                    kind: 'error',
                    message: error instanceof Error ? error.message : String(error),
                });
            });

        return () => {
            cancelled = true;
        };
    }, [isDemoApiReady]);

    useEffect(() => {
        if (!isDemoApiReady || autoLoadedRecordRef.current !== null || autoLoadedScriptRef.current !== null) return;

        const recordPath = new URLSearchParams(window.location.search).get('record');
        if (!recordPath) return;

        autoLoadedRecordRef.current = recordPath;
        let cancelled = false;
        let stepTimer: number | undefined;
        let clockTimer: number | undefined;
        // See the ?script= effect above for why this is a sync setState.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setScriptLoadStatus({ kind: 'loading', message: `Loading build record ${recordPath}` });

        const loadStep = async (record: BuildRecord, index: number) => {
            const step = record.steps[index];
            if (!step) return;
            setBuildRecordStep(step);
            setScriptLoadStatus({ kind: 'loading', message: `Loading ${step.script}` });
            const { base, headers } = await apiCall();
            const response = await fetch(
                rewritePath(`/__kernelcad/mesh?script=${encodeURIComponent(step.script)}`, base),
                { headers },
            );
            const payload = await response.json();
            if (!response.ok) {
                const message = typeof payload?.error === 'string' ? payload.error : response.statusText;
                throw new Error(message);
            }
            if (cancelled) return;
            if (!window.__demoPlayer) throw new Error('demo-player API disappeared while loading build record');
            window.__demoPlayer.loadFeatureMeshes(
                (payload as DevMeshPayload).features,
                (payload as DevMeshPayload).bounds,
            );
            window.__demoPlayer.forceFullOpacity();
            window.__demoPlayer.setVersion(step.status === 'passed' ? 'loop pass' : 'loop fail');
            window.__demoPlayer.setTerminalLines(linesForStep(record, step, index));
            window.__demoPlayer.startTerminalClock(elapsedMsRef.current);
            setScriptLoadStatus({ kind: 'idle' });
        };

        fetch(recordPath)
            .then(async (response) => {
                const payload = await response.json();
                if (!response.ok) {
                    const message = typeof payload?.error === 'string' ? payload.error : response.statusText;
                    throw new Error(message);
                }
                return payload as BuildRecord;
            })
            .then(async (record) => {
                if (cancelled) return;
                setBuildRecord(record);
                let stepIndex = 0;
                await loadStep(record, stepIndex);
                clockTimer = window.setInterval(() => window.__demoPlayer?.advance(100), 100);
                stepTimer = window.setInterval(() => {
                    stepIndex = (stepIndex + 1) % record.steps.length;
                    void loadStep(record, stepIndex).catch((error) => {
                        setScriptLoadStatus({
                            kind: 'error',
                            message: error instanceof Error ? error.message : String(error),
                        });
                    });
                }, 5200);
            })
            .catch((error) => {
                if (cancelled) return;
                setScriptLoadStatus({
                    kind: 'error',
                    message: error instanceof Error ? error.message : String(error),
                });
            });

        return () => {
            cancelled = true;
            if (stepTimer !== undefined) window.clearInterval(stepTimer);
            if (clockTimer !== undefined) window.clearInterval(clockTimer);
        };
    }, [isDemoApiReady, elapsedMsRef]);

    return { scriptLoadStatus, buildRecord, buildRecordStep };
}
