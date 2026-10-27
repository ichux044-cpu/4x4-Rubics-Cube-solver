/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import { ThreeCube } from './components/Cube3D/ThreeCube';
import { CubeColorEditor } from './components/Editor/CubeColorEditor';
import { AlgorithmGuide } from './components/Guide/AlgorithmGuide';
import { NotationModal } from './components/NotationModal';
import { applyMove, applyMoves } from './cube/cubeMoves';
import {
  cloneCubeState,
  createSolvedCubeState,
  isCubeSolved,
  validateCubeState,
} from './cube/cubeState';
import { generateScramble, PRESET_PATTERNS } from './cube/scramble';
import {
  CubeColor,
  CubeState,
  DEFAULT_FACE_COLORS,
  FACE_NAMES,
  FaceName,
  SolutionStep,
  ValidationResult,
} from './cube/types';
import {
  DEFAULT_SETTINGS,
  exportCubeStateAsJson,
  importCubeStateFromJson,
  loadCubeStateFromStorage,
  loadSettingsFromStorage,
  saveCubeStateToStorage,
  saveSettingsToStorage,
  UserSettings,
} from './services/storage';
import { playSuccessFanfare } from './services/sound';

export default function App() {
  // Core State
  const [cubeState, setCubeState] = useState<CubeState>(() => loadCubeStateFromStorage());
  const [initialScrambleState, setInitialScrambleState] = useState<CubeState>(() => loadCubeStateFromStorage());
  const [undoStack, setUndoStack] = useState<CubeState[]>([]);
  const [redoStack, setRedoStack] = useState<CubeState[]>([]);

  // Editor State
  const [activePaintColor, setActivePaintColor] = useState<CubeColor>('W');
  const [activeFaceHint, setActiveFaceHint] = useState<FaceName | null>(null);

  // Solution & Playback State
  const [solutionSteps, setSolutionSteps] = useState<SolutionStep[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const isPlayingRef = useRef<boolean>(false);
  isPlayingRef.current = isPlaying;
  const [currentAnimatedMove, setCurrentAnimatedMove] = useState<string | null>(null);
  const [lastConfirmedPhysicalStep, setLastConfirmedPhysicalStep] = useState<number>(0);
  const [scrambleMovesHistory, setScrambleMovesHistory] = useState<string[]>([]);

  // In-app notification toast (replaces window.alert for iframe compatibility)
  const [notification, setNotification] = useState<{
    type: 'success' | 'warning' | 'error' | 'info';
    title: string;
    message: string;
  } | null>(null);

  // Settings
  const [settings, setSettings] = useState<UserSettings>(() => loadSettingsFromStorage());

  // UI Modals & Navigation
  const [isNotationModalOpen, setIsNotationModalOpen] = useState(false);
  const [activeMobileTab, setActiveMobileTab] = useState<'editor' | 'viewport' | 'guide'>('viewport');
  const [presetDropdownOpen, setPresetDropdownOpen] = useState(false);

  // File import ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-dismiss notification after 6 seconds
  useEffect(() => {
    if (!notification) return;
    const timer = setTimeout(() => setNotification(null), 6000);
    return () => clearTimeout(timer);
  }, [notification]);

  // Validation
  const validation: ValidationResult = validateCubeState(cubeState);

  // Auto-save cube state and settings
  useEffect(() => {
    saveCubeStateToStorage(cubeState);
  }, [cubeState]);

  useEffect(() => {
    saveSettingsToStorage(settings);
  }, [settings]);

  // Auto-balance sticker counts
  const handleAutoBalanceColors = async () => {
    const { autoBalanceCubeState } = await import('./cube/cubeState');
    const balanced = autoBalanceCubeState(cubeState);
    setUndoStack(prev => [...prev, cloneCubeState(cubeState)]);
    setCubeState(balanced);
    setSolutionSteps([]);
    setCurrentStepIndex(0);
    setIsPlaying(false);
    setNotification({
      type: 'success',
      title: 'Colors Auto-Balanced',
      message: 'Adjusted stickers to exactly 16 per color with 4 of each color on center blocks.',
    });
  };

  // Handle Sticker Painting
  const handleUpdateSticker = (face: FaceName, index: number, color: CubeColor) => {
    setUndoStack(prev => [...prev.slice(-20), cloneCubeState(cubeState)]);
    setRedoStack([]);

    setCubeState(prev => {
      const next = cloneCubeState(prev);
      next[face][index] = color;
      return next;
    });

    if (solutionSteps.length > 0) {
      setSolutionSteps([]);
      setCurrentStepIndex(0);
      setIsPlaying(false);
    }
  };

  const handleUndo = () => {
    if (undoStack.length === 0) return;
    const prev = undoStack[undoStack.length - 1];
    setRedoStack(r => [...r, cloneCubeState(cubeState)]);
    setUndoStack(u => u.slice(0, -1));
    setCubeState(prev);
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setUndoStack(u => [...u, cloneCubeState(cubeState)]);
    setRedoStack(r => r.slice(0, -1));
    setCubeState(next);
  };

  const handleResetToSolved = () => {
    setUndoStack(prev => [...prev, cloneCubeState(cubeState)]);
    setRedoStack([]);
    const solved = createSolvedCubeState();
    setCubeState(solved);
    setInitialScrambleState(solved);
    setScrambleMovesHistory([]);
    setSolutionSteps([]);
    setCurrentStepIndex(0);
    setIsPlaying(false);
    setNotification({
      type: 'info',
      title: 'Reset to Solved',
      message: 'The cube has been restored to its pristine solved state.',
    });
  };

  const handleClearCube = () => {
    setUndoStack(prev => [...prev, cloneCubeState(cubeState)]);
    setRedoStack([]);
    const cleared = {} as CubeState;
    for (const f of FACE_NAMES) {
      cleared[f] = Array(16).fill('W');
    }
    setCubeState(cleared);
    setScrambleMovesHistory([]);
  };

  const handleGenerateScramble = () => {
    const scramble = generateScramble(30);
    const moves = scramble.split(' ');
    const solved = createSolvedCubeState();
    const scrambled = applyMoves(solved, scramble);

    setUndoStack(prev => [...prev, cloneCubeState(cubeState)]);
    setRedoStack([]);
    setCubeState(scrambled);
    setInitialScrambleState(scrambled);
    setScrambleMovesHistory(moves);
    setSolutionSteps([]);
    setCurrentStepIndex(0);
    setIsPlaying(false);
    setNotification({
      type: 'info',
      title: '30-Move Scramble Generated',
      message: 'Ready to solve! Click "Calculate & Solve Cube" in the editor.',
    });
  };

  const handleApplyPreset = (patternMoves: string) => {
    const solved = createSolvedCubeState();
    const result = applyMoves(solved, patternMoves);
    setUndoStack(prev => [...prev, cloneCubeState(cubeState)]);
    setRedoStack([]);
    setCubeState(result);
    setInitialScrambleState(result);
    setScrambleMovesHistory(patternMoves.trim().split(/\s+/).filter(Boolean));
    setSolutionSteps([]);
    setPresetDropdownOpen(false);
  };

  // Solve Engine Invocation
  const handleStartSolve = async () => {
    if (!validation.isValid) {
      setNotification({
        type: 'warning',
        title: 'Validation Notice',
        message: `${validation.statusText}. Click "Auto-Balance Colors" to instantly balance your 96 stickers to 16 per color.`,
      });
      return;
    }

    try {
      const { solve4x4 } = await import('./solver/solver4x4');
      const result = solve4x4(
        cubeState,
        scrambleMovesHistory.length > 0 ? scrambleMovesHistory : undefined
      );

      if (result.steps && result.steps.length > 0) {
        setInitialScrambleState(cloneCubeState(cubeState));
        setSolutionSteps(result.steps);
        setCurrentStepIndex(0);
        setLastConfirmedPhysicalStep(0);
        setActiveMobileTab('guide');
        setNotification({
          type: 'success',
          title: 'Solution Found!',
          message: `${result.steps.length} steps calculated across 4 reduction stages. Follow the guide in the right panel!`,
        });
      } else {
        setNotification({
          type: 'info',
          title: 'Cube Already Solved',
          message: 'All 6 faces are already completely uniform and solved.',
        });
      }
    } catch (err) {
      console.error('Solve error:', err);
      setNotification({
        type: 'error',
        title: 'Solving Error',
        message: 'Could not calculate solution: ' + String(err),
      });
    }
  };

  // Playback Navigation Handlers
  const handlePlay = () => {
    if (solutionSteps.length === 0) return;
    if (currentStepIndex >= solutionSteps.length) {
      // Replay from beginning
      setCubeState(cloneCubeState(initialScrambleState));
      setCurrentStepIndex(0);
      setIsPlaying(true);
      triggerCurrentMoveAnimation(0);
      return;
    }
    setIsPlaying(true);
    triggerCurrentMoveAnimation(currentStepIndex);
  };

  const handlePause = () => {
    setIsPlaying(false);
    setCurrentAnimatedMove(null);
  };

  const handleNextStep = () => {
    if (solutionSteps.length === 0) return;
    if (currentStepIndex >= solutionSteps.length) return;
    if (currentAnimatedMove) return;
    triggerCurrentMoveAnimation(currentStepIndex);
  };

  const handlePrevStep = () => {
    if (currentStepIndex > 0) {
      handleJumpToStep(currentStepIndex - 1);
    }
  };

  const handleJumpToStep = (targetIdx: number) => {
    if (targetIdx < 0 || targetIdx > solutionSteps.length) return;
    setIsPlaying(false);
    setCurrentAnimatedMove(null);
    let state = cloneCubeState(initialScrambleState);
    for (let i = 0; i < targetIdx; i++) {
      state = applyMove(state, solutionSteps[i].move);
    }
    setCubeState(state);
    setCurrentStepIndex(targetIdx);
  };

  const handleRestart = () => {
    handleJumpToStep(0);
  };

  const triggerCurrentMoveAnimation = (idx: number) => {
    if (idx < solutionSteps.length) {
      setCurrentAnimatedMove(solutionSteps[idx].move);
    }
  };

  // Called when 3D layer animation completes
  const handleMoveComplete = () => {
    setCurrentAnimatedMove(null);

    // Apply logical move to state
    if (currentStepIndex < solutionSteps.length) {
      const step = solutionSteps[currentStepIndex];
      const nextState = applyMove(cubeState, step.move);
      setCubeState(nextState);

      const nextIdx = currentStepIndex + 1;
      setCurrentStepIndex(nextIdx);

      if (nextIdx >= solutionSteps.length) {
        // Solution completed!
        setIsPlaying(false);
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });
        playSuccessFanfare();
        setNotification({
          type: 'success',
          title: 'Cube Solved!',
          message: 'All layers and pieces have been completely resolved.',
        });
        return;
      }

      if (isPlayingRef.current && !settings.practiceMode) {
        const pauseMs = Math.max(50, 320 / settings.playbackSpeed);
        setTimeout(() => {
          if (isPlayingRef.current) {
            triggerCurrentMoveAnimation(nextIdx);
          }
        }, pauseMs);
      }
    }
  };

  const handleConfirmPhysicalMatch = () => {
    setLastConfirmedPhysicalStep(currentStepIndex);
    if (currentStepIndex < solutionSteps.length) {
      handleNextStep();
    }
  };

  // Export & Import
  const handleExportJson = () => {
    const json = exportCubeStateAsJson(cubeState, {
      initialState: initialScrambleState,
      scrambleMoves: scrambleMovesHistory,
      solutionMoves: solutionSteps.map(s => s.move),
      currentStepIndex,
    });
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rubiks_4x4_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setNotification({
      type: 'success',
      title: 'Cube State Exported',
      message: 'Exact cube state, 96 stickers, and physical cubie arrangement saved to JSON.',
    });
  };

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const content = ev.target?.result as string;
        const imported = importCubeStateFromJson(content);

        setUndoStack(prev => [...prev.slice(-20), cloneCubeState(cubeState)]);
        setRedoStack([]);

        // Restore exact imported state
        setCubeState(imported.cubeState);
        setInitialScrambleState(imported.initialState || cloneCubeState(imported.cubeState));
        setScrambleMovesHistory(imported.scrambleMoves || []);

        setIsPlaying(false);
        setCurrentAnimatedMove(null);

        if (imported.solutionMoves && imported.solutionMoves.length > 0) {
          const total = imported.solutionMoves.length;
          const steps: SolutionStep[] = imported.solutionMoves.map((m, idx) => ({
            move: m,
            stage: '3x3 Reduction' as const,
            stageStepNumber: idx + 1,
            stageTotalSteps: total,
            stepIndex: idx,
            totalSteps: total,
            explanation: `Execute move ${m}`,
            targetDescription: `Move ${idx + 1} of ${total}`,
            algorithmSequence: imported.solutionMoves,
          }));
          setSolutionSteps(steps);
          setCurrentStepIndex(Math.min(imported.currentStepIndex || 0, steps.length));
        } else {
          setSolutionSteps([]);
          setCurrentStepIndex(0);
        }

        setNotification({
          type: 'success',
          title: 'Cube State Imported',
          message: 'Restored exact 96 stickers, physical cubie positions, and session history.',
        });
      } catch (err) {
        setNotification({
          type: 'error',
          title: 'Import Failed',
          message: 'Could not import cube file: ' + String(err),
        });
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Compute active target highlights for current step
  const currentStep = solutionSteps[currentStepIndex];
  const targetHighlights = currentStep?.targetFace
    ? [{ face: currentStep.targetFace, index: 5 }, { face: currentStep.targetFace, index: 6 }]
    : [];

  // Extract all stickers that currently have validation errors for 3D red highlighting
  const allInvalidStickers: { face: FaceName; index: number }[] = [];
  validation.issues.forEach(issue => {
    if (issue.affectedStickers) {
      allInvalidStickers.push(...issue.affectedStickers);
    }
  });

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-950 text-slate-100">
      {/* Top Bar Navigation */}
      <header className="flex items-center justify-between gap-4 px-5 py-3 border-b border-slate-800/80 bg-slate-900/90 shrink-0 z-20">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-sky-600 to-indigo-500 flex items-center justify-center font-bold text-white shadow-md text-xs">
            4×4
          </div>
          <div>
            <h1 className="text-sm font-extrabold tracking-tight text-white whitespace-nowrap">
              Rubik's Revenge 4×4 Solver
            </h1>
          </div>
        </div>

        {/* Center status info */}
        <div className="hidden md:flex items-center gap-4 text-xs text-slate-400">
          <span>
            Status: <span className="font-semibold text-slate-200">{validation.statusText}</span>
          </span>
          <span aria-hidden="true">·</span>
          <span>
            State: <span className="font-semibold text-slate-200">{isCubeSolved(cubeState) ? 'Solved ✓' : 'Scrambled'}</span>
          </span>
          {solutionSteps.length > 0 && (
            <>
              <span aria-hidden="true">·</span>
              <span className="text-sky-400 font-semibold">{solutionSteps.length} moves calculated</span>
            </>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* Preset Patterns Menu */}
          <div className="relative">
            <button
              onClick={() => setPresetDropdownOpen(!presetDropdownOpen)}
              className="px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors whitespace-nowrap"
            >
              Patterns ▾
            </button>
            {presetDropdownOpen && (
              <div className="absolute right-0 mt-2 w-52 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-1 z-50">
                {PRESET_PATTERNS.map(pat => (
                  <button
                    key={pat.name}
                    onClick={() => handleApplyPreset(pat.moves)}
                    className="w-full text-left px-3 py-2 text-xs text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
                  >
                    <div className="font-semibold text-white">{pat.name}</div>
                    <div className="text-[11px] text-slate-400">{pat.description}</div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={() => setIsNotationModalOpen(true)}
            className="px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors whitespace-nowrap"
          >
            Notation Guide
          </button>

          <button
            onClick={handleExportJson}
            className="px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors whitespace-nowrap hidden sm:inline-flex"
            title="Export cube state to JSON"
          >
            Export JSON
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors whitespace-nowrap hidden sm:inline-flex"
            title="Import cube state from JSON"
          >
            Import JSON
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImportJson}
            accept=".json"
            className="hidden"
          />
        </div>
      </header>

      {/* In-App Notification Toast */}
      {notification && (
        <div
          className={`px-4 py-2.5 text-xs flex items-center justify-between z-30 transition-all ${
            notification.type === 'success'
              ? 'bg-emerald-950/90 border-b border-emerald-800 text-emerald-200'
              : notification.type === 'warning'
              ? 'bg-amber-950/90 border-b border-amber-800 text-amber-200'
              : notification.type === 'error'
              ? 'bg-rose-950/90 border-b border-rose-800 text-rose-200'
              : 'bg-sky-950/90 border-b border-sky-800 text-sky-200'
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="font-bold">{notification.title}:</span>
            <span>{notification.message}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="text-slate-400 hover:text-white ml-3 font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Workspace (3-Panel Grid) */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Panel: Cube Color Editor (Manual Setup) */}
        <aside
          className={`w-full md:w-80 lg:w-96 shrink-0 z-10 transition-transform ${
            activeMobileTab === 'editor' ? 'flex' : 'hidden md:flex'
          }`}
        >
          <CubeColorEditor
            cubeState={cubeState}
            onUpdateSticker={handleUpdateSticker}
            onResetToSolved={handleResetToSolved}
            onClearCube={handleClearCube}
            onUndo={handleUndo}
            onRedo={handleRedo}
            canUndo={undoStack.length > 0}
            canRedo={redoStack.length > 0}
            activeColor={activePaintColor}
            onSelectColor={setActivePaintColor}
            validation={validation}
            onStartSolve={handleStartSolve}
            onAutoBalanceColors={handleAutoBalanceColors}
            onGenerateScramble={handleGenerateScramble}
            onOrientCameraToFace={face => setActiveFaceHint(face)}
          />
        </aside>

        {/* Center Panel: Interactive 3D Cube Viewport */}
        <main
          className={`flex-1 h-full relative ${
            activeMobileTab === 'viewport' ? 'flex' : 'hidden md:flex'
          }`}
        >
          <ThreeCube
            cubeState={cubeState}
            onStickerClick={(face, index) => handleUpdateSticker(face, index, activePaintColor)}
            activeFaceHint={activeFaceHint}
            targetHighlightStickers={targetHighlights}
            invalidStickers={allInvalidStickers}
            isEditingMode={true}
            activePaintColor={activePaintColor}
            currentMoveNotation={currentAnimatedMove}
            animationSpeed={settings.playbackSpeed}
            onMoveComplete={handleMoveComplete}
          />
        </main>

        {/* Right Panel: Step-by-Step Solving Guide & Practice Mode */}
        <aside
          className={`w-full md:w-80 lg:w-96 shrink-0 z-10 transition-transform ${
            activeMobileTab === 'guide' ? 'flex' : 'hidden md:flex'
          }`}
        >
          <AlgorithmGuide
            steps={solutionSteps}
            currentStepIndex={currentStepIndex}
            isPlaying={isPlaying}
            onPlay={handlePlay}
            onPause={handlePause}
            onNextStep={handleNextStep}
            onPrevStep={handlePrevStep}
            onJumpToStep={handleJumpToStep}
            onRestart={handleRestart}
            onResetToInitial={() => {
              setCubeState(cloneCubeState(initialScrambleState));
              setCurrentStepIndex(0);
              setIsPlaying(false);
            }}
            settings={settings}
            onUpdateSettings={s => setSettings(prev => ({ ...prev, ...s }))}
            onConfirmPhysicalMatch={handleConfirmPhysicalMatch}
            lastConfirmedStep={lastConfirmedPhysicalStep}
          />
        </aside>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="md:hidden flex items-center justify-around border-t border-slate-800 bg-slate-900 px-2 py-2 shrink-0 z-30">
        <button
          onClick={() => setActiveMobileTab('editor')}
          className={`flex flex-col items-center py-1 px-3 text-xs font-medium rounded-lg ${
            activeMobileTab === 'editor' ? 'text-sky-400 bg-slate-800' : 'text-slate-400'
          }`}
        >
          <span>Editor</span>
        </button>
        <button
          onClick={() => setActiveMobileTab('viewport')}
          className={`flex flex-col items-center py-1 px-3 text-xs font-medium rounded-lg ${
            activeMobileTab === 'viewport' ? 'text-sky-400 bg-slate-800' : 'text-slate-400'
          }`}
        >
          <span>3D Cube</span>
        </button>
        <button
          onClick={() => setActiveMobileTab('guide')}
          className={`flex flex-col items-center py-1 px-3 text-xs font-medium rounded-lg ${
            activeMobileTab === 'guide' ? 'text-sky-400 bg-slate-800' : 'text-slate-400'
          }`}
        >
          <span>Solution</span>
        </button>
      </nav>

      {/* Notation & Mechanics Help Modal */}
      <NotationModal
        isOpen={isNotationModalOpen}
        onClose={() => setIsNotationModalOpen(false)}
      />
    </div>
  );
}
