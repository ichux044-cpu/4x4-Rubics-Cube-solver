/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  CubeColor,
  CubeState,
  DEFAULT_FACE_COLORS,
  FACE_NAMES,
  FaceName,
  ValidationIssue,
  ValidationResult,
} from './types';

/**
 * Returns a pristine solved 4x4 cube state.
 */
export function createSolvedCubeState(): CubeState {
  const state = {} as CubeState;
  for (const face of FACE_NAMES) {
    state[face] = Array(16).fill(DEFAULT_FACE_COLORS[face]);
  }
  return state;
}

/**
 * Deep clones a cube state.
 */
export function cloneCubeState(state: CubeState): CubeState {
  const clone = {} as CubeState;
  for (const face of FACE_NAMES) {
    clone[face] = [...state[face]];
  }
  return clone;
}

/**
 * Counts all occurrences of each color across all 96 stickers.
 */
export function getStickerColorCounts(state: CubeState): Record<CubeColor, number> {
  const counts: Record<CubeColor, number> = {
    W: 0,
    Y: 0,
    G: 0,
    B: 0,
    O: 0,
    R: 0,
  };

  for (const face of FACE_NAMES) {
    for (const color of state[face]) {
      if (color in counts) {
        counts[color]++;
      }
    }
  }

  return counts;
}

/**
 * Checks whether the cube state is completely solved.
 */
export function isCubeSolved(state: CubeState): boolean {
  for (const face of FACE_NAMES) {
    const faceColor = state[face][0];
    for (let i = 1; i < 16; i++) {
      if (state[face][i] !== faceColor) {
        return false;
      }
    }
  }

  // Ensure opposing faces don't share the same color
  if (
    state.U[0] === state.D[0] ||
    state.F[0] === state.B[0] ||
    state.L[0] === state.R[0]
  ) {
    return false;
  }

  return true;
}

/** Center indices on any face (inner 2x2: rows 1-2, cols 1-2) */
export const CENTER_INDICES = [5, 6, 9, 10];

/** Corner sticker indices for the 8 corners */
export const CORNER_SPECS: { [key: string]: { face: FaceName; index: number }[] } = {
  UBL: [
    { face: 'U', index: 0 },
    { face: 'B', index: 3 },
    { face: 'L', index: 0 },
  ],
  UBR: [
    { face: 'U', index: 3 },
    { face: 'B', index: 0 },
    { face: 'R', index: 3 },
  ],
  UFL: [
    { face: 'U', index: 12 },
    { face: 'F', index: 0 },
    { face: 'L', index: 3 },
  ],
  UFR: [
    { face: 'U', index: 15 },
    { face: 'F', index: 3 },
    { face: 'R', index: 0 },
  ],
  DFL: [
    { face: 'D', index: 0 },
    { face: 'F', index: 12 },
    { face: 'L', index: 15 },
  ],
  DFR: [
    { face: 'D', index: 3 },
    { face: 'F', index: 15 },
    { face: 'R', index: 12 },
  ],
  DBL: [
    { face: 'D', index: 12 },
    { face: 'B', index: 15 },
    { face: 'L', index: 12 },
  ],
  DBR: [
    { face: 'D', index: 15 },
    { face: 'B', index: 12 },
    { face: 'R', index: 15 },
  ],
};

/** Edge wing pairings (24 wings total, 12 paired edges) */
export const EDGE_SPECS: { face1: FaceName; index1: number; face2: FaceName; index2: number }[] = [
  // Top edges (U)
  { face1: 'U', index1: 1, face2: 'B', index2: 2 },
  { face1: 'U', index1: 2, face2: 'B', index2: 1 },
  { face1: 'U', index1: 4, face2: 'L', index2: 1 },
  { face1: 'U', index1: 8, face2: 'L', index2: 2 },
  { face1: 'U', index1: 7, face2: 'R', index2: 2 },
  { face1: 'U', index1: 11, face2: 'R', index2: 1 },
  { face1: 'U', index1: 13, face2: 'F', index2: 1 },
  { face1: 'U', index1: 14, face2: 'F', index2: 2 },

  // Bottom edges (D)
  { face1: 'D', index1: 1, face2: 'F', index2: 13 },
  { face1: 'D', index1: 2, face2: 'F', index2: 14 },
  { face1: 'D', index1: 4, face2: 'L', index2: 14 },
  { face1: 'D', index1: 8, face2: 'L', index2: 13 },
  { face1: 'D', index1: 7, face2: 'R', index2: 13 },
  { face1: 'D', index1: 11, face2: 'R', index2: 14 },
  { face1: 'D', index1: 13, face2: 'B', index2: 14 },
  { face1: 'D', index1: 14, face2: 'B', index2: 13 },

  // Middle/E-layer vertical edges
  { face1: 'F', index1: 4, face2: 'L', index2: 7 },
  { face1: 'F', index1: 8, face2: 'L', index2: 11 },
  { face1: 'F', index1: 7, face2: 'R', index2: 4 },
  { face1: 'F', index1: 11, face2: 'R', index2: 8 },
  { face1: 'B', index1: 4, face2: 'R', index2: 7 },
  { face1: 'B', index1: 8, face2: 'R', index2: 11 },
  { face1: 'B', index1: 7, face2: 'L', index2: 4 },
  { face1: 'B', index1: 11, face2: 'L', index2: 8 },
];

