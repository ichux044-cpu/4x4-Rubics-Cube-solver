/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { parseMove, STICKER_MAP } from '../../cube/cubeMoves';
import {
  CUBE_COLORS,
  CubeColor,
  CubeState,
  DEFAULT_FACE_COLORS,
  FACE_NAMES,
  FaceName,
} from '../../cube/types';
import { playTurnSound } from '../../services/sound';

interface ThreeCubeProps {
  cubeState: CubeState;
  onStickerClick?: (face: FaceName, index: number) => void;
  activeFaceHint?: FaceName | null;
  targetHighlightStickers?: { face: FaceName; index: number }[];
  invalidStickers?: { face: FaceName; index: number }[];
  isEditingMode?: boolean;
  activePaintColor?: CubeColor;
  currentMoveNotation?: string | null;
  animationSpeed?: number; // multiplier, e.g. 1.0
  onMoveComplete?: () => void;
}

const LAYER_COORDS = [-1.5, -0.5, 0.5, 1.5];
const CUBIE_SIZE = 0.94;
const STICKER_OFFSET = CUBIE_SIZE / 2 + 0.005;

interface CubieData {
  group: THREE.Group;
  baseCoord: [number, number, number];
  stickers: Array<{
    face: FaceName;
    index: number;
    mesh: THREE.Mesh;
    mat: THREE.MeshPhysicalMaterial;
  }>;
}

