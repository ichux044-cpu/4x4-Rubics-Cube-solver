/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { cloneCubeState } from './cubeState';
import { CubeColor, CubeState, FACE_NAMES, FaceName, MoveDetails } from './types';

interface StickerLoc {
  face: FaceName;
  index: number;
  // Normalized grid positions: x, y, z in [-1.5, -0.5, 0.5, 1.5]
  pos: [number, number, number];
  normal: [number, number, number];
}

const LAYER_COORDS = [-1.5, -0.5, 0.5, 1.5];

/**
 * Builds the canonical 96 sticker definitions in 3D coordinate space.
 */
function buildStickerMap(): StickerLoc[] {
  const map: StickerLoc[] = [];

  for (const face of FACE_NAMES) {
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        const index = r * 4 + c;
        let pos: [number, number, number] = [0, 0, 0];
        let normal: [number, number, number] = [0, 0, 0];

        switch (face) {
          case 'U': // y = 1.5, row: z from -1.5 to 1.5, col: x from -1.5 to 1.5
            pos = [LAYER_COORDS[c], 1.5, LAYER_COORDS[r]];
            normal = [0, 1, 0];
            break;
          case 'D': // y = -1.5, row: z from 1.5 to -1.5, col: x from -1.5 to 1.5
            pos = [LAYER_COORDS[c], -1.5, LAYER_COORDS[3 - r]];
            normal = [0, -1, 0];
            break;
          case 'F': // z = 1.5, row: y from 1.5 to -1.5, col: x from -1.5 to 1.5
            pos = [LAYER_COORDS[c], LAYER_COORDS[3 - r], 1.5];
            normal = [0, 0, 1];
            break;
          case 'B': // z = -1.5, row: y from 1.5 to -1.5, col: x from 1.5 to -1.5
            pos = [LAYER_COORDS[3 - c], LAYER_COORDS[3 - r], -1.5];
            normal = [0, 0, -1];
            break;
          case 'L': // x = -1.5, row: y from 1.5 to -1.5, col: z from -1.5 to 1.5
            pos = [-1.5, LAYER_COORDS[3 - r], LAYER_COORDS[c]];
            normal = [-1, 0, 0];
            break;
          case 'R': // x = 1.5, row: y from 1.5 to -1.5, col: z from 1.5 to -1.5
            pos = [1.5, LAYER_COORDS[3 - r], LAYER_COORDS[3 - c]];
            normal = [1, 0, 0];
            break;
        }

        map.push({ face, index, pos, normal });
      }
    }
  }

  return map;
}

export const STICKER_MAP = buildStickerMap();

function findStickerAt(pos: [number, number, number], normal: [number, number, number]): StickerLoc | undefined {
  const eps = 0.05;
  return STICKER_MAP.find(s => {
    return (
      Math.abs(s.pos[0] - pos[0]) < eps &&
      Math.abs(s.pos[1] - pos[1]) < eps &&
      Math.abs(s.pos[2] - pos[2]) < eps &&
      Math.abs(s.normal[0] - normal[0]) < eps &&
      Math.abs(s.normal[1] - normal[1]) < eps &&
      Math.abs(s.normal[2] - normal[2]) < eps
    );
  });
}

function rotateVec(
  vec: [number, number, number],
  axis: 'x' | 'y' | 'z',
  quarterTurns: number
): [number, number, number] {
  let [x, y, z] = vec;
  const turns = ((quarterTurns % 4) + 4) % 4;
  for (let i = 0; i < turns; i++) {
    // Clockwise looking down the positive axis toward origin:
    // (Right-hand rule: thumb pointing positive axis, fingers curl +angle)
    if (axis === 'x') {
      const ny = -z;
      const nz = y;
      y = ny;
      z = nz;
    } else if (axis === 'y') {
      const nx = z;
      const nz = -x;
      x = nx;
      z = nz;
    } else if (axis === 'z') {
      const nx = -y;
      const ny = x;
      x = nx;
      y = ny;
    }
  }
  return [Math.round(x * 10) / 10, Math.round(y * 10) / 10, Math.round(z * 10) / 10];
}

/**
 * Parses any move string into its mechanical axis, affected layer indices, and quarter turn direction.
 */
