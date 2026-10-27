/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type FaceName = 'U' | 'D' | 'F' | 'B' | 'L' | 'R';

export type CubeColor = 'W' | 'Y' | 'G' | 'B' | 'O' | 'R';

export const CUBE_COLORS: Record<CubeColor, { name: string; hex: string; text: string; bg: string }> = {
  W: { name: 'White', hex: '#f8fafc', text: 'text-slate-900', bg: 'bg-slate-100' },
  Y: { name: 'Yellow', hex: '#facc15', text: 'text-yellow-950', bg: 'bg-yellow-400' },
  G: { name: 'Green', hex: '#16a34a', text: 'text-white', bg: 'bg-green-600' },
  B: { name: 'Blue', hex: '#2563eb', text: 'text-white', bg: 'bg-blue-600' },
  O: { name: 'Orange', hex: '#ea580c', text: 'text-white', bg: 'bg-orange-600' },
  R: { name: 'Red', hex: '#dc2626', text: 'text-white', bg: 'bg-red-600' },
};

export const FACE_NAMES: FaceName[] = ['U', 'D', 'F', 'B', 'L', 'R'];

export const DEFAULT_FACE_COLORS: Record<FaceName, CubeColor> = {
  U: 'W',
  D: 'Y',
  F: 'G',
  B: 'B',
  L: 'O',
  R: 'R',
};

export const FACE_DESCRIPTIONS: Record<FaceName, { label: string; orientation: string }> = {
  U: { label: 'Up (Top)', orientation: 'White face, Green towards you' },
  D: { label: 'Down (Bottom)', orientation: 'Yellow face, Green away from you' },
  F: { label: 'Front', orientation: 'Green face, White on top' },
  B: { label: 'Back', orientation: 'Blue face, White on top' },
  L: { label: 'Left', orientation: 'Orange face, White on top' },
  R: { label: 'Right', orientation: 'Red face, White on top' },
};

/**
 * 4x4 Cube State: 16 stickers per face (indices 0..15).
 * 0  1  2  3
 * 4  5  6  7
 * 8  9 10 11
 * 12 13 14 15
 */
export type CubeState = Record<FaceName, CubeColor[]>;

export interface MoveDetails {
  notation: string;
  axis: 'x' | 'y' | 'z';
  /**
   * Layer indices from 0 to 3 along the axis:
   * x: 0 is L, 1 is 2L, 2 is 2R, 3 is R
   * y: 0 is D, 1 is 2D, 2 is 2U, 3 is U
   * z: 0 is B, 1 is 2B, 2 is 2F, 3 is F
   */
  layers: number[];
  /** Direction: 1 for clockwise looking from positive axis, -1 for counter-clockwise, 2 for 180 degrees */
  direction: 1 | -1 | 2;
  description: string;
}

export type SolutionStage = 
  | 'Centers'
  | 'Edges'
  | '3x3 Reduction'
  | 'OLL Parity'
  | 'PLL Parity'
  | 'Verification';

export interface SolutionStep {
  move: string;
  stage: SolutionStage;
  stageStepNumber: number;
  stageTotalSteps: number;
  stepIndex: number;
  totalSteps: number;
  explanation: string;
  targetDescription: string;
  targetFace?: FaceName;
  targetLayers?: number[];
  algorithmSequence?: string[];
}

export interface ValidationIssue {
  type: 'error' | 'warning';
  title: string;
  message: string;
  affectedFaces?: FaceName[];
  affectedStickers?: { face: FaceName; index: number }[];
}

export interface ValidationResult {
  isValid: boolean;
  colorCounts: Record<CubeColor, number>;
  issues: ValidationIssue[];
  statusText: string;
}
