// The WYLDRA wordmark on the start screen (assets/sprites/wordmark.svg).
//
//   node tools/art/logo.mjs
//
// Carved capitals in ember-gold: every stroke is a straight bar cut lengthwise
// into a lit facet and a shadowed facet (a chisel ridge down its middle), the
// bowls of D and R faceted the same way, wedge serifs at the stroke ends. Under
// the face: a near-black outline and a deep block extrusion. Wild growth winds
// through the word — vines passing behind and in front of the letters, the Y
// sprouting like a sapling — and a Monolith crest with its rune lit sits above.
// Pure geometry: no font, no raster, nothing fetched.

import { writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = resolve(dirname(fileURLToPath(import.meta.url)), '../../assets/sprites/wordmark.svg');
const r2 = (n) => +n.toFixed(2);
const pts = (p) => p.map(([x, y]) => `${r2(x)} ${r2(y)}`).join(' ');

// ── geometry ────────────────────────────────────────────────────────────────
// Letters live in a cap band y 0..100. A stroke is a bar along its centreline,
// extended past both ends and clipped to the band, so stroke ends sit flat on the
// cap and base lines and meeting strokes form clean points.
const CAP = 100;
/** Clip a polygon to the band ylo ≤ y ≤ yhi (Sutherland–Hodgman, two edges). */
function band(poly, ylo = 0, yhi = CAP) {
  const clip = (P, inside, cut) => {
    const out = [];
    for (let i = 0; i < P.length; i++) {
      const a = P[i], b = P[(i + 1) % P.length];
      if (inside(a)) { out.push(a); if (!inside(b)) out.push(cut(a, b)); } else if (inside(b)) out.push(cut(a, b));
    }
    return out;
  };
  const at = (y0) => (a, b) => [a[0] + ((y0 - a[1]) / (b[1] - a[1])) * (b[0] - a[0]), y0];
  return clip(clip(poly, (p) => p[1] >= ylo, at(ylo)), (p) => p[1] <= yhi, at(yhi));
}
const LIGHT = [-0.55, -0.83];   // light from the upper left
/** A stroke from a to b, width w: [silhouette, lit facet, shadow facet]. ext extends the ends. */
function bar([ax, ay], [bx, by], w, ext = w * 0.6) {
  let dx = bx - ax, dy = by - ay; const L = Math.hypot(dx, dy); dx /= L; dy /= L;
  let nx = -dy, ny = dx;
  if (nx * LIGHT[0] + ny * LIGHT[1] < 0) { nx = -nx; ny = -ny; }   // n points at the light
  const A = [ax - dx * ext, ay - dy * ext], B = [bx + dx * ext, by + dy * ext], h = w / 2;
  const off = (p, k) => [p[0] + nx * h * k, p[1] + ny * h * k];
  return {
    sil: band([off(A, 1), off(B, 1), off(B, -1), off(A, -1)]),
    lit: band([off(A, 1), off(B, 1), B, A]),
    dark: band([A, B, off(B, -1), off(A, -1)]),
  };
}
/**
 * A stroke along a polyline (the bowls of D and R): one continuous band with
 * mitred corners, each segment faceted lit/shadowed toward the light, so the
 * facets of neighbouring segments meet cleanly on the miter lines.
 */
function path(P, w) {
  const h = w / 2;
  const seg = (i) => { const a = P[i], b = P[i + 1], L = Math.hypot(b[0] - a[0], b[1] - a[1]); return [(b[0] - a[0]) / L, (b[1] - a[1]) / L]; };
  // miter offset (left-hand normal side) at every vertex
  const off = P.map((p, i) => {
    const d0 = seg(Math.max(0, i - 1)), d1 = seg(Math.min(P.length - 2, i));
    const n0 = [-d0[1], d0[0]], n1 = [-d1[1], d1[0]];
    let mx = n0[0] + n1[0], my = n0[1] + n1[1];
    const ml = Math.hypot(mx, my); mx /= ml; my /= ml;
    const k = h / (mx * n1[0] + my * n1[1]);
    return [mx * k, my * k];
  });
  const L = P.map((p, i) => [p[0] + off[i][0], p[1] + off[i][1]]), R = P.map((p, i) => [p[0] - off[i][0], p[1] - off[i][1]]);
  const parts = [];
  for (let i = 0; i < P.length - 1; i++) {
    const d = seg(i), n = [-d[1], d[0]];
    const leftLit = n[0] * LIGHT[0] + n[1] * LIGHT[1] > 0;
    const left = [L[i], L[i + 1], P[i + 1], P[i]], right = [P[i], P[i + 1], R[i + 1], R[i]];
    parts.push({ sil: band([L[i], L[i + 1], R[i + 1], R[i]]), lit: band(leftLit ? left : right), dark: band(leftLit ? right : left) });
  }
  return parts;
}

/** A flat slab (serif / bar end) x0..x1, y0..y1: lit upper half, shadowed lower half. */
function slab(x0, x1, y0, y1) {
  const m = (y0 + y1) / 2;
  return { sil: [[x0, y0], [x1, y0], [x1, y1], [x0, y1]], lit: [[x0, y0], [x1, y0], [x1, m], [x0, m]], dark: [[x0, m], [x1, m], [x1, y1], [x0, y1]] };
}
/** Wedge serif: a slab whose outer ends taper toward the stroke (top or bottom). */
function wedge(cx, half, top) {
  const t = 9, s = 4;   // slab thickness, taper
  return top
    ? { sil: [[cx - half, 0], [cx + half, 0], [cx + half - s, t], [cx - half + s, t]], lit: [[cx - half, 0], [cx + half, 0], [cx + half - s * .5, t * .5], [cx - half + s * .5, t * .5]], dark: [[cx - half + s * .5, t * .5], [cx + half - s * .5, t * .5], [cx + half - s, t], [cx - half + s, t]] }
    : { sil: [[cx - half + s, CAP - t], [cx + half - s, CAP - t], [cx + half, CAP], [cx - half, CAP]], lit: [[cx - half + s, CAP - t], [cx + half - s, CAP - t], [cx + half - s * .5, CAP - t * .5], [cx - half + s * .5, CAP - t * .5]], dark: [[cx - half + s * .5, CAP - t * .5], [cx + half - s * .5, CAP - t * .5], [cx + half, CAP], [cx - half, CAP]] };
}

// ── letters (cap band 0..100; thick strokes 20, hairlines 11) ─────────────────
const T = 24, H = 13;
const LETTERS = [
  { ch: 'W', w: 140, parts: [
    bar([14, 0], [40, 100], T), bar([40, 100], [68, 6], H), bar([68, 6], [96, 100], T), bar([96, 100], [122, 0], H),
    wedge(14, 15, true), wedge(122, 13, true), wedge(68, 9, true),
  ] },
  { ch: 'Y', w: 108, parts: [
    bar([12, 0], [54, 56], T), bar([96, 0], [54, 56], H), bar([54, 50], [54, 100], T),
    wedge(12, 15, true), wedge(96, 13, true), wedge(54, 19, false),
  ] },
  { ch: 'L', w: 84, parts: [
    bar([22, 0], [22, 100], T), slab(10, 74, 82, 100), bar([70, 100], [76, 72], 10, 3),
    wedge(22, 19, true),
  ] },
  { ch: 'D', w: 108, parts: [
    ...path([[20, 8], [62, 8], [92, 34], [92, 66], [62, 92], [20, 92]], 16),
    bar([22, 0], [22, 100], T),
    wedge(22, 19, true), wedge(22, 19, false),
  ] },
  { ch: 'R', w: 108, parts: [
    ...path([[20, 8], [66, 8], [88, 26], [88, 36], [66, 54], [20, 54]], 15),
    bar([50, 52], [94, 100], T),
    bar([22, 0], [22, 100], T),
    wedge(22, 19, true), wedge(22, 19, false), wedge(96, 16, false),
  ] },
  { ch: 'A', w: 112, parts: [
    bar([56, 0], [14, 100], H), bar([56, 0], [98, 100], T), slab(34, 80, 62, 72),
    wedge(14, 14, false), wedge(98, 16, false),
  ] },
];
const GAP = 12;

// ── layout ──────────────────────────────────────────────────────────────────
const W = 820, HGT = 330;
const total = LETTERS.reduce((s, l) => s + l.w, 0) + GAP * (LETTERS.length - 1);
const X0 = (W - total) / 2, Y0 = 156;   // cap line of the word on the canvas
let x = X0;
const placed = LETTERS.map((l) => { const at = x; x += l.w + GAP; return { ...l, at }; });

const poly = (p, attrs) => `<polygon points="${pts(p)}" ${attrs}/>`;
const letterLayer = (key, attrs) => placed.map((l) =>
  `<g transform="translate(${r2(l.at)} ${Y0})">${l.parts.map((p) => poly(p[key], attrs)).join('')}</g>`).join('');

// ── wild growth ─────────────────────────────────────────────────────────────
const LEAF = 'M0 0Q5-6 13-1Q6 5 0 0Z';
const leaf = (x, y, rot, s = 1, tone = 0) =>
  `<g transform="translate(${r2(x)} ${r2(y)}) rotate(${r2(rot)}) scale(${r2(s * 1.45)})"><path d="${LEAF}" fill="${['#6fb558', '#4e9447', '#86c766'][tone]}" stroke="#163020" stroke-width="1.4"/><path d="M1 0Q6-1 11-1" fill="none" stroke="#2c5a32" stroke-width=".8"/></g>`;
const vine = (d, w = 5.6) =>
  `<path d="${d}" fill="none" stroke="#14281b" stroke-width="${w + 2.6}" stroke-linecap="round"/><path d="${d}" fill="none" stroke="#3d7a3d" stroke-width="${w}" stroke-linecap="round"/><path d="${d}" fill="none" stroke="#6aa858" stroke-width="${w * .3}" stroke-linecap="round" stroke-dasharray="6 9" opacity=".8"/>`;

// the main vine runs along the foot of the word, weaving behind and in front
const VINE = `M${r2(X0 - 34)} ${Y0 + 104}C${r2(X0 + 40)} ${Y0 + 60} ${r2(X0 + 120)} ${Y0 + 118} ${r2(X0 + 220)} ${Y0 + 86}` +
  `S${r2(X0 + 380)} ${Y0 + 112} ${r2(X0 + 470)} ${Y0 + 84}S${r2(X0 + 610)} ${Y0 + 120} ${r2(X0 + total + 36)} ${Y0 + 92}`;
// tendrils climbing the outer strokes
const CLIMB_L = `M${r2(X0 + 2)} ${Y0 + 98}C${r2(X0 - 16)} ${Y0 + 60} ${r2(X0 + 22)} ${Y0 + 40} ${r2(X0 + 4)} ${Y0 + 6}`;
const CLIMB_R = `M${r2(X0 + total - 4)} ${Y0 + 96}C${r2(X0 + total + 18)} ${Y0 + 66} ${r2(X0 + total - 20)} ${Y0 + 50} ${r2(X0 + total + 2)} ${Y0 + 20}`;
// where the vine passes in front of the letters (x ranges on the canvas)
const FRONT = [[X0 + 20, X0 + 74], [X0 + 250, X0 + 300], [X0 + 470, X0 + 520]];

const yY = placed[1];   // the Y sprouts: leaves off its arm tips
const sprout =
  leaf(yY.at + 6, Y0 - 4, -150, 1.15, 0) + leaf(yY.at + 16, Y0 - 6, -60, 1, 2) +
  leaf(yY.at + 92, Y0 - 5, -40, 1.1, 1) + leaf(yY.at + 100, Y0 - 3, -120, .95, 0) +
  `<path d="M${r2(yY.at + 12)} ${Y0 + 1}q-2-7 3-12M${r2(yY.at + 96)} ${Y0 + 1}q3-7-2-12" fill="none" stroke="#2c5a32" stroke-width="2" stroke-linecap="round"/>`;

const vineLeaves = [
  [X0 - 10, Y0 + 92, -30, 1.2, 0], [X0 + 60, Y0 + 82, 200, 1.1, 1], [X0 + 132, Y0 + 104, 20, 1, 2], [X0 + 200, Y0 + 88, -150, 1.1, 0],
  [X0 + 300, Y0 + 104, 30, 1.05, 1], [X0 + 360, Y0 + 98, -160, 1.15, 2], [X0 + 438, Y0 + 84, -20, 1, 0], [X0 + 540, Y0 + 106, 160, 1.1, 1],
  [X0 + 600, Y0 + 104, 10, 1, 2], [X0 + total + 22, Y0 + 90, -40, 1.2, 0],
  [X0 - 6, Y0 + 52, 210, 1, 1], [X0 + 8, Y0 + 22, -30, .95, 2], [X0 + total + 6, Y0 + 62, -20, 1, 1], [X0 + total - 6, Y0 + 32, 200, .95, 0],
].map(([x, y, r, s, t]) => leaf(x, y, r, s, t)).join('');

// ── crest: a Monolith with its rune lit, on a rule ────────────────────────────
const CX = W / 2, CY = 92;
const crest =
  // the rule with diamond tips
  `<path d="M${CX - 270} ${CY + 30}H${CX - 52}M${CX + 52} ${CY + 30}H${CX + 270}" stroke="#130b10" stroke-width="7" stroke-linecap="square"/>` +
  `<path d="M${CX - 270} ${CY + 30}H${CX - 52}M${CX + 52} ${CY + 30}H${CX + 270}" stroke="url(#litV)" stroke-width="3"/>` +
  [CX - 278, CX + 278].map((dx) => `<path d="M${dx} ${CY + 22}l8 8-8 8-8-8Z" fill="url(#litV)" stroke="#130b10" stroke-width="3"/>`).join('') +
  // ferns flanking the stone
  `<path d="M${CX - 20} ${CY + 52}C${CX - 50} ${CY + 40} ${CX - 62} ${CY + 18} ${CX - 56} ${CY - 6}M${CX + 20} ${CY + 52}C${CX + 50} ${CY + 40} ${CX + 62} ${CY + 18} ${CX + 56} ${CY - 6}" fill="none" stroke="#14281b" stroke-width="6" stroke-linecap="round"/>` +
  `<path d="M${CX - 20} ${CY + 52}C${CX - 50} ${CY + 40} ${CX - 62} ${CY + 18} ${CX - 56} ${CY - 6}M${CX + 20} ${CY + 52}C${CX + 50} ${CY + 40} ${CX + 62} ${CY + 18} ${CX + 56} ${CY - 6}" fill="none" stroke="#3d7a3d" stroke-width="3.4" stroke-linecap="round"/>` +
  [[-46, 36, 160], [-58, 16, 200], [-58, -2, 230], [46, 36, 20], [58, 16, -20], [58, -2, -50]].map(([dx, dy, r], i) => leaf(CX + dx, CY + dy, r, .9, i % 3)).join('') +
  // the stone: faceted hexagonal monolith
  `<path d="M${CX} ${CY - 54}L${CX + 22} ${CY - 34}L${CX + 20} ${CY + 46}L${CX} ${CY + 58}L${CX - 20} ${CY + 46}L${CX - 22} ${CY - 34}Z" fill="#1f2731" stroke="#0c0f14" stroke-width="5" stroke-linejoin="round"/>` +
  `<path d="M${CX} ${CY - 50}L${CX - 18} ${CY - 33}L${CX - 16} ${CY + 44}L${CX} ${CY + 54}Z" fill="#3a4a58"/>` +
  `<path d="M${CX} ${CY - 50}L${CX + 18} ${CY - 33}L${CX + 16} ${CY + 44}L${CX} ${CY + 54}Z" fill="#26323e"/>` +
  `<path d="M${CX - 16} ${CY - 31}L${CX} ${CY - 46}L${CX + 16} ${CY - 31}" fill="none" stroke="#6d8596" stroke-width="1.6"/>` +
  // the rune: a flame-leaf glyph, glowing
  `<g filter="url(#runeGlow)"><path d="M${CX} ${CY - 26}C${CX + 10} ${CY - 10} ${CX + 9} ${CY + 6} ${CX} ${CY + 18}C${CX - 9} ${CY + 6} ${CX - 10} ${CY - 10} ${CX} ${CY - 26}Z" fill="#7cf2d4"/>` +
  `<path d="M${CX} ${CY - 12}C${CX + 4} ${CY - 4} ${CX + 4} ${CY + 4} ${CX} ${CY + 10}C${CX - 4} ${CY + 4} ${CX - 4} ${CY - 4} ${CX} ${CY - 12}Z" fill="#e9fffa"/>` +
  `<path d="M${CX} ${CY + 18}V${CY + 34}M${CX - 8} ${CY + 26}H${CX + 8}" stroke="#7cf2d4" stroke-width="2.4" stroke-linecap="round"/></g>`;

// ── motes: blight sparks and embers ─────────────────────────────────────────
const motes = [
  [X0 + 160, Y0 - 22, 2.4, '#c38df2'], [X0 + 470, Y0 - 30, 2, '#c38df2'], [X0 + total + 20, Y0 + 4, 2.2, '#c38df2'], [X0 - 22, Y0 + 30, 1.8, '#c38df2'],
  [X0 + 300, Y0 + 132, 2.2, '#ffb347'], [X0 + 90, Y0 + 128, 1.6, '#ffb347'], [X0 + 560, Y0 + 134, 1.8, '#ffb347'], [CX + 80, CY - 30, 1.6, '#ffb347'],
].map(([x, y, r, c]) => `<circle cx="${r2(x)}" cy="${r2(y)}" r="${r * 2.6}" fill="${c}" opacity=".18"/><circle cx="${r2(x)}" cy="${r2(y)}" r="${r}" fill="${c}"/>`).join('');

// ── assemble ────────────────────────────────────────────────────────────────
const clips = FRONT.map(([a, b], i) => `<clipPath id="front${i}"><rect x="${r2(a)}" y="0" width="${r2(b - a)}" height="${HGT}"/></clipPath>`).join('');
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W * 1.5}" height="${HGT * 1.5}" viewBox="0 0 ${W} ${HGT}" role="img" aria-label="Wyldra">
<title>Wyldra</title>
<defs>
<linearGradient id="lit" x1="0" y1="0" x2="0" y2="${CAP}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#fff7de"/><stop offset=".45" stop-color="#ffd683"/><stop offset="1" stop-color="#f4a443"/></linearGradient>
<linearGradient id="dark" x1="0" y1="0" x2="0" y2="${CAP}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#f3a440"/><stop offset=".55" stop-color="#cf5d22"/><stop offset="1" stop-color="#84291a"/></linearGradient>
<linearGradient id="litV" x1="${CX - 260}" y1="0" x2="${CX + 260}" y2="0" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#f4a443"/><stop offset=".5" stop-color="#ffe6a6"/><stop offset="1" stop-color="#f4a443"/></linearGradient>
<filter id="runeGlow" x="-200%" y="-100%" width="500%" height="300%"><feGaussianBlur in="SourceGraphic" stdDeviation="3.2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
<filter id="emberGlow" x="-10%" y="-20%" width="120%" height="150%"><feGaussianBlur in="SourceAlpha" stdDeviation="9" result="b"/><feFlood flood-color="#ff7a2a" flood-opacity=".32"/><feComposite in2="b" operator="in" result="g"/><feMerge><feMergeNode in="g"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
${clips}
</defs>
${crest}
${vine(CLIMB_L, 3.4)}${vine(CLIMB_R, 3.4)}
${vine(VINE)}
<g filter="url(#emberGlow)">
<g transform="translate(0 9)">${letterLayer('sil', 'fill="#3b1a10" stroke="#130b10" stroke-width="7" stroke-linejoin="round"')}</g>
${letterLayer('sil', 'fill="#130b10" stroke="#130b10" stroke-width="7" stroke-linejoin="miter" stroke-miterlimit="2"')}
${letterLayer('lit', 'fill="url(#lit)"')}
${letterLayer('dark', 'fill="url(#dark)"')}
</g>
${FRONT.map((_, i) => `<g clip-path="url(#front${i})">${vine(VINE)}</g>`).join('')}
${sprout}
${vineLeaves}
${motes}
</svg>
`;
writeFileSync(OUT, svg);
console.log('wordmark drawn');
