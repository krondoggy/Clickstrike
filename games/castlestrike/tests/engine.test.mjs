import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, restoreGame } from '../src/engine.js';
import { FACTIONS, UNITS, RESEARCH, WAVE_INTERVAL, INCOME_INTERVAL, MINE_COOLDOWN } from '../src/data.js';

const advance = (g, seconds) => { for (let i = 0; i < seconds; i++) g.update(1); };
const rich = g => { g.state.gold = 20000; };
const noAI = g => { g.state.enemy.gold = 0; g.state.aiTimer = 100000; };
const economyOnly = () => {
  const g = createGame();
  g.state.roster = []; g.state.enemyRoster = []; g.state.supply = 0;
  g.start(); noAI(g);
  return g;
};

test('each faction has a complete, distinct roster with counter information', () => {
  for (const faction of FACTIONS) {
    const units = UNITS.filter(u => u.faction === faction.id);
    assert.equal(units.length, 9);
    assert.deepEqual([1, 2, 3].map(tier => units.filter(u => u.tier === tier && !u.hero).length), [3, 3, 2]);
    assert.equal(units.filter(u => u.hero).length, 1);
    for (const u of units) { assert.ok(u.abilityDescription); assert.ok(u.strongVs.length); assert.ok(u.weakVs.length); }
  }
});

test('preparation is paused in time and both armies start with an equal treasury', () => {
  const g = createGame();
  g.update(60);
  assert.equal(g.state.time, 0);
  assert.equal(g.state.gold, 280);
  assert.equal(g.state.enemy.gold, 280);
  assert.equal(g.state.roster.length, 3);
  assert.equal(g.state.enemyRoster.length, 3);
  assert.equal(g.state.units.length, 0);
  assert.equal(g.state.nextIncome, INCOME_INTERVAL);
  assert.equal(g.state.stats.goldEarned, 0);
});

test('income pays exactly 100 gold per 20 seconds with no gold between paydays', () => {
  const g = economyOnly();
  g.update(19.9);
  assert.equal(g.state.gold, 280);
  assert.equal(g.state.stats.goldEarned, 0);
  assert.ok(Math.abs(g.state.nextIncome - 0.1) < 0.00001);
  g.update(0.1);
  assert.equal(g.state.gold, 380);
  assert.equal(g.state.stats.goldEarned, 100);
  assert.equal(g.state.enemy.goldEarned, 100);
  assert.ok(Math.abs(g.state.nextIncome - 20) < 0.00001);
  g.update(19.9);
  assert.equal(g.state.gold, 380);
  g.update(0.1);
  assert.equal(g.state.gold, 480);
  advance(g, 80);
  assert.equal(g.state.stats.goldEarned, 600, 'two minutes gives six payouts, compared with the former 840 gold');
  assert.equal(g.state.enemy.goldEarned, 600);
  assert.equal(g.state.nextIncome, g.state.enemy.nextIncome);
});

test('mines and Sunwell ownership add modest bonuses only on the shared payday', () => {
  const g = economyOnly();
  assert.ok(g.research('mines').ok);
  g.state.control = 1;
  g.update(19.9);
  assert.equal(g.state.gold, 135);
  assert.equal(g.state.incomeAmount, 120);
  assert.equal(g.state.income, 6);
  g.update(0.1);
  assert.equal(g.state.gold, 255);
  assert.equal(g.state.stats.goldEarned, 120);
  assert.equal(g.state.enemy.goldEarned, 100);
  g.state.control = -1;
  g.update(20);
  assert.equal(g.state.gold, 365);
  assert.equal(g.state.incomeAmount, 110);
  assert.equal(g.state.enemy.incomeAmount, 110);
  assert.equal(g.state.enemy.goldEarned, 210);
});

