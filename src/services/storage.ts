/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { createSolvedCubeState, getStickerColorCounts, isCubeSolved } from '../cube/cubeState';
import { CubeColor, CubeState, FACE_NAMES, FaceName, SolutionStep } from '../cube/types';

const STORAGE_KEY_STATE = 'rubiks_4x4_cube_state';
const STORAGE_KEY_SETTINGS = 'rubiks_4x4_settings';
const STORAGE_KEY_SAVED_SESSION = 'rubiks_4x4_saved_session';

export interface UserSettings {
  playbackSpeed: number;
  autoAdvance: boolean;
  pauseBetweenStages: boolean;
  showExplanationFirst: boolean;
  practiceMode: boolean;
  soundEnabled: boolean;
  hapticEnabled: boolean;
}

export const DEFAULT_SETTINGS: UserSettings = {
  playbackSpeed: 1.0,
  autoAdvance: true,
  pauseBetweenStages: false,
  showExplanationFirst: false,
  practiceMode: false,
  soundEnabled: true,
  hapticEnabled: true,
};

export interface SavedSession {
  cubeState: CubeState;
  initialState?: CubeState;
  scrambleMoves?: string[];
  solutionSteps: SolutionStep[];
  currentStepIndex: number;
  timestamp: number;
}

export interface PhysicalCubieExport {
  id: number;
  type: 'center' | 'edge' | 'corner';
  gridCoord: [number, number, number];
  stickers: Array<{
    face: FaceName;
    index: number;
    color: CubeColor;
  }>;
}

export interface ExportedCubeState {
  app: string;
  version: '2.0.0';
  timestamp: string;
  cubeSize: 4;
  cubeState: CubeState;
  initialState?: CubeState;
  scrambleMoves?: string[];
  solutionMoves?: string[];
  currentStepIndex?: number;
  cubies: PhysicalCubieExport[];
  summary: {
    isSolved: boolean;
    colorCounts: Record<CubeColor, number>;
  };
}

export interface ValidatedImportPayload {
  cubeState: CubeState;
  initialState: CubeState;
  scrambleMoves: string[];
  solutionMoves: string[];
  currentStepIndex: number;
}

const LAYER_COORDS = [-1.5, -0.5, 0.5, 1.5];

/**
 * Extracts the 56 physical cubies with their attached stickers and colors from a CubeState.
 */
export function extractPhysicalCubies(state: CubeState): PhysicalCubieExport[] {
  const cubies: PhysicalCubieExport[] = [];
  let id = 0;

  for (let xi = 0; xi < 4; xi++) {
    for (let yi = 0; yi < 4; yi++) {
      for (let zi = 0; zi < 4; zi++) {
        // Skip internal 8 hidden cubies
        const isInternal = (xi === 1 || xi === 2) && (yi === 1 || yi === 2) && (zi === 1 || zi === 2);
        if (isInternal) continue;

        const cx = LAYER_COORDS[xi];
        const cy = LAYER_COORDS[yi];
        const cz = LAYER_COORDS[zi];

        const stickers: Array<{ face: FaceName; index: number; color: CubeColor }> = [];

        // U face (top: yi === 3)
        if (yi === 3) {
          const r = zi;
          const c = xi;
          const idx = r * 4 + c;
          stickers.push({ face: 'U', index: idx, color: state.U[idx] });
        }

        // D face (bottom: yi === 0)
        if (yi === 0) {
          const r = 3 - zi;
          const c = xi;
          const idx = r * 4 + c;
          stickers.push({ face: 'D', index: idx, color: state.D[idx] });
        }

        // F face (front: zi === 3)
        if (zi === 3) {
          const r = 3 - yi;
          const c = xi;
          const idx = r * 4 + c;
          stickers.push({ face: 'F', index: idx, color: state.F[idx] });
        }

        // B face (back: zi === 0)
        if (zi === 0) {
          const r = 3 - yi;
          const c = 3 - xi;
          const idx = r * 4 + c;
          stickers.push({ face: 'B', index: idx, color: state.B[idx] });
        }

        // L face (left: xi === 0)
        if (xi === 0) {
          const r = 3 - yi;
          const c = zi;
          const idx = r * 4 + c;
          stickers.push({ face: 'L', index: idx, color: state.L[idx] });
        }

        // R face (right: xi === 3)
        if (xi === 3) {
          const r = 3 - yi;
          const c = 3 - zi;
          const idx = r * 4 + c;
          stickers.push({ face: 'R', index: idx, color: state.R[idx] });
        }

        const type: 'center' | 'edge' | 'corner' =
          stickers.length === 3 ? 'corner' : stickers.length === 2 ? 'edge' : 'center';

        cubies.push({
          id: id++,
          type,
          gridCoord: [cx, cy, cz],
          stickers,
        });
      }
    }
  }

  return cubies;
}

export function saveCubeStateToStorage(state: CubeState): void {
  try {
    localStorage.setItem(STORAGE_KEY_STATE, JSON.stringify(state));
  } catch (e) {
    console.warn('Failed to save cube state to localStorage:', e);
  }
}

