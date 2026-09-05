import test from 'node:test';
import assert from 'node:assert/strict';
import { BattleMotion, attackPose, angleBetween } from '../src/render-motion.js';
import { createUnitModel, animateUnit } from '../src/unit-models.js';
import { UNITS } from '../src/data.js';

const makeUnit = (extra = {}) => ({ id: 'u1', unitId: 'footman', team: 'player', x: 0, z: 0, hp: 390, maxHp: 390, action: 'walk', speed: 3, attackSpeed: 1.2, attacks: 0, heading: Math.PI / 2, ...extra });
const makeState = () => ({ status: 'playing', time: 0, accumulator: 0, paused: false, units: [makeUnit()], effects: [] });
const sample = (motion, state, dt = 1 / 60) => motion.sample(state, state.units, dt);

test('authoritative contact updates unit and structure health on the same visual clock', () => {
  const state = { ...makeState(), version: 3, structures: [{ id: 'tower', hp: 100, x: 8, z: 0 }] }, motion = new BattleMotion();
  sample(motion, state);
  state.time = .1; state.units[0].hp = 370; state.structures[0].hp = 0;
  state.effects = [{ id: 'impact', phase: 'impact', semanticKind: 'arrow', startedAt: .1, life: .3, maxLife: .3 }];
  let frame = sample(motion, state);
  assert.equal(frame.units[0].hp, 390); assert.equal(frame.structures[0].hp, 100); assert.equal(frame.effects.length, 0);
  state.accumulator = .1; frame = sample(motion, state);
  assert.equal(frame.units[0].hp, 370); assert.equal(frame.structures[0].hp, 0); assert.equal(frame.effects[0].phase, 'impact');
});

test('ordinary missiles visually follow their committed moving target while siege keeps its ground aim', () => {
  const state = { ...makeState(), version: 3 }, motion = new BattleMotion();
  state.units.push(makeUnit({ id: 'victim', team: 'enemy', x: 8, flying: true }));
  state.effects = ['arrow','siege'].map(kind => ({ id: kind, semanticKind: kind, phase: 'release', sourceId: 'u1', targetId: 'victim', startedAt: 0, life: 1, maxLife: 1, x: 0, z: 0, tx: 8, tz: 0 }));
  sample(motion, state); state.time = .1; state.accumulator = .05; state.units[1].z = .2;
  const before = JSON.stringify(state), frame = sample(motion, state);
  assert.equal(frame.effects.find(e => e.id === 'arrow').tz, frame.units[1].z);
  assert.equal(frame.effects.find(e => e.id === 'arrow').targetY, 5.5);
  assert.equal(frame.effects.find(e => e.id === 'siege').tz, 0);
  assert.equal(JSON.stringify(state), before, 'Presentation does not modify committed gameplay aims');
});

test('terminal attacks finish their visible impact and a canceled pose does not persist on a frozen tick', () => {
  const state = { ...makeState(), version: 3 }, motion = new BattleMotion();
  state.units[0].attackPose = { startedAt: 0, releaseAt: .3, recoveryAt: .6 }; sample(motion,state);
  state.time = .1; state.units[0].attackPose = null; state.status = 'victory';
  state.effects = [{ id: 'final', semanticKind: 'collapse', phase: 'impact', startedAt: .1, life: .8, maxLife: .8 }];
  let frame; for (let i=0;i<12;i++) frame=sample(motion,state,.02);
  assert.ok(frame.time > .1); assert.ok(frame.effects.some(e=>e.id==='final'));
  assert.equal(frame.units[0].motion.attack, Infinity);
});

test('60 Hz positions progress smoothly between fixed 10 Hz simulation ticks at every game speed', () => {
  for (const speed of [1, 1.5, 2, 3]) {
    const state = makeState(), motion = new BattleMotion(), displayed = [], snapped = [];
    sample(motion, state);
    for (let frame = 0; frame < 120; frame++) {
      state.accumulator += speed / 60;
      while (state.accumulator + 1e-8 >= .1) { state.accumulator -= .1; state.time += .1; state.units[0].x += .3; }
      state.accumulator = Math.max(0, state.accumulator);
      const before = JSON.stringify(state), visual = sample(motion, state, speed / 60);
      assert.equal(JSON.stringify(state), before, 'Rendering never mutates simulation');
      displayed.push(visual.units[0].x); snapped.push(state.units[0].x);
    }
    const steps = values => values.slice(16).map((value, i) => value - values[i + 15]);
    const smoothSteps = steps(displayed), oldSteps = steps(snapped);
    assert.ok(smoothSteps.every(step => Math.abs(step - 3 * speed / 60) < 1e-8), `Steady per-frame velocity at ${speed}x`);
    assert.ok(Math.max(...smoothSteps) < Math.max(...oldSteps) * .51, `Smaller frame jumps at ${speed}x`);
  }
});

test('headings interpolate across the shortest arc, and teleports never streak across the map', () => {
  assert.ok(Math.abs(angleBetween(Math.PI - .1, -Math.PI + .1, .5) - Math.PI) < 1e-8);
  const state = makeState(), motion = new BattleMotion(); sample(motion, state);
  state.time = .1; state.accumulator = .05; state.units[0].x = 40;
  assert.equal(sample(motion, state).units[0].x, 40);
});

