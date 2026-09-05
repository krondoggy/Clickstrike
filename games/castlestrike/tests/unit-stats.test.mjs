import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame } from '../src/engine.js';
import { FACTIONS, UNITS } from '../src/data.js';
import { getUnitStats } from '../src/unit-stats.js';

const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} != ${expected}`);
const deployed = (faction, unitId) => {
  const game = createGame({ faction });
  game.state.roster = [{ id: 'test-roster', unitId, row: 2, col: 4 }];
  game.start();
  return { game, state: game.state, live: game.state.units.find(unit => unit.team === 'player') };
};

test('reinforcement previews match engine spawns for every faction, both teams, research and hero wave boundaries', () => {
  for (const faction of FACTIONS) for (const wave of [0, 4, 5, 9, 10]) {
    const game = createGame({ faction: faction.id });
    const state = game.state;
    state.wave = wave;
    state.research.weapons = 2; state.research.armor = 1;
    state.enemy.research.weapons = 1; state.enemy.research.armor = 3;
    for (const team of ['player', 'enemy']) {
      const factionId = team === 'player' ? state.faction : state.enemyFaction;
      state[team === 'player' ? 'roster' : 'enemyRoster'] = UNITS.filter(unit => unit.faction === factionId)
        .map((unit, index) => ({ id: `${team}-${unit.id}`, unitId: unit.id, row: index % 6, col: Math.floor(index / 6) }));
    }
    const previews = new Map([...state.roster.map(unit => ['player', unit]), ...state.enemyRoster.map(unit => ['enemy', unit])]
      .map(([team, unit]) => [`${team}-${unit.unitId}`, getUnitStats(state, unit.unitId, { team })]));
    game.start();
    for (const live of state.units) {
      const preview = previews.get(`${live.team}-${live.unitId}`);
      assert.equal(preview.health, live.hp);
      assert.equal(preview.maxHp, live.maxHp);
      assert.equal(preview.level, live.level);
      assert.equal(preview.damage, live.damage);
      assert.equal(preview.armor, live.armor);
      assert.equal(preview.attackInterval, live.attackSpeed);
      assert.equal(preview.range, live.range);
      assert.equal(preview.speed, live.speed);
      assert.deepEqual(preview.statuses, []);
    }
  }
});

test('live previews keep deployed health and upgrades when research and future hero levels change', () => {
  const { state, live } = deployed('alliance', 'paladin');
  live.hp = 321.5;
  state.research.weapons = 3; state.research.armor = 3; state.wave = 10;
  const before = JSON.stringify(state);
  const stats = getUnitStats(state, live.unitId, { live });
  assert.equal(stats.health, 321.5);
  assert.equal(stats.maxHp, 1060);
  assert.equal(stats.damage, 58);
  assert.equal(stats.armor, 10, 'a paladin benefits from his own armor aura');
  assert.equal(stats.level, 1);
  assert.equal(getUnitStats(state, live.unitId).level, 3);
  assert.ok(getUnitStats(state, live.unitId).maxHp > stats.maxHp);
  assert.equal(JSON.stringify(state), before, 'inspection is read-only');
});

test('live damage shows current curse and Blood Fury but does not assume a target or special third strike', () => {
  const { state, live } = deployed('horde', 'grunt');
  live.hp = live.maxHp / 2;
  assert.equal(getUnitStats(state, live.unitId, { live }).damage, 29);
  live.hp -= 1; live.curseTime = 3;
  const stats = getUnitStats(state, live.unitId, { live });
  close(stats.damage, 30.537);
  assert.ok(stats.statuses.includes('Blood Fury'));
  assert.ok(stats.statuses.includes('Cursed'));
  const hero = deployed('horde', 'blademaster');
  hero.live.attacks = 2;
  assert.equal(getUnitStats(hero.state, hero.live.unitId, { live: hero.live }).damage, 68);
});

test('armor aura respects team, living providers and radius, never stacking and allowing negative armor', () => {
  const { state, live } = deployed('alliance', 'archer');
  live.armorBreak = 3;
  const stats = () => getUnitStats(state, live.unitId, { live });
  assert.equal(stats().armor, -2);
  const aura = { ...live, id: 'aura', unitId: 'paladin', hp: 1, x: live.x + 7 };
  state.units.push(aura, { ...aura, id: 'aura-2' });
  assert.equal(stats().armor, 0);
  assert.equal(stats().statuses.filter(label => label === 'Beacon of Dawn').length, 1);
  aura.hp = 0; state.units.pop();
  assert.equal(stats().armor, -2);
  aura.hp = 1; aura.team = 'enemy';
  assert.equal(stats().armor, -2);
  aura.team = 'player'; aura.x += 0.001;
  assert.equal(stats().armor, -2);
});

test('haste and rally combine additively while slows, roots and stuns affect movement independently', () => {
  const { state, live } = deployed('horde', 'grunt');
  live.hasteTime = 3; live.rallyTime = 4; live.shield = 42;
  live.slowTime = 2; live.slowAmount = 0.6;
  let stats = getUnitStats(state, live.unitId, { live });
  close(stats.attackInterval, 1.3 / 1.65);
  close(stats.speed, 0.972);
  assert.equal(stats.shield, 42);
  assert.ok(stats.statuses.includes('Hastened'));
  assert.ok(stats.statuses.includes('Shielded'));
  assert.ok(stats.statuses.includes('Slowed'));
  for (const kind of ['rootTime', 'stunTime']) {
    live[kind] = 1;
    assert.equal(getUnitStats(state, live.unitId, { live }).speed, 0);
    live[kind] = 0;
  }
  live.slowTime = 0; live.hasteTime = 0; live.rallyTime = 0;
  stats = getUnitStats(state, live.unitId, { live });
  assert.equal(stats.attackInterval, 1.3);
  close(stats.speed, 2.43);
});

test('summoned health is read from the actual unit and incompatible unit references are rejected', () => {
  const { state, live } = deployed('undead', 'skeleton');
  live.summonedBy = 'caster'; live.maxHp = 144; live.hp = 52;
  const stats = getUnitStats(state, live.unitId, { live });
  assert.equal(stats.maxHp, 144);
  assert.equal(stats.health, 52);
  assert.equal(getUnitStats(state, 'missing'), null);
  assert.equal(getUnitStats(state, 'ghoul', { live }), null);
});
