// The extra facings rotatable placeables need for four-way rotation (src/rotation.ts).
//
//   node tools/art/rotation-views.mjs
//
//   mod_door_back          the door's inner face: the frame seen from the other
//                          side, so mirrored, with a Z-braced back, hinge
//                          knuckles and a pull ring
//   mod_banner_blank_back  the banner from behind: pole on the other side, the
//                          cloth's plain reverse
//   mod_railing_e/_s       the corner railing turned so its corner points right /
//                          toward the camera (the left corner is _e mirrored);
//                          mod_railing itself is the corner pointing away
//
// Same palettes, strokes and canvases as the originals in building_materials/.

import { writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = resolve(dirname(fileURLToPath(import.meta.url)), '../../assets/sprites/building_materials');
const r2 = (n) => +n.toFixed(2);
const write = (n, w, h, body) =>
  writeFileSync(`${OUT}/${n}.svg`, `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">\n${body}\n</svg>\n`);
const MIRROR = (w, s) => `<g transform="translate(${w} 0) scale(-1 1)">${s}</g>`;

// ── door, inner face ────────────────────────────────────────────────────────
write('mod_door_back', 42, 52,
  '<ellipse cx="21" cy="48" rx="14" ry="2" fill="#15120e" opacity=".18"/>' +
  MIRROR(43,
    '<path d="M8 17 22 8l13 8v28L21 51 8 43Z" fill="#69472f" stroke="#3c3028" stroke-width=".8"/>' +
    '<path d="M11 18 22 11l10 6v25l-11 6-10-6Z" fill="#9a6c41" stroke="#62452f" stroke-width=".6"/>' +
    '<path d="m14 19 8-5v30l-8-4Zm8-5 7 4v24l-7 2Z" fill="#a97c49"/>' +
    // vertical boards, battens top and bottom, the brace between them
    '<path d="M18 16.4V42.2M25.6 16.2V43" stroke="#7a5537" stroke-width=".6"/>' +
    '<path d="m14 21.6 8-5 7 4m-15 15.6 8-5 7 4" fill="none" stroke="#6b4b32" stroke-width="1.8"/>' +
    '<path d="m14 22.6 8-5 7 4m-15 15.6 8-5 7 4" fill="none" stroke="#c99a5e" stroke-width=".5"/>' +
    '<path d="M14.6 35.4 28.6 21.8" fill="none" stroke="#6b4b32" stroke-width="1.6"/><path d="M15 36 28.8 22.6" stroke="#c99a5e" stroke-width=".45"/>' +
    '<path d="m11 42 10 6 11-6" fill="none" stroke="#44332a" stroke-width=".8"/>') +
  // hinge knuckles now on the right edge, a pull ring where the knob was
  '<path d="M31.2 22.4v2.6M31.2 36.4v2.6" stroke="#505150" stroke-width="2"/><path d="M31.6 22.6v2M31.6 36.6v2" stroke="#a4a9a1" stroke-width=".6"/>' +
  '<circle cx="17" cy="31" r="1.7" fill="none" stroke="#6a5739" stroke-width=".9"/><circle cx="17" cy="29.4" r=".6" fill="#c5a268"/>');

// ── banner, reverse ─────────────────────────────────────────────────────────
write('mod_banner_blank_back', 34, 54,
  '<ellipse cx="17" cy="50" rx="10" ry="1.6" fill="#171310" opacity=".18"/>' +
  MIRROR(34,
    '<path d="m6 8 13-6 11 6-12 6Z" fill="#87613d" stroke="#443329" stroke-width=".65"/>' +
    '<path d="M10 10 18 15l9-4v27l-9-4-8 7Z" fill="#7a332e" stroke="#532d2d" stroke-width=".65"/>' +
    '<path d="m11 12 7 5 7-4v20l-7-3-7 6Z" fill="#94473a"/>' +
    '<path d="m11.6 14 6.4 4.4 6.4-3.6m-12.8 15.4 6.4-4.6 6.4 2.8" fill="none" stroke="#b9775a" stroke-width=".5" stroke-dasharray="1 .8"/>' +
    '<path d="m10 38 8-5 9 4-9 5Z" fill="#62352d"/>' +
    '<path d="m9 11 9 5 9-5" fill="none" stroke="#b98f5c" stroke-width="1"/>' +
    '<path d="M7 49 9 6" stroke="#4c382b" stroke-width="3.2" stroke-linecap="round"/>' +
    '<path d="M8 46 10 6" stroke="#a67a4a" stroke-width="1.3"/>' +
    '<path d="m8 7 11-5m-7 46 4 1" stroke="#d7aa6b" stroke-width=".65"/>') +
  '<circle cx="16" cy="8" r=".85" fill="#d3b077"/>');

// ── corner railing, turned ──────────────────────────────────────────────────
// Ground points of the footprint (flattened like mod_railing's): W, N, E, S.
// A run of two edges meeting at the corner: posts at each end, the corner and
// the edge midpoints; rails through the post tops, a mid rail, a light lower rail.
const G = { W: [10, 30.5], N: [32, 25.5], E: [54, 30.5], S: [32, 35.5] };
// the right-pointing run spans more screen height, so it gets a deeper footprint and shorter posts
const GE = { N: [32, 21], E: [54, 29], S: [32, 37] };
let POST_H = 15;
function railing(a, corner, b) {
  const line = (p) => 'M' + p.map(([x, y]) => `${r2(x)} ${r2(y)}`).join('L');
  const post = ([x, y]) => {
    const d = `M${r2(x)} ${r2(y - POST_H)}V${r2(y)}`;
    return `<path d="${d}" stroke="#453429" stroke-width="5" stroke-linecap="round"/><path d="${d}" stroke="#8b603e" stroke-width="3.4" stroke-linecap="round"/>`;
  };
  /** One edge, complete: mid rail behind its posts, then the top rail, lower rail and nails. */
  const run = (p, q) => {
    const pts = [p, [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2], q];
    const at = (k) => pts.map(([x, y]) => [x, y - POST_H * k]);
    return `<path d="${line(at(.62))}" fill="none" stroke="#5e432e" stroke-width="2.4"/>` +
      pts.map(post).join('') +
      `<path d="${line(at(1))}" fill="none" stroke="#4b382c" stroke-width="5" stroke-linecap="round"/>` +
      `<path d="${line(at(1))}" fill="none" stroke="#ad8050" stroke-width="3.6" stroke-linecap="round"/>` +
      `<path d="${line(at(.3))}" fill="none" stroke="#c39660" stroke-width="1.2"/>` +
      `<path d="${line(at(1).map(([x, y]) => [x, y + .9]))}" fill="none" stroke="#d7aa70" stroke-width=".6"/>` +
      [p, q].map(([x, y]) => `<circle cx="${r2(x)}" cy="${r2(y - POST_H)}" r=".7" fill="#e0b47a"/>`).join('');
  };
  // the edge further from the camera first, so the near one overlaps it
  const runs = [[a, corner], [corner, b]].sort((u, v) => (u[0][1] + u[1][1]) - (v[0][1] + v[1][1]));
  const shadowY = Math.max(a[1], b[1], corner[1]) + 1.5;
  return `<ellipse cx="${r2((Math.min(a[0], b[0], corner[0]) + Math.max(a[0], b[0], corner[0])) / 2)}" cy="${r2(shadowY)}" rx="${r2((Math.max(a[0], b[0], corner[0]) - Math.min(a[0], b[0], corner[0])) / 2 + 2)}" ry="2" fill="#15120f" opacity=".18"/>` +
    runs.map(([p, q]) => run(p, q)).join('');
}
POST_H = 13;
write('mod_railing_e', 64, 38, railing(GE.N, GE.E, GE.S));
POST_H = 15;
write('mod_railing_s', 64, 38, railing(G.E, G.S, G.W));

console.log('rotation views drawn');
