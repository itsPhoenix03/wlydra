/* ────────────────────────────────────────────────────────────────────────────
 * Facing views — which way a character is turned, from where it is going.
 *
 *   front   toward the camera (down-screen)
 *   back    away from the camera (up-screen)
 *   side    left/right; side art faces image RIGHT and is flipped for left
 *
 * Each sprite's own art is one of these (its `native` view, see CRE_VIEWS /
 * ANI_VIEWS in assets.ts); the other views are `<base>_<view>` textures.
 * Drawn by tools/art/human-views.mjs (humans) and sprites/views/ (beasts).
 * ──────────────────────────────────────────────────────────────────────────── */

export type View = 'front' | 'back' | 'side';

/**
 * View for a screen-space travel vector. Diagonals keep whatever view is
 * current until the vector is clearly past them, so a creature walking at 45°
 * does not flicker between side and front.
 */
export function pickView(sdx: number, sdy: number, cur: View): View {
  const ax = Math.abs(sdx), ay = Math.abs(sdy);
  if (ax + ay < 1e-6) return cur;
  if (ax > ay * (cur === 'side' ? 0.75 : 1.33)) return 'side';
  if (ay > ax * (cur === 'side' ? 1.33 : 0.75)) return sdy < 0 ? 'back' : 'front';
  return cur;
}

/** Texture key of `base` seen from `view`, when its own art is the `native` view. */
export const viewKey = (base: string, view: View, native: View = 'front') =>
  view === native ? base : `${base}_${view}`;
