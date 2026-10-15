# Stable face selection rebuild replay

This local protocol replay shows a selected face held pending across a rebuild,
then restored only after the signature matcher finds one owner-and-geometry
match. The final state shows a rebuilt face that cannot be matched and is
cleared. This is a local test replay, not a deployed-behavior or hardware claim.

- [Replay video](demo.mp4)
- [Source](demo.ts)

Recreate with:

```sh
export PATH=/opt/homebrew/opt/node@22/bin:/opt/homebrew/bin:$PATH
npx esbuild docs/demos/stable-face-selection/demo.ts --bundle --platform=node --format=esm --outfile=/tmp/kcw-face-selection-demo.mjs
node /tmp/kcw-face-selection-demo.mjs
```

Verification: generated locally from the current `faceSignature.ts` matcher;
video inspected at 0.5 s and 3.5 s. No production deployment was performed.