test('mine upgrades require 90 active seconds between purchases and stop at four', () => {
  const g = economyOnly(); rich(g);
  assert.ok(g.research('mines').ok);
  assert.equal(g.state.mineCooldown, MINE_COOLDOWN);
  const gold = g.state.gold;
  assert.equal(g.research('mines').ok, false);
  assert.equal(g.state.gold, gold);
  g.togglePause(); g.update(60);
  assert.equal(g.state.mineCooldown, MINE_COOLDOWN);
  assert.equal(g.state.nextIncome, INCOME_INTERVAL);
  g.togglePause(); g.update(60); g.update(29.9);
  assert.equal(g.research('mines').ok, false);
  g.update(0.1);
  assert.equal(g.state.mineCooldown, 0);
  for (let level = 2; level <= 4; level++) {
    assert.ok(g.research('mines').ok);
    assert.equal(g.state.mineLevel, level);
    advance(g, MINE_COOLDOWN);
  }
  assert.equal(g.state.incomeAmount, 140);
  assert.equal(g.state.income, 7);
  const finalGold = g.state.gold;
  assert.equal(g.research('mines').ok, false);
  assert.equal(g.state.gold, finalGold);
});

test('preparation and pause freeze the income and mine clocks', () => {
  const g = createGame();
  assert.ok(g.research('mines').ok);
  g.update(60);
  assert.equal(g.state.gold, 135);
  assert.equal(g.state.mineCooldown, 90);
  assert.equal(g.state.nextIncome, 20);
  g.start(); g.update(12); g.togglePause();
  const frozen = g.serialize();
  g.update(60);
  assert.equal(g.serialize(), frozen);
});

test('recruitment is permanent and charges a fixed cost', () => {
  const g = createGame();
  assert.ok(g.recruit('footman').ok);
  assert.equal(g.state.gold, 180);
  assert.equal(g.state.roster.length, 4);
  g.start();
  assert.equal(g.state.units.filter(u => u.team === 'player').length, 4);
  advance(g, 25);
  assert.equal(g.state.wave, 2);
  assert.equal(g.state.roster.length, 4);
  assert.ok(g.state.units.some(u => u.team === 'player' && u.age < 1));
});

test('tiers, faction ownership, supply and hero uniqueness are enforced', () => {
  const g = createGame();
  rich(g);
  assert.equal(g.recruit('paladin').ok, false);
  assert.equal(g.recruit('grunt').ok, false);
  assert.ok(g.research('tier').ok);
  assert.ok(g.recruit('paladin').ok);
  assert.equal(g.recruit('paladin').ok, false);
  while (g.recruit('footman').ok) {}
  assert.ok(g.state.supply <= g.state.supplyCap);
  assert.equal(g.recruit('footman').ok, false);
  assert.ok(g.research('barracks').ok);
  assert.equal(g.state.supplyCap, 36);
  assert.ok(g.recruit('footman').ok);
});

test('moving swaps occupied cells and selling only removes future reinforcements', () => {
  const g = createGame();
  const [a, b] = g.state.roster;
  const old = { row: a.row, col: a.col };
  const target = { row: b.row, col: b.col };
  assert.ok(g.move(a.id, b.row, b.col).ok);
  assert.deepEqual({ row: a.row, col: a.col }, target);
  assert.deepEqual({ row: b.row, col: b.col }, old);
  assert.equal(g.move(a.id, -1, 10).ok, false);
  g.start();
  const deployed = g.state.units.length;
  assert.ok(g.sell(a.id).ok);
  assert.equal(g.state.gold, 350);
  assert.equal(g.state.units.length, deployed);
  assert.equal(g.state.roster.length, 2);
});

test('wave clock, pause and speed have explicit deterministic behavior', () => {
  const g = createGame();
  assert.ok(g.start().ok);
  assert.equal(g.state.wave, 1);
  assert.equal(g.state.nextWave, WAVE_INTERVAL);
  advance(g, 24);
  assert.equal(g.state.wave, 1);
  assert.ok(g.togglePause().ok);
  const time = g.state.time;
  g.update(20);
  assert.equal(g.state.time, time);
  g.togglePause();
  g.setSpeed(3);
  g.update(1);
  assert.equal(g.state.wave, 2);
  assert.ok(Math.abs(g.state.time - 25) < 0.001, 'UI owns speed multiplication');
  assert.equal(g.setSpeed(NaN).ok, false);
});

