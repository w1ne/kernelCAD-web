# Rest-pose contact exclusion replay bundle

This bundle runs the same two-part overlap through the local mechanism checker
before and after `solvedModel({}, { ignore: [['a', 'b']] })`. The unignored run
must report `mechanism.rest-interpenetration`; the ignored run must not. Both
runs force the articulated sweep off with a zero budget, so this replay makes
no claim that joint travel is collision-free.

## Reproduce

From the repository root, with dependencies and `ffmpeg`/`ffprobe` installed:

```sh
npx tsx docs/demos/rest-contact-ignore-1271/capture-demo.mts
npx vitest run tests/unit/assemblies/restPoseContactGate.test.ts tests/unit/assemblies/ignoredCollisionAtJointLimit.test.ts --reporter=dot
KCAD_SLOW=1 npx vitest run src/modeling/runtime/mechanismTruth.test.ts -t '5b' --reporter=dot
```

The capture script runs two actual `checkMechanismTruth` validations, asserts
the before/after diagnostic behavior, writes the raw results to
[`results.json`](results.json), and renders them into [`demo.mp4`](demo.mp4).
[`verification.json`](verification.json) records invocation and video settings.
The joint-limit test independently checks that an ignored pair still collides
at sampled travel poses.

## Scope

- The replay demonstrates local CAD validation at the authored rest pose.
- `sweepBudget: 0` skips travel coverage; it remains unverified here.
- No physics simulation, deployment, or hardware acceptance is claimed.
