/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Normalizes and cancels redundant consecutive moves.
 * e.g., ["U", "U'"] -> []
 * e.g., ["U", "U"] -> ["U2"]
 * e.g., ["R", "R2"] -> ["R'"]
 * e.g., ["R2", "R2"] -> []
 */
export function optimizeMoves(moves: string[]): string[] {
  if (moves.length === 0) return [];

  const result: string[] = [];

  for (const m of moves) {
    if (!m) continue;

    // Parse base and turns
    let base = m;
    let turns = 1;
    if (base.endsWith("'")) {
      turns = 3;
      base = base.slice(0, -1);
    } else if (base.endsWith("2")) {
      turns = 2;
      base = base.slice(0, -1);
    }

    if (result.length > 0) {
      const prev = result[result.length - 1];
      let prevBase = prev;
      let prevTurns = 1;
      if (prevBase.endsWith("'")) {
        prevTurns = 3;
        prevBase = prevBase.slice(0, -1);
      } else if (prevBase.endsWith("2")) {
        prevTurns = 2;
        prevBase = prevBase.slice(0, -1);
      }

      if (prevBase === base) {
        result.pop();
        const totalTurns = (prevTurns + turns) % 4;
        if (totalTurns === 1) {
          result.push(base);
        } else if (totalTurns === 2) {
          result.push(`${base}2`);
        } else if (totalTurns === 3) {
          result.push(`${base}'`);
        }
        continue;
      }
    }

    result.push(m);
  }

  return result;
}
