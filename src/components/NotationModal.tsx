/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

interface NotationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NotationModal: React.FC<NotationModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-6 max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
          <div>
            <h3 className="text-base font-bold text-white">4×4 Cube Notation &amp; Mechanics Guide</h3>
            <p className="text-xs text-slate-400">Standard WCA notation for 4×4×4 (Rubik's Revenge)</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4 text-xs text-slate-300">
          <div>
            <h4 className="font-bold text-sky-400 uppercase tracking-wider mb-2">1. Outer Layer Turns</h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <div className="p-2.5 bg-slate-950 rounded border border-slate-800">
                <span className="font-mono font-bold text-white text-sm">U / D</span>
                <p className="text-slate-400 mt-1">Up (top) / Down (bottom) single outer layer 90° clockwise.</p>
              </div>
              <div className="p-2.5 bg-slate-950 rounded border border-slate-800">
                <span className="font-mono font-bold text-white text-sm">L / R</span>
                <p className="text-slate-400 mt-1">Left / Right single outer layer 90° clockwise.</p>
              </div>
              <div className="p-2.5 bg-slate-950 rounded border border-slate-800">
                <span className="font-mono font-bold text-white text-sm">F / B</span>
                <p className="text-slate-400 mt-1">Front / Back single outer layer 90° clockwise.</p>
              </div>
            </div>
          </div>

          <div>
            <h4 className="font-bold text-sky-400 uppercase tracking-wider mb-2">2. Modifiers: Prime &amp; Double</h4>
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2.5 bg-slate-950 rounded border border-slate-800">
                <span className="font-mono font-bold text-white text-sm">R' (Prime)</span>
                <p className="text-slate-400 mt-1">Counter-clockwise 90° turn (reverse of normal turn).</p>
              </div>
              <div className="p-2.5 bg-slate-950 rounded border border-slate-800">
                <span className="font-mono font-bold text-white text-sm">U2 (Double)</span>
                <p className="text-slate-400 mt-1">180° half turn in either direction.</p>
              </div>
            </div>
          </div>

          <div>
            <h4 className="font-bold text-sky-400 uppercase tracking-wider mb-2">3. Wide Turns (Two Layers)</h4>
            <div className="p-2.5 bg-slate-950 rounded border border-slate-800">
              <span className="font-mono font-bold text-white text-sm">Rw, Uw, Fw, Lw, Bw, Dw</span>
              <p className="text-slate-400 mt-1">
                Turns the outer layer together with the adjacent inner slice. (e.g. <span className="font-mono text-sky-300">Rw</span> turns both the rightmost and inner-right layers upward).
              </p>
            </div>
          </div>

          <div>
            <h4 className="font-bold text-sky-400 uppercase tracking-wider mb-2">4. Inner Slice Turns</h4>
            <div className="p-2.5 bg-slate-950 rounded border border-slate-800">
              <span className="font-mono font-bold text-white text-sm">2R, 2L, 2U, 2D, 2F, 2B</span>
              <p className="text-slate-400 mt-1">
                Turns strictly the second layer in from the specified face while keeping the outer layer stationary.
              </p>
            </div>
          </div>

          <div>
            <h4 className="font-bold text-sky-400 uppercase tracking-wider mb-2">5. 4×4 Parity Special Cases</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="p-2.5 bg-slate-950 rounded border border-slate-800">
                <span className="font-bold text-amber-400">OLL Parity (Flipped Edge)</span>
                <p className="text-slate-400 mt-1">
                  A single edge pair is flipped upside-down on the top layer, impossible on a 3×3. Resolved using the special 15-move sequence.
                </p>
              </div>
              <div className="p-2.5 bg-slate-950 rounded border border-slate-800">
                <span className="font-bold text-rose-400">PLL Parity (Swapped Edges)</span>
                <p className="text-slate-400 mt-1">
                  Two opposing or adjacent edge pairs must swap while all corners are already solved. Resolved via <span className="font-mono text-white">2R2 U2 2R2 Uw2 2R2 2U2</span>.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-5 pt-3 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs rounded-lg transition-colors"
          >
            Got it, Let's Solve
          </button>
        </div>
      </div>
    </div>
  );
};