test('mines generate income and equipment upgrades apply to future waves', () => {
  const g = createGame();
  rich(g);
  g.start();
  const original = g.state.units.find(u => u.unitId === 'footman');
  const oldDamage = original.damage, oldHp = original.maxHp;
  assert.ok(g.research('weapons').ok);
  assert.ok(g.research('armor').ok);
  assert.ok(g.research('mines').ok);
  assert.equal(g.state.income, 5.5);
  assert.equal(g.state.incomeAmount, 110);
  assert.equal(original.damage, oldDamage);
  advance(g, 25);
  const upgraded = g.state.units.find(u => u.unitId === 'footman' && u.age < 1);
  assert.ok(upgraded.damage > oldDamage);
  assert.ok(upgraded.maxHp > oldHp);
  assert.equal(upgraded.armor, 7);
});

test('spells apply effects, spend gold, enforce cooldown and reject invalid targeting', () => {
  const g = createGame();
  assert.equal(g.cast('meteor').ok, false);
  g.start();
  const u = g.state.units.find(u => u.team === 'player');
  u.hp -= 100;
  assert.ok(g.cast('mend', u.x, u.z).ok);
  assert.equal(u.hp, u.maxHp);
  assert.equal(g.state.gold, 230);
  assert.equal(g.cast('mend', u.x, u.z).ok, false);
  assert.equal(g.cast('rally', 45, 17).ok, false);
  assert.equal(g.cast('meteor', NaN, 0).ok, false);
  assert.ok(g.cast('rally', u.x, u.z).ok);
  assert.equal(u.shield, 70);
  const enemy = g.state.units.find(u => u.team === 'enemy');
  const hp = enemy.hp;
  assert.ok(g.cast('meteor', enemy.x, enemy.z).ok);
  assert.equal(enemy.hp, hp, 'Starfall damages the area when the meteor lands');
  g.update(1.4);
  assert.ok(enemy.hp < hp);
  assert.ok(g.state.effects.some(e => e.type === 'meteor'));
});

test('ranged troops can attack flyers while ordinary melee cannot', () => {
  const g = createGame(); rich(g); g.research('tier'); g.research('tier'); g.recruit('gryphon'); g.start();
  const flying = g.state.units.find(u => u.unitId === 'gryphon');
  const melee = g.state.units.find(u => u.team === 'enemy' && UNITS.find(d => d.id === u.unitId).canHitAir === false);
  assert.ok(melee);
  flying.x = 0; flying.z = 0; flying.damage = 0; flying.cooldown = 100;
  melee.x = 0.5; melee.z = 0; melee.cooldown = 0;
  g.state.units = [flying, melee];
  const hp = flying.hp;
  g.update(0.1);
  assert.equal(flying.hp, hp);
  assert.notEqual(melee.targetId, flying.id);
});

test('summoned skeletons expire and cannot reassemble', () => {
  const g = createGame({ faction: 'undead' }); rich(g); g.research('tier'); g.recruit('necromancer'); g.start();
  const necromancer = g.state.units.find(u => u.unitId === 'necromancer');
  const enemy = g.state.units.find(u => u.team === 'enemy');
  necromancer.x = -2; necromancer.z = 0; necromancer.abilityCooldown = 0;
  enemy.x = 2; enemy.z = 0;
  g.update(0.1);
  const summoned = g.state.units.filter(u => u.summonedBy === necromancer.id);
  assert.equal(summoned.length, 2);
  assert.ok(summoned.every(u => u.maxHp < 200 && u.lifespan === 22));
  for (const u of summoned) u.age = 21.99;
  g.update(0.1);
  assert.ok(summoned.every(u => !g.state.units.includes(u)));
});

test('support healing and the shrine reward actual battlefield positioning', () => {
  const g = createGame(); rich(g); g.research('tier'); g.recruit('priest'); g.start();
  const priest = g.state.units.find(u => u.unitId === 'priest');
  const ally = g.state.units.find(u => u.unitId === 'footman');
  g.state.units = [priest, ally]; noAI(g);
  priest.x = -2; priest.z = 0; priest.abilityCooldown = 0; priest.speed = 0;
  ally.x = 0; ally.z = 0; ally.speed = 0; ally.hp = 100;
  g.update(0.1);
  assert.ok(ally.hp > 100);
  advance(g, 10);
  assert.ok(g.state.control > 0.7);
  assert.equal(g.state.income, 5.5);
  assert.equal(g.state.incomeAmount, 110);
});

