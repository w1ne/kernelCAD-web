import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { parseGalleryEntries } from './galleryEntries';

// Single-source-of-truth gate for the gallery.
//
// Any entry whose `codeLocal` points at `eval/tasks/<task>/solution-expert.kcad.ts`
// is a "reference-driven" entry — the eval task owns the model and (if it has
// a sibling `reference.jpg`) drives the photo-similarity scorer. For those,
// the gallery folder `examples/gallery/<slug>/` MUST carry a `score.json`
// whose composite and silhouetteIoU values clear the same thresholds the
// eval task harness uses, otherwise the entry isn't ready to ship.
//
// Why: see ~/.claude/projects/-home-andrii/memory/feedback_no_self_graded_markdown_when_scorer_exists.md
// — the meta-glasses entry was previously gated by a self-written
// `visual-checks.md` ("yes a stranger would recognise it") while the actual
// scorer (run after the fact) gave composite 0.25 / silhouetteIoU 0.28 vs
// thresholds 0.30 / 0.45. This test guarantees that never happens again:
// no scoring evidence in score.json, no live entry in entries.json.

const REPO_ROOT = resolve(__dirname, '../..');
const ENTRIES_PATH = join(REPO_ROOT, 'site/gallery/entries.json');
const EVAL_TASKS_PREFIX = '../../eval/tasks/';
const SILHOUETTE_THRESHOLD = 0.45;
const COMPOSITE_THRESHOLD = 0.30;

interface ScoreFile {
  composite: number;
  perGate: { silhouetteIoU: number; ssim: number; perceptualHash: number };
}

function loadEntries() {
  return parseGalleryEntries(JSON.parse(readFileSync(ENTRIES_PATH, 'utf8'))).entries;
}

function isReferenceDriven(codeLocal: string): { taskName: string; referencePath: string } | null {
  if (!codeLocal.startsWith(EVAL_TASKS_PREFIX)) return null;
  const rest = codeLocal.slice(EVAL_TASKS_PREFIX.length);
  const taskName = rest.split('/')[0];
  const taskDir = join(REPO_ROOT, 'eval/tasks', taskName);
  const referencePath = join(taskDir, 'reference.jpg');
  if (!existsSync(referencePath)) return null;
  return { taskName, referencePath };
}

describe('gallery entry scoring gate', () => {
  it('every reference-driven entry has a score.json above threshold', () => {
    const entries = loadEntries();
    const failures: string[] = [];
    let checked = 0;

    for (const entry of entries) {
      const ref = isReferenceDriven(entry.codeLocal);
      if (!ref) continue;
      checked++;

      const galleryDir = join(REPO_ROOT, 'examples/gallery', entry.slug);
      const scorePath = join(galleryDir, 'score.json');
      if (!existsSync(scorePath)) {
        failures.push(
          `entry "${entry.slug}" → ${entry.codeLocal} is reference-driven (task ${ref.taskName} has reference.jpg) ` +
            `but ${scorePath} is missing. Run: npx tsx scripts/scoreRenderVsReference.ts ` +
            `--render examples/gallery/${entry.slug}/<render>.png --reference ${ref.referencePath} --json > ${scorePath}`,
        );
        continue;
      }

      const score: ScoreFile = JSON.parse(readFileSync(scorePath, 'utf8'));
      if (typeof score.composite !== 'number' || typeof score.perGate?.silhouetteIoU !== 'number') {
        failures.push(`${scorePath}: missing composite or perGate.silhouetteIoU`);
        continue;
      }
      if (score.perGate.silhouetteIoU < SILHOUETTE_THRESHOLD) {
        failures.push(
          `${entry.slug}: silhouetteIoU ${score.perGate.silhouetteIoU.toFixed(3)} < ` +
            `${SILHOUETTE_THRESHOLD} — iterate against ${ref.referencePath} until it crosses the threshold ` +
            `before listing in entries.json.`,
        );
      }
      if (score.composite < COMPOSITE_THRESHOLD) {
        failures.push(
          `${entry.slug}: composite ${score.composite.toFixed(3)} < ${COMPOSITE_THRESHOLD}`,
        );
      }
    }

    if (failures.length > 0) {
      throw new Error(
        `Reference-driven gallery entries below scorer threshold (checked ${checked}):\n  - ${failures.join('\n  - ')}`,
      );
    }
  });

  it('an entry MUST NOT be in entries.json while its score.json is below threshold', () => {
    // Inverse of the above: if a gallery dir has a score.json that fails the
    // gates AND the slug appears in entries.json, fail. This catches the case
    // where someone writes a passing score.json then later the score regresses
    // but the entry stays live.
    const entries = loadEntries();
    const liveSlugs = new Set(entries.map((e) => e.slug));
    const failures: string[] = [];

    // Walk examples/gallery/<slug>/score.json for slugs that exist on disk.
    const galleryRoot = join(REPO_ROOT, 'examples/gallery');
    const slugs = readdirSync(galleryRoot).filter((name) => {
      const p = join(galleryRoot, name);
      return statSync(p).isDirectory();
    });

    for (const slug of slugs) {
      const scorePath = join(galleryRoot, slug, 'score.json');
      if (!existsSync(scorePath)) continue;
      const score: ScoreFile = JSON.parse(readFileSync(scorePath, 'utf8'));
      const sil = score.perGate?.silhouetteIoU ?? -Infinity;
      const comp = score.composite ?? -Infinity;
      const passes = sil >= SILHOUETTE_THRESHOLD && comp >= COMPOSITE_THRESHOLD;
      if (!passes && liveSlugs.has(slug)) {
        failures.push(
          `entry "${slug}" is in entries.json but ${scorePath} reports ` +
            `silhouette=${sil.toFixed(3)} composite=${comp.toFixed(3)} — remove from entries.json ` +
            `until iteration crosses thresholds.`,
        );
      }
    }

    expect(failures).toEqual([]);
  });
});
