/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

const OUTER_MOVES = ['U', 'D', 'L', 'R', 'F', 'B'];
const WIDE_MOVES = ['Uw', 'Dw', 'Lw', 'Rw', 'Fw', 'Bw'];
const SUFFIXES = ['', "'", '2'];

// Group moves by axis to avoid redundant consecutive moves on the same axis
const AXIS_GROUPS: Record<string, number> = {
  U: 0, Uw: 0, D: 0, Dw: 0,
  L: 1, Lw: 1, R: 1, Rw: 1,
  F: 2, Fw: 2, B: 2, Bw: 2,
};

/**
 * Generates a valid 4x4 scramble sequence.
 * @param length Number of moves (default 40 for standard WCA-style)
 */
export function generateScramble(length = 36): string {
  const moves: string[] = [];
  let lastAxis = -1;
  let secondLastAxis = -1;

  const allBases = [...OUTER_MOVES, ...WIDE_MOVES];

  while (moves.length < length) {
    const base = allBases[Math.floor(Math.random() * allBases.length)];
    const axis = AXIS_GROUPS[base];

    if (axis === lastAxis) continue;
    if (axis === secondLastAxis && lastAxis === axis) continue;

    const suffix = SUFFIXES[Math.floor(Math.random() * SUFFIXES.length)];
    moves.push(`${base}${suffix}`);

    secondLastAxis = lastAxis;
    lastAxis = axis;
  }

  return moves.join(' ');
}

export interface PresetPattern {
  name: string;
  description: string;
  moves: string;
}

export const PRESET_PATTERNS: PresetPattern[] = [
  {
    name: '4x4 Checkerboard',
    description: 'Alternating colors across all six faces',
    moves: '2R2 2L2 2U2 2D2 2F2 2B2',
  },
  {
    name: 'Stripes & Rings',
    description: 'Outer ring of color with centered horizontal stripe',
    moves: '2R2 U2 2R2 U2 2R2 2U2 2R2 2U2',
  },
  {
    name: 'Cube in a Cube',
    description: 'A 2x2 cube inset inside a 4x4 frame',
    moves: "F L F U' R U F2 L2 U' L' B D' B' L2 U",
  },
  {
    name: 'OLL Parity Demo',
    description: 'A single flipped yellow edge pair on the top layer',
    moves: "Rw U2 x Rw U2 Rw U2 Rw' U2 Lw U2 Rw' U2 Rw U2 Rw' U2 Rw'",
  },
  {
    name: 'PLL Parity Demo',
    description: 'Two swapped opposite edge pairs in the top layer',
    moves: "2R2 U2 2R2 Uw2 2R2 2U2",
  },
];
