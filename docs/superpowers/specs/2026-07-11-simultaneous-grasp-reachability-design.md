# Simultaneous Grasp Reachability Design

## Problem

The targeted physical-use-case reachability gate currently minimizes every declared contact independently across all sampled actuator poses. That can accept an impossible grasp: one finger may reach its target only while open and another only while closed, even though no single mechanism state satisfies both contacts.

## First-Principles Requirement

A grasp is one physical state. Every contact declared by a physical use case must therefore be evaluated against the same solved actuator pose. Independent best poses are useful diagnostics, but they are not evidence that the grasp exists.

## Chosen Approach

Retain the deterministic targeted sampler and coupling expansion. For every successfully solved sample, calculate all declared contact distances together. Continue tracking each contact's independent minimum so a specifically unreachable or uncheckable contact keeps the existing diagnostic. When every contact is individually reachable but no complete sample places all contacts within `maxSlipMm`, emit one use-case-level `assembly.physical-use-case.simultaneous-contacts-unreachable` error.

The diagnostic records the contact distances from the best common sample, chosen by the smallest worst contact distance. This makes the failure actionable without pretending that a discrete sampler is a continuous dynamics solver.

## Alternatives

- Keep independent per-contact minima: rejected because it proves several different configurations, not one grasp.
- Run continuous optimization or dynamics simulation now: deferred because topology, limits, couplings, and discrete common-pose feasibility must be coherent before a more expensive solver is meaningful.

## Behavior

- A contact that is never resolved or never enters tolerance produces the existing `contact-unreachable` diagnostic.
- A use case with two or more individually reachable contacts but no common passing sample produces one `simultaneous-contacts-unreachable` diagnostic.
- A use case with one contact keeps the existing behavior and never gets a redundant simultaneous-contact diagnostic.
- Failed mate solves are ignored as candidate states.
- A sample with an unresolved declared contact is not a complete common-pose candidate.
- Pose-envelope and targeted per-contact diagnostics remain deduplicated as they are today.
- `design_loop` preserves the simultaneous-contact error as a physical acceptance fact and includes it in the next repair prompt.

## Scope

This slice changes validation only. It does not alter hand geometry, add a continuous optimizer, claim force closure, or claim dynamic stability.

## Verification

1. A regression model has two contacts on one rotating link: contact A reaches at 0 degrees and contact B reaches at 90 degrees. The old implementation returns no issue; the new implementation must emit the simultaneous-contact issue.
2. Existing coupling-expansion and unusable-solve tests continue to pass.
3. The function-first bar-grasp skeleton still passes because all three contacts are aligned at one common actuator sample.
4. The rejected five-finger hand remains rejected; this slice must not weaken existing gates.
5. The agent design loop carries the exact simultaneous-contact code and repair hint into the next attempt.