/** Standard opposing color pairs */
export const OPPOSITE_COLOR_PAIRS: [CubeColor, CubeColor][] = [
  ['W', 'Y'],
  ['G', 'B'],
  ['O', 'R'],
];

export function areOppositeColors(c1: CubeColor, c2: CubeColor): boolean {
  return OPPOSITE_COLOR_PAIRS.some(
    ([a, b]) => (c1 === a && c2 === b) || (c1 === b && c2 === a)
  );
}

/**
 * Validates a 4x4 cube state thoroughly:
 * 1. Exactly 16 stickers per color (96 total).
 * 2. Exactly 4 of each color in the 24 center slots.
 * 3. 8 valid corners (no identical colors, no opposing colors on the same corner).
 * 4. 24 valid edges (no identical colors, no opposing colors on the same edge).
 */
export function validateCubeState(state: CubeState): ValidationResult {
  const issues: ValidationIssue[] = [];
  const colorCounts = getStickerColorCounts(state);

  // 1. Check color counts
  let countError = false;
  for (const color of ['W', 'Y', 'G', 'B', 'O', 'R'] as CubeColor[]) {
    const count = colorCounts[color];
    if (count !== 16) {
      countError = true;
      const stickersWithColor: { face: FaceName; index: number }[] = [];
      const facesWithColor = new Set<FaceName>();
      for (const f of FACE_NAMES) {
        state[f].forEach((col, idx) => {
          if (col === color) {
            stickersWithColor.push({ face: f, index: idx });
            facesWithColor.add(f);
          }
        });
      }
      issues.push({
        type: 'error',
        title: `Count Mismatch: ${color} (${count}/16)`,
        message: `Color ${color} appears ${count} times (must be exactly 16, ${count > 16 ? `excess of ${count - 16}` : `missing ${16 - count}`}).`,
        affectedFaces: Array.from(facesWithColor),
        affectedStickers: count > 16 ? stickersWithColor : undefined,
      });
    }
  }

  // 2. Check centers
  const centerCounts: Record<CubeColor, number> = { W: 0, Y: 0, G: 0, B: 0, O: 0, R: 0 };
  const centerStickers: { face: FaceName; index: number }[] = [];
  for (const face of FACE_NAMES) {
    for (const idx of CENTER_INDICES) {
      const c = state[face][idx];
      centerCounts[c]++;
      centerStickers.push({ face, index: idx });
    }
  }

  for (const color of ['W', 'Y', 'G', 'B', 'O', 'R'] as CubeColor[]) {
    if (centerCounts[color] !== 4) {
      const affStickers = centerStickers.filter(s => state[s.face][s.index] === color);
      issues.push({
        type: 'error',
        title: `Center Block: ${color} (${centerCounts[color]}/4)`,
        message: `Found ${centerCounts[color]} center stickers of ${color} (must be exactly 4 per face center).`,
        affectedFaces: Array.from(new Set(affStickers.map(s => s.face))),
        affectedStickers: affStickers,
      });
    }
  }

  // 3. Check corners
  for (const [cornerName, stickers] of Object.entries(CORNER_SPECS)) {
    const c0 = state[stickers[0].face][stickers[0].index];
    const c1 = state[stickers[1].face][stickers[1].index];
    const c2 = state[stickers[2].face][stickers[2].index];

    // Check duplicates
    if (c0 === c1 || c0 === c2 || c1 === c2) {
      issues.push({
        type: 'error',
        title: `Corner ${cornerName}: Repeated Color`,
        message: `Corner piece has duplicate colors: ${c0}, ${c1}, ${c2}`,
        affectedFaces: Array.from(new Set(stickers.map(s => s.face))),
        affectedStickers: stickers,
      });
    }

    // Check impossible opposites
    if (
      areOppositeColors(c0, c1) ||
      areOppositeColors(c0, c2) ||
      areOppositeColors(c1, c2)
    ) {
      issues.push({
        type: 'error',
        title: `Corner ${cornerName}: Opposite Colors`,
        message: `Corner piece has opposing colors (${c0}, ${c1}, ${c2}) which cannot physically meet on the same corner.`,
        affectedFaces: Array.from(new Set(stickers.map(s => s.face))),
        affectedStickers: stickers,
      });
    }
  }

  // 4. Check edges
  for (let i = 0; i < EDGE_SPECS.length; i++) {
    const edge = EDGE_SPECS[i];
    const c1 = state[edge.face1][edge.index1];
    const c2 = state[edge.face2][edge.index2];

    if (c1 === c2) {
      issues.push({
        type: 'error',
        title: `Edge #${i + 1} (${edge.face1}-${edge.face2}): Same Color`,
        message: `Edge wing has duplicate color ${c1} on both sides.`,
        affectedFaces: [edge.face1, edge.face2],
        affectedStickers: [
          { face: edge.face1, index: edge.index1 },
          { face: edge.face2, index: edge.index2 },
        ],
      });
    }

    if (areOppositeColors(c1, c2)) {
      issues.push({
        type: 'error',
        title: `Edge #${i + 1} (${edge.face1}-${edge.face2}): Opposite Colors`,
        message: `Edge wing has opposing colors (${c1} & ${c2}) which cannot share an edge piece.`,
        affectedFaces: [edge.face1, edge.face2],
        affectedStickers: [
          { face: edge.face1, index: edge.index1 },
          { face: edge.face2, index: edge.index2 },
        ],
      });
    }
  }

  const isValid = issues.length === 0;
  let statusText = 'Ready to solve';
  if (!isValid) {
    if (countError) {
      statusText = 'Incorrect color counts';
    } else {
      statusText = 'Invalid or unreachable cube configuration';
    }
  }

  return {
    isValid,
    colorCounts,
    issues,
    statusText,
  };
}