export function parseMove(notation: string): MoveDetails {
  const raw = notation.trim();
  let base = raw;
  let direction: 1 | -1 | 2 = 1;

  if (base.endsWith("'")) {
    direction = -1;
    base = base.slice(0, -1);
  } else if (base.endsWith("2")) {
    direction = 2;
    base = base.slice(0, -1);
  }

  let axis: 'x' | 'y' | 'z' = 'y';
  let layers: number[] = [3];
  let desc = '';

  // Outer faces: U, D, L, R, F, B
  // Wide faces: Uw, Dw, Lw, Rw, Fw, Bw (or u, d, l, r, f, b)
  // Inner slices: 2U, 2D, 2L, 2R, 2F, 2B
  // Rotations: x, y, z
  switch (base) {
    // UP
    case 'U':
      axis = 'y';
      layers = [3];
      desc = direction === 1 ? 'Turn top layer clockwise' : direction === -1 ? 'Turn top layer counter-clockwise' : 'Turn top layer 180°';
      break;
    case 'Uw':
    case 'u':
      axis = 'y';
      layers = [2, 3];
      desc = direction === 1 ? 'Turn top two layers clockwise' : direction === -1 ? 'Turn top two layers counter-clockwise' : 'Turn top two layers 180°';
      break;
    case '2U':
      axis = 'y';
      layers = [2];
      desc = 'Turn upper inner slice';
      break;

    // DOWN
    case 'D':
      axis = 'y';
      layers = [0];
      // Note: Clockwise looking at D face is opposite from looking at U face
      direction = direction === 2 ? 2 : (direction === 1 ? -1 : 1);
      desc = direction === -1 ? 'Turn bottom layer clockwise' : direction === 1 ? 'Turn bottom layer counter-clockwise' : 'Turn bottom layer 180°';
      break;
    case 'Dw':
    case 'd':
      axis = 'y';
      layers = [0, 1];
      direction = direction === 2 ? 2 : (direction === 1 ? -1 : 1);
      desc = 'Turn bottom two layers';
      break;
    case '2D':
      axis = 'y';
      layers = [1];
      direction = direction === 2 ? 2 : (direction === 1 ? -1 : 1);
      desc = 'Turn lower inner slice';
      break;

    // RIGHT
    case 'R':
      axis = 'x';
      layers = [3];
      desc = direction === 1 ? 'Turn right layer upward (clockwise)' : direction === -1 ? 'Turn right layer downward' : 'Turn right layer 180°';
      break;
    case 'Rw':
    case 'r':
      axis = 'x';
      layers = [2, 3];
      desc = direction === 1 ? 'Turn two right layers upward' : direction === -1 ? 'Turn two right layers downward' : 'Turn two right layers 180°';
      break;
    case '2R':
      axis = 'x';
      layers = [2];
      desc = 'Turn right inner slice upward';
      break;

    // LEFT
    case 'L':
      axis = 'x';
      layers = [0];
      direction = direction === 2 ? 2 : (direction === 1 ? -1 : 1);
      desc = direction === -1 ? 'Turn left layer downward (clockwise)' : direction === 1 ? 'Turn left layer upward' : 'Turn left layer 180°';
      break;
    case 'Lw':
    case 'l':
      axis = 'x';
      layers = [0, 1];
      direction = direction === 2 ? 2 : (direction === 1 ? -1 : 1);
      desc = 'Turn two left layers downward';
      break;
    case '2L':
      axis = 'x';
      layers = [1];
      direction = direction === 2 ? 2 : (direction === 1 ? -1 : 1);
      desc = 'Turn left inner slice downward';
      break;

    // FRONT
    case 'F':
      axis = 'z';
      layers = [3];
      desc = direction === 1 ? 'Turn front layer clockwise' : direction === -1 ? 'Turn front layer counter-clockwise' : 'Turn front layer 180°';
      break;
    case 'Fw':
    case 'f':
      axis = 'z';
      layers = [2, 3];
      desc = direction === 1 ? 'Turn two front layers clockwise' : direction === -1 ? 'Turn two front layers counter-clockwise' : 'Turn two front layers 180°';
      break;
    case '2F':
      axis = 'z';
      layers = [2];
      desc = 'Turn front inner slice';
      break;

    // BACK
    case 'B':
      axis = 'z';
      layers = [0];
      direction = direction === 2 ? 2 : (direction === 1 ? -1 : 1);
      desc = direction === -1 ? 'Turn back layer clockwise' : direction === 1 ? 'Turn back layer counter-clockwise' : 'Turn back layer 180°';
      break;
    case 'Bw':
    case 'b':
      axis = 'z';
      layers = [0, 1];
      direction = direction === 2 ? 2 : (direction === 1 ? -1 : 1);
      desc = 'Turn two back layers';
      break;
    case '2B':
      axis = 'z';
      layers = [1];
      direction = direction === 2 ? 2 : (direction === 1 ? -1 : 1);
      desc = 'Turn back inner slice';
      break;

    // Whole-cube rotations
    case 'x':
      axis = 'x';
      layers = [0, 1, 2, 3];
      desc = 'Rotate entire cube upward on X-axis';
      break;
    case 'y':
      axis = 'y';
      layers = [0, 1, 2, 3];
      desc = 'Rotate entire cube on Y-axis (F towards L)';
      break;
    case 'z':
      axis = 'z';
      layers = [0, 1, 2, 3];
      desc = 'Rotate entire cube clockwise on Z-axis (U towards R)';
      break;

    default:
      axis = 'y';
      layers = [3];
      desc = `Execute ${raw}`;
      break;
  }

  return {
    notation: raw,
    axis,
    layers,
    direction,
    description: desc,
  };
}

