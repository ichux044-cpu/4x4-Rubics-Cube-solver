# Rubik's Revenge 4×4 Interactive 3D Solver & Step-by-Step Guide

A complete, high-performance web application to recreate, validate, solve, and physically practice the 4×4×4 Rubik's Cube (Rubik's Revenge).

## Key Features

- **Interactive 3D Three.js Cube**:
  - Realistic procedural cubies with beveled edges, plastic core, and glossy PBR sticker decals.
  - Studio environment lighting with `RoomEnvironment` and `ACESFilmicToneMapping`.
  - Realistic slice-layer rotation kinematics with smooth easing and zero visual drift.
  - Dynamic 3D curved turn arrows indicating rotation direction and angle.
  - Direct 3D click-to-paint sticker editing.
- **Physical Cube Color Editor**:
  - 2D flat unfolded net (U, L, F, R, B, D) and step-by-step 6-face guided scanning wizard.
  - 6-color paint palette with live count counters (16 of each color required).
  - Click-and-drag painting, undo/redo, fill face, and quick presets.
  - Real-time physical validation checker (96 stickers, color counts, corner invariants, edge invariants, parity checks).
- **Deterministic 4×4 Reduction Solving Engine**:
  - Centers solving (White, Yellow, and lateral Green/Red/Blue/Orange centers).
  - 12 composite edge pair pairing via slice-flip-slice algorithms.
  - 3×3 Beginner Layer-by-Layer reduction stage (Cross, Corners, Middle Layer, Yellow Cross, Yellow Edges, Yellow Corners).
  - Automatic detection and resolution of OLL parity (`Rw U2 x Rw U2 Rw U2 Rw' U2 Lw U2 Rw' U2 Rw U2 Rw' U2 Rw'`) and PLL parity (`2R2 U2 2R2 Uw2 2R2 2U2`).
  - Move optimization and redundant move cancelation.
- **Step-by-Step Interactive Solving Guide**:
  - Real-time stage progress badges and move counters.
  - Large readable notation display with plain-English mechanical explanations.
  - Target piece highlighting on the 3D cube.
  - Complete algorithm sequence list with jump scrubber.
- **Physical Cube Practice Mode**:
  - Guided step-by-step playback designed for cubers holding a real cube.
  - Big directional turn arrows and finger-placement hints.
  - "My physical cube matches" verification button with mistake rewind support.
- **Playback & Speed Controls**:
  - Speed slider from 0.25× to 4.0× with immediate mid-play adjustment.
  - Play, pause, step forward, step backward, restart, and jump.
- **Scramble Generator & Persistence**:
  - Official WCA-compliant 4×4 random scrambles.
  - LocalStorage persistence for cube states and user preferences.
  - JSON state export and import.

## Move Notation Reference

- **Outer Layer Turns**: `U`, `D`, `L`, `R`, `F`, `B` (90° clockwise). Add `'` for counter-clockwise, `2` for 180° double turn.
- **Wide Turns**: `Rw`, `Lw`, `Uw`, `Dw`, `Fw`, `Bw` (turns the outer layer together with the adjacent inner slice).
- **Inner Slice Turns**: `2R`, `2L`, `2U`, `2D`, `2F`, `2B` (turns only the second slice in from the face).
- **Cube Rotations**: `x`, `y`, `z` (rotates entire cube around the respective axis).

## Running Locally

1. Clone or download the repository.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```
4. Build for production:
   ```bash
   npm run build
   ```
5. Run unit tests:
   ```bash
   npm run test
   ```
