# Open issue and PR overlap check — 2026-11-11

- GitHub issue title/body searches for each of `lamella-clarifier`,
  `belt-filter-press`, `grit-classifier`, `rapid-sand-filter`, and
  `uv-disinfection-channel` returned no open issue matches. Raw CLI output is in
  `../open-target-check-output.txt`.
- The first paginated GitHub API file-path check stopped at the unauthenticated
  API rate limit. The audit then listed the 18 currently open PRs from the public
  repository page and inspected each public `.diff` for the five exact source and
  preview paths. No exact source or preview path matched; see
  `open-pr-path-check.log` and `../verify-open-pr-paths.sh`.
- PR #1258 surfaced in several text searches. Its public diff changes
  `backwash-pump-skid`, `pressure-sand-filter-vessel`, `reverse-osmosis-skid`,
  and `vertical-turbine-pump` in this kit, not any sampled path.

This checks path overlap in the open PR snapshot at audit time. It is not a claim
that no future PR may target these assets.
