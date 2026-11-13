# Develop sync — 2026-11-13

After the pressure-vessel commit `54848148a`, PR #1258 reported a conflict because
`develop` advanced from `88c009e92` to `eb3dfd567`. The new upstream commit is the
retaining-ring repair from [PR #1373](https://github.com/w1ne/kernelCAD-web/pull/1373).
The only conflicts were the generated catalog index and the retaining-ring source
and preview. The source and preview were resolved to the upstream versions; the
index is regenerated from source and must not be hand-merged. This sync does not
change or duplicate the pressure-vessel material correction.
