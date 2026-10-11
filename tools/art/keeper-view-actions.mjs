// The keeper's action clips seen from the side and from behind, posed from the
// same parts as tools/art/human-views.mjs (so they stay on-model with the
// back/side walk) and timed to match the front clips frame for frame.
//
//   node tools/art/keeper-view-actions.mjs
//
// Writes keeper_side_<clip>_NN and keeper_back_<clip>_NN for every clip the rig
// plays (same frame count as keeper_<clip>_NN; rig.ts samples them the same way).
//
// Side: facing image right, the near (right) hand holds the tool, the strike
// lands ahead (+x). Back: the right hand is on image right; anything in front
// of the keeper is drawn behind the body, anything between the keeper and the
// camera over it, and a tool pointing away from the camera is foreshortened.
//
// Coordinates: hands and tool tips are given in IMAGE space and mapped into the
// leaning body (toBody), so ground contact stays where it is drawn. Tool angle
// θ is image degrees: 0 = level toward +x, −90 = straight up. Swings that reach
// past the body use a 64×48 canvas, viewBox −16..48, like the front clips.

import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  write, r2, pad, mix, CHARS, SHADOW, DARK, legPath, trousers, arm, swingArm,
  backTorso, backWear, backHead, backBoot, sideBoot, sideTorso, sideWear, sideHead,
  backProp, sideProp, scarfTail,
} from './human-views.mjs';

// The poses draw whichever character is current (npc-view-actions.mjs switches it).
let c = CHARS.keeper;
const useChar = (name) => { c = CHARS[name]; };
const gear = (m) => (c.gear ? m : '');
const SVG32 = '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="48" viewBox="0 0 32 48">';
const SVG64 = '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="48" viewBox="-16 0 64 48">';
const out = (name, body, wide) => write(name, `${wide ? SVG64 : SVG32}\n${body}\n</svg>\n`);
const rad = (d) => (d * Math.PI) / 180;
const dir = (th) => [Math.cos(rad(th)), Math.sin(rad(th))];

/** Image point → leaning-body point (inverse of translate(0 dy) rotate(lean pivot)). */
const toBody = ([x, y], lean, dy, [px, py]) => {
  const a = rad(-lean), qx = x - px, qy = y - dy - py;
  return [px + qx * Math.cos(a) - qy * Math.sin(a), py + qx * Math.sin(a) + qy * Math.cos(a)];
};
/** Elbow for a reach from shoulder `s` to hand `h`, bowed `bow` px (+ = below / behind the line). */
const elbow = (s, h, bow) => {
  const mx = (s[0] + h[0]) / 2, my = (s[1] + h[1]) / 2, d = Math.hypot(h[0] - s[0], h[1] - s[1]) || 1;
  return [mx - ((h[1] - s[1]) / d) * bow, my + ((h[0] - s[0]) / d) * bow];
};
/** A prop at hand `h` pointing along θ (handle along −y in prop space); `sy` foreshortens it. */
const tool = (art, h, th, sy = 1) =>
  `<g transform="translate(${r2(h[0])} ${r2(h[1])}) rotate(${r2(th + 90)})${sy !== 1 ? ` scale(1 ${sy})` : ''}">${art}</g>`;

// ── props: the front clips' art (keeper-frames.mjs and the pack's build/meds) ─
const HANDLE = '<path d="M-.8 4V-12H.8V4Z" fill="#805b3b" stroke="#5d422f" stroke-width=".45"/>';
const AXE = HANDLE +
  '<path d="M.6-14.2 5.6-15.6Q7.6-11.6 5.6-7.6L.6-9.2Z" fill="#9aa3a8" stroke="#3e4b50" stroke-width=".55"/>' +
  '<path d="M5.4-14.8Q6.9-11.6 5.4-8.4" fill="none" stroke="#e1e8e2" stroke-width=".55"/>' +
  '<path d="M-.6-13.6-2.6-13.1V-10.4L-.6-10Z" fill="#6c767b" stroke="#3e4b50" stroke-width=".45"/>';
const PICK = HANDLE +
  '<path d="M-7.2-10Q0-16.4 7.2-10L6.4-9.2Q0-13.6-6.4-9.2Z" fill="#b8bec8" stroke="#3e4b50" stroke-width=".55"/>' +
  '<path d="M-5-11.6Q0-14.6 5-11.6" fill="none" stroke="#eef2f4" stroke-width=".45"/>' +
  '<path d="M-1.3-13.6H1.3V-10.6H-1.3Z" fill="#6c767b"/>';
const SPICK = PICK
  .replace('#b8bec8', '#6a6f78').replace('stroke="#3e4b50"', 'stroke="#2d3036"')
  .replace('#eef2f4', '#9aa0a8').replace('#6c767b', '#4a4e55');
const SWORD =
  '<path d="M-1.3 -1 -2.1 -12 0 -16 2.1 -12 1.3 -1Z" fill="#c4d4d2" stroke="#415963" stroke-width=".55"/>' +
  '<path d="M0 -14V-3" stroke="#eff7e8" stroke-width=".65"/>' +
  '<path d="M-4 -2 4 -2 4 -.7 -4 -.7Z" fill="#8b6e4c"/>' +
  '<path d="M-.8 -1H.8V4H-.8Z" fill="#694a34"/><circle cx="0" cy="4" r="1" fill="#b79a6d"/>';
