// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

/** One run at a time. A value pushed while a run is in flight replaces the
 *  queued value; it starts only after the current run settles. Callers that
 *  share one push therefore cannot overlap. */
export interface SingleFlight<T> {
    push: (value: T) => Promise<void>;
    /** True when a newer value arrived during the run that is in flight. */
    followUpPending: () => boolean;
}

export function createSingleFlight<T>(run: (value: T) => Promise<void>): SingleFlight<T> {
    let flight: Promise<void> | null = null;
    let again = false;
    let latest: T | undefined;

    return {
        followUpPending: () => again,
        push(value: T) {
            latest = value;
            if (flight) {
                again = true;
                return flight;
            }
            flight = (async () => {
                try {
                    do {
                        again = false;
                        const snapshot = latest as T;
                        await run(snapshot);
                    } while (again);
                } finally {
                    flight = null;
                }
            })();
            return flight;
        },
    };
}
