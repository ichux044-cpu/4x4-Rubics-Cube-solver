# Interactive 3D 4×4 Rubik’s Cube Solver & Step-by-Step Guide

A complete, high-fidelity web application for scanning, editing, solving, and physically practicing the 4×4×4 Rubik’s Cube (Rubik's Revenge). Features an interactive procedural Three.js 3D cube with real slice-layer kinematics, direct 3D/2D sticker painting, a deterministic 4×4 reduction solver with full OLL/PLL parity resolution, and a step-by-step interactive tutor with animated rotation arrows for physical cube mastery.

---

### User Review & Critical Decisions

> [!IMPORTANT]
> The architectural design integrates user preferences confirmed in Phase 1:
> - **3×3 Reduction Solving Method**: Beginner Layer-by-Layer with intuitive geometric explanations, layer highlighting, and clear sub-algorithms (White cross, corners, middle edges, yellow cross, edge swap, corner positioning).
> - **3D Practice Assistance**: Dynamic 3D rotation arrows curving around rotating layers plus accent highlights on active target cubies.
> - **Sticker Input**: Direct-click 3D interactive painting on the live cube, seamlessly synchronized with an unfolded 2D net and guided 6-face scanning wizard.

---

### 1. Overview & Core Concept

- **What It Does**: Allows cubers to input their physical 4×4 cube's sticker colors either by clicking directly on the 3D model or via an unfolded 2D net / step-by-step scanning wizard. Validates the physical feasibility (96 stickers, 16 per color, valid center/edge/corner invariants), runs a real 4×4 reduction solving algorithm, and plays back the solution step-by-step in 3D with adjustable speeds or in a physical practice mode.
- **Target Audience**: Cubers holding an unsolved 4×4 cube who need a real solution, students learning the 4×4 reduction method, and enthusiasts who want a 3D sandbox to scramble, experiment with algorithms, and visualize cube permutations.
- **Key Value**: Reliable local solving without external API dependencies, genuine 4×4 parity handling, and a physical practice workflow that ensures users never get lost while following along on their real cube.

---

### 2. User Experience & Visual Design

#### Visual Identity & Theme
- **Theme**: Premium dark technical workspace (`#090D16` canvas, `#111827` panels, `#1E293B` hairline borders).
- **Accents**: Electric Blue (`#3B82F6`) and Cyan (`#06B6D4`) for active stages, with high-contrast sticker shades:
  - White: `#F8FAFC`
  - Yellow: `#FACC15`
  - Green: `#16A34A`
  - Blue: `#2563EB`
  - Red: `#DC2626`
  - Orange: `#EA580C`
- **Typography**: Clean geometric typography (`Plus Jakarta Sans` for UI, `JetBrains Mono` / `tabular-nums` for move notation and step telemetry).
- **Layout Rhythm**: 3-panel widescreen layout with collapsible docks for mobile/compact screens:
  - **Left Panel (Cube Setup & Color Editor)**: Color palette swatches, 2D unfolded net toggle, guided face scanner, validation badge, quick actions (Solved, Scramble, Clear, Import/Export).
  - **Center Viewport (3D Interactive Cube)**: Full-bleed WebGL canvas, smooth OrbitControls, 3D turn arrows, camera view angle presets, and floating collapsible playback dock.
  - **Right Panel (Step-by-Step Solving Guide)**: Current stage badge, move counter, huge notation display, plain-English mechanical explanation, algorithm sequence breakdown, and physical cube confirmation button.

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ [4×4 CUBE SOLVER]       Phase: Stage 2 (Edge Pairing)        [Presets ▾] [Export] [Help]│
├─────────────────────┬──────────────────────────────────────┬───────────────────────────┤
│ CUBE SETUP & INPUT  │          3D CUBE VIEWPORT            │ STEP-BY-STEP SOLVING GUIDE│
│ ┌─────────────────┐ │                                      │ ┌───────────────────────┐ │
│ │ Active Palette  │ │        [3D Curved Turn Arrow]        │ │ STAGE 2: EDGE PAIRING │ │
│ │ [W][Y][G][B][R] │ │            ┌───────┐                 │ │ Move 14 of 72         │ │
│ ├─────────────────┤ │           /  U    /│                 │ ├───────────────────────┤ │
│ │ Mode: 3D Direct │ │          ┌───────┐ │                 │ │    Rw U2 Rw'          │ │
│ │ [2D Net] [Scan] │ │          │   F   │ R                 │ │ "Turn right two layers│ │
│ ├─────────────────┤ │          │       │/                  │ │  up, top face 180°,   │ │
│ │ Validation: OK  │ │          └───────┘                   │ │  restore right slice" │ │
│ │ 96/96 (16 each) │ │                                      │ ├───────────────────────┤ │
│ ├─────────────────┤ │ ┌──────────────────────────────────┐ │ │ [✓ Physical Matches] │ │
│ │ [Solve My Cube] │ │ │ ◄◄  ◄  [ ► Play ]  ►  ►►  1.0× ▾ │ │ │ [Repeat] [Next Move]  │ │
│ └─────────────────┘ │ └──────────────────────────────────┘ │ └───────────────────────┘ │
└─────────────────────┴──────────────────────────────────────┴───────────────────────────┘
```

---

### 3. Key Product Decisions & Trade-Offs

- **Deterministic Local Reduction Solver**:
  - *Chosen Approach*: Implement a pure TypeScript 4×4 reduction engine directly in the app. Solves centers using commutators, pairs the 12 edge groups with standard slice-flip-slice algorithms, reduces to 3×3, executes a layer-by-layer solver, and automatically detects/resolves OLL parity (`Rw U2 x Rw U2 Rw U2 Rw' U2 Lw U2 Rw' U2 Rw U2 Rw' U2 Rw'`) and PLL parity (`2R2 U2 2R2 Uw2 2R2 2U2`).
  - *Why*: Guaranteed to work offline, instant calculation (<50ms), reproducible move-by-move verification, zero external server latency or 404 failures.
- **Three.js Procedural Cubie Kinematics**:
  - *Chosen Approach*: Construct a 4×4 grid of 56 physical cubie groups (`THREE.Group` per cubie). Each cubie contains a rounded black plastic core with beveled edges and offset colored sticker planes. When a move (e.g., `Rw`, `2R`, `U'`) triggers:
    1. Filter cubies belonging to the specified axis slice (`layerIndex in [0..3]`).
    2. Attach them dynamically to a temporary rotation pivot node.
    3. Animate the pivot smoothly using damped easing.
    4. Upon completion, detach cubies back to root scene and snap their logical and spatial coordinates to precise integers, eliminating visual floating-point drift.
  - *Why*: Matches real-world physics, allows independent slice turns (`2R`), wide turns (`Rw`), and outer turns (`R`) without visual artifacts.
- **Practice Mode Synchronization**:
  - *Chosen Approach*: Dual-track player. In "Auto Solve" mode, moves play sequentially at chosen speeds (0.25x to 4x). In "Physical Practice" mode, the player pauses on each move, renders a 3D curved turn arrow around the active slice, displays the finger/layer instruction, and waits for "My physical cube matches" before advancing.

---

### 4. Technical Architecture & Data Strategy

```
┌────────────────────────────────────────────────────────────────────────┐
│                             React UI Shell                             │
│       (App.tsx, Navigation, Header, Responsive Drawer Layout)          │
└───────┬───────────────────────────────┬────────────────────────┬───────┘
        │                               │                        │
        ▼                               ▼                        ▼
┌──────────────────┐          ┌──────────────────┐     ┌──────────────────┐
│   Left Panel:    │          │  Center Canvas:  │     │   Right Panel:   │
│   Cube Setup     │          │    Cube3D.tsx    │     │  Solving Guide   │
│ - Color Palette  │          │ - Three.js Scene │     │ - Stage Tracker  │
│ - 3D Click Paint │          │ - Procedural Mesh│     │ - Current Move   │
│ - 2D Net Editor  │          │ - Kinematic Pivot│     │ - Practice Mode  │
│ - 6-Face Wizard  │          │ - Curved Arrows  │     │ - Playback Dock  │
│ - State Validate │          │ - Raycaster Pick │     │ - Step Explainer │
└────────┬─────────┘          └────────┬─────────┘     └────────┬─────────┘
         │                             │                        │
         ▼                             ▼                        ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        Zustand Store / State                           │
│  - cubeState: 96-sticker array [U0..15, D0..15, L0..15, ...]          │
│  - moveHistory: Move[] | solutionSteps: SolutionStep[]                 │
│  - currentStepIndex: number | playbackSpeed: number                    │
│  - isPracticing: boolean | activeColor: CubeColor                      │
└───────┬──────────────────────────────┬─────────────────────────────────┘
        │                              │
        ▼                              ▼
┌─────────────────────────┐   ┌──────────────────────────────────────────┐
│   Cube Engine / Logic   │   │             4×4 Solver Core              │
│ - applyMove(state, move)│   │ - Stage 1: Solve Centers (6 faces)       │
│ - invertMove(move)      │   │ - Stage 2: Pair 12 Edge Wings            │
│ - validateCube(state)   │   │ - Stage 3: 3×3 Reduction (Beginner LBL)  │
│ - scrambleGenerator()   │   │ - Stage 4: Detect & Apply OLL/PLL Parity │
│ - isSolved(state)       │   │ - verifySolvedState(state)               │
└─────────────────────────┘   └──────────────────────────────────────────┘
```

#### Core Data Entities
1. `CubeColor`: `'W' | 'Y' | 'G' | 'B' | 'R' | 'O'` with customizable hex values and standard Western orientation mapping.
2. `FaceId`: `'U' | 'D' | 'F' | 'B' | 'L' | 'R'`
3. `Move`: Notation string (e.g. `'R'`, `'R\''`, `'R2'`, `'Rw'`, `'2R'`, `'x'`) containing:
   - `axis`: `'x' | 'y' | 'z'`
   - `layers`: `number[]` (e.g. `[3]` for `R`, `[2, 3]` for `Rw`, `[2]` for `2R`)
   - `quarterTurns`: `1 | -1 | 2`
   - `description`: Plain-English explanation
4. `SolutionStep`:
   - `move`: `Move`
   - `stage`: `'Centers' | 'Edges' | '3x3 Reduction' | 'Parity'`
   - `explanation`: Detailed guidance
   - `targetPieces`: Coordinates or sticker indices to highlight
5. `ValidationResult`:
   - `isValid`: `boolean`
   - `errors`: List of specific issues (color count mismatch, impossible corner combination, parity issue)
   - `colorCounts`: Count of each of the 6 colors (must be exactly 16 each)

---

### 5. Implementation Roadmap (Post-Approval)

1. **Dependencies Installation**: Install `three` and `@types/three`.
2. **Cube Data & Move Math (`src/cube/`)**:
   - `types.ts`: Strict types for colors, faces, coordinates, and moves.
   - `cubeState.ts`: 96-sticker state array representation, initial solved state, clones, and validations.
   - `cubeMoves.ts`: Permutation tables and coordinate transforms for all outer, inner slice, wide, and cube rotation turns.
   - `scramble.ts`: WCA-style random 4×4 scramble generator.
3. **Real 4×4 Solver Engine (`src/solver/`)**:
   - Centers reduction algorithm (solves opposite White/Yellow, then F, R, B, L).
   - Edge pairing algorithm (slice-flip-slice edge pairing for all 12 wings).
   - 3×3 Layer-by-Layer solver (Cross, Corners, Middle Layer, Yellow Cross, Yellow Edges, Yellow Corners).
   - OLL & PLL parity detection and algorithm insertion.
   - Solution optimizer & move simplifier.
4. **Three.js 3D Visualizer (`src/components/Cube3D/`)**:
   - WebGL renderer with `RoomEnvironment`, `ACESFilmicToneMapping`, and software-WebGL safety guards.
   - 56 procedural cubies with rounded geometry, inner core, and realistic colored stickers.
   - Dynamic rotation pivot system with smooth kinematic easing.
   - 3D curved turn arrows and target piece highlighting.
   - Raycasting for direct 3D sticker painting.
5. **Cube Color Editor & Scanner (`src/components/Editor/`)**:
   - 6-color paint palette with sticker counter (shows count / 16 for each color).
   - 2D flat unfolded net editor.
   - Guided 6-face scanning wizard with camera auto-positioning.
   - Real-time physical validation checker with specific actionable feedback.
6. **Solving Guide & Practice Mode (`src/components/Guide/`)**:
   - Stage-by-stage algorithm display with progress indicators.
   - Big notation card, layer diagram, and move explanations.
   - Dedicated Physical Practice Mode with "My physical cube matches" verification.
   - Speed dock with 0.25x to 4x presets, play/pause, step controls, and jump scrubber.
7. **Persistence & Testing**:
   - LocalStorage save/restore for custom states and speed preferences.
   - JSON export and import.
   - Vitest test suite testing move inverses, cycle identities, sticker validation, and solver verification.