// Cache of permutation mappings for fast execution
const PERM_CACHE = new Map<string, Array<{ fromFace: FaceName; fromIdx: number; toFace: FaceName; toIdx: number }>>();

function getMovePermutation(notation: string) {
  if (PERM_CACHE.has(notation)) {
    return PERM_CACHE.get(notation)!;
  }

  const { axis, layers, direction } = parseMove(notation);
  const mapping: Array<{ fromFace: FaceName; fromIdx: number; toFace: FaceName; toIdx: number }> = [];

  for (const sticker of STICKER_MAP) {
    const coord = axis === 'x' ? sticker.pos[0] : axis === 'y' ? sticker.pos[1] : sticker.pos[2];
    const layerIdx = LAYER_COORDS.findIndex(c => Math.abs(c - coord) < 0.1);

    if (layers.includes(layerIdx)) {
      // This sticker rotates
      const newPos = rotateVec(sticker.pos, axis, direction);
      const newNormal = rotateVec(sticker.normal, axis, direction);
      const target = findStickerAt(newPos, newNormal);

      if (target) {
        mapping.push({
          fromFace: sticker.face,
          fromIdx: sticker.index,
          toFace: target.face,
          toIdx: target.index,
        });
      }
    }
  }

  PERM_CACHE.set(notation, mapping);
  return mapping;
}

/**
 * Applies a move to a 4x4 cube state and returns the new transformed state.
 */
export function applyMove(state: CubeState, notation: string): CubeState {
  const mapping = getMovePermutation(notation);
  const next = cloneCubeState(state);

  for (const item of mapping) {
    next[item.toFace][item.toIdx] = state[item.fromFace][item.fromIdx];
  }

  return next;
}

/**
 * Applies a sequence of moves to a cube state.
 */
export function applyMoves(state: CubeState, moves: string[] | string): CubeState {
  const list = Array.isArray(moves) ? moves : moves.trim().split(/\s+/).filter(Boolean);
  let current = state;
  for (const m of list) {
    current = applyMove(current, m);
  }
  return current;
}

/**
 * Inverts a single move.
 * e.g., R -> R', R' -> R, R2 -> R2, Rw -> Rw', 2R -> 2R'
 */
export function invertMove(notation: string): string {
  const trimmed = notation.trim();
  if (trimmed.endsWith("2")) return trimmed;
  if (trimmed.endsWith("'")) return trimmed.slice(0, -1);
  return trimmed + "'";
}

/**
 * Inverts a sequence of moves (reverses order and inverts each move).
 */
export function invertMoves(moves: string[] | string): string[] {
  const list = Array.isArray(moves) ? moves : moves.trim().split(/\s+/).filter(Boolean);
  return list.slice().reverse().map(invertMove);
}