export function loadCubeStateFromStorage(): CubeState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_STATE);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.U && parsed.D && parsed.F && parsed.B && parsed.L && parsed.R) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Failed to load cube state from localStorage:', e);
  }
  return createSolvedCubeState();
}

export function saveSettingsToStorage(settings: UserSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(settings));
  } catch (e) {
    console.warn('Failed to save settings:', e);
  }
}

export function loadSettingsFromStorage(): UserSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SETTINGS);
    if (raw) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
    }
  } catch (e) {
    console.warn('Failed to load settings:', e);
  }
  return DEFAULT_SETTINGS;
}

export function saveSessionToStorage(session: SavedSession): void {
  try {
    localStorage.setItem(STORAGE_KEY_SAVED_SESSION, JSON.stringify(session));
  } catch (e) {
    console.warn('Failed to save session:', e);
  }
}

export function loadSessionFromStorage(): SavedSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SAVED_SESSION);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.warn('Failed to load session:', e);
  }
  return null;
}

/**
 * Serializes the exact current 4x4 cube state with all 96 sticker colors,
 * 56 physical cubie positions and sticker bindings, and optional solving session metadata.
 */
export function exportCubeStateAsJson(
  state: CubeState,
  options?: {
    initialState?: CubeState;
    scrambleMoves?: string[];
    solutionMoves?: string[];
    currentStepIndex?: number;
  }
): string {
  const cubies = extractPhysicalCubies(state);
  const colorCounts = getStickerColorCounts(state);
  const solved = isCubeSolved(state);

  const payload: ExportedCubeState = {
    app: "Rubik's Revenge 4x4 Solver",
    version: '2.0.0',
    timestamp: new Date().toISOString(),
    cubeSize: 4,
    cubeState: state,
    initialState: options?.initialState || state,
    scrambleMoves: options?.scrambleMoves || [],
    solutionMoves: options?.solutionMoves || [],
    currentStepIndex: options?.currentStepIndex ?? 0,
    cubies,
    summary: {
      isSolved: solved,
      colorCounts,
    },
  };
  return JSON.stringify(payload, null, 2);
}

const VALID_COLORS = new Set<string>(['W', 'Y', 'G', 'B', 'O', 'R']);

/**
 * Imports and strictly validates a cube state from JSON string.
 * Supports v2.0.0, v1.0.0, and raw state objects.
 */
export function importCubeStateFromJson(jsonString: string): ValidatedImportPayload {
  let parsed: any;
  try {
    parsed = JSON.parse(jsonString);
  } catch (e) {
    throw new Error('Invalid JSON format: file contains malformed JSON.');
  }

  if (!parsed) {
    throw new Error('Empty JSON object.');
  }

  // Handle format: { cubeState: { U: [...], ... } } or raw { U: [...], ... }
  const rawState = parsed.cubeState || (parsed.U && parsed.D ? parsed : null);
  if (!rawState) {
    throw new Error('Invalid file format: missing cubeState object with 6 faces (U, D, F, B, L, R).');
  }

  // Validate each face
  const state = {} as CubeState;
  for (const face of FACE_NAMES) {
    const faceArr = rawState[face];
    if (!Array.isArray(faceArr)) {
      throw new Error(`Face ${face} is missing or not an array.`);
    }
    if (faceArr.length !== 16) {
      throw new Error(`Face ${face} must have exactly 16 sticker values, found ${faceArr.length}.`);
    }

    const validatedFace: CubeColor[] = [];
    for (let i = 0; i < 16; i++) {
      const c = String(faceArr[i]).toUpperCase();
      if (!VALID_COLORS.has(c)) {
        throw new Error(`Invalid color "${c}" on face ${face} at index ${i}. Must be W, Y, G, B, O, or R.`);
      }
      validatedFace.push(c as CubeColor);
    }
    state[face] = validatedFace;
  }

  // Initial state if present
  let initialState = state;
  if (parsed.initialState) {
    try {
      const initCheck = {} as CubeState;
      let validInit = true;
      for (const face of FACE_NAMES) {
        if (!Array.isArray(parsed.initialState[face]) || parsed.initialState[face].length !== 16) {
          validInit = false;
          break;
        }
        initCheck[face] = parsed.initialState[face].map((c: any) => String(c).toUpperCase() as CubeColor);
      }
      if (validInit) {
        initialState = initCheck;
      }
    } catch {
      initialState = state;
    }
  }

  const scrambleMoves: string[] = Array.isArray(parsed.scrambleMoves)
    ? parsed.scrambleMoves.filter((m: any) => typeof m === 'string')
    : [];

  const solutionMoves: string[] = Array.isArray(parsed.solutionMoves)
    ? parsed.solutionMoves.filter((m: any) => typeof m === 'string')
    : [];

  const currentStepIndex = typeof parsed.currentStepIndex === 'number'
    ? Math.max(0, parsed.currentStepIndex)
    : 0;

  return {
    cubeState: state,
    initialState,
    scrambleMoves,
    solutionMoves,
    currentStepIndex,
  };
}
