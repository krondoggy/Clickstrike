import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import { Battlefield } from '../src/battlefield.js';

const soldier = (extra = {}) => ({ id: 'unit-1', unitId: 'footman', team: 'player', hp: 390, maxHp: 390, x: 0, z: 0, ...extra });

function fixture() {
  const callbacks = [], selections = [], grounds = [], events = new Map();
  const field = Object.assign(Object.create(Battlefield.prototype), {
    fallback: true, viewWidth: 800, viewHeight: 500, width: 100, mode: 'battle',
    center: new THREE.Vector3(), touchPointers: new Map(), listeners: [],
    units: new Map(), effects: new Map(), hoverPointer: null, hoverUnit: null, hoverCheckedAt: -Infinity,
    fallbackUnits: [soldier()],
    onHover: (unit, point) => callbacks.push({ unit, point }),
    onSelect: unit => selections.push(unit), onGround: (x, z) => grounds.push({ x, z }),
    canvas: {
      style: {}, getBoundingClientRect: () => ({ left: 10, top: 20, right: 810, bottom: 520, width: 800, height: 500 }),
      addEventListener: (name, fn) => events.set(name, fn), removeEventListener: name => events.delete(name), remove() {},
    },
  });
  const point = { clientX: 410, clientY: 273, pointerType: 'mouse', pointerId: 1, button: 0, buttons: 0 };
  return { field, callbacks, selections, grounds, point, send: (name, extra = {}) => events.get(name)({ ...point, ...extra }) };
}

test('a stationary battlefield pointer refreshes health, clears dead units, and limits picking to ten checks per second', () => {
  const { field, callbacks, point } = fixture();
  field._trackHover(point);
  const firstCheck = field.hoverCheckedAt = 1000;
  assert.equal(callbacks[0].unit.hp, 390);
  assert.deepEqual(callbacks[0].point, { clientX: 410, clientY: 273, pointerType: 'mouse' });
  field.fallbackUnits = [soldier({ hp: 200 })];
  for (let elapsed = 1; elapsed < 100; elapsed++) field._refreshHover(firstCheck + elapsed);
  assert.equal(callbacks.length, 1, 'No repeated hit tests or callbacks between refreshes');
  field._refreshHover(firstCheck + 100);
  assert.equal(callbacks.at(-1).unit.hp, 200, 'Refresh returns the current render snapshot');
  field.fallbackUnits = [soldier({ hp: 0 })];
  field._refreshHover(firstCheck + 200);
  assert.equal(callbacks.at(-1).unit, null);
  const count = callbacks.length;
  field._refreshHover(firstCheck + 300);
  assert.equal(callbacks.length, count, 'Empty ground does not repeatedly clear other tooltips');
  field.fallbackUnits = [soldier({ id: 'unit-2' })];
  field._refreshHover(firstCheck + 400);
  assert.equal(callbacks.at(-1).unit.id, 'unit-2', 'Units moving under a stationary pointer are detected');
});

test('3D picking resolves nested meshes to their current live or formation-preview unit', () => {
  const { field } = fixture();
  field.fallback = false;
  field.camera = new THREE.OrthographicCamera(-5, 5, 5, -5, .1, 100);
  field.camera.position.set(0, 0, 10); field.camera.lookAt(0, 0, 0); field.camera.updateMatrixWorld();
  field.raycaster = new THREE.Raycaster(); field.pointer = new THREE.Vector2(); field.unitGroup = new THREE.Group();
  const model = new THREE.Group(), joint = new THREE.Group();
  joint.add(new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2), new THREE.MeshBasicMaterial()));
  model.add(joint); field.unitGroup.add(model); field.unitGroup.updateMatrixWorld(true);
  const point = { clientX: 410, clientY: 270 };
  model.userData.unit = soldier();
  assert.equal(field._pickUnit(point), model.userData.unit);
  model.userData.unit = soldier({ hp: 150 });
  assert.equal(field._pickUnit(point).hp, 150);
  model.userData.unit = soldier({ id: 'preview:enemy:r2', team: 'enemy', rosterId: 'r2' });
  assert.equal(field._pickUnit(point).rosterId, 'r2');
  model.userData.unit.hp = 0;
  assert.equal(field._pickUnit(point), null, 'Dying models cannot display stats or be selected');
});

test('mouse clicking keeps selection intact while hovering, dragging, and touch remain separate', () => {
  const { field, callbacks, selections, grounds, send } = fixture();
  field._bind();
  send('pointerenter');
  assert.equal(callbacks.at(-1).unit.id, 'unit-1');
  send('pointerdown', { buttons: 1 });
  assert.equal(callbacks.at(-1).unit, null);
  const count = callbacks.length;
  send('pointermove', { buttons: 1 });
  assert.equal(callbacks.length, count);
  send('pointerup');
  assert.equal(selections.at(-1).id, 'unit-1');
  send('pointermove');
  send('pointerdown', { button: 2, buttons: 2 });
  send('pointermove', { button: 2, buttons: 2, clientX: 430 });
  send('pointerup', { button: 2 });
  assert.equal(selections.length, 1, 'Panning does not select a unit');
  assert.equal(grounds.length, 0);
  assert.equal(field.hoverPointer, null);
  field.center.set(0, 0, 0);
  send('pointerdown', { pointerType: 'touch', buttons: 1 });
  send('pointermove', { pointerType: 'touch', buttons: 1 });
  send('pointerup', { pointerType: 'touch' });
  assert.equal(selections.length, 2, 'Touch taps still select');
  assert.equal(field.hoverPointer, null, 'Touch never starts a hover');
});

test('hover clears when leaving, cancelling a pointer, moving the camera, targeting, or disposing', () => {
  const { field, callbacks, point, send } = fixture();
  field._bind();
  for (const clear of [
    () => send('pointerleave'),
    () => send('pointercancel'),
    () => field.focus(0, 0),
    () => field.setTargeting({ id: 'heal', radius: 6 }),
  ]) {
    field.targeting = null; field._trackHover(point);
    assert.ok(callbacks.at(-1).unit);
    clear();
    assert.equal(callbacks.at(-1).unit, null);
    assert.equal(field.hoverPointer, null);
  }
  field.targeting = null; field._trackHover(point); field.destroy();
  assert.equal(callbacks.at(-1).unit, null);
  assert.equal(field.disposed, true);
});

test('captured pointers outside the canvas and spell targeting cannot restart hover', () => {
  const { field, callbacks, point } = fixture();
  field._trackHover(point);
  const lastCheck = field.hoverCheckedAt = 1000;
  field.hoverPointer = { ...point, clientX: 900 };
  field._refreshHover(lastCheck + 100);
  assert.equal(callbacks.at(-1).unit, null);
  assert.equal(field.hoverPointer, null);
  field.targeting = { id: 'heal' };
  const count = callbacks.length;
  field._trackHover(point); field._refreshHover(lastCheck + 200);
  assert.equal(callbacks.length, count);
  assert.equal(field.hoverPointer, null);
});
