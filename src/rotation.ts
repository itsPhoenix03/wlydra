/* ────────────────────────────────────────────────────────────────────────────
 * Placement facings — what a rotatable placeable looks like at each `dir`.
 *
 * dir is 0–3 on the wire (the server keeps anything else as 0); R steps
 * through the facings a piece actually has:
 *   panels with a back (door, banner)   0 front · 1 front mirrored · 2 back · 3 back mirrored
 *   the corner railing (+ fence decor)  corner away · right · toward the camera · left
 *   anything else rotatable (walls)     0 / 1 — a wall turned half round looks the same
 * The extra art is drawn by tools/art/rotation-views.mjs.
 * ──────────────────────────────────────────────────────────────────────────── */

type Facing = [tex: string, flip: boolean];

const panel = (t: string): Facing[] => [[t, false], [t, true], [`${t}_back`, false], [`${t}_back`, true]];

const FACINGS: Record<string, Facing[]> = {
  mod_railing: [['mod_railing', false], ['mod_railing_e', false], ['mod_railing_s', false], ['mod_railing_e', true]],
  mod_door: panel('mod_door'),
  mod_banner_blank: panel('mod_banner_blank'),
};

/** Modular pieces R can turn (wall-slot blocks, pillars and floors look the same every way). */
export const ROTATABLE_MODS = new Set(['mod_door', 'mod_railing', 'mod_banner_blank']);

/** How many distinct facings a texture has: R cycles through this many. */
export const facingCount = (tex: string) => FACINGS[tex]?.length ?? 2;

/** Texture and mirror for `tex` placed at `dir`. */
export function facing(tex: string, dir: number): Facing {
  const f = FACINGS[tex];
  if (f) return f[((dir % f.length) + f.length) % f.length];
  return [tex, (dir & 1) === 1];
}