test('low frame rates remain smooth when accelerated play advances multiple simulation ticks in one frame', () => {
  for (const fps of [25, 30]) for (const speed of [1, 2, 3]) {
    const state = makeState(), motion = new BattleMotion(); sample(motion, state);
    let previous = 0;
    for (let frame = 0; frame < 90; frame++) {
      state.accumulator += speed / fps;
      while (state.accumulator + 1e-8 >= .1) { state.accumulator -= .1; state.time += .1; state.units[0].x += .3; }
      state.accumulator = Math.max(0, state.accumulator);
      const x = sample(motion, state, speed / fps).units[0].x;
      if (frame > 10) assert.ok(Math.abs(x - previous - 3 * speed / fps) < 1e-8, `${fps} fps, ${speed}x remains uniform`);
      previous = x;
    }
  }
});

test('pause freezes positions, limb phase, attacks and projectiles; resume continues without a leap', () => {
  const state = makeState(), motion = new BattleMotion(); sample(motion, state);
  state.time = .1; state.units[0].x = .3; state.units[0].attacks = 1;
  state.effects = [{ id: 'e1', type: 'arrow', x: 0, z: 0, tx: 10, tz: 0, life: .45, maxLife: .45 }]; sample(motion, state);
  state.time = .2; state.accumulator = .05; state.units[0].x = .6; state.effects[0].life = .35;
  const moving = sample(motion, state), object = createUnitModel('footman'); animateUnit(object, moving.units[0], moving.time);
  state.paused = true;
  const before = { x: moving.units[0].x, attack: moving.units[0].motion.attack, life: moving.effects[0].life, limb: object.userData.limbs.legL.rotation.x };
  for (let i = 0; i < 60; i++) {
    const paused = sample(motion, state, 0); animateUnit(object, paused.units[0], paused.time);
    assert.deepEqual({ x: paused.units[0].x, attack: paused.units[0].motion.attack, life: paused.effects[0].life, limb: object.userData.limbs.legL.rotation.x }, before);
  }
  state.paused = false; state.accumulator += 1 / 60;
  assert.ok(Math.abs(sample(motion, state).units[0].x - before.x - .05) < 1e-8);
});

test('projectiles move between ticks and finish their flight after simulation effect removal', () => {
  const state = makeState(), motion = new BattleMotion(); sample(motion, state);
  state.time = .1;
  state.effects = [{ id: 'e1', type: 'magic', x: 0, z: 0, tx: 10, tz: 0, life: .45, maxLife: .45 }]; sample(motion, state);
  state.time = .3; state.accumulator = .01;
  const a = sample(motion, state).effects[0];
  state.accumulator = .06;
  const b = sample(motion, state).effects[0];
  assert.ok(Math.abs(a.life - b.life - .05) < 1e-8);
  state.time = .6; state.accumulator = 0; state.effects = [];
  assert.equal(sample(motion, state).effects.length, 1, 'Visual flight completes instead of disappearing at a fixed tick');
  state.time = .7;
  assert.equal(sample(motion, state).effects.length, 0);
});

test('attacks have distinct continuous windup, strike, and recovery poses', () => {
  assert.ok(attackPose(.2).windup > 0 && attackPose(.2).strike === 0);
  assert.ok(attackPose(.4).strike > .8);
  assert.ok(attackPose(.75).strike < attackPose(.5).strike);
  for (const seam of [0, .26, .44, 1]) {
    const a = attackPose(seam - 1e-7), b = attackPose(seam + 1e-7);
    assert.ok(Math.abs(a.windup - b.windup) < 1e-4 && Math.abs(a.strike - b.strike) < 1e-4);
  }
});

test('casualties fall smoothly and are eventually removed; previews never become corpses', () => {
  const state = makeState(), motion = new BattleMotion(); sample(motion, state);
  state.time = .1; state.units = [];
  const start = sample(motion, state).units[0];
  assert.equal(start.action, 'dead'); assert.equal(start.motion.death, 0);
  state.time = .4;
  assert.ok(sample(motion, state).units[0].motion.death > .4);
  state.time = .8; sample(motion, state); state.time = 1;
  assert.equal(sample(motion, state).units.length, 0);
  state.status = 'preparation'; state.units = [makeUnit({ id: 'preview:player:r1', rosterId: 'r1' })]; sample(motion, state);
  state.units = [];
  assert.equal(sample(motion, state).units.length, 0);
});

test('new matches, save restores, backward time and large scripted advances reset visual history', () => {
  const state = makeState(), motion = new BattleMotion(); sample(motion, state);
  state.time = .1; state.units[0].x = .3; sample(motion, state);
  state.time = 20; state.units[0].x = 30;
  assert.equal(sample(motion, state).units[0].x, 30);
  state.time = 0; state.units[0].x = -30;
  assert.equal(sample(motion, state).units[0].x, -30);
  const restored = structuredClone(state); restored.units[0].x = -10;
  assert.equal(sample(motion, restored).units[0].x, -10);
});

test('every unit model produces finite articulated walk, attack, idle and death poses', () => {
  for (const spec of UNITS) {
    const object = createUnitModel(spec.model);
    for (const progress of [Infinity, 0, .15, .3, .44, .8, 1]) {
      for (const death of [0, .3, 1]) {
        animateUnit(object, { ...makeUnit(), motion: { delta: 1 / 60, walk: death ? 0 : .8, speed: spec.speed, attack: progress, hit: .4, death, spawn: 1 } }, 2.5);
        object.traverse(part => assert.ok([...part.position, part.rotation.x, part.rotation.y, part.rotation.z, ...part.scale].every(Number.isFinite), `${spec.id} has a valid pose`));
      }
    }
  }
});
