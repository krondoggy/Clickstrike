import test from 'node:test';
import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';
import { UNIT_MAP } from '../src/data.js';
import { buildTacticalContext, chooseTacticalTarget, moveTactically, resolveBodies, getAttackReach, hasEngagementSlot, TACTICAL_LIMITS } from '../src/tactics.js';

const fighter = (unitId, id, team, x, z, extra = {}) => ({ ...UNIT_MAP[unitId], unitId, id, team, x, z, maxHp: UNIT_MAP[unitId].hp, targetId: null, targetCommitUntil: 0, retreatUntil: 0, retreatCooldownUntil: 0, flankSide: 0, cooldown: .8, ...extra });
const scene = units => ({ time: 0, units, structures: [], pendingAttacks: [], projectiles: [] });
const select = (state, unit) => chooseTacticalTarget(unit, [...state.units, ...state.structures].filter(other => other.team !== unit.team), buildTacticalContext(state));
const advance = (state, seconds, movable = () => true) => {
  for (let step = 0; step < Math.round(seconds * 10); step++) {
    state.time += .1;
    const context = buildTacticalContext(state);
    for (const unit of state.units) {
      const target = chooseTacticalTarget(unit, [...state.units, ...state.structures].filter(other => other.team !== unit.team), context);
      if (movable(unit)) moveTactically(unit, target, context, .1);
    }
    resolveBodies(state.units, .1, context);
  }
};
const separation = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);

test('anti-air units actually select flyers and ordinary melee cannot', () => {
  const archer = fighter('archer', 'a', 'player', -4, 0), grunt = fighter('grunt', 'g', 'enemy', 0, 0), flyer = fighter('wyvern', 'f', 'enemy', 2, 0);
  const state = scene([archer, grunt, flyer]);
  assert.equal(select(state, archer).id, flyer.id);
  const footman = fighter('footman', 'm', 'player', -4, 1); state.units.push(footman);
  assert.equal(select(state, footman).id, grunt.id);
});

test('mage, banshee and shaman prioritize heavy armor without chasing beyond vision', () => {
  for (const id of ['mage', 'banshee', 'shaman']) {
    const caster = fighter(id, 'caster', 'player', -5, 0), light = fighter('archer', 'light', 'enemy', 0, 0), heavy = fighter('grunt', 'heavy', 'enemy', 2, 0);
    const state = scene([caster, light, heavy]); assert.equal(select(state, caster).id, heavy.id);
    heavy.x = 30; assert.equal(select(state, caster).id, light.id);
  }
});

test('cavalry and ghouls exploit exposed archers but respect a protective pike screen', () => {
  for (const id of ['knight', 'ghoul']) {
    const hunter = fighter(id, 'hunter', 'player', -6, 0), archer = fighter('archer', 'archer', 'enemy', 4, 0), distant = fighter('grunt', 'distant', 'enemy', 0, 7);
    const state = scene([hunter, archer, distant]); assert.equal(select(state, hunter).id, archer.id);
    hunter.targetId = null; state.units.push(fighter('spearman', 'screen', 'enemy', 0, 0));
    assert.equal(select(state, hunter).id, 'screen');
  }
});

test('Bone Sentinels intercept cavalry within their declared four-meter screen', () => {
  const knight = fighter('knight', 'rider', 'player', -6, 0), archer = fighter('archer', 'archer', 'enemy', 4, 0), skeleton = fighter('skeleton', 'sentinel', 'enemy', 0, 3);
  const state = scene([knight, archer, skeleton]);
  assert.equal(select(state, knight).id, skeleton.id);
});

