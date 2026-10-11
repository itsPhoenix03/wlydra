// The rowing boat seen three ways, so the hull points where the keeper rows.
//
//   node tools/art/boat-views.mjs
//
// boat.svg is one symmetric hull lying left–right with no bow. These follow its
// timber, ribs and rim, and give it a bow:
//
//   boat_side   long axis left–right, bow to image RIGHT (the rig flips it with
//               the keeper for left)
//   boat_bow    rowing toward the camera: bow pointing down-screen, transom far
//   boat_stern  rowing away: bow up-screen, the transom nearest the camera
//
// Each hull has a `_near` overlay — the wall between the keeper and the camera —
// that rig.ts draws over the seated keeper so they sit IN the boat (as
// boat_front does for boat.svg). Canvas 56×30 like boat.svg; the rig places the
// hull with origin (.5, .6), which puts the keeper's hip line at y ≈ 19.
// A vertical hull is about half as long on screen as a horizontal one: the iso
// view foreshortens screen-vertical lengths by half.

import { writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SPR = resolve(dirname(fileURLToPath(import.meta.url)), '../../assets/sprites');
const svg = (body) => `<svg xmlns="http://www.w3.org/2000/svg" width="56" height="30" viewBox="0 0 56 30">\n${body}\n</svg>\n`;
const write = (n, body) => writeFileSync(`${SPR}/${n}.svg`, svg(body));
// the vertical hulls are drawn narrow and widened to seat the keeper (beam ≈ shoulders + arms)
const WIDEN = (body) => `<g transform="translate(28 0) scale(1.4 1) translate(-28 0)">${body}</g>`;

// boat.svg's palette
const HULL = 'fill="#64452e" stroke="#342c28" stroke-width=".8" stroke-linejoin="round"';
const INSIDE = '#422f27', INNER_WALL = '#765336', FLOOR = '#8b633e';
const RIM = 'fill="#b78a55" stroke="#4d392d" stroke-width=".65"';
const RIM_LIGHT = 'fill="none" stroke="#d4a76b" stroke-width=".7"';
const RIB = 'stroke="#3f3229" stroke-width="1"', RIB_LIGHT = 'stroke="#b58a56" stroke-width=".55"';
const SEAT = 'fill="#9f7247" stroke="#59432f" stroke-width=".55"';
const PLANK = 'stroke="#bc8c55" stroke-width=".8"';
const ENDS = 'stroke="#dbc19a" stroke-width=".7"';
const SHADOW = (rx) => `<ellipse cx="28" cy="26.4" rx="${rx}" ry="2.4" fill="#17394a" opacity=".35"/>`;

// ── side: square transom at the left, raised pointed bow at the right ────────
write('boat_side',
  SHADOW(23) +
  `<path d="M5 8.4Q27 3.6 54.4 5.2L49.6 18.6Q42.4 25.2 28 26.4Q13.8 25.8 7.6 21.2L5.4 13.6Z" ${HULL}/>` +
  `<path d="m6.6 10.6 9 4.2 13 1 13-1.2 10.4-6.2-5.4 9.2-18 6.2-17.6-5.8Z" fill="${INNER_WALL}"/>` +
  `<path d="m6.6 10.6 9 3.2 13 1 13-1.2 10.4-5.2-6.4 8-17 5.2-17-4.8Z" fill="${INSIDE}"/>` +
  `<path d="m10 13 8 3 11 1 11-1 8.4-3.8-4.4 4.6-15 4-15-4Z" fill="${FLOOR}"/>` +
  `<path d="M5.4 8.6Q27 4 53.6 5.8L51.6 8.6Q27 6.4 7 11.4Z" ${RIM}/>` +
  `<path d="M7 9.8Q27 5.6 51.4 7.2" ${RIM_LIGHT}/>` +
  `<path d="m11 14 2.6 7m8-6 1 9m12-9-1 9m10-10.6-3.4 7.6" ${RIB}/>` +
  `<path d="m13 15 2 4m8-2 1 4m11-4-1 4m9.4-6.6-2.4 4.6" ${RIB_LIGHT}/>` +
  `<path d="m19 12 10 2 10-2.2-2 3-8 1-8-1Z" ${SEAT}/>` +
  `<path d="m8 20.6 9 3m23-.4 8.6-4.6m-22.6 7.2 4 0" ${PLANK}/>` +
  `<path d="M5.4 8.6 5.8 13.4M49 5.4l4.6.2 1-1.6" ${ENDS}/>` +
  `<path d="M54.4 5.2 56 3.2" stroke="#4d392d" stroke-width=".9" stroke-linecap="round"/>`);
write('boat_side_near',
  `<path d="M9 19.2 28.4 25.2 47.4 18 49.6 18.6Q42.4 25.2 28 26.4Q13.8 25.8 7.6 21.2Z" ${HULL}/>` +
  `<path d="M9 19.2 28.4 25.2 47.4 18" fill="none" stroke="#b78a55" stroke-width=".7"/>` +
  `<path d="m8 20.6 9 3m23-.4 8.6-4.6m-22.6 7.2 4 0" ${PLANK}/>`);

// ── bow toward the camera: transom far (top), bow point near (bottom) ────────
write('boat_bow', WIDEN(
  SHADOW(14) +
  `<path d="M15.6 4.4H40.4L41 8.6Q39.6 18.6 28 28.6Q16.4 18.6 15 8.6Z" ${HULL}/>` +
  `<path d="M17.4 5.8H38.6Q37.8 16.2 28 23.8Q18.2 16.2 17.4 5.8Z" fill="${INNER_WALL}"/>` +
  `<path d="M18.6 7.4H37.4Q36.6 15.8 28 22Q19.4 15.8 18.6 7.4Z" fill="${INSIDE}"/>` +
  `<path d="M20.4 9.4H35.6Q34.8 15.6 28 20Q21.2 15.6 20.4 9.4Z" fill="${FLOOR}"/>` +
  `<path d="M15.6 4.4H40.4L39.6 6.6H16.4Z" ${RIM}/><path d="M17 5.6H39" ${RIM_LIGHT}/>` +
  `<path d="M19.6 10.6H36.4M20.6 14.2H35.4M22.6 17.6H33.4" ${RIB}/>` +
  `<path d="M21 11.6H35M22 15.2H34" ${RIB_LIGHT}/>` +
  `<path d="M19.4 11.8H36.6V13.6H19.4Z" ${SEAT}/>` +
  `<path d="M15.6 4.4 15 8.6M40.4 4.4 41 8.6" ${ENDS}/>`));
write('boat_bow_near', WIDEN(
  `<path d="M18.6 14.6Q21.8 19.6 28 22.6Q34.2 19.6 37.4 14.6L39.8 13.6Q38.4 21 28 28.6Q17.6 21 16.2 13.6Z" ${HULL}/>` +
  `<path d="M18.6 14.6Q21.8 19.6 28 22.6Q34.2 19.6 37.4 14.6" fill="none" stroke="#b78a55" stroke-width=".9"/>` +
  `<path d="M28 22.8V28.4M20.8 19.6l2.6 3.4m12-3.4-2.6 3.4" ${PLANK}/>` +
  `<path d="M28 26.6 28 30" stroke="#4d392d" stroke-width=".9" stroke-linecap="round"/>`));

// ── stern toward the camera: bow point far (top), transom near (bottom) ──────
write('boat_stern', WIDEN(
  SHADOW(14) +
  `<path d="M28 2Q39.6 10 41 20L40.4 26H15.6L15 20Q16.4 10 28 2Z" ${HULL}/>` +
  `<path d="M28 4.6Q37.8 11.4 38.6 21.6H17.4Q18.2 11.4 28 4.6Z" fill="${INNER_WALL}"/>` +
  `<path d="M28 6.6Q36.6 12.6 37.4 20.4H18.6Q19.4 12.6 28 6.6Z" fill="${INSIDE}"/>` +
  `<path d="M28 9Q34.8 13.6 35.6 18.6H20.4Q21.2 13.6 28 9Z" fill="${FLOOR}"/>` +
  `<path d="M22.6 11.6H33.4M20.6 15H35.4M19.6 18.4H36.4" ${RIB}/>` +
  `<path d="M21.6 16H34.4M20.6 19.4H35.4" ${RIB_LIGHT}/>` +
  `<path d="M19.4 16.4H36.6V18.2H19.4Z" ${SEAT}/>` +
  `<path d="M28 2 28 .4" stroke="#4d392d" stroke-width=".9" stroke-linecap="round"/>` +
  `<path d="M28 4.4Q37.6 11 38.8 20.8" ${RIM_LIGHT}/>`));
write('boat_stern_near', WIDEN(
  `<path d="M16.4 20.6H39.6L40.4 26H15.6Z" ${HULL}/>` +
  `<path d="M15.8 20H40.2L39.6 22H16.4Z" ${RIM}/><path d="M17 20.9H39" ${RIM_LIGHT}/>` +
  `<path d="M17.4 23.6H38.6M16.8 25H39.2" ${PLANK}/>` +
  `<path d="M15.8 20 15.6 26M40.2 20 40.4 26" ${ENDS}/>`));

console.log('boat views drawn');