test('save restoration resumes the exact deterministic battle', () => {
  const g = createGame({ faction: 'undead', seed: 81 });
  g.recruit('ghoul'); g.start(); advance(g, 65); g.update(0.045);
  const saved = g.serialize();
  const restored = restoreGame(saved);
  assert.equal(restored.serialize(), saved);
  advance(g, 50); advance(restored, 50);
  assert.deepEqual(restored.state, g.state);
});

test('saving immediately before and after payday cannot skip or duplicate gold', () => {
  const g = createGame({ seed: 31 }); g.research('mines'); g.start(); g.update(19.9);
  const before = restoreGame(g.serialize());
  assert.equal(before.state.gold, 135);
  assert.ok(Math.abs(before.state.mineCooldown - 70.1) < 0.00001);
  before.update(0.1); g.update(0.1);
  assert.deepEqual(before.state, g.state);
  assert.equal(g.state.gold, 245);
  const after = restoreGame(g.serialize());
  after.update(0.05); after.update(0.05); g.update(0.1);
  assert.equal(after.state.gold, 245);
  assert.equal(after.state.stats.goldEarned, 110);
  assert.deepEqual(after.state, g.state);
  advance(g, 70); advance(after, 70);
  assert.deepEqual(after.state, g.state);
  assert.equal(after.state.mineCooldown, 0);
});

test('legacy v2 saves retain all gold and resume on the next shared payday', () => {
  for (const seconds of [0, 19.9, 20, 40]) {
    const g = createGame(); g.research('mines'); g.start(); g.update(seconds);
    const legacy = JSON.parse(g.serialize());
    legacy.version = 2;
    legacy.gold = 812.345;
    legacy.stats.goldEarned = 971.25;
    const enemyGold = legacy.enemy.gold;
    const enemyEarned = legacy.enemy.goldEarned;
    for (const wallet of [legacy, legacy.enemy]) {
      delete wallet.incomeAmount; delete wallet.nextIncome; delete wallet.mineCooldown;
      wallet.income = 7 + wallet.mineLevel * 2.2;
    }
    const restored = restoreGame(legacy);
    assert.equal(restored.state.version, 3);
    assert.equal(restored.state.gold, 812.345);
    assert.equal(restored.state.stats.goldEarned, 971.25);
    assert.equal(restored.state.enemy.gold, enemyGold);
    assert.equal(restored.state.enemy.goldEarned, enemyEarned);
    assert.equal(restored.state.mineLevel, 1);
    assert.equal(restored.state.mineCooldown, 0);
    assert.equal(restored.state.income, restored.state.incomeAmount / 20);
    assert.equal(restored.state.nextIncome, restored.state.enemy.nextIncome);
    assert.ok(Math.abs(restored.state.nextIncome - (seconds === 19.9 ? 0.1 : 20)) < 0.00001);
    const payout = restored.state.incomeAmount;
    restored.update(0.1);
    assert.equal(restored.state.gold, 812.345 + (seconds === 19.9 ? payout : 0));
    assert.equal(restored.state.stats.goldEarned, 971.25 + (seconds === 19.9 ? payout : 0));
  }
});

test('restore rejects malformed and incompatible data without executing it', () => {
  const g = createGame();
  for (const change of [s => s.version = 1, s => s.gold = -1, s => s.roster[0].unitId = '__proto__', s => s.roster[1].id = s.roster[0].id, s => s.research.tier = 10, s => s.structures[0].hp = Infinity, s => s.spellCooldowns = null, s => s.supply = 999, s => s.mineCooldown = -1, s => s.enemy.mineCooldown = 91, s => s.nextIncome = 25, s => s.enemy.nextIncome = 15, s => s.incomeAmount = 999]) {
    const data = JSON.parse(g.serialize()); change(data);
    assert.throws(() => restoreGame(data));
  }
  assert.throws(() => restoreGame('{broken'));
});

