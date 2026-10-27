/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, expect, it } from 'vitest';
import { applyMove, applyMoves, invertMove, invertMoves } from '../cubeMoves';
import {
  cloneCubeState,
  createSolvedCubeState,
  getStickerColorCounts,
  isCubeSolved,
  validateCubeState,
} from '../cubeState';
import { generateScramble } from '../scramble';
import { solve4x4 } from '../../solver/solver4x4';
import {
  exportCubeStateAsJson,
  extractPhysicalCubies,
  importCubeStateFromJson,
} from '../../services/storage';

describe('4x4 Cube State & Moves Invariants', () => {
  it('creates solved cube with exactly 16 stickers of each of 6 colors', () => {
    const state = createSolvedCubeState();
    const counts = getStickerColorCounts(state);
    expect(counts.W).toBe(16);
    expect(counts.Y).toBe(16);
    expect(counts.G).toBe(16);
    expect(counts.B).toBe(16);
    expect(counts.O).toBe(16);
    expect(counts.R).toBe(16);
    expect(isCubeSolved(state)).toBe(true);
  });

  it('preserves cube state after 4 quarter turns of outer layer (R R R R)', () => {
    const initial = createSolvedCubeState();
    const after4R = applyMoves(initial, 'R R R R');
    expect(after4R).toEqual(initial);
  });

  it('preserves cube state after 4 quarter turns of wide layer (Rw Rw Rw Rw)', () => {
    const initial = createSolvedCubeState();
    const after4Rw = applyMoves(initial, 'Rw Rw Rw Rw');
    expect(after4Rw).toEqual(initial);
  });

  it('preserves cube state after 4 quarter turns of inner slice (2R 2R 2R 2R)', () => {
    const initial = createSolvedCubeState();
    const after4Slice = applyMoves(initial, '2R 2R 2R 2R');
    expect(after4Slice).toEqual(initial);
  });

  it('correctly inverts moves with invertMove (M followed by M\' returns identity)', () => {
    const initial = createSolvedCubeState();
    const movesToTest = ['U', "U'", 'U2', 'R', "R'", 'R2', 'Rw', "Rw'", '2R', 'F', 'Bw', 'x', 'y', 'z'];

    for (const m of movesToTest) {
      const inverted = invertMove(m);
      const after = applyMoves(initial, `${m} ${inverted}`);
      expect(after).toEqual(initial);
    }
  });

  it('correctly inverts multi-move sequences with invertMoves', () => {
    const initial = createSolvedCubeState();
    const sequence = 'Rw U2 x Rw U2 Rw';
    const invertedSeq = invertMoves(sequence).join(' ');
    const after = applyMoves(initial, `${sequence} ${invertedSeq}`);
    expect(after).toEqual(initial);
  });

  it('validates cube state and flags invalid color counts, and autoBalance fixes it', async () => {
    const state = createSolvedCubeState();
    state.U[0] = 'Y'; // Now 17 Yellows, 15 Whites
    const validation = validateCubeState(state);
    expect(validation.isValid).toBe(false);
    expect(validation.statusText).toContain('Incorrect color counts');

    const { autoBalanceCubeState } = await import('../cubeState');
    const balanced = autoBalanceCubeState(state);
    const counts = getStickerColorCounts(balanced);
    expect(counts.W).toBe(16);
    expect(counts.Y).toBe(16);
  });

  it('generates scrambles of requested length and solves without throwing', () => {
    const scramble = generateScramble(12);
    const solved = createSolvedCubeState();
    const scrambled = applyMoves(solved, scramble);
    const result = solve4x4(scrambled);
    expect(result.steps.length).toBeGreaterThan(0);
  });
});