/**
 * Automatically adjusts stickers with excess/deficit counts to ensure
 * exactly 16 of each color and 4 of each color on center pieces.
 */
export function autoBalanceCubeState(state: CubeState): CubeState {
  const next = cloneCubeState(state);
  const colors: CubeColor[] = ['W', 'Y', 'G', 'B', 'O', 'R'];

  // 1. Balance centers (must be exactly 4 of each color)
  const centerStickers: { face: FaceName; index: number }[] = [];
  const centerCounts: Record<CubeColor, number> = { W: 0, Y: 0, G: 0, B: 0, O: 0, R: 0 };
  for (const face of FACE_NAMES) {
    for (const idx of CENTER_INDICES) {
      centerStickers.push({ face, index: idx });
      centerCounts[next[face][idx]]++;
    }
  }

  for (const c of colors) {
    while (centerCounts[c] > 4) {
      const deficit = colors.find(col => centerCounts[col] < 4);
      if (!deficit) break;
      const target = centerStickers.find(s => next[s.face][s.index] === c);
      if (target) {
        next[target.face][target.index] = deficit;
        centerCounts[c]--;
        centerCounts[deficit]++;
      } else {
        break;
      }
    }
  }

  // 2. Balance all stickers (must be exactly 16 of each color)
  const totalCounts = getStickerColorCounts(next);
  for (const c of colors) {
    while (totalCounts[c] > 16) {
      const deficit = colors.find(col => totalCounts[col] < 16);
      if (!deficit) break;

      // Prefer swapping on non-center stickers
      let swapped = false;
      for (const face of FACE_NAMES) {
        for (let i = 0; i < 16; i++) {
          if (!CENTER_INDICES.includes(i) && next[face][i] === c) {
            next[face][i] = deficit;
            totalCounts[c]--;
            totalCounts[deficit]++;
            swapped = true;
            break;
          }
        }
        if (swapped) break;
      }
      if (!swapped) {
        // Fallback to any sticker
        for (const face of FACE_NAMES) {
          for (let i = 0; i < 16; i++) {
            if (next[face][i] === c) {
              next[face][i] = deficit;
              totalCounts[c]--;
              totalCounts[deficit]++;
              swapped = true;
              break;
            }
          }
          if (swapped) break;
        }
      }
    }
  }

  return next;
}