test('siege selects valuable clusters and protected reachable structures', () => {
  const siege = fighter('ballista', 'siege', 'player', -12, 0), isolated = fighter('grunt', 'alone', 'enemy', -3, -5);
  const cluster = [0, 1, 2].map(i => fighter('grunt', `pack${i}`, 'enemy', 0 + i * .9, 1));
  const state = scene([siege, isolated, ...cluster]); assert.match(select(state, siege).id, /^pack/);
  state.units = [siege, isolated]; siege.targetId = null; state.structures = [{ id: 'tower', kind: 'tower', team: 'enemy', x: 2, z: 0, hp: 1000, armor: 4 }];
  assert.equal(select(state, siege).id, 'tower');
});

test('target commitments prevent tiny priority changes and release dead or already-lethal targets', () => {
  const archer = fighter('archer', 'a', 'player', -6, 0), one = fighter('grunt', 'one', 'enemy', 0, -.5), two = fighter('grunt', 'two', 'enemy', .1, .5);
  const state = scene([archer, one, two]); assert.equal(select(state, archer).id, one.id);
  two.x = -.3; state.time = .1; assert.equal(select(state, archer).id, one.id);
  state.projectiles = [{ targetId: one.id, damage: 1000, attackType: 'magic' }];
  assert.equal(select(state, archer).id, two.id);
  two.hp = 0; assert.equal(select(state, archer).id, one.id);
});

test('a healer in the rear advances behind its screen and reaches useful spell range', () => {
  const tank = fighter('footman', 'tank', 'player', -12, 0), healer = fighter('priest', 'healer', 'player', -16, 1), foe = fighter('grunt', 'foe', 'enemy', 6, 0, { speed: 0 });
  const state = scene([tank, healer, foe]);
  advance(state, 14, unit => unit.team === 'player');
  assert.ok(tank.x - healer.x > 2.5, 'Healer remains behind its frontline');
  assert.ok(separation(healer, tank) < 11, 'Healer can reach the tank');
  assert.ok(separation(healer, foe) <= getAttackReach(healer, foe) + .3, 'Support does not stall far from combat');
});

test('ranged retreat has a short window and a long commitment to attacking between retreats', () => {
  const archer = fighter('archer', 'archer', 'player', -2.5, 0), foe = fighter('grunt', 'foe', 'enemy', 0, 0, { speed: 0 });
  const state = scene([archer, foe]); advance(state, .1, unit => unit.team === 'player');
  const deadline = archer.retreatUntil;
  assert.ok(deadline > state.time && deadline - state.time <= .56);
  advance(state, 1.2, unit => unit.team === 'player');
  assert.equal(archer.retreatUntil, deadline, 'Repeated threats cannot extend retreat indefinitely');
  assert.equal(archer.action, 'attack');
  assert.ok(archer.x > -4, 'Bounded retreat gives melee a chance to close');
});

test('ground bodies block both armies and moving troops do not tunnel through a screen', () => {
  const runner = fighter('ghoul', 'runner', 'player', -5, 0, { speed: 14 }), target = fighter('archer', 'target', 'enemy', 5, 0);
  const wall = [-1.4, -.47, .47, 1.4].map((z, i) => fighter('footman', `wall${i}`, 'enemy', 0, z, { speed: 0 }));
  const state = scene([runner, target, ...wall]);
  for (let step = 0; step < 30; step++) {
    const context = buildTacticalContext(state); runner.targetId = target.id;
    moveTactically(runner, target, context, .1); resolveBodies(state.units, .1, context); state.time += .1;
    for (const blocker of wall) assert.ok(separation(runner, blocker) > .89, 'Cannot occupy an enemy body');
    if (runner.x > 0) assert.ok(Math.abs(runner.z) > 2, 'Crosses around the screen, never through it');
  }
});

