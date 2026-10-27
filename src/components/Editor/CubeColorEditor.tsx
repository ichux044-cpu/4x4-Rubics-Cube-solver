/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  CUBE_COLORS,
  CubeColor,
  CubeState,
  FACE_DESCRIPTIONS,
  FACE_NAMES,
  FaceName,
  ValidationResult,
} from '../../cube/types';
import { playPaintSound } from '../../services/sound';

interface CubeColorEditorProps {
  cubeState: CubeState;
  onUpdateSticker: (face: FaceName, index: number, color: CubeColor) => void;
  onResetToSolved: () => void;
  onClearCube: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  activeColor: CubeColor;
  onSelectColor: (color: CubeColor) => void;
  validation: ValidationResult;
  onStartSolve: () => void;
  onAutoBalanceColors: () => void;
  onGenerateScramble: () => void;
  onOrientCameraToFace?: (face: FaceName) => void;
}

export const CubeColorEditor: React.FC<CubeColorEditorProps> = ({
  cubeState,
  onUpdateSticker,
  onResetToSolved,
  onClearCube,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  activeColor,
  onSelectColor,
  validation,
  onStartSolve,
  onAutoBalanceColors,
  onGenerateScramble,
  onOrientCameraToFace,
}) => {
  const [editorMode, setEditorMode] = useState<'net' | 'guided'>('net');
  const [guidedFaceIdx, setGuidedFaceIdx] = useState<number>(0);
  const [isMouseDown, setIsMouseDown] = useState(false);
  const [showIssueDetails, setShowIssueDetails] = useState(true);

  const guidedOrder: FaceName[] = ['F', 'R', 'B', 'L', 'U', 'D'];
  const currentGuidedFace = guidedOrder[guidedFaceIdx];

  // Map invalid stickers and faces for instant visual lookup
  const invalidStickerMap = new Map<string, string>();
  const facesWithIssues = new Map<FaceName, number>();

  validation.issues.forEach(issue => {
    if (issue.affectedStickers) {
      issue.affectedStickers.forEach(s => {
        const key = `${s.face}-${s.index}`;
        if (!invalidStickerMap.has(key)) {
          invalidStickerMap.set(key, issue.title);
        }
        facesWithIssues.set(s.face, (facesWithIssues.get(s.face) || 0) + 1);
      });
    }
    if (issue.affectedFaces) {
      issue.affectedFaces.forEach(f => {
        if (!facesWithIssues.has(f)) {
          facesWithIssues.set(f, 1);
        }
      });
    }
  });

  const handleStickerClick = (face: FaceName, index: number) => {
    onUpdateSticker(face, index, activeColor);
    playPaintSound();
  };

  const handleStickerMouseEnter = (face: FaceName, index: number) => {
    if (isMouseDown) {
      onUpdateSticker(face, index, activeColor);
      playPaintSound();
    }
  };

  const handleClearFace = (face: FaceName) => {
    for (let i = 0; i < 16; i++) {
      onUpdateSticker(face, i, activeColor);
    }
    playPaintSound();
  };

  const goToNextGuidedFace = () => {
    if (guidedFaceIdx < guidedOrder.length - 1) {
      const nextIdx = guidedFaceIdx + 1;
      setGuidedFaceIdx(nextIdx);
      if (onOrientCameraToFace) onOrientCameraToFace(guidedOrder[nextIdx]);
    }
  };

  const goToPrevGuidedFace = () => {
    if (guidedFaceIdx > 0) {
      const prevIdx = guidedFaceIdx - 1;
      setGuidedFaceIdx(prevIdx);
      if (onOrientCameraToFace) onOrientCameraToFace(guidedOrder[prevIdx]);
    }
  };

  const handleJumpToIssueFace = (face: FaceName) => {
    if (editorMode === 'guided') {
      const idx = guidedOrder.indexOf(face);
      if (idx !== -1) setGuidedFaceIdx(idx);
    }
    if (onOrientCameraToFace) {
      onOrientCameraToFace(face);
    }
  };

  // Render a 4x4 face grid with visual validation indicators
  const renderFaceGrid = (face: FaceName, isSelected = false) => {
    const stickers = cubeState[face] || [];
    const faceIssueCount = facesWithIssues.get(face) || 0;
    const hasFaceIssues = faceIssueCount > 0;

    return (
      <div
        className={`p-2 rounded-lg transition-all ${
          isSelected
            ? 'ring-2 ring-sky-500 bg-slate-900/90'
            : hasFaceIssues
            ? 'border border-rose-500/70 bg-rose-950/20'
            : 'bg-slate-900/50'
        }`}
      >
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-white uppercase">{face}</span>
            <span className="text-[11px] text-slate-400">({FACE_DESCRIPTIONS[face].label.split(' ')[0]})</span>
            {hasFaceIssues && (
              <span
                className="px-1.5 py-0.2 bg-rose-900/80 border border-rose-600 text-[9px] text-rose-200 font-bold rounded flex items-center gap-0.5"
                title={`${faceIssueCount} validation issues on this face`}
              >
                <span>⚠️</span>
                <span>{faceIssueCount}</span>
              </span>
            )}
          </div>
          <button
            onClick={() => handleClearFace(face)}
            className="text-[10px] text-slate-400 hover:text-slate-200 hover:underline"
            title="Fill face with current color"
          >
            Fill
          </button>
        </div>
        <div
          className="grid grid-cols-4 gap-1 w-28 h-28 p-1 bg-slate-950 rounded border border-slate-800"
          onMouseDown={() => setIsMouseDown(true)}
          onMouseUp={() => setIsMouseDown(false)}
          onMouseLeave={() => setIsMouseDown(false)}
        >
          {stickers.map((col, idx) => {
            const stickerIssue = invalidStickerMap.get(`${face}-${idx}`);
            return (
              <button
                key={`${face}-${idx}`}
                onClick={() => handleStickerClick(face, idx)}
                onMouseEnter={() => handleStickerMouseEnter(face, idx)}
                className={`relative w-full h-full rounded-sm transition-transform hover:scale-105 active:scale-95 focus:outline-none flex items-center justify-center ${
                  stickerIssue
                    ? 'ring-2 ring-rose-500 ring-offset-1 ring-offset-slate-950 border-2 border-rose-400 animate-pulse'
                    : ''
                }`}
                style={{ backgroundColor: CUBE_COLORS[col]?.hex || '#334155' }}
                title={
                  stickerIssue
                    ? `⚠️ INVALID: ${stickerIssue}`
                    : `Face ${face}, Sticker ${idx + 1}: ${CUBE_COLORS[col]?.name}`
                }
              >
                {stickerIssue && (
                  <span className="text-[9px] font-black text-rose-100 bg-black/60 rounded-full w-3.5 h-3.5 flex items-center justify-center leading-none">
                    !
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-slate-900/70 border-r border-slate-800 p-4 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div>
          <h2 className="text-sm font-bold tracking-tight text-white uppercase">Cube Color Editor</h2>
          <p className="text-xs text-slate-400">Recreate your physical 4×4 cube</p>
        </div>
        <div className="flex items-center gap-1 bg-slate-800 p-0.5 rounded-md">
          <button
            onClick={() => setEditorMode('net')}
            className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
              editorMode === 'net' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            2D Net
          </button>
          <button
            onClick={() => setEditorMode('guided')}
            className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
              editorMode === 'guided' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            Guided Scan
          </button>
        </div>
      </div>

      {/* Palette Selector */}
      <div className="py-3 border-b border-slate-800">
        <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
          <span>Active Paint Color</span>
          <span className="font-semibold text-white">{CUBE_COLORS[activeColor].name}</span>
        </div>
        <div className="grid grid-cols-6 gap-2">
          {(['W', 'Y', 'G', 'B', 'O', 'R'] as CubeColor[]).map(color => {
            const count = validation.colorCounts[color] || 0;
            const isSelected = activeColor === color;
            const isCorrectCount = count === 16;
            return (
              <button
                key={color}
                onClick={() => {
                  onSelectColor(color);
                  playPaintSound();
                }}
                className={`relative flex flex-col items-center justify-center p-1.5 rounded-lg border transition-all ${
                  isSelected
                    ? 'border-sky-400 bg-slate-800 scale-105 shadow-md'
                    : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
                }`}
              >
                <div
                  className="w-7 h-7 rounded-md shadow-inner border border-black/20"
                  style={{ backgroundColor: CUBE_COLORS[color].hex }}
                />
                <span
                  className={`text-[10px] mt-1 font-mono tabular-nums ${
                    isCorrectCount ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'
                  }`}
                >
                  {count}/16
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Undo / Redo & Quick Presets */}
      <div className="flex items-center justify-between py-2 border-b border-slate-800 text-xs">
        <div className="flex items-center gap-1">
          <button
            onClick={onUndo}
            disabled={!canUndo}
            className="px-2 py-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 rounded text-slate-200 transition-colors"
            title="Undo last color change"
          >
            Undo
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            className="px-2 py-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 rounded text-slate-200 transition-colors"
            title="Redo color change"
          >
            Redo
          </button>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onResetToSolved}
            className="px-2 py-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
          >
            Reset Solved
          </button>
          <button
            onClick={onGenerateScramble}
            className="px-2 py-1 text-sky-400 hover:text-sky-300 hover:bg-slate-800 rounded transition-colors"
          >
            Scramble
          </button>
        </div>
      </div>

      {/* Color Entry Area */}
      <div className="flex-1 py-3 overflow-y-auto">
        {editorMode === 'net' ? (
          /* Unfolded 2D Cube Net Layout */
          <div className="flex flex-col items-center gap-3">
            <span className="text-[11px] text-slate-400 text-center">
              Click any sticker to paint with {CUBE_COLORS[activeColor].name}. Click-and-drag supported.
            </span>

            {/* Top: U face */}
            <div className="flex justify-center">{renderFaceGrid('U')}</div>

            {/* Middle Row: L, F, R, B */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {renderFaceGrid('L')}
              {renderFaceGrid('F')}
              {renderFaceGrid('R')}
              {renderFaceGrid('B')}
            </div>

            {/* Bottom: D face */}
            <div className="flex justify-center">{renderFaceGrid('D')}</div>
          </div>
        ) : (
          /* Guided Face-by-Face Scanner */
          <div className="flex flex-col gap-3">
            <div
              className={`p-2.5 rounded-lg border transition-all ${
                facesWithIssues.has(currentGuidedFace)
                  ? 'bg-rose-950/40 border-rose-800/80'
                  : 'bg-slate-800/80 border-slate-700/60'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[11px] uppercase tracking-wider text-sky-400 font-bold">
                    Step {guidedFaceIdx + 1} of 6: {FACE_DESCRIPTIONS[currentGuidedFace].label}
                  </span>
                  <p className="text-xs text-slate-300 mt-0.5">
                    Hold cube: {FACE_DESCRIPTIONS[currentGuidedFace].orientation}
                  </p>
                </div>
                {facesWithIssues.has(currentGuidedFace) && (
                  <span className="px-2 py-0.5 bg-rose-600 text-white text-[10px] font-bold rounded">
                    ⚠️ Issues Detected
                  </span>
                )}
              </div>
            </div>

            {/* Single Large Face Grid */}
            <div className="flex flex-col items-center justify-center p-4 bg-slate-950/60 rounded-xl border border-slate-800">
              <div
                className="grid grid-cols-4 gap-2 w-56 h-56 p-2 bg-slate-900 rounded-lg border border-slate-700 shadow-xl"
                onMouseDown={() => setIsMouseDown(true)}
                onMouseUp={() => setIsMouseDown(false)}
                onMouseLeave={() => setIsMouseDown(false)}
              >
                {cubeState[currentGuidedFace]?.map((col, idx) => {
                  const stickerIssue = invalidStickerMap.get(`${currentGuidedFace}-${idx}`);
                  return (
                    <button
                      key={`${currentGuidedFace}-${idx}`}
                      onClick={() => handleStickerClick(currentGuidedFace, idx)}
                      onMouseEnter={() => handleStickerMouseEnter(currentGuidedFace, idx)}
                      className={`relative w-full h-full rounded transition-transform hover:scale-105 active:scale-95 focus:outline-none shadow-sm flex items-center justify-center ${
                        stickerIssue
                          ? 'ring-2 ring-rose-500 ring-offset-2 ring-offset-slate-950 border-2 border-rose-400 animate-pulse'
                          : ''
                      }`}
                      style={{ backgroundColor: CUBE_COLORS[col]?.hex || '#334155' }}
                      title={
                        stickerIssue
                          ? `⚠️ INVALID: ${stickerIssue}`
                          : `Sticker #${idx + 1}`
                      }
                    >
                      {stickerIssue && (
                        <span className="text-[11px] font-black text-rose-100 bg-black/60 rounded-full w-4 h-4 flex items-center justify-center">
                          !
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Navigation between guided faces */}
            <div className="flex items-center justify-between pt-2">
              <button
                onClick={goToPrevGuidedFace}
                disabled={guidedFaceIdx === 0}
                className="px-3 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 disabled:opacity-30 rounded text-slate-200 font-medium transition-colors"
              >
                ← Previous Face
              </button>
              <div className="flex gap-1">
                {guidedOrder.map((f, i) => {
                  const hasErr = facesWithIssues.has(f);
                  return (
                    <button
                      key={f}
                      onClick={() => {
                        setGuidedFaceIdx(i);
                        if (onOrientCameraToFace) onOrientCameraToFace(f);
                      }}
                      className={`relative w-6 h-6 text-[11px] font-bold rounded flex items-center justify-center ${
                        i === guidedFaceIdx
                          ? 'bg-sky-500 text-white'
                          : hasErr
                          ? 'bg-rose-950 border border-rose-600 text-rose-300'
                          : 'bg-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {f}
                      {hasErr && (
                        <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-rose-500" />
                      )}
                    </button>
                  );
                })}
              </div>
              <button
                onClick={goToNextGuidedFace}
                disabled={guidedFaceIdx === guidedOrder.length - 1}
                className="px-3 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 disabled:opacity-30 rounded text-slate-200 font-medium transition-colors"
              >
                Next Face →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Validation Status & Enhanced Solve CTA */}
      <div className="pt-3 border-t border-slate-800">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-slate-400 font-medium">Validation Status</span>
          <div className="flex items-center gap-1.5">
            <span
              className={`w-2 h-2 rounded-full ${
                validation.isValid ? 'bg-emerald-400' : 'bg-rose-500 animate-pulse'
              }`}
            />
            <span
              className={`text-xs font-semibold ${
                validation.isValid ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {validation.isValid ? 'Ready to Solve' : `${validation.issues.length} Configuration Issues`}
            </span>
          </div>
        </div>

        {/* Detailed Face-by-Face Validation Feedback Inspector */}
        {!validation.isValid && validation.issues.length > 0 && (
          <div className="mb-3 p-2.5 bg-rose-950/40 border border-rose-800/80 rounded-lg text-[11px] text-rose-200 shadow-inner">
            <div className="flex items-center justify-between mb-1.5 font-bold text-rose-300 border-b border-rose-900/60 pb-1">
              <span className="flex items-center gap-1">
                <span>⚠️</span>
                <span>Problematic Configurations:</span>
              </span>
              <button
                onClick={() => setShowIssueDetails(!showIssueDetails)}
                className="text-[10px] text-sky-400 hover:underline"
              >
                {showIssueDetails ? 'Collapse' : 'Expand'}
              </button>
            </div>

            {showIssueDetails && (
              <div className="max-h-28 overflow-y-auto space-y-1.5 pr-1">
                {validation.issues.map((issue, idx) => {
                  const targetFace = issue.affectedFaces?.[0];
                  return (
                    <div
                      key={idx}
                      className="p-1.5 bg-slate-900/70 rounded border border-rose-900/40 flex items-start justify-between gap-1.5"
                    >
                      <div>
                        <div className="font-semibold text-rose-300">{issue.title}</div>
                        <div className="text-[10px] text-slate-300 leading-tight mt-0.5">
                          {issue.message}
                        </div>
                      </div>
                      {targetFace && (
                        <button
                          onClick={() => handleJumpToIssueFace(targetFace)}
                          className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-sky-300 text-[9px] font-bold rounded shrink-0 transition-colors"
                          title={`Focus on face ${targetFace}`}
                        >
                          Face {targetFace} →
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Action Controls & Explicit Button States */}
        <div className="flex flex-col gap-2">
          {!validation.isValid && (
            <button
              onClick={onAutoBalanceColors}
              className="w-full py-2 px-3 bg-amber-600/90 hover:bg-amber-600 text-white text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-sm"
            >
              <span>⚡ Auto-Balance Colors (16 Each)</span>
            </button>
          )}

          {/* Explicit 'Calculate & Solve' Button State */}
          {validation.isValid ? (
            <button
              onClick={onStartSolve}
              className="w-full py-3 px-4 bg-gradient-to-r from-emerald-600 to-sky-600 hover:from-emerald-500 hover:to-sky-500 text-white text-xs font-extrabold rounded-lg transition-all shadow-lg shadow-emerald-600/25 ring-1 ring-emerald-400/40 flex flex-col items-center justify-center gap-0.5 cursor-pointer"
            >
              <div className="flex items-center gap-1.5">
                <span className="text-sm">✓</span>
                <span className="tracking-wide uppercase">Calculate &amp; Solve Cube →</span>
              </div>
              <span className="text-[10px] text-emerald-100/80 font-normal">
                Cube state verified (96/96 valid)
              </span>
            </button>
          ) : (
            <button
              onClick={onStartSolve}
              className="w-full py-3 px-4 bg-slate-900 border-2 border-rose-500/70 hover:border-rose-400 text-rose-200 text-xs font-bold rounded-lg transition-all shadow-lg flex flex-col items-center justify-center gap-1 group cursor-pointer"
              title="Click to view full issue details and auto-fix"
            >
              <div className="flex items-center gap-1.5 text-rose-400 group-hover:text-rose-300">
                <span className="text-sm">⚠️</span>
                <span className="tracking-wide uppercase">
                  Cannot Solve · {validation.issues.length} {validation.issues.length === 1 ? 'Issue' : 'Issues'}
                </span>
              </div>
              <span className="text-[10px] text-slate-400 font-normal">
                {facesWithIssues.size} {facesWithIssues.size === 1 ? 'face requires' : 'faces require'} attention · Click to inspect or auto-fix
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