export const ThreeCube: React.FC<ThreeCubeProps> = ({
  cubeState,
  onStickerClick,
  activeFaceHint,
  targetHighlightStickers = [],
  invalidStickers = [],
  isEditingMode = false,
  activePaintColor,
  currentMoveNotation,
  animationSpeed = 1.0,
  onMoveComplete,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const cubeGroupRef = useRef<THREE.Group | null>(null);
  const pivotGroupRef = useRef<THREE.Group | null>(null);
  const cubiesRef = useRef<CubieData[]>([]);
  const arrowGroupRef = useRef<THREE.Group | null>(null);
  const isAnimatingRef = useRef(false);
  const lastAnimatedMoveRef = useRef<string | null>(null);

  const [hoveredSticker, setHoveredSticker] = useState<{ face: FaceName; index: number } | null>(null);

  // Initialize Three.js Scene
  useEffect(() => {
    if (!mountRef.current) return;
    const container = mountRef.current;
    const width = container.clientWidth || 500;
    const height = container.clientHeight || 500;

    // Detect software WebGL guard
    const isSoftwareGl = (() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    // Scene & Renderer
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x090d16);
    sceneRef.current = scene;

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
      alpha: false,
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;

    container.appendChild(renderer.domElement);

    // Studio Environment map
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    // Camera
    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 100);
    camera.position.set(7.5, 6.0, 8.5);
    cameraRef.current = camera;

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance = 5;
    controls.maxDistance = 22;
    controls.maxPolarAngle = Math.PI - 0.1;
    controlsRef.current = controls;

    // Lighting: Key, Fill, Rim
    const keyLight = new THREE.DirectionalLight(0xfff6ea, 1.8);
    keyLight.position.set(8, 12, 10);
    keyLight.castShadow = !isSoftwareGl;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    keyLight.shadow.bias = -0.0005;
    scene.add(keyLight);

    const fillLight = new THREE.HemisphereLight(0x94a3b8, 0x090d16, 1.2);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0x38bdf8, 1.0);
    rimLight.position.set(-10, -6, -8);
    scene.add(rimLight);

    // Contact shadow beneath cube
    const shadowGeo = new THREE.PlaneGeometry(8, 8);
    const shadowCanvas = document.createElement('canvas');
    shadowCanvas.width = 256;
    shadowCanvas.height = 256;
    const sCtx = shadowCanvas.getContext('2d')!;
    const grad = sCtx.createRadialGradient(128, 128, 10, 128, 128, 120);
    grad.addColorStop(0, 'rgba(0, 0, 0, 0.65)');
    grad.addColorStop(0.5, 'rgba(0, 0, 0, 0.25)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    sCtx.fillStyle = grad;
    sCtx.fillRect(0, 0, 256, 256);

    const shadowTex = new THREE.CanvasTexture(shadowCanvas);
    const shadowMat = new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      depthWrite: false,
    });
    const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
    shadowMesh.rotation.x = -Math.PI / 2;
    shadowMesh.position.y = -2.35;
    scene.add(shadowMesh);

    // Cube Master Hierarchy
    const cubeGroup = new THREE.Group();
    scene.add(cubeGroup);
    cubeGroupRef.current = cubeGroup;

    const pivotGroup = new THREE.Group();
    scene.add(pivotGroup);
    pivotGroupRef.current = pivotGroup;

    // Arrow group for dynamic turn arrows
    const arrowGroup = new THREE.Group();
    scene.add(arrowGroup);
    arrowGroupRef.current = arrowGroup;

    // Build 56 cubies
    build4x4Geometry(cubeGroup);

    // Animation Loop
    let animationFrameId = 0;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      controls.update();

      // Gentle floating animation on turn arrow if visible
      if (arrowGroupRef.current && arrowGroupRef.current.children.length > 0) {
        arrowGroupRef.current.rotation.y += 0.005;
      }

      renderer.render(scene, camera);
    };
    animate();

    // Window Resize Handler
    const handleResize = () => {
      if (!mountRef.current || !rendererRef.current || !cameraRef.current) return;
      const w = mountRef.current.clientWidth;
      const h = mountRef.current.clientHeight;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      controls.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  // Construct the 56 visible cubies
  function build4x4Geometry(parentGroup: THREE.Group) {
    const cubies: CubieData[] = [];

    // Shared cubie core geometry and material
    const coreGeo = new THREE.BoxGeometry(CUBIE_SIZE, CUBIE_SIZE, CUBIE_SIZE);
    const coreMat = new THREE.MeshPhysicalMaterial({
      color: 0x111318,
      roughness: 0.45,
      metalness: 0.1,
      clearcoat: 0.1,
    });

    // Sticker geometry
    const stickerGeo = new THREE.PlaneGeometry(CUBIE_SIZE * 0.88, CUBIE_SIZE * 0.88);

    for (let xi = 0; xi < 4; xi++) {
      for (let yi = 0; yi < 4; yi++) {
        for (let zi = 0; zi < 4; zi++) {
          // Skip internal hidden 8 cubies
          const isInternal = (xi === 1 || xi === 2) && (yi === 1 || yi === 2) && (zi === 1 || zi === 2);
          if (isInternal) continue;

          const cx = LAYER_COORDS[xi];
          const cy = LAYER_COORDS[yi];
          const cz = LAYER_COORDS[zi];

          const cubieGroup = new THREE.Group();
          cubieGroup.position.set(cx, cy, cz);

          const coreMesh = new THREE.Mesh(coreGeo, coreMat);
          coreMesh.castShadow = true;
          coreMesh.receiveShadow = true;
          cubieGroup.add(coreMesh);

          const stickerEntries: CubieData['stickers'] = [];

          // Determine which faces have stickers for this cubie
          if (yi === 3) {
            // U face (top)
            const r = zi;
            const c = xi;
            const idx = r * 4 + c;
            const mat = createStickerMaterial('W');
            const mesh = new THREE.Mesh(stickerGeo, mat);
            mesh.position.set(0, STICKER_OFFSET, 0);
            mesh.rotation.x = -Math.PI / 2;
            mesh.userData = { face: 'U', index: idx };
            cubieGroup.add(mesh);
            stickerEntries.push({ face: 'U', index: idx, mesh, mat });
          }

          if (yi === 0) {
            // D face (bottom)
            const r = 3 - zi;
            const c = xi;
            const idx = r * 4 + c;
            const mat = createStickerMaterial('Y');
            const mesh = new THREE.Mesh(stickerGeo, mat);
            mesh.position.set(0, -STICKER_OFFSET, 0);
            mesh.rotation.x = Math.PI / 2;
            mesh.userData = { face: 'D', index: idx };
            cubieGroup.add(mesh);
            stickerEntries.push({ face: 'D', index: idx, mesh, mat });
          }

          if (zi === 3) {
            // F face (front)
            const r = 3 - yi;
            const c = xi;
            const idx = r * 4 + c;
            const mat = createStickerMaterial('G');
            const mesh = new THREE.Mesh(stickerGeo, mat);
            mesh.position.set(0, 0, STICKER_OFFSET);
            mesh.userData = { face: 'F', index: idx };
            cubieGroup.add(mesh);
            stickerEntries.push({ face: 'F', index: idx, mesh, mat });
          }

          if (zi === 0) {
            // B face (back)
            const r = 3 - yi;
            const c = 3 - xi;
            const idx = r * 4 + c;
            const mat = createStickerMaterial('B');
            const mesh = new THREE.Mesh(stickerGeo, mat);
            mesh.position.set(0, 0, -STICKER_OFFSET);
            mesh.rotation.y = Math.PI;
            mesh.userData = { face: 'B', index: idx };
            cubieGroup.add(mesh);
            stickerEntries.push({ face: 'B', index: idx, mesh, mat });
          }

          if (xi === 0) {
            // L face (left)
            const r = 3 - yi;
            const c = zi;
            const idx = r * 4 + c;
            const mat = createStickerMaterial('O');
            const mesh = new THREE.Mesh(stickerGeo, mat);
            mesh.position.set(-STICKER_OFFSET, 0, 0);
            mesh.rotation.y = -Math.PI / 2;
            mesh.userData = { face: 'L', index: idx };
            cubieGroup.add(mesh);
            stickerEntries.push({ face: 'L', index: idx, mesh, mat });
          }

          if (xi === 3) {
            // R face (right)
            const r = 3 - yi;
            const c = 3 - zi;
            const idx = r * 4 + c;
            const mat = createStickerMaterial('R');
            const mesh = new THREE.Mesh(stickerGeo, mat);
            mesh.position.set(STICKER_OFFSET, 0, 0);
            mesh.rotation.y = Math.PI / 2;
            mesh.userData = { face: 'R', index: idx };
            cubieGroup.add(mesh);
            stickerEntries.push({ face: 'R', index: idx, mesh, mat });
          }

          parentGroup.add(cubieGroup);
          cubies.push({
            group: cubieGroup,
            baseCoord: [cx, cy, cz],
            stickers: stickerEntries,
          });
        }
      }
    }

    cubiesRef.current = cubies;
  }

  function createStickerMaterial(colorCode: CubeColor) {
    const hex = CUBE_COLORS[colorCode].hex;
    return new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(hex),
      roughness: 0.18,
      metalness: 0.05,
      clearcoat: 0.8,
      clearcoatRoughness: 0.1,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });
  }

  function resetAllCubieTransforms() {
    const cubeGroup = cubeGroupRef.current;
    const pivotGroup = pivotGroupRef.current;
    if (!cubeGroup || !pivotGroup) return;

    while (pivotGroup.children.length > 0) {
      cubeGroup.attach(pivotGroup.children[0]);
    }
    pivotGroup.rotation.set(0, 0, 0);
    pivotGroup.position.set(0, 0, 0);

    for (const cubie of cubiesRef.current) {
      if (cubie.group.parent !== cubeGroup) {
        cubeGroup.add(cubie.group);
      }
      cubie.group.position.set(cubie.baseCoord[0], cubie.baseCoord[1], cubie.baseCoord[2]);
      cubie.group.rotation.set(0, 0, 0);
      cubie.group.scale.set(1, 1, 1);
      cubie.group.updateMatrix();
    }
  }

  // Synchronize visual sticker materials with current `cubeState`
  useEffect(() => {
    if (isAnimatingRef.current) return;

    resetAllCubieTransforms();

    for (const cubie of cubiesRef.current) {
      for (const s of cubie.stickers) {
        const currentColor = cubeState[s.face]?.[s.index] || DEFAULT_FACE_COLORS[s.face];
        const hex = CUBE_COLORS[currentColor]?.hex || 0xffffff;
        s.mat.color.set(hex);

        // Target piece highlight, invalid highlight, or hover highlight
        const isInvalid = invalidStickers.some(
          t => t.face === s.face && t.index === s.index
        );
        const isTarget = targetHighlightStickers.some(
          t => t.face === s.face && t.index === s.index
        );
        const isHovered = hoveredSticker?.face === s.face && hoveredSticker?.index === s.index;

        if (isHovered) {
          s.mat.emissive.set(0x38bdf8);
          s.mat.emissiveIntensity = 0.45;
        } else if (isInvalid) {
          // Warning red/rose pulse for invalid sticker
          s.mat.emissive.set(0xef4444);
          s.mat.emissiveIntensity = 0.55;
        } else if (isTarget) {
          s.mat.emissive.set(0x3b82f6);
          s.mat.emissiveIntensity = 0.35;
        } else {
          s.mat.emissive.set(0x000000);
          s.mat.emissiveIntensity = 0;
        }
      }
    }
  }, [cubeState, targetHighlightStickers, invalidStickers, hoveredSticker]);

  // Handle Layer Turn Animations
  useEffect(() => {
    if (!currentMoveNotation || isAnimatingRef.current) return;
    executeAnimatedMove(currentMoveNotation);
  }, [currentMoveNotation]);

  function executeAnimatedMove(notation: string) {
    const cubeGroup = cubeGroupRef.current;
    const pivotGroup = pivotGroupRef.current;
    if (!cubeGroup || !pivotGroup) return;

    const move = parseMove(notation);
    isAnimatingRef.current = true;

    // Reset pivot and cubies to canonical positions first
    resetAllCubieTransforms();

    // Identify cubies belonging to the affected layer(s)
    const affectedCubies: CubieData[] = [];
    const eps = 0.15;

    for (const cubie of cubiesRef.current) {
      const coord = move.axis === 'x' ? cubie.baseCoord[0] : move.axis === 'y' ? cubie.baseCoord[1] : cubie.baseCoord[2];
      const layerIdx = LAYER_COORDS.findIndex(c => Math.abs(c - coord) < eps);

      if (move.layers.includes(layerIdx)) {
        affectedCubies.push(cubie);
      }
    }

    // Attach affected cubies to pivot
    for (const c of affectedCubies) {
      pivotGroup.attach(c.group);
    }

    // Draw 3D curved turn arrow around the rotating slice
    renderTurnArrow(move);

    // Calculate rotation angle matching rotateVec exactly
    const targetAngle =
      move.direction === 2
        ? Math.PI
        : move.direction === 1
        ? Math.PI / 2
        : -Math.PI / 2;

    const baseDuration = Math.max(120, 360 / Math.max(0.2, animationSpeed));
    const startTime = performance.now();

    function step(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / baseDuration);
      // Smooth cubic ease-out
      const ease = 1 - Math.pow(1 - progress, 3);
      const currentAngle = targetAngle * ease;

      if (move.axis === 'x') pivotGroup!.rotation.x = currentAngle;
      else if (move.axis === 'y') pivotGroup!.rotation.y = currentAngle;
      else if (move.axis === 'z') pivotGroup!.rotation.z = currentAngle;

      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        // Complete rotation
        if (move.axis === 'x') pivotGroup!.rotation.x = targetAngle;
        else if (move.axis === 'y') pivotGroup!.rotation.y = targetAngle;
        else if (move.axis === 'z') pivotGroup!.rotation.z = targetAngle;

        pivotGroup!.updateMatrixWorld(true);

        // Reset all transforms back to canonical base coordinates
        resetAllCubieTransforms();

        // Clear arrow
        clearTurnArrow();

        playTurnSound(animationSpeed);
        isAnimatingRef.current = false;
        lastAnimatedMoveRef.current = null;

        if (onMoveComplete) {
          onMoveComplete();
        }
      }
    }

    requestAnimationFrame(step);
  }

  // Render 3D curved turn arrow around active layer
  function renderTurnArrow(move: ReturnType<typeof parseMove>) {
    const arrowGroup = arrowGroupRef.current;
    if (!arrowGroup) return;
    clearTurnArrow();

    const radius = 2.45;
    const tubeRadius = 0.055;
    const arcAngle = (Math.PI * 0.75) * (move.direction === 2 ? 1.5 : 1);

    const curve = new THREE.ArcCurve(0, 0, radius, 0, arcAngle, move.direction < 0);
    const points = curve.getPoints(32);
    const curve3D = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(p.x, p.y, 0)));

    const tubeGeo = new THREE.TubeGeometry(curve3D, 32, tubeRadius, 8, false);
    const arrowMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 0.6,
      roughness: 0.2,
      metalness: 0.8,
    });
    const tubeMesh = new THREE.Mesh(tubeGeo, arrowMat);

    // Arrowhead cone
    const coneGeo = new THREE.ConeGeometry(tubeRadius * 2.8, 0.35, 12);
    const coneMesh = new THREE.Mesh(coneGeo, arrowMat);
    const endPoint = points[points.length - 1];
    coneMesh.position.set(endPoint.x, endPoint.y, 0);

    const arrowSub = new THREE.Group();
    arrowSub.add(tubeMesh);
    arrowSub.add(coneMesh);

    // Position arrow along rotation axis at the layer coordinate
    const layerCoord = LAYER_COORDS[move.layers[0]];
    if (move.axis === 'y') {
      arrowSub.rotation.x = Math.PI / 2;
      arrowSub.position.y = layerCoord;
    } else if (move.axis === 'x') {
      arrowSub.rotation.y = Math.PI / 2;
      arrowSub.position.x = layerCoord;
    } else {
      arrowSub.position.z = layerCoord;
    }

    arrowGroup.add(arrowSub);
  }

  function clearTurnArrow() {
    const arrowGroup = arrowGroupRef.current;
    if (!arrowGroup) return;
    while (arrowGroup.children.length > 0) {
      const child = arrowGroup.children[0];
      arrowGroup.remove(child);
    }
  }

  // Direct 3D Raycasting for Sticker Painting & Hover
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!mountRef.current || !cameraRef.current || !rendererRef.current) return;
    const rect = mountRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(x, y), cameraRef.current);

    const stickerMeshes: THREE.Mesh[] = [];
    for (const c of cubiesRef.current) {
      for (const s of c.stickers) {
        stickerMeshes.push(s.mesh);
      }
    }

    const intersects = raycaster.intersectObjects(stickerMeshes, false);
    if (intersects.length > 0) {
      const hit = intersects[0].object;
      const data = hit.userData as { face: FaceName; index: number };
      if (data && data.face && typeof data.index === 'number') {
        if (onStickerClick) {
          onStickerClick(data.face, data.index);
        }
      }
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isEditingMode || !mountRef.current || !cameraRef.current) return;
    const rect = mountRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(x, y), cameraRef.current);

    const stickerMeshes: THREE.Mesh[] = [];
    for (const c of cubiesRef.current) {
      for (const s of c.stickers) {
        stickerMeshes.push(s.mesh);
      }
    }

    const intersects = raycaster.intersectObjects(stickerMeshes, false);
    if (intersects.length > 0) {
      const hit = intersects[0].object;
      const data = hit.userData as { face: FaceName; index: number };
      setHoveredSticker(data);
    } else {
      setHoveredSticker(null);
    }
  };

  // Camera preset controls
  const setCameraPreset = (view: 'iso' | 'front' | 'top' | 'right') => {
    if (!cameraRef.current || !controlsRef.current) return;
    const cam = cameraRef.current;
    const ctrl = controlsRef.current;

    switch (view) {
      case 'front':
        cam.position.set(0, 0, 11);
        break;
      case 'top':
        cam.position.set(0, 11, 0.01);
        break;
      case 'right':
        cam.position.set(11, 0, 0);
        break;
      case 'iso':
      default:
        cam.position.set(7.5, 6.0, 8.5);
        break;
    }
    ctrl.target.set(0, 0, 0);
    ctrl.update();
  };

  return (
    <div className="relative w-full h-full select-none overflow-hidden bg-slate-950">
      {/* 3D WebGL Canvas Mount Container */}
      <div
        ref={mountRef}
        className="w-full h-full cursor-grab active:cursor-grabbing"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
      />

      {/* Floating View Presets Toolbar */}
      <div className="absolute top-4 left-4 z-10 flex items-center gap-1.5 p-1 bg-slate-900/80 border border-slate-800 rounded-lg shadow-lg">
        <button
          onClick={() => setCameraPreset('iso')}
          className="px-2.5 py-1 text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 rounded transition-colors whitespace-nowrap"
          title="Isometric View"
        >
          Perspective
        </button>
        <button
          onClick={() => setCameraPreset('front')}
          className="px-2.5 py-1 text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 rounded transition-colors whitespace-nowrap"
          title="Front Face View"
        >
          Front (F)
        </button>
        <button
          onClick={() => setCameraPreset('top')}
          className="px-2.5 py-1 text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 rounded transition-colors whitespace-nowrap"
          title="Top Face View"
        >
          Top (U)
        </button>
        <button
          onClick={() => setCameraPreset('right')}
          className="px-2.5 py-1 text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 rounded transition-colors whitespace-nowrap"
          title="Right Face View"
        >
          Right (R)
        </button>
      </div>

      {/* Editing Mode Indicator Overlay */}
      {isEditingMode && activePaintColor && (
        <div className="absolute top-4 right-4 z-10 flex items-center gap-2 px-3 py-1.5 bg-slate-900/90 border border-slate-800 rounded-lg shadow-lg text-xs">
          <span className="text-slate-400">Painting with:</span>
          <div
            className="w-4 h-4 rounded-sm border border-slate-600 shadow-sm"
            style={{ backgroundColor: CUBE_COLORS[activePaintColor].hex }}
          />
          <span className="font-semibold text-white">{CUBE_COLORS[activePaintColor].name}</span>
          <span className="text-slate-500 hidden sm:inline">· Click any sticker in 3D</span>
        </div>
      )}

      {/* Active face orientation indicator */}
      {activeFaceHint && (
        <div className="absolute bottom-4 left-4 z-10 px-3 py-1.5 bg-slate-900/80 border border-slate-800 rounded-lg text-xs text-slate-300">
          Orienting face: <span className="font-semibold text-sky-400">{activeFaceHint}</span>
        </div>
      )}
    </div>
  );
};