describe('Export & Import Exact State Acceptance Tests', () => {
  it('preserves all 96 stickers and 56 cubies exactly after scramble, export, and re-import', () => {
    // 1. Start with solved cube
    const solved = createSolvedCubeState();
    // 2. Generate scramble
    const scramble = generateScramble(20);
    const moves = scramble.split(' ');
    const scrambled = applyMoves(solved, scramble);

    // 3. Export scrambled cube
    const json = exportCubeStateAsJson(scrambled, {
      initialState: scrambled,
      scrambleMoves: moves,
    });

    const parsed = JSON.parse(json);
    expect(parsed.version).toBe('2.0.0');
    expect(parsed.cubies.length).toBe(56);
    expect(parsed.cubeSize).toBe(4);

    // 4. Change the cube to another state (e.g. apply 5 more moves)
    const altered = applyMoves(scrambled, "U R F' D B");
    expect(altered).not.toEqual(scrambled);

    // 5. Import exported JSON
    const imported = importCubeStateFromJson(json);

    // 6. Verify that all 96 sticker positions and colors match the exported state exactly
    expect(imported.cubeState).toEqual(scrambled);
    expect(imported.scrambleMoves).toEqual(moves);

    // Verify 56 physical cubies match
    const originalCubies = extractPhysicalCubies(scrambled);
    const importedCubies = extractPhysicalCubies(imported.cubeState);
    expect(importedCubies).toEqual(originalCubies);
  });

  it('preserves manually painted cube exactly on export and import without inferring defaults', () => {
    const custom = createSolvedCubeState();
    // Swap specific stickers
    custom.U[5] = 'R';
    custom.R[5] = 'W';
    custom.F[10] = 'B';
    custom.B[10] = 'G';

    const json = exportCubeStateAsJson(custom);
    const imported = importCubeStateFromJson(json);

    expect(imported.cubeState.U[5]).toBe('R');
    expect(imported.cubeState.R[5]).toBe('W');
    expect(imported.cubeState.F[10]).toBe('B');
    expect(imported.cubeState.B[10]).toBe('G');
    expect(imported.cubeState).toEqual(custom);
  });

  it('preserves a partially completed solving session with step index', () => {
    const solved = createSolvedCubeState();
    const scramble = 'R U R\' U\'';
    const scrambled = applyMoves(solved, scramble);

    // Partial step: 2 moves in
    const partialState = applyMoves(scrambled, 'U R');
    const solutionMoves = ['U', 'R', "U'", "R'"];

    const json = exportCubeStateAsJson(partialState, {
      initialState: scrambled,
      solutionMoves,
      currentStepIndex: 2,
    });

    const imported = importCubeStateFromJson(json);
    expect(imported.cubeState).toEqual(partialState);
    expect(imported.initialState).toEqual(scrambled);
    expect(imported.solutionMoves).toEqual(solutionMoves);
    expect(imported.currentStepIndex).toBe(2);
  });
});

describe('Physical Piece Identity Invariants (Stickers Belong to Cubies)', () => {
  it('preserves the multi-sticker color sets on corner cubies across moves', () => {
    const initial = createSolvedCubeState();
    const initialCubies = extractPhysicalCubies(initial);
    const initialCorners = initialCubies.filter(c => c.type === 'corner');
    expect(initialCorners.length).toBe(8);

    // Extract sorted color triplets for each corner
    const getCornerColorSignatures = (cubies: ReturnType<typeof extractPhysicalCubies>) => {
      return cubies
        .filter(c => c.type === 'corner')
        .map(c => c.stickers.map(s => s.color).sort().join('-'))
        .sort();
    };

    const initialSignatures = getCornerColorSignatures(initialCubies);

    // Apply various complex turns
    const moves = ["R", "U'", "Rw2", "F", "2R", "D'"];
    let state = initial;
    for (const m of moves) {
      state = applyMove(state, m);
      const cubies = extractPhysicalCubies(state);
      const signatures = getCornerColorSignatures(cubies);
      // Every physical corner's collection of colors MUST be identical to the starting pieces
      expect(signatures).toEqual(initialSignatures);
    }
  });

  it('preserves edge piece color pairs across outer and slice moves', () => {
    const initial = createSolvedCubeState();
    const initialCubies = extractPhysicalCubies(initial);

    const getEdgeSignatures = (cubies: ReturnType<typeof extractPhysicalCubies>) => {
      return cubies
        .filter(c => c.type === 'edge')
        .map(c => c.stickers.map(s => s.color).sort().join('-'))
        .sort();
    };

    const initialEdgeSignatures = getEdgeSignatures(initialCubies);
    expect(initialEdgeSignatures.length).toBe(24);

    const moves = ["Rw", "2R'", "Uw2", "Fw", "2D", "L'"];
    let state = initial;
    for (const m of moves) {
      state = applyMove(state, m);
      const cubies = extractPhysicalCubies(state);
      const signatures = getEdgeSignatures(cubies);
      expect(signatures).toEqual(initialEdgeSignatures);
    }
  });
});
