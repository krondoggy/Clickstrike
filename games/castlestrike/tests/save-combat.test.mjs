import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, restoreGame } from '../src/engine.js';

function flightFixture() {
  const g = createGame({ seed: 42 });
  g.start();
  const archer = g.state.units.find(u => u.unitId === 'archer');
  const grunt = g.state.units.find(u => u.unitId === 'grunt');
  g.state.units = [archer, grunt];
  for (const u of g.state.units) Object.assign(u, { x: u.team === 'player' ? -5 : 5, z: 0, rootUntil: 100, rootTime: 100, controlRecoveryUntil: 102, abilityCooldown: 100, nextAttackAt: 100, cooldown: 100 });
  archer.nextAttackAt = archer.cooldown = 0;
  grunt.damage = 0;
  g.state.aiTimer = 6;
  return g;
}

test('v3 windup and in-flight saves restore exact queues, poses, HP and subsequent impacts', () => {
  for (const elapsed of [.1, .4]) {
    const g = flightFixture();
    g.update(elapsed);
    assert.ok(elapsed === .1 ? g.state.pendingAttacks.length > 0 : g.state.projectiles.length > 0);
    const saved = g.serialize();
    const restored = restoreGame(saved);
    assert.equal(restored.serialize(), saved, 'Loading cannot reschedule an attack or reroll its animation');
    for (let i = 0; i < 35; i++) {
      g.update(.1); restored.update(.1);
      assert.deepEqual(restored.state, g.state, `Restored combat stays identical through tick ${i}`);
    }
  }
});

test('repeated save/load during a flight cannot duplicate or erase the arriving damage', () => {
  const reference = flightFixture();
  reference.update(.4);
  let reloaded = restoreGame(reference.serialize());
  for (let i = 0; i < 8; i++) {
    reference.update(.1);
    reloaded.update(.1);
    reloaded = restoreGame(reloaded.serialize());
  }
  assert.deepEqual(reloaded.state, reference.state);
  assert.ok(reference.state.telemetry.summary.player.damage > 0);
});

test('v2 migration preserves treasuries, permanent armies, research, deployed HP and status durations', () => {
  const g = flightFixture();
  g.research('mines');
  g.update(.4);
  const legacy = JSON.parse(g.serialize());
  legacy.version = 2;
  delete legacy.pendingAttacks; delete legacy.projectiles; delete legacy.telemetry;
  legacy.gold = 812.345; legacy.enemy.gold = 417.25;
  const victim = legacy.units[1];
  victim.hp -= 51; victim.poison = 9; victim.poisonTime = 4.3; victim.poisonTeam = 'player'; victim.slowAmount = .35; victim.slowTime = 2.4;
  const preserved = { gold: legacy.gold, enemyGold: legacy.enemy.gold, roster: structuredClone(legacy.roster), enemyRoster: structuredClone(legacy.enemyRoster), research: structuredClone(legacy.research), hp: legacy.units.map(u => u.hp), structures: legacy.structures.map(s => s.hp) };
  const restored = restoreGame(legacy);
  assert.equal(restored.state.version, 3);
  assert.deepEqual({ gold: restored.state.gold, enemyGold: restored.state.enemy.gold, roster: restored.state.roster, enemyRoster: restored.state.enemyRoster, research: restored.state.research, hp: restored.state.units.map(u => u.hp), structures: restored.state.structures.map(s => s.hp) }, preserved);
  assert.deepEqual(restored.state.pendingAttacks, [], 'Legacy attacks already damaged HP and must not be replayed');
  assert.deepEqual(restored.state.projectiles, []);
  const migratedVictim = restored.state.units[1];
  assert.equal(migratedVictim.poisons[0].amount, 9);
  assert.equal(migratedVictim.poisons[0].expiresAt, legacy.time + 4.3);
  assert.equal(migratedVictim.slows[0].expiresAt, legacy.time + 2.4);
  assert.equal(restoreGame(restored.serialize()).serialize(), restored.serialize(), 'Migrated campaigns are valid v3 saves');
});

test('v3 rejects corrupt attack schedules, control instances and telemetry instead of creating hidden hits', () => {
  const g = flightFixture(); g.update(.4);
  const corruptions = [
    s => { s.projectiles[0].impactAt = NaN; },
    s => { s.projectiles[0].impactAt = 0; },
    s => { s.projectiles[0].damage = -1; },
    s => { s.projectiles[0].unitId = '__proto__'; },
    s => { s.pendingAttacks = null; },
    s => { s.units[0].attackPose.releaseAt = -1; },
    s => { s.units[0].rootUntil = Infinity; },
    s => { s.units[0].slows.push({ sourceId: 'u2', unitId: 'shaman', team: 'enemy', amount: 5, expiresAt: 3 }); },
    s => { s.telemetry.summary.player.damage = 1000; },
    s => { s.projectiles.push(structuredClone(s.projectiles[0])); },
  ];
  for (const corrupt of corruptions) {
    const saved = JSON.parse(g.serialize()); corrupt(saved);
    assert.throws(() => restoreGame(saved));
  }
});

test('pausing or changing display speed cannot advance a windup or projectile', () => {
  const g = flightFixture(); g.update(.4); g.togglePause();
  const frozen = g.serialize();
  g.update(60);
  assert.equal(g.serialize(), frozen);
  g.setSpeed(3);
  const projectileTime = g.state.projectiles[0].impactAt;
  g.update(60);
  assert.equal(g.state.projectiles[0].impactAt, projectileTime);
  g.togglePause();
  g.update(.1);
  assert.equal(g.state.time, .5, 'The display layer applies speed; the simulation consumes exact elapsed seconds');
});

test('commander Starfall survives save/load and the death of every deployed caster while preserving structure damage', () => {
  const g = createGame(); g.start();
  const castle = g.state.structures.find(s => s.id === 'enemy-castle');
  assert.ok(g.cast('meteor', castle.x, castle.z).ok);
  g.update(.6);
  g.state.units = [];
  const restored = restoreGame(g.serialize());
  assert.equal(restored.state.projectiles[0].sourceId, 'player-commander');
  assert.equal(restored.state.projectiles[0].sourceKind, 'commander');
  assert.equal(restored.state.projectiles[0].unitId, null);
  g.update(.7); restored.update(.7);
  assert.equal(castle.hp, castle.maxHp);
  g.update(.1); restored.update(.1);
  assert.ok(castle.hp < castle.maxHp);
  assert.equal(g.state.telemetry.summary.player.leadingThreat.unitId, null, 'Commander damage has no fabricated unit identity');
  assert.equal(restoreGame(g.serialize()).serialize(), g.serialize(), 'A commander leading the damage report remains a valid save');
  assert.ok(Math.abs(castle.maxHp - castle.hp - 75 * .7 / (1 + 5 * .055)) < .00001);
  assert.deepEqual(restored.state, g.state);
});