test('melee engagement slots send excess attackers around or behind the first rank', () => {
  const target = fighter('grunt', 'target', 'enemy', 0, 0, { speed: 0 });
  const army = Array.from({ length: 12 }, (_, i) => fighter('footman', `attacker${i}`, 'player', -5 - Math.floor(i / 4), -1.8 + i % 4 * 1.2));
  const state = scene([...army, target]); advance(state, 12, unit => unit.team === 'player');
  const inReach = army.filter(unit => separation(unit, target) <= getAttackReach(unit, target) + .01);
  assert.ok(inReach.length <= TACTICAL_LIMITS.meleeSlots, `At most six melee attackers, saw ${inReach.length}`);
  assert.ok(inReach.length >= 3, 'Front rank can still fight');
  const context = buildTacticalContext(state);
  assert.equal(army.filter(unit => hasEngagementSlot(unit, target, context)).length, 6, 'Authoritative attack eligibility has exactly six slots');
});

test('bridge routing uses its full width and avoids water and rails during congestion', () => {
  const army = [-12, -8.1, -4, 0, 4, 8.1, 12].map((z, i) => fighter('footman', `lane${i}`, 'player', -10 - i * .15, z));
  const castle = { id: 'castle', team: 'enemy', kind: 'castle', hp: 8000, x: 32, z: 0 };
  const state = scene(army); state.structures = [castle];
  let usedOuterLane = false;
  for (let step = 0; step < 200; step++) {
    advance(state, .1);
    for (const unit of army) if (Math.abs(unit.x) < 6.4) {
      assert.ok(Math.abs(unit.z) <= 8.85, 'Ground body stays on bridge');
      if (Math.abs(unit.z) > 7.2) usedOuterLane = true;
    }
  }
  assert.ok(army.every(unit => unit.x > 6.4), 'Every congested lane crosses');
  assert.ok(usedOuterLane, 'Usable width is not incorrectly narrowed to seven meters');
});

test('legacy units outside the bridge recover gradually without teleporting or freezing', () => {
  const unit = fighter('footman', 'legacy', 'player', 0, 10), foe = fighter('grunt', 'foe', 'enemy', 14, 0, { speed: 0 });
  const state = scene([unit, foe]);
  advance(state, .1, actor => actor === unit);
  assert.ok(unit.z < 10 && unit.z > 9.7, 'Recovery respects movement speed');
  advance(state, 2, actor => actor === unit);
  assert.ok(Math.abs(unit.z) < 8.85, 'Legacy unit rejoins the playable bridge');
});

test('mirrored armies use mirrored paths and targets independent of array processing order', () => {
  const original = scene([
    fighter('knight', 'p1', 'player', -13, 3), fighter('priest', 'p2', 'player', -15, -3), fighter('footman', 'p3', 'player', -10, -2),
    fighter('archer', 'e1', 'enemy', 14, 3), fighter('spearman', 'e2', 'enemy', 10, 0), fighter('grunt', 'e3', 'enemy', 11, -2),
  ]);
  const reflected = structuredClone(original);
  reflected.units.reverse(); reflected.units.forEach(unit => { unit.x *= -1; unit.team = unit.team === 'player' ? 'enemy' : 'player'; });
  advance(original, 12); advance(reflected, 12);
  for (const unit of original.units) {
    const mirror = reflected.units.find(other => other.id === unit.id);
    assert.ok(Math.abs(unit.x + mirror.x) < .001 && Math.abs(unit.z - mirror.z) < .001, `${unit.id} follows its mirrored path`);
    assert.equal(unit.targetId, mirror.targetId);
  }
});

test('180-unit tactical ticks stay bounded and finite', () => {
  const state = scene(Array.from({ length: 180 }, (_, i) => fighter(['footman', 'archer', 'mage', 'knight', 'priest', 'ballista'][i % 6], `u${i}`, i < 90 ? 'player' : 'enemy', (i < 90 ? -1 : 1) * (7 + Math.floor(i % 90 / 10) * 1.15), -5.2 + i % 10 * 1.15)));
  const started = performance.now(); advance(state, 1);
  const elapsed = performance.now() - started;
  assert.ok(elapsed < 2500, `Ten tactical ticks remain bounded (${elapsed.toFixed(0)}ms)`);
  assert.ok(state.units.every(unit => Number.isFinite(unit.x) && Number.isFinite(unit.z)));
});
