import * as THREE from '../vendor/three.module.js';
import { UNITS, SPELLS } from './data.js';
import { createUnitModel, animateUnit, geometry } from './unit-models.js';
import { createWorld, makeCastle, animateFlags } from './world-model.js';
import { BattleMotion, ease, bridgeHeight } from './render-motion.js';
import { createCombatEffect, updateCombatEffect, disposeCombatEffect, StatusMarkers, drawFallbackStatuses, effectKind } from './combat-effects.js';

const UNIT = new Map(UNITS.map(unit => [unit.id, unit]));
const TEAM = { player: '#62bfe2', enemy: '#e76759' };
const MAX_VISIBLE = 512;
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

/** A read-only view of the simulation. Its camera, selection and animations are
 * entirely local; no gameplay state is ever changed by the renderer. */
export class Battlefield {
  constructor(container, { onSelect = () => {}, onGround = () => {}, onHover = () => {} } = {}) {
    this.container = container; this.onSelect = onSelect; this.onGround = onGround; this.onHover = onHover;
    this.mode = 'battle'; this.time = 0; this.width = container.clientWidth < 620 ? 75 : 112; this.quality = 'high';
    this.center = new THREE.Vector3(); this.units = new Map(); this.structures = new Map(); this.effects = new Map();
    this.flags = []; this.selected = null; this.lastState = null; this.drag = null; this.touchPointers = new Map(); this.pinch = null;
    this.hoverPointer = null; this.hoverUnit = null; this.hoverCheckedAt = -Infinity;
    this.motion = new BattleMotion(); this.renderedState = null;
    this.raycaster = new THREE.Raycaster(); this.pointer = new THREE.Vector2();
    this.groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    this.dummy = new THREE.Object3D(); this.point = new THREE.Vector3(); this.barRight = new THREE.Vector3(1, 0, 0); this.color = new THREE.Color();
    this.listeners = []; this.disposed = false;
    this.motionPreference = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)');
    this.reducedMotion = this.motionPreference?.matches || false;
    if (this.motionPreference) {
      const change = event => { this.reducedMotion = event.matches; };
      this.motionPreference.addEventListener('change', change); this.listeners.push([this.motionPreference,'change',change]);
    }
    const canvas = document.createElement('canvas'); canvas.className = 'battlefield-canvas';
    canvas.style.cssText = 'display:block;width:100%;height:100%;touch-action:none;outline:none;';
    canvas.setAttribute('aria-label', 'Castle Strike battlefield. Hover over units for stats. Mouse wheel zooms, right-drag pans, click selects a unit.');
    canvas.tabIndex = 0;
    try {
      this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6));
      this.renderer.outputColorSpace = THREE.SRGBColorSpace;
      this.renderer.toneMapping = THREE.ACESFilmicToneMapping; this.renderer.toneMappingExposure = .94;
      this.renderer.shadowMap.enabled = true; this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      this.scene = new THREE.Scene(); this.scene.background = new THREE.Color('#486d5b');
      this.scene.fog = new THREE.Fog('#729580', 105, 185);
      this.camera = new THREE.OrthographicCamera(-56, 56, 30, -30, .1, 250);
      this.scene.add(new THREE.HemisphereLight('#dce8de', '#344d3b', 1.5));
      const sun = new THREE.DirectionalLight('#fff0cc', 2.3);
      sun.position.set(-25, 55, 30); sun.castShadow = true;
      sun.shadow.mapSize.set(2048, 2048);
      Object.assign(sun.shadow.camera, { left: -65, right: 65, top: 43, bottom: -43, near: 1, far: 140 });
      sun.shadow.bias = -.00018; sun.shadow.normalBias = .055; sun.shadow.radius = 2;
      this.scene.add(sun); this.sun = sun;
      const fill = new THREE.DirectionalLight('#98c5d7', .6); fill.position.set(20, 15, -40); this.scene.add(fill);
      this.world = createWorld(this.scene);
      this.unitGroup = new THREE.Group(); this.scene.add(this.unitGroup);
      this.effectGroup = new THREE.Group(); this.scene.add(this.effectGroup);
      this._makeDecorations(); this._makeHealthBars(); this._makeGrid();
      this.statusMarkers = new StatusMarkers(this.scene, MAX_VISIBLE);
      this.canvas = canvas; container.appendChild(canvas);
      this._bind(); this.resize();
    } catch (error) {
      console.warn('Castle Strike: using the illustrated battlefield fallback.', error.message);
      this.renderer?.dispose(); this.renderer = null; this.fallback = true;
      this.canvas = document.createElement('canvas'); this.canvas.className = 'battlefield-canvas';
      this.canvas.style.cssText = canvas.style.cssText; this.canvas.setAttribute('aria-label', 'Castle Strike illustrated battlefield');
      this.ctx = this.canvas.getContext('2d'); container.appendChild(this.canvas); this._bind(); this.resize();
    }
    this.resizeObserver = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => this.resize()) : null;
    this.resizeObserver?.observe(container);
  }

  _makeDecorations() {
    const ringGeo = new THREE.RingGeometry(.87, .99, 32); ringGeo.rotateX(-Math.PI / 2);
    this.selectionRing = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: '#fff0a1', transparent: true, opacity: .95, side: THREE.DoubleSide, depthWrite: false }));
    this.selectionRing.visible = false; this.scene.add(this.selectionRing);
    const teamGeometry = new THREE.RingGeometry(.61, .73, 16); teamGeometry.rotateX(-Math.PI / 2);
    this.teamRings = new THREE.InstancedMesh(teamGeometry, new THREE.MeshBasicMaterial({ transparent: true, opacity: .75, depthWrite: false }), MAX_VISIBLE);
    this.teamRings.instanceMatrix.setUsage(THREE.DynamicDrawUsage); this.teamRings.frustumCulled = false; this.teamRings.count = 0; this.scene.add(this.teamRings);
    const blob = new THREE.CircleGeometry(.88, 16); blob.rotateX(-Math.PI / 2);
    this.blobs = new THREE.InstancedMesh(blob, new THREE.MeshBasicMaterial({ color: '#203923', transparent: true, opacity: .16, depthWrite: false }), MAX_VISIBLE);
    this.blobs.instanceMatrix.setUsage(THREE.DynamicDrawUsage); this.blobs.frustumCulled = false; this.blobs.count = 0; this.scene.add(this.blobs);
    this.targetMarker = new THREE.Group(); this.targetMarker.visible = false; this.scene.add(this.targetMarker);
    this.targetFill = new THREE.Mesh(new THREE.CircleGeometry(1, 64), new THREE.MeshBasicMaterial({ color: '#ffcd85', transparent: true, opacity: .13, depthWrite: false, side: THREE.DoubleSide }));
    this.targetFill.rotation.x = -Math.PI / 2; this.targetMarker.add(this.targetFill);
    this.targetEdge = new THREE.Mesh(new THREE.RingGeometry(.98, 1, 64), new THREE.MeshBasicMaterial({ color: '#ffcd85', transparent: true, opacity: .95, depthWrite: false, side: THREE.DoubleSide }));
    this.targetEdge.rotation.x = -Math.PI / 2; this.targetMarker.add(this.targetEdge);
    this.targetReticle = new THREE.Group(); this.targetMarker.add(this.targetReticle);
    for (let i = 0; i < 4; i++) {
      const tick = new THREE.Mesh(new THREE.PlaneGeometry(.08, .7), new THREE.MeshBasicMaterial({ color: '#fff0bc', transparent: true, opacity: .95, depthWrite: false, side: THREE.DoubleSide }));
      tick.rotation.x = -Math.PI / 2; tick.rotation.z = i * Math.PI / 2; tick.position.set(Math.sin(i * Math.PI / 2) * .52, .014, Math.cos(i * Math.PI / 2) * .52); this.targetReticle.add(tick);
    }
  }

  _makeHealthBars() {
    const geo = new THREE.PlaneGeometry(1, 1);
    this.barBack = new THREE.InstancedMesh(geo, new THREE.MeshBasicMaterial({ color: '#18382c', transparent: true, opacity: .94, depthTest: false }), MAX_VISIBLE + 10);
    this.barFill = new THREE.InstancedMesh(geo, new THREE.MeshBasicMaterial({ depthTest: false, transparent: true }), MAX_VISIBLE + 10);
    for (const mesh of [this.barBack, this.barFill]) {
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); mesh.frustumCulled = false; mesh.renderOrder = 8; mesh.count = 0; this.scene.add(mesh);
    }
    this.barFill.renderOrder = 9;
  }

  _makeGrid() {
    this.grid = new THREE.Group(); this.scene.add(this.grid);
    const positions = [];
    for (let row = 0; row <= 6; row++) positions.push(-34.2, .25, -9 + row * 3, -22.2, .25, -9 + row * 3);
    for (let col = 0; col <= 5; col++) positions.push(-34.2 + col * 2.4, .25, -9, -34.2 + col * 2.4, .25, 9);
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    this.grid.add(new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: '#d4dba0', transparent: true, opacity: .62, depthWrite: false })));
    const plate = new THREE.Mesh(new THREE.PlaneGeometry(12, 18), new THREE.MeshBasicMaterial({ color: '#4a91a4', transparent: true, opacity: .13, side: THREE.DoubleSide, depthWrite: false }));
    plate.rotation.x = -Math.PI / 2; plate.position.set(-28.2, .2, 0); this.grid.add(plate);
    const hover = new THREE.Mesh(new THREE.PlaneGeometry(2.3, 2.9), new THREE.MeshBasicMaterial({ color: '#c6ddb0', transparent: true, opacity: .27, side: THREE.DoubleSide, depthWrite: false }));
    hover.rotation.x = -Math.PI / 2; hover.visible = false; this.grid.add(hover); this.gridHover = hover;
    this.grid.visible = false;
  }

  _listen(target, name, fn, options) { target.addEventListener(name, fn, options); this.listeners.push([target, name, fn, options]); }

  _bind() {
    this._listen(this.canvas, 'contextmenu', event => event.preventDefault());
    this._listen(this.canvas, 'wheel', event => {
      event.preventDefault(); this.width = clamp(this.width * (1 + Math.sign(event.deltaY) * .085), 34, 138); this.resize();
    }, { passive: false });
    this._listen(this.canvas, 'pointerenter', event => this._trackHover(event));
    this._listen(this.canvas, 'pointerdown', event => {
      this._clearHover();
      this.drag = { x: event.clientX, y: event.clientY, startX: event.clientX, startY: event.clientY, button: event.button, pointerId: event.pointerId, moved: false };
      if (event.pointerType === 'touch') {
        this.touchPointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
        if (this.touchPointers.size === 2) {
          const [a, b] = [...this.touchPointers.values()];
          this.pinch = { distance: Math.hypot(a.x - b.x, a.y - b.y), width: this.width, x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
          this.drag.moved = true;
        }
      }
      this.canvas.setPointerCapture?.(event.pointerId);
    });
    this._listen(this.canvas, 'pointermove', event => {
      if (event.pointerType === 'touch' && this.touchPointers.has(event.pointerId)) {
        this.touchPointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
        if (this.pinch && this.touchPointers.size >= 2) {
          const [a, b] = [...this.touchPointers.values()], midX = (a.x + b.x) / 2, midY = (a.y + b.y) / 2;
          this.width = clamp(this.pinch.width * this.pinch.distance / Math.max(10, Math.hypot(a.x - b.x, a.y - b.y)), 34, 138);
          const scale = this.width / this.canvas.getBoundingClientRect().width;
          this.center.x = clamp(this.center.x - (midX - this.pinch.x) * scale, -47, 47); this.center.z = clamp(this.center.z - (midY - this.pinch.y) * scale * 1.25, -22, 22);
          this.pinch.x = midX; this.pinch.y = midY; this.resize(); return;
        }
      }
      const touchDrag = event.pointerType === 'touch' && this.drag && !this.targeting && (this.drag.moved || Math.hypot(event.clientX - this.drag.startX, event.clientY - this.drag.startY) > 7);
      if (this.drag && (this.drag.button === 2 || event.buttons === 4 || touchDrag)) {
        const rect = this.canvas.getBoundingClientRect(), dx = event.clientX - this.drag.x, dy = event.clientY - this.drag.y;
        const s = this.width / rect.width;
        this.center.x = clamp(this.center.x - dx * s, -47, 47); this.center.z = clamp(this.center.z - dy * s * 1.25, -22, 22);
        this.drag.x = event.clientX; this.drag.y = event.clientY; this.drag.moved = true; this._updateCamera();
      } else if (this.drag && Math.hypot(event.clientX - this.drag.startX, event.clientY - this.drag.startY) > 7) this.drag.moved = true;
      if (this.targeting) {
        if (this.fallback) {
          const rect = this.canvas.getBoundingClientRect();
          this.targetPoint = { x: (event.clientX - rect.left - this.viewWidth / 2) / this.viewWidth * this.width + this.center.x, z: (event.clientY - rect.top - this.viewHeight * .52) / this.viewWidth * this.width / .75 + this.center.z };
        } else {
          const point = this._groundPoint(event);
          if (point) { this.targetMarker.visible = true; this.targetMarker.position.set(point.x, Math.abs(point.x) < 6.7 && Math.abs(point.z) < 10 ? .39 : .09, point.z); }
        }
      }
      if (this.mode === 'formation' && !this.fallback) {
        const point = this._groundPoint(event);
        if (point && point.x >= -34.2 && point.x <= -22.2 && Math.abs(point.z) <= 9) {
          this.gridHover.visible = true; this.gridHover.position.set(-33 + clamp(Math.round((point.x + 33) / 2.4), 0, 4) * 2.4, .27, -7.5 + clamp(Math.round((point.z + 7.5) / 3), 0, 5) * 3);
        } else this.gridHover.visible = false;
      }
      this._trackHover(event);
    });
    this._listen(this.canvas, 'pointerup', event => {
      const drag = this.drag; this.drag = null;
      this.touchPointers.delete(event.pointerId);
      const wasPinching = !!this.pinch; if (this.touchPointers.size < 2) this.pinch = null;
      this.canvas.releasePointerCapture?.(event.pointerId);
      if (wasPinching) return;
      if (!drag || drag.moved || drag.button !== 0) return;
      if (this.fallback) { this._fallbackSelect(event); return; }
      if (this.targeting) { const point = this._groundPoint(event); if (point) this.onGround(point.x, point.z); return; }
      const unit = this._pickUnit(event);
      if (unit) { this.selected = unit.rosterId ? `preview:${unit.team}:${unit.rosterId}` : unit.id; this.onSelect(unit); }
      else { const point = this._groundPoint(event); if (point) { this.onGround(point.x, point.z); if (this.mode !== 'formation') { this.selected = null; this.onSelect(null); } } }
    });
    this._listen(this.canvas, 'pointercancel', event => { this._clearHover(); this.drag = null; this.pinch = null; this.touchPointers.delete(event.pointerId); });
    this._listen(this.canvas, 'pointerleave', () => { this._clearHover(); if (this.gridHover) this.gridHover.visible = false; if (this.targetMarker) this.targetMarker.visible = false; this.targetPoint = null; });
    this._listen(this.canvas, 'webglcontextlost', event => { this._clearHover(); event.preventDefault(); this.contextLost = true; });
    this._listen(this.canvas, 'webglcontextrestored', () => { this.contextLost = false; });
  }

  _setRay(event) {
    const rect = this.canvas.getBoundingClientRect();
    this.pointer.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
    this.raycaster.setFromCamera(this.pointer, this.camera);
  }

  _groundPoint(event) { this._setRay(event); return this.raycaster.ray.intersectPlane(this.groundPlane, this.point); }

  // Clicks and hover share the same hit area in either rendering mode.
  _pickUnit(event) {
    if (this.fallback) {
      const rect = this.canvas.getBoundingClientRect(), x = event.clientX - rect.left, y = event.clientY - rect.top;
      return (this.fallbackUnits || []).find(unit => {
        const p = this._fallbackProject(unit.x, unit.z);
        return unit.hp > 0 && Math.hypot(p.x - x, p.y - 7 - y) < 15;
      }) || null;
    }
    this._setRay(event);
    for (const hit of this.raycaster.intersectObjects(this.unitGroup.children, true)) {
      let object = hit.object;
      while (object && !object.userData.unit) object = object.parent;
      if (object?.userData.unit) return object.userData.unit.hp > 0 ? object.userData.unit : null;
    }
    return null;
  }

  _clearHover(forgetPointer = true) {
    const pointer = this.hoverPointer, hadUnit = !!this.hoverUnit;
    this.hoverUnit = null;
    if (forgetPointer) { this.hoverPointer = null; this.hoverCheckedAt = -Infinity; }
    if (hadUnit) this.onHover(null, pointer);
  }

  _trackHover(event) {
    if (event.pointerType === 'touch' || event.buttons || this.drag || this.pinch || this.touchPointers.size || this.targeting) { this._clearHover(); return; }
    this.hoverPointer = { clientX: event.clientX, clientY: event.clientY, pointerType: event.pointerType || 'mouse' };
    this._refreshHover();
  }

  _refreshHover(now = performance.now()) {
    if (!this.hoverPointer || this.disposed) return;
    if (this.drag || this.pinch || this.touchPointers.size || this.targeting || this.contextLost) { this._clearHover(); return; }
    // Recheck still pointers as units move or die, without raycasting every frame.
    if (now - this.hoverCheckedAt < 100) return;
    const pointer = this.hoverPointer, rect = this.canvas.getBoundingClientRect();
    if (pointer.clientX < rect.left || pointer.clientX >= rect.right || pointer.clientY < rect.top || pointer.clientY >= rect.bottom) { this._clearHover(); return; }
    this.hoverCheckedAt = now;
    const unit = this._pickUnit(pointer);
    if (!unit) { this._clearHover(false); return; }
    this.hoverUnit = unit;
    this.onHover(unit, pointer);
  }

  _updateCamera() {
    this._clearHover();
    if (!this.camera) return;
    this.camera.position.set(this.center.x + 7, 64, this.center.z + 73);
    this.camera.lookAt(this.center.x, 0, this.center.z); this.camera.updateMatrixWorld();
    this.barRight.set(1, 0, 0).applyQuaternion(this.camera.quaternion);
  }

  resize() {
    if (this.disposed) return;
    this._clearHover();
    const width = Math.max(1, this.container.clientWidth), height = Math.max(1, this.container.clientHeight);
    this.viewWidth = width; this.viewHeight = height;
    if (this.fallback) {
      const ratio = Math.min(devicePixelRatio || 1, 2), pixelsWide = Math.round(width * ratio), pixelsHigh = Math.round(height * ratio);
      if (this.canvas.width !== pixelsWide) this.canvas.width = pixelsWide;
      if (this.canvas.height !== pixelsHigh) this.canvas.height = pixelsHigh;
      this.ctx?.setTransform(this.canvas.width / width, 0, 0, this.canvas.height / height, 0, 0);
      if (this.renderedState) this._renderFallback(this.renderedState);
      return;
    }
    this.renderer.setSize(width, height, false);
    const aspect = width / height, frustum = this.width / aspect;
    this.camera.left = -this.width / 2; this.camera.right = this.width / 2; this.camera.top = frustum / 2; this.camera.bottom = -frustum / 2;
    this.camera.updateProjectionMatrix(); this._updateCamera();
  }

  setMode(mode) {
    if (this.mode === mode) return;
    this.mode = mode === 'formation' ? 'formation' : 'battle';
    if (this.grid) this.grid.visible = this.mode === 'formation';
    this.center.set(this.mode === 'formation' ? -24 : 0, 0, 0);
    this.width = this.mode === 'formation' ? this.container.clientWidth < 620 ? 36 : 64 : this.container.clientWidth < 620 ? 75 : 112; this.resize();
  }

  focus(x = 0, z = 0) { this.center.set(clamp(x, -47, 47), 0, clamp(z, -22, 22)); this._updateCamera(); }

  resetCamera() {
    this.center.set(this.mode === 'formation' ? -26 : 0, 0, 0);
    this.width = this.mode === 'formation' ? this.container.clientWidth < 620 ? 36 : 64 : this.container.clientWidth < 620 ? 75 : 112;
    this.resize();
  }

  setTargeting(spellOrNull) {
    this._clearHover();
    this.targeting = typeof spellOrNull === 'string' ? SPELLS.find(spell => spell.id === spellOrNull) || null : spellOrNull;
    this.canvas.style.cursor = this.targeting ? 'crosshair' : 'default';
    if (!this.targetMarker) return;
    this.targetMarker.visible = false;
    if (!this.targeting) { this.targetPoint = null; return; }
    const radius = this.targeting.radius || 6, color = this.targeting.color || '#ffcc83';
    this.targetFill.scale.setScalar(radius); this.targetEdge.scale.setScalar(radius);
    this.targetFill.material.color.set(color); this.targetEdge.material.color.set(color);
  }

  setQuality(quality) {
    this.quality = quality === 'low' ? 'low' : 'high';
    if (this.renderer) {
      this.renderer.setPixelRatio(this.quality === 'low' ? 1 : Math.min(devicePixelRatio || 1, 1.6));
      this.renderer.shadowMap.enabled = this.quality === 'high'; this.resize();
    }
  }

  _visibleUnits(state) {
    if (state.status === 'preparation' || this.mode === 'formation') {
      const result = [];
      for (const [team, roster] of [['player', state.roster || []], ['enemy', state.enemyRoster || []]]) {
        if (this.mode === 'formation' && state.status !== 'preparation' && team === 'enemy') continue;
        for (const entry of roster) {
          const spec = UNIT.get(entry.unitId); if (!spec) continue;
          result.push({ id: `preview:${team}:${entry.id}`, rosterId: entry.id, unitId: entry.unitId, team, x: (-33 + entry.col * 2.4) * (team === 'player' ? 1 : -1), z: -7.5 + entry.row * 3, hp: spec.hp, maxHp: spec.hp, action: 'idle', heading: team === 'player' ? Math.PI / 2 : -Math.PI / 2, hero: spec.hero });
        }
      }
      if (state.status !== 'preparation') result.push(...(state.units || []));
      return result.slice(0, MAX_VISIBLE);
    }
    return (state.units || []).slice(0, MAX_VISIBLE);
  }

  _syncStructures(state) {
    const seen = new Set();
    for (const structure of state.structures || []) {
      seen.add(structure.id);
      let object = this.structures.get(structure.id);
      if (!object) {
        object = makeCastle(structure.team, structure.kind === 'tower');
        object.position.set(structure.x, 0, structure.z); object.rotation.y = structure.team === 'player' ? Math.PI / 2 : -Math.PI / 2;
        this.scene.add(object); this.structures.set(structure.id, object); this.flags.push(...(object.userData.flags || []));
      }
      object.userData.structure = structure;
      const alive = structure.hp > 0;
      object.scale.y = alive ? 1 : .14;
      object.position.y = alive ? 0 : -.3;
    }
    for (const [id, object] of this.structures) if (!seen.has(id)) { this.scene.remove(object); this.structures.delete(id); }
  }

  _bar(index, x, y, z, width, ratio, team) {
    const d = this.dummy;
    d.position.set(x, y, z); d.quaternion.copy(this.camera.quaternion); d.scale.set(width + .09, .19, 1); d.updateMatrix(); this.barBack.setMatrixAt(index, d.matrix);
    d.position.addScaledVector(this.barRight, -(1 - ratio) * width / 2); d.scale.set(Math.max(.005, width * ratio), .105, 1); d.updateMatrix(); this.barFill.setMatrixAt(index, d.matrix);
    this.barFill.setColorAt(index, this.color.set(team === 'player' ? ratio > .35 ? '#87d889' : '#f0b857' : '#ee7964'));
  }

  _syncUnits(visible) {
    const seen = new Set(); let bars = 0, rings = 0;
    for (const unit of visible.slice(0, MAX_VISIBLE)) {
      const spec = UNIT.get(unit.unitId); if (!spec) continue;
      seen.add(unit.id); let object = this.units.get(unit.id);
      if (object && object.userData.model !== spec.model) { this.unitGroup.remove(object); this.units.delete(unit.id); object = null; }
      if (!object) { object = createUnitModel(spec.model || 'footman', unit.team); this.units.set(unit.id, object); this.unitGroup.add(object); }
      object.userData.unit = unit;
      object.position.x = unit.x; object.position.z = unit.z;
      object.rotation.y = Number.isFinite(unit.heading) ? unit.heading : unit.team === 'player' ? Math.PI / 2 : -Math.PI / 2;
      animateUnit(object, unit, this.reducedMotion ? 0 : this.time);
      // The bridge crown is low enough to leave ranged projectiles unobstructed.
      const ground = bridgeHeight(unit.x, unit.z); object.position.y += ground;
      if (unit.action === 'dead' || unit.hp <= 0) continue;
      const d = this.dummy; d.rotation.set(0, 0, 0); d.position.set(unit.x, .045 + ground, unit.z); d.scale.setScalar(unit.hero ? 1.35 : 1); d.updateMatrix();
      this.teamRings.setMatrixAt(rings, d.matrix); this.teamRings.setColorAt(rings, this.color.set(TEAM[unit.team] || TEAM.player));
      d.position.y -= .01; d.scale.setScalar(object.userData.type === 'flying' ? 1.55 : 1.0); d.updateMatrix(); this.blobs.setMatrixAt(rings, d.matrix); rings++;
      const selected = this.selected === unit.id;
      if (!unit.rosterId || selected || this.mode === 'formation') {
        this._bar(bars++, unit.x, object.position.y + object.userData.height + .25, unit.z, unit.hero ? 1.65 : 1.2, clamp(unit.hp / unit.maxHp, 0, 1), unit.team);
      }
    }
    for (const [id, object] of this.units) if (!seen.has(id)) { this.unitGroup.remove(object); this.units.delete(id); }
    for (const object of this.structures.values()) {
      const structure = object.userData.structure; if (structure.hp <= 0) continue;
      this._bar(bars++, structure.x, object.userData.height + .15, structure.z, structure.kind === 'castle' ? 4 : 2.2, clamp(structure.hp / structure.maxHp, 0, 1), structure.team);
    }
    this.barBack.count = bars; this.barFill.count = bars; this.barBack.instanceMatrix.needsUpdate = true; this.barFill.instanceMatrix.needsUpdate = true;
    if (this.barFill.instanceColor) this.barFill.instanceColor.needsUpdate = true;
    this.teamRings.count = rings; this.blobs.count = rings; this.teamRings.instanceMatrix.needsUpdate = true; this.blobs.instanceMatrix.needsUpdate = true;
    if (this.teamRings.instanceColor) this.teamRings.instanceColor.needsUpdate = true;
    this.statusMarkers.sync(this.units, this.camera, this.quality);
    const selected = this.units.get(this.selected);
    this.selectionRing.visible = !!selected && selected.userData.unit.hp > 0;
    if (selected) { this.selectionRing.position.set(selected.position.x, .065 + bridgeHeight(selected.position.x, selected.position.z), selected.position.z); this.selectionRing.rotation.y = this.time * .65; this.selectionRing.scale.setScalar(selected.userData.unit.hero ? 1.45 : 1.12); }
  }

  _newEffect(effect) {
    const group = createCombatEffect(effect, this.quality);
    this.effectGroup.add(group); return group;
  }

  _syncEffects(effects) {
    const seen = new Set();
    const budget = this.quality === 'low' ? 42 : 100;
    // Prioritize visible contact over faint windups when a whole army fires.
    const visible = [...effects].filter(effect => effect.life > 0).sort((a,b) =>
      (a.phase === 'windup' ? 1 : 0) - (b.phase === 'windup' ? 1 : 0)).slice(0,budget);
    for (const effect of visible) {
      seen.add(effect.id); let object = this.effects.get(effect.id);
      if (!object) { object = this._newEffect(effect); this.effects.set(effect.id,object); }
      updateCombatEffect(object,effect,this.time,this.reducedMotion);
    }
    for (const [id,object] of this.effects) if (!seen.has(id)) {
      this.effectGroup.remove(object); disposeCombatEffect(object); this.effects.delete(id);
    }
  }

  render(state, dt = 0) {
    if (this.disposed || !state) return;
    this.lastState = state;
    const frame = this.motion.sample(state, this._visibleUnits(state), dt);
    this.time = frame.time; this.renderedState = { ...state, units: frame.units, structures: frame.structures, effects: frame.effects };
    if (frame.reset) {
      this._clearHover();
      for (const object of this.units.values()) this.unitGroup?.remove(object);
      this.units.clear();
    }
    if (this.fallback) { this._renderFallback(this.renderedState); this._refreshHover(); return; }
    if (this.contextLost) return;
    this._syncStructures(this.renderedState); this._syncUnits(frame.units); this._syncEffects(frame.effects);
    this.world.animate(this.reducedMotion ? 0 : this.time, state.control || 0); animateFlags(this.flags, this.reducedMotion ? 0 : this.time);
    if (this.targeting) { this.targetEdge.material.opacity = .77 + Math.sin(this.time * 5) * .15; this.targetReticle.rotation.y = this.time * .4; }
    this.renderer.render(this.scene, this.camera);
    this._refreshHover();
  }

  _fallbackProject(x, z) { return { x: this.viewWidth / 2 + (x - this.center.x) / this.width * this.viewWidth, y: this.viewHeight * .52 + (z - this.center.z) / this.width * this.viewWidth * .75 }; }

  _renderFallback(state) {
    const c = this.ctx; if (!c) return;
    const w = this.viewWidth, h = this.viewHeight, s = w / this.width;
    const bg = c.createLinearGradient(0, 0, 0, h); bg.addColorStop(0, '#2f5944'); bg.addColorStop(.5, '#78904d'); bg.addColorStop(1, '#344e35'); c.fillStyle = bg; c.fillRect(0, 0, w, h);
    const center = this._fallbackProject(0, 0); c.fillStyle = '#528e8b'; c.fillRect(center.x - 3 * s, 0, 6 * s, h);
    c.fillStyle = '#93977b'; c.fillRect(center.x - 6 * s, center.y - 7.1 * s, 12 * s, 14.2 * s);
    for (let i = 0; i < 160; i++) {
      const x = (Math.sin(i * 19.71) * .5 + .5) * w, edge = i % 2 ? h * .18 : h * .82, y = edge + Math.sin(i * 11.1) * h * .17;
      c.fillStyle = ['#274d36', '#3c6740', '#547746'][i % 3]; c.beginPath(); c.arc(x, y, 6 + (i % 5) * 3, 0, Math.PI * 2); c.fill();
    }
    if (this.mode === 'formation') {
      c.strokeStyle = '#d1d79b88';
      for (let row = 0; row < 6; row++) for (let col = 0; col < 5; col++) { const p = this._fallbackProject(-34.2 + col * 2.4, -9 + row * 3); c.strokeRect(p.x, p.y, 2.4 * s, 2.25 * s); }
    }
    for (const structure of state.structures || []) {
      const p = this._fallbackProject(structure.x, structure.z), castle = structure.kind === 'castle', size = castle ? 3.4 : 1.35, bh = castle ? 5 : 3;
      if (structure.hp <= 0) {
        c.fillStyle='#66685c';
        for(let i=0;i<5;i++)c.fillRect(p.x+(i-2)*size*s*.5,p.y-(i%2+.3)*s,size*s*.6,(i%2+.7)*s);
        continue;
      }
      c.fillStyle = '#acb199'; c.fillRect(p.x - size * s, p.y - bh * s, size * 2 * s, bh * s);
      c.fillStyle = structure.team === 'player' ? '#386b96' : '#a34c48'; c.beginPath(); c.moveTo(p.x - (size + .6) * s, p.y - bh * s); c.lineTo(p.x, p.y - (bh + size) * s); c.lineTo(p.x + (size + .6) * s, p.y - bh * s); c.closePath(); c.fill();
      c.fillStyle = '#233d33'; c.fillRect(p.x - size * .28 * s, p.y - bh * .47 * s, size * .56 * s, bh * .47 * s);
      c.fillStyle = '#172f26'; c.fillRect(p.x - size * s, p.y + 3, size * 2 * s, 3); c.fillStyle = TEAM[structure.team]; c.fillRect(p.x - size * s, p.y + 3, size * 2 * s * clamp(structure.hp / structure.maxHp, 0, 1), 3);
    }
    this.fallbackUnits = state.units;
    for (const unit of [...this.fallbackUnits].sort((a, b) => a.z - b.z)) {
      const p = this._fallbackProject(unit.x, unit.z), spec = UNIT.get(unit.unitId), size = Math.max(3, s * .56);
      const death = unit.motion?.death || 0;
      c.save(); c.globalAlpha = 1 - death;
      if (death) { c.translate(p.x, p.y); c.rotate(-death * Math.PI / 2); c.translate(-p.x, -p.y); }
      c.fillStyle = '#203b3180'; c.beginPath(); c.ellipse(p.x, p.y + 1, size * 1.2, size * .5, 0, 0, Math.PI * 2); c.fill();
      c.fillStyle = TEAM[unit.team]; c.fillRect(p.x - size * .7, p.y - size * 1.8, size * 1.4, size * 1.6);
      c.fillStyle = '#e0c69a'; c.beginPath(); c.arc(p.x, p.y - size * 2.15, size * .58, 0, Math.PI * 2); c.fill();
      const swing = unit.motion?.attack >= 0 && unit.motion.attack < 1 ? Math.sin(unit.motion.attack * Math.PI) : 0;
      c.strokeStyle = '#d9d7ac'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(p.x + size, p.y - size * .5); c.lineTo(p.x + size * (1.5 + swing), p.y - size * (2.8 - swing * 1.6)); c.stroke();
      if (spec?.role === 'magic' || spec?.role === 'support') { c.fillStyle = '#95deec'; c.beginPath(); c.arc(p.x + size * 1.5, p.y - size * 2.8, 2.5, 0, Math.PI * 2); c.fill(); }
      if (this.selected === unit.id && unit.hp > 0) { c.strokeStyle = '#f3de91'; c.beginPath(); c.ellipse(p.x, p.y, size * 1.4, size * .7, 0, 0, Math.PI * 2); c.stroke(); }
      if (unit.hp > 0) { c.fillStyle = '#1b3128'; c.fillRect(p.x - size, p.y - size * 3.25, size * 2, 2); c.fillStyle = TEAM[unit.team]; c.fillRect(p.x - size, p.y - size * 3.25, size * 2 * clamp(unit.hp / unit.maxHp, 0, 1), 2); }
      c.restore();
      if (unit.hp > 0) drawFallbackStatuses(c, unit, p.x, p.y - size * 3.25 - 10, this.quality);
    }
    for (const effect of state.effects || []) {
      if(effect.phase==='windup')continue;
      const kind=effectKind(effect),progress = 1 - effect.life / (effect.maxLife || 1), projectile = effect.phase==='release'||(!effect.phase&&['arrow','magic','meteor'].includes(effect.type))||(effect.type==='meteor'&&effect.phase!=='impact');
      const p = this._fallbackProject(effect.x + ((effect.tx ?? effect.x) - effect.x) * (projectile ? progress : 0), effect.z + ((effect.tz ?? effect.z) - effect.z) * (projectile ? progress : 0));
      c.save(); c.globalAlpha = Math.min(1, effect.life / .2); c.strokeStyle = c.fillStyle = effect.type === 'heal' ? '#a6f5a7' : effect.type === 'meteor' ? '#ffc574' : '#c0e8ff';
      if(kind==='heal'||kind==='chain'){
        const end=this._fallbackProject(effect.tx,effect.tz);c.beginPath();c.moveTo(p.x,p.y-1.6*s);c.quadraticCurveTo((p.x+end.x)/2,Math.min(p.y,end.y)-3*s,end.x,end.y-1.6*s);c.stroke();c.beginPath();c.ellipse(end.x,end.y,.8*s,.6*s,0,0,Math.PI*2);c.stroke();
      }else{
        c.beginPath(); c.arc(p.x, p.y - (projectile ? (kind==='meteor'?1+(1-progress)*13:1.5 + Math.sin(progress * Math.PI) * (kind==='siege'?4:1.15)) * s : 0), projectile ? Math.max(1.5, s * (kind==='siege'?.45:.2)) : ((effect.radius||1)*(.45+progress*.55)) * s, 0, Math.PI * 2); projectile ? c.fill() : c.stroke();
      }c.restore();
    }
    c.fillStyle = '#13291eb3'; c.fillRect(12, h - 32, 230, 22); c.fillStyle = '#d1dcb8'; c.font = '11px system-ui'; c.fillText('Illustrated mode · WebGL unavailable', 22, h - 17);
    if (this.targeting && this.targetPoint) {
      const p = this._fallbackProject(this.targetPoint.x, this.targetPoint.z), radius = (this.targeting.radius || 6) * s;
      c.strokeStyle = this.targeting.color || '#ffcd85'; c.fillStyle = `${this.targeting.color || '#ffcd85'}22`; c.lineWidth = 2; c.beginPath(); c.ellipse(p.x, p.y, radius, radius * .75, 0, 0, Math.PI * 2); c.fill(); c.stroke();
      c.beginPath(); c.moveTo(p.x - 7, p.y); c.lineTo(p.x + 7, p.y); c.moveTo(p.x, p.y - 7); c.lineTo(p.x, p.y + 7); c.stroke();
    }
  }

  _fallbackSelect(event) {
    const rect = this.canvas.getBoundingClientRect(), x = event.clientX - rect.left, y = event.clientY - rect.top;
    const unit = this._pickUnit(event);
    if (unit && !this.targeting) { this.selected = unit.id; this.onSelect(unit); }
    else this.onGround((x - this.viewWidth / 2) / this.viewWidth * this.width + this.center.x, (y - this.viewHeight * .52) / this.viewWidth * this.width / .75 + this.center.z);
  }

  destroy() {
    if (this.disposed) return;
    this._clearHover();
    this.disposed = true; this.resizeObserver?.disconnect();
    this.listeners.forEach(([target, event, fn, options]) => target.removeEventListener(event, fn, options));
    this.statusMarkers?.destroy();
    for (const object of this.effects.values()) disposeCombatEffect(object);
    // Unit templates are intentionally shared across battlefield instances.
    this.renderer?.dispose(); this.canvas.remove(); this.units.clear(); this.effects.clear();
  }
}
