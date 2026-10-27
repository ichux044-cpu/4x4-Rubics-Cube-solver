/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { SolutionStage, SolutionStep } from '../../cube/types';
import { UserSettings } from '../../services/storage';

interface AlgorithmGuideProps {
  steps: SolutionStep[];
  currentStepIndex: number;
  isPlaying: boolean;
  onPlay: () => void;
  onPause: () => void;
  onNextStep: () => void;
  onPrevStep: () => void;
  onJumpToStep: (index: number) => void;
  onRestart: () => void;
  onResetToInitial: () => void;
  settings: UserSettings;
  onUpdateSettings: (settings: Partial<UserSettings>) => void;
  onConfirmPhysicalMatch: () => void;
  lastConfirmedStep: number;
}

export const AlgorithmGuide: React.FC<AlgorithmGuideProps> = ({
  steps,
  currentStepIndex,
  isPlaying,
  onPlay,
  onPause,
  onNextStep,
  onPrevStep,
  onJumpToStep,
  onRestart,
  onResetToInitial,
  settings,
  onUpdateSettings,
  onConfirmPhysicalMatch,
  lastConfirmedStep,
}) => {
  const [copied, setCopied] = useState(false);

  if (steps.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-center bg-slate-900/70 border-l border-slate-800">
        <div className="w-12 h-12 mb-3 rounded-full bg-slate-800 flex items-center justify-center text-slate-400">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <h3 className="text-sm font-bold text-white mb-1">No Active Solution</h3>
        <p className="text-xs text-slate-400 max-w-xs leading-relaxed mb-4">
          Enter your physical cube's stickers in the left panel or generate a scramble, then click "Calculate & Solve" to generate a step-by-step reduction solution.
        </p>
      </div>
    );
  }

  const currentStep = steps[currentStepIndex] || steps[0];
  const isLastStep = currentStepIndex >= steps.length - 1;
  const progressPercent = Math.round(((currentStepIndex + 1) / steps.length) * 100);

  // Speed estimates (assuming average move time based on speed)
  const remainingMoves = steps.length - 1 - currentStepIndex;
  const secondsPerMove = 0.8 / settings.playbackSpeed;
  const remainingSeconds = Math.round(remainingMoves * secondsPerMove);

  const copyFullAlgorithm = () => {
    const fullMoves = steps.map(s => s.move).join(' ');
    navigator.clipboard.writeText(fullMoves);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const jumpToStage = (stage: SolutionStage) => {
    const idx = steps.findIndex(s => s.stage === stage);
    if (idx !== -1) {
      onJumpToStep(idx);
    }
  };

  const getStageColorBadge = (stage: SolutionStage) => {
    switch (stage) {
      case 'Centers':
        return 'text-sky-400 bg-sky-950/60 border-sky-800';
      case 'Edges':
        return 'text-emerald-400 bg-emerald-950/60 border-emerald-800';
      case '3x3 Reduction':
        return 'text-violet-400 bg-violet-950/60 border-violet-800';
      case 'OLL Parity':
        return 'text-amber-400 bg-amber-950/60 border-amber-800';
      case 'PLL Parity':
        return 'text-rose-400 bg-rose-950/60 border-rose-800';
      default:
        return 'text-cyan-400 bg-cyan-950/60 border-cyan-800';
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-900/70 border-l border-slate-800 p-4 overflow-y-auto">
      {/* Top Header & Stage Progress */}
      <div className="pb-3 border-b border-slate-800">
        <div className="flex items-center justify-between mb-2">
          <span className={`px-2 py-0.5 text-[11px] font-bold uppercase rounded border ${getStageColorBadge(currentStep.stage)}`}>
            {currentStep.stage}
          </span>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="font-mono tabular-nums">
              Move {currentStepIndex + 1} of {steps.length}
            </span>
            <span>·</span>
            <span>{progressPercent}%</span>
          </div>
        </div>

        {/* Linear Progress Bar */}
        <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-sky-500 transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Main Move Card */}
      <div className="py-4 border-b border-slate-800">
        <div className="flex flex-col items-center justify-center p-5 bg-slate-950/80 rounded-xl border border-slate-800 shadow-xl relative overflow-hidden">
          <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold mb-1">
            Current Move Notation
          </span>
          <div className="text-4xl font-extrabold text-white font-mono tracking-tight my-1 text-sky-400">
            {currentStep.move}
          </div>
          <p className="text-xs text-slate-300 text-center mt-2 px-2 leading-relaxed">
            {currentStep.explanation}
          </p>

          {currentStep.targetDescription && (
            <div className="mt-3 text-[11px] text-slate-400 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
              <span>Target: {currentStep.targetDescription}</span>
            </div>
          )}
        </div>
      </div>

      {/* Physical Practice Mode Confirmation */}
      {settings.practiceMode && (
        <div className="py-3 border-b border-slate-800 bg-sky-950/20 -mx-4 px-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-sky-300 flex items-center gap-1.5">
              <span>Physical Practice Active</span>
            </span>
            <span className="text-[10px] text-slate-400">
              Verified: {lastConfirmedStep + 1} / {steps.length}
            </span>
          </div>
          <p className="text-[11px] text-slate-300 mb-2">
            Execute <span className="font-mono font-bold text-sky-400">{currentStep.move}</span> on your real 4×4 cube.
          </p>
          <div className="flex gap-2">
            <button
              onClick={onConfirmPhysicalMatch}
              className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition-colors shadow-sm"
            >
              ✓ My physical cube matches
            </button>
            <button
              onClick={() => onJumpToStep(lastConfirmedStep)}
              className="py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-lg transition-colors"
              title="Rewind to last verified physical position"
            >
              Rewind
            </button>
          </div>
        </div>
      )}

      {/* Playback Controls & Scrubber */}
      <div className="py-3 border-b border-slate-800">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1">
            <button
              onClick={onRestart}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
              title="Jump to beginning"
            >
              ⏮
            </button>
            <button
              onClick={onPrevStep}
              disabled={currentStepIndex === 0}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30 rounded transition-colors"
              title="Previous move"
            >
              ◀
            </button>
            <button
              onClick={isPlaying ? onPause : onPlay}
              className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                isPlaying ? 'bg-amber-600 hover:bg-amber-500 text-white' : 'bg-sky-600 hover:bg-sky-500 text-white'
              }`}
            >
              {isPlaying ? '⏸ Pause' : isLastStep ? '↺ Replay' : '▶ Play'}
            </button>
            <button
              onClick={onNextStep}
              disabled={isLastStep}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30 rounded transition-colors"
              title="Next move"
            >
              ▶
            </button>
            <button
              onClick={() => onJumpToStep(steps.length - 1)}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
              title="Jump to end"
            >
              ⏭
            </button>
          </div>

          {/* Speed Presets */}
          <div className="flex items-center gap-1 bg-slate-800 p-0.5 rounded-md">
            {[0.5, 1.0, 2.0].map(speed => (
              <button
                key={speed}
                onClick={() => onUpdateSettings({ playbackSpeed: speed })}
                className={`px-2 py-0.5 text-[11px] font-mono rounded transition-colors ${
                  settings.playbackSpeed === speed ? 'bg-slate-700 text-white font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                {speed}×
              </button>
            ))}
          </div>
        </div>

        {/* Step Slider */}
        <input
          type="range"
          min={0}
          max={steps.length - 1}
          value={currentStepIndex}
          onChange={e => onJumpToStep(Number(e.target.value))}
          className="w-full accent-sky-500 h-1 bg-slate-800 rounded-lg cursor-pointer"
        />

        <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1">
          <span>Remaining: {remainingMoves} moves</span>
          <span>~{remainingSeconds}s at {settings.playbackSpeed}×</span>
        </div>
      </div>

      {/* Mode & Stage Jumps */}
      <div className="py-2.5 border-b border-slate-800">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] text-slate-400 uppercase font-semibold">Jump to Stage</span>
          <button
            onClick={() => onUpdateSettings({ practiceMode: !settings.practiceMode })}
            className={`text-xs px-2 py-0.5 rounded border transition-colors ${
              settings.practiceMode
                ? 'bg-sky-950 border-sky-600 text-sky-300 font-bold'
                : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
            }`}
          >
            {settings.practiceMode ? 'Practice: ON' : 'Practice: OFF'}
          </button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {(['Centers', 'Edges', '3x3 Reduction', 'OLL Parity', 'PLL Parity'] as SolutionStage[]).map(stg => (
            <button
              key={stg}
              onClick={() => jumpToStage(stg)}
              className="text-[11px] px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded text-slate-300 transition-colors"
            >
              {stg}
            </button>
          ))}
        </div>
      </div>

      {/* Algorithm Move History / Step List */}
      <div className="flex-1 py-3 overflow-y-auto">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] text-slate-400 uppercase font-semibold">Algorithm Sequence</span>
          <button
            onClick={copyFullAlgorithm}
            className="text-[10px] text-sky-400 hover:text-sky-300 hover:underline"
          >
            {copied ? 'Copied!' : 'Copy Algorithm'}
          </button>
        </div>

        <div className="flex flex-wrap gap-1 p-2 bg-slate-950/60 rounded-lg border border-slate-800 max-h-44 overflow-y-auto font-mono text-xs">
          {steps.map((s, idx) => {
            const isCurrent = idx === currentStepIndex;
            const isCompleted = idx < currentStepIndex;
            return (
              <button
                key={idx}
                onClick={() => onJumpToStep(idx)}
                className={`px-1.5 py-0.5 rounded transition-colors ${
                  isCurrent
                    ? 'bg-sky-500 text-white font-bold shadow-sm'
                    : isCompleted
                    ? 'bg-slate-800 text-slate-400 hover:text-slate-200'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
                title={`Step ${idx + 1}: ${s.move} (${s.stage})`}
              >
                {s.move}
              </button>
            );
          })}
        </div>
      </div>

      {/* Reset to Initial Cube State */}
      <div className="pt-2 border-t border-slate-800">
        <button
          onClick={onResetToInitial}
          className="w-full py-1.5 text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors"
        >
          Reset to Scramble State
        </button>
      </div>
    </div>
  );
};