const ICE_MAP = { '#c4d4d2': '#9ad4e8', '#415963': '#2f6f86', '#eff7e8': '#e6fbff', '#8b6e4c': '#4a5568', '#694a34': '#3b4250' };
const ICE = SWORD.replace(/#[0-9a-f]{6}/gi, (x) => ICE_MAP[x.toLowerCase()] ?? x);
const SPRIG =
  '<path d="M0 0Q-.6-2.6 .8-4.4" fill="none" stroke="#5a7a34" stroke-width=".7"/>' +
  '<path d="M.6-3.6Q3-5.6 4-3.2Q2-2.2.6-3.6Z" fill="#7fae4e" stroke="#3f5e27" stroke-width=".4"/>' +
  '<path d="M.2-2.2Q-2.6-3.8-3.4-1.4Q-1.4-.6.2-2.2Z" fill="#6c9a42" stroke="#3f5e27" stroke-width=".4"/>';
const TORCH =
  '<path d="M-1 6H1L1.4-3H-1.4Z" fill="#754a30" stroke="#3e2b25" stroke-width=".5"/>' +
  '<path d="M-1.9-3.8H1.9V-1.2H-1.9Z" fill="#483b32" stroke="#201d1e" stroke-width=".4"/>' +
  '<path d="M0-12Q3-9 2.4-6.4Q2-4.4 0-3.8Q-2-4.4-2.4-6.4Q-3-9 0-12Z" fill="#e3612e"/>' +
  '<path d="M0-9.6Q1.4-7.6 1-6.2Q.7-4.8 0-4.6Q-.8-4.9-1-6.2Q-1.2-7.6 0-9.6Z" fill="#ffca61"/>';
const HAMMER =
  '<path d="M-.8 2V-12H.8V2Z" fill="#805b3b" stroke="#5d422f" stroke-width=".45"/>' +
  '<path d="M-6 -14H6V-10H-6Z" fill="#808b8d" stroke="#3e4b50" stroke-width=".6"/><path d="M-4.5 -13.3H4.5" stroke="#bbc4ba" stroke-width=".65"/>';
// the vial hangs cork-up from the fingers: prop space +y is down the glass
const VIAL =
  '<path d="M-1.5 -1H1.5V1H-1.5Z" fill="#dac9a0"/>' +
  '<path d="M-2 1H2L2.5 6Q0 8-2.5 6Z" fill="#76b8a9" stroke="#3e6862" stroke-width=".55"/>' +
  '<path d="M-1 2H1V5H-1Z" fill="#c5e7ce" opacity=".85"/>';
const BANDAGE = '#d8c9ac', BANDAGE_LINE = '#82776a';
const FROST = '#b7d9e0', BREATH = '#c7dae0', SWEAT = '#a7d9e2';
/** Paddle from the top grip T through the lower hand L, blade past L; faded while under water. */
const paddle = (T, L, wet, len = 12.5) => {
  const dx = L[0] - T[0], dy = L[1] - T[1], d = Math.hypot(dx, dy), ux = dx / d, uy = dy / d;
  const top = [T[0] - ux * 2, T[1] - uy * 2], neck = [L[0] + ux * (len - 3.5), L[1] + uy * (len - 3.5)], bc = [L[0] + ux * len, L[1] + uy * len];
  const ang = r2((Math.atan2(uy, ux) * 180) / Math.PI - 90);
  const shaft = `M${r2(top[0])} ${r2(top[1])}L${r2(neck[0])} ${r2(neck[1])}`;
  return `<path d="${shaft}" stroke="#3e2b25" stroke-width="2.1" stroke-linecap="round"/>` +
    `<path d="${shaft}" stroke="#8a5f3a" stroke-width="1.3" stroke-linecap="round"/>` +
    `<g opacity="${wet ? .5 : 1}"><ellipse cx="${r2(bc[0])}" cy="${r2(bc[1])}" rx="1.9" ry="3.8" transform="rotate(${ang} ${r2(bc[0])} ${r2(bc[1])})" fill="#9a6b40" stroke="#3e2b25" stroke-width=".5"/></g>`;
};
// swim: no ground shadow, everything below the waist fades under the surface
// (same mask and waterline as the front swim frames)
const UNDERWATER = (w) =>
  '<defs><linearGradient id="kw-g" x1="0" y1="0" x2="0" y2="48" gradientUnits="userSpaceOnUse">' +
  '<stop offset=".69" stop-color="#fff"/><stop offset=".74" stop-color="#6e6e6e"/></linearGradient>' +
  `<mask id="kw-m" maskUnits="userSpaceOnUse" x="${w ? -16 : 0}" y="0" width="${w ? 64 : 32}" height="48">` +
  `<rect x="${w ? -16 : 0}" width="${w ? 64 : 32}" height="48" fill="url(#kw-g)"/></mask></defs>`;
const WATERLINE = '<path d="M5 34.2Q10.5 32.9 16 34.2T27 34.2" fill="none" stroke="#e3f6ff" stroke-width=".7" opacity=".75"/>';
const wet = (body, w) => `${UNDERWATER(w)}<g mask="url(#kw-m)">${body}</g>${WATERLINE}`;

// ════════════════════════════════════════════════════════════════════════════
// SIDE POSE
// ════════════════════════════════════════════════════════════════════════════
const S_FAR = [15.2, 25.8], S_NEAR = [16.4, 25.8];
/** One leg: [dx, lift, tilt?] from the standing ankle (16, 42), hips at 34 + dy. */
const sLeg = (dy, [dx, lift, tilt], far) => {
  const hip = [16 + (far ? -0.6 : 0.6), 34 + dy];
  const ankle = [16 + dx, 42 - lift];
  const t = tilt ?? (lift > 0.05 ? (dx < 0 ? 22 * Math.min(1, lift / 1.4) : -8 * Math.min(1, lift / 1.4)) : 0);
  return trousers(c, legPath(hip, ankle), far) + sideBoot(c, ankle[0], ankle[1], t, far);
};
/** Seated (boat): thighs forward to the knees, shins hidden by the near gunwale. */
const sSeated = (dy) => {
  const thigh = (far) => {
    const p = `M${far ? 15.4 : 16.6} ${r2(35 + dy)}L${far ? 20.6 : 21.6} ${r2(36.4 + dy)}`;
    return trousers(c, p, far);
  };
  return thigh(true) + thigh(false);
};
/**
 * Arm spec: { h: [x,y] image hand, bow } or { a, b } swing angles (body space).
 * Returns [svg, bodyHand].
 */
const sArm = (spec, s, far, lean, dy, pivot) => {
  if (spec.h) {
    const h = toBody(spec.h, lean, dy, pivot);
    return [arm(c, s, elbow(s, h, spec.bow ?? 1.4), h, far), h];
  }
  const r = swingArm(c, s, spec.a ?? 0, spec.b ?? 10, far);
  return [r.svg, r.hand];
};

/**
 * layers (svg strings, body space unless noted):
 *   ground  image space, behind the legs      back     behind the far arm
 *   prehead over the torso, under the head     mid      over the head, under the near arm
 *   front   over everything                    over     image space, over everything
 * tools: [{ art, h (image), th (image°), layer, sy }]
 */
function side({
  dy = 0, lean = 0, pivot = [16, 35], far = [-1.2, 0], near = [1.4, 0], seated = false,
  fa = { a: 8, b: 12 }, na = { a: -8, b: 10 }, tools = [], layers = {}, face = 'calm', headRot = 0, shadow = true, bx = 0,
  nearBehindHead = false, prop = true,
} = {}) {
  const L = { ground: '', back: '', prehead: '', mid: '', front: '', over: '', ...layers };
  for (const t of tools) {
    const h = toBody(t.h, lean, dy, pivot);
    L[t.layer ?? 'front'] += tool(t.art, h, t.th - lean, t.sy);
  }
  const [farSvg, farHand] = sArm(fa, S_FAR, true, lean, dy, pivot);
  if (prop) L.back = scarfTail(c, 0) + sideProp(c, farHand) + L.back;
  const [nearSvg] = sArm(na, S_NEAR, false, lean, dy, pivot);
  const legs = seated ? sSeated(dy) : sLeg(dy, far, true) + sLeg(dy, near, false);
  const head = `<g transform="rotate(${headRot} 16 23)"><path d="M14.6 21.6h3.2v3.6h-3.2Z" fill="${c.skin}"/>${sideHead(c, face)}</g>`;
  return (shadow ? SHADOW : '') + L.ground + legs +
    `<g transform="translate(${r2(bx)} ${r2(dy)}) rotate(${r2(lean)} ${pivot[0]} ${pivot[1]})">` +
    L.back + farSvg + sideTorso(c) + sideWear(c) + gear('<!--gear:under--><!--gear:over-->') + L.prehead +
    (nearBehindHead ? nearSvg + head + L.mid : head + L.mid + nearSvg) + L.front + '</g>' + L.over;
}

// ════════════════════════════════════════════════════════════════════════════
// BACK POSE
// ════════════════════════════════════════════════════════════════════════════
const B_L = [10.4, 25.2], B_R = [21.6, 25.2];
/** One leg seen from behind: [fwd, lift, dx?]; forward sits higher on screen, a lifted foot shows its sole. */
const bLeg = (side, dy, [fwd, lift, dx = 0]) => {
  const hip = [side === 'L' ? 12.6 : 19.4, 34 + dy];
  const ankle = [(side === 'L' ? 12.4 : 19.6) + dx, 42 - lift - fwd * 0.45];
  const p = legPath(hip, ankle).replace(/L([\d.-]+) ([\d.-]+)L/, (_, kx, ky) => `L${r2((+kx + hip[0] + ankle[0]) / 3)} ${ky}L`);
  return trousers(c, p, false) + backBoot(c, ankle[0], ankle[1], lift);
};
const bArm = (spec, s, lean, dy, pivot, sy) => {
  if (spec.h) {
    let h = toBody(spec.h, lean, dy, pivot);
    if (sy !== 1) h = [h[0], 37 - (37 - h[1]) / sy];        // undo the body squash for the hand
    const bow = spec.bow ?? (s[0] < 16 ? -1.2 : 1.2);        // elbows out by default
    let e = spec.e ? toBody(spec.e, lean, dy, pivot) : elbow(s, h, bow);
    if (spec.e && sy !== 1) e = [e[0], 37 - (37 - e[1]) / sy];
    return [arm(c, s, e, h, false), h];
  }
  const r = swingArm(c, s, spec.a ?? 0, spec.b ?? 6, false);
  return [r.svg, r.hand];
};
/**
 * layers: ground (image, behind legs) · behind (in front of the keeper: hidden by the body)
 *         mid (over the torso, under the arms) · front (over the arms, under the head)
 *         over (between the keeper and the camera: over everything) · top (image space, last)
 * Arms with { behind: true } reach forward and are drawn behind the torso; { over: true }
 * reach behind the head (toward the camera) and are drawn over it. { e } fixes the elbow.
 * sy squashes the body toward the hips (bending forward, away from the camera).
 */
function back({
  dy = 0, lean = 0, pivot = [16, 40], l = [0, 0], r = [0, 0], seated = false, sy = 1,
  la = { a: -9, b: 6 }, ra = { a: 9, b: -6 }, tools = [], layers = {}, headDy = 0, headRot = 0, shadow = true, bx = 0,
  prop = true,
} = {}) {
  const L = { ground: '', behind: '', mid: '', front: '', over: '', top: '', ...layers };
  for (const t of tools) {
    let h = toBody(t.h, lean, dy, pivot);
    if (sy !== 1) h = [h[0], 37 - (37 - h[1]) / sy];
    L[t.layer ?? 'behind'] += tool(t.art, h, t.th - lean, t.sy);
  }
  const [armL, handL] = bArm(la, B_L, lean, dy, pivot, sy), [armR] = bArm(ra, B_R, lean, dy, pivot, sy);
  if (prop) L.over += backProp(c, handL);         // props in the left hand (staff, bundle…)
  const legs = seated ? '' : bLeg('L', dy, l) + bLeg('R', dy, r);
  const squash = sy !== 1 ? ` translate(0 37) scale(1 ${sy}) translate(0 -37)` : '';
  const head = `<g transform="translate(0 ${r2(headDy)}) rotate(${headRot} 16 23)"><path d="M14 22h4v3h-4Z" fill="${c.skin}"/>${backHead(c)}</g>`;
  return (shadow ? SHADOW : '') + L.ground + legs +
    `<g transform="translate(${r2(bx)} ${r2(dy)}) rotate(${r2(lean)} ${pivot[0]} ${pivot[1]})${squash}">` +
    L.behind + (la.behind ? armL : '') + (ra.behind ? armR : '') +
    backTorso(c) + backWear(c) + gear('<!--gear:under-->') + L.mid +
    (la.behind || la.over ? '' : armL) + (ra.behind || ra.over ? '' : armR) + gear('<!--gear:over-->') + L.front + head +
    (la.over ? armL : '') + (ra.over ? armR : '') + L.over + '</g>' + L.top;
}

// ════════════════════════════════════════════════════════════════════════════
// SIDE CLIPS
// ════════════════════════════════════════════════════════════════════════════
const SIDE = {};

// chop: one-handed, cocked back over the shoulder, cut lands level in the trunk ahead
//   lean, dy, hand, θ, tool layer, face
SIDE.chop = [
  [0,  0,   [21.5, 31],  -60,  'front',   'calm'],   // 01 ready, axe forward-up
  [-4, 0,   [18.5, 25],  -115, 'front',   'calm'],   // 02 lift
  [-8, .5,  [13.6, 21.4], -122, 'prehead', 'grit'],   // 03 cocked behind the head
  [0,  1,   [22, 23.5],  -65,  'front',   'grit'],   // 04 swinging through
  [6,  1.5, [27, 28],    -6,   'front',   'grit'],   // 05 impact: level into the trunk
  [6,  1.5, [27, 28.5],  -2,   'front',   'grit'],   // 06 bite, held
  [2,  .8,  [24.5, 29.5], -28, 'front',   'calm'],   // 07 wrench free
  [0,  0,   [21.5, 31],  -52,  'front',   'calm'],   // 08 recover
].map(([lean, dy, h, th, layer, face]) => side({
  lean, dy, pivot: [16, 40], far: [-2.4, 0], near: [2.6, 0], face,
  na: { h, bow: th < -90 ? -1.6 : 1.6 }, fa: { h: [12.5 + lean * .2, 34.5], bow: 1.2 },
  tools: [{ art: AXE, h, th, layer }], nearBehindHead: layer === 'prehead',
}));

// picks: two-handed overhead swing, tip driven into the ground ahead
const sideMine = (art) => [
  [0,  0,   [21.5, 31],  -58,  'front'],     // 01 ready
  [-4, 0,   [18.5, 24],  -110, 'front'],     // 02 raise
  [-8, 0,   [14.4, 18.4], -148, 'prehead'],   // 03 over the head
  [0,  .5,  [22, 21.5],  -78,  'front'],     // 04 coming down
  [8,  2,   [25.5, 31],  48,   'front'],     // 05 strike the ground ahead
  [9,  2.2, [26, 31.5],  52,   'front'],     // 06 bite, held
  [4,  1,   [23.5, 30],  20,   'front'],     // 07 pry loose
  [0,  0,   [21.5, 31],  -45,  'front'],     // 08 recover
].map(([lean, dy, h, th, layer], i) => {
  const [ux, uy] = dir(th);
  const grip = [h[0] - ux * 4, h[1] - uy * 4];            // far hand lower on the haft
  return side({
    lean, dy, pivot: [16, 40], far: [-2.6, 0], near: [2.4, 0], face: i >= 3 && i <= 5 ? 'grit' : 'calm',
    na: { h, bow: th < -90 ? -1.6 : 1.6 }, fa: { h: grip, bow: th < -90 ? -1.2 : 1.8 },
    tools: [{ art, h, th, layer }], nearBehindHead: layer === 'prehead',
  });
});
SIDE.mine = sideMine(PICK);
SIDE.spick = sideMine(SPICK);

// slash: a level cut at the enemy ahead — draw back, lunge, cut through, recover
//   lean, dy, near foot dx, far foot dx, hand, θ, far hand
const SLASH = [
  [-3, 0,   1.6, -1.6, [14.5, 29],  172,  [19.5, 33]],   // 01 draw back
  [-4, .5,  1.8, -2,   [12.5, 27],  -158, [20.5, 32]],   // 02 coiled, blade level behind
  [2,  1,   3.2, -2.6, [20.5, 26],  -30,  [12.5, 31]],   // 03 lunge, blade sweeping out
  [5,  1.5, 4,   -3,   [26.5, 26],  0,    [11, 30.5]],   // 04 impact: arm and blade level
  [5,  1.5, 4,   -3,   [26.5, 27.5], 12,  [11, 31]],     // 05 follow-through, tip dipping
  [2,  1,   3,   -2.4, [22.5, 29],  28,   [12, 32]],     // 06 drawing back
  [0,  .5,  2,   -1.8, [19.5, 32],  55,   [13, 33.5]],   // 07 recover, blade lowered
];
const sideSlash = (art) => SLASH.map(([lean, dy, nf, ff, h, th, fh]) => side({
  lean, dy, pivot: [16, 40], far: [ff, 0], near: [nf, 0], face: 'grit',
  na: { h, bow: 1.4 }, fa: { h: fh, bow: 1.2 },
  tools: art ? [{ art, h, th, layer: 'front' }] : [],
}));
SIDE.slash = sideSlash(SWORD);
SIDE.islash = sideSlash(ICE);
SIDE.punch = sideSlash('');

// pickup: bend at the hips, reach the ground ahead, grab, straighten
SIDE.pickup = [
  [6,  1,   [21, 33.5],   false],
  [16, 3,   [23.5, 39.5], false],
  [21, 3.5, [24, 42],     false],
  [21, 3.5, [23.6, 41.6], true],
  [11, 2,   [22, 37],     true],
  [4,  .5,  [20.5, 32.5], true],
  [0,  0,   [19.5, 32.5], true],
].map(([lean, dy, h, held]) => side({
  lean, dy, far: [-1.2, 0], near: [1.8, 0],
  na: { h, bow: 1.2 }, fa: { a: 14 + lean * .4, b: 14 },
  tools: held ? [{ art: SPRIG, h: [h[0], h[1] - 1], th: -90, layer: 'front' }] : [],
}));

// torch: hold it out, kneel on the near knee, plant it ahead, let go, stand
{
  const PLANT = [25.5, 38];
  const KNEEL = (k) => ({ far: [2.6 * k, 0], near: [-3 * k, 0, 32 * k] });
  SIDE.torch = [
    [0,  0,   [22, 31],    'hand',    0],
    [6,  1,   [23, 33.5],  'hand',    .4],
    [12, 3,   [24.5, 36],  'hand',    1],
    [14, 3.5, PLANT,       'planted', 1],
    [13, 3.2, [22.5, 35],  'planted', 1],
    [6,  1.2, [20.5, 33],  'planted', .4],
    [0,  0,   [19.5, 33],  'planted', 0],
  ].map(([lean, dy, h, where, k]) => side({
    lean, dy, ...KNEEL(k), na: { h, bow: 1.3 }, fa: { a: 18, b: 16 },
    tools: where === 'hand' ? [{ art: TORCH, h, th: -90, layer: 'front' }] : [],
    layers: where === 'planted' ? { ground: tool(TORCH, PLANT, -90) } : {},
  }));
}

// jump (standing): crouch, launch on the toes, tuck, fall, soft landing
//   dy, lift, far dx, near dx, toe tilt, arm swing°, face
SIDE.jump = [
  [3,  0,   -1.4, 1.6, 0,  -35, 'calm'],
  [-1, .6,  -1,   1.2, 26, 50,  'calm'],
  [0,  2.6, -.6,  1.6, 10, 62,  'open'],
  [0,  3.6, -.2,  2,   4,  45,  'open'],
  [0,  1.4, -1,   1.6, 12, 25,  'open'],
  [3,  0,   -1.4, 1.6, 0,  -12, 'calm'],
  [1,  0,   -1.2, 1.4, 0,  0,   'calm'],
].map(([dy, lift, fd, nd, tilt, a, face]) => side({
  dy, shadow: false, far: [fd, lift, tilt], near: [nd, lift, tilt], face,
  fa: { a: a + 6, b: 16 }, na: { a, b: 14 },
}));

// leap (running): the stride carries into the jump, lands on the lead (near) foot
//   dy, lean, back [dx, lift], lead [dx, lift], arm swing, face
SIDE.leap = [
  [.5,  6, [-3.4, 0],   [2.8, 2.6], .5, 'calm'],
  [-.5, 7, [-4, 1.4],   [4, 2.4],   .7, 'open'],
  [0,   6, [-4.4, 2.4], [4.4, 2],   .7, 'open'],
  [0,   5, [-3.6, 3],   [4, 2.6],   .6, 'open'],
  [0,   5, [-2.2, 2.6], [3.6, .6],  .4, 'calm'],
  [2.5, 5, [-2, 1],     [3, 0],     .3, 'calm'],
  [.8,  3, [-.4, 1.2],  [1.6, 0],   .1, 'calm'],
].map(([dy, lean, bk, ld, sw, face]) => side({
  dy, lean, pivot: [16, 40], shadow: false, far: bk, near: ld, face,
  fa: { a: sw * 50, b: 18 }, na: { a: -sw * 50, b: 12 },
}));

// row: seated in the boat, two-handed stroke on the near side — blade in ahead,
// pulled back to the hip, lifted out and carried forward. Frame 05 doubles as
// the resting pose (rig.ts: row[4]).
//   lean, top hand T (far), lower hand L (near), blade in water
SIDE.row = [
  [5,  [21.5, 26],   [25.5, 32],   true],
  [3,  [20, 26.5],   [23.5, 33.5], true],
  [0,  [18.5, 27],   [20, 34],     true],
  [-3, [17.5, 26.5], [14.5, 33],   true],
  [-2, [21.5, 29.6], [14.5, 31],   false],
  [0,  [20, 26],     [18.5, 31],   false],
  [3,  [21, 25],     [22.5, 30.5], false],
  [5,  [21.5, 25.5], [25, 31.5],   false],
].map(([lean, T, L, w]) => side({
  lean, pivot: [16, 36], seated: true, shadow: false,
  fa: { h: T, bow: -1.2 }, na: { h: L, bow: 1.4 },
  layers: { mid: paddle(toBody(T, lean, 0, [16, 36]), toBody(L, lean, 0, [16, 36]), w) },
}));

// swim: upright in the water, breaststroke in profile — reach ahead, sweep down
// and back, draw the hands in under the chin; the legs kick under the surface
SIDE.swim = Array.from({ length: 9 }, (_, k) => {
  const ph = (k / 9) * Math.PI * 2;
  const reach = Math.cos(ph), sweep = Math.sin(ph);
  const nh = [20.5 + reach * 5.5, 31.5 + sweep * 2.2];
  const fh = [19.5 + reach * 5, 31 + sweep * 2];
  const kick = Math.sin(ph + 1);
  return wet(side({
    dy: Math.sin(ph * 2) * .5, lean: 8, pivot: [16, 36], shadow: false, face: k % 3 === 0 ? 'open' : 'calm',
    far: [-2.6 - kick, 1.4 + kick * .8, 30], near: [-1.4 + kick, 1.4 - kick * .8, 30],
    na: { h: nh, bow: 1.6 }, fa: { h: fh, bow: 1.6 },
  }), false);
});

// build (place / cast): kneel at a plank ahead, hammer it twice
{
  const PLANK = '<path d="M20.6 42.2 37.4 42 37.6 44.2 20.8 44.4Z" fill="#9a7349" stroke="#60452f" stroke-width=".6"/><path d="M21.6 43.2 36.6 43" stroke="#d3a66a" stroke-width=".5"/>';
  const STRIKE = [
    [4,  [23.5, 27.5], -55],   // 01 raise
    [2,  [14.5, 21.5], -125],  // 02 high, behind the head
    [8,  [24, 27],    -60],    // 03 coming down
    [12, [24.5, 36.4], -4],    // 04 strike the plank
    [10, [24.5, 34],  -24],    // 05 rebound
    [4,  [23.5, 27.5], -55],   // 06 raise
    [2,  [14.5, 21.5], -125],  // 07 high
    [12, [24.5, 36.4], -4],    // 08 strike
    [8,  [23.5, 31],  -55],    // 09 settle
  ];
  SIDE.build = STRIKE.map(([lean, h, th], i) => side({
    lean, dy: 3, far: [2.8, 0], near: [-3, 0, 32], face: i === 3 || i === 7 ? 'grit' : 'calm',
    na: { h, bow: th < -90 ? -1.6 : 1.4 }, fa: { h: [24.5, 40.8], bow: 1.6 },
    tools: [{ art: HAMMER, h, th, layer: th < -90 ? 'prehead' : 'front' }], nearBehindHead: th < -90,
    layers: { ground: PLANK },
  }));
}

// meds: lift the vial from the hip, tip the head back and drink, lower it
//   hand, vial tilt° (0 = hanging cork-up), head tilt°, face
SIDE.meds = [
  [[19.5, 35.5], 0,    0,  'calm'],
  [[21.5, 30],   20,   -2, 'calm'],
  [[23, 21.5],   120,  -8, 'open'],
  [[23, 20.5],   150,  -12, 'calm'],
  [[23, 21],     135,  -10, 'calm'],
  [[21.5, 29],   25,   -2, 'calm'],
  [[19.5, 35.5], 0,    0,  'calm'],
].map(([h, tilt, headRot, face]) => side({
  face, headRot, na: { h, bow: 1.6 },
  tools: [{ art: VIAL, h, th: tilt - 90, layer: 'front' }],
}));

// injured: hunched over the bandaged near arm, limping on the spot
SIDE.injured = Array.from({ length: 7 }, (_, k) => {
  const ph = (k / 7) * Math.PI * 2, s = Math.sin(ph);
  const h = [20.5, 31.5 + s * .3];
  const wrap = (() => {
    const e = elbow(S_NEAR, toBody(h, 5 + s * 1.5, .6 + s * .4, [16, 35]), -1.6);
    const hb = toBody(h, 5 + s * 1.5, .6 + s * .4, [16, 35]);
    const m = [(e[0] + hb[0]) / 2, (e[1] + hb[1]) / 2];
    return `<ellipse cx="${r2(m[0])}" cy="${r2(m[1])}" rx="2.2" ry="1.7" fill="${BANDAGE}" stroke="${BANDAGE_LINE}" stroke-width=".5"/>` +
      `<path d="M${r2(m[0] - 1.4)} ${r2(m[1] - .8)} ${r2(m[0] + 1)} ${r2(m[1] + 1)}" stroke="#aa8b79" stroke-width=".5"/>`;
  })();
  return side({
    dy: .6 + s * .4, lean: 5 + s * 1.5, face: 'wince',
    far: [-1.6, Math.max(0, s) * .7], near: [1.4, 0],
    na: { h, bow: -1.6 }, fa: { a: 6 + s * 4, b: 10 },
    layers: { front: wrap },
  });
});

// shiver: hunched, the near arm hugging the chest, trembling; frost and breath
SIDE.shiver = Array.from({ length: 9 }, (_, k) => {
  const t = k % 2 ? .35 : -.35, f = k % 3;
  const frost = `<path d="M${6 + f} ${10 - f}l-2-3M${27 - f} ${9 + f}l2-3M${4 + f} ${17 + f}l-2-2M${28 - f} ${16 - f}l2-2" stroke="${FROST}" stroke-width=".8"/>`;
  const breath = k % 3 === 1 ? `<path d="M24.5 20.4 28.4 19.4 30.4 21.2 27.4 22.2" fill="${BREATH}" opacity=".5"/>` : '';
  return side({
    bx: t, lean: 4, face: 'chatter', na: { h: [19.6, 28.6], bow: 2.2 }, fa: { h: [19, 29.4], bow: 2 },
    layers: { over: frost + breath },
  });
});

// sweat: wipe the brow with the near hand, drops falling
SIDE.sweat = [
  [19.5, 34], [21.5, 28], [23, 18.5], [23.4, 13.8], [21.5, 12.6], [19.6, 13.2], [21.5, 18.5], [20.5, 27], [19.5, 34],
].map((h, k) => side({
  face: 'open', na: { h, bow: h[1] < 24 ? 2 : 1.4 },
  layers: { over: `<path d="M${23 + (k % 3) * .4} ${10 + (k % 3) * 3}Q${24.4 + (k % 3) * .4} ${12 + (k % 3) * 3} ${23 + (k % 3) * .4} ${13 + (k % 3) * 3}Q${21.6 + (k % 3) * .4} ${12 + (k % 3) * 3} ${23 + (k % 3) * .4} ${10 + (k % 3) * 3}Z" fill="${SWEAT}"/>` },
}));

// ════════════════════════════════════════════════════════════════════════════
// BACK CLIPS
// ════════════════════════════════════════════════════════════════════════════
const BACK = {};
const HANG_L = { a: -12, b: 8 };
const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

// chop: axe up over the right shoulder, cocked behind the head, cut into the
// trunk ahead (away from the camera, so the axe shortens and sits beside the body)
//   lean, dy, hand, θ, layer, foreshorten, arm over the head
BACK.chop = [
  [0,  0,   [23.5, 31],  -62,  'behind', 1,   false],
  [2,  0,   [23.5, 24],  -95,  'over',   1,   false],
  [3,  .5,  [19.5, 19],  -112, 'over',   1,   true],
  [0,  1,   [22.5, 23],  -62,  'behind', .8,  false],
  [-3, 1.5, [24.5, 28.5], -15, 'behind', .75, false],
  [-3, 1.5, [24.5, 29],  -12,  'behind', .75, false],
  [-1, .8,  [24, 30],    -35,  'behind', .85, false],
  [0,  0,   [23.5, 31],  -55,  'behind', 1,   false],
].map(([lean, dy, h, th, layer, sy, over]) => back({
  lean, dy, l: [-.6, 0], r: [1, 0], la: HANG_L, ra: { h, over, bow: 1.6 },
  tools: [{ art: AXE, h, th, layer, sy }],
}));

// picks: both hands on the haft, over the head, driven into the ground ahead
//   lean, dy, hand, θ, layer, foreshorten, hands in front (hidden), arms over the head
const backMine = (art) => [
  [0, 0,   [22.5, 31], -68,  'behind', 1,  'L',  false],
  [2, 0,   [21.5, 22], -100, 'over',   1,  '',   false],
  [0, 0,   [17, 13.5], -95,  'over',   1,  '',   true],
  [0, .5,  [18.5, 20], -70,  'behind', .8, '',   false],
  [0, 2,   [19, 30],   62,   'behind', 1,  'LR', false],
  [0, 2.2, [19, 30.5], 66,   'behind', 1,  'LR', false],
  [0, 1,   [20, 29],   35,   'behind', .9, 'LR', false],
  [0, 0,   [22.5, 31], -50,  'behind', 1,  'L',  false],
].map(([lean, dy, h, th, layer, sy, hid, over]) => {
  const [ux, uy] = dir(th);
  const grip = [h[0] - ux * 4 * sy, h[1] - uy * 4 * sy];
  return back({
    lean, dy, l: [-.8, 0, -.4], r: [.8, 0, .4],
    la: { h: grip, behind: hid.includes('L'), over, bow: -1.4 }, ra: { h, behind: hid.includes('R'), over, bow: 1.4 },
    tools: [{ art, h, th, layer, sy }],
  });
});
BACK.mine = backMine(PICK);
BACK.spick = backMine(SPICK);

// slash: blade drawn back toward the camera, then a lunge and a cut away from it
//   lean, dy, hand, θ, foreshorten, layer, hand in front (hidden), lunge
const BSLASH = [
  [-2, 0,   [25.5, 31],   118,  1,  'front',  false, 0],
  [-3, .5,  [26, 29],     150,  1,  'front',  false, .4],
  [1,  1,   [24, 26],     -70,  .6, 'behind', false, 1],
  [3,  1.5, [23.5, 24],   -72,  .6, 'behind', true,  1.6],
  [3,  1.5, [12, 24.5],   -125, .6, 'behind', true,  1.6],
  [1,  1,   [22.5, 28.5], 50,   .8, 'behind', false, 1],
  [0,  .5,  [24.5, 32],   95,   1,  'front',  false, .4],
];
const backSlash = (art) => BSLASH.map(([lean, dy, h, th, sy, layer, hid, lunge]) => back({
  lean, dy, l: [-lunge * .6, 0], r: [lunge * 1.2, 0],
  la: { h: [8 - lunge * .6, 32 - lunge * .5], bow: -1.2 }, ra: { h, behind: hid, bow: 1.4 },
  tools: art ? [{ art, h, th, layer, sy }] : [],
}));
BACK.slash = backSlash(SWORD);
BACK.islash = backSlash(ICE);
BACK.punch = backSlash('');

// pickup: bend forward (away from the camera, so the back shortens), reach down
// in front, come up with the sprig at the right side
//   dy, body squash, hand (null = reaching in front), holding
BACK.pickup = [
  [.5,  .97, null,         false],
  [2.5, .9,  null,         false],
  [3.5, .86, null,         false],
  [3.5, .86, null,         true],
  [2,   .92, [23, 33.5],   true],
  [.5,  .98, [22.5, 31.5], true],
  [0,   1,   [22, 32.5],   true],
].map(([dy, sy, h, held]) => back({
  dy, sy, l: [0, 0, -.3], r: [0, 0, .3],
  la: { h: [12, 36.5], behind: true }, ra: h ? { h, bow: 1.4 } : { h: [20, 37], behind: true },
  tools: held && h ? [{ art: SPRIG, h: [h[0], h[1] - 1], th: -90, layer: 'over' }] : [],
}));

// torch: held out at the right side, kneel on the right knee, plant it ahead and
// to the right (so it shows beside the body), let go, stand
{
  const PLANT = [25.5, 37.5];
  BACK.torch = [
    [0,   [24, 31],   'hand',    0],
    [1,   [24.5, 33], 'hand',    .4],
    [3,   [25, 35.5], 'hand',    1],
    [3.5, PLANT,      'planted', 1],
    [3.2, [22.5, 35], 'planted', 1],
    [1.2, [22, 33],   'planted', .4],
    [0,   [22, 33],   'planted', 0],
  ].map(([dy, h, where, k]) => back({
    dy, l: [1.6 * k, 0], r: [-1.2 * k, .6 * k], la: HANG_L, ra: { h, bow: 1.4 },
    tools: where === 'hand' ? [{ art: TORCH, h, th: -90, layer: 'front' }] : [],
    layers: where === 'planted' ? { ground: tool(TORCH, PLANT, -90) } : {},
  }));
}

// jump (standing): crouch with the arms back, spring up with them, tuck, land
//   dy, lift, spread, arms (−1 back/down … 1 up and out)
BACK.jump = [
  [3, 0, .4, -.3], [-1, .6, 0, .8], [0, 2.6, .5, 1], [0, 3.6, .8, .7], [0, 1.4, .5, .4], [3, 0, .6, -.2], [1, 0, .2, 0],
].map(([dy, lift, sp, up]) => back({
  dy, shadow: false, l: [0, lift, -sp], r: [0, lift, sp],
  la: { h: up >= 0 ? lerp([8.6, 35], [5.6, 24.5], up) : [9.4, 35.6 + up * 2] },
  ra: { h: up >= 0 ? lerp([23.4, 35], [26.4, 24.5], up) : [22.6, 35.6 + up * 2] },
}));

// leap (running): right leg leads away from the camera, left trails showing its sole
//   dy, back (left) [fwd, lift], lead (right) [fwd, lift], swing
BACK.leap = [
  [.5,  [-1.6, 0],   [1.6, 2.4], .5],
  [-.5, [-2, 1.4],   [2, 2.4],   .7],
  [0,   [-2.2, 2.4], [2.2, 2],   .7],
  [0,   [-1.8, 3],   [2, 2.6],   .6],
  [0,   [-1.2, 2.6], [1.8, .6],  .4],
  [2.5, [-1, 1],     [1.5, 0],   .3],
  [.8,  [-.2, 1.2],  [.8, 0],    .1],
].map(([dy, bk, ld, sw]) => back({
  dy, shadow: false, l: bk, r: ld,
  la: { a: -9 - sw * 14, b: 6 + sw * 24 }, ra: { a: 9 + sw * 10, b: -6 - sw * 8 },
}));

// row: seated, the paddle on the right; the blade goes in ahead (higher, away
// from the camera), comes back past the hip (lower, nearer) and is carried
// forward through the air. The top hand is in front of the keeper, hidden.
{
  const T = [18.5, 26.5];
  //   blade centre, in the water
  BACK.row = [
    [[28.5, 35], true], [[29, 38], true], [[29, 41], true], [[28, 44], true],
    [[30, 36], false], [[30.5, 33], false], [[30, 31.5], false], [[29, 33], false],
  ].map(([B, w]) => {
    const L = lerp(T, B, .45), len = Math.hypot(B[0] - L[0], B[1] - L[1]);
    return back({
      seated: true, shadow: false, la: { h: T, behind: true }, ra: { h: L, bow: 1.4 },
      layers: { behind: paddle(T, L, w, len) },
    });
  });
}

// swim: breaststroke from behind; hands shoot forward (hidden in front), sweep
// out to the sides, pull in under the chest; the legs kick under the water
//   left hand, right hand, hands in front (hidden)
BACK.swim = [
  [[13, 28], [19, 28], true], [[9, 30], [23, 30], false], [[5.5, 32], [26.5, 32], false],
  [[6, 33.5], [26, 33.5], false], [[9, 35], [23, 35], false], [[12.5, 33], [19.5, 33], true],
  [[13.5, 30], [18.5, 30], true], [[14, 27], [18, 27], true], [[13, 27.5], [19, 27.5], true],
].map(([lh, rh, hid], k) => {
  const ph = (k / 9) * Math.PI * 2, kick = Math.sin(ph);
  return wet(back({
    dy: Math.sin(ph * 2) * .5, shadow: false, l: [0, 1.2 + kick * .8, -.6], r: [0, 1.2 - kick * .8, .6],
    la: { h: lh, behind: hid, bow: -1.6 }, ra: { h: rh, behind: hid, bow: 1.6 },
  }), false);
});

// build: kneel at a plank ahead (its ends show past the body), hammer it twice
{
  const PLANK = '<path d="M3.6 39 28.4 39.2 28.6 41.2 3.4 41Z" fill="#9a7349" stroke="#60452f" stroke-width=".6"/><path d="M4.6 40 27.4 40.2" stroke="#d3a66a" stroke-width=".5"/>';
  //   hand, θ, layer, foreshorten, hand in front (hidden), arm over the head
  BACK.build = [
    [[23.5, 24], -100, 'over',   1,  false, false],
    [[20.5, 18], -112, 'over',   1,  false, true],
    [[22.5, 26], -50,  'behind', .8, false, false],
    [[21, 33],   60,   'behind', 1,  true,  false],
    [[22, 31],   20,   'behind', 1,  true,  false],
    [[23.5, 24], -100, 'over',   1,  false, false],
    [[20.5, 18], -112, 'over',   1,  false, true],
    [[21, 33],   60,   'behind', 1,  true,  false],
    [[23, 30],   -30,  'behind', .9, false, false],
  ].map(([h, th, layer, sy, hid, over]) => back({
    dy: 3, l: [1.6, 0], r: [-1.2, .6], la: { h: [12, 38.5], behind: true }, ra: { h, behind: hid, over, bow: 1.6 },
    tools: [{ art: HAMMER, h, th, layer, sy }], layers: { ground: PLANK },
  }));
}

// meds: vial up from the hip; drinking, the hand is in front of the face and the
// tipped-up vial shows past the head; then back down
//   hand, θ (−90 = hanging cork-up), layer, hand hidden, head drop
BACK.meds = [
  [[23, 35],     -90, 'front',  false, 0],
  [[23.5, 29],   -70, 'front',  false, 0],
  [[22.5, 16.5], -118, 'mid', true,  .6],
  [[22.5, 15.5], -105, 'mid', true,  .8],
  [[22.5, 16],   -112, 'mid', true,  .6],
  [[23.5, 29],   -70, 'front',  false, 0],
  [[23, 35],     -90, 'front',  false, 0],
].map(([h, th, layer, hid, headDy]) => back({
  headDy, la: HANG_L, ra: { h, behind: hid, bow: hid ? 3 : 1.4 },
  tools: [{ art: VIAL, h, th, layer }],
}));

// injured: hunched, the hurt arm held in front, limping and swaying
BACK.injured = Array.from({ length: 7 }, (_, k) => {
  const s = Math.sin((k / 7) * Math.PI * 2);
  return back({
    dy: .5 + s * .4, lean: s * 2, headDy: .8, sy: .97, l: [0, Math.max(0, s) * .7], r: [0, 0],
    la: { a: -6 + s * 3, b: 6 }, ra: { h: [18, 31], behind: true, bow: 2.4 },
  });
});

// shiver: arms wrapped round the chest (elbows out, hands hidden), shoulders up,
// trembling, frost about
BACK.shiver = Array.from({ length: 9 }, (_, k) => {
  const t = k % 2 ? .35 : -.35, f = k % 3;
  const frost = `<path d="M${5 + f} ${10 - f}l-2-3M${27 - f} ${9 + f}l2-3M${3 + f} ${18 + f}l-2-2M${29 - f} ${17 - f}l2-2" stroke="${FROST}" stroke-width=".8"/>`;
  return back({
    bx: t, headDy: .6, la: { h: [14.5, 30], e: [8.2, 30], behind: true }, ra: { h: [17.5, 30], e: [23.8, 30], behind: true },
    layers: { top: frost },
  });
});

// sweat: the right hand wipes the back of the neck, drops flying off
const drop = (x, y) => `M${r2(x)} ${r2(y)}q1.4 2 0 3q-1.4-1 0-3Z`;
BACK.sweat = [
  [23, 34.5], [23.5, 28], [21, 22.6], [19, 21.6], [15.5, 21.6], [13, 22], [17, 22], [22, 27], [23, 34.5],
].map((h, k) => back({
  la: HANG_L, ra: { h, over: h[1] < 24, bow: 1.8 },
  layers: { top: `<path d="${drop(24.6 + (k % 3) * .4, 11 + (k % 3) * 3)}${drop(7.4 - (k % 3) * .4, 13 + (k % 3) * 3)}" fill="${SWEAT}"/>` },
}));

// ════════════════════════════════════════════════════════════════════════════
// write
// ════════════════════════════════════════════════════════════════════════════
export {
  useChar, side, back, tool, toBody, elbow, dir, lerp, paddle, wet, S_NEAR, S_FAR, B_L, B_R, SVG64,
  HAMMER, VIAL, SPRIG, FROST, BREATH, SWEAT,
};

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
const WIDE = new Set(['chop', 'mine', 'spick', 'slash', 'islash', 'punch', 'row', 'build']);
const only = process.argv[2];
for (const [view, clips] of [['side', SIDE], ['back', BACK]])
  for (const [clip, frames] of Object.entries(clips)) {
    if (only && only !== clip && only !== view) continue;
    frames.forEach((body, i) => out(`keeper_${view}_${clip}_${pad(i)}`, body, WIDE.has(clip)));
  }
console.log('keeper view actions drawn');
}