test('equipment and supply research stop at the advertised maximum without spending on rejected upgrades', () => {
  const g = createGame(); rich(g);
  for (const r of RESEARCH.filter(r => r.id !== 'mines')) {
    for (let i = 0; i < r.maxLevel; i++) assert.ok(g.research(r.id).ok);
    const gold = g.state.gold;
    assert.equal(g.research(r.id).ok, false);
    assert.equal(g.state.gold, gold);
  }
  assert.equal(g.state.supplyCap, 72);
  assert.equal(g.state.tier, 3);
});

test('equal seed and commands give identical combat regardless of frame chunks', () => {
  const a = createGame({ seed: 301 }); const b = createGame({ seed: 301 });
  a.start(); b.start();
  for (let i = 0; i < 1000; i++) a.update(0.1);
  for (let i = 0; i < 100; i++) b.update(1);
  a.state.accumulator = 0; b.state.accumulator = 0;
  assert.deepEqual(a.state, b.state);
});

test('AI purchases and upgrades are paid from its visible economy, with no hidden income', () => {
  const g = createGame({ seed: 93 }); g.start(); advance(g, 170);
  const e = g.state.enemy;
  assert.ok(Math.abs(e.gold + e.spent - (280 + e.goldEarned)) < 0.01);
  assert.ok(g.state.units.length <= 180);
  assert.ok(g.state.enemyRoster.length > 3);
  assert.ok(g.state.stats.kills > 0);
});

test('AI invests in its army before mines and never buys a second mine before eight minutes', () => {
  for (const difficulty of ['easy', 'normal', 'hard']) {
    const g = createGame({ difficulty, seed: 93 }); g.start();
    let previousMines = 0;
    for (let second = 0; second < 479 && g.state.status === 'playing'; second++) {
      g.update(1);
      const e = g.state.enemy;
      assert.ok(Math.abs(e.gold + e.spent - 280 - e.goldEarned) < 0.00001);
      assert.ok(e.mineLevel <= 1);
      if (e.mineLevel > previousMines) {
        const supply = g.state.enemyRoster.reduce((sum, r) => sum + UNITS.find(u => u.id === r.unitId).supply, 0);
        assert.ok(supply >= 13);
        assert.ok(g.state.time >= 90);
        assert.ok(e.mineCooldown > 89);
        previousMines = e.mineLevel;
      }
    }
    assert.ok(g.state.enemyRoster.length >= 6, `${difficulty} AI keeps recruiting at the slower income rate`);
  }
});

test('AI can recruit affordable reinforcements instead of waiting for a mine', () => {
  const g = createGame({ faction: 'alliance', seed: 93 });
  const factionUnits = UNITS.filter(u => u.faction === g.state.enemyFaction && u.tier === 1);
  const front = factionUnits.find(u => u.role === 'frontline');
  const ranged = factionUnits.find(u => u.role === 'ranged');
  g.state.enemyRoster = Array.from({ length: 7 }, (_, i) => ({ id: `r${g.state.nextId++}`, unitId: i % 2 ? ranged.id : front.id, row: i % 6, col: Math.floor(i / 6) }));
  g.state.enemy.gold = front.cost;
  g.state.enemy.tier = 3; g.state.enemy.research.tier = 2;
  g.state.enemy.plan = front.id;
  g.state.time = 95; g.state.aiTimer = 0.1;
  g.start(); g.update(0.1);
  assert.equal(g.state.enemyRoster.length, 8);
  assert.equal(g.state.enemy.gold, 0);
  assert.equal(g.state.enemy.mineLevel, 0);
});

test('an abandoned army can lose, and completed matches stop changing', () => {
  const g = createGame(); g.start(); advance(g, 600);
  assert.equal(g.state.status, 'defeat');
  const saved = g.serialize(); g.update(30);
  assert.equal(g.serialize(), saved);
  assert.equal(g.recruit('footman').ok, false);
});

test('a fortified army can destroy the opposing citadel and earn victory', () => {
  const g = createGame(); rich(g);
  for (const r of RESEARCH.filter(r => r.id !== 'mines')) for (let i = 0; i < r.maxLevel; i++) g.research(r.id);
  for (let i = 0; i < 4; i++) { g.recruit('footman'); g.recruit('mage'); g.recruit('priest'); g.recruit('ballista'); }
  g.recruit('paladin'); g.start(); advance(g, 600);
  assert.equal(g.state.status, 'victory');
  assert.ok(g.state.stats.kills > 0);
});

test('the unit budget remains bounded during long battles with summoners', () => {
  const g = createGame({ faction: 'undead' }); rich(g);
  for (const r of RESEARCH.filter(r => r.id !== 'mines')) for (let i = 0; i < r.maxLevel; i++) g.research(r.id);
  for (let i = 0; i < 10; i++) { g.recruit('necromancer'); g.recruit('skeleton'); }
  g.start();
  for (let i = 0; i < 900 && g.state.status === 'playing'; i++) {
    g.update(1);
    assert.ok(g.state.units.length <= 180);
    assert.ok(g.state.units.every(u => Number.isFinite(u.hp) && Number.isFinite(u.x) && Number.isFinite(u.z)));
  }
  assert.notEqual(g.state.status, 'playing');
});

test('the Sunwell ends an otherwise empty stalemate within fifteen minutes', () => {
  const g = createGame();
  for (const r of [...g.state.roster]) g.sell(r.id);
  g.state.enemyRoster = [];
  g.start(); noAI(g);
  advance(g, 900);
  assert.notEqual(g.state.status, 'playing');
  assert.ok(g.state.time <= 900);
  assert.ok(g.state.events.some(e => e.text.includes('Sudden death')));
});

test('buying and dismissing units cannot create a refund loop, including the starter army', () => {
  const g = createGame();
  const starter = g.state.roster[0];
  assert.ok(g.sell(starter.id).ok);
  const refunded = g.state.gold;
  assert.equal(g.sell(starter.id).ok, false);
  assert.equal(g.state.gold, refunded);
  for (let i = 0; i < 4; i++) {
    const before = g.state.gold;
    assert.ok(g.recruit('footman').ok);
    const recruit = g.state.roster.at(-1);
    assert.ok(g.sell(recruit.id).ok);
    assert.equal(g.state.gold, before - 30);
  }
});

test('all faction abilities remain finite and serializable in mixed elite battles', () => {
  const numeric = ['x', 'z', 'hp', 'maxHp', 'damage', 'armor', 'range', 'speed', 'attackSpeed', 'cooldown', 'heading', 'shield'];
  for (const faction of FACTIONS) {
    const g = createGame({ faction: faction.id, seed: 117 }); rich(g);
    for (const r of RESEARCH.filter(r => r.id !== 'mines')) for (let i = 0; i < r.maxLevel; i++) assert.ok(g.research(r.id).ok);
    for (const u of UNITS.filter(u => u.faction === faction.id)) assert.ok(g.recruit(u.id).ok);
    // Prepare the opposing faction with the same elite technology for broad ability coverage.
    Object.assign(g.state.enemy, { tier: 3, mineLevel: 0, supplyCap: 72, research: { ...g.state.research } });
    g.state.enemyRoster = UNITS.filter(u => u.faction === g.state.enemyFaction).map((u, i) => ({ id: `r${g.state.nextId++}`, unitId: u.id, row: i % 6, col: Math.floor(i / 6) * 2 }));
    g.start();
    const seen = new Set();
    for (let second = 0; second < 450 && g.state.status === 'playing'; second++) {
      for (const u of g.state.units) {
        seen.add(u.unitId);
        for (const key of numeric) assert.ok(Number.isFinite(u[key]), `${u.unitId}.${key} must remain finite`);
        assert.ok(u.hp <= u.maxHp);
      }
      if (second % 45 === 0) {
        const restored = restoreGame(g.serialize());
        assert.equal(restored.serialize(), g.serialize());
      }
      g.update(1);
    }
    for (const u of UNITS.filter(u => u.faction === faction.id || u.faction === g.state.enemyFaction)) assert.ok(seen.has(u.id), `${u.id} deployed`);
    assert.ok(g.state.stats.peakUnits <= 180);
    assert.ok(g.state.stats.kills > 0 && g.state.stats.losses > 0);
  }
});
